export const analyticsStyles = /*css*/`
    .vault-analytics-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 1rem !important;
        margin: 1rem auto !important;
        max-width: 900px !important;
    }

    .vault-analytics-grid > div {
        background: var(--background-primary-alt) !important;
    }

    @media (max-width: 768px) {
        .vault-analytics-grid {
            grid-template-columns: 1fr !important;
        }
    }
`;