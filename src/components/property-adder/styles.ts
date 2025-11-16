const propertyAdderStyles = /*css*/`
    /* Property adder button styles */
    .property-adder-container {
        text-align: center;
    }

    .property-adder-container .property-adder-btn {
        --nav-bg-opacity: 0.5;
        --underline-height: 2px;

        background-color: hsla(var(--color-accent-hsl), var(--nav-bg-opacity));
        font-family: var(--font-ui);
        width: 100%;
        min-height: 50px;
        border-radius: 0;
        box-shadow: none;
        position: relative;
        overflow: hidden;
        transition: color 0.3s ease;
    }

    .property-adder-container .property-adder-btn:hover {
        cursor: pointer;
        color: hsl(var(--color-accent-hsl));
    }

    .property-adder-container .property-adder-btn::before {
        content: '';
        position: absolute;
        width: 0;
        height: var(--underline-height);
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        background-color: hsl(var(--color-accent-hsl));
        transition: width 0.3s ease;
    }

    .property-adder-container .property-adder-btn:hover::before {
        width: 100%;
    }
`;

export default propertyAdderStyles;
