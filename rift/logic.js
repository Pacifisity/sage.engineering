document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const libraryContainer = document.getElementById('library');
    const modal = document.getElementById('modal-overlay');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const bookForm = document.getElementById('book-form');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    // --- Profile UI Elements ---
    const accountModal = document.getElementById('account-modal');
    const openAccountBtn = document.getElementById('open-account-modal');
    const closeAccountBtn = document.getElementById('close-account-modal');
    const googleLoginBtn = document.getElementById('google-login-btn');
    // --- Data UI Elements ---
    const exportBtn = document.getElementById('export-btn');
    const importTrigger = document.getElementById('import-trigger');
    const importFileInput = document.getElementById('import-file');
    const importConfirmModal = document.getElementById('import-confirm-modal');
    const confirmImportBtn = document.getElementById('confirm-import-btn');
    const cancelImportBtn = document.getElementById('cancel-import');

    // Temporary holder for data awaiting confirmation
    let pendingImportData = null;
    
    // Form Inputs
    const bookIdInput = document.getElementById('book-id');
    const titleInput = document.getElementById('title');
    const statusInput = document.getElementById('status');
    const typeInput = document.getElementById('tracking-type');
    const valueInput = document.getElementById('tracking-value');
    const ratingInput = document.getElementById('rating');

    // --- State ---
    let books = JSON.parse(localStorage.getItem('myBooks')) || [];
    let currentFilter = 'all';

    

    // --- Core Functions ---
    const updateAccountUI = () => {
        // Specifically target the <strong> tag inside the sync-status paragraph
        const statusValue = document.querySelector('#sync-status strong');
        const googleLoginBtn = document.getElementById('google-login-btn');

        if (DriveService.accessToken) {
            // Update the Status label
            if (statusValue) {
                statusValue.innerText = "Connected";
                statusValue.style.color = "#4ade80"; // Mint Green
            }
            
            // Update the Login Button
            if (googleLoginBtn) {
                googleLoginBtn.innerText = "Cloud Synced";
                googleLoginBtn.style.backgroundColor = "#28a745"; // Success Green
                googleLoginBtn.style.cursor = "default";
                googleLoginBtn.disabled = true; 
            }
        } else {
            // Reset to default if not logged in
            if (statusValue) {
                statusValue.innerText = "Local Only";
                statusValue.style.color = ""; // Reset color
            }
            if (googleLoginBtn) {
                googleLoginBtn.innerText = "Connect Google Drive";
                googleLoginBtn.style.backgroundColor = ""; 
                googleLoginBtn.style.cursor = "pointer";
                googleLoginBtn.disabled = false;
            }
        }
    };

    // 3. Auto-save to cloud when a book is saved
    const saveAndRender = () => {
        localStorage.setItem('myBooks', JSON.stringify(books));
        renderBooks();
        
        // Check if DriveService exists AND has the function before calling it
        if (DriveService.accessToken && typeof DriveService.saveStories === 'function') {
            DriveService.saveStories(books)
                .then(() => console.log("Synced with Cloud"))
                .catch(err => console.error("Cloud sync failed", err));
        } else if (DriveService.accessToken) {
            console.warn("DriveService.saveStories is missing! Check your drive logic file.");
        }
    };

    const toggleModal = (modalEl, show = true) => {
        if (!modalEl) return; // Safety check
        modalEl.style.display = show ? 'flex' : 'none';
    };

    // --- Filter Logic ---
    filterButtons.forEach(btn => {
        btn.onclick = () => {
            // Update Active UI
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set state and render
            currentFilter = btn.getAttribute('data-filter');
            renderBooks();
        };
    });
    
    // --- Modal Controls (REPLACEMENT BLOCK) ---
    
    // Function to close EVERY modal at once
    const closeAllModals = () => {
        [modal, deleteConfirmModal, accountModal, importConfirmModal].forEach(m => {
            if (m) m.style.display = 'none';
        });
    };

    // Open Main Modal
    const openModalBtn = document.getElementById('open-modal');
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            bookForm.reset();
            bookIdInput.value = '';
            modalTitle.innerText = "Add New Book";
            deleteBtn.style.display = 'none';
            toggleModal(modal, true);
        };
    }

    // Close buttons - Using a class check is safer
    document.querySelectorAll('#close-modal, #cancel-delete, #close-account-modal, #cancel-import').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAllModals();
        };
    });

    // Account Modal Open
    if (openAccountBtn) {
        openAccountBtn.onclick = (e) => {
            e.preventDefault();
            toggleModal(accountModal, true);
        };
    }

    // --- Global Window Click (The "Click Outside" Fix) ---
    window.onclick = (e) => {
        // If the user clicks the dark background (the overlay), close everything
        if (e.target.classList.contains('modal-overlay') || 
            e.target === modal || 
            e.target === deleteConfirmModal || 
            e.target === accountModal || 
            e.target === importConfirmModal) {
            closeAllModals();
        }
    };

    // --- ESC Key Support (New) ---
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeAllModals();
    });

    // --- Form Submission (Updated Fix) ---
    bookForm.onsubmit = (e) => {
        e.preventDefault();
        
        const existingBook = books.find(b => b.id == bookIdInput.value);
        
        const bookData = {
            id: bookIdInput.value ? parseInt(bookIdInput.value) : Date.now(),
            title: titleInput.value,
            status: statusInput.value,
            trackingType: typeInput.value,
            currentCount: valueInput.value || 0, 
            rating: parseInt(ratingInput.value),
            isFavorite: existingBook ? existingBook.isFavorite : false
        };

        if (bookIdInput.value) {
            books = books.map(b => b.id === bookData.id ? bookData : b);
        } else {
            books.push(bookData);
        }

        saveAndRender();
        
        // CHANGE THIS LINE:
        closeAllModals(); 
    };

    // --- Delete Logic ---
    deleteBtn.onclick = () => toggleModal(deleteConfirmModal, true);

    document.getElementById('confirm-delete-btn').onclick = () => {
        const idToDelete = parseInt(bookIdInput.value);
        books = books.filter(b => b.id !== idToDelete);
        saveAndRender();
        toggleModal(deleteConfirmModal, false);
        toggleModal(modal, false);
    };

    // --- Global Actions ---
    window.toggleFavorite = (e, id) => {
        e.stopPropagation();
        books = books.map(b => b.id === id ? { ...b, isFavorite: !b.isFavorite } : b);
        saveAndRender();
    };

    window.openEditModal = (id) => {
        const book = books.find(b => b.id === id);
        if (!book) return;

        bookIdInput.value = book.id;
        titleInput.value = book.title;
        statusInput.value = book.status || 'Reading';
        typeInput.value = book.trackingType;
        valueInput.value = book.currentCount;
        ratingInput.value = book.rating;

        modalTitle.innerText = "Edit Book";
        deleteBtn.style.display = 'block';
        toggleModal(modal, true);
    };

    // --- The Render Engine ---
    const renderBooks = () => {
        if (!libraryContainer) return;
        libraryContainer.innerHTML = '';

        const filteredBooks = books.filter(book => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'favorites') return book.isFavorite;
            return book.status === currentFilter;
        });

        if (filteredBooks.length === 0) {
            libraryContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No stories here...</p>`;
            return;
        }

        filteredBooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => window.openEditModal(book.id);
            
            const label = book.trackingType.charAt(0).toUpperCase() + book.trackingType.slice(1);

            // Check if the book has actually been started
            const hasProgress = book.currentCount && parseInt(book.currentCount) > 0;

            // Generate the progress HTML: 
            // Either "Label: Count" OR the witty text (replacing the label entirely)
            const progressHTML = hasProgress 
                ? `<span>${label}</span> <span>${book.currentCount}</span>`
                : `<span style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Haven't cracked it open yet</span>`;

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <span class="status-badge">${book.status || 'Reading'}</span>
                        <h3>${book.title}</h3>
                    </div>
                    <button class="fav-btn ${book.isFavorite ? 'active' : ''}" onclick="window.toggleFavorite(event, ${book.id})">
                        ${book.isFavorite ? '★' : '☆'}
                    </button>
                </div>
                <div class="card-stats">
                    <p>${progressHTML}</p>
                    <div class="rating-display">
                        ${book.rating > 0 ? '★'.repeat(book.rating) : '<span style="color:var(--text-muted); font-size: 0.8rem;">UNRATED</span>'}
                    </div>
                </div>
            `;
            libraryContainer.appendChild(card);
        });
    };

    renderBooks();
    
    DriveService.init(async () => {
        console.log("Google Drive Service Ready");

        // 1. Check for a saved token
        const savedToken = localStorage.getItem('google_drive_token');
        
        if (savedToken) {
            // Restore the token to the service
            DriveService.accessToken = savedToken;
            console.log("Session restored from storage.");

            try {
                // 2. Try to load stories to verify the token is still valid
                const cloudBooks = await DriveService.loadStories();
                
                // If we got data, sync it to the local state and local storage
                if (cloudBooks && cloudBooks.length > 0) {
                    books = cloudBooks;
                    // Keep localStorage in sync with what we just pulled from the cloud
                    localStorage.setItem('myBooks', JSON.stringify(books));
                    renderBooks(); 
                }
            } catch (err) {
                // 3. If token is expired or invalid, clean up storage
                console.warn("Token expired or invalid. Please reconnect.");
                localStorage.removeItem('google_drive_token');
                DriveService.accessToken = null;
            }
        }

        // Always update UI after attempting restoration
        updateAccountUI();
    });

    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            try {
                await DriveService.login();
                
                if (DriveService.accessToken) {
                    // Persist the token
                    localStorage.setItem('google_drive_token', DriveService.accessToken);
                    updateAccountUI();
                    
                    // Fetch existing cloud data immediately after login
                    const cloudBooks = await DriveService.loadStories();
                    if (cloudBooks && cloudBooks.length > 0) {
                        books = cloudBooks;
                        localStorage.setItem('myBooks', JSON.stringify(books));
                    }
                    renderBooks();
                }
            } catch (err) {
                console.error("Login failed:", err);
            }
        };
    }
    
});