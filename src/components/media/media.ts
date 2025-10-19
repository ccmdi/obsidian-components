import { Component, ComponentAction, ComponentInstance } from "components";
import { TFile } from "obsidian";
import { mediaStyles } from "./styles";

export const media: Component<['folder', 'centered', 'writeFM', 'interactive']> = {
    name: 'Media',
    description: 'Display media files from a folder or specific file',
    keyName: 'media',
    aliases: ['random-media'],
    args: {
        folder: {
            description: 'Folder to search for media files, or path to specific file',
            required: true
        },
        centered: {
            description: 'Center the media display',
            default: 'false'
        },
        writeFM: {
            description: 'Write selection to frontmatter for persistence',
            default: 'true'
        },
        interactive: {
            description: 'Show dropdown selector for user choice',
            default: 'false'
        }
    },
    isMountable: true,
    does: [ComponentAction.READ],
    styles: mediaStyles,
    render: async (args, el, ctx, app, instance: ComponentInstance, componentSettings = {}) => {
        const folderPath = args.folder;
        const centered = args.centered === 'true';
        const writeFM = args.writeFM !== 'false';
        const interactive = args.interactive === 'true';

        const fmKey = 'mediaPath';

        const renderMedia = (file: TFile, container: HTMLElement) => {
            const isVideo = file.extension.match(/(mp4|mov|webm)$/i);
            const resourcePath = app.vault.getResourcePath(file);

            if (isVideo) {
                const video = el.createEl("video");
                video.src = resourcePath;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                if (centered) {
                    video.style.display = 'block';
                    video.style.margin = '0 auto';
                    video.style.textAlign = 'center';
                }
                container.append(video);
            } else {
                const img = el.createEl("img");
                img.src = resourcePath;
                img.referrerPolicy = 'no-referrer';
                if (centered) {
                    img.style.display = 'block';
                    img.style.margin = '0 auto';
                    img.style.textAlign = 'center';
                }
                container.append(img);
            }
        };

        const applyCenteredStyles = (container: HTMLElement) => {
            if (centered) {
                container.style.margin = '0 auto';
                el.style.margin = '0 auto';
                el.style.paddingTop = '0.5em';
                el.style.paddingBottom = '0.5em';
            }
        };

        // Check if path points to a specific file
        const specificFile = app.vault.getFileByPath(folderPath);
        if (specificFile && specificFile.extension?.match(/(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i)) {
            const mediaContainer = document.createElement("div");
            mediaContainer.className = "media-container";
            applyCenteredStyles(mediaContainer);
            renderMedia(specificFile, mediaContainer);
            el.appendChild(mediaContainer);
            return;
        }

        // Folder mode
        const folder = app.vault.getFolderByPath(folderPath);

        if (!folder) {
            el.textContent = "Folder or file not found: " + folderPath;
            return;
        }

        const files = folder.children.filter(file =>
            file instanceof TFile &&
            file.extension && file.extension.match(/(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i)
        ) as TFile[];

        if (files.length === 0) {
            el.textContent = "No media found in " + folderPath;
            return;
        }

        files.sort((a, b) => a.name.localeCompare(b.name));

        const selectRandomFile = (): TFile => {
            const currentFile = app.workspace.getActiveFile();
            const seed = currentFile ? currentFile.stat.ctime : Date.now();
            const index = Math.abs(seed) % files.length;
            return files[index];
        };

        let selectedFile: TFile | undefined = undefined;
        const currentFile = app.workspace.getActiveFile();

        if (writeFM && currentFile) {
            const fileCache = app.metadataCache.getFileCache(currentFile);
            const existingMedia = fileCache?.frontmatter?.[fmKey];

            if (existingMedia) {
                const existingFile = app.metadataCache.getFirstLinkpathDest(existingMedia.replace(/\[\[|\]\]/g, ''), currentFile.path);
                if (existingFile && files.includes(existingFile)) {
                    selectedFile = existingFile;
                }
            }
        }

        if (!selectedFile) {
            selectedFile = selectRandomFile();
        }

        const mediaContainer = el.createEl('div', { cls: 'media-container' });
        applyCenteredStyles(mediaContainer);

        if (interactive) {
            const selector = el.createEl('select', { cls: 'media-selector' });

            files.forEach((file, index) => {
                const option = el.createEl('option', { value: index.toString(), text: file.basename });
                if (file === selectedFile) {
                    option.selected = true;
                }
                selector.append(option);
            });

            selector.addEventListener('change', async () => {
                const newIndex = parseInt(selector.value);
                selectedFile = files[newIndex];

                mediaContainer.innerHTML = '';
                renderMedia(selectedFile, mediaContainer);

                if (writeFM && currentFile && selectedFile) {
                    try {
                        await app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
                            frontmatter[fmKey] = `[[${selectedFile!.path}]]`;
                        });
                    } catch (error) {
                        console.error('Failed to write frontmatter:', error);
                    }
                }
            });

            el.appendChild(selector);
        }

        renderMedia(selectedFile, mediaContainer);
        el.appendChild(mediaContainer);

        if (writeFM && currentFile && !interactive) {
            const fileCache = app.metadataCache.getFileCache(currentFile);
            const existingMedia = fileCache?.frontmatter?.[fmKey];
            const expectedPath = `[[${selectedFile.path}]]`;

            if (existingMedia !== expectedPath) {
                try {
                    await app.fileManager.processFrontMatter(currentFile, (frontmatter) => {
                        frontmatter[fmKey] = expectedPath;
                    });
                } catch (error) {
                    console.error('Failed to write frontmatter:', error);
                }
            }
        }
    },
    settings: {}
}