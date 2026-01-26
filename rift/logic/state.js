// logic/state.js
export const state = {
    books: JSON.parse(localStorage.getItem('myBooks')) || [],
    currentFilter: 'all',
    
    save(newBooks) {
        this.books = newBooks;
        localStorage.setItem('myBooks', JSON.stringify(this.books));
    }
};