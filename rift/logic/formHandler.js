export const FormHandler = {
    /**
     * Extracts values from the DOM elements and returns a clean Book object.
     */
    getFormData(elements) {
        return {
            // If there's an ID, we're editing; otherwise, it's a new entry
            id: elements.bookIdInput.value ? parseInt(elements.bookIdInput.value) : Date.now(),
            title: elements.titleInput.value.trim(),
            url: elements.urlInput.value.trim(),
            status: elements.statusInput.value,
            trackingType: elements.typeInput.value,
            currentCount: parseInt(elements.countInput.value) || 0,
            rating: elements.ratingInput.value === "" ? null : parseInt(elements.ratingInput.value, 10),
            // Keep existing properties that aren't in the form (like favorite status)
            isFavorite: elements.isFavoriteInput?.checked || false 
        };
    },

    /**
     * Populates the form fields with data from an existing book object.
     */
    setFormData(book, elements) {
        elements.bookIdInput.value = book.id;
        elements.titleInput.value = book.title;
        elements.urlInput.value = book.url;
        elements.statusInput.value = book.status;
        elements.typeInput.value = book.trackingType;
        elements.countInput.value = book.currentCount;
        elements.ratingInput.value = book.rating;
    },

    /**
     * Clears the form for a fresh entry.
     */
    reset(elements) {
        elements.bookForm?.reset();
        if (elements.bookIdInput) elements.bookIdInput.value = '';
    }
};