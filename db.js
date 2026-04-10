/**
 * =====================================================================
 *  TechNova Solutions — Firebase Firestore Compatibility Layer (db.js)
 *  Rewritten to support direct file opening (file:// protocol)
 * =====================================================================
 */

// ── 🔥 YOUR FIREBASE CONFIG ───────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyBZ-tGz_tL8xdq2dhtSil2JIrvSCS1jSl4",
    authDomain:        "technova-mirrorme.firebaseapp.com",
    projectId:         "technova-mirrorme",
    storageBucket:     "technova-mirrorme.firebasestorage.app",
    messagingSenderId: "432719917389",
    appId:             "1:432719917389:web:dd86284382b6ef84e10704"
};

// ── Initialize Firebase (Compat Mode) ─────────────────────────────────
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Global DB Object ──────────────────────────────────────────────────
window.DB = {

    // ── USERS ─────────────────────────────────────────────────────────

    async getUsers() {
        const snap = await db.collection("users").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getUserByUsername(username) {
        const snap = await db.collection("users").where("username", "==", username).get();
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
    },

    async createUser(userData) {
        await db.collection("users").doc(userData.username).set({
            ...userData,
            sessions:     userData.sessions || [],
            isWorking:    userData.isWorking || false,
            createdAt:    firebase.firestore.FieldValue.serverTimestamp()
        });
        return userData.username;
    },

    async updateUser(username, updates) {
        await db.collection("users").doc(username).update(updates);
    },

    async deleteUser(username) {
        await db.collection("users").doc(username).delete();
    },

    async initAdmin() {
        const ref = db.collection("users").doc("admin");
        const snap = await ref.get();
        if (!snap.exists) {
            await ref.set({
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

    // ── PROJECTS ──────────────────────────────────────────────────────
    async createProject(data) {
        const id = 'PRJ-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        await db.collection("projects").doc(id).set({
            id,
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return id;
    },

    async updateProject(id, data) {
        await db.collection("projects").doc(id).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async deleteProject(id) {
        await db.collection("projects").doc(id).delete();
    },

    onProjects(callback) {
        return db.collection("projects").onSnapshot(snap => {
            const projects = snap.docs.map(doc => doc.data());
            // Client-side sort for safety
            projects.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            callback(projects);
        });
    },

    // ── MESSAGES ──────────────────────────────────────────────────────

    async getMessages() {
        const snap = await db.collection("messages").orderBy("time", "asc").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async sendMessage(from, to, text) {
        await db.collection("messages").add({
            from,
            to,
            text,
            time:      new Date().toISOString(),
            seen:      false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async markSeen(recipient, sender) {
        const snap = await db.collection("messages")
            .where("to", "==", recipient)
            .where("from", "==", sender)
            .where("seen", "==", false)
            .get();
        
        const batch = db.batch();
        snap.docs.forEach(d => batch.update(d.ref, { seen: true }));
        await batch.commit();
    },

    // ── REAL-TIME LISTENERS ───────────────────────────────────────────

    onMessages(callback) {
        return db.collection("messages").onSnapshot((snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Client-side sort to ensure messages appear in order
            msgs.sort((a,b) => new Date(a.time) - new Date(b.time));
            callback(msgs);
        });
    },

    onUsers(callback) {
        return db.collection("users").onSnapshot((snap) => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(users);
        });
    }
};
