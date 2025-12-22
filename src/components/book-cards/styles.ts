export const bookCardsStyles = /*css*/`
/* Book Cards Container */
.books-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 15px;
    background-color: var(--background-primary);
    border-radius: 8px;
}

/* Book Card */
.book-card {
    display: flex;
    gap: 15px;
    padding: 15px;
    background-color: var(--background-secondary);
    border-radius: 6px;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    will-change: transform;
    cursor: pointer;
}

.book-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

/* Book Cover */
.book-cover {
    width: 68px;
    height: 102px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
}

/* Book Details */
.book-details {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.markdown-rendered h2.book-title {
    font-size: 1.2em;
    margin: 0 0 5px 0;
}

h2.book-title a {
    color: var(--text-accent);
    text-decoration: none;
}

h2.book-title a:hover {
    text-decoration: underline;
}

.markdown-rendered h4.book-author {
    font-size: 0.9em;
    color: var(--text-muted);
    margin: 0 0 10px 0;
    font-weight: normal;
}

p.book-progress {
    font-size: 1em;
    color: var(--text-normal);
    margin: 5px 0 0 0;
}

.progress-amount,
.progress-percentage {
    font-weight: bold;
    color: var(--text-normal);
}

/* Book Separator */
.book-separator {
    border: none;
    border-top: 1px solid var(--background-modifier-border);
    margin: 0;
    opacity: 0.3;
}

/* Empty State */
.book-cards-empty {
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    padding: 40px 20px;
}

/* Error State */
.book-cards-error {
    text-align: center;
    color: var(--text-error);
    padding: 20px;
    background: var(--background-secondary);
    border-radius: 6px;
}
`;
