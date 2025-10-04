import { App, Modal } from "obsidian";

export default class ConfirmationModal extends Modal {
    private onConfirm: () => void;
    private message: string;

    constructor(app: App, message: string, onConfirm: () => void) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        const style = contentEl.createEl('style');

        style.textContent = `
            .modal .modal-content {
                padding-top: 10px !important;
            }
            .confirmation-modal h2 {
                margin-top: 0 !important;
                margin-bottom: 15px !important;
            }
            .confirmation-modal p {
                margin-bottom: 20px;
                line-height: 1.4;
            }
        `;

        contentEl.addClass('confirmation-modal');

        const header = contentEl.createEl('h2', { text: 'Confirm Action' });
        const message = contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const confirmButton = buttonContainer.createEl('button', {
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmButton.addEventListener('click', () => {
            this.close();
            this.onConfirm();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}