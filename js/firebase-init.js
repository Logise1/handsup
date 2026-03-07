// Firebase initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot, writeBatch, arrayUnion, arrayRemove, increment } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCB_RiTV17ouLpPylMQs1kW_ayDqYoZKUE",
    authDomain: "jumper-4e0b2.firebaseapp.com",
    projectId: "jumper-4e0b2",
    storageBucket: "jumper-4e0b2.firebasestorage.app",
    messagingSenderId: "397169417542",
    appId: "1:397169417542:web:305312904eeadcd579d947",
    measurementId: "G-BBBHJ2T8XL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    app, auth, db,
    onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile,
    collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp, onSnapshot, writeBatch, arrayUnion, arrayRemove, increment
};
