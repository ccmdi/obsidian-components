import { Component, ComponentAction, ComponentInstance } from "components";
import { ComponentGroup } from "groups";
import { gymRoutineMenuStyles } from "./styles";
import { matchesQuery } from "utils";
import { WorkoutExercise, WorkoutFile, ExerciseData } from "./types";

interface ExerciseWithProgress extends ExerciseData {
    improvements: {
        maxRepsChange: number;
        avgRepsChange: number;
        weightChange: number;
        volumeTrend: string;
    };
}

export const gymStats: Component<['query']> = {
    keyName: 'gym-stats',
    name: 'Gym Stats',
    description: 'Display stats for your workouts',
    icon: 'dumbbell',
    args: {
        query: {
            description: 'Query to filter workout files',
            default: ''
        }
    },
    isMountable: true,
    group: ComponentGroup.GYM,
    styles: gymRoutineMenuStyles,
    does: [ComponentAction.READ],
    render: async (args, el, ctx, app, instance: ComponentInstance) => {
        const allFiles = app.vault.getMarkdownFiles();

        const files = allFiles
            .filter(file => {
                const cache = app.metadataCache.getFileCache(file);
                return matchesQuery(file, cache, args.query);
            })
            .sort((a, b) => new Date(b.name.replace('.md', '')).getTime() - new Date(a.name.replace('.md', '')).getTime());

        const workoutFiles: WorkoutFile[] = [];

        for (const file of files) {
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

        if (workoutFiles.length === 0) {
            el.createEl("p", { text: "No workout data found" });
            return;
        }

        const container = el.createEl("div", { cls: "gym-routine-container" });

        const header = container.createEl("div", { cls: "gym-routine-header" });
        header.createEl("div");
        header.createEl("h2", { text: "Exercise Analytics" });
        header.createEl("div");

        const mainContent = container.createEl("div", { cls: "gym-routine-main" });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const exerciseData: { [key: string]: ExerciseData } = {};
        const totalWorkouts = workoutFiles.length;
        let totalSetsCompleted = 0;

        workoutFiles.forEach(workout => {
            const workoutDate = new Date(workout.date + 'T00:00:00');
            const isRecent = workoutDate >= thirtyDaysAgo;

            workout.exercises.forEach((exercise: WorkoutExercise) => {
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
        summarySection.createEl("h3", { text: "Summary Stats", cls: "gym-section-title" });

        const statsGrid = summarySection.createEl("div", { cls: "gym-stats-grid" });

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
            const statCard = statsGrid.createEl("div", { cls: "gym-stat-card" });
            statCard.createEl("div", { text: stat.value, cls: "gym-stat-value" });
            statCard.createEl("div", { text: stat.label, cls: "gym-stat-label" });
        });

        // Past 30 Days Progress section
        const progressSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        progressSection.createEl("h3", { text: "Past 30 Days Progress", cls: "gym-section-title" });

        const progressTableContainer = progressSection.createEl("div", { cls: "gym-routine-table-container" });
        const progressTable = progressTableContainer.createEl("table", { cls: "gym-routine-table" });

        const progressThead = progressTable.createEl("thead");
        const progressHeaderRow = progressThead.createEl("tr");

        ['Exercise', 'Sessions', 'Max Reps Δ', 'Avg Reps Δ', 'Max Weight Δ', 'Volume Trend', 'Last Session'].forEach(header => {
            progressHeaderRow.createEl("th", { text: header });
        });

        const progressTbody = progressTable.createEl("tbody");

        const exercisesWithProgress: ExerciseWithProgress[] = Object.values(exerciseData)
            .filter(ex => ex.recent30Days.sessions > 0)
            .map(exercise => {
                const recent = exercise.recent30Days;

                const midpoint = Math.floor(recent.repHistory.length / 2);
                const firstHalf = recent.repHistory.slice(0, midpoint);
                const secondHalf = recent.repHistory.slice(midpoint);

                const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
                const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

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

        function getChangeClass(value: number): string {
            if (value > 0) return 'gym-change-positive';
            if (value < 0) return 'gym-change-negative';
            return 'gym-change-neutral';
        }

        function formatChange(value: number, suffix = ''): { text: string; cls: string } {
            if (value === 0) return { text: '—', cls: 'gym-change-neutral' };
            const sign = value > 0 ? '+' : '';
            const formatted = suffix === 'lbs' || suffix === 'kg' ? value.toFixed(1) : value.toFixed(0);
            return { text: `${sign}${formatted}${suffix}`, cls: getChangeClass(value) };
        }

        exercisesWithProgress.forEach(exercise => {
            const row = progressTbody.createEl("tr");
            const recent = exercise.recent30Days;
            const imp = exercise.improvements;

            const lastSession = recent.lastWorkout
                ? new Date(recent.lastWorkout + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Never';

            row.createEl("td", { text: exercise.name, cls: 'text-left' });
            row.createEl("td", { text: recent.sessions.toString() });

            const maxRepsChange = formatChange(imp.maxRepsChange);
            const maxRepsCell = row.createEl("td");
            maxRepsCell.createEl("span", { text: maxRepsChange.text, cls: maxRepsChange.cls });

            const avgRepsChange = formatChange(imp.avgRepsChange, ' reps');
            const avgRepsCell = row.createEl("td");
            avgRepsCell.createEl("span", { text: avgRepsChange.text, cls: avgRepsChange.cls });

            const weightChange = formatChange(imp.weightChange, 'lbs');
            const weightCell = row.createEl("td");
            weightCell.createEl("span", { text: weightChange.text, cls: weightChange.cls });

            row.createEl("td", { text: imp.volumeTrend });
            row.createEl("td", { text: lastSession });
        });

        if (exercisesWithProgress.length === 0) {
            const noDataRow = progressTbody.createEl("tr");
            noDataRow.createEl("td", {
                text: "No exercise data found for the past 30 days",
                cls: 'no-data-cell',
                attr: { colspan: "7" }
            });
        }

        // Exercise breakdown table
        const exerciseSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        exerciseSection.createEl("h3", { text: "Exercise Breakdown", cls: "gym-section-title" });

        const tableContainer = exerciseSection.createEl("div", { cls: "gym-routine-table-container" });
        const table = tableContainer.createEl("table", { cls: "gym-routine-table" });

        const thead = table.createEl("thead");
        const headerRow = thead.createEl("tr");

        ['Exercise', 'Sessions', 'Sets Complete', 'Completion %', 'Max Reps', 'Avg Reps', 'Max Weight', 'Last Done'].forEach(header => {
            headerRow.createEl("th", { text: header });
        });

        const tbody = table.createEl("tbody");

        const sortedExercises = Object.values(exerciseData).sort((a, b) => b.sessions - a.sessions);

        sortedExercises.forEach(exercise => {
            const row = tbody.createEl("tr");

            const completionRate = Math.round((exercise.completedSets / exercise.totalSets) * 100);
            const lastDone = exercise.lastPerformed
                ? new Date(exercise.lastPerformed + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : "Never";

            row.createEl("td", { text: exercise.name, cls: 'text-left' });
            row.createEl("td", { text: exercise.sessions.toString() });
            row.createEl("td", { text: `${exercise.completedSets}/${exercise.totalSets}` });
            row.createEl("td", { text: `${completionRate}%` });
            row.createEl("td", { text: exercise.maxReps ? exercise.maxReps.toString() : '-' });
            row.createEl("td", { text: exercise.avgReps ? exercise.avgReps.toString() : '-' });
            row.createEl("td", { text: exercise.maxWeight ? exercise.maxWeight.toString() : '-' });
            row.createEl("td", { text: lastDone });
        });

        // Recent activity
        const recentSection = mainContent.createEl("div", { cls: "gym-routine-view-section" });
        recentSection.createEl("h3", { text: "Recent Activity", cls: "gym-section-title" });

        const recentWorkouts = [...workoutFiles]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        recentWorkouts.forEach(workout => {
            const workoutCard = recentSection.createEl("div", { cls: "gym-workout-card" });

            workoutCard.createEl("div", {
                text: new Date(workout.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                cls: "gym-workout-date"
            });

            const routineNames = workout.routines ? workout.routines.map(r => r.name).join(', ') : 'Unknown';
            workoutCard.createEl("div", { text: `Routine: ${routineNames}`, cls: "gym-workout-routine" });

            const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            const completedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);

            workoutCard.createEl("div", {
                text: `${completedSets}/${totalSets} sets completed (${Math.round((completedSets / totalSets) * 100)}%)`,
                cls: "gym-workout-sets"
            });
        });
    }
};
