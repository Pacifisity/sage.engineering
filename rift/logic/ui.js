let lastTabIndex = 0;

// logic/ui.js
export const UI = {
    renderBooks: (books, currentFilter, container) => {
        if (!container) return;

        // 1. DYNAMICALLY FIND TAB ORDER
        const allTabs = Array.from(document.querySelectorAll('.filter-btn'));
        const currentTabIndex = allTabs.findIndex(tab => 
            tab.dataset.filter.toLowerCase() === currentFilter.toLowerCase()
        );
        
        // Determine "Flight" Directions
        const isMovingRight = currentTabIndex >= lastTabIndex;
        const exitClass = isMovingRight ? 'fly-out-left' : 'fly-out-right';
        const enterClass = isMovingRight ? 'fly-in-right' : 'fly-in-left';
        
        lastTabIndex = currentTabIndex;

        // 2. TRIGGER THE "FLY AWAY" (Exit) for ALL existing content
        const existingElements = container.querySelectorAll('.book-card, .empty-state-msg');
        if (existingElements.length > 0) {
            existingElements.forEach(el => {
                // Reset delays so they all fly out at the same time
                el.style.animationDelay = '0s';
                el.classList.remove('fly-in-right', 'fly-in-left', 'slide-right', 'slide-left');
                
                // Force a reflow so the browser notices the class change
                void el.offsetWidth; 
                el.classList.add(exitClass);
            });
        }

        // 3. WAIT FOR EXIT FLIGHT (300ms), THEN RENDER NEW CONTENT
        setTimeout(() => {
            container.innerHTML = '';

            // Filter logic
            const filteredBooks = books.filter(book => {
                if (currentFilter === 'all') return true;
                if (currentFilter.toLowerCase() === 'favorites') return book.isFavorite;
                return book.status === currentFilter;
            });

            // Handle Empty State "Flying In"
            if (filteredBooks.length === 0) {
                container.innerHTML = `
                    <p class="empty-state-msg ${enterClass}" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                        No stories here...
                    </p>`;
                return;
            }

            // Handle Cards "Flying In"
            filteredBooks.forEach((book, index) => {
                const card = document.createElement('div');
                card.className = `book-card ${enterClass}`;
                card.dataset.id = book.id; 
                
                // Stagger the entrance for a "flowing" effect
                card.style.animationDelay = `${index * 0.04}s`;

                // --- PROGRESS LOGIC ---
                const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
                const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;
                const progressHTML = hasProgress 
                    ? `<span>${label}</span> <span>${book.currentCount}</span>`
                    : `<span style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Haven't cracked it open yet</span>`;

                // --- URL LOGIC ---
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

                // --- GENERATE HTML ---
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
        }, 200); // Wait for the "Exit" flight to nearly finish
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