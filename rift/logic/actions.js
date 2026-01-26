import { state } from './state.js';

export const BookActions = {
    toggleFavorite: (id) => {
        state.books = state.books.map(b => 
            b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
        );
    },
    
    deleteBook: (id) => {
        state.books = state.books.filter(b => b.id !== id);
    },

    saveBook: (bookData) => {
        const index = state.books.findIndex(b => b.id === bookData.id);
        if (index > -1) {
            // Update existing
            state.books[index] = { 
                ...state.books[index], 
                ...bookData,
                isFavorite: state.books[index].isFavorite // Preserve favorite status
            };
        } else {
            // Add new
            state.books.push({ ...bookData, isFavorite: false });
        }
    }
};