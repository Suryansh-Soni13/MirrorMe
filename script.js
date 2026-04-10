/** TNS Simplified SaaS Portal - Core Logic Engine **/
// Local storage falls back to Firebase via db.js

const Auth = {
    // Current session
    getUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    setUser: (user) => sessionStorage.setItem('currentUser', JSON.stringify(user)),
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },

    // Page guarding and session verification
    protect: (expectedRole) => {
        const user = Auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Standardized role grouping
        const isStaff = user.role === 'Employee' || user.role === 'Intern';
        const isAdmin = user.role === 'admin';

        if (expectedRole === 'admin' && !isAdmin) {
            window.location.href = 'employee.html';
            return;
        }

        if (expectedRole === 'staff' && isAdmin) {
            window.location.href = 'admin.html';
            return;
        }
    }
};

const UI = {
    // Shared Notifications
    toast: (message, type = 'primary') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    // Sidebar Control
    toggleSidebar: () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('active');
    },

    // Modal Handling
    openModal: (id) => {
        document.getElementById(id).style.display = 'flex';
    },
    closeModal: (id) => {
        document.getElementById(id).style.display = 'none';
    }
};

// Global click to close sidebar on mobile overlay
document.addEventListener('mousedown', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.mobile-toggle');
    if (sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
            sidebar.classList.remove('active');
        }
    }
});

// Initializer - Removed legacy storage init
