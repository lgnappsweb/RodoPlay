/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

// Load Firebase Config dynamically
let firebaseConfig = {
  apiKey: "AIzaSyBEPUFgKkligEoPVcYxiFpWxo0KG_gUxsQ",
  authDomain: "project-ecca8e56-8821-41aa-a10.firebaseapp.com",
  projectId: "project-ecca8e56-8821-41aa-a10",
  storageBucket: "project-ecca8e56-8821-41aa-a10.firebasestorage.app",
  messagingSenderId: "317368931047",
  appId: "1:317368931047:web:f10c2d2ddd9e7b1cde8842"
};

try {
  const configFile = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
  const parsedConfig = JSON.parse(configFile);
  firebaseConfig = { ...firebaseConfig, ...parsedConfig };
} catch (configErr) {
  console.warn("Could not load firebase-applet-config.json, using defaults:", configErr);
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId || "ai-studio-2463f31a-95a2-4f79-8de0-6f946503774e");

// Initialize Firebase Admin SDK for authorized backend operations (bypassing security rules and allowing secure account deleting)
let adminApp: any = null;
let adminDb: any = null;
let adminAuth: any = null;

try {
  if (admin.apps.length === 0) {
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    adminApp = admin.apps[0];
  }
  const dbId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-2463f31a-95a2-4f79-8de0-6f946503774e";
  adminDb = getAdminFirestore(adminApp, dbId);
  adminAuth = getAdminAuth(adminApp);
  console.log(`[server.ts] Firebase Admin SDK initialized successfully container-side with databaseId "${dbId}"`);
} catch (adminErr) {
  console.error("[server.ts] Warning: Firebase Admin initialization failed. Falling back to client-driven mode:", adminErr);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for complete permanent user deletion
  app.post('/api/deleteUserCompletely', async (req, res) => {
    const { uid, email } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'UID de usuário não fornecido.' });
    }

    console.log(`[VIRTUAL CLOUD FUNCTION] Iniciando exclusão administrativa do usuário UID: ${uid}, Email: ${email}`);

    // 1. Excluir credencial de autenticação do Firebase Auth de forma prioritária e independente no servidor
    let adminAuthDeleted = false;
    if (adminAuth) {
      try {
        await adminAuth.deleteUser(uid);
        console.log(`[VIRTUAL CLOUD FUNCTION] Credencial de autenticação excluída definitivamente no console de Auth para o UID: ${uid}`);
        adminAuthDeleted = true;
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`[VIRTUAL CLOUD FUNCTION] Credencial de autenticação já não existia no console de Auth para o UID: ${uid}`);
          adminAuthDeleted = true;
        } else {
          console.error(`[VIRTUAL CLOUD FUNCTION] Erro ao excluir credencial de Auth para o UID: ${uid}:`, authErr);
        }
      }
    }

    // 2. Tentar executar a purga administrativa no Firestore (se adminDb estiver presente) com isolamento de erros
    let adminDbDeleted = false;
    if (adminDb) {
      try {
        const batch = adminDb.batch();

        // Deletar documentos de perfis mestres
        batch.delete(adminDb.doc(`players/${uid}`));
        batch.delete(adminDb.doc(`users/${uid}`));
        batch.delete(adminDb.doc(`rankings/global/players/${uid}`));

        const BASE_OPTIONS = [
          'Base 01', 'Base 02', 'Base 03', 'Base 04', 'Base 05',
          'Base 06', 'Base 07', 'Base 08', 'Base 09', 'Base 10',
          'Base Adm', 'RodoPlay'
        ];
        const SHIFT_OPTIONS = [
          'Turno A', 'Turno B', 'Turno C', 'Adm', 
          'Turno A - Diurno', 'Turno B - Diurno', 'Turno C - Noturno', 'Interturno'
        ];

        const sanitizeId = (str: string) => {
          if (!str) return '';
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '_')
            .replace(/[^\w-]/g, '');
        };

        BASE_OPTIONS.forEach((item) => {
          batch.delete(adminDb.doc(`rankings/bases/all_bases/${sanitizeId(item)}/players/${uid}`));
        });
        SHIFT_OPTIONS.forEach((item) => {
          batch.delete(adminDb.doc(`rankings/turnos/all_turnos/${sanitizeId(item)}/players/${uid}`));
        });

        // Tarefas de purga com Admin SDK
        const purgeTasks = [
          async () => {
            let colRef = adminDb.collection('sessions');
            let queryRef = email 
              ? colRef.where('email', '==', email)
              : colRef.where('userId', '==', uid);
            const snap = await queryRef.get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('notifications').where('recipientId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('notifications').where('senderId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('invitations').where('senderId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('invitations').where('recipientId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('multiplayer_rooms').where('creatorId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('multiplayer_rooms').where('partnerId', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('duels').where('player1Id', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          },
          async () => {
            const snap = await adminDb.collection('duels').where('player2Id', '==', uid).get();
            snap.forEach((d: any) => batch.delete(d.ref));
          }
        ];

        // Aguardar todas as consultas de purga limitando logs de aviso por falta de permissão ou bases offline
        await Promise.all(purgeTasks.map(t => t().catch(err => {
          const errMsg = String(err?.message || err || '');
          if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("permission_denied") || errMsg.includes("insufficient permissions") || (err && (err.code === 7 || err.code === '7'))) {
            // Log amigável para ambiente de testes de visualização em conformidade com as permissões IAM do container
            console.log(`[adminDb] Purga de consulta ignorada (não-fatal): Sem permissões na sandbox para esta coleção. A purga correspondente será tratada perfeitamente via cliente.`);
          } else {
            console.warn("[adminDb] Purga ignorada (aviso não-fatal):", errMsg);
          }
        })));

        await batch.commit();
        console.log(`[VIRTUAL CLOUD FUNCTION] Purga no Firestore concluída com Admin SDK.`);
        adminDbDeleted = true;
      } catch (err: any) {
        if (err.message && err.message.includes("PERMISSION_DENIED")) {
          console.warn("[VIRTUAL CLOUD FUNCTION] Lote administrativo de escrita pulado devido a restrições IAM do service account. A purga correspondente será tratada via cliente.");
        } else {
          console.error("[VIRTUAL CLOUD FUNCTION] Erro de banco Admin:", err);
        }
      }
    }

    // 3. Purga complementar usando o Cliente Firestore interno do container (como backup assíncrono)
    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, 'players', uid));
      batch.delete(doc(db, 'users', uid));
      batch.delete(doc(db, 'rankings/global/players', uid));

      const BASE_OPTIONS = [
        'Base 01', 'Base 02', 'Base 03', 'Base 04', 'Base 05',
        'Base 06', 'Base 07', 'Base 08', 'Base 09', 'Base 10',
        'Base Adm', 'RodoPlay'
      ];
      const SHIFT_OPTIONS = [
        'Turno A', 'Turno B', 'Turno C', 'Adm', 
        'Turno A - Diurno', 'Turno B - Diurno', 'Turno C - Noturno', 'Interturno'
      ];

      const sanitizeId = (str: string) => {
        if (!str) return '';
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, '_')
          .replace(/[^\w-]/g, '');
      };

      BASE_OPTIONS.forEach((item) => {
        batch.delete(doc(db, `rankings/bases/all_bases/${sanitizeId(item)}/players`, uid));
      });
      SHIFT_OPTIONS.forEach((item) => {
        batch.delete(doc(db, `rankings/turnos/all_turnos/${sanitizeId(item)}/players`, uid));
      });

      // No container offline/stateless o cliente pode não estar logado, mas tentamos um commit best-effort
      try {
        await batch.commit();
        console.log("[VIRTUAL CLOUD FUNCTION] Confirmação best-effort do cliente no container realizada.");
      } catch (clErr) {
        // Ignorado por design - a tela correspondente do front-end fará a limpa absoluta com o token correto do usuário
      }
    } catch (fallbackErr: any) {
      console.warn("[VIRTUAL CLOUD FUNCTION] Preparação de fallback simplificado:", fallbackErr.message);
    }

    // Retorna status positivo
    return res.json({
      success: true,
      adminMode: !!(adminDb && adminAuth),
      authDeleted: adminAuthDeleted,
      dbDeleted: adminDbDeleted
    });
  });

  // API Route for Gemini (potential usage for generating new quiz questions)
  app.post('/api/gemini', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error('Gemini API error:', error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
