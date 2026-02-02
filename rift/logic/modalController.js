/* --- modalController.js --- */
import { getGroups } from './selectors.js';

/**
 * Manages the visibility and state transitions of UI modal components.
 */
export const ModalController = {
    /**
     * Dismisses all active modal overlays by removing the 'active' state class.
     */
    closeAll: () => {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.classList.remove('active'));
    },

    /**
     * Activates a specific modal element with smooth spring-like animation.
     * @param {HTMLElement} modalElement - The target overlay to display.
     * @param {string|null} title - Optional text to update the modal's header.
     * @param {Object} elements - The DOM element collection for title injection.
     */
    open: (modalElement, title = null, elements = {}) => {
        if (!modalElement) return;

        if (title && elements.modalTitle) {
            elements.modalTitle.innerText = title;
        }
        
        // Trigger animation on next frame
        requestAnimationFrame(() => {
            modalElement.classList.add('active');
            
            // Scroll modal content to bottom to show action buttons
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                requestAnimationFrame(() => {
                    content.scrollTop = content.scrollHeight;
                });
            }
        });
    },
    
    /**
     * Directly maps book object properties to form input values.
     * Note: Consider using FormHandler.setFormData for consistency across the app.
     */
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
