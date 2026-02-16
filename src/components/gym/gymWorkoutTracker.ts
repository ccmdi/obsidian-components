import { Component, ComponentInstance, ComponentAction } from "components";
import { ComponentGroup } from "groups";
import { gymRoutineMenuStyles } from "./styles";
import { WorkoutExercise } from "./types";

export const gymWorkoutTracker: Component<[]> = {
    keyName: 'gym-workout-tracker',
    name: 'Gym Workout Tracker',
    description: 'Track your workout progress for the day',
    icon: 'dumbbell',
    args: {},
    isMountable: true,
    group: ComponentGroup.GYM,
    styles: gymRoutineMenuStyles,
    does: [ComponentAction.READ, ComponentAction.WRITE],
    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const initiator = ctx.sourcePath;
        const file = app.vault.getFileByPath(initiator);
        if (!file) {
            el.textContent = 'Could not find source file';
            return;
        }

        const cache = app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        const workoutData: WorkoutExercise[] = frontmatter?.exercises || [];

        if (workoutData.length === 0) {
            el.createEl("p", { text: "No exercises found for today" });
            return;
        }

        async function saveWorkout() {
            try {
                await app.fileManager.processFrontMatter(file!, (frontmatter) => {
                    frontmatter.exercises = workoutData;
                });
            } catch (error) {
                console.error('Error saving workout:', error);
            }
        }

        const container = el.createEl("div", { cls: "gym-routine-container" });
        const mainContent = container.createEl("div", { cls: "gym-routine-main" });

        const exercisesByRoutine: { [key: string]: WorkoutExercise[] } = {};
        workoutData.forEach(exercise => {
            if (!exercisesByRoutine[exercise.routine]) {
                exercisesByRoutine[exercise.routine] = [];
            }
            exercisesByRoutine[exercise.routine].push(exercise);
        });

        Object.keys(exercisesByRoutine).forEach(routineName => {
            const routineSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
            routineSection.createEl("h3", { text: routineName, cls: "gym-section-title" });

            const tableContainer = routineSection.createEl("div", { cls: "gym-routine-table-container" });
            const table = tableContainer.createEl("table", { cls: "gym-routine-table" });

            const thead = table.createEl("thead");
            const headerRow = thead.createEl("tr");

            const headers = ['Exercise', 'Set', 'Target', 'Actual Reps', 'Actual Weight', 'Complete'];
            headers.forEach(text => {
                headerRow.createEl("th", { text });
            });

            const tbody = table.createEl("tbody");

            exercisesByRoutine[routineName].forEach((exercise) => {
                exercise.sets.forEach((set, setIndex) => {
                    const row = tbody.createEl("tr");
                    if (set.completed) row.addClass('completed');

                    row.createEl("td", {
                        text: setIndex === 0 ? exercise.name : '',
                        cls: 'text-left'
                    });

                    row.createEl("td", { text: `${set.setNumber}` });

                    const targetText = `${set.targetReps}${set.targetWeight ? ' @ ' + set.targetWeight : ''}`;
                    row.createEl("td", { text: targetText });

                    const repsCell = row.createEl("td");
                    const repsInput = repsCell.createEl("input", {
                        type: "number",
                        value: set.actualReps,
                        placeholder: set.targetReps
                    });
                    repsInput.addEventListener('change', async () => {
                        set.actualReps = repsInput.value;
                        await saveWorkout();
                    });

                    const weightCell = row.createEl("td");
                    const weightInput = weightCell.createEl("input", {
                        type: "text",
                        value: set.actualWeight,
                        placeholder: set.targetWeight
                    });
                    weightInput.addEventListener('change', async () => {
                        set.actualWeight = weightInput.value;
                        await saveWorkout();
                    });

                    const completeCell = row.createEl("td");
                    const checkbox = completeCell.createEl("input", { type: "checkbox" });

                    if (set.completed) {
                        checkbox.checked = true;
                    }

                    checkbox.addEventListener('change', async () => {
                        set.completed = checkbox.checked;
                        row.toggleClass('completed', set.completed);
                        await saveWorkout();
                    });
                });
            });
        });
    }
};
