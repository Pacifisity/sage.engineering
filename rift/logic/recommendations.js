/**
 * logic/recommendations.js
 * Handles exporting and importing book recommendations
 */

import { state } from './state.js';
import { UI } from './ui.js';
import { ModalController } from './modalController.js';
import { getElements } from './selectors.js';

export const Recommendations = {
    /**
     * Populate the recommendations selection list with all books
     */
    populateSelectionList(searchQuery = '') {
        const container = document.getElementById('recommendations-selection');
        if (!container) return;

        container.innerHTML = '';
        
        if (state.books.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No books in library</p>';
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filteredBooks = query 
            ? state.books.filter(book => book.title.toLowerCase().includes(query))
            : state.books;

        if (filteredBooks.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No books match "${searchQuery}"</p>`;
            return;
        }

        filteredBooks.forEach(book => {
            const item = document.createElement('div');
            item.className = 'recommendation-item';
            item.dataset.bookId = book.id;
            
            const content = document.createElement('div');
            content.className = 'recommendation-item-content';
            
            const title = document.createElement('div');
            title.className = 'recommendation-item-title';
            title.textContent = book.title;
            
            const linkInfo = document.createElement('div');
            linkInfo.className = 'recommendation-item-link';
            if (book.url) {
                linkInfo.innerHTML = '🔗 Link available';
            } else {
                linkInfo.textContent = 'No link';
                linkInfo.style.opacity = '0.5';
            }
            
            content.appendChild(title);
            content.appendChild(linkInfo);
            
            item.appendChild(content);
            
            // Toggle selection on click
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
            });
            
            container.appendChild(item);
        });
    },

    /**
     * Export selected books as recommendations JSON
     */
    exportSelected() {
        const selectedItems = document.querySelectorAll('#recommendations-selection .recommendation-item.selected');
        
        if (selectedItems.length === 0) {
            UI.showToast?.('Select at least one title to export');
            return;
        }

        const recommendations = [];
        selectedItems.forEach(item => {
            const bookId = parseInt(item.dataset.bookId);
            const book = state.books.find(b => b.id === bookId);
            
            if (book) {
                const rec = {
                    title: book.title
                };
                
                if (book.url) {
                    rec.link = book.url;
                }
                
                recommendations.push(rec);
            }
        });

        const exportData = {
            type: 'recommendations',
            version: '1.0',
            exported: new Date().toISOString(),
            recommendations: recommendations
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recommendations-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show feedback
        UI.showToast?.(`Exported ${recommendations.length} recommendation${recommendations.length !== 1 ? 's' : ''}`);
    },

    /**
     * Import recommendations from JSON file
     */
    async importRecommendations(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.type !== 'recommendations' || !Array.isArray(data.recommendations)) {
                UI.showToast?.('Invalid recommendations file format');
                return;
            }

            let importedCount = 0;
            const elements = getElements();

            data.recommendations.forEach(rec => {
                if (!rec.title) return;

                // Check if this title already exists
                const exists = state.books.some(book => 
                    book.title.toLowerCase() === rec.title.toLowerCase()
                );

                if (!exists) {
                    const newBook = {
                        id: Date.now() + Math.random(),
                        title: rec.title,
                        author: '',
                        status: 'Recommendations',
                        rating: 'Unrated',
                        currentCount: '',
                        trackingType: 'chapter',
                        url: rec.link || '',
                        notes: '',
                        isFavorite: false,
                        dateAdded: new Date().toISOString()
                    };

                    state.books.push(newBook);
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                state.save(state.books);
                UI.renderBooks(state.books, state.currentFilter, elements.library, '', 'status-rating', 'content-update');
                UI.showToast?.(`Imported ${importedCount} new recommendation${importedCount !== 1 ? 's' : ''}`);
            } else {
                UI.showToast?.('No new recommendations to import');
            }

        } catch (error) {
            console.error('Failed to import recommendations:', error);
            UI.showToast?.('Failed to import recommendations');
        }
    },

    /**
     * Initialize recommendations modal handlers
     */
    initHandlers() {
        const trigger = document.getElementById('recommendations-trigger');
        const modal = document.getElementById('recommendations-modal');
        const closeBtn = document.getElementById('close-recommendations');
        const exportBtn = document.getElementById('export-recommendations');
        const importBtn = document.getElementById('import-recommendations');
        const importFile = document.getElementById('import-recommendations-file');
        const searchInput = document.getElementById('recommendations-search');

        trigger?.addEventListener('click', () => {
            ModalController.open(modal);
            this.populateSelectionList();
            if (searchInput) searchInput.value = '';
        });

        closeBtn?.addEventListener('click', () => {
            ModalController.closeAll();
        });

        exportBtn?.addEventListener('click', () => {
            this.exportSelected();
        });

        importBtn?.addEventListener('click', () => {
            importFile?.click();
        });

        importFile?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                this.importRecommendations(file);
                ModalController.closeAll();
                importFile.value = ''; // Reset file input
            }
        });

        // Search functionality
        searchInput?.addEventListener('input', (e) => {
            this.populateSelectionList(e.target.value);
        });
    }
};
