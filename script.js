// Form Interaction
const handleNewsletter = () => {
    const form = document.getElementById('newsletter-form');
    const message = document.getElementById('form-message');
    const emailInput = document.getElementById('user-email');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;

        // Simulate API call
        message.classList.remove('hidden');
        message.innerText = 'Transmitting email to our high-speed servers...';
        message.className = 'success';

        setTimeout(() => {
            message.innerText = `Success! ${email} has been added to our priority list.`;
            emailInput.value = '';
            
            const actionBox = document.querySelector('.action-box');
            actionBox.style.transform = 'scale(1.02)';
            setTimeout(() => actionBox.style.transform = 'scale(1)', 200);
        }, 1500);
    });
};

// Interactive Hover Effects
const initInteractions = () => {
    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;
        
        const overlay = document.querySelector('.background-overlay');
        if (overlay) overlay.style.transform = `translate(${x}px, ${y}px)`;
    });
};

// Particle Background System
const createParticles = () => {
    const overlay = document.querySelector('.background-overlay');
    if (!overlay) return;
    
    const particleCount = 40;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 20;
        const duration = Math.random() * 20 + 10;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: var(--primary);
            opacity: ${Math.random() * 0.3 + 0.1};
            border-radius: 50%;
            top: ${posY}%;
            left: ${posX}%;
            filter: blur(1px);
            animation: float ${duration}s linear infinite;
            animation-delay: -${delay}s;
            pointer-events: none;
        `;
        
        overlay.appendChild(particle);
    }
};

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    handleNewsletter();
    initInteractions();
    createParticles();
    
    console.log('TechNova Solutions - System Ready.');
});
