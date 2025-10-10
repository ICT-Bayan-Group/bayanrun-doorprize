import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase - GANTI dengan konfigurasi project Anda
const firebaseConfig = {
  apiKey: "AIzaSyA7vwb5n2HO_uSEwDwr4GjnRZeiWmY4pm4",
  authDomain: "doorprize-production.firebaseapp.com",
  projectId: "doorprize-production",
  storageBucket: "doorprize-production.firebasestorage.app",
  messagingSenderId: "754462204445",
  appId: "1:754462204445:web:df6392428509aea0025cf4",
  measurementId: "G-9VDC4929LD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Untuk development, uncomment baris berikut jika menggunakan emulator
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app;