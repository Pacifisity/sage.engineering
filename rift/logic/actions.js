import { state } from './state.js';
import { DataService } from './data.js';

/**
 * Service for managing individual book record mutations.
 */
export const BookActions = {
    /**
     * Toggles the favorite status of a book by ID.
     */
    toggleFavorite: (id) => {
        state.books = state.books.map(b => 
            b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
        );
    },
    
    /**
     * Removes a book from the state by ID.
     */
    deleteBook: (id) => {
        state.books = state.books.filter(b => b.id !== id);
    },
    
    /**
     * Creates a new book or updates an existing one.
     * Normalizes rating data and preserves existing UI states like 'isFavorite'.
     * Checks for duplicates before saving.
     */
    saveBook: (bookData) => {
        // Normalize rating: defaults to "Unrated" unless a valid numeric value is provided
        let processedRating = "Unrated";
        
        const hasValue = bookData.rating !== "" && 
                         bookData.rating !== "Unrated" && 
                         bookData.rating != null;

        if (hasValue) {
            const parsed = parseInt(bookData.rating, 10);
            if (!isNaN(parsed)) {
                processedRating = parsed;
            }
        }

        const cleanedData = {
            ...bookData,
            rating: processedRating,
            author: bookData.author || '',
            notes: bookData.notes || '',
            dateAdded: bookData.dateAdded || new Date().toISOString()
        };

        const index = state.books.findIndex(b => b.id === cleanedData.id);
        
        // Check for duplicates (only warn, don't prevent)
        const duplicates = DataService.detectDuplicates(state.books, cleanedData);
        if (duplicates.length > 0 && !index) {
            // Only warn about duplicates when creating new books
            const dupTitles = duplicates.slice(0, 3).map(d => d.book.title).join(', ');
            console.warn(`Possible duplicate detected: Similar to "${dupTitles}"`);
        }
        
        if (index > -1) {
            // Update existing: Merge new data but protect the favorite status and dateAdded
            state.books[index] = { 
                ...state.books[index], 
                ...cleanedData,
                isFavorite: state.books[index].isFavorite,
                dateAdded: state.books[index].dateAdded
            };
        } else {
            // Create new: Initialize with favorite status set to false
            state.books.push({ ...cleanedData, isFavorite: false });
        }
    }
};