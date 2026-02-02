import { ModalController } from './modalController.js';
import { DriveService } from './drive.js';
import { DataService } from './data.js';
import { BookActions } from './actions.js';
import { AppController } from './appController.js';
import { FormHandler } from './formHandler.js';
import { getGroups } from './selectors.js';
import { state } from './state.js';
import { UI } from './ui.js';
import { ThemeService } from './theme.js';

/**
 * Orchestrates event listeners and user interactions across the application.
 */
export const Events = {
    // Helper to prevent animation lag during rapid typing
    _debounce(func, delay = 250) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Set up global UI interactions like closing modals via backdrop or dedicated buttons.
     */
    initGlobalHandlers() {
        window.onclick = (e) => {
            // Only close the specific modal if clicking the backdrop, not all modals
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        };
        getGroups.closeBtns().forEach(btn => btn.onclick = ModalController.closeAll);
    },

    /**
     * Initialize handlers for local data import/export and Google Drive integration.
     */
    initDataHandlers(elements) {
        let cachedTheme = ThemeService.getTheme();

        const buildThemeFromInputs = () => {
            const theme = {};
            elements.themeInputs?.forEach(input => {
                const key = input.dataset.themeKey;
                if (key) theme[key] = input.value;
            });
            return theme;
        };

        // Export format selection
        elements.exportTrigger?.addEventListener('click', () => {
            ModalController.open(elements.exportFormatModal);
        });

        elements.exportJsonBtn?.addEventListener('click', () => {
            DataService.exportJSON(state.books);
            ModalController.closeAll();
        });

        elements.exportCsvBtn?.addEventListener('click', () => {
            DataService.exportCSV(state.books);
            ModalController.closeAll();
        });

        elements.exportMdBtn?.addEventListener('click', () => {
            DataService.exportMarkdown(state.books);
            ModalController.closeAll();
        });

        // Import format selection
        elements.importTrigger?.addEventListener('click', () => {
            ModalController.open(elements.importFormatModal);
        });

        // Format selection buttons trigger file input
        elements.importJsonBtn?.addEventListener('click', () => {
            elements.importFile.accept = '.json';
            elements.importFile.dataset.format = 'json';
            elements.importFile.click();
        });

        elements.importCsvBtn?.addEventListener('click', () => {
            elements.importFile.accept = '.csv';
            elements.importFile.dataset.format = 'csv';
            elements.importFile.click();
        });

        elements.importMdBtn?.addEventListener('click', () => {
            elements.importFile.accept = '.md,.markdown';
            elements.importFile.dataset.format = 'markdown';
            elements.importFile.click();
        });

        // File input change handler
        elements.importFile?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                ModalController.closeAll();
                ModalController.open(elements.importConfirmModal);
            }
        });

        elements.confirmImportBtn?.addEventListener('click', async () => {
            const file = elements.importFile?.files[0];
            const format = elements.importFile?.dataset.format;
            if (!file || !format) return;

            try {
                let newData;
                
                if (format === 'json') {
                    newData = await DataService.importJSON(file);
                } else if (format === 'csv') {
                    newData = await DataService.importCSV(file);
                } else if (format === 'markdown') {
                    newData = await DataService.importMarkdown(file);
                }

                await AppController.handleImport(newData);
                ModalController.closeAll();
                elements.importFile.value = '';
                elements.importFile.dataset.format = '';
            } catch (err) { 
                alert(`Import error: ${err}`); 
            }
        });

        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', () => {
                DriveService.login();
            });
        }

        if (elements.googleLogoutBtn) {
            elements.googleLogoutBtn.addEventListener('click', () => {
                ModalController.open(elements.disconnectConfirmModal);
            });
        }

        if (elements.confirmDisconnectBtn) {
            elements.confirmDisconnectBtn.addEventListener('click', () => {
                DriveService.logout();
                UI.updateSyncStatus(false);
                ModalController.closeAll();
            });
        }

        // Theme customization
        elements.themeTrigger?.addEventListener('click', () => {
            cachedTheme = ThemeService.getTheme();
            elements.themeInputs?.forEach(input => {
                const key = input.dataset.themeKey;
                if (key && cachedTheme[key]) {
                    input.value = cachedTheme[key];
                }
            });
            if (elements.themeModal) {
                elements.themeModal.classList.add('theme-advanced-collapsed');
            }
            if (elements.themeAdvancedToggle) {
                elements.themeAdvancedToggle.setAttribute('aria-pressed', 'false');
                elements.themeAdvancedToggle.textContent = 'Show advanced';
            }
            ModalController.open(elements.themeModal);
        });

        elements.themeAdvancedToggle?.addEventListener('click', () => {
            if (!elements.themeModal || !elements.themeAdvancedToggle) return;
            const isCollapsed = elements.themeModal.classList.toggle('theme-advanced-collapsed');
            elements.themeAdvancedToggle.setAttribute('aria-pressed', String(!isCollapsed));
            elements.themeAdvancedToggle.textContent = isCollapsed ? 'Show advanced' : 'Hide advanced';
        });

        elements.themeInputs?.forEach(input => {
            input.addEventListener('input', () => {
                ThemeService.apply(buildThemeFromInputs());
            });
        });

        elements.saveThemeBtn?.addEventListener('click', () => {
            ThemeService.save(buildThemeFromInputs());
            AppController.sync();
            ModalController.closeAll();
        });

        elements.resetThemeBtn?.addEventListener('click', () => {
            ThemeService.reset();
            const resetTheme = ThemeService.getTheme();
            elements.themeInputs?.forEach(input => {
                const key = input.dataset.themeKey;
                if (key && resetTheme[key]) {
                    input.value = resetTheme[key];
                }
            });
            AppController.sync();
        });

        elements.cancelThemeBtn?.addEventListener('click', () => {
            ThemeService.apply(cachedTheme);
            if (elements.themeModal) {
                elements.themeModal.classList.add('theme-advanced-collapsed');
            }
            if (elements.themeAdvancedToggle) {
                elements.themeAdvancedToggle.setAttribute('aria-pressed', 'false');
                elements.themeAdvancedToggle.textContent = 'Show advanced';
            }
            ModalController.closeAll();
        });
    },

    /**
     * Handle library-wide interactions including Search and Filtering.
     */
    initLibraryHandlers(elements) {
        // --- SEARCH LOGIC ---
        const debouncedSearch = this._debounce((query) => {
            // Re-render with current filter + search query + sort mode
            const sortMode = elements.sortSelect?.value || 'status-rating';
            UI.renderBooks(state.books, state.currentFilter, elements.library, query, sortMode);
        });

        elements.searchBar?.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        // Prevent search bar from refreshing page on 'Enter'
        elements.searchBar?.closest('form')?.addEventListener('submit', e => e.preventDefault());

        // --- SORT LOGIC ---
        elements.sortSelect?.addEventListener('change', (e) => {
            const sortMode = e.target.value;
            const currentSearch = elements.searchBar?.value || '';
            UI.renderBooks(state.books, state.currentFilter, elements.library, currentSearch, sortMode);
        });

        // --- CARD & FAVORITE INTERACTION ---
        elements.library?.addEventListener('click', (e) => {
            const card = e.target.closest('.book-card');
            const favBtn = e.target.closest('.fav-btn');
            const id = parseInt(card?.dataset.id || favBtn?.dataset.id);

            if (favBtn) {
                e.stopPropagation();
                BookActions.toggleFavorite(id);
                AppController.sync();
            } 
            else if (card) {
                const book = state.books.find(b => b.id === id);
                if (book) {
                    FormHandler.setFormData(book, elements);
                    ModalController.open(elements.modalOverlay, "Edit Book", elements);
                    elements.deleteBtn.style.display = 'block';
                }
            }
        });

        // --- FILTER TAB LOGIC ---
        getGroups.filterBtns().forEach(btn => {
            btn.onclick = () => {
                getGroups.filterBtns().forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.filter;
                
                // When switching tabs, respect the current search term and sort mode
                const currentSearch = elements.searchBar?.value || '';
                const sortMode = elements.sortSelect?.value || 'status-rating';
                UI.renderBooks(state.books, state.currentFilter, elements.library, currentSearch, sortMode);
            };
        });
    },

    /**
     * Manage form submissions, deletions, and entry-point triggers.
     */
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