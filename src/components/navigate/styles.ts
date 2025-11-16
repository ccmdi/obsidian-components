const navigateStyles = /*css*/` 
    /* Daily notes > navigation buttons base styles */
    .daily-nav-container .daily-nav {
    --nav-bg-opacity: 0.5;
    --underline-height: 2px;

    background-color: hsla(var(--color-accent-hsl), var(--nav-bg-opacity));
    font-family: var(--font-ui);
    width: 50%;
    min-height: 50px;
    border-radius: 0;
    box-shadow: none;
    position: relative;
    overflow: hidden;
    transition: color 0.3s ease;
    }

    .daily-nav-container .daily-nav:hover {
    cursor: pointer;
    color: hsl(var(--color-accent-hsl));
    }

    .daily-nav-container .daily-nav::before {
    content: '';
    position: absolute;
    width: 0;
    height: var(--underline-height);
    bottom: 0;
    background-color: hsl(var(--color-accent-hsl));
    transition: width 0.3s ease;
    }

    .daily-nav-container .daily-nav.yesterday::before {
    left: 50%;
    transform: translateX(-50%);
    }

    .daily-nav-container .daily-nav.tomorrow::before {
    right: 50%;
    transform: translateX(50%);
    }

    .daily-nav-container .daily-nav:hover::before {
    width: 100%;
    }
`;

export default navigateStyles;