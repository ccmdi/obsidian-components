import "obsidian";

declare module "obsidian" {
    type PluginInstance = unknown;

    interface GlobalSearchPluginInstance extends PluginInstance {
        openGlobalSearch: (query: string) => void;
    }

    interface InternalPluginStrings {
        'global-search': GlobalSearchPluginInstance;
        'daily-notes': DailyNotesPluginInstance;
    }

    interface App {
        internalPlugins: {
            getPluginById<K extends keyof InternalPluginStrings>(id: K): Plugin & { instance: InternalPluginStrings[K] };
            getPluginById(id: string): Plugin;
        }
        plugins: {
            plugins: {
                [x: string]: Plugin;
            }
        }
    }

    interface Plugin {
        templater: {
            current_functions_object: {
                file: {
                    find_tfile: (path: string) => TFile;
                    create_new: (templateFile: TFile, targetName: string, createNewFile: boolean, folderPath: string) => Promise<void>;
                };
            };
        };
        enabled: boolean;
        instance: PluginInstance;
    }
}