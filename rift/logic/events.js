import { ModalController } from './modalController.js';
import { DriveService } from './drive.js';
import { DataService } from './data.js';
import { BookActions } from './actions.js';
import { AppController } from './appController.js';
import { FormHandler } from './formHandler.js';
import { getGroups } from './selectors.js';
import { state } from './state.js';
import { UI } from './ui.js';

export const Events = {
    // 1. Global & Close Actions
    initGlobalHandlers() {
        window.onclick = (e) => {
            if (e.target.classList.contains('modal-overlay')) ModalController.closeAll();
        };
        getGroups.closeBtns().forEach(btn => btn.onclick = ModalController.closeAll);
    },

    // 2. Data Persistence (Import/Export)
    initDataHandlers(elements) {
        elements.exportBtn?.addEventListener('click', () => DataService.exportJSON(state.books));
        
        elements.importFile?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) ModalController.open(elements.importConfirmModal);
        });

        elements.confirmImportBtn?.addEventListener('click', async () => {
            const file = elements.importFile?.files[0];
            if (!file) return;
            try {
                const newData = await DataService.importJSON(file);
                await AppController.handleImport(newData);
                ModalController.closeAll();
                elements.importFile.value = '';
            } catch (err) { alert(err); }
        });

        document.getElementById('import-trigger').onclick = () => elements.importFile.click();

        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', () => {
                DriveService.login();
            });
        }
    },

    // 3. Library Interaction (Delegated)
    initLibraryHandlers(elements) {
        elements.library?.addEventListener('click', (e) => {
            const card = e.target.closest('.book-card');
            const favBtn = e.target.closest('.fav-btn');
            const id = parseInt(card?.dataset.id || favBtn?.dataset.id);

            if (favBtn) {
                e.stopPropagation();
                BookActions.toggleFavorite(id);
                AppController.sync();
            } else if (card) {
                const book = state.books.find(b => b.id === id);
                if (book) {
                    FormHandler.setFormData(book, elements);
                    ModalController.open(elements.modalOverlay, "Edit Book", elements);
                    elements.deleteBtn.style.display = 'block';
                }
            }
        });

        // Filter Buttons
        getGroups.filterBtns().forEach(btn => {
            btn.onclick = () => {
                getGroups.filterBtns().forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                UI.renderBooks(state.books, state.currentFilter, elements.library);
            };
        });
    },

    // 4. Form & UI Triggers
    initFormHandlers(elements) {
        elements.bookForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookData = FormHandler.getFormData(elements);
            BookActions.saveBook(bookData);
            AppController.sync();
            ModalController.closeAll();
        });

        elements.deleteBtn?.addEventListener('click', () => ModalController.open(elements.deleteConfirmModal));
        
        elements.confirmDeleteBtn?.addEventListener('click', () => {
            BookActions.deleteBook(parseInt(elements.bookIdInput.value));
            AppController.sync();
            ModalController.closeAll();
        });

        document.getElementById('open-modal')?.addEventListener('click', () => {
            FormHandler.reset(elements);
            ModalController.open(elements.modalOverlay, "Add New Book", elements);
            elements.deleteBtn.style.display = 'none';
        });

        document.getElementById('open-account-modal')?.addEventListener('click', () => {
            ModalController.open(elements.accountModal);
        });
    }
};