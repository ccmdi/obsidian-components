import { Component, COMPONENTS } from "components";

export enum ComponentGroup {
    GYM = 'gym'
}

export type ComponentGroupMetadata = {
    name: string;
    description: string;
    members?: Component<readonly string[]>[];
};

export const GROUPS: Record<ComponentGroup, ComponentGroupMetadata> = {
    [ComponentGroup.GYM]: {
        name: 'Gym',
        description: 'Components for tracking gym routines and workouts'
    }
}

// Initialize groups lazily to avoid bundling issues
let groupsInitialized = false;

export function initializeGroups() {
    if (groupsInitialized) return;
    groupsInitialized = true;

    for(const component of COMPONENTS) {
        if (component.group) {
            if (!GROUPS[component.group].members) {
                GROUPS[component.group].members = [];
            }
            GROUPS[component.group].members!.push(component);
        }
    }
}