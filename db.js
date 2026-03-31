/**
 * =====================================================================
 *  TechNova Solutions — Firebase Firestore Database Layer (db.js)
 *  All platform data is stored in the cloud via Firebase Firestore.
 *  Collections:
 *    • users     → All user accounts (admin + employees)
 *    • messages  → All chat messages
 * =====================================================================
 */

// ── Firebase SDK (v9 compat mode — works with plain HTML/JS) ─────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── 🔥 YOUR FIREBASE CONFIG ───────────────────────────────────────────
// Replace the values below with your own Firebase project credentials.
// Go to: https://console.firebase.google.com → Your Project → Project Settings → Your Apps → Web App
const firebaseConfig = {
    apiKey:            "AIzaSyBZ-tGz_tL8xdq2dhtSil2JIrvSCS1jSl4",
    authDomain:        "technova-mirrorme.firebaseapp.com",
    projectId:         "technova-mirrorme",
    storageBucket:     "technova-mirrorme.firebasestorage.app",
    messagingSenderId: "432719917389",
    appId:             "1:432719917389:web:dd86284382b6ef84e10704"
};

// ── Initialize ────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Collection References ─────────────────────────────────────────────
const usersCol    = collection(db, "users");
const messagesCol = collection(db, "messages");

// ═════════════════════════════════════════════════════════════════════
//  DB — Public API
// ═════════════════════════════════════════════════════════════════════
export const DB = {

    // ── USERS ─────────────────────────────────────────────────────────

    /** Fetch all users as an array */
    async getUsers() {
        const snap = await getDocs(usersCol);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Fetch a single user by username field */
    async getUserByUsername(username) {
        const q    = query(usersCol, where("username", "==", username));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
    },

    /** Create a new user. Returns the new doc ID. */
    async createUser(userData) {
        // Use username as the document ID for easy lookup
        const ref = doc(usersCol, userData.username);
        await setDoc(ref, {
            ...userData,
            sessions:     userData.sessions     || [],
            isWorking:    userData.isWorking     || false,
            createdAt:    serverTimestamp()
        });
        return userData.username;
    },

    /** Update fields on an existing user (by username) */
    async updateUser(username, updates) {
        const ref = doc(usersCol, username);
        await updateDoc(ref, updates);
    },

    /** Delete a user by username */
    async deleteUser(username) {
        const ref = doc(usersCol, username);
        await deleteDoc(ref);
    },

    /** Ensure the default admin account exists */
    async initAdmin() {
        const ref  = doc(usersCol, "admin");
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                id:        "ADM-001",
                username:  "admin",
                password:  "admin123",
                name:      "Principal Admin",
                role:      "admin",
                status:    "active",
                sessions:  [],
                isWorking: false,
                joinedAt:  new Date().toISOString()
            });
            console.log("[DB] Default admin account created.");
        }
    },

    // ── MESSAGES ──────────────────────────────────────────────────────

    /** Fetch all messages ordered by time */
    async getMessages() {
        const q    = query(messagesCol, orderBy("time", "asc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Send a new message */
    async sendMessage(from, to, text) {
        await addDoc(messagesCol, {
            from,
            to,
            text,
            time:      new Date().toISOString(),
            seen:      false,
            createdAt: serverTimestamp()
        });
    },

    /** Mark messages as seen (to = recipient, from = sender) */
    async markSeen(recipient, sender) {
        const q    = query(messagesCol, where("to", "==", recipient), where("from", "==", sender), where("seen", "==", false));
        const snap = await getDocs(q);
        const updates = snap.docs.map(d => updateDoc(d.ref, { seen: true }));
        await Promise.all(updates);
    },

    // ── REAL-TIME LISTENERS ───────────────────────────────────────────

    /**
     * Subscribe to real-time message updates.
     * @param {Function} callback — called with the full messages array on every change
     * @returns {Function} unsubscribe function
     */
    onMessages(callback) {
        const q = query(messagesCol, orderBy("time", "asc"));
        return onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(msgs);
        });
    },

    /**
     * Subscribe to real-time user updates.
     * @param {Function} callback — called with the full users array on every change
     * @returns {Function} unsubscribe function
     */
    onUsers(callback) {
        return onSnapshot(usersCol, (snap) => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(users);
        });
    }
};
