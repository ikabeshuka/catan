import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithCredential,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';

// הפרטים שהעתקת מ-Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCXt4Yi74nzJbN5KmzoOZVakWFEgt_4q0Q",
  authDomain: "catan-7b53c.web.app",
  projectId: "catan-7b53c",
  storageBucket: "catan-7b53c.firebasestorage.app",
  messagingSenderId: "220267562076",
  appId: "1:220267562076:web:dcb338df68e82610fa9299",
  measurementId: "G-2GZR1HQ27L"
};

// אתחול האפליקציה והשירותים
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as any);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// פונקציית התחברות מהירה עם Google
export const signInWithGoogle = async () => {
  const isTauri = typeof window !== 'undefined' && (
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined
  );

  if (isTauri) {
    console.log("[Auth] Opening external default system browser for Google auth via loopback...");
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "220267562076-83rhh0v44ha4b9p8i6k62154pfqlklck.apps.googleusercontent.com";
      const redirectUri = "http://localhost:12345/callback";
      
      const listenerPromise = invoke<string>('start_oauth_listener');
      
      const nonce = Math.random().toString(36).substring(2);
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${encodeURIComponent("openid profile email")}&nonce=${nonce}`;
      
      await open(googleOAuthUrl);
      
      console.log("[Auth] Waiting for credentials from local loopback listener...");
      const resultStr = await listenerPromise;
      console.log("[Auth] Credentials received successfully.");
      
      if (resultStr.startsWith("id_token:")) {
        const idToken = resultStr.substring("id_token:".length);
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        console.log("[Auth] Google loopback Sign-In successful for user:", userCredential.user?.uid);
        return userCredential.user;
      } else {
        throw new Error("Invalid credential prefix from loopback listener: " + resultStr);
      }
    } catch (err) {
      console.error("[Auth] Failed Google Loopback OAuth Flow:", err);
      throw err;
    }
  }

  // Fallback / Standard Web Browser Flow
  console.log("[Auth] Initiating Google Sign-In via popup...");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("[Auth] Google Sign-In via popup successful for user:", result.user?.uid);
    return result.user;
  } catch (error: any) {
    console.error("[Auth] Google Sign-In via popup failed:");
    console.error("[Auth] Error Code:", error?.code);
    console.error("[Auth] Error Message:", error?.message);

    const fallbackErrorCodes = [
      'auth/internal-error',
      'auth/popup-blocked',
      'auth/cancelled-popup-request'
    ];

    if (error?.code && fallbackErrorCodes.includes(error.code)) {
      console.warn(`[Auth] Fallback redirect initiated due to error ${error.code}`);
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
};

// פונקציית התנתקות
export const logoutUser = async () => {
  return await signOut(auth);
};

// הרשמה עם אימייל וסיסמה
export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Email Registration Error:", error);
    throw error;
  }
};

// התחברות עם אימייל וסיסמה
export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Email Login Error:", error);
    throw error;
  }
};