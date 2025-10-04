export const ankiStatusStyles = `
.anki-status-container {
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 12px;
                padding: 16px;
                font-family: var(--font-interface);
                transition: all 0.2s ease;
                position: relative;
            }
            .anki-status-container.compact {
                padding: 12px;
            }
            .anki-status-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .anki-avatar {
                position: relative;
                flex-shrink: 0;
            }
            .anki-avatar img {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid var(--background-secondary);
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 20px;
                font-weight: bold;
            }
            .status-indicator {
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 3px solid var(--background-secondary);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                background: #23a55a;
            }
            .anki-info {
                flex: 1;
                min-width: 0;
            }
            .anki-username {
                font-weight: 600;
                font-size: 16px;
                color: var(--text-normal);
                margin-bottom: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .anki-status-text {
                font-size: 13px;
                color: var(--text-muted);
                margin-bottom: 4px;
            }
            .anki-activity {
                margin-top: 8px;
                padding: 8px;
                background: var(--background-primary);
                border-radius: 8px;
                border-left: 3px solid var(--interactive-accent);
            }
            .activity-name {
                font-weight: 500;
                font-size: 13px;
                color: var(--text-normal);
                margin-bottom: 2px;
            }
            .activity-details, .activity-state {
                font-size: 11px;
                color: var(--text-muted);
                line-height: 1.3;
            }
            .anki-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
                margin-top: 8px;
            }
            .anki-stats.compact {
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 8px;
            }
            .stat-card {
                background: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 12px;
                text-align: center;
                transition: all 0.2s ease;
                position: relative;
            }
            .stat-card.compact {
                padding: 8px;
            }
            .stat-card:hover {
                background: var(--background-modifier-hover);
            }
            .stat-icon {
                width: 24px;
                height: 24px;
                margin: 0 auto 8px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                color: white;
            }
            .stat-icon.compact {
                width: 20px;
                height: 20px;
                margin-bottom: 6px;
                font-size: 10px;
            }
            .stat-value {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-normal);
                margin-bottom: 4px;
                line-height: 1;
            }
            .stat-value.compact {
                font-size: 16px;
                margin-bottom: 2px;
            }
            .stat-label {
                font-size: 11px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 500;
            }
            .stat-label.compact {
                font-size: 9px;
            }
            .stat-card.new .stat-value { color: #3b82f6; }
            .stat-card.new .stat-icon { background: #3b82f6; }
            .stat-card.learning .stat-value { color: #f59e0b; }
            .stat-card.learning .stat-icon { background: #f59e0b; }
            .stat-card.review .stat-value { color: #10b981; }
            .stat-card.review .stat-icon { background: #10b981; }
            .stat-card.due .stat-value { color: #ef4444; }
            .stat-card.due .stat-icon { background: #ef4444; }
            .anki-deck {
                margin-top: 8px;
                padding: 8px;
                background: var(--background-primary);
                border-radius: 8px;
                border-left: 3px solid var(--interactive-accent);
            }
            .deck-name {
                font-weight: 500;
                font-size: 13px;
                color: var(--text-normal);
                margin-bottom: 2px;
            }
            .deck-details {
                font-size: 11px;
                color: var(--text-muted);
                line-height: 1.3;
            }
            .connection-status {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--text-error);
                transition: opacity 0.2s ease;
                opacity: 0;
            }
            .connection-status.disconnected {
                opacity: 1;
            }
            .connection-status.connected {
                background: var(--text-success);
                opacity: 1;
            }
            .loading-placeholder {
                background: linear-gradient(90deg, var(--background-modifier-border) 25%, transparent 37%, var(--background-modifier-border) 63%);
                background-size: 400% 100%;
                animation: loading 1.4s ease infinite;
                border-radius: 4px;
            }
            @keyframes loading {
                0% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            .anki-error {
                color: var(--text-error);
                padding: 16px;
                text-align: center;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            .error-icon {
                font-size: 24px;
            }
            .error-message {
                font-size: 14px;
                font-weight: 500;
            }
            .error-help {
                font-size: 12px;
                color: var(--text-muted);
                text-align: center;
                line-height: 1.4;
            }
            .retry-button {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 8px;
            }
            .retry-button:hover {
                background: var(--interactive-accent-hover);
            }
`