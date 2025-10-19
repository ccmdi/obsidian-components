import { Component, ComponentGroup, ComponentInstance, ComponentAction } from "components";
import { gymRoutineMenuStyles } from "./styles";

export const gymWorkoutTracker: Component<[]> = {
    keyName: 'gym-workout-tracker',
    name: 'Gym Workout Tracker',
    description: 'Track your workout progress for the day',
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

        const cache = app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter;

        let workoutData: WorkoutExercise[] = frontmatter?.exercises || [];
        const routineData = frontmatter?.routines || [];

        if (workoutData.length === 0) {
            el.createEl("p", { text: "No exercises found for today" });
            return;
        }

        // Save workout data function
        async function saveWorkout() {
            try {
                await app.fileManager.processFrontMatter(file!, (frontmatter) => {
                    frontmatter.exercises = workoutData;
                });
            } catch (error) {
                console.error('Error saving workout:', error);
            }
        }

        // Create main container
        const container = el.createEl("div", { cls: "gym-routine-container" });

        // Main content area
        const mainContent = container.createEl("div", { cls: "gym-routine-main" });

        // Group exercises by routine
        const exercisesByRoutine: { [key: string]: WorkoutExercise[] } = {};
        workoutData.forEach(exercise => {
            if (!exercisesByRoutine[exercise.routine]) {
                exercisesByRoutine[exercise.routine] = [];
            }
            exercisesByRoutine[exercise.routine].push(exercise);
        });

        // Process each routine
        Object.keys(exercisesByRoutine).forEach(routineName => {
            const routineSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });

            routineSection.createEl("h3", {
                text: routineName,
                attr: {
                    style: "color: var(--text-accent); margin-bottom: 15px;"
                }
            });

            const tableContainer = routineSection.createEl("div", { cls: "gym-routine-table-container" });

            const table = tableContainer.createEl("table", {
                cls: "gym-routine-table",
                attr: {
                    style: "table-layout: fixed; width: 100%;"
                }
            });

            const thead = table.createEl("thead");
            const headerRow = thead.createEl("tr");

            // Fixed column widths
            const headers = [
                { text: 'Exercise', width: '25%' },
                { text: 'Set', width: '10%' },
                { text: 'Target', width: '15%' },
                { text: 'Actual Reps', width: '15%' },
                { text: 'Actual Weight', width: '15%' },
                { text: 'Complete', width: '20%' }
            ];

            headers.forEach(header => {
                headerRow.createEl("th", {
                    text: header.text,
                    attr: {
                        style: `width: ${header.width};`
                    }
                });
            });

            const tbody = table.createEl("tbody");

            exercisesByRoutine[routineName].forEach((exercise, exerciseIndex) => {
                exercise.sets.forEach((set, setIndex) => {
                    const row = tbody.createEl("tr", {
                        attr: {
                            style: set.completed ?
                                "background: hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.3); opacity: 0.7;" :
                                ""
                        }
                    });

                    // Exercise name (only show on first set)
                    row.createEl("td", {
                        text: setIndex === 0 ? exercise.name : '',
                        attr: {
                            style: "padding: 8px 12px; border: 1px solid var(--background-modifier-border); vertical-align: middle;"
                        }
                    });

                    // Set number
                    row.createEl("td", {
                        text: `${set.setNumber}`,
                        attr: {
                            style: "padding: 8px 12px; text-align: center; border: 1px solid var(--background-modifier-border); vertical-align: middle;"
                        }
                    });

                    // Target info
                    const targetText = `${set.targetReps}${set.targetWeight ? ' @ ' + set.targetWeight : ''}`;
                    row.createEl("td", {
                        text: targetText,
                        attr: {
                            style: "padding: 8px 12px; text-align: center; border: 1px solid var(--background-modifier-border); vertical-align: middle; font-size: 14px;"
                        }
                    });

                    // Actual reps input
                    const repsCell = row.createEl("td", {
                        attr: {
                            style: "padding: 8px 12px; text-align: center; border: 1px solid var(--background-modifier-border); vertical-align: middle;"
                        }
                    });
                    const repsInput = repsCell.createEl("input", {
                        type: "number",
                        value: set.actualReps,
                        placeholder: set.targetReps,
                        attr: {
                            style: `
                                border: 1px solid var(--background-modifier-border);
                                background: var(--background-primary);
                                color: var(--text-normal);
                                width: 100%;
                                text-align: center;
                                padding: 4px;
                                box-sizing: border-box;
                            `
                        }
                    });
                    repsInput.addEventListener('change', async () => {
                        set.actualReps = repsInput.value;
                        await saveWorkout();
                    });

                    // Actual weight input
                    const weightCell = row.createEl("td", {
                        attr: {
                            style: "padding: 8px 12px; text-align: center; border: 1px solid var(--background-modifier-border); vertical-align: middle;"
                        }
                    });
                    const weightInput = weightCell.createEl("input", {
                        type: "text",
                        value: set.actualWeight,
                        placeholder: set.targetWeight,
                        attr: {
                            style: `
                                border: 1px solid var(--background-modifier-border);
                                background: var(--background-primary);
                                color: var(--text-normal);
                                width: 100%;
                                text-align: center;
                                padding: 4px;
                                box-sizing: border-box;
                            `
                        }
                    });
                    weightInput.addEventListener('change', async () => {
                        set.actualWeight = weightInput.value;
                        await saveWorkout();
                    });

                    // Complete checkbox
                    const completeCell = row.createEl("td", {
                        attr: {
                            style: "padding: 8px 12px; text-align: center; border: 1px solid var(--background-modifier-border); vertical-align: middle;"
                        }
                    });

                    const checkbox = completeCell.createEl("input", {
                        type: "checkbox",
                        attr: {
                            style: `
                                cursor: pointer;
                                accent-color: var(--interactive-accent);
                            `
                        }
                    });

                    if (set.completed) {
                        checkbox.checked = true;
                    }

                    checkbox.addEventListener('change', async () => {
                        set.completed = checkbox.checked;

                        // Update row styling
                        if (set.completed) {
                            row.style.background = "hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.3)";
                            row.style.opacity = "0.7";
                        } else {
                            row.style.background = "";
                            row.style.opacity = "";
                        }

                        await saveWorkout();
                    });
                });
            });
        });
    }
};

// Types
interface WorkoutSet {
    setNumber: number;
    targetReps: string;
    targetWeight: string;
    actualReps: string;
    actualWeight: string;
    completed: boolean;
}

interface WorkoutExercise {
    name: string;
    routine: string;
    sets: WorkoutSet[];
}