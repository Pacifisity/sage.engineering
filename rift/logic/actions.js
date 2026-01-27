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
        // DEFAULT TO "Unrated" STRING
        let processedRating = "Unrated";
        
        // Only override if we have a valid number string
        if (bookData.rating !== "" && 
            bookData.rating !== "Unrated" && 
            bookData.rating !== null && 
            bookData.rating !== undefined) {
            
            const parsed = parseInt(bookData.rating, 10);
            if (!isNaN(parsed)) {
                processedRating = parsed;
            }
        }

        const cleanedData = {
            ...bookData,
            rating: processedRating // Stored as 0-5 OR "Unrated"
        };

        const index = state.books.findIndex(b => b.id === cleanedData.id);
        if (index > -1) {
            state.books[index] = { 
                ...state.books[index], 
                ...cleanedData,
                isFavorite: state.books[index].isFavorite 
            };
        } else {
            state.books.push({ ...cleanedData, isFavorite: false });
        }
    }
};