import { auth, db, provider, signInWithPopup, doc, getDoc, setDoc, onAuthStateChanged } from './firebase-config.js';

const loginBtn = document.getElementById('google-login-btn');
const facultyLoginBtn = document.getElementById('faculty-login-btn');
const loginSection = document.getElementById('login-section');
const registrationSection = document.getElementById('registration-section');
const registrationForm = document.getElementById('registration-form');
const loadingIndicator = document.getElementById('loading-indicator');

let currentUser = null;
let pendingFacultyLogin = false;

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

facultyLoginBtn.addEventListener('click', () => {
    pendingFacultyLogin = true;
    handleLogin();
});

loginBtn.addEventListener('click', () => {
    pendingFacultyLogin = false;
    handleLogin();
});

async function handleLogin() {
    try {
        loginSection.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed: " + error.message);
        loginSection.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
}

async function checkUserProfile(user) {
    try {
        // If it's a faculty login, we expect a different flow, but for simplicity
        // let's just check if they are in the 'faculty' collection or if they just want to go to faculty dashboard.
        if (pendingFacultyLogin) {
            // In a real app, verify they are faculty in DB. For now, route directly.
            window.location.href = 'faculty.html';
            return;
        }

        const studentRef = doc(db, 'students', user.uid);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
            // Profile exists, go to scanner
            window.location.href = 'student.html';
        } else {
            // Show registration form
            loadingIndicator.classList.add('hidden');
            registrationSection.classList.remove('hidden');
            document.getElementById('reg-name').value = user.displayName || '';
        }
    } catch (error) {
        console.error("Error checking profile:", error);
        loadingIndicator.classList.add('hidden');
        loginSection.classList.remove('hidden');
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
        await setDoc(doc(db, 'students', currentUser.uid), {
            name: name,
            studentId: studentId,
            division: division,
            email: currentUser.email,
            createdAt: new Date()
        });
        window.location.href = 'student.html';
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Could not save profile: " + error.message);
        registrationSection.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
});
