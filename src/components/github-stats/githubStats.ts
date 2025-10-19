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
            const tooltip = el.createEl('div', { cls: 'github-tooltip' });
    
            widget.innerHTML = `
                <div class="github-streak-wrapper">
                    <div class="github-icon"><div class="loading-placeholder" style="width:100%; aspect-ratio:1;"></div></div>
                    <div class="github-streak">
                        ${Array(7).fill(0).map(() => `<div class="day-square loading-placeholder" style="aspect-ratio:1;"></div>`).join('')}
                    </div>
                </div>`;
            
            el.appendChild(widget);
            el.appendChild(tooltip);
    
            const query = `{ viewer { login, contributionsCollection { contributionCalendar { weeks { contributionDays { date, contributionCount } } } } } }`;
    
            const accentColorHex = getAccentColorHex(el);
            const svgUrl = `https://cdn.simpleicons.org/github/${accentColorHex}`;
            
            const [response, svgFile] = await Promise.all([
                fetch('https://api.github.com/graphql', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                }),
                fetch(svgUrl).then(res => res.text())
            ]);
    
            const data: GithubApiResponse = await response.json();
            const username = data.data.viewer.login;
            const allDays = data.data.viewer.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays);
            const last7Days = allDays.slice(-7);
    
            widget.innerHTML = `
                <div class="github-streak-wrapper">
                    <div class="github-icon"><a href='https://github.com/${username}'>${svgFile}</a></div>
                    <div class="github-streak">
                    ${last7Days.map(day => {
                        const count = day.contributionCount;
                        
                        const [year, month, dayNum] = day.date.split('-').map(Number);
                        const date = new Date(year, month - 1, dayNum);
                        const formattedDate = date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        
                        const opacity = count === 0 ? 0.1 : Math.min(0.2 + (count / 20) * 0.8, 1);
                        return `<div class="day-square" style="background-color: var(--text-accent); opacity: ${opacity};" data-tooltip="${count} contributions on ${formattedDate}"></div>`;
                    }).join('')}
                    </div>
                </div>`;
            
            widget.querySelectorAll('.day-square').forEach(square => {
                square.addEventListener('mouseenter', (e) => {
                    const target = e.target as HTMLElement;
                    tooltip.textContent = target.dataset.tooltip || '';
                    tooltip.style.opacity = '1';
    
                    const rect = target.getBoundingClientRect();
                    const containerRect = el.getBoundingClientRect();
                    
                    tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
                    tooltip.style.top = `${rect.top - containerRect.top}px`;
                });
                square.addEventListener('mouseleave', () => {
                    tooltip.style.opacity = '0';
                });
            });
        },
        settings: {}
    };