import { getGroups } from './selectors.js';

export const ModalController = {
    closeAll: () => {
        const modals = getGroups.allModals();
        
        modals.forEach(m => {
            // Only animate modals that are actually visible
            if (m.style.display === 'flex' || m.style.display === 'block') {
                m.classList.add('closing');
            }
        });

        // Match this delay (200ms) to your CSS animation duration
        setTimeout(() => {
            modals.forEach(m => {
                m.style.display = 'none';
                m.classList.remove('closing');
            });
        }, 200);
    },

    open: (modalElement, title = null, elements = {}) => {
        // Safety: remove closing class in case user opens while another is closing
        modalElement.classList.remove('closing');
        
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