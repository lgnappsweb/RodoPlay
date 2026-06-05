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
export async function writePlayerProfile(uid: string, data: Partial<Player>): Promise<Player> {
  const playersPath = `users/${uid}`;
  let existingProfile: any = null;
  let cached: any = null;

  // 1. Load from localStorage backup cache to support offline or rapid reload states safely
  try {
    const cachedStr = localStorage.getItem('last_player_profile');
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (parsed && (parsed.uid === uid || parsed.email?.toLowerCase() === auth.currentUser?.email?.toLowerCase())) {
        cached = parsed;
        console.log("writePlayerProfile: found local backup cache layer to protect details from being reset");
      }
    }
  } catch (errCache) {
    console.warn("writePlayerProfile error parsing local cache fallback:", errCache);
  }

  const quotaExceededTimeStr = localStorage.getItem('firestore_quota_exceeded_timestamp');
  let isQuotaExceeded = localStorage.getItem('firestore_quota_exceeded') === 'true';
  if (isQuotaExceeded && quotaExceededTimeStr) {
    const lastCheckTime = Number(quotaExceededTimeStr);
    const oneHourMs = 60 * 60 * 1000;
    if (Date.now() - lastCheckTime > oneHourMs) {
      isQuotaExceeded = false;
      localStorage.setItem('firestore_quota_exceeded', 'false');
    }
  }

  try {
    // 2. Fetch current existing state to perform relational consistency (from users master first, then players)
    try {
      if (isQuotaExceeded) {
        console.log("Firestore quota limits exceeded (cached state); bypassing initial read fetch.");
        existingProfile = cached || {};
      } else {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          existingProfile = snap.data();
        } else {
          const playerRef = doc(db, 'players', uid);
          const playerSnap = await getDoc(playerRef);
          if (playerSnap.exists()) {
            existingProfile = playerSnap.data();
          }
        }
      }
    } catch (e) {
      console.warn("Could not retrieve current player document, continuing with merge: ", e);
      existingProfile = cached || {};
    }

    // Determine current values using a bulletproof layered merge strategy
    const finalApelido = data.apelido || data.displayName || existingProfile?.apelido || existingProfile?.displayName || cached?.apelido || cached?.displayName || auth.currentUser?.displayName?.split('@')[0] || 'Operador RodoPlay';
    const email = data.email || existingProfile?.email || cached?.email || auth.currentUser?.email || '';
    const avatar = data.avatar || existingProfile?.avatar || cached?.avatar || '👷';
    const base = data.base || existingProfile?.base || cached?.base || 'Base 01';
    const shift = data.shift || (data as any).turno || existingProfile?.shift || existingProfile?.turno || cached?.shift || cached?.turno || 'Turno A - Diurno';
    const praca = (data as any).praca || (data as any).praça || existingProfile?.praca || existingProfile?.praça || cached?.praca || cached?.praça || 'Praça 01';
    
    // Status and approval fields
    const statusConta = data.statusConta || existingProfile?.statusConta || cached?.statusConta || (email.toLowerCase() === 'lgngregorio@icloud.com' ? 'aprovado' : 'pendente');
    const aprovado = data.aprovado !== undefined ? data.aprovado : (existingProfile?.aprovado !== undefined ? existingProfile.aprovado : (cached?.aprovado !== undefined ? cached.aprovado : (email.toLowerCase() === 'lgngregorio@icloud.com' ? true : false)));
    
    const displayName = finalApelido;
    
    // Performance and progression scores - Delta-based synchronization to prevent overwrite of concurrent device updates
    const baseline = cached || {};
    
    let deltaScore = 0;
    if (data.totalScore !== undefined) {
      deltaScore = Math.max(0, Number(data.totalScore) - Number(baseline.totalScore || baseline.pontos || 0));
    }
    
    let deltaXp = 0;
    if (data.xp !== undefined) {
      deltaXp = Math.max(0, Number(data.xp) - Number(baseline.xp || 0));
    }
    
    let deltaGamesPlayed = 0;
    if (data.gamesPlayed !== undefined) {
      deltaGamesPlayed = Math.max(0, Number(data.gamesPlayed) - Number(baseline.gamesPlayed || baseline.patrulhas || 0));
    }
    
    let deltaCompletedGames = 0;
    if (data.completedGames !== undefined) {
      deltaCompletedGames = Math.max(0, Number(data.completedGames) - Number(baseline.completedGames || baseline.partidas || 0));
    }
    
    let deltaTimedOutGames = 0;
    if (data.timedOutGames !== undefined) {
      deltaTimedOutGames = Math.max(0, Number(data.timedOutGames) - Number(baseline.timedOutGames || baseline.excedidas || 0));
    }

    let deltaVictories = 0;
    if (data.victories !== undefined) {
      deltaVictories = Math.max(0, Number(data.victories) - Number(baseline.victories || baseline.vitorias || 0));
    }

    let deltaDefeats = 0;
    if (data.defeats !== undefined) {
      deltaDefeats = Math.max(0, Number(data.defeats) - Number(baseline.defeats || baseline.derrotas || 0));
    }

    // Individual gameStats self-healing delta merge
    const currentDbGameStats = existingProfile?.gameStats || {};
    const inputGameStats = data.gameStats || {};
    const mergedGameStats = { ...currentDbGameStats };

    if (data.gameStats !== undefined) {
      Object.keys(inputGameStats).forEach(gameKey => {
        const inputStats = (inputGameStats[gameKey] || {}) as any;
        const baselineStats = (baseline.gameStats?.[gameKey] || {}) as any;
        const databaseStats = (currentDbGameStats[gameKey] || {}) as any;

        const inputScore = Number(inputStats.score !== undefined ? inputStats.score : (inputStats.pontos || 0));
        const baselineScore = Number(baselineStats.score !== undefined ? baselineStats.score : (baselineStats.pontos || 0));
        const dbScore = Number(databaseStats.score !== undefined ? databaseStats.score : (databaseStats.pontos || 0));
        
        const deltaGameScore = Math.max(0, inputScore - baselineScore);

        const inputComp = Number(inputStats.completions !== undefined ? inputStats.completions : (inputStats.patrulhas || 0));
        const baselineComp = Number(baselineStats.completions !== undefined ? baselineStats.completions : (baselineStats.patrulhas || 0));
        const dbComp = Number(databaseStats.completions !== undefined ? databaseStats.completions : (databaseStats.patrulhas || 0));

        const deltaGameComp = Math.max(0, inputComp - baselineComp);

        mergedGameStats[gameKey] = {
          score: dbScore + deltaGameScore,
          pontos: dbScore + deltaGameScore,
          completions: dbComp + deltaGameComp,
          patrulhas: dbComp + deltaGameComp
        };
      });
    }

    const gameStats = mergedGameStats;

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

    // Now calculate final values by adding deltas to the absolute freshest Firestore DB values
    const currentDbScore = Number(existingProfile?.totalScore || existingProfile?.pontos || 0);
    const rawTotalScore = data.totalScore !== undefined ? (currentDbScore + deltaScore) : currentDbScore;
    const totalScore = Math.max(Number(rawTotalScore), statsScoreSum);

    const currentDbXp = Number(existingProfile?.xp || 0);
    const xp = data.xp !== undefined ? (currentDbXp + deltaXp) : currentDbXp;

    const level = Math.max(1, Math.floor((250 + Math.sqrt(62500 + 1000 * xp)) / 500));

    const currentDbGamesPlayed = Number(existingProfile?.gamesPlayed || existingProfile?.patrulhas || 0);
    const rawGamesPlayed = data.gamesPlayed !== undefined ? (currentDbGamesPlayed + deltaGamesPlayed) : currentDbGamesPlayed;
    const gamesPlayed = Math.max(Number(rawGamesPlayed), statsGamesSum);

    const currentDbCompletedGames = Number(existingProfile?.completedGames || existingProfile?.partidas || 0);
    const completedGames = data.completedGames !== undefined ? (currentDbCompletedGames + deltaCompletedGames) : currentDbCompletedGames;

    const currentDbVictories = Number(existingProfile?.victories || existingProfile?.vitorias || 0);
    const victories = data.victories !== undefined ? (currentDbVictories + deltaVictories) : currentDbVictories;

    const currentDbDefeats = Number(existingProfile?.defeats || existingProfile?.derrotas || 0);
    const defeats = data.defeats !== undefined ? (currentDbDefeats + deltaDefeats) : currentDbDefeats;

    const currentDbTimedOutGames = Number(existingProfile?.timedOutGames || existingProfile?.excedidas || 0);
    const rawTimedOutGames = data.timedOutGames !== undefined ? (currentDbTimedOutGames + deltaTimedOutGames) : currentDbTimedOutGames;
    const timedOutGames = isNaN(Number(rawTimedOutGames)) ? 0 : Number(rawTimedOutGames);
    
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
      timedOutGames,
      excedidas: timedOutGames, // exact alias
      gameStats, // explicit key
      online,
      status, // exact alias
      rankingGlobal,
      rankingBase,
      rankingTurno,
      createdAt,
      updatedAt,
      statusConta,
      aprovado
    };

    // Store inside localStorage immediately
    localStorage.setItem('last_player_profile', JSON.stringify(mergedPlayer));

    if (isQuotaExceeded) {
      console.log("Firestore quota limits exceeded (cached state); bypassing database write-back.");
      return mergedPlayer;
    }

    try {
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
        timedOutGames,
        excedidas: timedOutGames, // exact alias
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
      localStorage.setItem('firestore_quota_exceeded', 'false');
    } catch (writeErr) {
      console.warn("Firestore write error (quota exceeded or offline). Retaining local state.", writeErr);
      localStorage.setItem('firestore_quota_exceeded', 'true');
      localStorage.setItem('firestore_quota_exceeded_timestamp', String(Date.now()));
    }

    return mergedPlayer;
  } catch (error) {
    console.warn("Safe writePlayerProfile top-level caught error:", error);
    localStorage.setItem('firestore_quota_exceeded', 'true');
    const fallbackPlayerModel: Player = {
      ...(cached || {}),
      ...data,
      uid,
      updatedAt: new Date().toISOString()
    } as any;
    localStorage.setItem('last_player_profile', JSON.stringify(fallbackPlayerModel));
    return fallbackPlayerModel;
  }
}
