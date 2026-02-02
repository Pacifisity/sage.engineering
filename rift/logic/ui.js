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
     * @param {string} sortMode - The sorting mode (default: 'status-rating').
     */
    renderBooks: (books, currentFilter, container, searchQuery = '', sortMode = 'status-rating') => {
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

            // 1. Filter Logic
            const filteredBooks = books.filter(book => {
                const matchesTab = currentFilter === 'all' || 
                                  (currentFilter.toLowerCase() === 'favorites' 
                                   ? book.isFavorite 
                                   : book.status === currentFilter);
                
                const query = searchQuery.toLowerCase().trim();
                const matchesSearch = !query || book.title.toLowerCase().includes(query);

                return matchesTab && matchesSearch;
            });

            // 2. Sorting Logic
            const statusOrder = {
                'Reading': 1,
                'Plan to Read': 2,
                'Completed': 3,
                'Dropped': 4
            };

            filteredBooks.sort((a, b) => {
                switch(sortMode) {
                    case 'status-rating':
                        // Default: Status (Reading -> Plan -> Completed -> Dropped) then Rating (High to Low)
                        const priorityA = statusOrder[a.status] || 5;
                        const priorityB = statusOrder[b.status] || 5;
                        if (priorityA !== priorityB) return priorityA - priorityB;
                        const ratingA = (a.rating === "Unrated" || !a.rating) ? 0 : parseInt(a.rating);
                        const ratingB = (b.rating === "Unrated" || !b.rating) ? 0 : parseInt(b.rating);
                        return ratingB - ratingA;

                    case 'rating-desc':
                        const rA = (a.rating === "Unrated" || !a.rating) ? 0 : parseInt(a.rating);
                        const rB = (b.rating === "Unrated" || !b.rating) ? 0 : parseInt(b.rating);
                        return rB - rA;

                    case 'title-asc':
                        return (a.title || '').localeCompare(b.title || '');

                    case 'date-added':
                        const dateA = new Date(a.dateAdded || 0).getTime();
                        const dateB = new Date(b.dateAdded || 0).getTime();
                        return dateB - dateA;

                    case 'author-asc':
                        return (a.author || '').localeCompare(b.author || '');

                    case 'progress-desc':
                        const progressA = parseInt(a.currentCount || 0);
                        const progressB = parseInt(b.currentCount || 0);
                        return progressB - progressA;

                    default:
                        return 0;
                }
            });

            // 3. Handle Empty State
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

            // 4. Generate Cards
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
                            ${book.author ? `<p class="card-author">by ${book.author}</p>` : ''}
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
                    ${book.notes ? `<div class="card-notes">${book.notes}</div>` : ''}
                `;
                container.appendChild(card);
            });
        }, 150);
    },

    populateEditModal: (book) => {
        const elements = {
            rating: document.getElementById('rating'),
            title: document.getElementById('title'),
            author: document.getElementById('author'),
            status: document.getElementById('status'),
            id: document.getElementById('book-id'),
            type: document.getElementById('tracking-type'),
            val: document.getElementById('tracking-value'),
            url: document.getElementById('url'),
            notes: document.getElementById('notes'),
            delete: document.getElementById('delete-btn'),
            mTitle: document.getElementById('modal-title')
        };

        if (elements.id) elements.id.value = book.id || '';
        if (elements.title) elements.title.value = book.title || '';
        if (elements.author) elements.author.value = book.author || '';
        if (elements.status) elements.status.value = book.status || 'Reading';
        if (elements.type) elements.type.value = book.trackingType || 'chapter';
        if (elements.val) elements.val.value = book.currentCount || '';
        if (elements.url) elements.url.value = book.url || '';
        if (elements.notes) elements.notes.value = book.notes || '';
        
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
        const logoutBtn = document.getElementById('google-logout-btn');
        
        if (isAuthenticated) {
            if (statusElement) {
                statusElement.textContent = "Cloud Synced";
                const successColor = getComputedStyle(document.documentElement)
                    .getPropertyValue('--success')
                    .trim();
                statusElement.style.color = successColor || "#4CAF50";
            }
            if (subtextElement) subtextElement.style.display = 'none';
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
        } else {
            if (statusElement) {
                statusElement.textContent = "Local Only";
                statusElement.style.color = ""; 
            }
            if (subtextElement) subtextElement.style.display = 'block';
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
        }
    }
};