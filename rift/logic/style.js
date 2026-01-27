const container = document.querySelector('.filter-container');

const handleScroll = () => {
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    // Increased from 30 to 60 for a more gradual, obvious re-entry
    const fadeDistance = 60; 

    // Calculate how 'active' the fade is (0 to 1)
    const leftOpacity = Math.min(scrollLeft / fadeDistance, 1);
    const rightOpacity = Math.min((maxScroll - scrollLeft) / fadeDistance, 1);

    container.style.setProperty('--left-opacity', leftOpacity);
    container.style.setProperty('--right-opacity', rightOpacity);
};

container.addEventListener('scroll', handleScroll);
window.addEventListener('resize', handleScroll);
handleScroll();

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return; // Guard clause: stop if the modal doesn't exist
    
    modal.classList.add('closing');

    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
    }, 200);
}

// Example usage for your close button:
document.getElementById('close-account-modal').addEventListener('click', () => {
    closeModal('account-modal');
});

document.getElementById('close-modal').addEventListener('click', () => {
    closeModal('modal-overlay');
});

// Delete Modal Cancel
document.getElementById('cancel-delete').addEventListener('click', () => {
    closeModal('delete-confirm-modal');
});

// Import Modal Cancel
document.getElementById('cancel-import').addEventListener('click', () => {
    closeModal('import-confirm-modal');
});

const updateIndicator = () => {
    const activeBtn = document.querySelector('.filter-btn.active');
    const indicator = document.querySelector('.nav-indicator');
    const container = document.querySelector('.filter-container');

    if (activeBtn && indicator) {
        // 1. Get dimensions
        const btnWidth = activeBtn.offsetWidth;
        const btnLeft = activeBtn.offsetLeft;
        
        // 2. Set the glow width (e.g., 70% of the button)
        const glowWidth = btnWidth * 0.7; 
        indicator.style.width = `${glowWidth}px`;

        // 3. THE CENTER LOGIC:
        // Start at button left + (half of button) - (half of glow)
        const centerPos = btnLeft + (btnWidth / 2) - (glowWidth / 2);

        indicator.style.transform = `translateX(${centerPos}px)`;
    }
};

// 1. Run on load
window.addEventListener('load', updateIndicator);

// 2. Run whenever a filter button is clicked
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // ... your existing active class toggle logic ...
        setTimeout(updateIndicator, 10); // Tiny delay ensures the 'active' class has moved
    });
});