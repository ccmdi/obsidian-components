import { COMPONENTS, ComponentSetting } from 'components';

export interface ComponentsSettings {
	componentStates: Record<string, boolean>;
	componentSettings: Record<string, Record<string, string | number | boolean>>;
	componentReferences: Record<string, string>;
	groupStates: Record<string, boolean>;
	defaultContainerMargin: number;
	enableAutoComplete: boolean;
	autoCompleteOpenModal: boolean;
	modalArgSuggest: boolean;
	enableJsExecution: boolean;
}

function generateDefaultSettings(): ComponentsSettings {
	const componentStates: Record<string, boolean> = {};
	const componentSettings: Record<string, Record<string, string | number | boolean>> = {};

	COMPONENTS.forEach(component => {
		componentStates[component.keyName] = false;

		if (component.settings) {
			componentSettings[component.keyName] = {};
			Object.entries(component.settings).forEach(([settingKey, settingConfig]) => {
				if (typeof settingConfig === 'object' && 'default' in settingConfig) {
					componentSettings[component.keyName][settingKey] = (settingConfig as ComponentSetting).default || '';
				}
			});
		}
	});

	return {
		componentStates,
		componentSettings,
		componentReferences: {},
		groupStates: {},
		defaultContainerMargin: 6,
		enableAutoComplete: false,
		autoCompleteOpenModal: false,
		modalArgSuggest: true,
		enableJsExecution: false
	};
}

export const DEFAULT_SETTINGS: ComponentsSettings = generateDefaultSettings();