import { Component, ComponentAction, ComponentInstance } from 'components';
import { getAccentColorHex } from 'utils';
import { githubNotificationsStyles } from './styles';

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
    'PullRequest': 'PR',
    'Issue': 'ISS',
    'Commit': 'COM',
    'Release': 'REL',
    'Discussion': 'DIS',
    'CheckSuite': 'CI',
    'SecurityAdvisory': 'SEC',
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

export const githubNotifications: Component<['GITHUB_TOKEN', 'limit', 'auto_refresh', 'show_read']> = {
    name: 'GitHub Notifications',
    description: 'Display your GitHub notification inbox',
    keyName: 'github-notifications',
    aliases: ['gh-notifications', 'gh-inbox', 'github-inbox'],
    args: {
        GITHUB_TOKEN: {
            description: 'GitHub token to use for API requests. Get one from [here](https://github.com/settings/tokens). Requires "notifications" scope.',
            required: true
        },
        limit: {
            description: 'Maximum number of notifications to display',
            default: '10'
        },
        auto_refresh: {
            description: 'Auto-refresh interval in seconds (0 to disable)',
            default: '300'
        },
        show_read: {
            description: 'Show read notifications (true/false)',
            default: 'true'
        }
    },
    isMountable: true,
    does: [ComponentAction.EXTERNAL],
    styles: githubNotificationsStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const GITHUB_TOKEN = args.GITHUB_TOKEN;
        const limit = parseInt(args.limit) || 10;
        const autoRefresh = parseInt(args.auto_refresh) || 0;
        const showRead = args.show_read !== 'false';

        const container = el.createEl('div', { cls: 'github-notifications-container' });

        async function fetchNotifications(): Promise<GithubNotification[]> {
            const url = showRead
                ? 'https://api.github.com/notifications?all=true&per_page=50'
                : 'https://api.github.com/notifications?per_page=50';

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        }

        async function render() {
            container.empty();

            // Header
            const header = container.createEl('div', { cls: 'github-notifications-header' });
            const titleWrapper = header.createEl('div', { cls: 'github-notifications-title' });

            const accentColorHex = getAccentColorHex(el);
            const iconImg = titleWrapper.createEl('img', {
                cls: 'github-notifications-icon',
                attr: {
                    src: `https://cdn.simpleicons.org/github/${accentColorHex}`,
                    alt: 'GitHub'
                }
            });

            titleWrapper.createEl('span', { text: 'Notifications' });

            const refreshBtn = header.createEl('button', {
                cls: 'github-notifications-refresh',
                text: '↻'
            });
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                render();
            });

            // Loading state
            const listContainer = container.createEl('div', { cls: 'github-notifications-list' });
            const loadingContainer = listContainer.createEl('div', { cls: 'github-notifications-loading' });
            for (let i = 0; i < 3; i++) {
                loadingContainer.createEl('div', { cls: 'github-notification-skeleton' });
            }

            try {
                const notifications = await fetchNotifications();
                const unreadCount = notifications.filter(n => n.unread).length;

                listContainer.empty();

                // Update count in header - show unread count
                if (unreadCount > 0) {
                    titleWrapper.createEl('span', {
                        cls: 'github-notifications-count',
                        text: unreadCount.toString()
                    });
                }

                if (notifications.length === 0) {
                    const emptyState = listContainer.createEl('div', { cls: 'github-notifications-empty' });
                    emptyState.createEl('div', { text: 'All caught up!' });
                } else {
                    // Group by repository
                    const grouped = new Map<string, GithubNotification[]>();
                    notifications.slice(0, limit).forEach(notification => {
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
                            const icon = TYPE_ICONS[notification.subject.type] || 'NOT';
                            itemHeader.createEl('span', { cls: 'github-notification-type-icon', text: icon });

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
                                // Try to get the HTML URL from the subject URL
                                // GitHub API subject URLs are API endpoints, we need to convert them
                                let htmlUrl = notification.repository.html_url;

                                if (notification.subject.url) {
                                    // Convert API URL to HTML URL
                                    // e.g., https://api.github.com/repos/owner/repo/pulls/123
                                    // to https://github.com/owner/repo/pull/123
                                    const apiUrl = notification.subject.url;
                                    const match = apiUrl.match(/repos\/([^\/]+\/[^\/]+)\/(pulls|issues)\/(\d+)/);
                                    if (match) {
                                        const [, repo, type, number] = match;
                                        const htmlType = type === 'pulls' ? 'pull' : 'issue';
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

        await render();

        // Auto-refresh
        if (autoRefresh > 0) {
            ComponentInstance.createUpdateLoop(instance, render, autoRefresh * 1000);
        }
    },
    settings: {}
};
