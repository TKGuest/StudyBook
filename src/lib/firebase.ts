import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// Safely load firebase config file if present
let firebaseConfigFile: Record<string, any> = {};
try {
  const configs = import.meta.glob(['/firebase-applet-config.json', '../../firebase-applet-config.json', '../firebase-applet-config.json', './firebase-applet-config.json'], { eager: true });
  for (const key in configs) {
    const mod = configs[key] as any;
    const configObj = mod?.default || mod;
    if (configObj && typeof configObj === 'object' && (configObj.apiKey || configObj.projectId)) {
      firebaseConfigFile = configObj;
      break;
    }
  }
} catch (e) {
  console.warn('Could not load firebase-applet-config.json:', e);
}

const isValidVal = (val?: string, isApiKey?: boolean): boolean => {
  if (!val || typeof val !== 'string' || val.trim() === '') return false;
  const lower = val.toLowerCase();
  if (lower.includes('remixed-') || lower.includes('mock-') || lower.includes('your-') || lower.includes('your_') || lower === 'undefined' || lower === 'null') {
    return false;
  }
  if (isApiKey && !val.startsWith('AIza')) {
    return false;
  }
  return true;
};

const getVal = (fileVal?: string, envVal?: string, defaultVal?: string, isApiKey?: boolean) => {
  if (isValidVal(fileVal, isApiKey)) {
    return fileVal;
  }
  if (isValidVal(envVal, isApiKey)) {
    return envVal;
  }
  return defaultVal;
};

const firebaseConfig = {
  apiKey: getVal(firebaseConfigFile?.apiKey, import.meta.env.VITE_FIREBASE_API_KEY, "", true),
  authDomain: getVal(firebaseConfigFile?.authDomain, import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "studybook-74afb.firebaseapp.com"),
  projectId: getVal(firebaseConfigFile?.projectId, import.meta.env.VITE_FIREBASE_PROJECT_ID, "studybook-74afb"),
  storageBucket: getVal(firebaseConfigFile?.storageBucket, import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "studybook-74afb.firebasestorage.app"),
  messagingSenderId: getVal(firebaseConfigFile?.messagingSenderId, import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "320992969535"),
  appId: getVal(firebaseConfigFile?.appId, import.meta.env.VITE_FIREBASE_APP_ID, "1:320992969535:web:5619bedbd32a828409c98a"),
  measurementId: getVal(firebaseConfigFile?.measurementId, import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-X3WT8ZFR9G"),
  firestoreDatabaseId: getVal(firebaseConfigFile?.firestoreDatabaseId, import.meta.env.VITE_FIREBASE_DATABASE_ID, undefined),
};

// Check if we have minimum configuration to avoid runtime crashes
export const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && firebaseConfig.apiKey.startsWith('AIza');

if (!isFirebaseConfigured) {
  console.warn(
    '[Firebase] Firebase keys are missing or incomplete. Linking with Firebase project.'
  );
}

// Clean up stale or invalid Firebase app instances during HMR or config updates
if (getApps().length > 0) {
  const existingApp = getApp();
  if (!existingApp.options.apiKey || !existingApp.options.apiKey.startsWith('AIza') || existingApp.options.apiKey !== firebaseConfig.apiKey) {
    try {
      deleteApp(existingApp);
    } catch (err) {
      console.warn('Failed to delete stale Firebase app:', err);
    }
  }
}

// Initialize Firebase App
const app = !getApps().length 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Initialize Firestore & Auth services with specific database ID if specified
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export default app;
