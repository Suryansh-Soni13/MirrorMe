// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiOs404tQShWeQp_G4nilPX4-7AqLZ9c8",
    authDomain: "attendance-system-18399.firebaseapp.com",
    projectId: "attendance-system-18399",
    storageBucket: "attendance-system-18399.firebasestorage.app",
    messagingSenderId: "562257151023",
    appId: "1:562257151023:web:7f58656b957f37d9ba32da",
    measurementId: "G-6NC2N4PS7D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp };
