/**
 * logic/ui.js
 * * Handles the visual representation of data, including complex 
 * state-driven animations and component rendering.
 */

let lastTabIndex = 0;

export const UI = {
    /**
     * Renders the book library with a directional "Flight" animation.
     * @param {Array} books - The full list of book objects.
     * @param {string} currentFilter - The active tab (e.g., 'all', 'Favorites').
     * @param {HTMLElement} container - The library div.
     * @param {string} searchQuery - The text from the search bar.
     */
    renderBooks: (books, currentFilter, container, searchQuery = '') => {
        if (!container) return;

        // --- PHASE 1: DIRECTIONAL CALCULATIONS ---
        const allTabs = Array.from(document.querySelectorAll('.filter-btn'));
        const currentTabIndex = allTabs.findIndex(tab => 
            tab.dataset.filter.toLowerCase() === currentFilter.toLowerCase()
        );
        
        const isMovingRight = currentTabIndex >= lastTabIndex;
        const exitClass = isMovingRight ? 'fly-out-left' : 'fly-out-right';
        const enterClass = isMovingRight ? 'fly-in-right' : 'fly-in-left';
        
        lastTabIndex = currentTabIndex;

        // --- PHASE 2: EXECUTE EXIT ANIMATIONS ---
        const existingElements = container.querySelectorAll('.book-card, .empty-state-msg');
        if (existingElements.length > 0) {
            existingElements.forEach(el => {
                el.style.animationDelay = '0s';
                el.classList.remove('fly-in-right', 'fly-in-left', 'slide-right', 'slide-left');
                void el.offsetWidth; 
                el.classList.add(exitClass);
            });
        }

        // --- PHASE 3: RENDER NEW CONTENT ---
        setTimeout(() => {
            container.innerHTML = '';

            // Combine Tab Filtering and Search Filtering
            const filteredBooks = books.filter(book => {
                // 1. Tab Logic
                const matchesTab = currentFilter === 'all' || 
                                  (currentFilter.toLowerCase() === 'favorites' 
                                   ? book.isFavorite 
                                   : book.status === currentFilter);
                
                // 2. Search Logic (Case-insensitive check on Title)
                const query = searchQuery.toLowerCase().trim();
                const matchesSearch = !query || book.title.toLowerCase().includes(query);

                return matchesTab && matchesSearch;
            });

            if (filteredBooks.length === 0) {
                const message = searchQuery 
                    ? `No titles match "${searchQuery}"` 
                    : "No stories here...";
                    
                container.innerHTML = `
                    <p class="empty-state-msg ${enterClass}" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                        ${message}
                    </p>`;
                return;
            }

            filteredBooks.forEach((book, index) => {
                const card = document.createElement('div');
                card.className = `book-card ${enterClass}`;
                card.dataset.id = book.id; 
                card.style.animationDelay = `${index * 0.04}s`;

                const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
                const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;
                
                const progressHTML = hasProgress 
                    ? `<span>${label}</span> <span>${book.currentCount}</span>`
                    : ``;

                const urlHTML = book.url 
                    ? `<a href="${book.url}" target="_blank" class="url-link" onclick="event.stopPropagation()"></a>` 
                    : '';

                const ratingValue = book.rating;
                const isRated = typeof ratingValue === 'number' || (typeof ratingValue === 'string' && ratingValue !== "Unrated" && ratingValue !== "");
                let ratingHTML = '';
                
                if (isRated) {
                    const numStars = parseInt(ratingValue);
                    ratingHTML = `<span class="stars-filled">${'★'.repeat(numStars)}</span><span class="stars-empty">${'☆'.repeat(5 - numStars)}</span>`;
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
        }, 150);
    },

    populateEditModal: (book) => {
        const elements = {
            rating: document.getElementById('rating'),
            title: document.getElementById('title'),
            status: document.getElementById('status'),
            id: document.getElementById('book-id'),
            type: document.getElementById('tracking-type'),
            val: document.getElementById('tracking-value'),
            url: document.getElementById('url'),
            delete: document.getElementById('delete-btn'),
            mTitle: document.getElementById('modal-title')
        };

        if (elements.id) elements.id.value = book.id || '';
        if (elements.title) elements.title.value = book.title || '';
        if (elements.status) elements.status.value = book.status || 'Reading';
        if (elements.type) elements.type.value = book.trackingType || 'chapter';
        if (elements.val) elements.val.value = book.currentCount || '';
        if (elements.url) elements.url.value = book.url || '';
        
        if (elements.rating) {
            elements.rating.value = (book.rating === null || book.rating === undefined) ? "Unrated" : book.rating;
        }

        if (elements.delete) elements.delete.style.display = 'block';
        if (elements.mTitle) elements.mTitle.textContent = "Edit Book";
    },
    
    updateSyncStatus(isAuthenticated) {
        const statusElement = document.querySelector('#sync-status strong');
        const subtextElement = document.querySelector('.status-subtext');
        const loginBtn = document.getElementById('google-login-btn');
        
        if (isAuthenticated) {
            if (statusElement) {
                statusElement.textContent = "Cloud Synced";
                statusElement.style.color = "#4CAF50"; 
            }
            if (subtextElement) subtextElement.style.display = 'none';
            if (loginBtn) {
                loginBtn.textContent = "Account Connected";
                loginBtn.style.pointerEvents = 'none';
                loginBtn.style.opacity = '0.7';
                loginBtn.style.filter = 'grayscale(0.5)';
            }
        } else {
            if (statusElement) {
                statusElement.textContent = "Local Only";
                statusElement.style.color = ""; 
            }
            if (subtextElement) subtextElement.style.display = 'block';
            if (loginBtn) {
                loginBtn.textContent = "Connect Google Drive";
                loginBtn.style.pointerEvents = 'auto';
                loginBtn.style.opacity = '1';
                loginBtn.style.filter = 'none';
            }
        }
    }
};