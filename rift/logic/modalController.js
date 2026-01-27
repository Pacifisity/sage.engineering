import { getGroups } from './selectors.js';

export const ModalController = {
    closeAll: () => {
        getGroups.allModals().forEach(m => m.style.display = 'none');
    },

    open: (modalElement, title = null, elements = {}) => {
        if (title && elements.modalTitle) {
            elements.modalTitle.innerText = title;
        }
        modalElement.style.display = 'flex';
    },
    
    fillBookForm: (book, elements) => {
        elements.bookIdInput.value = book.id;
        elements.titleInput.value = book.title;
        elements.statusInput.value = book.status;
        elements.typeInput.value = book.trackingType;
        elements.countInput.value = book.currentCount;

        elements.ratingInput.value = book.rating || "Unrated";

        elements.urlInput.value = book.url || '';
    }
};