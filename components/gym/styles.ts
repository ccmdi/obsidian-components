export const gymRoutineMenuStyles = `
/* Fix empty cell height issues */
td > span > ul {
    margin: 0 !important;
    padding: 0 !important;
    height: 0 !important;
    min-height: 0 !important;
    line-height: 0 !important;
    display: none !important;
}

/* Main container */
.gym-routine-container {
    width: 100%;
    margin: 0;
    padding: 20px;
    background: var(--background-secondary);
    border-radius: 12px;
    border: 1px solid var(--background-modifier-border);
    font-family: var(--font-interface);
    color: var(--text-normal);
    box-sizing: border-box;
}

/* Header */
.gym-routine-header {
    display: grid;
    grid-template-columns: 32px 1fr 32px;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid var(--background-modifier-border);
}

.gym-routine-header h2 {
    margin: 0;
    color: var(--text-accent);
    font-size: 24px;
    text-align: center;
    grid-column: 2;
}

.gym-routine-header button {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    grid-column: 3;
}

/* Main content */
.gym-routine-main {
    height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
}

/* Empty state */
.gym-routine-empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
    font-size: 18px;
}

/* Routines list */
.gym-routines-list {
    display: grid;
    gap: 15px;
    grid-template-columns: 0px 1fr 1fr;
    justify-content: start;
    align-content: start;
}

/* Routine card */
.gym-routine-card {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
}

.gym-routine-card:hover {
    border-color: var(--interactive-accent);
    background: var(--background-modifier-hover);
}

.gym-routine-card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 15px;
}

.gym-routine-card h3 {
    margin: 0;
    color: var(--text-accent);
    font-size: 20px;
}

.gym-routine-card .edit-btn {
    background: var(--background-modifier-form-field);
    color: var(--text-normal);
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.gym-routine-card .info {
    color: #bbb;
    margin-bottom: 15px;
}

.gym-routine-card .click-hint {
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 12px;
    color: #666;
}

/* Form styles */
.gym-routine-form {
    max-width: 600px;
    margin: 0 auto;
}

.gym-routine-form-header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;
}

.gym-routine-form .back-btn {
    background: var(--background-modifier-form-field);
    color: var(--text-normal);
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 15px;
    font-size: 16px;
    /* box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1); */
}

.gym-routine-form h3 {
    margin: 0;
    color: var(--text-accent);
    font-size: 22px;
}

.gym-routine-form-content {
    background: var(--background-modifier-form-field);
    padding: 25px;
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
}

/* Form sections */
.gym-routine-form-section {
    margin-bottom: 25px;
}

.gym-routine-form label {
    display: block;
    margin-bottom: 8px;
    color: #ccc;
    font-weight: bold;
}

.gym-routine-form input[type="text"],
.gym-routine-form input[type="number"] {
    width: 100%;
    padding: 12px;
    border: 1px solid #555;
    border-radius: 6px;
    background: #1a1a1a;
    color: #e0e0e0;
    font-size: 16px;
    box-sizing: border-box;
}

/* Days selector */
.gym-routine-days {
    display: flex;
    gap: 4px;
    flex-wrap: nowrap;
}

.gym-routine-days button {
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-modifier-form-field);
    color: var(--text-normal);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-weight: bold;
    flex: 1;
    min-width: 0;
}

.gym-routine-days button.selected {
    background: var(--interactive-accent);
    border-color: var(--interactive-accent);
    color: var(--text-on-accent);
}

/* Exercises section */
.gym-routine-exercises-header {
    display: grid;
    grid-template-columns: 24px 1fr 24px;
    align-items: center;
    margin-bottom: 15px;
}

.gym-routine-exercises-header label {
    color: #ccc;
    font-weight: bold;
    text-align: center;
    grid-column: 2;
}

.gym-routine-exercises-header .add-btn {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    grid-column: 3;
}

/* Exercise rows */
.gym-routine-exercise-row {
    display: grid;
    grid-template-columns: 0px 0.4fr 0.25fr 0.25fr 0.25fr 0.1fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: var(--background-modifier-form-field);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    margin-bottom: 10px;
}

.gym-routine-exercise-row input {
    padding: 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
}

.gym-routine-exercise-row .remove-btn {
    background: var(--text-error);
    color: var(--text-on-accent);
    border: 1px solid var(--background-modifier-border);
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    height: 1fr;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    box-sizing: border-box;
}

/* Exercise empty state */
.gym-routine-exercises-empty {
    text-align: center;
    padding: 30px;
    color: var(--text-muted);
    border: 2px dashed var(--background-modifier-border);
    border-radius: 6px;
}

/* Form buttons */
.gym-routine-form-buttons {
    display: flex;
    gap: 15px;
    margin-top: 30px;
}

.gym-routine-form-buttons button {
    border: none;
    padding: 12px 30px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
}

.gym-routine-form-buttons .save-btn {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    flex: 1;
}

.gym-routine-form-buttons .delete-btn {
    background: var(--text-error);
    color: var(--text-on-accent);
}

/* View routine styles */
.gym-routine-view {
    max-width: 700px;
    margin: 0 auto;
}

.gym-routine-view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;
}

.gym-routine-view-header-left {
    display: flex;
    align-items: center;
}

.gym-routine-view .back-btn {
    background: var(--background-modifier-form-field);
    color: var(--text-normal);
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 15px;
    font-size: 16px;
}

.gym-routine-view h3 {
    margin: 0;
    color: var(--text-accent);
    font-size: 24px;
}

.gym-routine-view .edit-btn {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.gym-routine-view-content {
    background: var(--background-modifier-form-field);
    padding: 25px;
    border-radius: 8px;
    border: 1px solid var(--background-modifier-border);
}

.gym-routine-view-section {
    margin-bottom: 25px;
}

.gym-routine-view h4 {
    color: var(--text-accent);
    margin-bottom: 10px;
}

.gym-routine-view .schedule-info {
    color: var(--text-muted);
}

/* Table styles */
.gym-routine-table-container {
    overflow-x: auto;
}

.gym-routine-table {
    /* width: 95% !important; */
    border-collapse: collapse;
    background: var(--background-primary);
    /* border-radius: 6px; */
    overflow: hidden;
    margin: auto !important;
}

.gym-routine-table thead tr {
    background: var(--background-modifier-form-field);
    border-bottom: 2px solid var(--background-modifier-border);
}

.gym-routine-table th {
    padding: 16px 12px;
    /* border: none; */
    /* border-right: 1px solid var(--background-modifier-border); */
    color: var(--text-accent);
    font-weight: bold;
    font-size: 14px;
}

.gym-routine-table th:first-child {
    text-align: left;
}

.gym-routine-table th:not(:first-child) {
    text-align: center;
}

.gym-routine-table tr {
    height: auto;
    line-height: 1.2;
}

.gym-routine-table td {
    padding: 8px 12px;
    /* border: 1spx solid var(--background-modifier-border); */
    color: var(--text-normal);
    vertical-align: middle;
    line-height: 1.2;
}

.gym-routine-table td:first-child {
    text-align: left;
}

.gym-routine-table td:not(:first-child) {
    text-align: center;
}

/* View empty state */
.gym-routine-view-empty {
    text-align: center;
    padding: 30px;
    color: var(--text-muted);
    border: 2px dashed #444;
    border-radius: 6px;
}


.gym-routine-table td, .gym-routine-table th {
    border: 1px solid var(--background-modifier-border) !important;
}

.gym-routine-container h3 {
    margin-top: 0px !important;
}

.gym-routine-main {
    /* padding: 25px !important; */
    height: 100%;
    min-height: 300px;
    margin: auto !important;
}

.gym-routine-view-section > div > span:first-child {
    display: none !important;
}






/* Mobile horizontal scroll */
@media (max-width: 768px) {
    .el-pre:has(.gym-routine-table) {
        width: 95% !important;
        max-width: 95% !important;
    }

    .el-pre:has(.gym-routine-container) {
        width: 95% !important;
        max-width: 95% !important;
    }

    .gym-routine-table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    /* Force table to maintain width and scroll */
    .gym-routine-table {
        table-layout: fixed !important;
        width: auto !important;
        min-width: 500px !important;
    }



    .gym-routine-table-container {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
    }

    .gym-routine-table th,
    .gym-routine-table td {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: none !important;
        min-width: 120px !important; /* Force minimum column width */
        width: 120px !important;
    }
}
`