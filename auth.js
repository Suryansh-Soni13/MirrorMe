import { auth, db, provider, signInWithPopup, doc, getDoc, setDoc, onAuthStateChanged, serverTimestamp } from './firebase-config.js';
import { getUserRole } from './role-manager.js';

const loginBtn = document.getElementById('google-login-btn');
const facultyLoginBtn = document.getElementById('faculty-login-btn');
const adminLoginBtn = document.getElementById('admin-login-btn'); // Optional, if we add it
const loginSection = document.getElementById('login-section');
const registrationSection = document.getElementById('registration-section');
const registrationForm = document.getElementById('registration-form');
const loadingIndicator = document.getElementById('loading-indicator');

let currentUser = null;

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        checkUserProfile(user);
    } else {
        loginSection.classList.remove('hidden');
        registrationSection.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
    }
});

if (facultyLoginBtn) {
    facultyLoginBtn.addEventListener('click', () => {
        handleLogin();
    });
}

if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
        handleLogin();
    });
}

loginBtn.addEventListener('click', () => {
    handleLogin();
});

async function handleLogin() {
    try {
        loginSection.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("Login failed: " + error.message);
        }
        loginSection.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
}

async function checkUserProfile(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // Profile exists, route based on actual database role
            const role = userSnap.data().role || 'student';
            routeUser(role);
        } else {
            // Check legacy 'students' collection for backward compatibility
            const legacyRef = doc(db, 'students', user.uid);
            const legacySnap = await getDoc(legacyRef);
            
            if (legacySnap.exists()) {
                // Migrate legacy student to new users collection
                const data = legacySnap.data();
                await setDoc(userRef, {
                    ...data,
                    role: 'student' // Force role to student
                });
                routeUser('student');
            } else {
                // Show registration form for new students
                loadingIndicator.classList.add('hidden');
                registrationSection.classList.remove('hidden');
                document.getElementById('reg-name').value = user.displayName || '';
            }
        }
    } catch (error) {
        console.error("Error checking profile:", error);
        loadingIndicator.classList.add('hidden');
        loginSection.classList.remove('hidden');
    }
}

function routeUser(role) {
    if (role === 'faculty') {
        window.location.href = 'faculty.html';
    } else if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'student.html';
    }
}

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    loadingIndicator.classList.remove('hidden');
    registrationSection.classList.add('hidden');

    const name = document.getElementById('reg-name').value;
    const studentId = document.getElementById('reg-student-id').value;
    const division = document.getElementById('reg-division').value;

    try {
        // Create in 'users' collection instead of 'students'
        await setDoc(doc(db, 'users', currentUser.uid), {
            name: name,
            studentId: studentId,
            division: division,
            email: currentUser.email,
            role: 'student', // explicitly set role to student
            createdAt: serverTimestamp()
        });
        window.location.href = 'student.html';
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Could not save profile: " + error.message);
        registrationSection.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
});
