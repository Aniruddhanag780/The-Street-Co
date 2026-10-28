// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

// Your web app's Firebase configuration (used strictly for User Authentication & Login Details)
const firebaseConfig = {
  apiKey: "AIzaSyCYBwxhnKg62a08876TMo1Edd45OY5-o40",
  authDomain: "the-street-co-780.firebaseapp.com",
  projectId: "the-street-co-780",
  storageBucket: "the-street-co-780.firebasestorage.app",
  messagingSenderId: "463701933718",
  appId: "1:463701933718:web:f0a25125ff8907ce6d0cb7"
};

const FIRESTORE_DATABASE_ID = "ai-studio-thestreetco-0e2c783d-7cbc-4f92-8cbb-2ec9883cbcca";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

// Ensure a deterministic Firebase Auth session for the OTP-verified phone/email user
async function ensureFirebaseAuthSession(cleanPhone, firstName, lastName, verifiedEmail) {
  if (!cleanPhone || cleanPhone.length !== 10) return null;

  const syntheticEmail = `phone_${cleanPhone}@auth.thestreetco.in`;
  const syntheticPass = `StreetCoAuth#${cleanPhone}!780`;
  const displayLabel = [firstName, lastName].filter(Boolean).join(" ").trim() || `+91 ${cleanPhone}`;

  try {
    let user = auth.currentUser;
    if (!user) {
      try {
        const cred = await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
        user = cred.user;
      } catch (signInErr) {
        if (
          signInErr.code === "auth/user-not-found" ||
          signInErr.code === "auth/invalid-credential" ||
          signInErr.code === "auth/invalid-login-credentials"
        ) {
          try {
            const created = await createUserWithEmailAndPassword(auth, syntheticEmail, syntheticPass);
            user = created.user;
          } catch (_) {
            // Fallback to anonymous auth if Email/Password provider is not enabled in console
            const anon = await signInAnonymously(auth);
            user = anon.user;
          }
        } else {
          try {
            const anon = await signInAnonymously(auth);
            user = anon.user;
          } catch (_) {}
        }
      }
    }

    if (user) {
      try {
        await updateProfile(user, { displayName: displayLabel });
      } catch (_) {}
    }
    return user;
  } catch (_) {
    return auth.currentUser || null;
  }
}

// Save User Login & Authentication Details to Firebase
async function saveUserAuthDetails(details = {}) {
  const cleanPhone = String(details.phone || "").replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error("A valid 10-digit verified mobile number is required.");
  }

  const firstName = String(details.firstName || "").trim().slice(0, 80);
  const lastName = String(details.lastName || "").trim().slice(0, 80);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim().slice(0, 165);
  const email = String(details.email || "").trim().toLowerCase().slice(0, 160);
  const emailVerified = Boolean(details.emailVerified && email);
  const phoneVerified = details.phoneVerified !== undefined ? Boolean(details.phoneVerified) : true;
  const nowIso = new Date().toISOString();

  const authUser = await ensureFirebaseAuthSession(cleanPhone, firstName, lastName, emailVerified ? email : "");

  // Fetch existing record first so we preserve fields when doing partial updates (e.g. phone login vs profile save)
  let existingData = {};
  try {
    const userDocRef = doc(db, "users", cleanPhone);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      existingData = snap.data() || {};
    }
  } catch (_) {}

  const mergedFirstName = firstName || String(existingData.firstName || "").trim().slice(0, 80);
  const mergedLastName = lastName || String(existingData.lastName || "").trim().slice(0, 80);
  const mergedFullName = [mergedFirstName, mergedLastName].filter(Boolean).join(" ").trim().slice(0, 165);
  const mergedEmail = email || String(existingData.email || "").trim().toLowerCase().slice(0, 160);
  const mergedEmailVerified = email
    ? emailVerified
    : Boolean(existingData.emailVerified && mergedEmail);

  const payload = {
    phone: cleanPhone,
    phoneWithCountryCode: `+91 ${cleanPhone}`,
    phoneVerified,
    firstName: mergedFirstName,
    lastName: mergedLastName,
    fullName: mergedFullName,
    email: mergedEmail,
    emailVerified: mergedEmailVerified,
    firebaseUid: String((authUser && authUser.uid) || existingData.firebaseUid || "").slice(0, 128),
    lastLoginAt: String(details.lastLoginAt || existingData.lastLoginAt || nowIso).slice(0, 64),
    updatedAt: nowIso
  };

  const userDocRef = doc(db, "users", cleanPhone);
  await setDoc(userDocRef, payload, { merge: true });

  return payload;
}

// Load User Login & Authentication Details from Firebase by 10-digit phone number
async function loadUserAuthDetails(phone) {
  const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) return null;

  const userDocRef = doc(db, "users", cleanPhone);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) return null;

  return snap.data() || null;
}

// Sign out current Firebase Auth session
async function signOutUserAuth() {
  try {
    await signOut(auth);
  } catch (_) {}
}

onAuthStateChanged(auth, () => {
  // Auth state listener active for session persistence
});

window.streetCoFirebaseAuth = {
  app,
  auth,
  db,
  saveUserAuthDetails,
  loadUserAuthDetails,
  signOutUserAuth
};

window.dispatchEvent(new CustomEvent("streetco:firebase-auth-ready"));
