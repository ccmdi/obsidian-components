import { Component, ComponentAction, ComponentInstance } from 'components';
import { getAccentColorHex } from 'utils';
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

export const githubStats: Component<['GITHUB_TOKEN']> =
    {
        name: 'GitHub Stats',
        description: 'Display your GitHub contribution streak',
        keyName: 'github-stats',
        icon: 'github',
        aliases: ['github-streak', 'gh-streak'],
        args: {
            GITHUB_TOKEN: {
                description: 'GitHub token to use for API requests. Get one from [here](https://github.com/settings/tokens). It is strongly recommended to use a "no access" token.',
                required: true
            }
        },
        isMountable: true,
        does: [ComponentAction.EXTERNAL],
        styles: githubStyles,
        render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
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
            
            el.appendChild(widget);
    
            const query = `{ viewer { login, contributionsCollection { contributionCalendar { weeks { contributionDays { date, contributionCount } } } } } }`;
    
            const accentColorHex = getAccentColorHex(el);
            const svgUrl = `https://cdn.simpleicons.org/github/${accentColorHex}`;

            const response = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data: GithubApiResponse = await response.json();
            const username = data.data.viewer.login;
            const allDays = data.data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays);
            const last7Days = allDays.slice(-7);

            // Clear loading state
            widget.empty();

            // Build DOM safely without innerHTML
            const wrapper = widget.createEl('div', { cls: 'github-streak-wrapper' });

            // Create icon with safe image element instead of injecting SVG
            const iconContainer = wrapper.createEl('div', { cls: 'github-icon' });
            const link = iconContainer.createEl('a', { href: `https://github.com/${username}` });
            const icon = link.createEl('img', {
                attr: {
                    src: svgUrl,
                    alt: 'GitHub',
                    style: 'width: 100%; height: 100%;'
                }
            });

            const streakContainer = wrapper.createEl('div', { cls: 'github-streak' });

            last7Days.forEach(day => {
                const count = day.contributionCount;

                const [year, month, dayNum] = day.date.split('-').map(Number);
                const date = new Date(year, month - 1, dayNum);
                const formattedDate = date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                const opacity = count === 0 ? 0.1 : Math.min(0.2 + (count / 20) * 0.8, 1);
                streakContainer.createEl('div', {
                    cls: 'day-square',
                    attr: {
                        style: `background-color: var(--text-accent); opacity: ${opacity};`,
                        'data-tooltip': `${count} contributions on ${formattedDate}`
                    }
                });
            });
            
            widget.querySelectorAll('.day-square').forEach(square => {
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
        },
        settings: {}
    };