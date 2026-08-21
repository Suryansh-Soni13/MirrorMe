import { auth, db, doc, getDoc, onAuthStateChanged } from './firebase-config.js';

/**
 * Validates the user's role from the Firestore `users` collection.
 * If no profile exists, defaults to 'student'.
 * 
 * @param {string} uid User ID
 * @returns {Promise<string>} Role (e.g. 'student', 'faculty', 'admin')
 */
export async function getUserRole(uid) {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return userSnap.data().role || 'student';
        }
        return 'student'; // Default role for new users
    } catch (error) {
        console.error("Error fetching user role:", error);
        return 'student'; // Fallback
    }
}

/**
 * Checks if the user is authorized to access the current page,
 * and redirects them if they are not.
 * 
 * @param {string} requiredRole The role required for the current page
 */
export function requireRole(requiredRole) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in
            window.location.href = 'index.html';
            return;
        }

        const actualRole = await getUserRole(user.uid);
        
        if (requiredRole === 'faculty' && actualRole !== 'faculty' && actualRole !== 'admin') {
            alert("Unauthorized. You do not have faculty permissions.");
            window.location.href = 'student.html';
            return;
        }

        if (requiredRole === 'admin' && actualRole !== 'admin') {
            alert("Unauthorized. You do not have admin permissions.");
            window.location.href = 'student.html';
            return;
        }
    });
}
