/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  collection, 
  query, 
  where, 
  getDocs,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Player } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles Firestore security and execution errors by formatting them into 
 * standard JSON to satisfy Firebase Integration Skill specifications.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Normalizes and sanitizes string option values (e.g., base, shift) 
 * for safe firestore collection/document path ids.
 * E.g., "Base 01" -> "base_01", "Praça 01" -> "praca_01", "Turno A - Diurno" -> "turno_a_diurno"
 */
export function sanitizeId(val: string): string {
  if (!val) return 'default';
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

/**
 * Synchronizes player profile dynamically across:
 * 1. players/{uid} (backwards compatibility)
 * 2. users/{uid} (mandatory users collection)
 * 3. rankings/global/{uid} (mandatory real-time global leaderboard collection)
 * 4. rankings/bases/{baseId}/players/{uid} (mandatory base leaderboard collection)
 * 5. rankings/turnos/{turnoId}/players/{uid} (mandatory shift leaderboard collection)
 * 
 * Includes transition logic to prune old base/shift records if base or shift is edited.
 */
export async function writePlayerProfile(uid: string, data: Partial<Player>): Promise<void> {
  const playersPath = `players/${uid}`;
  try {
    // 1. Fetch current existing state to perform relational consistency
    const playerRef = doc(db, 'players', uid);
    let existingProfile: any = null;
    try {
      const snap = await getDoc(playerRef);
      if (snap.exists()) {
        existingProfile = snap.data();
      }
    } catch (e) {
      console.warn("Could not retrieve current player document, continuing with merge: ", e);
    }

    // Determine current values merging existing and updated
    const displayName = data.displayName || existingProfile?.displayName || auth.currentUser?.displayName || 'Anon';
    const email = data.email || existingProfile?.email || auth.currentUser?.email || '';
    const avatar = data.avatar || existingProfile?.avatar || '👷';
    const base = data.base || existingProfile?.base || 'Base 01';
    const shift = data.shift || existingProfile?.shift || 'Turno A - Diurno';
    const praca = (data as any).praca || existingProfile?.praca || (data as any).praça || existingProfile?.praça || 'Praça 01';
    
    // Performance and progression scores
    const xp = data.xp !== undefined ? data.xp : (existingProfile?.xp || 0);
    const level = data.level !== undefined ? data.level : (existingProfile?.level || 1);
    
    const gameStats = data.gameStats !== undefined ? data.gameStats : (existingProfile?.gameStats || {});
    
    // Auto-heal/sum scores & completions to ensure no individual games points are ever lost
    let statsScoreSum = 0;
    let statsGamesSum = 0;
    if (gameStats && typeof gameStats === 'object') {
      Object.values(gameStats).forEach((stat: any) => {
        if (stat && typeof stat === 'object') {
          const sc = stat.score !== undefined ? Number(stat.score) : (stat.pontos !== undefined ? Number(stat.pontos) : 0);
          const comp = stat.completions !== undefined ? Number(stat.completions) : (stat.patrulhas !== undefined ? Number(stat.patrulhas) : 0);
          statsScoreSum += sc;
          statsGamesSum += comp;
        }
      });
    }

    // Support mapped aliases & enforce strict auto-healing sum validation checks
    const rawTotalScore = data.totalScore !== undefined ? data.totalScore : (existingProfile?.totalScore || existingProfile?.pontos || 0);
    const totalScore = Math.max(Number(rawTotalScore), statsScoreSum);

    const rawGamesPlayed = data.gamesPlayed !== undefined ? data.gamesPlayed : (existingProfile?.gamesPlayed || existingProfile?.patrulhas || 0);
    const gamesPlayed = Math.max(Number(rawGamesPlayed), statsGamesSum);

    const completedGames = data.completedGames !== undefined ? data.completedGames : (existingProfile?.completedGames || existingProfile?.partidas || 0);
    const victories = data.victories !== undefined ? data.victories : (existingProfile?.victories || existingProfile?.vitorias || 0);
    const defeats = data.defeats !== undefined ? data.defeats : (existingProfile?.defeats || existingProfile?.derrotas || 0);
    
    const online = (data as any).online !== undefined ? (data as any).online : (data.status === 'online' || existingProfile?.status === 'online' || existingProfile?.online || false);
    const status = online ? 'online' : 'offline';

    const createdAt = existingProfile?.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    // 2. Compute dynamic actual rank counting players who have better score
    let rankingGlobal = existingProfile?.rankingGlobal || 1;
    let rankingBase = existingProfile?.rankingBase || 1;
    let rankingTurno = existingProfile?.rankingTurno || 1;

    // Only compute ranks if user actually has points to optimize signup and zero-point profiles
    if (totalScore > 0) {
      try {
        const usersCol = collection(db, 'users');
        // Count query (fast & cheap server side)
        const qGlobal = query(usersCol, where('pontos', '>', totalScore));
        const qBase = query(usersCol, where('base', '==', base), where('pontos', '>', totalScore));
        const qTurno = query(usersCol, where('turno', '==', shift), where('pontos', '>', totalScore));

        const [globalSnap, baseSnap, shiftSnap] = await Promise.all([
          getCountFromServer(qGlobal).catch(() => null),
          getCountFromServer(qBase).catch(() => null),
          getCountFromServer(qTurno).catch(() => null)
        ]);

        if (globalSnap) rankingGlobal = globalSnap.data().count + 1;
        if (baseSnap) rankingBase = baseSnap.data().count + 1;
        if (shiftSnap) rankingTurno = shiftSnap.data().count + 1;
      } catch (errRank) {
        console.warn("Failed to compute real-time rank count:", errRank);
      }
    }

    // Build perfect composite structures
    const mergedPlayer = {
      ...existingProfile,
      ...data,
      uid,
      displayName,
      apelido: displayName, // exact alias
      email,
      avatar,
      base,
      shift,
      turno: shift, // exact alias
      praca,
      praça: praca,
      xp,
      level,
      nivel: level, // exact alias
      totalScore,
      pontos: totalScore, // exact alias
      gamesPlayed,
      patrulhas: gamesPlayed, // exact alias
      completedGames,
      partidas: completedGames, // exact alias
      victories,
      vitorias: victories, // exact alias
      defeats,
      derrotas: defeats, // exact alias
      gameStats, // explicit key
      online,
      status, // exact alias
      rankingGlobal,
      rankingBase,
      rankingTurno,
      createdAt,
      updatedAt
    };

    const batch = writeBatch(db);

    // 1. Write players/{uid}
    batch.set(doc(db, 'players', uid), mergedPlayer);

    // 2. Write users/{uid}
    batch.set(doc(db, 'users', uid), mergedPlayer);

    // 3. Write rankings/global/{uid}
    const globalRankObj = {
      uid,
      apelido: displayName,
      avatar,
      base,
      turno: shift,
      praca,
      praça: praca,
      pontos: totalScore,
      patrulhas: gamesPlayed,
      partidas: completedGames,
      vitorias: victories,
      derrotas: defeats,
      nivel: level,
      scoreTotal: totalScore,
      gameStats,
      updatedAt
    };
    batch.set(doc(db, 'rankings/global/players', uid), globalRankObj);

    // 4. Handle base transfer (transition delete old, write new)
    const sanitizedBaseId = sanitizeId(base);
    const sanitizedOldBaseId = existingProfile?.base ? sanitizeId(existingProfile.base) : null;
    if (sanitizedOldBaseId && sanitizedOldBaseId !== sanitizedBaseId) {
      batch.delete(doc(db, `rankings/bases/all_bases/${sanitizedOldBaseId}/players`, uid));
    }
    batch.set(doc(db, `rankings/bases/all_bases/${sanitizedBaseId}/players`, uid), globalRankObj);

    // 5. Handle shift transfer (transition delete old, write new)
    const sanitizedShiftId = sanitizeId(shift);
    const sanitizedOldShiftId = existingProfile?.shift ? sanitizeId(existingProfile.shift) : null;
    if (sanitizedOldShiftId && sanitizedOldShiftId !== sanitizedShiftId) {
      batch.delete(doc(db, `rankings/turnos/all_turnos/${sanitizedOldShiftId}/players`, uid));
    }
    batch.set(doc(db, `rankings/turnos/all_turnos/${sanitizedShiftId}/players`, uid), globalRankObj);

    // Commit batch atomically
    await batch.commit();
    console.log(`Atomically synced profile & rankings for user UID ${uid}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, playersPath);
  }
}
