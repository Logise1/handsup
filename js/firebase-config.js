// ============================================
// HandsUp — Firebase Configuration
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCB_RiTV17ouLpPylMQs1kW_ayDqYoZKUE",
  authDomain: "jumper-4e0b2.firebaseapp.com",
  projectId: "jumper-4e0b2",
  storageBucket: "jumper-4e0b2.firebasestorage.app",
  messagingSenderId: "397169417542",
  appId: "1:397169417542:web:305312904eeadcd579d947",
  measurementId: "G-BBBHJ2T8XL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable persistence
db.enablePersistence().catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available');
  }
});

console.log('🔥 Firebase initialized');
