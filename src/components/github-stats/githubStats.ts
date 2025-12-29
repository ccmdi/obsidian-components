import { Component, ComponentAction, ComponentInstance } from 'components';
import { createColoredIcon, parseBoolean } from 'utils';
import { githubStyles } from './styles';

interface GithubContributionDay {
    date: string;
    contributionCount: number;
}

interface GithubWeek {
    contributionDays: GithubContributionDay[];
}

interface GithubContributionCalendar {
    weeks: GithubWeek[];
    totalContributions: number;
}

interface GithubContributionsCollection {
    contributionCalendar: GithubContributionCalendar;
}

interface GithubViewer {
    login: string;
    contributionsCollection: GithubContributionsCollection;
}

interface GithubApiResponse {
    data: {
        viewer: GithubViewer;
    };
}

interface GithubData {
    username: string;
    days: GithubContributionDay[];
    totalContributions: number;
    currentStreak: number;
}

async function fetchGithubData(token: string, numDays: number): Promise<GithubData> {
    const query = `{ viewer { login, contributionsCollection { contributionCalendar { totalContributions, weeks { contributionDays { date, contributionCount } } } } } }`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });

    const data: GithubApiResponse = await response.json();
    const username = data.data.viewer.login;
    const calendar = data.data.viewer.contributionsCollection.contributionCalendar;
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);
    const days = allDays.slice(-numDays);

    // Calculate current streak
    let currentStreak = 0;
    for (let i = allDays.length - 1; i >= 0; i--) {
        if (allDays[i].contributionCount > 0) {
            currentStreak++;
        } else {
            // Allow today to have 0 if it's early in the day
            const isToday = allDays[i].date === new Date().toISOString().split('T')[0];
            if (!isToday) break;
        }
    }

    return {
        username,
        days,
        totalContributions: calendar.totalContributions,
        currentStreak
    };
}

function renderStreakSquares(
    streakContainer: HTMLElement,
    days: GithubContributionDay[],
    tooltip: HTMLElement
): void {
    streakContainer.empty();

    days.forEach(day => {
        const count = day.contributionCount;

        const [year, month, dayNum] = day.date.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum);
        const formattedDate = date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const opacity = count === 0 ? 0.1 : Math.min(0.2 + (count / 20) * 0.8, 1);
        const square = streakContainer.createEl('div', {
            cls: 'day-square',
            attr: {
                style: `background-color: var(--text-accent); opacity: ${opacity};`,
                'data-tooltip': `${count} contribution${count !== 1 ? 's' : ''} on ${formattedDate}`
            }
        });

        square.addEventListener('mouseenter', (e) => {
            const target = e.target as HTMLElement;
            tooltip.textContent = target.dataset.tooltip || '';
            tooltip.style.opacity = '1';

            const rect = target.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.top}px`;
        });
        square.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    });
}

function renderLoadingSkeleton(widget: HTMLElement, numDays: number): void {
    widget.empty();
    const loadingWrapper = widget.createEl('div', { cls: 'github-streak-wrapper' });

    const iconPlaceholder = loadingWrapper.createEl('div', { cls: 'github-icon' });
    iconPlaceholder.createEl('div', {
        cls: 'loading-placeholder github-icon-skeleton'
    });

    const streakPlaceholder = loadingWrapper.createEl('div', { cls: 'github-streak' });
    for (let i = 0; i < numDays; i++) {
        streakPlaceholder.createEl('div', {
            cls: 'day-square loading-placeholder'
        });
    }
}

export const githubStats: Component<['GITHUB_TOKEN', 'days', 'showTotal', 'showStreak', 'compact']> = {
    name: 'GitHub Stats',
    description: 'Display your GitHub contribution streak',
    keyName: 'github-stats',
    icon: 'github',
    aliases: ['github-streak', 'gh-streak'],
    refresh: {
        type: 'timeElapsed',
        interval: 30 * 60 * 1000 // 30 minutes
    },
    args: {
        GITHUB_TOKEN: {
            description: 'GitHub personal access token. Get one from github.com/settings/tokens (no special permissions needed).',
            required: true
        },
        days: {
            description: 'Number of days to display (1-30)',
            default: '7'
        },
        showTotal: {
            description: 'Show total contributions this year',
            default: 'false'
        },
        showStreak: {
            description: 'Show current contribution streak',
            default: 'false'
        },
        compact: {
            description: 'Compact layout without icon',
            default: 'false'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: githubStyles,

    render: async (args, el, ctx, app, instance) => {
        const GITHUB_TOKEN = args.GITHUB_TOKEN;
        const numDays = Math.max(1, Math.min(30, parseInt(args.days) || 7));
        const showTotal = parseBoolean(args.showTotal, false);
        const showStreak = parseBoolean(args.showStreak, false);
        const compact = parseBoolean(args.compact, false);

        el.style.position = 'relative';

        const widget = el.createEl('div', {
            cls: `github-streak-container ${compact ? 'github-compact' : ''}`
        });
        const tooltip = document.body.createEl('div', { cls: 'github-tooltip' });
        ComponentInstance.addCleanup(instance, () => tooltip.remove());

        // Loading state
        renderLoadingSkeleton(widget, numDays);

        try {
            // Fetch data
            const data = await fetchGithubData(GITHUB_TOKEN, numDays);

            // Clear loading state and build final DOM
            widget.empty();
            const wrapper = widget.createEl('div', { cls: 'github-streak-wrapper' });

            // Icon (unless compact mode)
            if (!compact) {
                const iconContainer = wrapper.createEl('div', { cls: 'github-icon' });
                const link = iconContainer.createEl('a', {
                    href: `https://github.com/${data.username}`,
                    attr: { target: '_blank', rel: 'noopener noreferrer' }
                });
                const icon = createColoredIcon('github');
                link.appendChild(icon);
            }

            // Streak squares
            const streakContainer = wrapper.createEl('div', { cls: 'github-streak' });
            renderStreakSquares(streakContainer, data.days, tooltip);

            // Stats row
            if (showTotal || showStreak) {
                const statsRow = widget.createEl('div', { cls: 'github-stats-row' });

                if (showStreak) {
                    statsRow.createEl('span', {
                        cls: 'github-stat',
                        text: `${data.currentStreak} day streak`
                    });
                }

                if (showTotal) {
                    statsRow.createEl('span', {
                        cls: 'github-stat',
                        text: `${data.totalContributions.toLocaleString()} this year`
                    });
                }
            }

            // Store refs for renderRefresh
            instance.data.token = GITHUB_TOKEN;
            instance.data.numDays = numDays;
            instance.data.streakContainer = streakContainer;
            instance.data.tooltip = tooltip;
            instance.data.widget = widget;
            instance.data.showTotal = showTotal;
            instance.data.showStreak = showStreak;

        } catch (error) {
            widget.empty();
            widget.createEl('div', {
                cls: 'github-error',
                text: 'Failed to load GitHub data'
            });
            console.error('GitHub stats error:', error);
        }
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        try {
            const data = await fetchGithubData(instance.data.token, instance.data.numDays);
            renderStreakSquares(instance.data.streakContainer, data.days, instance.data.tooltip);

            // Update stats if shown
            const statsRow = instance.data.widget.querySelector('.github-stats-row');
            if (statsRow) {
                const stats = statsRow.querySelectorAll('.github-stat');
                let statIndex = 0;

                if (instance.data.showStreak && stats[statIndex]) {
                    stats[statIndex].textContent = `${data.currentStreak} day streak`;
                    statIndex++;
                }

                if (instance.data.showTotal && stats[statIndex]) {
                    stats[statIndex].textContent = `${data.totalContributions.toLocaleString()} this year`;
                }
            }
        } catch (error) {
            console.error('GitHub stats refresh error:', error);
        }
    },

    settings: {}
};
