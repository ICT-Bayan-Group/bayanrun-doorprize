import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase - GANTI dengan konfigurasi project Anda
const firebaseConfig = {
    apiKey: "AIzaSyDv1b38emmhQvBPO1d7wkcnODpzW_fZ5-Q",
  authDomain: "bayan-doorprize-5ae13.firebaseapp.com",
  projectId: "bayan-doorprize-5ae13",
  storageBucket: "bayan-doorprize-5ae13.firebasestorage.app",
  messagingSenderId: "1030214269167",
  appId: "1:1030214269167:web:2ca4c65bed4774c32b431a",
  measurementId: "G-LK22F88TZ3"
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