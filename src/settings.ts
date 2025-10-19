import { COMPONENTS } from 'components';

export interface ComponentsSettings {
	componentStates: Record<string, boolean>;
	componentSettings: Record<string, Record<string, any>>;
	groupStates: Record<string, boolean>;
	defaultContainerMargin: number;
	enableAutoComplete: boolean;
	autoCompleteOpenModal: boolean;
}

function generateDefaultSettings(): ComponentsSettings {
	const componentStates: Record<string, boolean> = {};
	const componentSettings: Record<string, Record<string, any>> = {};

	COMPONENTS.forEach(component => {
		componentStates[component.keyName] = false;

		if (component.settings) {
			componentSettings[component.keyName] = {};
			Object.entries(component.settings).forEach(([settingKey, settingConfig]: [string, any]) => {
				componentSettings[component.keyName][settingKey] = settingConfig.default || '';
			});
		}
	});

	return {
		componentStates,
		componentSettings,
		groupStates: {},
		defaultContainerMargin: 6,
		enableAutoComplete: false,
		autoCompleteOpenModal: false
	};
}

export const DEFAULT_SETTINGS: ComponentsSettings = generateDefaultSettings();