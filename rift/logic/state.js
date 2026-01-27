/**
 * logic/state.js
 * * Centralized application state management. 
 * Handles the in-memory data store and its synchronization with browser storage.
 */
export const state = {
    /**
     * @type {Array} The primary collection of book records.
     * Hydrates from localStorage on initialization, defaulting to an empty array.
     */
    books: JSON.parse(localStorage.getItem('myBooks')) || [],

    /**
     * @type {string} Tracks the active UI filter category (e.g., 'all', 'Reading', 'Completed').
     */
    currentFilter: 'all',
    
    /**
     * Updates the internal state and persists the new collection to localStorage.
     * @param {Array} newBooks - The updated array of book objects.
     */
    save(newBooks) {
        this.books = newBooks;
        localStorage.setItem('myBooks', JSON.stringify(this.books));
    }
};