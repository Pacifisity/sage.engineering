// Dimension Navigation with Teleportation Effects
document.addEventListener('DOMContentLoaded', function() {
  const portalButtons = document.querySelectorAll('.portal-btn');
  const dimensions = document.querySelectorAll('.dimension');

  // Add click event to portal buttons
  portalButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      teleportToDimension(targetId);
    });
  });

  function teleportToDimension(targetId) {
    // Hide all dimensions
    dimensions.forEach(dimension => {
      dimension.classList.remove('active');
    });

    // Show target dimension with teleport effect
    const targetDimension = document.getElementById(targetId);
    if (targetDimension) {
      // Small delay for smoother transition
      setTimeout(() => {
        targetDimension.classList.add('active');
        
        // Scroll to top smoothly
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  // Add click ripple effect
  document.addEventListener('click', (e) => {
    createClickRipple(e.clientX, e.clientY);
  });

  function createClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.style.position = 'fixed';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.width = '0px';
    ripple.style.height = '0px';
    ripple.style.border = '2px solid #c77dff';
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.pointerEvents = 'none';
    ripple.style.zIndex = '9999';
    ripple.style.opacity = '1';
    
    document.body.appendChild(ripple);
    
    let size = 0;
    let opacity = 1;
    
    function animate() {
      size += 4;
      opacity -= 0.02;
      
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.opacity = opacity;
      
      if (opacity > 0 && size < 100) {
        requestAnimationFrame(animate);
      } else {
        ripple.remove();
      }
    }
    
    animate();
  }

  // Add glitch effect on heading hover
  const glitchHeadings = document.querySelectorAll('.glitch');
  
  glitchHeadings.forEach(heading => {
    heading.addEventListener('mouseenter', () => {
      heading.style.animation = 'glitchFlicker 0.3s ease';
    });
    
    heading.addEventListener('animationend', () => {
      heading.style.animation = 'glitchFlicker 5s infinite';
    });
  });

  // Rift background parallax effect
  document.addEventListener('mousemove', (e) => {
    const rifts = document.querySelectorAll('.rift');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    rifts.forEach((rift, index) => {
      const speed = (index + 1) * 20;
      const x = (mouseX - 0.5) * speed;
      const y = (mouseY - 0.5) * speed;
      
      rift.style.transform = `translate(${x}px, ${y}px)`;
    });
  });

  // Add entrance animation to skill portals
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '0';
        entry.target.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
          entry.target.style.transition = 'all 0.6s ease';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'scale(1)';
        }, 100);
        
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.skill-portal, .project-portal').forEach(element => {
    observer.observe(element);
  });
});
