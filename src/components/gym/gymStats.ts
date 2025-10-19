import { Component, ComponentGroup, ComponentInstance } from "components";
import { gymRoutineMenuStyles } from "./styles";
import { TFile, TFolder } from "obsidian";

export const gymStats: Component<[]> = {
    keyName: 'gym-stats',
    name: 'Gym Stats',
    description: 'Display stats for your workouts',
    args: {},
    isMountable: true,
    group: ComponentGroup.GYM,
    styles: gymRoutineMenuStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        // Get all workout files from the Gym folder
        const gymFolder = app.vault.getAbstractFileByPath("gym");
        if (!gymFolder || !(gymFolder instanceof TFolder)) {
            el.createEl("p", { text: "Gym folder not found" });
            return;
        }

        const workoutFiles: WorkoutFile[] = [];
        
        for (const file of gymFolder.children) {
            if (file instanceof TFile && file.extension === 'md') {
                const cache = app.metadataCache.getFileCache(file);
                const frontmatter = cache?.frontmatter;
                
                if (frontmatter?.exercises && frontmatter.exercises.length > 0) {
                    workoutFiles.push({
                        date: frontmatter.date,
                        exercises: frontmatter.exercises,
                        routines: frontmatter.routines
                    });
                }
            }
        }

        console.log(workoutFiles);

        if (workoutFiles.length === 0) {
            el.createEl("p", { text: "No workout data found" });
            return;
        }

        // Create main container
        const container = el.createEl("div", { cls: "gym-routine-container" });

        // Header
        const header = container.createEl("div", { cls: "gym-routine-header" });
        header.createEl("div");
        header.createEl("h2", { text: "Exercise Analytics" });
        header.createEl("div");

        const mainContent = container.createEl("div", { cls: "gym-routine-main" });

        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Aggregate data by exercise
        const exerciseData: { [key: string]: ExerciseData } = {};
        let totalWorkouts = workoutFiles.length;
        let totalSetsCompleted = 0;

        workoutFiles.forEach(workout => {
            const workoutDate = new Date(workout.date);
            const isRecent = workoutDate >= thirtyDaysAgo;

            workout.exercises.forEach(exercise => {
                if (!exerciseData[exercise.name]) {
                    exerciseData[exercise.name] = {
                        name: exercise.name,
                        totalSets: 0,
                        completedSets: 0,
                        sessions: 0,
                        lastPerformed: null,
                        maxReps: 0,
                        maxWeight: 0,
                        avgReps: 0,
                        repHistory: [],
                        recent30Days: {
                            sessions: 0,
                            completedSets: 0,
                            totalSets: 0,
                            maxReps: 0,
                            maxWeight: 0,
                            avgReps: 0,
                            repHistory: [],
                            weightHistory: [],
                            firstWorkout: null,
                            lastWorkout: null
                        }
                    };
                }

                const data = exerciseData[exercise.name];
                data.sessions++;
                data.lastPerformed = !data.lastPerformed || workout.date > data.lastPerformed ? workout.date : data.lastPerformed;

                if (isRecent) {
                    data.recent30Days.sessions++;
                    if (!data.recent30Days.firstWorkout || workoutDate < new Date(data.recent30Days.firstWorkout)) {
                        data.recent30Days.firstWorkout = workout.date;
                    }
                    if (!data.recent30Days.lastWorkout || workoutDate > new Date(data.recent30Days.lastWorkout)) {
                        data.recent30Days.lastWorkout = workout.date;
                    }
                }

                exercise.sets.forEach(set => {
                    data.totalSets++;
                    if (isRecent) data.recent30Days.totalSets++;

                    if (set.completed) {
                        data.completedSets++;
                        totalSetsCompleted++;

                        const reps = parseInt(set.actualReps || set.targetReps || '0');
                        if (reps > data.maxReps) data.maxReps = reps;

                        if (set.actualWeight || set.targetWeight) {
                            const weight = parseFloat(set.actualWeight || set.targetWeight);
                            if (!data.maxWeight || weight > data.maxWeight) {
                                data.maxWeight = weight;
                            }
                        }

                        data.repHistory.push(reps);

                        // Recent 30 days tracking
                        if (isRecent) {
                            data.recent30Days.completedSets++;
                            if (reps > data.recent30Days.maxReps) data.recent30Days.maxReps = reps;
                            data.recent30Days.repHistory.push(reps);

                            if (set.actualWeight || set.targetWeight) {
                                const weight = parseFloat(set.actualWeight || set.targetWeight);
                                if (!data.recent30Days.maxWeight || weight > data.recent30Days.maxWeight) {
                                    data.recent30Days.maxWeight = weight;
                                }
                                data.recent30Days.weightHistory.push({
                                    weight: weight,
                                    date: workoutDate,
                                    reps: reps
                                });
                            }
                        }
                    }
                });

                // Calculate average reps
                if (data.repHistory.length > 0) {
                    data.avgReps = Math.round(data.repHistory.reduce((a, b) => a + b, 0) / data.repHistory.length);
                }
                if (data.recent30Days.repHistory.length > 0) {
                    data.recent30Days.avgReps = Math.round(data.recent30Days.repHistory.reduce((a, b) => a + b, 0) / data.recent30Days.repHistory.length);
                }
            });
        });

        // Summary stats section
        const summarySection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        summarySection.createEl("h3", {
            text: "Summary Stats",
            attr: { style: "color: var(--text-accent); margin-bottom: 15px;" }
        });

        const statsGrid = summarySection.createEl("div", {
            attr: {
                style: `
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                    gap: 15px; 
                    margin-bottom: 30px;
                `
            }
        });

        const recentWorkouts30Days = workoutFiles.filter(w => new Date(w.date) >= thirtyDaysAgo).length;
        const avgWorkoutsPerWeek = Math.round((recentWorkouts30Days / 30) * 7 * 10) / 10;

        const stats = [
            { label: "Total Workouts", value: totalWorkouts.toString() },
            { label: "Total Sets Completed", value: totalSetsCompleted.toString() },
            { label: "Unique Exercises", value: Object.keys(exerciseData).length.toString() },
            { label: "Completion Rate", value: `${Math.round((totalSetsCompleted / Object.values(exerciseData).reduce((sum, ex) => sum + ex.totalSets, 0)) * 100)}%` },
            { label: "Weekly Frequency (30d)", value: `${avgWorkoutsPerWeek}/week` },
            { label: "Most Consistent Exercise", value: Object.values(exerciseData).sort((a, b) => b.sessions - a.sessions)[0]?.name || 'None' }
        ];

        stats.forEach(stat => {
            const statCard = statsGrid.createEl("div", {
                attr: {
                    style: `
                        background: var(--background-primary);
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 6px;
                        padding: 15px;
                        text-align: center;
                    `
                }
            });

            statCard.createEl("div", {
                text: stat.value,
                attr: {
                    style: "font-size: 24px; font-weight: bold; color: var(--text-accent); margin-bottom: 5px;"
                }
            });

            statCard.createEl("div", {
                text: stat.label,
                attr: {
                    style: "color: var(--text-muted); font-size: 14px;"
                }
            });
        });

        // Past 30 Days Progress section
        const progressSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        progressSection.createEl("h3", {
            text: "Past 30 Days Progress",
            attr: { style: "color: var(--text-accent); margin-bottom: 15px;" }
        });

        const progressTableContainer = progressSection.createEl("div", { cls: "gym-routine-table-container" });
        const progressTable = progressTableContainer.createEl("table", { cls: "gym-routine-table" });

        const progressThead = progressTable.createEl("thead");
        const progressHeaderRow = progressThead.createEl("tr");

        ['Exercise', 'Sessions', 'Max Reps Δ', 'Avg Reps Δ', 'Max Weight Δ', 'Volume Trend', 'Last Session'].forEach(header => {
            progressHeaderRow.createEl("th", { text: header });
        });

        const progressTbody = progressTable.createEl("tbody");

        // Filter exercises with recent activity and calculate improvements
        const exercisesWithProgress = Object.values(exerciseData)
            .filter(ex => ex.recent30Days.sessions > 0)
            .map(exercise => {
                const recent = exercise.recent30Days;

                // Calculate improvements by comparing first half vs second half of the period
                const midpoint = Math.floor(recent.repHistory.length / 2);
                const firstHalf = recent.repHistory.slice(0, midpoint);
                const secondHalf = recent.repHistory.slice(midpoint);

                const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
                const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

                // Weight progression (first vs last workout)
                const sortedWeights = [...recent.weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const firstWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : 0;
                const lastWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weight : 0;

                return {
                    ...exercise,
                    improvements: {
                        maxRepsChange: recent.maxReps - (exercise.maxReps - recent.maxReps || 0),
                        avgRepsChange: secondHalfAvg - firstHalfAvg,
                        weightChange: lastWeight - firstWeight,
                        volumeTrend: secondHalf.length > firstHalf.length ? 'Increasing' :
                            secondHalf.length < firstHalf.length ? 'Decreasing' : 'Stable'
                    }
                };
            })
            .sort((a, b) => b.recent30Days.sessions - a.recent30Days.sessions);

        const formatChange = (value: number, suffix: string = '') => {
            if (value === 0) return '—';
            const sign = value > 0 ? '+' : '';
            const color = value > 0 ? '#4CAF50' : value < 0 ? '#F44336' : 'var(--text-muted)';
            return `<span style="color: ${color}">${sign}${value.toFixed(suffix === 'lbs' || suffix === 'kg' ? 1 : 0)}${suffix}</span>`;
        };

        exercisesWithProgress.forEach(exercise => {
            const row = progressTbody.createEl("tr");
            const recent = exercise.recent30Days;
            const imp = exercise.improvements;

            const lastSession = recent.lastWorkout ? new Date(recent.lastWorkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "—";

            const cells = [
                { text: exercise.name, html: false },
                { text: recent.sessions.toString(), html: false },
                { text: formatChange(imp.maxRepsChange), html: true },
                { text: formatChange(imp.avgRepsChange, ' reps'), html: true },
                { text: formatChange(imp.weightChange, 'lbs'), html: true },
                { text: imp.volumeTrend, html: false },
                { text: lastSession, html: false }
            ];

            cells.forEach((cellData, index) => {
                const cell = row.createEl("td", {
                    attr: {
                        style: index === 0 ?
                            "padding: 8px 12px; border: 1px solid var(--background-modifier-border); text-align: left;" :
                            "padding: 8px 12px; border: 1px solid var(--background-modifier-border); text-align: center;"
                    }
                });
                
                if (cellData.html) {
                    cell.innerHTML = cellData.text;
                } else {
                    cell.textContent = cellData.text;
                }
            });
        });

        if (exercisesWithProgress.length === 0) {
            const noDataRow = progressTbody.createEl("tr");
            noDataRow.createEl("td", {
                text: "No exercise data found for the past 30 days",
                attr: {
                    colspan: "7",
                    style: "padding: 20px; text-align: center; color: var(--text-muted); border: 1px solid var(--background-modifier-border);"
                }
            });
        }

        // Exercise breakdown table
        const exerciseSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        exerciseSection.createEl("h3", {
            text: "Exercise Breakdown",
            attr: { style: "color: var(--text-accent); margin-bottom: 15px;" }
        });

        const tableContainer = exerciseSection.createEl("div", { cls: "gym-routine-table-container" });
        const table = tableContainer.createEl("table", { cls: "gym-routine-table" });

        const thead = table.createEl("thead");
        const headerRow = thead.createEl("tr");

        ['Exercise', 'Sessions', 'Sets Complete', 'Completion %', 'Max Reps', 'Avg Reps', 'Max Weight', 'Last Done'].forEach(header => {
            headerRow.createEl("th", { text: header });
        });

        const tbody = table.createEl("tbody");

        // Sort exercises by sessions (most frequent first)
        const sortedExercises = Object.values(exerciseData).sort((a, b) => b.sessions - a.sessions);

        sortedExercises.forEach(exercise => {
            const row = tbody.createEl("tr");

            const completionRate = Math.round((exercise.completedSets / exercise.totalSets) * 100);
            const lastDone = exercise.lastPerformed ? new Date(exercise.lastPerformed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Never";

            const cells = [
                exercise.name,
                exercise.sessions.toString(),
                `${exercise.completedSets}/${exercise.totalSets}`,
                `${completionRate}%`,
                exercise.maxReps ? exercise.maxReps.toString() : '-',
                exercise.avgReps ? exercise.avgReps.toString() : '-',
                exercise.maxWeight ? exercise.maxWeight.toString() : '-',
                lastDone
            ];

            cells.forEach((cellData, index) => {
                row.createEl("td", {
                    text: cellData,
                    attr: {
                        style: index === 0 ?
                            "padding: 8px 12px; border: 1px solid var(--background-modifier-border); text-align: left;" :
                            "padding: 8px 12px; border: 1px solid var(--background-modifier-border); text-align: center;"
                    }
                });
            });
        });

        // Recent activity
        const recentSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        recentSection.createEl("h3", {
            text: "Recent Activity",
            attr: { style: "color: var(--text-accent); margin-bottom: 15px;" }
        });

        const recentWorkouts = [...workoutFiles]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        recentWorkouts.forEach(workout => {
            const workoutCard = recentSection.createEl("div", {
                attr: {
                    style: `
                        background: var(--background-primary);
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 6px;
                        padding: 15px;
                        margin-bottom: 10px;
                    `
                }
            });

            workoutCard.createEl("div", {
                text: new Date(workout.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                attr: {
                    style: "font-weight: bold; color: var(--text-accent); margin-bottom: 8px;"
                }
            });

            const routineNames = workout.routines ? workout.routines.map(r => r.name).join(', ') : 'Unknown';
            workoutCard.createEl("div", {
                text: `Routine: ${routineNames}`,
                attr: {
                    style: "color: var(--text-muted); font-size: 14px; margin-bottom: 8px;"
                }
            });

            const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            const completedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);

            workoutCard.createEl("div", {
                text: `${completedSets}/${totalSets} sets completed (${Math.round((completedSets / totalSets) * 100)}%)`,
                attr: {
                    style: "color: var(--text-normal); font-size: 14px;"
                }
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

interface WorkoutFile {
    date: string;
    exercises: WorkoutExercise[];
    routines?: { name: string }[];
}

interface WeightHistory {
    weight: number;
    date: Date;
    reps: number;
}

interface Recent30Days {
    sessions: number;
    completedSets: number;
    totalSets: number;
    maxReps: number;
    maxWeight: number;
    avgReps: number;
    repHistory: number[];
    weightHistory: WeightHistory[];
    firstWorkout: string | null;
    lastWorkout: string | null;
}

interface ExerciseData {
    name: string;
    totalSets: number;
    completedSets: number;
    sessions: number;
    lastPerformed: string | null;
    maxReps: number;
    maxWeight: number;
    avgReps: number;
    repHistory: number[];
    recent30Days: Recent30Days;
}