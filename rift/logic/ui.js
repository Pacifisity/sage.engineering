// logic/ui.js
export const UI = {
    renderBooks: (books, currentFilter, container) => {
        if (!container) return;
        container.innerHTML = '';

        const filteredBooks = books.filter(book => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'favorites') return book.isFavorite;
            return book.status === currentFilter;
        });

        if (filteredBooks.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No stories here...</p>`;
            return;
        }

        filteredBooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.dataset.id = book.id; 

            const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
            const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;

            const progressHTML = hasProgress 
                ? `<span>${label}</span> <span>${book.currentCount}</span>`
                : `<span style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Haven't cracked it open yet</span>`;

            const urlHTML = book.url 
                ? `<a href="${book.url}" target="_blank" class="url-link" onclick="event.stopPropagation()"></a>` 
                : '';

            // --- RATING LOGIC ---
            const maxStars = 5;
            const ratingValue = book.rating;
            const isRated = typeof ratingValue === 'number';

            let ratingHTML = '';
            if (isRated) {
                const filled = '★'.repeat(ratingValue);
                const empty = '☆'.repeat(5 - ratingValue);
                ratingHTML = `<span class="stars-filled">${filled}</span><span class="stars-empty">${empty}</span>`;
            } else {
                ratingHTML = `<span style="color:var(--text-muted); font-size: 0.8rem; letter-spacing: 1px;">UNRATED</span>`;
            }

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <span class="status-badge">${book.status || 'Reading'}</span>
                        <h3>${book.title}</h3>
                    </div>
                    <button class="fav-btn ${book.isFavorite ? 'active' : ''}" data-id="${book.id}">
                        ${book.isFavorite ? '★' : '☆'}
                    </button>
                </div>
                <div class="card-stats">
                    <p>${progressHTML}</p>
                    <div class="rating-display" style="display: flex; align-items: center; gap: 8px; min-height: 24px;">
                        <div class="star-rating">${ratingHTML}</div>
                        ${urlHTML} 
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // CALL THIS FUNCTION WHEN YOU OPEN YOUR EDIT MODAL
    populateEditModal: (book) => {
        const ratingSelect = document.getElementById('rating');
        if (!ratingSelect) return;

        // This ensures the dropdown says "Unrated" instead of being empty
        // It matches the <option value=""> in your HTML
        ratingSelect.value = (book.rating === null || book.rating === undefined) ? "" : book.rating;
        
        // Populate other fields as well
        document.getElementById('edit-title').value = book.title || '';
        document.getElementById('edit-status').value = book.status || 'Reading';
        // ... any other fields
    },
    
    updateSyncStatus(isAuthenticated) {
        const statusElement = document.querySelector('#sync-status strong');
        const loginBtn = document.getElementById('google-login-btn');
        
        if (isAuthenticated) {
            statusElement.textContent = "Cloud Synced";
            statusElement.style.color = "#4CAF50"; 
            if (loginBtn) loginBtn.textContent = "Account Connected";
        } else {
            statusElement.textContent = "Local Only";
            statusElement.style.color = ""; 
        }
    }
};