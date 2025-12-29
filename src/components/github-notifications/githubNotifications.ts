import { Component, ComponentAction, ComponentInstance } from 'components';
import { createColoredIcon, parseBoolean } from 'utils';
import { githubNotificationsStyles } from './styles';
import { setIcon } from 'obsidian';

interface GithubNotification {
    id: string;
    unread: boolean;
    reason: string;
    updated_at: string;
    subject: {
        title: string;
        url: string;
        type: string;
    };
    repository: {
        full_name: string;
        html_url: string;
    };
    url: string;
}

const TYPE_ICONS: Record<string, string> = {
    'PullRequest': 'git-pull-request',
    'Issue': 'circle-dot',
    'Commit': 'git-commit',
    'Release': 'tag',
    'Discussion': 'message-circle',
    'CheckSuite': 'check-circle',
    'SecurityAdvisory': 'shield-alert',
};

const REASON_LABELS: Record<string, string> = {
    'review_requested': 'Review Requested',
    'assign': 'Assigned',
    'author': 'You Created',
    'comment': 'Comment',
    'mention': 'Mentioned',
    'team_mention': 'Team Mentioned',
    'state_change': 'State Changed',
    'subscribed': 'Subscribed',
};

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
}

export const githubNotifications: Component<['GITHUB_TOKEN', 'limit', 'showRead', 'showRefreshButton']> = {
    name: 'GitHub Notifications',
    description: 'Display your GitHub notification inbox',
    keyName: 'github-notifications',
    icon: 'inbox',
    aliases: ['gh-notifications', 'gh-inbox', 'github-inbox'],
    refresh: {
        type: 'timeElapsed',
        interval: 5 * 60 * 1000 // 5 minutes
    },
    args: {
        GITHUB_TOKEN: {
            description: 'GitHub token to use for API requests. Get one from [here](https://github.com/settings/tokens). Requires "notifications" scope.',
            required: true
        },
        limit: {
            description: 'Maximum number of notifications to display',
            default: '10'
        },
        showRead: {
            description: 'Show read notifications (true/false)',
            default: 'true'
        },
        showRefreshButton: {
            description: 'Show refresh button (true/false)',
            default: 'false'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: githubNotificationsStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const GITHUB_TOKEN = args.GITHUB_TOKEN;
        const limit = parseInt(args.limit) || 10;
        const showRead = parseBoolean(args.showRead);
        const showRefreshButton = parseBoolean(args.showRefreshButton);

        // Store config in instance for renderRefresh
        instance.data.token = GITHUB_TOKEN;
        instance.data.limit = limit;
        instance.data.showRead = showRead;

        const container = el.createEl('div', { cls: 'github-notifications-container' });

        // Header (static structure)
        const header = container.createEl('div', { cls: 'github-notifications-header' });
        const titleWrapper = header.createEl('div', { cls: 'github-notifications-title' });

        const iconImg = createColoredIcon('github');
        iconImg.classList.add('github-notifications-icon');
        titleWrapper.appendChild(iconImg);

        titleWrapper.createEl('a', {
            text: 'Notifications',
            attr: {
                href: 'https://github.com/notifications',
                target: '_blank',
                style: 'color: inherit; text-decoration: none;'
            }
        });

        // Count badge (will be updated)
        const countBadge = titleWrapper.createEl('span', { cls: 'github-notifications-count' });
        countBadge.style.display = 'none';
        instance.data.countBadge = countBadge;

        if (showRefreshButton) {
            const refreshBtn = header.createEl('button', {
                cls: 'github-notifications-refresh',
                text: '↻'
            });
            refreshBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await populateNotifications(instance);
            });
        }

        // List container (content will be updated)
        const listContainer = container.createEl('div', { cls: 'github-notifications-list' });
        instance.data.listContainer = listContainer;

        // Initial data load
        await populateNotifications(instance);
    },

    renderRefresh: async (args, el, ctx, app, instance: ComponentInstance) => {
        await populateNotifications(instance);
    },

    settings: {}
};

async function fetchNotifications(token: string, showRead: boolean): Promise<GithubNotification[]> {
    const url = showRead
        ? 'https://api.github.com/notifications?all=true&per_page=50'
        : 'https://api.github.com/notifications?per_page=50';

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function populateNotifications(instance: ComponentInstance) {
    const { token, limit, showRead, listContainer, countBadge } = instance.data;

    // Show loading state
    listContainer.empty();
    const loadingContainer = listContainer.createEl('div', { cls: 'github-notifications-loading' });
    for (let i = 0; i < 3; i++) {
        loadingContainer.createEl('div', { cls: 'github-notification-skeleton' });
    }

    try {
        const notifications = await fetchNotifications(token, showRead);
        const unreadCount = notifications.filter((n: GithubNotification) => n.unread).length;

        listContainer.empty();

        // Update count badge
        if (unreadCount > 0) {
            countBadge.textContent = unreadCount.toString();
            countBadge.style.display = '';
        } else {
            countBadge.style.display = 'none';
        }

        if (notifications.length === 0) {
            const emptyState = listContainer.createEl('div', { cls: 'github-notifications-empty' });
            emptyState.createEl('div', { text: 'All caught up!' });
        } else {
            // Group by repository
            const grouped = new Map<string, GithubNotification[]>();
            notifications.slice(0, limit).forEach((notification: GithubNotification) => {
                const repo = notification.repository.full_name;
                if (!grouped.has(repo)) {
                    grouped.set(repo, []);
                }
                grouped.get(repo)!.push(notification);
            });

            // Render each repository group
            grouped.forEach((repoNotifications, repoName) => {
                const repoGroup = listContainer.createEl('div', { cls: 'github-notifications-repo-group' });

                const repoHeader = repoGroup.createEl('div', { cls: 'github-notifications-repo-header' });
                repoHeader.createEl('span', { text: repoName });
                const repoUnreadCount = repoNotifications.filter(n => n.unread).length;
                if (repoUnreadCount > 0) {
                    repoHeader.createEl('span', {
                        cls: 'github-notifications-repo-count',
                        text: repoUnreadCount.toString()
                    });
                }

                repoNotifications.forEach(notification => {
                    const item = repoGroup.createEl('div', {
                        cls: notification.unread
                            ? 'github-notification-item github-notification-unread'
                            : 'github-notification-item'
                    });

                    const itemHeader = item.createEl('div', { cls: 'github-notification-header' });
                    const iconName = TYPE_ICONS[notification.subject.type] || 'bell';
                    const iconEl = itemHeader.createEl('span', { cls: 'github-notification-type-icon' });
                    setIcon(iconEl, iconName);

                    // Fix capitalization for common GitHub titles
                    let title = notification.subject.title;
                    if (title.startsWith('Ci ')) {
                        title = 'CI' + title.slice(2);
                    }

                    itemHeader.createEl('span', {
                        cls: 'github-notification-title',
                        text: title
                    });

                    const meta = item.createEl('div', { cls: 'github-notification-meta' });

                    const reasonText = REASON_LABELS[notification.reason] || notification.reason.replace(/_/g, ' ');
                    meta.createEl('span', {
                        cls: 'github-notification-reason',
                        text: reasonText
                    });

                    meta.createEl('span', {
                        cls: 'github-notification-time',
                        text: getTimeAgo(notification.updated_at)
                    });

                    // Click to open
                    item.addEventListener('click', () => {
                        let htmlUrl = notification.repository.html_url;

                        if (notification.subject.url) {
                            const apiUrl = notification.subject.url;
                            const match = apiUrl.match(/repos\/([^/]+\/[^/]+)\/(pulls|issues)\/(\d+)/);
                            if (match) {
                                const [, repo, type, number] = match;
                                const htmlType = type === 'pulls' ? 'pull' : 'issues';
                                htmlUrl = `https://github.com/${repo}/${htmlType}/${number}`;
                            }
                        }

                        window.open(htmlUrl, '_blank');
                    });
                });
            });
        }
    } catch (error) {
        listContainer.empty();
        listContainer.createEl('div', {
            cls: 'github-notifications-error',
            text: `Error: ${error.message}`
        });
    }
}
