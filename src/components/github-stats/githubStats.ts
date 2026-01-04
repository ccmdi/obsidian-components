import { Component, ComponentAction, ComponentInstance } from 'components';
import { createColoredIcon } from 'utils';
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

async function fetchGithubData(token: string): Promise<{ username: string; last7Days: GithubContributionDay[] }> {
    const query = `{ viewer { login, contributionsCollection { contributionCalendar { weeks { contributionDays { date, contributionCount } } } } } }`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });

    const data: GithubApiResponse = await response.json();
    const username = data.data.viewer.login;
    const allDays = data.data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays);
    const last7Days = allDays.slice(-7);

    return { username, last7Days };
}

function renderStreakSquares(streakContainer: HTMLElement, last7Days: GithubContributionDay[], tooltip: HTMLElement) {
    streakContainer.empty();

    last7Days.forEach(day => {
        const count = day.contributionCount;

        const [year, month, dayNum] = day.date.split('-').map(Number);
        const date = new Date(year, month - 1, dayNum);
        const formattedDate = date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const opacity = count === 0 ? 0.1 : Math.min(0.2 + (count / 20) * 0.8, 1);
        const square = streakContainer.createEl('div', {
            cls: 'day-square',
            attr: {
                style: `background-color: var(--text-accent); opacity: ${opacity};`,
                'data-tooltip': `${count} contributions on ${formattedDate}`
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

export const githubStats: Component<['GITHUB_TOKEN']> = {
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
            description: 'GitHub token to use for API requests. Get one from [here](https://github.com/settings/tokens). It is strongly recommended to use a "no access" token.',
            required: true
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: githubStyles,

    render: async (args, el, ctx, app, instance) => {
        const GITHUB_TOKEN = args.GITHUB_TOKEN;
        el.style.position = 'relative';

        const widget = el.createEl('div', { cls: 'github-streak-container' });
        const tooltip = document.body.createEl('div', { cls: 'github-tooltip' });
        ComponentInstance.addCleanup(instance, () => tooltip.remove());

        // Loading state
        const loadingWrapper = widget.createEl('div', { cls: 'github-streak-wrapper' });
        const iconPlaceholder = loadingWrapper.createEl('div', { cls: 'github-icon' });
        iconPlaceholder.createEl('div', {
            cls: 'loading-placeholder',
            attr: { style: 'width:100%; aspect-ratio:1;' }
        });
        const streakPlaceholder = loadingWrapper.createEl('div', { cls: 'github-streak' });
        for (let i = 0; i < 7; i++) {
            streakPlaceholder.createEl('div', {
                cls: 'day-square loading-placeholder',
                attr: { style: 'aspect-ratio:1;' }
            });
        }

        // Fetch data
        const { username, last7Days } = await fetchGithubData(GITHUB_TOKEN);

        // Clear loading state and build final DOM
        widget.empty();
        const wrapper = widget.createEl('div', { cls: 'github-streak-wrapper' });

        // Icon
        const iconContainer = wrapper.createEl('div', { cls: 'github-icon' });
        const link = iconContainer.createEl('a', { href: `https://github.com/${username}` });
        const icon = createColoredIcon('github');
        link.appendChild(icon);

        // Streak squares
        const streakContainer = wrapper.createEl('div', { cls: 'github-streak' });
        renderStreakSquares(streakContainer, last7Days, tooltip);

        // Store refs for renderRefresh
        instance.data.token = GITHUB_TOKEN;
        instance.data.streakContainer = streakContainer;
        instance.data.tooltip = tooltip;
    },

    renderRefresh: async (args, el, ctx, app, instance) => {
        const { last7Days } = await fetchGithubData(instance.data.token);
        renderStreakSquares(instance.data.streakContainer, last7Days, instance.data.tooltip);
    },

    settings: {}
};