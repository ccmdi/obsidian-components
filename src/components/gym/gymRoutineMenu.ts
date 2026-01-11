import { Component, ComponentAction, ComponentInstance } from "components";
import { ComponentGroup } from "groups";
import { gymRoutineMenuStyles } from "./styles";
import { Notice } from "obsidian";
import { Routine } from "./types";

export const gymRoutineMenu: Component<[]> = {
    keyName: 'gym-routine-menu',
    name: 'Gym Routine Menu',
    description: 'Display a menu for selecting a gym routine',
    icon: 'dumbbell',
    args: {},
    isMountable: true,
    group: ComponentGroup.GYM,
    styles: gymRoutineMenuStyles,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const initiator = ctx.sourcePath;
        const file = app.vault.getFileByPath(initiator);
        if (!file) {
            el.textContent = 'Could not find source file';
            return;
        }

        let routines: Routine[] = [];

        // Load routines from frontmatter
        async function loadRoutines() {
            const cache = app.metadataCache.getFileCache(file!);
            routines = cache?.frontmatter?.routines || [];
        }

        // Save routines to frontmatter
        async function saveRoutines() {
            try {
                await app.fileManager.processFrontMatter(file!, (frontmatter) => {
                    frontmatter.routines = routines;
                });
            } catch (error) {
                console.error('Error saving routines:', error);
                new Notice('Error saving routines: ' + (error as Error).message);
            }
        }

        function generateId() {
            return crypto.randomUUID();
        }

        // Initialize
        await loadRoutines();

        // Create main container
        const container = el.createEl("div", { cls: "gym-routine-container" });

        // Header
        const header = container.createEl("div", { cls: "gym-routine-header" });
        header.createEl("div", { cls: "empty-column" });
        header.createEl("h2", { text: "Gym Routines" });
        const addRoutineBtn = header.createEl("button", { text: "+", cls: "add-routine-btn" });

        // Main content area
        const mainContent = container.createEl("div", { cls: "gym-routine-main" });

        // RENDER FUNCTIONS

        function renderRoutinesList() {
            mainContent.empty();
            
            if (routines.length === 0) {
                const emptyState = mainContent.createEl("div", { cls: "gym-routine-empty" });
                emptyState.createEl("p", { text: "No routines yet. Create your first workout routine!" });
                return;
            }

            const routinesList = mainContent.createEl("div", { cls: "gym-routines-list" });
            
            routines.forEach(routine => {
                const card = routinesList.createEl("div", { cls: "gym-routine-card" });
                
                const cardHeader = card.createEl("div", { cls: "gym-routine-card-header" });
                cardHeader.createEl("h3", { text: routine.name });
                const editBtn = cardHeader.createEl("button", { text: "Edit", cls: "edit-btn" });

                const daysInfo = card.createEl("div", { cls: "info" });
                daysInfo.createEl("strong", { text: "Days: " });
                daysInfo.appendText(routine.days.length > 0 ? routine.days.join(', ') : 'No days selected');

                const exerciseInfo = card.createEl("div", { cls: "info" });
                exerciseInfo.createEl("strong", { text: "Exercises: " });
                exerciseInfo.appendText(`${routine.exercises.length} exercises`);

                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderRoutineForm(routine);
                });

                card.addEventListener('click', () => renderRoutineView(routine));
            });
        }

        function renderRoutineForm(routine: Routine | null = null) {
            mainContent.empty();
            
            const isEditing = routine !== null;
            const formData: Routine = routine || {
                id: generateId(),
                name: '',
                days: [],
                exercises: []
            };

            const formContainer = mainContent.createEl("div", { cls: "gym-routine-form" });

            // Header
            const formHeader = formContainer.createEl("div", { cls: "gym-routine-form-header" });
            const backBtn = formHeader.createEl("button", { text: "←", cls: "back-btn" });
            formHeader.createEl("h3", { text: isEditing ? 'Edit Routine' : 'Create New Routine' });

            const formContent = formContainer.createEl("div", { cls: "gym-routine-form-content" });

            // Name section
            const nameSection = formContent.createEl("div", { cls: "gym-routine-form-section" });
            nameSection.createEl("label", { text: "Routine Name" });
            const nameInput = nameSection.createEl("input", {
                type: "text",
                value: formData.name,
                placeholder: "Enter routine name..."
            });

            // Days section
            const daysSection = formContent.createEl("div", { cls: "gym-routine-form-section" });
            daysSection.createEl("label", { text: "Days of the Week" });
            const daysSelector = daysSection.createEl("div", { cls: "gym-routine-days" });

            const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            const daysFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            
            days.forEach((day, index) => {
                const dayFull = daysFull[index];
                const isSelected = formData.days.includes(dayFull);
                const dayBtn = daysSelector.createEl("button", {
                    text: day,
                    cls: isSelected ? "selected" : ""
                });

                dayBtn.addEventListener('click', () => {
                    const idx = formData.days.indexOf(dayFull);
                    if (idx > -1) {
                        formData.days.splice(idx, 1);
                        dayBtn.classList.remove('selected');
                    } else {
                        formData.days.push(dayFull);
                        dayBtn.classList.add('selected');
                    }
                });
            });

            // Exercises section
            const exercisesSection = formContent.createEl("div", { cls: "gym-routine-form-section" });
            const exercisesHeader = exercisesSection.createEl("div", { cls: "gym-routine-exercises-header" });
            exercisesHeader.createEl("div");
            exercisesHeader.createEl("label", { text: "Exercises" });
            const addExerciseBtn = exercisesHeader.createEl("button", { text: "+", cls: "add-exercise-btn" });

            const exercisesList = exercisesSection.createEl("div");

            function renderExercisesList() {
                exercisesList.empty();

                if (formData.exercises.length === 0) {
                    exercisesList.createEl("div", {
                        text: "No exercises added yet.",
                        cls: "gym-routine-exercises-empty"
                    });
                    return;
                }

                formData.exercises.forEach((exercise, index) => {
                    const row = exercisesList.createEl("div", { cls: "gym-routine-exercise-row" });

                    const nameInput = row.createEl("input", {
                        type: "text",
                        value: exercise.name,
                        placeholder: "Exercise name"
                    });

                    const setsInput = row.createEl("input", {
                        type: "number",
                        value: exercise.sets,
                        placeholder: "Sets"
                    });

                    const repsInput = row.createEl("input", {
                        type: "number",
                        value: exercise.reps,
                        placeholder: "Reps"
                    });

                    const weightInput = row.createEl("input", {
                        type: "text",
                        value: exercise.weight,
                        placeholder: "Weight"
                    });

                    const removeBtn = row.createEl("button", { text: "×", cls: "remove-btn" });

                    nameInput.addEventListener('change', () => exercise.name = nameInput.value);
                    setsInput.addEventListener('change', () => exercise.sets = setsInput.value);
                    repsInput.addEventListener('change', () => exercise.reps = repsInput.value);
                    weightInput.addEventListener('change', () => exercise.weight = weightInput.value);
                    removeBtn.addEventListener('click', () => {
                        formData.exercises.splice(index, 1);
                        renderExercisesList();
                    });
                });
            }

            renderExercisesList();

            addExerciseBtn.addEventListener('click', () => {
                formData.exercises.push({ name: '', sets: '', reps: '', weight: '' });
                renderExercisesList();
            });

            // Buttons section
            const buttonsSection = formContent.createEl("div", { cls: "gym-routine-form-buttons" });
            const saveBtn = buttonsSection.createEl("button", {
                text: isEditing ? 'Update Routine' : 'Create Routine',
                cls: "save-btn"
            });

            if (isEditing) {
                const deleteBtn = buttonsSection.createEl("button", { text: "Delete", cls: "delete-btn" });
                deleteBtn.addEventListener('click', async () => {
                    routines = routines.filter(r => r.id !== routine.id);
                    await saveRoutines();
                    await loadRoutines();
                    renderRoutinesList();
                    new Notice('Routine deleted');
                });
            }

            backBtn.addEventListener('click', renderRoutinesList);

            saveBtn.addEventListener('click', async () => {
                const name = nameInput.value.trim();
                
                if (!name) {
                    new Notice('Please enter a routine name');
                    return;
                }

                formData.name = name;

                if (isEditing) {
                    const index = routines.findIndex(r => r.id === routine.id);
                    routines[index] = formData;
                } else {
                    routines.push(formData);
                }

                await saveRoutines();
                renderRoutinesList();
            });
        }

        function renderRoutineView(routine: Routine) {
            mainContent.empty();

            const viewContainer = mainContent.createEl("div", { cls: "gym-routine-view" });

            // Header
            const viewHeader = viewContainer.createEl("div", { cls: "gym-routine-view-header" });
            const headerLeft = viewHeader.createEl("div", { cls: "gym-routine-view-header-left" });
            const backBtn = headerLeft.createEl("button", { text: "←", cls: "back-btn" });
            headerLeft.createEl("h3", { text: routine.name });
            const editBtn = viewHeader.createEl("button", { text: "Edit Routine", cls: "edit-btn" });

            const viewContent = viewContainer.createEl("div", { cls: "gym-routine-view-content" });

            // Schedule section
            const scheduleSection = viewContent.createEl("div", { cls: "gym-routine-view-section" });
            scheduleSection.createEl("h4", { text: "Schedule" });
            const scheduleInfo = scheduleSection.createEl("div", { cls: "schedule-info" });
            scheduleInfo.createEl("strong", { text: "Days: " });
            scheduleInfo.appendText(routine.days.length > 0 ? routine.days.join(', ') : 'No days scheduled');

            // Exercises section
            if (routine.exercises.length > 0) {
                const tableContainer = viewContent.createEl("div", { cls: "gym-routine-table-container" });
                const table = tableContainer.createEl("table", { cls: "gym-routine-table" });

                const thead = table.createEl("thead");
                const headerRow = thead.createEl("tr");
                ['Exercise', 'Sets', 'Reps', 'Weight'].forEach(header => {
                    headerRow.createEl("th", { text: header });
                });

                const tbody = table.createEl("tbody");
                routine.exercises.forEach(exercise => {
                    const row = tbody.createEl("tr");
                    row.createEl("td", { text: exercise.name || 'Unnamed exercise' });
                    row.createEl("td", { text: exercise.sets || '-' });
                    row.createEl("td", { text: exercise.reps || '-' });
                    row.createEl("td", { text: exercise.weight || '-' });
                });
            } else {
                viewContent.createEl("div", {
                    text: "No exercises in this routine yet.",
                    cls: "gym-routine-view-empty"
                });
            }

            backBtn.addEventListener('click', renderRoutinesList);
            editBtn.addEventListener('click', () => renderRoutineForm(routine));
        }

        // Event listeners
        addRoutineBtn.addEventListener('click', () => renderRoutineForm());

        // Initial render
        renderRoutinesList();
    }
};