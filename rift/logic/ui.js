/**
 * logic/ui.js
 * * Handles the visual representation of data, including complex 
 * state-driven animations and component rendering.
 */

let lastTabIndex = 0;

export const UI = {
    /**
     * Renders the book library with a directional "Flight" animation.
     * Elements exit in the direction of navigation and enter from the opposite side.
     */
    renderBooks: (books, currentFilter, container) => {
        if (!container) return;

        // --- PHASE 1: DIRECTIONAL CALCULATIONS ---
        const allTabs = Array.from(document.querySelectorAll('.filter-btn'));
        const currentTabIndex = allTabs.findIndex(tab => 
            tab.dataset.filter.toLowerCase() === currentFilter.toLowerCase()
        );
        
        // Determine animation vectors based on index delta
        const isMovingRight = currentTabIndex >= lastTabIndex;
        const exitClass = isMovingRight ? 'fly-out-left' : 'fly-out-right';
        const enterClass = isMovingRight ? 'fly-in-right' : 'fly-in-left';
        
        lastTabIndex = currentTabIndex;

        // --- PHASE 2: EXECUTE EXIT ANIMATIONS ---
        const existingElements = container.querySelectorAll('.book-card, .empty-state-msg');
        if (existingElements.length > 0) {
            existingElements.forEach(el => {
                // Clear staggered delays so all elements exit simultaneously
                el.style.animationDelay = '0s';
                el.classList.remove('fly-in-right', 'fly-in-left', 'slide-right', 'slide-left');
                
                // Trigger a forced reflow to ensure the browser registers the class removal 
                // before adding the exit animation
                void el.offsetWidth; 
                el.classList.add(exitClass);
            });
        }

        // --- PHASE 3: RENDER NEW CONTENT ---
        // Wait for the exit animation to progress before swapping content
        setTimeout(() => {
            container.innerHTML = '';

            const filteredBooks = books.filter(book => {
                if (currentFilter === 'all') return true;
                if (currentFilter.toLowerCase() === 'favorites') return book.isFavorite;
                return book.status === currentFilter;
            });

            // Empty state handling
            if (filteredBooks.length === 0) {
                container.innerHTML = `
                    <p class="empty-state-msg ${enterClass}" style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">
                        No stories here...
                    </p>`;
                return;
            }

            // Book Card Generation
            filteredBooks.forEach((book, index) => {
                const card = document.createElement('div');
                card.className = `book-card ${enterClass}`;
                card.dataset.id = book.id; 
                
                // Stagger entrance animations for a more organic feel
                card.style.animationDelay = `${index * 0.04}s`;

                // Progress & Tracking Logic
                const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
                const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;
                const progressHTML = hasProgress 
                    ? `<span>${label}</span> <span>${book.currentCount}</span>`
                    : `<span style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Haven't cracked it open yet</span>`;

                // Link & Rating Normalization
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
        }, 150); // Timeout calibrated to mid-point of CSS transition duration
    },

    /**
     * Maps book record properties to the modal's input fields.
     */
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
    
    /**
     * Updates the global connection status indicators in the UI.
     * @param {boolean} isAuthenticated - Whether a valid cloud session is active.
     */
    updateSyncStatus(isAuthenticated) {
        const statusElement = document.querySelector('#sync-status strong');
        const subtextElement = document.querySelector('.status-subtext');
        const loginBtn = document.getElementById('google-login-btn');
        
        if (isAuthenticated) {
            // Update Status Header
            if (statusElement) {
                statusElement.textContent = "Cloud Synced";
                statusElement.style.color = "#4CAF50"; 
            }

            // Hide the "Sign in to back up..." message
            if (subtextElement) {
                subtextElement.style.display = 'none';
            }

            // Disable button interaction and update look
            if (loginBtn) {
                loginBtn.textContent = "Account Connected";
                loginBtn.style.pointerEvents = 'none';
                loginBtn.style.opacity = '0.7';
                loginBtn.style.filter = 'grayscale(0.5)';
            }
        } else {
            // Restore "Logged Out" State
            if (statusElement) {
                statusElement.textContent = "Local Only";
                statusElement.style.color = ""; 
            }

            if (subtextElement) {
                subtextElement.style.display = 'block';
            }

            if (loginBtn) {
                loginBtn.textContent = "Connect Google Drive";
                loginBtn.style.pointerEvents = 'auto';
                loginBtn.style.opacity = '1';
                loginBtn.style.filter = 'none';
            }
        }
    }
};