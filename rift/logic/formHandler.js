/**
 * Utility for mapping between DOM form elements and the application's book data structure.
 */
export const FormHandler = {
    /**
     * Serializes form input values into a structured book object.
     * Handles ID assignment and data type normalization (parsing integers/trimming strings).
     * * @param {Object} elements - The collection of DOM nodes from selectors.js.
     * @returns {Object} A sanitized book data object.
     */
    getFormData(elements) {
        return {
            // Existing ID indicates an 'Update' operation; lack of ID triggers 'Create' via timestamp.
            id: elements.bookIdInput.value ? parseInt(elements.bookIdInput.value) : Date.now(),
            title: elements.titleInput.value.trim(),
            url: elements.urlInput.value.trim(),
            status: elements.statusInput.value,
            trackingType: elements.typeInput.value,
            currentCount: parseInt(elements.countInput.value) || 0,
            
            // Map empty selection to null for rating consistency
            rating: elements.ratingInput.value === "" ? null : parseInt(elements.ratingInput.value, 10),
            
            // Preserve boolean flags if present in the UI
            isFavorite: elements.isFavoriteInput?.checked || false 
        };
    },

    /**
     * Hydrates form fields with properties from a specific book record for editing.
     * * @param {Object} book - The source book object from state.
     * @param {Object} elements - The collection of DOM nodes to be populated.
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
     * Restores form to its default state and explicitly clears hidden identifiers.
     * * @param {Object} elements - The collection of DOM nodes to be cleared.
     */
    reset(elements) {
        elements.bookForm?.reset();
        
        // Ensure hidden ID field is cleared to prevent "Update" logic on a "Create" action
        if (elements.bookIdInput) {
            elements.bookIdInput.value = '';
        }
    }
};