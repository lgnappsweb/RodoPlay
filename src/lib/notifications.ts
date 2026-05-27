/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, setDoc, updateDoc, writeBatch, query, where, getDocs, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GameNotification } from '../types';

/**
 * Creates a notification in Firestore for a recipient player.
 */
export async function createNotification(
  recipientId: string,
  title: string,
  message: string,
  type: 'points' | 'patrol' | 'invite' | 'invite_declined' | 'invite_accepted' | 'system',
  senderId?: string,
  senderName?: string,
  senderAvatar?: string,
  extraData?: any
): Promise<string> {
  const notificationId = `noti_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const notiRef = doc(db, 'notifications', notificationId);

  const payload: any = {
    id: notificationId,
    recipientId,
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };

  if (senderId !== undefined) payload.senderId = senderId;
  if (senderName !== undefined) payload.senderName = senderName;
  if (senderAvatar !== undefined) payload.senderAvatar = senderAvatar;
  if (extraData !== undefined) payload.extraData = extraData;

  try {
    await setDoc(notiRef, payload);
    return notificationId;
  } catch (error) {
    console.error("Error creating notification:", error);
    return '';
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const notiRef = doc(db, 'notifications', id);
    await updateDoc(notiRef, { read: true });
  } catch (err) {
    console.warn("Failed to mark notification as read:", err);
  }
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    const notiRef = doc(db, 'notifications', id);
    await deleteDoc(notiRef);
  } catch (err) {
    console.warn("Failed to delete notification:", err);
  }
}

/**
 * Marks all notifications as read for a given user.
 */
export async function markAllNotificationsAsRead(recipientId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', recipientId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });

    await batch.commit();
  } catch (err) {
    console.warn("Failed to mark all as read:", err);
  }
}

/**
 * Clears/Deletes all notifications for a given user.
 */
export async function clearAllNotifications(recipientId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', recipientId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  } catch (err) {
    console.warn("Failed to clear notifications:", err);
  }
}

/**
 * Seeds sample historical notifications for a user based on their game record.
 * This runs if the user logs in and has no notifications yet, ensuring an immersive experience.
 */
export async function seedWelcomeNotifications(
  recipientId: string,
  displayName: string,
  gamesPlayed = 0,
  totalScore = 0
): Promise<void> {
  try {
    // Check if notifications already exist
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', recipientId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return; // Already has notifications

    // 1. Welcome system notification
    await createNotification(
      recipientId,
      "Bem-vindo(a) ao RodoPlay! 👷",
      `Olá, motorista ${displayName}! Sua central de patrulhas está pronta. Faça novos desafios lógicos e suba no ranking!`,
      "system"
    );

    // 2. Points notification if they started playing
    if (totalScore > 0) {
      await createNotification(
        recipientId,
        "Histórico de Pontos 🌟",
        `Parabéns! Você já acumula ${totalScore} pontos em sua jornada pelas vias.`,
        "points"
      );
    }

    // 3. Patrol notification if they completed any
    if (gamesPlayed > 0) {
      await createNotification(
        recipientId,
        "Patrulhas Homologadas 📋",
        `Você já inspecionou e completou ${gamesPlayed} patrulhas profissionais com sucesso.`,
        "patrol"
      );
    }

    // 4. Default mock friendly invite to show the user how invites look
    await createNotification(
      recipientId,
      "Dica do Parça do Turno 👥",
      "O motorista do turno da noite enviou uma lembrança: preste muita atenção nas placas de sinalização de obras em dias chuvosos!",
      "system",
      "mock_sender_id",
      "Carlos Silva (Turno da Noite)",
      "👷"
    );

  } catch (err) {
    console.warn("Failed to seed notifications:", err);
  }
}
