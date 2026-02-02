/**
 * logic/ui.js
 * * Handles the visual representation of data, including complex 
 * state-driven animations and component rendering.
 */

let lastTabIndex = 0;
let lastRenderedBookIds = []; // Track which books were rendered

const escapeHTML = (value) => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const sanitizeUrl = (url) => {
    if (!url) return '';
    try {
        const parsed = new URL(url, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch {
        return '';
    }
    return '';
};

export const UI = {
    /**
     * Renders the book library with context-aware animations.
     * @param {Array} books - The full list of book objects.
     * @param {string} currentFilter - The active tab (e.g., 'all', 'Favorites').
     * @param {HTMLElement} container - The library div.
     * @param {string} searchQuery - The text from the search bar.
     * @param {string} sortMode - The sorting mode (default: 'status-rating').
     * @param {string} animationType - Animation context: 'tab-change', 'content-update', 'smart', or 'none' (default: 'content-update').
     */
    renderBooks: (books, currentFilter, container, searchQuery = '', sortMode = 'status-rating', animationType = 'content-update') => {
        if (!container) return;

        // --- PHASE 1: ANIMATION CALCULATIONS ---
        let exitClass, enterClass, animationDelay;
        
        if (animationType === 'tab-change') {
            // Full directional animation for tab changes
            const allTabs = Array.from(document.querySelectorAll('.filter-btn'));
            const currentTabIndex = allTabs.findIndex(tab => 
                tab.dataset.filter.toLowerCase() === currentFilter.toLowerCase()
            );
            
            const isMovingRight = currentTabIndex >= lastTabIndex;
            exitClass = isMovingRight ? 'fly-out-left' : 'fly-out-right';
            enterClass = isMovingRight ? 'fly-in-right' : 'fly-in-left';
            animationDelay = 0.04;
            
            lastTabIndex = currentTabIndex;
        } else if (animationType === 'content-update') {
            // Subtle fade for content updates (sort, search, edit, favorite)
            exitClass = 'fade-out-only';
            enterClass = 'fade-in-only';
            animationDelay = 0.015;
        } else {
            // No animation
            exitClass = '';
            enterClass = '';
            animationDelay = 0;
        }

        // --- PHASE 2: EXECUTE EXIT ANIMATIONS ---
        const existingElements = container.querySelectorAll('.book-card, .empty-state-msg');
        if (existingElements.length > 0 && exitClass) {
            existingElements.forEach(el => {
                el.style.animationDelay = '0s';
                el.classList.remove('fly-in-right', 'fly-in-left', 'fade-in-only', 'slide-right', 'slide-left');
                void el.offsetWidth; 
                el.classList.add(exitClass);
            });
        }

        // --- PHASE 3: RENDER NEW CONTENT ---
        const renderDelay = (existingElements.length > 0 && exitClass) ? (animationType === 'tab-change' ? 150 : 80) : 0;
        setTimeout(() => {
            // 1. Filter Logic
            const filteredBooks = books.filter(book => {
                const matchesTab = currentFilter === 'all' || 
                                  (currentFilter.toLowerCase() === 'favorites' 
                                   ? book.isFavorite 
                                   : currentFilter.toLowerCase() === 'recommendations'
                                   ? book.status === 'Recommendations'
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
                'Dropped': 4,
                'Recommendations': 5
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

            // Smart card reuse: If 'smart' mode and the same books are displayed in the same order, skip re-rendering
            const currentBookIds = filteredBooks.map(b => b.id);
            const sameBooks = animationType === 'smart' && 
                              currentBookIds.length === lastRenderedBookIds.length &&
                              currentBookIds.every((id, idx) => id === lastRenderedBookIds[idx]);
            
            if (sameBooks) {
                // Just update existing cards in place without re-rendering
                filteredBooks.forEach((book, index) => {
                    const existingCard = container.querySelector(`[data-id="${book.id}"]`);
                    if (existingCard) {
                        UI.updateCardInPlace(existingCard, book);
                    }
                });
                return;
            }

            lastRenderedBookIds = currentBookIds;
            container.innerHTML = '';

            // 3. Handle Empty State
            if (filteredBooks.length === 0) {
                const message = searchQuery 
                    ? `No titles match "${searchQuery}"` 
                    : "No stories here...";

                const empty = document.createElement('p');
                empty.className = `empty-state-msg ${enterClass}`;
                empty.style.gridColumn = '1/-1';
                empty.style.textAlign = 'center';
                empty.style.color = 'var(--text-muted)';
                empty.style.padding = '40px';
                if (enterClass && animationDelay) empty.style.animationDelay = '0s';
                empty.textContent = message;
                container.appendChild(empty);
                return;
            }

            // 4. Generate Cards
            const fragment = document.createDocumentFragment();
            filteredBooks.forEach((book, index) => {
                const card = document.createElement('div');
                card.className = `book-card ${enterClass}`;
                card.dataset.id = book.id; 
                if (enterClass) {
                    card.style.animationDelay = `${index * animationDelay}s`;
                }

                const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
                const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;
                
                const progressHTML = hasProgress 
                    ? `<span>${label}</span> <span>${book.currentCount}</span>`
                    : ``;

                const safeUrl = sanitizeUrl(book.url);
                const urlHTML = safeUrl
                    ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="url-link" onclick="event.stopPropagation()"></a>` 
                    : '';

                const safeTitle = escapeHTML(book.title || '');
                const safeAuthor = escapeHTML(book.author || '');
                const safeStatus = escapeHTML(book.status || 'Reading');
                const safeNotes = escapeHTML(book.notes || '');

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
                            <span class="status-badge">${safeStatus}</span>
                            <h3>${safeTitle}</h3>
                            ${safeAuthor ? `<p class="card-author">by ${safeAuthor}</p>` : ''}
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
                    ${safeNotes ? `<div class="card-notes">${safeNotes}</div>` : ''}
                `;
                fragment.appendChild(card);
            });
            container.appendChild(fragment);
        }, renderDelay);
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
    },

    /**
     * Updates a single card in place without re-rendering
     * @param {HTMLElement} cardElement - The card DOM element
     * @param {Object} book - The updated book data
     */
    updateCardInPlace(cardElement, book) {
        // Update favorite button
        const favBtn = cardElement.querySelector('.fav-btn');
        if (favBtn) {
            favBtn.className = `fav-btn ${book.isFavorite ? 'active' : ''}`;
            favBtn.textContent = book.isFavorite ? '★' : '☆';
        }

        // Update status badge
        const statusBadge = cardElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.textContent = book.status || 'Reading';
        }

        // Update title
        const titleEl = cardElement.querySelector('h3');
        if (titleEl) {
            titleEl.textContent = book.title;
        }

        // Update author
        const authorEl = cardElement.querySelector('.card-author');
        if (book.author) {
            if (authorEl) {
                authorEl.textContent = `by ${book.author}`;
            } else {
                const cardHeader = cardElement.querySelector('.card-header > div');
                if (cardHeader) {
                    const authorP = document.createElement('p');
                    authorP.className = 'card-author';
                    authorP.textContent = `by ${book.author}`;
                    cardHeader.appendChild(authorP);
                }
            }
        } else if (authorEl) {
            authorEl.remove();
        }

        // Update progress
        const statsP = cardElement.querySelector('.card-stats p');
        if (statsP) {
            const label = book.trackingType ? (book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1)) : 'Progress';
            const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;
            statsP.innerHTML = hasProgress ? `<span>${label}</span> <span>${book.currentCount}</span>` : '';
        }

        // Update rating
        const ratingDisplay = cardElement.querySelector('.star-rating');
        if (ratingDisplay) {
            const ratingValue = book.rating;
            const isRated = typeof ratingValue === 'number' || (typeof ratingValue === 'string' && ratingValue !== "Unrated" && ratingValue !== "");
            
            if (isRated) {
                const numStars = parseInt(ratingValue);
                ratingDisplay.innerHTML = `<span class="stars-filled">${'★'.repeat(numStars)}</span><span class="stars-empty">${'☆'.repeat(5 - numStars)}</span>`;
            } else {
                ratingDisplay.innerHTML = `<span style="color:var(--text-muted); font-size: 0.8rem; letter-spacing: 1px;">UNRATED</span>`;
            }
        }

        // Update notes
        const notesEl = cardElement.querySelector('.card-notes');
        if (book.notes) {
            if (notesEl) {
                notesEl.textContent = book.notes;
            } else {
                const notesDiv = document.createElement('div');
                notesDiv.className = 'card-notes';
                notesDiv.textContent = book.notes;
                cardElement.appendChild(notesDiv);
            }
        } else if (notesEl) {
            notesEl.remove();
        }
    }
};