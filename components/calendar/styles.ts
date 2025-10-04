export const calendarStyles = `
                .fc .fc-toolbar-chunk {
                    position: static !important;
                }
                .fc .fc-button-primary {
                    background-color: var(--interactive-normal) !important;
                    border-color: var(--background-modifier-border) !important;
                    color: var(--text-normal) !important;
                }
                .fc .fc-button-primary:hover {
                    background-color: var(--interactive-hover) !important;
                    border-color: var(--background-modifier-border-hover) !important;
                }
                .fc .fc-button-primary:focus {
                    box-shadow: none !important;
                    outline: none !important;
                }
                .fc .fc-button-primary:disabled {
                    background-color: var(--background-modifier-form-field) !important;
                    border-color: var(--background-modifier-border) !important;
                    color: var(--text-muted) !important;
                    opacity: 0.6;
                }
                .fc .fc-daygrid-day.fc-day-today {
                    background-color: var(--color-accent) !important;
                    color: var(--text-on-accent) !important;
                }
                .fc .fc-day-today{
                    background-color: hsla(var(--color-accent-hsl), 0.25) !important;
                }
                .fc .fc-scrollgrid-section-sticky > * {
                    background: var(--background-primary) !important;
                    color: var(--text-normal) !important;
                    border: 1px solid var(--background-modifier-border) !important;
                }
                .fc-scrollgrid {
                    border: none !important;
                }
                .fc-scrollgrid {
                    border-top: var(--table-border-width) solid var(--table-border-color)
                }
                .fc-v-event {
                    background-color: var(--color-accent) !important;
                    border: none !important;
                }
                .fc th, .fc td {
                    padding: 0px 2px !important;
                }
                .fc .fc-timegrid-slot {
                    height: 1.5em !important;
                }
                .fc .fc-timegrid-slot-minor {
                    height: 0.75em !important;
                }
                .fc .fc-daygrid-day-frame {
                    padding: 2px !important;
                    min-height: 2em !important;
                }
                .fc .fc-col-header-cell {
                    padding: 4px 2px !important;
                }
                .fc .fc-today-button {
                    text-transform: capitalize !important;
                }
                .fc .fc-button {
                    line-height: 1.2 !important;
                    vertical-align: middle !important;
                }
                .fc .fc-button-primary {
                    padding: 6px 12px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .fc {
                    --p-spacing: 0px !important;
                }
                .fc thead>tr>th {
                    border-top: 1px solid var(--background-modifier-border) !important;
                }
            `