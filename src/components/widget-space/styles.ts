export const widgetSpaceStyles = /*css*/`
    .widget-space-container {
        background: var(--background-primary);
        padding: 12px;
        height: 100%;
        min-height: 400px;
        position: relative;
        overflow: auto;
        --widget-space-width: 100%;
    }

    /* Remove component padding specifically for widget-space */
    .component:has(.widget-space-container) {
        margin: 0 !important;
        padding: 0 !important;
    }
    .widget-space-grid {
        position: relative;
        min-height: 150px;
        transform: translateZ(0);
        contain: layout style;
    }
    .widget-space-skeleton {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        min-height: 200px;
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
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
        100% { left: 100%; }
    }
    .widget-item {
        position: absolute;
        display: block;
        margin: 4px;
        z-index: 1;
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: move;
        transition: box-shadow 0.2s ease, height 0.3s ease-out;
        box-sizing: border-box;
        width: calc(var(--widget-space-width) - 8px);
        will-change: transform;
        backface-visibility: hidden;
        transform-style: preserve-3d;
    }
    /* Hide items until initial layout is done */
    .widget-space-grid:not(.initial-load-done) .widget-item {
        visibility: hidden;
    }
    /* Enable transform transitions only when explicitly allowed */
    .widget-space-grid.transitions-enabled .widget-item {
        transition: box-shadow 0.2s ease, height 0.3s ease-out, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    /* But not for the item being dragged */
    .widget-item.muuri-item-dragging {
        transition: box-shadow 0.2s ease !important;
    }
    /* Smooth transition when releasing dragged item */
    .widget-item.muuri-item-releasing {
        transition: box-shadow 0.2s ease, height 0.3s ease-out, transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
    }
    .widget-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-color: var(--interactive-accent);
    }
    .widget-item.muuri-item-dragging {
        z-index: 3;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .widget-item.muuri-item-releasing {
        z-index: 2;
    }
    .widget-item.muuri-item-hidden {
        z-index: 0;
    }
    .widget-content {
        transition: height 0.3s ease-out, min-height 0.3s ease-out;
    }
    .widget-content > div:first-of-type {
        border: 0px !important;
        padding: 2px !important;
        transition: height 0.3s ease-out, min-height 0.3s ease-out;
    }
`