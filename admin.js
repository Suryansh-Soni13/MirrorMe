import { auth, db, signOut, doc, updateDoc, collection, getDocs } from './firebase-config.js';
import { requireRole } from './role-manager.js';

// Restrict access to admins only
requireRole('admin');

const logoutBtn = document.getElementById('logout-btn');
const usersList = document.getElementById('users-list');
const roleModal = document.getElementById('role-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');
let usersData = [];

// Navigation Logic
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active class
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.remove('active');
            l.style.color = '#5f6368';
            l.style.fontWeight = 'normal';
        });
        e.target.classList.add('active');
        e.target.style.color = 'var(--primary)';
        e.target.style.fontWeight = '500';

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
        
        // Show target
        const targetId = e.target.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        loadUsers();
    }
});

async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        usersData = [];
        querySnapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() });
        });
        renderUsers(usersData);
    } catch(e) {
        console.error("Error loading users", e);
        usersList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Failed to load users. Are you an admin?</td></tr>';
    }
}

function renderUsers(users) {
    usersList.innerHTML = '';
    
    if(users.length === 0) {
        usersList.innerHTML = '<tr><td colspan="4" style="text-align: center;">No users found.</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        
        const roleBadgeColor = u.role === 'admin' ? '#fce8e6' : (u.role === 'faculty' ? '#e8f0fe' : '#e6f4ea');
        const roleTextColor = u.role === 'admin' ? '#c5221f' : (u.role === 'faculty' ? '#1967d2' : '#137333');

        tr.innerHTML = `
            <td style="font-weight: 500;">${u.name || 'Unnamed'}</td>
            <td>${u.email || '-'}</td>
            <td><span style="background: ${roleBadgeColor}; color: ${roleTextColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; font-weight: bold;">${u.role || 'student'}</span></td>
            <td>
                <button class="secondary-btn edit-role-btn" data-id="${u.id}" data-name="${u.name}" data-role="${u.role || 'student'}" style="width: auto; padding: 4px 8px; font-size: 12px; margin: 0;">Edit Role</button>
            </td>
        `;
        usersList.appendChild(tr);
    });

    // Attach event listeners to new buttons
    document.querySelectorAll('.edit-role-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uid = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const role = e.target.getAttribute('data-role');
            
            document.getElementById('modal-user-id').value = uid;
            document.getElementById('modal-user-name').innerText = name;
            document.getElementById('modal-role-select').value = role;
            
            // Show modal (remove hidden and override display style for flex)
            roleModal.classList.remove('hidden');
        });
    });
}

modalCancel.addEventListener('click', () => {
    roleModal.classList.add('hidden');
});

modalSave.addEventListener('click', async () => {
    const uid = document.getElementById('modal-user-id').value;
    const newRole = document.getElementById('modal-role-select').value;
    
    modalSave.innerText = "Saving...";
    modalSave.disabled = true;

    try {
        await updateDoc(doc(db, 'users', uid), {
            role: newRole
        });
        
        alert("Role updated successfully!");
        roleModal.classList.add('hidden');
        loadUsers(); // Refresh the list
    } catch (e) {
        console.error("Error updating role", e);
        alert("Failed to update role. Ensure you have admin privileges in Firestore rules.");
    } finally {
        modalSave.innerText = "Save Changes";
        modalSave.disabled = false;
    }
});

// Simple client-side search
document.getElementById('user-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = usersData.filter(u => 
        (u.name && u.name.toLowerCase().includes(query)) || 
        (u.email && u.email.toLowerCase().includes(query))
    );
    renderUsers(filtered);
});
