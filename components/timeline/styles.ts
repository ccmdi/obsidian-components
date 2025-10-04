export const timelineStyles = `
    .timeline-container .dropdown-button::after {
    content: '▼';
    font-size: 0.8em;
    transition: transform 0.3s ease;
    margin: 2px 0;
  }
  .timeline-container .dropdown-button.open::after {
    transform: rotate(180deg);
  }
  .timeline-container .dropdown-button:hover {
    color: var(--text-normal) !important;
  }
  .timeline-container {
    padding: 8px 0;
  }

  .timeline-container .journal-content.visible {
        margin-top: 10px !important;
        grid-template-rows: 1fr !important;
        border-width: 1px !important;
        opacity: 1 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
    }
    .timeline-container .journal-content.visible > div {
        opacity: 1 !important;
        transform: translateX(0) scale(1) !important;
        padding: 12px !important;
        transition-delay: 0.1s;
    }
`;

export default timelineStyles;