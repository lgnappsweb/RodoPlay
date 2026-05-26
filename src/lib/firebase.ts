/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEPUFgKkligEoPVcYxiFpWxo0KG_gUxsQ",
  authDomain: "project-ecca8e56-8821-41aa-a10.firebaseapp.com",
  projectId: "project-ecca8e56-8821-41aa-a10",
  storageBucket: "project-ecca8e56-8821-41aa-a10.firebasestorage.app",
  messagingSenderId: "317368931047",
  appId: "1:317368931047:web:f10c2d2ddd9e7b1cde8842"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Initialize Firestore with a robust fallback.
// In iframe/private/mobile environments where IndexedDB or multi-tab locks are restricted,
// persistentLocalCache can throw or deadlock, cause the client to think it is permanently offline.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (err) {
  console.warn("Firestore persistent multi-tab cache not supported, trying default cache:", err);
  try {
    firestoreDb = initializeFirestore(app, {});
  } catch (err2) {
    debugger;
    // Last resort fallback
    import('firebase/firestore').then(({ memoryLocalCache }) => {
      // Lazy load/retry if needed, but since we imported initialization, let's just use defaults
    });
    firestoreDb = initializeFirestore(app, {});
  }
}

export const db = firestoreDb;
