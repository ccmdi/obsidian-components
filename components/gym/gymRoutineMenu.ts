import { Component, ComponentInstance } from "../../components";

export const gymRoutineMenu: Component<[]> = {
    keyName: 'gym-routine-menu',
    name: 'Gym Routine Menu',
    description: 'Display a menu for selecting a gym routine',
    args: {},
    isMountable: true,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const initiator = ctx.sourcePath;
        const file = app.vault.getFileByPath(initiator);
        if (!file) {
            el.textContent = 'Could not find source file';
            return;
        }
        const cache = app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        const routineData = {
            routines: frontmatter?.routines || [],
            activeRoutine: null,
            editingRoutine: false
        };

        // Utility functions
        async function saveRoutines() {
            try {
                const file = app.vault.getFileByPath(initiator);
                if (!file) {
                    throw new Error('Could not find file in vault');
                }
                
                await app.fileManager.processFrontMatter(file, (frontmatter) => {
                    frontmatter.routines = routineData.routines;
                });
            } catch (error) {
                console.error('Error saving routines:', error);
                alert('Error saving routines: ' + error.message);
            }
        }

        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        // Create main container
        const container = el.createEl("div", { cls: "gym-routine-container" });

        // Header
        const header = el.createEl("div", { cls: "gym-routine-header" });

        const headerTitle = el.createEl("h2", { text: "Gym Routines" });

        const addRoutineBtn = el.createEl("button", { text: "+", cls: "add-routine-btn" });

        header.appendChild(el.createEl("div", { cls: "empty-column" })); // Empty first column
        header.appendChild(headerTitle);
        header.appendChild(addRoutineBtn);
        container.appendChild(header);

        // Main content area
        const mainContent = el.createEl("div", { cls: "gym-routine-main" });
        container.appendChild(mainContent);

        // Exercise management functions
        let currentFormData = null;
        let exerciseInputs = [];

        function updateExercise(index, field, value) {
            if (currentFormData && currentFormData.exercises[index]) {
                currentFormData.exercises[index][field] = value;
            }
        }

        function removeExercise(index) {
            if (currentFormData && currentFormData.exercises[index]) {
                currentFormData.exercises.splice(index, 1);
                // Re-render will be handled by the specific context
            }
        }

        // Render routines list
        function renderRoutinesList() {
            mainContent.innerHTML = "";
            exerciseInputs = [];
            currentFormData = null;
            
            if (routineData.routines.length === 0) {
                const emptyState = dv.el("div", "", {
                    attr: { class: "gym-routine-empty" }
                });
                
                emptyState.innerHTML = `
                    <p>No routines yet. Create your first workout routine!</p>
                `;
                
                mainContent.appendChild(emptyState);
                return;
            }

            const routinesList = dv.el("div", "", {
                attr: { class: "gym-routines-list" }
            });
            
            routineData.routines.forEach(routine => {
                const routineCard = dv.el("div", "", {
                    attr: { class: "gym-routine-card" }
                });

                const cardHeader = dv.el("div", "", {
                    attr: { class: "gym-routine-card-header" }
                });

                const routineTitle = dv.el("h3", routine.name);

                const editBtn = dv.el("button", "Edit", {
                    attr: { class: "edit-btn" }
                });

                const daysInfo = dv.el("div", "", {
                    attr: { class: "info" }
                });
                daysInfo.innerHTML = `<strong>Days:</strong> ${routine.days.length > 0 ? routine.days.join(', ') : 'No days selected'}`;

                const exerciseInfo = dv.el("div", "", {
                    attr: { class: "info" }
                });
                exerciseInfo.innerHTML = `<strong>Exercises:</strong> ${routine.exercises.length} exercises`;

                const clickHint = dv.el("div", "Click to view details", {
                    attr: { class: "click-hint" }
                });

                cardHeader.appendChild(routineTitle);
                cardHeader.appendChild(editBtn);
                routineCard.appendChild(cardHeader);
                routineCard.appendChild(daysInfo);
                routineCard.appendChild(exerciseInfo);
                routineCard.appendChild(clickHint);

                // Event listeners
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showRoutineForm(routine);
                });

                routineCard.addEventListener('click', () => {
                    viewRoutine(routine);
                });

                routineCard.addEventListener('mouseenter', () => {
                    routineCard.classList.add('hover');
                });

                routineCard.addEventListener('mouseleave', () => {
                    routineCard.classList.remove('hover');
                });

                routinesList.appendChild(routineCard);
            });

            mainContent.appendChild(routinesList);
        }

        // Create/Edit routine form
        function showRoutineForm(routine = null) {
            const isEditing = routine !== null;
            currentFormData = routine || {
                id: generateId(),
                name: '',
                days: [],
                exercises: []
            };

            mainContent.innerHTML = "";
            exerciseInputs = [];

            const formContainer = dv.el("div", "", {
                attr: { class: "gym-routine-form" }
            });

            const formHeader = dv.el("div", "", {
                attr: { class: "gym-routine-form-header" }
            });

            const backBtn = dv.el("button", "←", {
                attr: { class: "back-btn" }
            });

            const formTitle = dv.el("h3", isEditing ? 'Edit Routine' : 'Create New Routine');

            formHeader.appendChild(backBtn);
            formHeader.appendChild(formTitle);

            const formContent = dv.el("div", "", {
                attr: { class: "gym-routine-form-content" }
            });

            // Name input section
            const nameSection = dv.el("div", "", {
                attr: { class: "gym-routine-form-section" }
            });

            const nameLabel = dv.el("label", "Routine Name");

            const nameInput = dv.el("input", "", {
                attr: {
                    type: "text",
                    value: currentFormData.name,
                    placeholder: "Enter routine name..."
                }
            });

            nameSection.appendChild(nameLabel);
            nameSection.appendChild(nameInput);

            // Days section
            const daysSection = dv.el("div", "", {
                attr: { class: "gym-routine-form-section" }
            });

            const daysLabel = dv.el("label", "Days of the Week");

            const daysSelector = dv.el("div", "", {
                attr: { class: "gym-routine-days" }
            });

            const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const daysFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            
            days.forEach((day, index) => {
                const dayFull = daysFull[index];
                const isSelected = currentFormData.days.includes(dayFull);
                const dayBtn = dv.el("button", day, {
                    attr: { class: isSelected ? "selected" : "" }
                });

                dayBtn.addEventListener('click', () => {
                    const currentlySelected = currentFormData.days.includes(dayFull);
                    if (currentlySelected) {
                        currentFormData.days = currentFormData.days.filter(d => d !== dayFull);
                        dayBtn.classList.remove('selected');
                    } else {
                        currentFormData.days.push(dayFull);
                        dayBtn.classList.add('selected');
                    }
                });

                daysSelector.appendChild(dayBtn);
            });

            daysSection.appendChild(daysLabel);
            daysSection.appendChild(daysSelector);

            // Exercises section
            const exercisesSection = dv.el("div", "", {
                attr: { class: "gym-routine-form-section" }
            });

            const exercisesHeader = dv.el("div", "", {
                attr: { class: "gym-routine-exercises-header" }
            });

            const exercisesLabel = dv.el("label", "Exercises");

            const addExerciseBtn = dv.el("button", "", {
                attr: { 
                    class: "add-exercise-btn" 
                }
            });
            addExerciseBtn.textContent = "+";

            const exercisesList = dv.el("div", "");

            exercisesHeader.appendChild(dv.el("div", "")); // Empty first column
            exercisesHeader.appendChild(exercisesLabel);
            exercisesHeader.appendChild(addExerciseBtn);
            exercisesSection.appendChild(exercisesHeader);
            exercisesSection.appendChild(exercisesList);

            // Buttons section
            const buttonsSection = dv.el("div", "", {
                attr: { class: "gym-routine-form-buttons" }
            });

            const saveBtn = dv.el("button", isEditing ? 'Update Routine' : 'Create Routine', {
                attr: { class: "save-btn" }
            });

            buttonsSection.appendChild(saveBtn);

            if (isEditing) {
                const deleteBtn = dv.el("button", "Delete", {
                    attr: { class: "delete-btn" }
                });

                deleteBtn.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this routine?')) {
                        routineData.routines = routineData.routines.filter(r => r.id !== routine.id);
                        await saveRoutines();
                        renderRoutinesList();
                    }
                });

                buttonsSection.appendChild(deleteBtn);
            }

            // Assembly
            formContent.appendChild(nameSection);
            formContent.appendChild(daysSection);
            formContent.appendChild(exercisesSection);
            formContent.appendChild(buttonsSection);
            formContainer.appendChild(formHeader);
            formContainer.appendChild(formContent);
            mainContent.appendChild(formContainer);

            // Setup exercises list
            function renderExercisesList() {
                exercisesList.innerHTML = '';
                exerciseInputs = [];

                if (currentFormData.exercises.length === 0) {
                    const emptyState = dv.el("div", "No exercises added yet. Click Add Exercise to get started.", {
                        attr: { class: "gym-routine-exercises-empty" }
                    });
                    exercisesList.appendChild(emptyState);
                    return;
                }

                currentFormData.exercises.forEach((exercise, index) => {
                    const exerciseRow = dv.el("div", "", {
                        attr: { class: "gym-routine-exercise-row" }
                    });

                    const nameInput = dv.el("input", "", {
                        attr: {
                            type: "text",
                            value: exercise.name,
                            placeholder: "Exercise name"
                        }
                    });

                    const setsInput = dv.el("input", "", {
                        attr: {
                            type: "number",
                            value: exercise.sets,
                            placeholder: "Sets"
                        }
                    });

                    const repsInput = dv.el("input", "", {
                        attr: {
                            type: "number",
                            value: exercise.reps,
                            placeholder: "Reps"
                        }
                    });

                    const weightInput = dv.el("input", "", {
                        attr: {
                            type: "text",
                            value: exercise.weight,
                            placeholder: "Weight"
                        }
                    });

                    const removeBtn = dv.el("button", "×", {
                        attr: { class: "remove-btn" }
                    });

                    // Event listeners for inputs
                    nameInput.addEventListener('change', () => updateExercise(index, 'name', nameInput.value));
                    setsInput.addEventListener('change', () => updateExercise(index, 'sets', setsInput.value));
                    repsInput.addEventListener('change', () => updateExercise(index, 'reps', repsInput.value));
                    weightInput.addEventListener('change', () => updateExercise(index, 'weight', weightInput.value));
                    removeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentFormData && currentFormData.exercises[index]) {
                            currentFormData.exercises.splice(index, 1);
                            renderExercisesList();
                        }
                    });

                    exerciseRow.appendChild(nameInput);
                    exerciseRow.appendChild(setsInput);
                    exerciseRow.appendChild(repsInput);
                    exerciseRow.appendChild(weightInput);
                    exerciseRow.appendChild(removeBtn);

                    exercisesList.appendChild(exerciseRow);
                });
            }

            renderExercisesList();

            // Event listeners
            backBtn.addEventListener('click', renderRoutinesList);

            addExerciseBtn.addEventListener('click', () => {
                currentFormData.exercises.push({
                    name: '',
                    sets: '',
                    reps: '',
                    weight: ''
                });
                renderExercisesList();
            });

            saveBtn.addEventListener('click', async () => {
                const name = nameInput.value.trim();
                
                if (!name) {
                    alert('Please enter a routine name');
                    return;
                }

                currentFormData.name = name;

                if (isEditing) {
                    const index = routineData.routines.findIndex(r => r.id === routine.id);
                    routineData.routines[index] = currentFormData;
                } else {
                    routineData.routines.push(currentFormData);
                }

                await saveRoutines();
                renderRoutinesList();
            });
        }

        // View routine details
        function viewRoutine(routine) {
            mainContent.innerHTML = "";
            currentFormData = null;
            exerciseInputs = [];

            const viewContainer = dv.el("div", "", {
                attr: { class: "gym-routine-view" }
            });

            const viewHeader = dv.el("div", "", {
                attr: { class: "gym-routine-view-header" }
            });

            const headerLeft = dv.el("div", "", {
                attr: { class: "gym-routine-view-header-left" }
            });

            const backBtn = dv.el("button", "←", {
                attr: { class: "back-btn" }
            });

            const routineTitle = dv.el("h3", routine.name);

            const editBtn = dv.el("button", "Edit Routine", {
                attr: { class: "edit-btn" }
            });

            headerLeft.appendChild(backBtn);
            headerLeft.appendChild(routineTitle);
            viewHeader.appendChild(headerLeft);
            viewHeader.appendChild(editBtn);

            const viewContent = dv.el("div", "", {
                attr: { class: "gym-routine-view-content" }
            });

            // Schedule section
            const scheduleSection = dv.el("div", "", {
                attr: { class: "gym-routine-view-section" }
            });

            const scheduleTitle = dv.el("h4", "Schedule");

            const scheduleInfo = dv.el("div", "", {
                attr: { class: "schedule-info" }
            });
            scheduleInfo.innerHTML = routine.days.length > 0 ? 
                `<strong>Days:</strong> ${routine.days.join(', ')}` : 
                'No days scheduled';

            scheduleSection.appendChild(scheduleTitle);
            scheduleSection.appendChild(scheduleInfo);

            // Exercises section
            const exercisesSection = dv.el("div", "");

            if (routine.exercises.length > 0) {
                const tableContainer = dv.el("div", "", {
                    attr: { class: "gym-routine-table-container" }
                });

                const table = dv.el("table", "", {
                    attr: { class: "gym-routine-table" }
                });

                const thead = dv.el("thead");
                const headerRow = dv.el("tr");

                ['Exercise', 'Sets', 'Reps', 'Weight'].forEach(header => {
                    const th = dv.el("th", header);
                    headerRow.appendChild(th);
                });

                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = dv.el("tbody");
                routine.exercises.forEach(exercise => {
                    const row = dv.el("tr");
                    
                    const nameCell = dv.el("td", exercise.name || 'Unnamed exercise');
                    const setsCell = dv.el("td", exercise.sets || '-');
                    const repsCell = dv.el("td", exercise.reps || '-');
                    const weightCell = dv.el("td", exercise.weight || '-');

                    row.appendChild(nameCell);
                    row.appendChild(setsCell);
                    row.appendChild(repsCell);
                    row.appendChild(weightCell);
                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                tableContainer.appendChild(table);
                exercisesSection.appendChild(tableContainer);
            } else {
                const emptyState = dv.el("div", "No exercises in this routine yet.", {
                    attr: { class: "gym-routine-view-empty" }
                });
                exercisesSection.appendChild(emptyState);
            }

            viewContent.appendChild(scheduleSection);
            viewContent.appendChild(exercisesSection);
            viewContainer.appendChild(viewHeader);
            viewContainer.appendChild(viewContent);
            mainContent.appendChild(viewContainer);

            // Event listeners
            backBtn.addEventListener('click', renderRoutinesList);
            editBtn.addEventListener('click', () => showRoutineForm(routine));
        }

        // Event listeners
        addRoutineBtn.addEventListener('click', () => showRoutineForm());

        // Initial render
        renderRoutinesList();
    }
}