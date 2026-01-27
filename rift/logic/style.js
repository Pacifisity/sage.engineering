/* ==========================================================================
   VISUAL EFFECTS & NAVIGATION INTERFACE (Style.js)
   ========================================================================== */

const navContainer = document.querySelector('.filter-container');
const navIndicator = document.querySelector('.nav-indicator');

/**
 * Calculates and updates CSS Custom Properties for scroll-based mask effects.
 * Determines the opacity of left/right fade gradients based on scroll position.
 */
const handleNavShading = () => {
    if (!navContainer) return;
    const scrollLeft = navContainer.scrollLeft;
    const maxScroll = navContainer.scrollWidth - navContainer.clientWidth;
    const fadeDistance = 60; // Pixels at which the gradient reaches full opacity

    const leftOpacity = Math.min(scrollLeft / fadeDistance, 1);
    const rightOpacity = Math.max(0, Math.min((maxScroll - scrollLeft) / fadeDistance, 1));

    // Update CSS variables used in the container's mask-image or pseudo-elements
    navContainer.style.setProperty('--left-opacity', leftOpacity);
    navContainer.style.setProperty('--right-opacity', rightOpacity);
};

/**
 * Dynamically positions the navigation highlight bar.
 * Calculates position and width based on the current 'active' filter button.
 */
window.updateIndicator = () => {
    const activeBtn = document.querySelector('.filter-btn.active');
    
    // Validate that the active element and required UI nodes are present
    if (activeBtn && navIndicator && navContainer) {
        const btnWidth = activeBtn.offsetWidth;
        const btnLeft = activeBtn.offsetLeft;
        
        // Prevent calculations if the element is hidden (offset is 0)
        if (btnWidth === 0) return; 

        // Center the glow relative to the button width (approx 70% of button size)
        const glowWidth = btnWidth * 0.7; 
        const centerPos = btnLeft + (btnWidth / 2) - (glowWidth / 2);

        navIndicator.style.width = `${glowWidth}px`;
        navIndicator.style.transform = `translateX(${centerPos}px)`;
        navIndicator.style.opacity = "1";
    } else if (navIndicator) {
        navIndicator.style.opacity = "0"; // Reset visibility if state is null
    }
};

/* --- DOM LIFECYCLE & OBSERVERS --- */

if (navContainer) {
    /**
     * Reacts to class changes on child elements (e.g., filter button clicks).
     * This decouples the indicator logic from the functional click listeners.
     */
    const observer = new MutationObserver(() => window.updateIndicator());
    observer.observe(navContainer, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['class'] 
    });

    // Event listeners for UI responsiveness
    navContainer.addEventListener('scroll', handleNavShading);
    window.addEventListener('resize', () => {
        handleNavShading();
        window.updateIndicator();
    });

    /**
     * Initial boot sequence.
     * Uses a slight delay to allow the browser to complete initial layout 
     * and CSS rendering before calculating geometric positions.
     */
    setTimeout(() => {
        handleNavShading();
        window.updateIndicator();
    }, 50);
}

/* --- GLOBAL UI INTERACTIONS --- */

/**
 * Dismisses a modal by target ID.
 * @param {string} modalId - The unique identifier of the overlay.
 */
window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        // 1. Start the fade out
        modal.classList.remove('active');

        // 2. Wait for the transition to finish before doing any "cleanup"
        // This ensures the animation plays fully.
        const handleTransitionEnd = () => {
            // Optional: If you use a 'hidden' class to set display: none,
            // add it here AFTER the fade is done.
            // modal.classList.add('hidden'); 
            
            modal.removeEventListener('transitionend', handleTransitionEnd);
        };

        modal.addEventListener('transitionend', handleTransitionEnd);
    }
};

/**
 * Delegated click handler for global UI triggers (Modals, Backdrop, Tabs).
 */
document.addEventListener('click', (e) => {
    // Modal Dismissal: Explicit close triggers
    const closeIds = ['close-account-modal', 'close-modal', 'cancel-delete', 'cancel-import'];
    if (closeIds.includes(e.target.id)) {
        const modal = e.target.closest('.modal-overlay');
        if (modal) window.closeModal(modal.id);
    }

    // Modal Dismissal: Backdrop/Overlay click detection
    if (e.target.classList.contains('modal-overlay')) {
        window.closeModal(e.target.id);
    }

    // Navigation Toggle: Visual 'active' state switching
    if (e.target.classList.contains('filter-btn')) {
        const parent = e.target.parentElement;
        parent.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
});