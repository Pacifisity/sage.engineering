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