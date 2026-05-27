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
// Initialize Firestore with a robust fallback and custom database ID.
const DATABASE_ID = "ai-studio-2463f31a-95a2-4f79-8de0-6f946503774e";

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  }, DATABASE_ID);
} catch (err) {
  console.warn("Firestore persistent multi-tab cache not supported, trying default cache:", err);
  try {
    firestoreDb = initializeFirestore(app, {}, DATABASE_ID);
  } catch (err2) {
    debugger;
    // Last resort fallback
    firestoreDb = initializeFirestore(app, {}, DATABASE_ID);
  }
}

export const db = firestoreDb;
