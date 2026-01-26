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