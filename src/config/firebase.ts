import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase - GANTI dengan konfigurasi project Anda
const firebaseConfig = {
    apiKey: "AIzaSyDWRZ7yQV0l-IvcmBrkZMARrc1naxJgzgk",
  authDomain: "bayan-doorprize.firebaseapp.com",
  projectId: "bayan-doorprize",
  storageBucket: "bayan-doorprize.firebasestorage.app",
  messagingSenderId: "479004864368",
  appId: "1:479004864368:web:fb65c95b4cb697540869b5",
  measurementId: "G-3MXKJ6C2W5"
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