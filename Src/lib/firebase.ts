import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore instead of getFirestore to force long-polling (safer for network issues)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Connectivity diagnostic
export async function runDiagnostics() {
  const report = {
    firestore: false,
    auth: false,
    error: null as string | null
  };

  try {
    // Try reaching Firestore
    await getDocFromServer(doc(db, 'system', 'health'));
    report.firestore = true;
  } catch (e: any) {
    console.warn("Firestore Diagnostic Failed:", e.message);
  }

  try {
    // Check if auth service is reachable (non-destructive check)
    // We don't sign in here, just test initialization
    report.auth = !!auth;
  } catch (e: any) {
    report.error = e.message;
  }

  return report;
}
