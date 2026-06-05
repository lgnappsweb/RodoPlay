/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player } from '../types';
import { BASE_OPTIONS, SHIFT_OPTIONS } from '../constants';
import { 
  Trophy, 
  Shield, 
  Clock, 
  MapPin, 
  Globe, 
  Users, 
  Swords, 
  Award, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  UserCheck, 
  Zap, 
  CheckCircle, 
  TrendingUp, 
  XCircle, 
  Flame, 
  Gamepad2, 
  BadgeAlert,
  SlidersHorizontal,
  Sparkles,
  ArrowLeft,
  Car
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

type TabType = 'global' | 'base' | 'shift' | 'meu_ranking';
type SubTab2PType = 'ranking' | 'history';

// Complete grid games definitions list
const LEAD_GAMES = [
  { id: 'QUIZ', name: 'Super Quiz', icon: '❓' },
  { id: 'HANGMAN', name: 'Forca', icon: '☠️' },
  { id: 'WORD_SEARCH', name: 'Caça-Palavras', icon: '🔍' },
  { id: 'WORD_GUESS', name: 'Código Secreto', icon: '🔐' },
  { id: 'NUMBER_GUESS', name: 'Sinais', icon: '🎛️' },
  { id: 'MEMORY', name: 'Memória', icon: '🧠' },
  { id: 'REACTION', name: 'Reflexo Rápido', icon: '⚡' },
  { id: 'SPEED_MATH', name: 'Cálculo Rápido', icon: '🧮' },
  { id: 'ROUTE_ORDER', name: 'Trajeto / Rota', icon: '🗺️' },
  { id: 'PARKING_ESCAPE', name: 'Escape de Pátio', icon: '🅿️' },
  { id: 'QUEENS', name: 'Queens (Rainhas)', icon: '👑' },
  { id: 'PALAVRAS_500', name: 'Palavras 500', icon: '📚' },
  { id: 'CONTEXTO', name: 'Contexto', icon: '🧠' },
  { id: 'SUDOKU', name: 'Sudoku Tático', icon: '🔢' },
  { id: 'TIC_TAC_TOE', name: 'Jogo da Velha', icon: '❌' },
];

export interface LeaderboardProps {
  isMini?: boolean;
  onViewAll?: () => void;
  onBack?: () => void;
}

export function Leaderboard({ isMini = false, onViewAll, onBack }: LeaderboardProps) {
  // Current authenticated user context
  const { player: currentPlayer } = useAuth();

  // Active Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>(isMini ? 'global' : 'global');
  const [subTab2p, setSubTab2p] = useState<SubTab2PType>('ranking');

  // Filter Selection States (pre-selected with current user's profile)
  const [selectedBase, setSelectedBase] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');

  // Subscribed Realtime Lists State
  const [globalPlayers, setGlobalPlayers] = useState<Player[]>([]);
  const [duels, setDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayerUid, setExpandedPlayerUid] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Sync state variables once current user retrieves base/shift info or active tab changes
  useEffect(() => {
    if (activeTab === 'base') {
      setSelectedBase(currentPlayer?.base || 'Base 01');
      setSelectedShift('all');
    } else if (activeTab === 'shift') {
      setSelectedShift(currentPlayer?.shift || 'Turno A - Diurno');
      setSelectedBase('all');
    } else {
      setSelectedBase('all');
      setSelectedShift('all');
    }
  }, [activeTab, currentPlayer]);

  // Clean sanitize id matching Firestore's backend schema normalization
  const sanitizeId = (val: string): string => {
    if (!val) return 'default';
    return val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_ -]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_');
  };

  // 1. Permanent background sync of rankings/global/players for accurate "Meu Ranking" positioning
  useEffect(() => {
    setLoading(true);
    const globalQ = query(collection(db, 'rankings/global/players'));
    const unsubscribeGlobal = onSnapshot(globalQ, (snapshot) => {
      const pList: Player[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        
        // Dynamic self-healing logic checking nested gameStats entries
        const gameStatsObj = data.gameStats || {};
        let statsScoreSum = 0;
        let statsGamesSum = 0;
        if (gameStatsObj && typeof gameStatsObj === 'object') {
          Object.values(gameStatsObj).forEach((stat: any) => {
            if (stat && typeof stat === 'object') {
              const sc = stat.score !== undefined ? Number(stat.score) : (stat.pontos !== undefined ? Number(stat.pontos) : 0);
              const comp = stat.completions !== undefined ? Number(stat.completions) : (stat.patrulhas !== undefined ? Number(stat.patrulhas) : 0);
              statsScoreSum += sc;
              statsGamesSum += comp;
            }
          });
        }

        const storedScore = typeof data.totalScore === 'string' ? parseFloat(data.totalScore) : (data.totalScore !== undefined ? data.totalScore : (data.pontos || data.scoreTotal || 0));
        const finalScore = Math.max(storedScore, statsScoreSum);

        const storedGames = typeof data.gamesPlayed === 'string' ? parseInt(data.gamesPlayed, 10) : (data.gamesPlayed !== undefined ? data.gamesPlayed : (data.patrulhas || 0));
        const finalGames = Math.max(storedGames, statsGamesSum);

        pList.push({
          ...data,
          totalScore: finalScore,
          gamesPlayed: finalGames,
          completedGames: typeof data.completedGames === 'string' ? parseInt(data.completedGames, 10) : (data.completedGames !== undefined ? data.completedGames : (data.partidas || 0)),
          victories: typeof data.victories === 'string' ? parseInt(data.victories, 10) : (data.victories !== undefined ? data.victories : (data.vitorias || 0)),
          defeats: typeof data.defeats === 'string' ? parseInt(data.defeats, 10) : (data.defeats !== undefined ? data.defeats : (data.derrotas || 0)),
          level: typeof data.level === 'string' ? parseInt(data.level, 10) : (data.level !== undefined ? data.level : (data.nivel || 1)),
          xp: typeof data.xp === 'string' ? parseFloat(data.xp) : (data.xp !== undefined ? data.xp : (data.points ? data.points / 2 : 0)),
          displayName: data.displayName || data.apelido || 'Recruta',
          base: data.base || 'SEM BASE',
          shift: data.shift || data.turno || 'GERAL',
          online: data.online !== undefined ? data.online : (data.status === 'online'),
          uid: doc.id
        });
      });

      // Unified custom leaderboard sorting rule: 
      // 1. Pontos DESC | 2. Patrulhas DESC | 3. Vitórias DESC | 4. XP DESC
      pList.sort((a, b) => {
        if ((b.totalScore || 0) !== (a.totalScore || 0)) return (b.totalScore || 0) - (a.totalScore || 0);
        if ((b.gamesPlayed || 0) !== (a.gamesPlayed || 0)) return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
        if ((b.victories || 0) !== (a.victories || 0)) return (b.victories || 0) - (a.victories || 0);
        if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      setGlobalPlayers(pList);
      setLoading(false);
    }, (error) => {
      console.warn("[Firebase Global Cache Warning] Error:", error);
      setLoading(false);
    });

    return () => unsubscribeGlobal();
  }, []);

  // 3. Multiplayer Duels 2P Real-Time Listener (DEACTIVATED)
  useEffect(() => {
    return; // Multiplayer fully disabled

    const q = query(collection(db, 'duels'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeDuels = onSnapshot(q, (snapshot) => {
      const matchHistory: any[] = [];
      snapshot.forEach((doc) => {
        matchHistory.push({ id: doc.id, ...doc.data() });
      });
      setDuels(matchHistory);
    }, (error) => {
      console.warn("[Firebase Duel Sync Failure]:", error);
    });

    return () => unsubscribeDuels();
  }, [isMini, activeTab]);

  // Consolidated and enhanced players list ensuring the active current user is ALWAYS dynamically merged/injected
  const enhancedPlayers = useMemo(() => {
    let list = [...globalPlayers];
    if (currentPlayer?.uid) {
      const foundIdx = list.findIndex(p => p.uid === currentPlayer.uid);
      
      const pData = currentPlayer;
      const gameStatsObj = pData.gameStats || {};
      let pStatsScoreSum = 0;
      let pStatsGamesSum = 0;
      if (gameStatsObj && typeof gameStatsObj === 'object') {
        Object.values(gameStatsObj).forEach((stat: any) => {
          if (stat && typeof stat === 'object') {
            const sc = stat.score !== undefined ? Number(stat.score) : (stat.pontos !== undefined ? Number(stat.pontos) : 0);
            const comp = stat.completions !== undefined ? Number(stat.completions) : (stat.patrulhas !== undefined ? Number(stat.patrulhas) : 0);
            pStatsScoreSum += sc;
            pStatsGamesSum += comp;
          }
        });
      }

      const storedScore = typeof pData.totalScore === 'string' ? parseFloat(pData.totalScore) : (pData.totalScore !== undefined ? pData.totalScore : (pData.pontos || (pData as any).scoreTotal || 0));
      const totalScore = Math.max(storedScore, pStatsScoreSum);

      const storedGames = typeof pData.gamesPlayed === 'string' ? parseInt(pData.gamesPlayed, 10) : (pData.gamesPlayed !== undefined ? pData.gamesPlayed : (pData.patrulhas || 0));
      const gamesPlayed = Math.max(storedGames, pStatsGamesSum);

      const completedGames = typeof pData.completedGames === 'string' ? parseInt(pData.completedGames, 10) : (pData.completedGames !== undefined ? pData.completedGames : (pData.partidas || 0));
      const victories = typeof pData.victories === 'string' ? parseInt(pData.victories, 10) : (pData.victories !== undefined ? pData.victories : (pData.vitorias || 0));
      const defeats = typeof pData.defeats === 'string' ? parseInt(pData.defeats, 10) : (pData.defeats !== undefined ? pData.defeats : (pData.derrotas || 0));
      const level = typeof pData.level === 'string' ? parseInt(pData.level, 10) : (pData.level !== undefined ? pData.level : (pData.nivel || 1));
      const xp = typeof pData.xp === 'string' ? parseFloat(pData.xp) : (pData.xp !== undefined ? pData.xp : (pData.points ? pData.points / 2 : 0));
      const displayName = pData.displayName || pData.apelido || 'Eu (Recruta)';
      const base = pData.base || 'Base 01';
      const shift = pData.shift || pData.turno || 'Turno A - Diurno';
      const online = pData.online !== undefined ? pData.online : (pData.status === 'online' || true);

      const playerObj: Player = {
        ...currentPlayer,
        uid: currentPlayer.uid,
        displayName,
        avatar: currentPlayer.avatar || '👷',
        base,
        shift,
        totalScore,
        gamesPlayed,
        completedGames,
        victories,
        defeats,
        level,
        xp,
        online,
        gameStats: currentPlayer.gameStats || {}
      };

      if (foundIdx >= 0) {
        // Safe deep merge of nested gameStats to guarantee we take the maximum/best of BOTH sources
        const baseStats = list[foundIdx].gameStats || {};
        const activeStats = playerObj.gameStats || {};
        const mergedGameStats: Record<string, { score: number; completions: number }> = {};
        
        const allKeys = Array.from(new Set([...Object.keys(baseStats), ...Object.keys(activeStats)]));
        for (const k of allKeys) {
          const sA: any = baseStats[k] || {};
          const sB: any = activeStats[k] || {};
          
          const sAScore = sA.score !== undefined ? sA.score : (sA.pontos !== undefined ? sA.pontos : 0);
          const sBScore = sB.score !== undefined ? sB.score : (sB.pontos !== undefined ? sB.pontos : 0);
          
          const sAComp = sA.completions !== undefined ? sA.completions : (sA.patrulhas !== undefined ? sA.patrulhas : 0);
          const sBComp = sB.completions !== undefined ? sB.completions : (sB.patrulhas !== undefined ? sB.patrulhas : 0);
          
          mergedGameStats[k] = {
            score: Math.max(Number(sAScore || 0), Number(sBScore || 0)),
            completions: Math.max(Number(sAComp || 0), Number(sBComp || 0))
          };
        }

        // Recalculate healed scores sum from merged stats
        let healsScoreSum = 0;
        let healsGamesSum = 0;
        Object.values(mergedGameStats).forEach((stat: any) => {
          healsScoreSum += Number(stat.score || 0);
          healsGamesSum += Number(stat.completions || 0);
        });

        // Safe merge taking the maximum/best of active session fields vs leaderboard cache
        list[foundIdx] = {
          ...list[foundIdx],
          ...playerObj,
          gameStats: mergedGameStats,
          totalScore: Math.max(Number(list[foundIdx].totalScore || 0), Number(playerObj.totalScore || 0), healsScoreSum),
          gamesPlayed: Math.max(Number(list[foundIdx].gamesPlayed || 0), Number(playerObj.gamesPlayed || 0), healsGamesSum),
          completedGames: Math.max(Number(list[foundIdx].completedGames || 0), Number(playerObj.completedGames || 0)),
          victories: Math.max(Number(list[foundIdx].victories || 0), Number(playerObj.victories || 0)),
          level: Math.max(Number(list[foundIdx].level || 1), Number(playerObj.level || 1)),
          xp: Math.max(Number(list[foundIdx].xp || 0), Number(playerObj.xp || 0)),
        };
      } else {
        list.push(playerObj);
      }
    }

    // Sort using the exact consolidated rules
    list.sort((a, b) => {
      if ((b.totalScore || 0) !== (a.totalScore || 0)) return (b.totalScore || 0) - (a.totalScore || 0);
      if ((b.gamesPlayed || 0) !== (a.gamesPlayed || 0)) return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
      if ((b.victories || 0) !== (a.victories || 0)) return (b.victories || 0) - (a.victories || 0);
      if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
      const dateB = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : 0;
      const dateA = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [globalPlayers, currentPlayer]);

  // Calculate local user positions dynamically
  const personalRanks = useMemo(() => {
    if (!currentPlayer?.uid || enhancedPlayers.length === 0) {
      return { global: 0, base: 0, shift: 0 };
    }
    const myUid = currentPlayer.uid;
    const globalRankIdx = enhancedPlayers.findIndex(x => x.uid === myUid);

    const baseRanked = enhancedPlayers.filter(x => sanitizeId(x.base) === sanitizeId(currentPlayer.base || 'Base 01'));
    const baseRankIdx = baseRanked.findIndex(x => x.uid === myUid);

    const shiftRanked = enhancedPlayers.filter(x => sanitizeId(x.shift) === sanitizeId(currentPlayer.shift || 'Turno A - Diurno'));
    const shiftRankIdx = shiftRanked.findIndex(x => x.uid === myUid);

    return {
      global: globalRankIdx >= 0 ? globalRankIdx + 1 : 0,
      base: baseRankIdx >= 0 ? baseRankIdx + 1 : 0,
      shift: shiftRankIdx >= 0 ? shiftRankIdx + 1 : 0,
    };
  }, [enhancedPlayers, currentPlayer]);

  // Client-side multi-dimensional filtering across all bases, shifts, status, and search query
  const filteredPlayers = useMemo(() => {
    let list = [...enhancedPlayers];

    // Safe de-duplication and test-record purging to maintain extreme visual polish:
    // 1. Exclude any duplicate profiles having the exact same display name as the current user but with a different UID
    if (currentPlayer?.displayName) {
      const myCleanName = currentPlayer.displayName.trim().toLowerCase();
      list = list.filter(p => {
        if (p.uid === currentPlayer.uid) return true;
        const otherName = (p.displayName || p.apelido || '').trim().toLowerCase();
        return otherName !== myCleanName;
      });
    }

    // 2. Exclude any duplicate profiles having the exact same email as the current user but with a different UID (if email is defined)
    if (currentPlayer?.email) {
      const myCleanEmail = currentPlayer.email.trim().toLowerCase();
      list = list.filter(p => {
        if (p.uid === currentPlayer.uid) return true;
        const otherEmail = (p.email || '').trim().toLowerCase();
        return otherEmail !== myCleanEmail;
      });
    }

    // 3. Exclude uninitialized test records/accounts (with 0 score and 0 games played) that are not the current user
    list = list.filter(p => {
      if (p.uid === currentPlayer?.uid) return true;
      const score = p.totalScore || p.pontos || p.scoreTotal || 0;
      const games = p.gamesPlayed || p.patrulhas || p.completedGames || p.partidas || 0;
      return score > 0 || games > 0;
    });

    // 4. Exclude any placeholder or debug names commonly used in tests that are not the active user
    list = list.filter(p => {
      if (p.uid === currentPlayer?.uid) return true;
      const name = (p.displayName || p.apelido || '').toLowerCase();
      const email = (p.email || '').toLowerCase().trim();
      const isTestName = name === 'teste' || name.startsWith('teste ') || name === 'test' || name.includes('dummy') || name.includes('deletada') || name.includes('deletar') || name === 'recruta' || name.includes('teste');
      const isTestEmail = email === 'teste@rodoplay.com.br' || email.includes('teste@') || email.includes('test@');
      return !isTestName && !isTestEmail;
    });

    // 1. Base Filter matching
    if (selectedBase && selectedBase !== 'all') {
      list = list.filter(p => sanitizeId(p.base) === sanitizeId(selectedBase));
    }

    // 2. Shift Filter matching
    if (selectedShift && selectedShift !== 'all') {
      list = list.filter(p => sanitizeId(p.shift) === sanitizeId(selectedShift));
    }

    // 3. Text Search matching
    if (searchQuery.trim() !== '') {
      const queryTerm = searchQuery.toLowerCase().trim();
      list = list.filter(p => {
        const findName = (p.displayName || '').toLowerCase();
        const findBase = (p.base || '').toLowerCase();
        const findShift = (p.shift || '').toLowerCase();
        return findName.includes(queryTerm) || findBase.includes(queryTerm) || findShift.includes(queryTerm);
      });
    }

    // 4. Offline / Online filter matching
    if (statusFilter === 'online') {
      list = list.filter(p => p.online === true);
    } else if (statusFilter === 'offline') {
      list = list.filter(p => p.online !== true);
    }

    // 5. Game-specific filter sorting
    if (selectedGameFilter && selectedGameFilter !== 'all') {
      list.sort((a, b) => {
        const statA = a.gameStats?.[selectedGameFilter] || a.gameStats?.[selectedGameFilter.toLowerCase()] || a.gameStats?.[selectedGameFilter.toUpperCase()] || {};
        const scoreA = statA.score !== undefined ? Number(statA.score) : (statA.pontos !== undefined ? Number(statA.pontos) : 0);
        const compA = statA.completions !== undefined ? Number(statA.completions) : (statA.patrulhas !== undefined ? Number(statA.patrulhas) : 0);

        const statB = b.gameStats?.[selectedGameFilter] || b.gameStats?.[selectedGameFilter.toLowerCase()] || b.gameStats?.[selectedGameFilter.toUpperCase()] || {};
        const scoreB = statB.score !== undefined ? Number(statB.score) : (statB.pontos !== undefined ? Number(statB.pontos) : 0);
        const compB = statB.completions !== undefined ? Number(statB.completions) : (statB.patrulhas !== undefined ? Number(statB.patrulhas) : 0);

        if (scoreB !== scoreA) return scoreB - scoreA;
        if (compB !== compA) return compB - compA;
        return (b.totalScore || 0) - (a.totalScore || 0);
      });
    }

    return list;
  }, [enhancedPlayers, selectedBase, selectedShift, searchQuery, statusFilter, selectedGameFilter]);

  const isAnyFilterActive = useMemo(() => {
    return searchQuery.trim() !== '' || selectedBase !== 'all' || selectedShift !== 'all' || statusFilter !== 'all' || selectedGameFilter !== 'all';
  }, [searchQuery, selectedBase, selectedShift, statusFilter, selectedGameFilter]);

  const players = enhancedPlayers; // backward compatibility fallback

  // Dynamically resolve synced/consolidated current player using real-time enhancedPlayers subscription
  const syncedCurrentPlayer = useMemo(() => {
    if (!currentPlayer) return null;
    const synced = enhancedPlayers.find(p => p.uid === currentPlayer.uid);
    if (synced) {
      const mergedStats = {
        ...(currentPlayer.gameStats || {}),
        ...(synced.gameStats || {})
      };
      
      let healsScoreSum = 0;
      let healsGamesSum = 0;
      Object.keys(mergedStats).forEach(key => {
        const sA: any = currentPlayer.gameStats?.[key] || {};
        const sB: any = synced.gameStats?.[key] || {};
        const score = Math.max(
          sA.score !== undefined ? Number(sA.score) : (sA.pontos !== undefined ? Number(sA.pontos) : 0),
          sB.score !== undefined ? Number(sB.score) : (sB.pontos !== undefined ? Number(sB.pontos) : 0)
        );
        const comp = Math.max(
          sA.completions !== undefined ? Number(sA.completions) : (sA.patrulhas !== undefined ? Number(sA.patrulhas) : 0),
          sB.completions !== undefined ? Number(sB.completions) : (sB.patrulhas !== undefined ? Number(sB.patrulhas) : 0)
        );
        mergedStats[key] = { score, completions: comp };
        healsScoreSum += score;
        healsGamesSum += comp;
      });

      const sScore = typeof synced.totalScore === 'string' ? parseFloat(synced.totalScore) : (synced.totalScore !== undefined ? synced.totalScore : (synced.pontos || synced.scoreTotal || 0));
      const cScore = typeof currentPlayer.totalScore === 'string' ? parseFloat(currentPlayer.totalScore) : (currentPlayer.totalScore !== undefined ? currentPlayer.totalScore : 0);
      const finalScore = Math.max(sScore, cScore, healsScoreSum);

      const sGames = typeof synced.gamesPlayed === 'string' ? parseInt(synced.gamesPlayed, 10) : (synced.gamesPlayed !== undefined ? synced.gamesPlayed : (synced.patrulhas || 0));
      const cGames = typeof currentPlayer.gamesPlayed === 'string' ? parseInt(currentPlayer.gamesPlayed, 10) : (currentPlayer.gamesPlayed !== undefined ? currentPlayer.gamesPlayed : 0);
      const finalGames = Math.max(sGames, cGames, healsGamesSum);

      return {
        ...currentPlayer,
        ...synced,
        totalScore: finalScore,
        gamesPlayed: finalGames,
        gameStats: mergedStats
      };
    }
    return currentPlayer;
  }, [currentPlayer, enhancedPlayers]);

  // Multiplayer duels statistics calculation
  const calculated2PLeaderboard = useMemo(() => {
    const acc: Record<string, any> = {};
    duels.forEach((match) => {
      const p1Id = match.player1Id;
      const p2Id = match.player2Id;
      if (!p1Id || !p2Id) return;

      if (!acc[p1Id]) {
        acc[p1Id] = { uid: p1Id, displayName: match.player1Name, avatar: match.player1Avatar || '👷', wins: 0, duelsPlayed: 0, totalScore: 0 };
      }
      if (!acc[p2Id]) {
        acc[p2Id] = { uid: p2Id, displayName: match.player2Name, avatar: match.player2Avatar || '👷', wins: 0, duelsPlayed: 0, totalScore: 0 };
      }

      acc[p1Id].duelsPlayed += 1;
      acc[p2Id].duelsPlayed += 1;
      acc[p1Id].totalScore += match.p1Score || 0;
      acc[p2Id].totalScore += match.p2Score || 0;

      if (match.p1Score > match.p2Score) {
        acc[p1Id].wins += 1;
      } else if (match.p2Score > match.p1Score) {
        acc[p2Id].wins += 1;
      }
    });

    return Object.values(acc).sort((a: any, b: any) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalScore - a.totalScore;
    });
  }, [duels]);

  // Utility to map code GameType identifiers to local user friendly names
  const getFriendlyGameName = (type: string) => {
    switch (type) {
      case 'QUIZ_MASTER_APH': return 'Quiz Master APH';
      case 'TIC_TAC_TOE': return 'Jogo da Velha';
      case 'QUIZ': return 'Super Quiz';
      case 'HANGMAN': return 'Forca';
      case 'WORD_SEARCH': return 'Caça-Palavras';
      case 'WORD_GUESS': return 'Código Secreto';
      case 'NUMBER_COLORGAME': return 'Sinais de Trânsito';
      case 'MEMORY': return 'Memória';
      case 'REACTION': return 'Reflexo Rápido';
      case 'SPEED_MATH': return 'Cálculo Rápido';
      case 'ROUTE_ORDER': return 'Trajeto / Rota';
      case 'PARKING_ESCAPE': return 'Escape de Pátio';
      case 'QUEENS': return 'Queens (Rainhas)';
      case 'PALAVRAS_500': return 'Palavras 500';
      case 'CONTEXTO': return 'Contexto';
      case 'SUDOKU': return 'Sudoku Tático';
      default: return 'Desafio';
    }
  };

  // Podium Ranking styling helpers
  const getPodiumRankStyles = (pos: number) => {
    if (pos === 1) {
      return {
        card: "bg-gradient-to-b from-yellow-500/10 via-slate-900/90 to-slate-900 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.2)] md:scale-105",
        text: "text-yellow-400 font-extrabold shadow-yellow-500/10",
        badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 border-yellow-300",
        icon: "👑",
        glow: "absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition pointer-events-none"
      };
    }
    if (pos === 2) {
      return {
        card: "bg-gradient-to-b from-slate-400/10 via-slate-900/90 to-slate-900 border-slate-400 shadow-[0_0_20px_rgba(156,163,175,0.15)]",
        text: "text-slate-300 font-bold",
        badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-slate-950 border-slate-300",
        icon: "✨",
        glow: "absolute -inset-0.5 bg-slate-400/30 rounded-3xl blur opacity-10 pointer-events-none"
      };
    }
    if (pos === 3) {
      return {
        card: "bg-gradient-to-b from-amber-700/10 via-slate-900/90 to-slate-900 border-amber-700/80 shadow-[0_0_15px_rgba(180,83,9,0.12)]",
        text: "text-amber-500 font-bold",
        badge: "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-500",
        icon: "🛡️",
        glow: "absolute -inset-0.5 bg-amber-700/30 rounded-3xl blur opacity-5 pointer-events-none"
      };
    }
    return {
      card: "bg-slate-905/85 border-slate-800/80 shadow-md",
      text: "text-slate-400",
      badge: "bg-slate-800 text-slate-400 border-slate-700",
      icon: "🎖️",
      glow: ""
    };
  };

  // Helper to extract stats for a player based on selected game filter
  const getPlayerFilteredStats = (p: Player) => {
    if (selectedGameFilter && selectedGameFilter !== 'all') {
      const gameObj = LEAD_GAMES.find(g => g.id === selectedGameFilter);
      const rawStatObj: any = p.gameStats?.[selectedGameFilter] || p.gameStats?.[selectedGameFilter.toLowerCase()] || p.gameStats?.[selectedGameFilter.toUpperCase()] || {};
      const gameScore = rawStatObj.score !== undefined ? Number(rawStatObj.score) : (rawStatObj.pontos !== undefined ? Number(rawStatObj.pontos) : 0);
      const gameCompletions = rawStatObj.completions !== undefined ? Number(rawStatObj.completions) : (rawStatObj.patrulhas !== undefined ? Number(rawStatObj.patrulhas) : 0);
      return {
        score: gameScore,
        completions: gameCompletions,
        label: `SCORE (${gameObj?.name.toUpperCase() || 'JOGO'})`,
        gamesLabel: `PATRULHAS (${gameObj?.name.toUpperCase() || 'JOGO'})`,
        isFiltered: true,
        gameIcon: gameObj?.icon || '🎮'
      };
    }
    return {
      score: p.totalScore || 0,
      completions: p.gamesPlayed || 0,
      label: 'SCORE GERAL',
      gamesLabel: 'PATRULHAS GERAIS',
      isFiltered: false,
      gameIcon: '📊'
    };
  };

  // Renders the sub-grid displaying stats from all 15 mini-games for a player card
  const renderAll15GamesBreakdown = (p: Player) => {
    let bestGame: { id: string; name: string; icon: string; score: number; completions: number } | null = null;
    let highestScore = -1;

    LEAD_GAMES.forEach(game => {
      const rawStatObj: any = p.gameStats?.[game.id] || p.gameStats?.[game.id.toLowerCase()] || p.gameStats?.[game.id.toUpperCase()] || {};
      const gameScore = rawStatObj.score !== undefined ? Number(rawStatObj.score) : (rawStatObj.pontos !== undefined ? Number(rawStatObj.pontos) : 0);
      const gameCompletions = rawStatObj.completions !== undefined ? Number(rawStatObj.completions) : (rawStatObj.patrulhas !== undefined ? Number(rawStatObj.patrulhas) : 0);
      
      if (gameScore > highestScore) {
        highestScore = gameScore;
        bestGame = {
          id: game.id,
          name: game.name,
          icon: game.icon,
          score: gameScore,
          completions: gameCompletions
        };
      }
    });

    return (
      <div className="w-full mt-4 pt-4 border-t border-slate-800/70 text-left animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <h5 className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 font-sans leading-none">
            <span className="text-sm">📊</span> GRADE COMPLETA (TODOS OS 15 JOGOS)
          </h5>
          {bestGame && (bestGame as any).score > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded text-[8px] font-black uppercase text-yellow-400 tracking-wider">
              <span>⭐ MELHOR DESEMPENHO: {(bestGame as any).icon} {(bestGame as any).name} ({((bestGame as any).score).toLocaleString()} PTS)</span>
            </div>
          )}
          <span className="text-[7.5px] font-mono font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 rounded bg-slate-950/60">
            DADOS EM TEMPO REAL
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 w-full">
          {LEAD_GAMES.map(game => {
            const rawStatObj: any = p.gameStats?.[game.id] || p.gameStats?.[game.id.toLowerCase()] || p.gameStats?.[game.id.toUpperCase()] || {};
            const gameScore = rawStatObj.score !== undefined ? rawStatObj.score : (rawStatObj.pontos !== undefined ? rawStatObj.pontos : 0);
            const gameCompletions = rawStatObj.completions !== undefined ? rawStatObj.completions : (rawStatObj.patrulhas !== undefined ? rawStatObj.patrulhas : 0);

            const isThisFiltered = selectedGameFilter !== 'all' && selectedGameFilter.toUpperCase() === game.id.toUpperCase();
            const hasActivity = (gameCompletions || 0) > 0;

            return (
              <div 
                key={game.id}
                className={`flex flex-col p-2.5 rounded-2xl border transition-all text-center gap-1.5 relative ${
                  isThisFiltered 
                    ? 'bg-yellow-400/10 border-yellow-400/50 shadow-[0_0_12px_rgba(234,179,8,0.15)] scale-[1.02]' 
                    : hasActivity
                    ? 'bg-slate-900/40 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-slate-900/60 shadow-[0_2px_8px_rgba(16,185,129,0.03)]'
                    : 'bg-slate-950/50 border-slate-900/60 hover:border-slate-800/80 opacity-60 hover:opacity-100'
                }`}
              >
                {/* Real-time status badge */}
                {hasActivity && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}

                <div className="flex items-center justify-center gap-1.5 overflow-hidden">
                  <span className="text-sm shrink-0 select-none">{game.icon}</span>
                  <span className={`text-[8.5px] font-black truncate tracking-tight uppercase ${isThisFiltered ? 'text-yellow-400' : hasActivity ? 'text-emerald-400' : 'text-slate-400'}`} title={game.name}>
                    {game.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[8px] mt-0.5">
                  <div className={`flex flex-col rounded p-1 ${isThisFiltered ? 'bg-yellow-400/15' : hasActivity ? 'bg-emerald-500/5' : 'bg-slate-900/60'}`}>
                    <span className="text-slate-500 text-[6.5px] font-bold uppercase leading-none font-mono">PTS</span>
                    <span className={`font-extrabold text-[9px] mt-1 ${isThisFiltered ? 'text-yellow-400 font-black' : hasActivity ? 'text-white' : 'text-slate-500'}`}>{(gameScore || 0).toLocaleString()}</span>
                  </div>
                  <div className={`flex flex-col rounded p-1 ${isThisFiltered ? 'bg-blue-400/15' : hasActivity ? 'bg-blue-500/5' : 'bg-slate-900/60'}`}>
                    <span className="text-slate-500 text-[6.5px] font-bold uppercase leading-none font-mono">PAT</span>
                    <span className={`font-extrabold text-[9px] mt-1 ${isThisFiltered ? 'text-blue-400 font-black' : hasActivity ? 'text-blue-400' : 'text-slate-500'}`}>{gameCompletions || 0}</span>
                  </div>
                </div>
                {hasActivity && (
                  <div className="text-[6.5px] font-black tracking-widest text-emerald-500 uppercase font-mono mt-0.5 animate-pulse flex items-center justify-center gap-1 leading-none">
                    <span>☁️ SALVO</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cloud Persistence Assurance Banner */}
        <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-850 text-[10px] leading-tight text-slate-400 font-sans shadow-md">
          <div className="flex items-center gap-2.5 text-left">
            <div className="flex h-5 w-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 items-center justify-center shrink-0">
              <span className="text-emerald-400 text-xs">☁️</span>
            </div>
            <div>
              <p className="font-extrabold text-white uppercase tracking-tight text-[10.5px]">NUVEM DE REGISTROS ATIVA</p>
              <p className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider">Suas pontuações e patrulhas são armazenadas no Cloud Firestore à medida que você progride nos desafios</p>
            </div>
          </div>
          <div className="flex items-center gap-2 py-1 px-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-black text-[8px] uppercase font-mono tracking-widest animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span> SQL / FIRESTORE TEMPO REAL
          </div>
        </div>
      </div>
    );
  };

  // SKELETON LOADER
  if (loading && players.length === 0) {
    return (
      <div className="space-y-4 py-8">
        <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800 animate-pulse">
          <div className="h-6 w-32 bg-slate-800 rounded"></div>
          <div className="h-6 w-20 bg-slate-800 rounded-full"></div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex gap-4 items-center bg-slate-900/25 p-4 rounded-2xl border border-slate-800/50 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-slate-800"></div>
              <div className="w-12 h-12 rounded-xl bg-slate-800"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
                <div className="h-3 w-1/4 bg-slate-800 rounded"></div>
              </div>
              <div className="h-8 w-16 bg-slate-800 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // MINI RESUME MODE (WIDGET COMPACTO DA HOME)
  // ==========================================
  if (isMini) {
    return (
      <div className="space-y-4 font-sans text-left">
        {/* Quick Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="text-yellow-400 h-4.5 w-4.5 animate-bounce" />
            <h4 className="text-sm font-black uppercase italic tracking-tighter text-white">Salão da Fama</h4>
          </div>
          <span className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1 animate-pulse">
            <span className="w-1 h-1 rounded-full bg-yellow-400"></span> Ao Vivo
          </span>
        </div>

        {/* Top 10 list */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filteredPlayers.slice(0, 10).map((p, idx) => {
            const numPosition = idx + 1;
            const styling = getPodiumRankStyles(numPosition);
            const isMe = p.uid === currentPlayer?.uid;

            return (
              <div 
                key={p.uid}
                onClick={() => setExpandedPlayerUid(expandedPlayerUid === p.uid ? null : p.uid)}
                className={`relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer ${isMe ? 'bg-yellow-400/5 border-yellow-400 border-dashed' : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'} w-full`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  {/* Position label */}
                  <span className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[10px] font-black border uppercase shrink-0 ${numPosition === 1 ? 'bg-yellow-400 text-slate-900 border-yellow-500' : numPosition === 2 ? 'bg-slate-300 text-slate-900 border-slate-400' : numPosition === 3 ? 'bg-amber-600 text-white border-amber-700' : 'bg-slate-850 text-slate-450 border-slate-750'}`}>
                    {numPosition}
                  </span>

                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-xl font-black border border-slate-700 shrink-0 overflow-hidden relative">
                    {p.avatar?.startsWith('data') || p.avatar?.startsWith('http') ? (
                      <img src={p.avatar} alt="P" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-yellow-400">{(p.displayName || '??').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Profile data */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <p className="text-xs font-black uppercase italic text-white truncate flex-1 leading-none">
                        {p.displayName}
                        {isMe && <span className="text-[7.5px] bg-yellow-400/10 text-yellow-500 uppercase px-1.5 ml-1.5 rounded font-black tracking-normal">Eu</span>}
                      </p>
                      <span className="text-[8px] font-mono font-bold text-slate-500 uppercase leading-none">
                        LVL {p.level}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[8.5px] font-semibold text-slate-400 truncate max-w-[120px]">
                        {p.base} • {p.shift}
                      </span>
                      <span className={`text-[11px] font-black font-mono italic tracking-tight ${numPosition === 1 ? 'text-yellow-400' : 'text-slate-200'}`}>
                        {(p.totalScore || 0).toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Grid breakdown inside mini widget too! */}
                <AnimatePresence>
                  {expandedPlayerUid === p.uid && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden w-full"
                    >
                      {renderAll15GamesBreakdown(p)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-yellow-400 hover:text-white border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Acessar Ranking Completo 🏆
          </button>
        )}
      </div>
    );
  }

  // ==========================================
  // FULL DETAILED MULTIPLAYER GAMER DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6 pb-24 text-left font-sans max-w-7xl mx-auto px-1">
      
      {!isMini && onBack && (
        <div className="flex justify-start pt-2 px-1">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-yellow-500 hover:border-yellow-405 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all focus:outline-none font-sans font-black text-[10px] tracking-wider uppercase cursor-pointer z-20"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <Car size={11} className="stroke-[2]" />
            <span>Voltar</span>
          </motion.button>
        </div>
      )}

      {/* 1. STATEFUL UPPER BANNER - NOW CENTERED & REDESIGNED */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-block bg-yellow-400 text-black px-4 py-1 font-black skew-x-[-12deg] text-xs uppercase shadow-[3px_3px_0px_#f97316]">
          🏆 SALÃO DA FAMA
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic drop-shadow-2xl text-white">
          RANKING DE OPERADORES
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
          Sincronização global de pontuações e patrulhas em tempo real
        </p>
      </div>

      {/* 2. NOISELESS COMPREHENSIVE TABS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-850/80 shadow-md">
        <button
          onClick={() => { setActiveTab('global'); setExpandedPlayerUid(null); }}
          className={`flex items-center justify-center gap-2 py-3 px-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all leading-none ${activeTab === 'global' ? 'bg-yellow-400 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white bg-transparent'}`}
        >
          <Globe size={14} className="shrink-0" /> Global
        </button>

        <button
          onClick={() => { setActiveTab('base'); setExpandedPlayerUid(null); }}
          className={`flex items-center justify-center gap-2 py-3 px-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all leading-none ${activeTab === 'base' ? 'bg-yellow-400 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white bg-transparent'}`}
        >
          <MapPin size={14} className="shrink-0" /> Por Base
        </button>

        <button
          onClick={() => { setActiveTab('shift'); setExpandedPlayerUid(null); }}
          className={`flex items-center justify-center gap-2 py-3 px-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all leading-none ${activeTab === 'shift' ? 'bg-yellow-400 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white bg-transparent'}`}
        >
          <Clock size={14} className="shrink-0" /> Por Turno
        </button>

        <button
          onClick={() => { setActiveTab('meu_ranking'); setExpandedPlayerUid(null); }}
          className={`flex items-center justify-center gap-2 py-3 px-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all leading-none col-span-2 md:col-span-1 ${activeTab === 'meu_ranking' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black shadow-md' : 'text-slate-400 hover:text-white bg-transparent'}`}
        >
          <Award size={14} className="shrink-0" /> Meu Ranking
        </button>
      </div>

      {/* 3. CONCISE FILTERS CARD (EXCEPT FOR ME COMPILATION) */}
      {activeTab !== 'meu_ranking' && (
        <div className="bg-slate-950 border border-slate-900 p-4.5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-yellow-400" /> CENTRAL DE CONSULTA E CONCENTRAÇÃO
            </h3>
            <span className="text-[7.5px] font-mono font-bold text-slate-650">FILTROS EM TEMPO REAL</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Nickname Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" size={15} />
              <input
                type="text"
                value={searchQuery}
                aria-label="Buscar apelido, base ou turno"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PROCURAR POR APELIDO..."
                className="w-full text-slate-200 h-11 pl-11 pr-4 bg-slate-900/60 border border-slate-800 rounded-xl font-bold text-xs uppercase placeholder-slate-600 outline-none focus:border-yellow-400 focus:bg-slate-900 focus:ring-1 focus:ring-yellow-400 transition-all"
              />
            </div>

            {/* Base Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedBase}
                aria-label="Selecionar Base"
                onChange={(e) => setSelectedBase(e.target.value)}
                className="w-full text-slate-200 h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl font-bold text-xs uppercase outline-none focus:border-yellow-400 cursor-pointer appearance-none"
              >
                <option value="all" className="bg-slate-950 text-slate-400">TODAS AS BASES</option>
                {BASE_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-slate-950 text-slate-200">{opt.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Shift Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedShift}
                aria-label="Selecionar Turno"
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full text-slate-200 h-11 px-3 bg-slate-905 border border-slate-800 rounded-xl font-bold text-xs uppercase outline-none focus:border-yellow-400 cursor-pointer appearance-none"
              >
                <option value="all" className="bg-slate-950 text-slate-400">TODOS OS TURNOS</option>
                {SHIFT_OPTIONS.map(opt => (
                  <option key={opt} value={opt} className="bg-slate-950 text-slate-200">{opt.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                aria-label="Filtrar por Status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-slate-200 h-11 px-3 bg-slate-905 border border-slate-800 rounded-xl font-bold text-xs uppercase outline-none focus:border-yellow-400 cursor-pointer appearance-none"
              >
                <option value="all" className="bg-slate-950 text-slate-400 font-bold">TODOS OS STATUS</option>
                <option value="online" className="bg-slate-950 text-slate-200">SOMENTE ONLINE</option>
                <option value="offline" className="bg-slate-950 text-slate-200">SOMENTE OFFLINE</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Game Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedGameFilter}
                aria-label="Filtrar por Jogo Específico"
                onChange={(e) => setSelectedGameFilter(e.target.value)}
                className="w-full text-slate-200 h-11 px-3 bg-slate-905 border border-slate-800 rounded-xl font-bold text-xs uppercase outline-none focus:border-yellow-400 cursor-pointer appearance-none"
              >
                <option value="all" className="bg-slate-950 text-slate-400">TODOS OS JOGOS (GERAL)</option>
                {LEAD_GAMES.map(opt => (
                  <option key={opt.id} value={opt.id} className="bg-slate-950 text-slate-200">{opt.icon} {opt.name.toUpperCase()}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Dynamic Active Game Filter Badge indicator */}
          {selectedGameFilter !== 'all' && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-500 text-xs font-bold leading-tight animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-sm">👑</span>
                <span>
                  FILTRADO PELO JOGO: <span className="font-extrabold text-white uppercase italic">{getFriendlyGameName(selectedGameFilter).toUpperCase()}</span> - EXIBINDO RANKING INDIVIDUAL DE PONTOS E PATRULHAS CONQUISTADAS NESTES DESAFIOS!
                </span>
              </div>
              <button
                onClick={() => setSelectedGameFilter('all')}
                className="text-[9px] bg-yellow-400 text-slate-950 font-black uppercase px-2 py-1 rounded transition-all hover:bg-yellow-350 cursor-pointer"
              >
                Limpar Filtro
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN BODY AND TAB DISPATCHER */}
      <AnimatePresence mode="wait">
        {/* ==========================================
            A. MEU RANKING PERSONALIZED CARD VIEW
            ========================================== */}
        {activeTab === 'meu_ranking' && (
          <motion.div
            key="meu-ranking-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {syncedCurrentPlayer ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual statistics cards */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Gamer Identity */}
                  <div className="bg-gradient-to-br from-teal-900/10 via-slate-950 to-slate-950 p-6 rounded-3xl border border-teal-500/20 relative shadow-2xl">
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    
                    <div className="text-center space-y-4">
                      {/* Avatar wrap */}
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-teal-500/10 border-2 border-teal-400/30 flex items-center justify-center text-4xl shadow-inner relative overflow-hidden">
                        {syncedCurrentPlayer.avatar?.startsWith('data') || syncedCurrentPlayer.avatar?.startsWith('http') ? (
                          <img src={syncedCurrentPlayer.avatar} alt="Me" className="w-full h-full object-cover" />
                        ) : (
                          syncedCurrentPlayer.avatar || '👷'
                        )}
                      </div>

                      {/* Display Info */}
                      <div>
                        <h2 className="text-lg font-black uppercase italic text-white flex items-center justify-center gap-1.5">
                          {syncedCurrentPlayer.displayName}
                        </h2>
                        <span className="text-[9px] font-mono font-black tracking-widest text-[#10b981] uppercase px-3 py-1 bg-teal-500/10 rounded-full border border-teal-500/20 mt-1 inline-block">
                          PATRULHEIRO OFICIAL Lvl {syncedCurrentPlayer.level}
                        </span>
                      </div>

                      <div className="border-t border-slate-900 pt-3 flex justify-between text-left text-[10px] text-slate-400">
                        <div>
                          <p className="font-bold uppercase tracking-wider text-slate-500">BASE ATUAL</p>
                          <p className="font-black text-white uppercase italic mt-0.5">{syncedCurrentPlayer.base}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold uppercase tracking-wider text-slate-500">TURNO DE CONEXÃO</p>
                          <p className="font-black text-white uppercase italic mt-0.5">{syncedCurrentPlayer.shift}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Positioning Stats */}
                  <div className="bg-slate-950 border border-slate-900 p-6 rounded-3xl space-y-4">
                    <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-teal-400" /> POSICIONAMENTOS OFICIAIS
                    </h3>

                    <div className="space-y-2.5">
                      {/* Global Position */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/50 border border-slate-850">
                        <div className="flex items-center gap-3">
                          <Globe className="text-blue-400 h-5 w-5" />
                          <span className="text-xs font-black text-white uppercase italic">Ranking Global</span>
                        </div>
                        <span className="text-base font-black italic text-yellow-400 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                          #{personalRanks.global || '--'}
                        </span>
                      </div>

                      {/* Base Position */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/50 border border-slate-850">
                        <div className="flex items-center gap-3">
                          <MapPin className="text-teal-400 h-5 w-5" />
                          <span className="text-xs font-black text-white uppercase italic">Ranking por Base</span>
                        </div>
                        <span className="text-base font-black italic text-emerald-400 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                          #{personalRanks.base || '--'}
                        </span>
                      </div>

                      {/* Shift Position */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/50 border border-slate-850">
                        <div className="flex items-center gap-3">
                          <Clock className="text-purple-400 h-5 w-5" />
                          <span className="text-xs font-black text-white uppercase italic">Ranking por Turno</span>
                        </div>
                        <span className="text-base font-black italic text-indigo-400 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                          #{personalRanks.shift || '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score numbers and Breakdown grids */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Aggregate values */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Score Total</span>
                      <span className="text-xl font-black italic text-yellow-400 mt-1 block font-mono">
                        {(syncedCurrentPlayer.totalScore || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Patrulhas Completas</span>
                      <span className="text-xl font-black italic text-blue-400 mt-1 block font-mono">
                        {syncedCurrentPlayer.gamesPlayed || 0}
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Vitórias Multiplayer</span>
                      <span className="text-xl font-black italic text-emerald-450 mt-1 block font-mono">
                        {syncedCurrentPlayer.victories || 0}
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Derrotas Multiplayer</span>
                      <span className="text-xl font-black italic text-rose-455 mt-1 block font-mono">
                        {syncedCurrentPlayer.defeats || 0}
                      </span>
                    </div>

                  </div>

                  {/* Fully formatted 15 Game Grid metrics list */}
                  <div className="bg-slate-950 border border-slate-900 p-6 rounded-3xl">
                    {renderAll15GamesBreakdown(syncedCurrentPlayer)}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center space-y-4 bg-slate-950 rounded-3xl border border-slate-900">
                <BadgeAlert size={40} className="text-slate-600 mx-auto" />
                <p className="text-slate-400 font-bold uppercase text-xs">USUÁRIO NÃO AUTENTICADO</p>
                <p className="text-[10px] text-slate-500">Por favor, acesse as Configurações para validar ou registrar o seu perfil.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ==========================================
            B. INDIVIDUAL RANKINGS (GLOBAL, BASE, TURNO LIST)
            ========================================== */}
        {activeTab !== 'meu_ranking' && activeTab !== 'multiplayer' && (
          <motion.div
            key="individual-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Control panel for master toggle and summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950 p-4.5 rounded-3xl border border-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-full">
              <div className="flex flex-col">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none">PONTUAÇÕES E PARTICIPAÇÕES DETALHADAS</span>
                <span className="text-[10px] font-black text-slate-350 uppercase italic mt-1.5 leading-none">
                  Exibindo {filteredPlayers.length} patrulheiros correspondentes
                </span>
              </div>
              <button
                onClick={() => setShowAllDetails(!showAllDetails)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                  showAllDetails
                    ? 'bg-yellow-400 text-slate-950 border-yellow-400 hover:bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                    : 'bg-slate-900 text-slate-350 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>📊</span> {showAllDetails ? 'Recolher detalhes de todos' : 'Exibir pontos/patrulhas de cada jogo em todos'}
              </button>
            </div>

            {/* 3 Personal Ranking positions shown elegantly to meet user's requirement */}
            {currentPlayer && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950 p-4 rounded-3xl border border-slate-900 shadow-[0_4px_22px_rgba(0,0,0,0.35)] w-full animate-fade-in">
                {/* Global position */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all select-none ${activeTab === 'global' ? 'bg-yellow-400/5 border-yellow-400/40 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : 'bg-slate-900/30 border-slate-850/60 hover:border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <Globe className={`h-4.5 w-4.5 ${activeTab === 'global' ? 'text-yellow-400 animate-pulse' : 'text-blue-400'}`} />
                    <div className="flex flex-col text-left">
                      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider leading-none">SEU POSICIONAMENTO</span>
                      <span className="text-[9.5px] font-black text-white uppercase italic mt-1 leading-none">RANKING GLOBAL</span>
                    </div>
                  </div>
                  <span className={`text-xs font-black italic font-mono px-2.5 py-1 rounded-xl border ${activeTab === 'global' ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]' : 'bg-slate-950 text-yellow-500 border-slate-800'}`}>
                    #{personalRanks.global || '--'}
                  </span>
                </div>

                {/* Base position */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all select-none ${activeTab === 'base' ? 'bg-emerald-400/5 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-slate-900/30 border-slate-850/60 hover:border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <MapPin className={`h-4.5 w-4.5 ${activeTab === 'base' ? 'text-emerald-400 animate-pulse' : 'text-teal-400'}`} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider leading-none">SEU POSICIONAMENTO</span>
                      <span className="text-[9.5px] font-black text-white uppercase italic mt-1 leading-none truncate max-w-[130px]" title={currentPlayer.base}>
                        BASE ({currentPlayer.base || 'N/A'})
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black italic font-mono px-2.5 py-1 rounded-xl border ${activeTab === 'base' ? 'bg-emerald-400 text-slate-950 border-emerald-450 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-slate-950 text-emerald-400 border-slate-800'}`}>
                    #{personalRanks.base || '--'}
                  </span>
                </div>

                {/* Shift position */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all select-none ${activeTab === 'shift' ? 'bg-indigo-400/5 border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'bg-slate-900/30 border-slate-850/60 hover:border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <Clock className={`h-4.5 w-4.5 ${activeTab === 'shift' ? 'text-indigo-400 animate-pulse' : 'text-purple-400'}`} />
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider leading-none">SEU POSICIONAMENTO</span>
                      <span className="text-[9.5px] font-black text-white uppercase italic mt-1 leading-none truncate max-w-[130px]" title={currentPlayer.shift}>
                        TURNO ({currentPlayer.shift?.split(' - ')[0] || 'N/A'})
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black italic font-mono px-2.5 py-1 rounded-xl border ${activeTab === 'shift' ? 'bg-indigo-400 text-slate-950 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'bg-slate-950 text-indigo-400 border-slate-800'}`}>
                    #{personalRanks.shift || '--'}
                  </span>
                </div>
              </div>
            )}

            {/* 1. TOP PODIUM PLACES GRID */}
            {filteredPlayers.length > 0 && !searchQuery.trim() && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3">
                
                {/* 2nd Place */}
                {filteredPlayers[1] && (
                  <div 
                    onClick={() => setExpandedPlayerUid(expandedPlayerUid === filteredPlayers[1].uid ? null : filteredPlayers[1].uid)}
                    className={`relative group flex flex-col items-center p-5 rounded-3xl border text-center transition-all cursor-pointer hover:border-slate-300/35 order-2 md:order-1 ${getPodiumRankStyles(2).card}`}
                  >
                    <div className={getPodiumRankStyles(2).glow} />
                    <span className={`absolute top-4 left-4 text-[9px] font-black px-2.5 py-1 rounded-xl border whitespace-nowrap uppercase tracking-wider ${getPodiumRankStyles(2).badge}`}>
                      🥈 {activeTab === 'base' ? 'TOP 2 DA BASE' : activeTab === 'shift' ? 'TOP 2 DO TURNO' : 'TOP 2 GLOBAL'}
                    </span>
                    
                    {/* Size and layout of avatar */}
                    <div className="relative w-14 h-14 rounded-2xl bg-slate-905 flex items-center justify-center text-3xl border border-slate-700/60 overflow-hidden mt-4 group-hover:scale-105 transition-all">
                      {filteredPlayers[1].avatar?.startsWith('data') || filteredPlayers[1].avatar?.startsWith('http') ? (
                        <img src={filteredPlayers[1].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        filteredPlayers[1].avatar || '👷'
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white italic uppercase tracking-tight mt-3 text-ellipsis truncate max-w-full flex items-center justify-center gap-1.5">
                      <span>{filteredPlayers[1].displayName}</span>
                      {filteredPlayers[1].uid === currentPlayer?.uid && (
                        <span className="text-[7px] bg-yellow-400 text-slate-950 uppercase px-1.5 py-0.5 font-black rounded shrink-0">Eu</span>
                      )}
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {filteredPlayers[1].base} • {filteredPlayers[1].shift}
                    </p>

                    {(() => {
                      const stats = getPlayerFilteredStats(filteredPlayers[1]);
                      return (
                        <>
                          <div className="mt-4 flex flex-col items-center">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{stats.label}</span>
                            <span className="text-xl font-black font-mono italic tracking-tight text-white mt-0.5 flex items-baseline">
                              {(stats.score || 0).toLocaleString()}
                              <span className="text-[10px] font-normal font-sans text-slate-500 not-italic ml-1">PTS</span>
                            </span>
                          </div>

                          <div className="flex gap-4 justify-center text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mt-3.5 border-t border-slate-800/60 pt-3 w-full">
                            <div>
                              <span className="text-yellow-455 italic font-black font-mono">{stats.completions}</span>
                              <span className="text-[8px] text-slate-500 ml-1">PATR</span>
                            </div>
                            <div>
                              <span className="text-emerald-455 italic font-black font-mono">{filteredPlayers[1].victories || 0}</span>
                              <span className="text-[8px] text-slate-500 ml-1">VIT</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <div className="mt-2.5 text-[8.5px] font-black uppercase text-slate-500 hover:text-yellow-400 transition-all bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex items-center justify-center gap-1.5 select-none w-full">
                       <span>📊</span> {expandedPlayerUid === filteredPlayers[1].uid || showAllDetails ? 'OCULTAR JOGOS' : 'VER PONTUAÇÃO POR JOGO'}
                    </div>

                    <AnimatePresence>
                      {(expandedPlayerUid === filteredPlayers[1].uid || showAllDetails) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="overflow-hidden w-full"
                        >
                          {renderAll15GamesBreakdown(filteredPlayers[1])}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 1st Place - Centered Ultimate Winner */}
                {filteredPlayers[0] && (
                  <div 
                    onClick={() => setExpandedPlayerUid(expandedPlayerUid === filteredPlayers[0].uid ? null : filteredPlayers[0].uid)}
                    className={`relative group flex flex-col items-center p-6 rounded-3xl border text-center transition-all cursor-pointer hover:border-yellow-300/35 order-1 md:order-2 ${getPodiumRankStyles(1).card}`}
                  >
                    <div className={getPodiumRankStyles(1).glow} />
                    <span className={`absolute top-4 left-4 text-[9px] font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wider ${getPodiumRankStyles(1).badge}`}>
                      👑 {activeTab === 'base' ? 'TOP 1 DA BASE' : activeTab === 'shift' ? 'TOP 1 DO TURNO' : 'TOP 1 GLOBAL'}
                    </span>
                    
                    {/* Size and layout of big champion avatar */}
                    <div className="relative w-20 h-20 rounded-3xl bg-slate-905 flex items-center justify-center text-5xl border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.25)] overflow-hidden mt-6 group-hover:scale-105 transition-all">
                      {filteredPlayers[0].avatar?.startsWith('data') || filteredPlayers[0].avatar?.startsWith('http') ? (
                        <img src={filteredPlayers[0].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        filteredPlayers[0].avatar || '👷'
                      )}
                    </div>

                    <h3 className="text-base font-black text-yellow-400 italic uppercase tracking-tight mt-4 text-ellipsis truncate max-w-full flex items-center justify-center gap-1.5">
                      <span>{filteredPlayers[0].displayName}</span>
                      {filteredPlayers[0].uid === currentPlayer?.uid && (
                        <span className="text-[7.5px] bg-yellow-400 text-slate-950 uppercase px-1.5 py-0.5 font-black rounded shrink-0">Eu</span>
                      )}
                    </h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {filteredPlayers[0].base} • {filteredPlayers[0].shift}
                    </p>

                    {(() => {
                      const stats = getPlayerFilteredStats(filteredPlayers[0]);
                      return (
                        <>
                          <div className="mt-5 flex flex-col items-center">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest">{stats.label}</span>
                            <span className="text-2xl font-black font-mono italic tracking-tighter text-yellow-400 mt-1 flex items-baseline">
                              {(stats.score || 0).toLocaleString()}
                              <span className="text-[11px] font-normal font-sans text-slate-500 not-italic ml-1">PTS</span>
                            </span>
                          </div>

                          <div className="flex gap-5 justify-center text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mt-4.5 border-t border-slate-800/60 pt-3.5 w-full">
                            <div>
                              <span className="text-yellow-455 italic font-black font-mono">{stats.completions}</span>
                              <span className="text-[8.5px] text-slate-500 ml-1">PATRULHAS</span>
                            </div>
                            <div>
                              <span className="text-emerald-455 italic font-black font-mono">{filteredPlayers[0].victories || 0}</span>
                              <span className="text-[8.5px] text-slate-500 ml-1">VITÓRIAS</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <div className="mt-2.5 text-[8.5px] font-black uppercase text-slate-500 hover:text-yellow-400 transition-all bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex items-center justify-center gap-1.5 select-none w-full">
                      <span>📊</span> {expandedPlayerUid === filteredPlayers[0].uid || showAllDetails ? 'OCULTAR JOGOS' : 'VER PONTUAÇÃO POR JOGO'}
                    </div>

                    <AnimatePresence>
                      {(expandedPlayerUid === filteredPlayers[0].uid || showAllDetails) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="overflow-hidden w-full"
                        >
                          {renderAll15GamesBreakdown(filteredPlayers[0])}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 3rd Place */}
                {filteredPlayers[2] && (
                  <div 
                    onClick={() => setExpandedPlayerUid(expandedPlayerUid === filteredPlayers[2].uid ? null : filteredPlayers[2].uid)}
                    className={`relative group flex flex-col items-center p-5 rounded-3xl border text-center transition-all cursor-pointer hover:border-amber-600/35 order-3 md:order-3 ${getPodiumRankStyles(3).card}`}
                  >
                    <div className={getPodiumRankStyles(3).glow} />
                    <span className={`absolute top-4 left-4 text-[9px] font-black px-2.5 py-1 rounded-xl border whitespace-nowrap uppercase tracking-wider ${getPodiumRankStyles(3).badge}`}>
                      🥉 {activeTab === 'base' ? 'TOP 3 DA BASE' : activeTab === 'shift' ? 'TOP 3 DO TURNO' : 'TOP 3 GLOBAL'}
                    </span>
                    
                    {/* Size and layout of avatar */}
                    <div className="relative w-14 h-14 rounded-2xl bg-slate-905 flex items-center justify-center text-3xl border border-slate-750 overflow-hidden mt-4 group-hover:scale-105 transition-all">
                      {filteredPlayers[2].avatar?.startsWith('data') || filteredPlayers[2].avatar?.startsWith('http') ? (
                        <img src={filteredPlayers[2].avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        filteredPlayers[2].avatar || '👷'
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white italic uppercase tracking-tight mt-3 text-ellipsis truncate max-w-full flex items-center justify-center gap-1.5">
                      <span>{filteredPlayers[2].displayName}</span>
                      {filteredPlayers[2].uid === currentPlayer?.uid && (
                        <span className="text-[7px] bg-yellow-400 text-slate-950 uppercase px-1.5 py-0.5 font-black rounded shrink-0">Eu</span>
                      )}
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {filteredPlayers[2].base} • {filteredPlayers[2].shift}
                    </p>

                    {(() => {
                      const stats = getPlayerFilteredStats(filteredPlayers[2]);
                      return (
                        <>
                          <div className="mt-4 flex flex-col items-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stats.label}</span>
                            <span className="text-xl font-black font-mono italic tracking-tight text-white mt-0.5 flex items-baseline">
                              {(stats.score || 0).toLocaleString()}
                              <span className="text-[10px] font-normal font-sans text-slate-550 not-italic ml-1">PTS</span>
                            </span>
                          </div>

                          <div className="flex gap-4 justify-center text-[10.5px] text-slate-400 font-bold uppercase tracking-wider mt-3.5 border-t border-slate-800/60 pt-3 w-full">
                            <div>
                              <span className="text-yellow-450 italic font-black font-mono">{stats.completions}</span>
                              <span className="text-[8px] text-slate-500 ml-1">PATR</span>
                            </div>
                            <div>
                              <span className="text-emerald-455 italic font-black font-mono">{filteredPlayers[2].victories || 0}</span>
                              <span className="text-[8px] text-slate-500 ml-1">VIT</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <div className="mt-2.5 text-[8.5px] font-black uppercase text-slate-400 hover:text-yellow-400 transition-all bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/50 flex items-center justify-center gap-1.5 select-none w-full">
                      <span>📊</span> {expandedPlayerUid === filteredPlayers[2].uid || showAllDetails ? 'OCULTAR JOGOS' : 'VER PONTUAÇÃO POR JOGO'}
                    </div>

                    <AnimatePresence>
                      {(expandedPlayerUid === filteredPlayers[2].uid || showAllDetails) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          className="overflow-hidden w-full"
                        >
                          {renderAll15GamesBreakdown(filteredPlayers[2])}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

              </div>
            )}

            {/* 2. REGULAR SCALAR TABLELIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPlayers.length > 0 ? (
                // Display remaining or all (if search query hides podium)
                filteredPlayers.map((p, idx) => {
                  const numPosition = idx + 1;
                  
                  // Render all matched players continuously starting from rank #1 so the list is never empty or missing items
                  const isMe = p.uid === currentPlayer?.uid;
                  const styling = getPodiumRankStyles(numPosition);

                  return (
                    <motion.div
                      key={p.uid}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setExpandedPlayerUid(expandedPlayerUid === p.uid ? null : p.uid)}
                      className={`relative overflow-hidden group flex flex-col p-4 md:p-6 rounded-2xl border transition-all cursor-pointer hover:border-slate-800 ${isMe ? 'bg-yellow-400/5 border-yellow-400/50 hover:border-yellow-400' : 'bg-slate-950 border-slate-900'} w-full gap-3 ${idx < 2 ? 'lg:col-span-3' : 'lg:col-span-1'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        {/* Left Group */}
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Position Badge */}
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border uppercase shrink-0 ${numPosition === 1 ? 'bg-yellow-400 text-slate-900 border-yellow-500' : numPosition === 2 ? 'bg-slate-300 text-slate-950 border-slate-400' : numPosition === 3 ? 'bg-amber-600 text-white border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-805'}`}>
                            {numPosition}
                          </span>

                          {/* Avatar block with status line */}
                          <div className="relative w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-xl border border-slate-800 overflow-hidden shrink-0">
                            {p.avatar?.startsWith('data') || p.avatar?.startsWith('http') ? (
                              <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              p.avatar || '👷'
                            )}
                            
                            {/* Neon online dot indicator */}
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-2 border-slate-950 rounded-full flex shrink-0">
                              <span className={`h-full w-full rounded-full ${p.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            </span>
                          </div>

                          {/* Profile identifiers */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-left">
                              <h4 className={`font-black uppercase italic text-xs md:text-sm leading-tight truncate md:max-w-none ${isMe ? 'text-yellow-400' : 'text-slate-100'}`}>
                                {p.displayName}
                              </h4>
                              {isMe && <span className="text-[7.5px] bg-yellow-400 text-slate-950 uppercase px-1.5 font-bold rounded">Eu</span>}
                              
                              <span className="text-[8.5px] font-black text-blue-400 uppercase py-0.5 px-1.5 bg-slate-900 rounded border border-slate-805 leading-none">
                                Lvl {p.level}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                {(expandedPlayerUid === p.uid || showAllDetails) ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                              </div>
                            </div>
                            <p className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                              {p.base} • {p.shift}
                            </p>
                          </div>
                        </div>

                        {/* Stats Row */}
                        {(() => {
                          const stats = getPlayerFilteredStats(p);
                          return (
                            <div className="flex items-center justify-between sm:justify-end gap-5 flex-wrap border-t border-slate-900 pt-2 sm:border-0 sm:pt-0 shrink-0 font-sans">
                              {/* Points */}
                              <div className="flex flex-col items-start sm:items-end min-w-[70px]">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none font-sans uppercase">
                                  {stats.isFiltered ? `${stats.gameIcon} ${stats.label}` : 'SCORE GERAL'}
                                </span>
                                <span className={`text-base font-black font-mono italic tracking-tight mt-1 leading-none ${numPosition === 1 ? 'text-yellow-400' : 'text-slate-200'}`}>
                                  {(stats.score || 0).toLocaleString()}
                                </span>
                              </div>

                              {/* Patrols */}
                              <div className="flex flex-col items-start sm:items-end min-w-[60px]">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                  {stats.isFiltered ? `${stats.gameIcon} PATRULHAS` : 'PATRULHAS GERAIS'}
                                </span>
                                <span className="text-xs font-black font-mono italic text-blue-400 mt-1 leading-none">
                                  {stats.completions}
                                </span>
                              </div>

                              {/* Completed Partidas */}
                              <div className="flex flex-col items-start sm:items-end min-w-[60px]">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">PARTIDAS</span>
                                <span className="text-xs font-black font-mono italic text-indigo-400 mt-1 leading-none">{p.completedGames || 0}</span>
                              </div>

                              {/* Wins */}
                              <div className="flex flex-col items-start sm:items-end min-w-[50px]">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">VITÓRIAS</span>
                                <span className="text-xs font-black font-mono italic text-emerald-400 mt-1 leading-none">{p.victories || 0}</span>
                              </div>

                              {/* Defeats */}
                              <div className="flex flex-col items-start sm:items-end min-w-[50px]">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">DERROTAS</span>
                                <span className="text-xs font-black font-mono italic text-rose-450 mt-1 leading-none">{p.defeats || 0}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Expandable all-games stats list */}
                      <AnimatePresence>
                        {(expandedPlayerUid === p.uid || showAllDetails) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="overflow-hidden w-full"
                          >
                            {renderAll15GamesBreakdown(p)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center space-y-4 bg-slate-950 rounded-3xl border border-slate-900">
                  <div className="bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-800">
                    <Users className="text-slate-650" size={24} />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[9.5px]">
                    Nenhum jogador corresponde aos parâmetros de pesquisa filtrados
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ==========================================
            C. MULTIPLAYER DUELS TAB RENDER
            ========================================== */}
        {/* Multiplayer 2P tab disabled */}
        {false && (
          <motion.div
            key="multiplayer-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Inline Mini-toggle subtabs */}
            <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-900 w-full max-w-md mx-auto">
              <button
                onClick={() => setSubTab2p('ranking')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all leading-none ${subTab2p === 'ranking' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-350 bg-transparent'}`}
              >
                Classificação 2P
              </button>
              <button
                onClick={() => setSubTab2p('history')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all leading-none ${subTab2p === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-350 bg-transparent'}`}
              >
                Historial de Duelos
              </button>
            </div>

            <AnimatePresence mode="wait">
              {subTab2p === 'ranking' ? (
                /* 2P Aggregated Ranking table */
                <motion.div
                  key="2p-rank-block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {calculated2PLeaderboard.length > 0 ? (
                    calculated2PLeaderboard.map((item: any, idx: number) => {
                      const positionNum = idx + 1;
                      const isMe = item.uid === currentPlayer?.uid;

                      return (
                        <div 
                          key={item.uid}
                          className={`flex items-center gap-4 p-4 rounded-2xl border ${isMe ? 'bg-yellow-400/5 border-yellow-400/40' : 'bg-slate-950 border-slate-900'} w-full text-left`}
                        >
                          <span className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center text-[10px] font-black border uppercase shrink-0 ${positionNum === 1 ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400'}`}>
                            {positionNum}
                          </span>

                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-xl border border-slate-800 overflow-hidden shrink-0">
                            {item.avatar?.startsWith('data') || item.avatar?.startsWith('http') ? (
                              <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.avatar || '👷'
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-white uppercase italic text-sm leading-tight truncate">
                              {item.displayName}
                              {isMe && <span className="text-[7.5px] bg-yellow-400 text-slate-950 uppercase px-1.5 ml-1.5 rounded font-black">Eu</span>}
                            </h4>
                            <p className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                              <span className="text-indigo-400 font-extrabold">{item.duelsPlayed} DUELOS JOGADOS</span>
                              <span>•</span>
                              <span className="text-emerald-450 font-extrabold">{item.wins} VITÓRIAS</span>
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end shrink-0 leading-none">
                            <span className="text-lg font-black font-mono italic tracking-tight text-indigo-400">
                              {(item.totalScore || 0).toLocaleString()}
                            </span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">SOMA XP</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-slate-950 rounded-3xl border border-slate-900">
                      <Swords className="text-slate-700 mx-auto" size={36} />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[9.5px]">Nenhum duelo registrado em tempo real ainda</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Recent Match duels feed */
                <motion.div
                  key="2p-history-block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3.5"
                >
                  {duels.length > 0 ? (
                    duels.map((match: any) => {
                      const p1Won = match.p1Score > match.p2Score;
                      const p2Won = match.p2Score > match.p1Score;
                      const isDraw = match.p1Score === match.p2Score;

                      return (
                        <div 
                          key={match.id}
                          className="bg-slate-950 border border-slate-900 p-4.5 rounded-3xl flex flex-col gap-3.5 relative overflow-hidden text-left"
                        >
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                            <span className="text-[8.5px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {getFriendlyGameName(match.gameType)}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-slate-650">
                              {match.timestamp ? new Date(match.timestamp).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            {/* Player 1 */}
                            <div className="flex items-center gap-3 max-w-[45%]">
                              <div className={`w-9 h-9 rounded-xl overflow-hidden border shrink-0 ${p1Won ? 'border-amber-400/80 bg-amber-400/5' : 'border-slate-800'}`}>
                                {match.player1Avatar?.startsWith('data') || match.player1Avatar?.startsWith('http') ? (
                                  <img src={match.player1Avatar} alt="Q" className="w-full h-full object-cover" />
                                ) : (
                                  match.player1Avatar || '👷'
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white uppercase italic truncate">
                                  {match.player1Name}
                                </p>
                                <span className="text-[11px] font-black text-slate-400 font-mono block mt-0.5">
                                  {match.p1Score || 0} <span className="text-[8px] font-normal text-slate-600 font-sans">XP</span>
                                </span>
                              </div>
                            </div>

                            {/* VS separator */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-705 italic leading-none">VS</span>
                              {isDraw && <span className="text-[6.5px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-1 py-0.5 rounded uppercase mt-0.5 leading-none">EMPATE</span>}
                            </div>

                            {/* Player 2 */}
                            <div className="flex items-center gap-3 max-w-[45%] text-right justify-end">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white uppercase italic truncate">
                                  {match.player2Name}
                                </p>
                                <span className="text-[11px] font-black text-slate-400 font-mono block mt-0.5">
                                  {match.p2Score || 0} <span className="text-[8px] font-normal text-slate-600 font-sans">XP</span>
                                </span>
                              </div>
                              <div className={`w-9 h-9 rounded-xl overflow-hidden border shrink-0 ${p2Won ? 'border-amber-400/80 bg-amber-400/5' : 'border-slate-800'}`}>
                                {match.player2Avatar?.startsWith('data') || match.player2Avatar?.startsWith('http') ? (
                                  <img src={match.player2Avatar} alt="Y" className="w-full h-full object-cover" />
                                ) : (
                                  match.player2Avatar || '👷'
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={`text-center text-[8px] font-black uppercase tracking-wider pt-2 border-t border-slate-900 ${isDraw ? 'text-slate-500' : 'text-yellow-400'}`}>
                            {isDraw ? 'CONFRONTO SEM VENCEDORES' : p1Won ? `VITORIOSO: ${match.player1Name} 🏆` : `VITORIOSO: ${match.player2Name} 🏆`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center space-y-4 bg-slate-950 rounded-3xl border border-slate-900">
                      <Gamepad2 className="text-slate-700 mx-auto" size={32} />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[9.5px]">Nenhum duelo de histórico disponível</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
