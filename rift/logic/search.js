/**
 * logic/search.js
 * Handles the logic for filtering the library based on text input.
 */

export const Search = {
    /**
     * Debounces a function to prevent it from running too frequently.
     */
    debounce: (func, delay = 500) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), delay);
        };
    },

    /**
     * Filters books based on a search string.
     */
    filterBooks: (books, query) => {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return books;

        return books.filter(book => 
            book.title.toLowerCase().includes(lowerQuery)
        );
    }
};