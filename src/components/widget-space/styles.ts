export const widgetSpaceStyles = /*css*/`
    .widget-space-container {
        background: var(--background-primary);
        padding: 12px;
        height: 100%;
        min-height: 400px;
        position: relative;
        overflow: auto;
        scrollbar-width: none;
    }
    .widget-space-container::-webkit-scrollbar {
        display: none;
    }
    .component:has(.widget-space-container) {
        margin: 0 !important;
        padding: 0 !important;
    }
    .view-content:has(.widget-space-container) {
        overflow: hidden !important;
    }
    .widget-space-grid {
        position: relative;
        width: 100%;
        min-height: 150px;
    }
    .widget-skeleton {
        height: 80px;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        position: relative;
        overflow: hidden;
    }
    .widget-skeleton::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: shimmer 1.5s infinite;
        transform: translateX(-100%);
    }
    @keyframes shimmer {
        100% { transform: translateX(100%); }
    }
    .widget-item {
        position: absolute;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: move;
        box-sizing: border-box;
        transition: box-shadow 0.2s ease;
    }
    .widget-space-grid:not(.initial-load-done) .widget-item {
        visibility: hidden;
    }
    .widget-space-grid.transitions-enabled .widget-item {
        transition: box-shadow 0.2s ease, transform 0.3s ease-out;
    }
    .widget-item.muuri-item-dragging {
        transition: box-shadow 0.2s ease !important;
        z-index: 1000;
    }
    .widget-item.muuri-item-releasing {
        z-index: 2;
    }
    .widget-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-color: var(--interactive-accent);
    }
    .widget-content {
        transition: height 0.3s ease-out;
    }
    .widget-content > div:first-of-type {
        border: 0 !important;
        padding: 2px !important;
    }
`;
