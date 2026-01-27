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
            container.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; 
                animation: cardEntrance 0.5s ease forwards;">
                    No stories here...
                </p>`;
            return;
        }

        filteredBooks.forEach((book, index) => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.dataset.id = book.id; 

            // Add staggered delay for the "flow-in" effect
            // Every card waits 0.05s longer than the previous one
            card.style.animationDelay = `${index * 0.05}s`;

            const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
            const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;

            const progressHTML = hasProgress 
                ? `<span>${label}</span> <span>${book.currentCount}</span>`
                : `<span style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Haven't cracked it open yet</span>`;

            const urlHTML = book.url 
                ? `<a href="${book.url}" target="_blank" class="url-link" onclick="event.stopPropagation()"></a>` 
                : '';

            // --- RATING LOGIC ---
            const ratingValue = book.rating;
            const isRated = typeof ratingValue === 'number' || (typeof ratingValue === 'string' && ratingValue !== "Unrated" && ratingValue !== "");

            let ratingHTML = '';
            if (isRated) {
                const numStars = parseInt(ratingValue);
                const filled = '★'.repeat(numStars);
                const empty = '☆'.repeat(5 - numStars);
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

    populateEditModal: (book) => {
        const ratingSelect = document.getElementById('rating');
        const titleInput = document.getElementById('title');
        const statusSelect = document.getElementById('status');
        const idInput = document.getElementById('book-id');
        const trackingTypeSelect = document.getElementById('tracking-type');
        const trackingValueInput = document.getElementById('tracking-value');
        const urlInput = document.getElementById('url');
        const deleteBtn = document.getElementById('delete-btn');

        if (idInput) idInput.value = book.id || '';
        if (titleInput) titleInput.value = book.title || '';
        if (statusSelect) statusSelect.value = book.status || 'Reading';
        if (trackingTypeSelect) trackingTypeSelect.value = book.trackingType || 'chapter';
        if (trackingValueInput) trackingValueInput.value = book.currentCount || '';
        if (urlInput) urlInput.value = book.url || '';
        
        if (ratingSelect) {
            ratingSelect.value = (book.rating === null || book.rating === undefined) ? "Unrated" : book.rating;
        }

        if (deleteBtn) deleteBtn.style.display = 'block';
        
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = "Edit Book";
    },
    
    updateSyncStatus(isAuthenticated) {
        const statusElement = document.querySelector('#sync-status strong');
        const loginBtn = document.getElementById('google-login-btn');
        
        if (isAuthenticated) {
            if (statusElement) {
                statusElement.textContent = "Cloud Synced";
                statusElement.style.color = "#4CAF50"; 
            }
            if (loginBtn) loginBtn.textContent = "Account Connected";
        } else {
            if (statusElement) {
                statusElement.textContent = "Local Only";
                statusElement.style.color = ""; 
            }
        }
    }
};