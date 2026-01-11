export interface WorkoutSet {
    setNumber: number;
    targetReps: string;
    targetWeight: string;
    actualReps: string;
    actualWeight: string;
    completed: boolean;
}

export interface WorkoutExercise {
    name: string;
    routine: string;
    sets: WorkoutSet[];
}

export interface Exercise {
    name: string;
    sets: string;
    reps: string;
    weight: string;
}

export interface Routine {
    id: string;
    name: string;
    days: string[];
    exercises: Exercise[];
}

export interface WorkoutFile {
    date: string;
    exercises: WorkoutExercise[];
    routines?: { name: string }[];
}

export interface WeightHistory {
    weight: number;
    date: Date;
    reps: number;
}

export interface Recent30Days {
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

export interface ExerciseData {
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
