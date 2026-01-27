/* --- ModalController.js --- */
import { getGroups } from './selectors.js';

export const ModalController = {
    // Close every modal at once
    closeAll: () => {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.classList.remove('active'));
    },

    // Open a specific modal smoothly
    open: (modalElement, title = null, elements = {}) => {
        if (!modalElement) return;

        // Reset state
        modalElement.classList.remove('active');
        
        if (title && elements.modalTitle) {
            elements.modalTitle.innerText = title;
        }
        
        // Use a tiny frame delay to ensure the browser registers the "off" state before "on"
        requestAnimationFrame(() => {
            modalElement.classList.add('active');
        });
    },
    
    fillBookForm: (book, elements) => {
        if (!elements.bookIdInput) return;
        elements.bookIdInput.value = book.id || '';
        elements.titleInput.value = book.title || '';
        elements.statusInput.value = book.status || 'Reading';
        elements.typeInput.value = book.trackingType || 'chapters';
        elements.countInput.value = book.currentCount || 0;
        elements.ratingInput.value = book.rating || "Unrated";
        elements.urlInput.value = book.url || '';
    }
};