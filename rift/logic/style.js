/* ==========================================================================
   NAVIGATION & MODAL STYLES (Style.js)
   ========================================================================== */

const navContainer = document.querySelector('.filter-container');
const navIndicator = document.querySelector('.nav-indicator');

const handleNavShading = () => {
    if (!navContainer) return;
    const scrollLeft = navContainer.scrollLeft;
    const maxScroll = navContainer.scrollWidth - navContainer.clientWidth;
    const fadeDistance = 60; 

    const leftOpacity = Math.min(scrollLeft / fadeDistance, 1);
    const rightOpacity = Math.max(0, Math.min((maxScroll - scrollLeft) / fadeDistance, 1));

    navContainer.style.setProperty('--left-opacity', leftOpacity);
    navContainer.style.setProperty('--right-opacity', rightOpacity);
};

window.updateIndicator = () => {
    const activeBtn = document.querySelector('.filter-btn.active');
    
    // Check if the button is actually visible/rendered
    if (activeBtn && navIndicator && navContainer) {
        const btnWidth = activeBtn.offsetWidth;
        const btnLeft = activeBtn.offsetLeft;
        
        if (btnWidth === 0) return; // Guard against unrendered state

        const glowWidth = btnWidth * 0.7; 
        const centerPos = btnLeft + (btnWidth / 2) - (glowWidth / 2);

        navIndicator.style.width = `${glowWidth}px`;
        navIndicator.style.transform = `translateX(${centerPos}px)`;
        navIndicator.style.opacity = "1";
    } else if (navIndicator) {
        navIndicator.style.opacity = "0"; // Hide if no active button
    }
};

/* --- AUTOMATIC OBSERVER --- */
// This watches for the "active" class changing so you don't have to 
// manually call updateIndicator in every click listener.
if (navContainer) {
    const observer = new MutationObserver(() => window.updateIndicator());
    observer.observe(navContainer, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['class'] 
    });

    navContainer.addEventListener('scroll', handleNavShading);
    window.addEventListener('resize', () => {
        handleNavShading();
        window.updateIndicator();
    });

    // Run on boot with a tiny delay to ensure CSS transitions don't block measurements
    setTimeout(() => {
        handleNavShading();
        window.updateIndicator();
    }, 50);
}

/* --- MODAL LOGIC --- */
window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

document.addEventListener('click', (e) => {
    // Check for close buttons
    const closeIds = ['close-account-modal', 'close-modal', 'cancel-delete', 'cancel-import'];
    if (closeIds.includes(e.target.id)) {
        // Find the closest parent overlay and shut it down
        const modal = e.target.closest('.modal-overlay');
        if (modal) window.closeModal(modal.id);
    }

    // Close on backdrop click (clicking outside the content)
    if (e.target.classList.contains('modal-overlay')) {
        window.closeModal(e.target.id);
    }

    // Tab Filter logic (Ensuring it doesn't break)
    if (e.target.classList.contains('filter-btn')) {
        const parent = e.target.parentElement;
        parent.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
});