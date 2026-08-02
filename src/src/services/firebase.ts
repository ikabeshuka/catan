import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// הפרטים שהעתקת מ-Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCXt4Yi74nzJbN5KmzoOZVakWFEgt_4q0Q",
  authDomain: "catan-7b53c.firebaseapp.com",
  projectId: "catan-7b53c",
  storageBucket: "catan-7b53c.firebasestorage.app",
  messagingSenderId: "220267562076",
  appId: "1:220267562076:web:dcb338df68e82610fa9299",
  measurementId: "G-2GZR1HQ27L"
};


// אתחול האפליקציה והשירותים
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// פונקציית התחברות מהירה עם Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

// פונקציית התנתקות
export const logoutUser = async () => {
  return await signOut(auth);
};