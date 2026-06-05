/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { Home } from './components/Home';
import { BottomNav } from './components/BottomNav';
import { GameType } from './types';
import { doc, updateDoc, increment, collection, addDoc, getDoc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { getThemeSettings, applyTheme } from './lib/theme';
import { createNotification } from './lib/notifications';
import { Bell, Gamepad2, Shield, Trash2, Compass, RefreshCw, Clock, Ban, X } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';

import { SafetyCenterModal } from './components/SafetyCenterModal';
// Lazy load heavy or secondary components
const Leaderboard = lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const NotificationsPage = lazy(() => import('./components/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Quiz = lazy(() => import('./components/Quiz').then(m => ({ default: m.Quiz })));
const QuizMasterAPH = lazy(() => import('./components/QuizMasterAPH').then(m => ({ default: m.QuizMasterAPH })));
const Hangman = lazy(() => import('./components/Hangman').then(m => ({ default: m.Hangman })));
const WordSearch = lazy(() => import('./components/WordSearch').then(m => ({ default: m.WordSearch })));
const WordGuess = lazy(() => import('./components/WordGuess').then(m => ({ default: m.WordGuess })));
const NumberColorGame = lazy(() => import('./components/NumberColorGame').then(m => ({ default: m.NumberColorGame })));
const MemoryGame = lazy(() => import('./components/MemoryGame').then(m => ({ default: m.MemoryGame })));
const ReactionGame = lazy(() => import('./components/ReactionGame').then(m => ({ default: m.ReactionGame })));
const SpeedMath = lazy(() => import('./components/SpeedMath').then(m => ({ default: m.SpeedMath })));
const RouteOrder = lazy(() => import('./components/RouteOrder').then(m => ({ default: m.RouteOrder })));
const ParkingEscape = lazy(() => import('./components/ParkingEscape').then(m => ({ default: m.ParkingEscape })));
const TicTacToe = lazy(() => import('./components/TicTacToe').then(m => ({ default: m.TicTacToe })));
const QueensGame = lazy(() => import('./components/QueensGame').then(m => ({ default: m.QueensGame })));
const Palavras500 = lazy(() => import('./components/Palavras500').then(m => ({ default: m.Palavras500 })));
const ContextoGame = lazy(() => import('./components/ContextoGame').then(m => ({ default: m.ContextoGame })));
const SudokuGame = lazy(() => import('./components/SudokuGame').then(m => ({ default: m.SudokuGame })));
const DamaGame = lazy(() => import('./components/DamaGame').then(m => ({ default: m.DamaGame })));
const GamesGrid = lazy(() => import('./components/GamesGrid').then(m => ({ default: m.GamesGrid })));

export default function App() {
  const { 
    user, 
    player, 
    loading, 
    loginWithGoogle, 
    loginWithProfile, 
    loginWithEmailString,
    createLocalProfile, 
    createProfile, 
    updateProfile, 
    logout,
    deleteProfile
  } = useAuth();
  const [view, setView] = useState<'home' | 'leaderboard' | 'settings' | 'multiplayer' | 'notifications' | GameType>('home');
  const [isDeletedScreen, setIsDeletedScreen] = useState(false);
  const [activePatrolResult, setActivePatrolResult] = useState<{
    score: number;
    gameType: string;
    isMultiplayer: boolean;
    isTimeout: boolean;
    roundsPlayed: number;
    isAbandoned?: boolean;
  } | null>(null);
  const [gameSessionId, setGameSessionId] = useState(0);

  // Centralized real-time listener for administrator WhatsApp contact
  const [adminSettings, setAdminSettings] = useState<{ whatsappAdmin?: string }>({ whatsappAdmin: '5511999999999' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'appSettings'), (snap) => {
      if (snap.exists()) {
        setAdminSettings(snap.data());
      }
    }, (err) => {
      console.warn("Error listening to appSettings config:", err);
      if (err instanceof Error && err.message.toLowerCase().includes('quota')) {
        localStorage.setItem('firestore_quota_exceeded', 'true');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    setSessionScore(0);
  }, [player?.uid]);

  // Monitor when view changes to a game type, in order to increment patrols count on entry!
  const lastIncrementedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (player && view && Object.values(GameType).includes(view as any)) {
      if (lastIncrementedViewRef.current !== view) {
        lastIncrementedViewRef.current = view;

        const gameKey = view as string;
        const currentStats = player.gameStats || {};
        const gameStatObj = currentStats[gameKey] || { score: 0, completions: 0 };
        const newGamesPlayed = (player.gamesPlayed || 0) + 1;
        
        const updatedGameStats = {
          ...currentStats,
          [gameKey]: {
            ...gameStatObj,
            completions: (gameStatObj.completions || 0) + 1
          }
        };

        (async () => {
          try {
            await updateProfile({
              gamesPlayed: newGamesPlayed,
              gameStats: updatedGameStats
            });
          } catch (err) {
            console.warn("Failed to increment patrol count on game enter:", err);
          }
        })();
      }
    } else if (view && !Object.values(GameType).includes(view as any)) {
      lastIncrementedViewRef.current = null;
    }
  }, [view, player?.uid, updateProfile]);

  // Sync user profile state changes including edits and newly obtained avatars into saved profiles list for rapid 1-click access
  useEffect(() => {
    if (player && player.uid && player.email) {
      const savedPass = localStorage.getItem('last_auth_password');
      if (savedPass) {
        try {
          const profilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
          const profiles = JSON.parse(profilesStr);
          const filtered = profiles.filter((p: any) => p.email.toLowerCase() !== player.email.toLowerCase());
          
          filtered.unshift({
            uid: player.uid,
            email: player.email,
            password: savedPass,
            displayName: player.displayName,
            avatar: player.avatar || null,
            base: player.base || 'Base 01',
            shift: player.shift || 'Turno A',
            praca: (player as any).praca || (player as any).praça || 'Não Aplicável'
          });
          
          localStorage.setItem('roplay_saved_profiles', JSON.stringify(filtered));
        } catch (e) {
          console.warn("Failed to update saved profile in local storage:", e);
        }
      }
    }
  }, [player]);
  const [sessionScore, setSessionScore] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    totalScore: 0,
    totalXP: 0,
    gamesPlayed: 0,
    completedGames: 0,
    timedOutGames: 0
  });

  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const checkQuota = () => {
      setIsQuotaExceeded(localStorage.getItem('firestore_quota_exceeded') === 'true');
    };
    checkQuota();
    const interval = setInterval(checkQuota, 3000);
    window.addEventListener('storage', checkQuota);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkQuota);
    };
  }, []);

  // Global Realtime listener for aggregated players' metrics
  useEffect(() => {
    if (!user) {
      setGlobalStats({
        totalScore: 0,
        totalXP: 0,
        gamesPlayed: 0,
        completedGames: 0,
        timedOutGames: 0
      });
      return;
    }
    const q = query(collection(db, 'players'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sumScore = 0;
      let sumXP = 0;
      let sumGames = 0;
      let sumCompleted = 0;
      let sumTimedOut = 0;

      snapshot.forEach((docRef) => {
        const data = docRef.data();
        
        // Extract totalScore robustly
        const score = typeof data.totalScore === 'string' 
          ? parseFloat(data.totalScore) 
          : (data.totalScore !== undefined ? data.totalScore : (data.pontos || data.scoreTotal || 0));

        // Extract nested stats
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
        
        const finalScore = Math.max(score, statsScoreSum);

        const gamesStr = typeof data.gamesPlayed === 'string' 
          ? parseInt(data.gamesPlayed, 10) 
          : (data.gamesPlayed !== undefined ? data.gamesPlayed : (data.patrulhas || 0));
        const finalGames = Math.max(gamesStr, statsGamesSum);

        const rawCompleted = typeof data.completedGames === 'string' 
          ? parseInt(data.completedGames, 10) 
          : (data.completedGames !== undefined && data.completedGames !== null ? Number(data.completedGames) : (data.partidas !== undefined && data.partidas !== null ? Number(data.partidas) : 0));
        const completedStr = isNaN(rawCompleted) ? 0 : rawCompleted;

        const rawTimedOut = typeof data.timedOutGames === 'string' 
          ? parseInt(data.timedOutGames, 10) 
          : (data.timedOutGames !== undefined && data.timedOutGames !== null ? Number(data.timedOutGames) : (data.excedidas !== undefined && data.excedidas !== null ? Number(data.excedidas) : 0));
        const timedOutStr = isNaN(rawTimedOut) ? 0 : rawTimedOut;

        sumScore += finalScore;
        const rawXp = typeof data.xp === 'string'
          ? parseFloat(data.xp)
          : (data.xp !== undefined && data.xp !== null ? Number(data.xp) : 0);
        sumXP += isNaN(rawXp) ? (finalScore / 2) : Math.max(rawXp, finalScore / 2);

        sumGames += finalGames;
        sumCompleted += completedStr;
        sumTimedOut += timedOutStr;
      });

      setGlobalStats({
        totalScore: sumScore,
        totalXP: sumXP,
        gamesPlayed: sumGames,
        completedGames: sumCompleted,
        timedOutGames: sumTimedOut
      });
    }, (err) => {
      console.warn("Failed to listen to global player stats:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Global Realtime listener for unread notifications count
  useEffect(() => {
    if (!player?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', player.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.warn("Error receiving unread notifications counts:", err);
    });

    return () => unsubscribe();
  }, [player?.uid]);

  const [showRegistration, setShowRegistration] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<any | null>(null);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);

  // Global Realtime listener for direct match invitations
  useEffect(() => {
    return; // Completamente desativado para remover o multiplayer do aplicativo
    if (!player?.uid) return;

    const q = query(
      collection(db, 'invitations'),
      where('receiverId', '==', player.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invites: any[] = [];
      snapshot.forEach((docSnap) => {
        invites.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (invites.length > 0) {
        setIncomingInvite(invites[0]);
      } else {
        setIncomingInvite(null);
      }
    }, (err) => {
      console.warn("Error listening to invitations in real-time:", err);
    });

    return () => unsubscribe();
  }, [player?.uid]);

  // Global Realtime listener for active room updates
  useEffect(() => {
    return; // Completamente desativado para remover o multiplayer do aplicativo
    if (!activeRoom?.id) return;

    const roomRef = doc(db, 'multiplayer_rooms', activeRoom.id);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setActiveRoom(null);
        if (Object.values(GameType).includes(view as any)) {
          setView('home');
        }
        return;
      }
      const roomData: any = { id: snapshot.id, ...snapshot.data() };
      setActiveRoom(roomData);

      if (roomData.abandonedBy && roomData.abandonedBy !== player?.uid) {
        setActiveRoom(null);
        setView('home');
        return;
      }

      if (roomData.status === 'ready' || roomData.status === 'playing') {
        if (roomData.gameType && view !== roomData.gameType) {
          setView(roomData.gameType);
        }
      }
    }, (err) => {
      console.warn("Error listening to active room:", err);
    });

    return () => unsubscribe();
  }, [activeRoom?.id, view, player?.uid]);

  const getFriendlyGameName = (game: string) => {
    switch (game) {
      case 'QUIZ_MASTER_APH': return 'Quiz Master APH';
      case 'TIC_TAC_TOE': return 'Jogo da Velha';
      case 'QUIZ': return 'Super Quiz';
      case 'HANGMAN': return 'Forca';
      case 'WORD_SEARCH': return 'Caça-Palavras';
      case 'WORD_GUESS': return 'Código Secreto';
      case 'NUMBER_GUESS': return 'Adivinhação';
      case 'MEMORY': return 'Memória';
      case 'REACTION': return 'Reflexo';
      case 'SPEED_MATH': return 'Cálculo Rápido';
      case 'ROUTE_ORDER': return 'Trajeto';
      case 'PARKING_ESCAPE': return 'Escape';
      case 'QUEENS': return 'Queens';
      case 'PALAVRAS_500': return 'Palavras 500';
      case 'CONTEXTO': return 'Contexto';
      case 'DAMA': return 'Jogo de Dama';
      default: return 'Patrulha Ativa';
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    try {
      const inviteRef = doc(db, 'invitations', invite.id);
      await updateDoc(inviteRef, { status: 'accepted' });

      const roomRef = doc(db, 'multiplayer_rooms', invite.roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        await updateDoc(roomRef, {
          status: 'ready',
          partnerId: player.uid,
          partnerName: player.displayName,
          partnerAvatar: player.avatar || '👷',
          partnerBase: player.base || '',
          partnerShift: player.shift || '',
          turn: 'creator' // Creator starts
        });

        // Also add an invite_accepted notification for the sender!
        if (roomData.creatorId) {
          const notiId = `noti_${Date.now()}_accepted`;
          const gameFriendly = getFriendlyGameName(roomData.gameType || 'TIC_TAC_TOE');
          await setDoc(doc(db, 'notifications', notiId), {
            id: notiId,
            recipientId: roomData.creatorId,
            title: "Duelo Aceito! 💥",
            message: `${player.displayName} aceitou o seu convite de duelo para o jogo "${gameFriendly}". Que vença o melhor!`,
            type: "invite_accepted",
            timestamp: new Date().toISOString(),
            read: false,
            senderId: player.uid,
            senderName: player.displayName,
            senderAvatar: player.avatar || '👷'
          });
        }

        setActiveRoom({ id: invite.roomId, ...roomData });
        setIncomingInvite(null);
        setView(roomData.gameType);
      }
    } catch (e) {
      console.warn("Error accepting invite:", e);
    }
  };

  const handleDeclineInvite = async (invite: any) => {
    try {
      const inviteRef = doc(db, 'invitations', invite.id);
      await updateDoc(inviteRef, { status: 'declined' });
      setIncomingInvite(null);

      let senderId = invite.senderId;
      let gameType = invite.gameType;

      if (!senderId || !gameType) {
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const data = inviteSnap.data();
          senderId = data.senderId;
          gameType = data.gameType;
        }
      }

      if (senderId) {
        const notiId = `noti_${Date.now()}_declined`;
        const gameFriendly = getFriendlyGameName(gameType || 'TIC_TAC_TOE');
        await setDoc(doc(db, 'notifications', notiId), {
          id: notiId,
          recipientId: senderId,
          title: "Duelo Recusado ❌",
          message: `${player.displayName} recusou o seu convite de duelo para o jogo "${gameFriendly}".`,
          type: "invite_declined",
          timestamp: new Date().toISOString(),
          read: false,
          senderId: player.uid,
          senderName: player.displayName,
          senderAvatar: player.avatar || '👷'
        });
      }
    } catch (e) {
      console.warn("Error declining invite:", e);
    }
  };

  const handleLeaveSession = async () => {
    if (activeRoom?.id) {
      try {
        const roomRef = doc(db, 'multiplayer_rooms', activeRoom.id);
        await updateDoc(roomRef, { status: 'completed', abandonedBy: player.uid });
      } catch (e) {}
    }
    setActiveRoom(null);
    setView('home');
  };

  useEffect(() => {
    const config = getThemeSettings();
    applyTheme(config);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
           className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"
         />
      </div>
    );
  }

  if (isDeletedScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
        {/* Ambient red flare blur background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 border-2 border-red-500/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative"
        >
          {/* Visual deleted indicator icon */}
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center text-red-400 shadow-md">
            <Trash2 size={28} />
          </div>

          <div className="space-y-2">
            <div className="inline-block bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 font-black uppercase text-[9px] tracking-wider rounded-lg">
              SISTEMA RESETADO
            </div>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
              Conta excluída com sucesso.
            </h2>
            <p className="text-slate-400 font-medium text-xs leading-relaxed">
              Todos os seus dados (e-mail, perfil, estatísticas de jogo e registros de ranking) foram apagados definitivamente de nossa base de dados.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                localStorage.setItem('auth_default_tab', 'register');
                setIsDeletedScreen(false);
              }}
              className="w-full h-12 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-yellow-500/10 border-none"
            >
              <span>Criar nova conta</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                localStorage.setItem('auth_default_tab', 'login');
                setIsDeletedScreen(false);
              }}
              className="w-full h-12 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <span>Entrar com outro email</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <AuthScreen 
          onLoginWithEmail={loginWithEmailString} 
          onCreateProfile={createLocalProfile} 
        />
      </div>
    );
  }

  // Blocking check for non-approved accounts with real-time reactive support and custom WhatsApp formatting
  const isUserAdmin = player?.email?.toLowerCase() === 'lgngregorio@icloud.com';
  const playerStatus = player?.statusConta || (isUserAdmin ? 'aprovado' : 'pendente');

  if (player && playerStatus !== 'aprovado' && !isUserAdmin) {
    if (!localStorage.getItem(`safety_accepted_${player.uid}`)) {
        return <SafetyCenterModal onAccept={() => {
            localStorage.setItem(`safety_accepted_${player.uid}`, 'true');
            // Force re-render to proceed (or just toggle state) - here I will make it reload view or something? 
            // Actually just refresh the component by setting a trigger?
            // Actually I'll set showSafetyModal to false and let the rest of component render.
            // Since this is in the middle of app render, I can't easily force re-render, 
            // but the conditional check might be enough if I change render structure.
            // Actually, I should probably just set the flag and re-render.
            window.location.reload(); 
        }} />;
    }
    const rawWhatsapp = adminSettings.whatsappAdmin || '5511999999999';
    const whatsappMsg = `Olá, Administrador.
Solicito aprovação de acesso para o meu cadastro no RodoPlay.
Identificação/Apelido: ${player.displayName || ''}
Email: ${player.email || ''}
Base: ${player.base || ''}
Turno: ${player.shift || ''}
Data de Cadastro: ${player.createdAt ? new Date(player.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
No aguardo da liberação corporativa.`;

    const whatsappLink = `https://api.whatsapp.com/send?phone=${rawWhatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(whatsappMsg)}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Glowing particle sphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_50%)]" />
        <div className="absolute inset-x-0 top-0 h-24 hazard-stripe opacity-50" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl border-2 border-slate-800 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative z-10 text-center space-y-6"
        >
          {playerStatus === 'pendente' && (
            <>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="w-16 h-16 rounded-2xl bg-yellow-450/10 border-2 border-yellow-450 text-yellow-400 flex items-center justify-center relative">
                    <Clock size={32} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-yellow-400/10 text-yellow-500 px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-500/20">
                  ⌛ CADASTRO EM ANÁLISE
                </span>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">AGUARDANDO LIBERAÇÃO</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold uppercase">
                  Seu cadastro foi enviado com sucesso para análise do administrador. Você será liberado para acessar o aplicativo em breve.
                </p>
              </div>

              {/* Data Summary Grid */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-left space-y-2 text-[11px] font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>Apelido:</span>
                  <span className="font-bold text-white uppercase">{player.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span>E-mail:</span>
                  <span className="font-bold text-white lowercase">{player.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sua Base:</span>
                  <span className="font-bold text-yellow-400 uppercase">{player.base}</span>
                </div>
                <div className="flex justify-between">
                  <span>Seu Turno:</span>
                  <span className="font-bold text-yellow-400 uppercase">{player.shift}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-98"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.058 5.386 5.396.048 11.971.048c3.186.001 6.182 1.24 8.435 3.496 2.253 2.256 3.491 5.253 3.491 8.438 0 6.585-5.338 11.924-11.916 11.924-2.001 0-3.974-.5-5.729-1.45L0 24zm6.59-4.846c1.6.95 3.473 1.452 5.378 1.453 5.485 0 9.94-4.46 9.943-9.949 0-2.658-1.034-5.158-2.91-7.038l-.001-.001C17.135 1.74 14.639.707 11.974.707c-5.486 0-9.94 4.46-9.943 9.95 0 1.996.52 3.945 1.503 5.679L2.52 21.46l5.127-1.306z"/>
                  </svg>
                  <span>Solicitar Aprovação Rápida</span>
                </a>

                <button
                  onClick={() => logout()}
                  className="w-full h-12 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  <span>Sair da Conta</span>
                </button>
              </div>
            </>
          )}

          {playerStatus === 'bloqueado' && (
            <>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border-2 border-red-500 text-red-500 flex items-center justify-center relative">
                    <Ban size={32} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-red-400/10 text-red-500 px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">
                  🚫 ACESSO RESTRITO
                </span>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">CONTA BLOQUEADA</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold uppercase">
                  Seu login ao aplicativo corporativo RodoPlay foi temporariamente bloqueado pelo administrador. Entre em contato com a equipe de supervisão da sua base para regularização.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => logout()}
                  className="w-full h-14 bg-slate-800 hover:bg-slate-750 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Voltar para Login</span>
                </button>
              </div>
            </>
          )}

          {playerStatus === 'rejeitado' && (
            <>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border-2 border-orange-500 text-orange-400 flex items-center justify-center relative">
                    <X size={32} className="stroke-[2.5]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-orange-400/10 text-orange-400 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-500/20">
                  ⚠️ CADASTRO REJEITADO
                </span>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">CADASTRO REJEITADO</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold uppercase">
                  Infelizmente o seu cadastro corporativo foi rejeitado pelo administrador. Você pode criar um novo cadastro revisando suas credenciais de base e turno ou falar com o suporte.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => logout()}
                  className="w-full h-14 bg-slate-800 hover:bg-slate-750 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Criar Novo Cadastro</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const handleScoreUpdate = (points: number) => {
    setSessionScore(prev => prev + points);
  };

  const handleGameComplete = async (
    score: number, 
    roundsPlayed = 1, 
    isMultiplayer = false,
    partner?: any,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout = false,
    keepInGameSelection = false,
    isAbandoned = false
  ) => {
    if (roundsPlayed <= 0 || !player) {
      setSessionScore(0);
      setView('multiplayer');
      return;
    }

    const finalP1Score = isMultiplayer && p1Score !== undefined ? p1Score : score;
    const resolvedGameType = gameType || (Object.values(GameType).includes(view as any) ? view as string : 'TIC_TAC_TOE');
    
    // IMMEDIATE STATE UPDATE: Show the completion screen instantly!
    if (!keepInGameSelection) {
      setActivePatrolResult({
        score: finalP1Score,
        gameType: resolvedGameType,
        isMultiplayer,
        isTimeout,
        roundsPlayed,
        isAbandoned: isAbandoned
      });
    }
    setSessionScore(0);

    // Run the persistence asynchronously in the background so there's NO visual delay!
    (async () => {
      try {
        const xpGained = finalP1Score / 2;
        const newXp = (player.xp || 0) + xpGained;
        const newTotalScore = (player.totalScore || 0) + finalP1Score;
        
        // Since gamesPlayed (patrols) and game-specific completions are incremented exactly when entering,
        // we do NOT add any additional patrol count when completing the game.
        const newGamesPlayed = player.gamesPlayed || 0;
        
        const newCompletedGames = (player.completedGames || 0) + (isTimeout || isAbandoned ? 0 : 1);
        const newTimedOutGames = (player.timedOutGames || 0) + (isTimeout ? 1 : 0);
        
        // Calculate new level based on progressive formula: XP_REQ = (L-1)*L/2 * 500
        const newLevel = Math.floor((250 + Math.sqrt(62500 + 1000 * newXp)) / 500);

        // Aggregates specific points and patrols of all 15 grid games under gameStats
        const gameKey = resolvedGameType;
        const currentStats = player.gameStats || {};
        const gameStatObj = currentStats[gameKey] || { score: 0, completions: 0 };
        const updatedGameStats = {
          ...currentStats,
          [gameKey]: {
            ...gameStatObj,
            score: gameStatObj.score + finalP1Score,
            completions: gameStatObj.completions
          }
        };

        // Sincroniza dados no estado local / localStorage e depois na nuvem
        await updateProfile({
          totalScore: newTotalScore,
          xp: newXp,
          gamesPlayed: newGamesPlayed,
          completedGames: newCompletedGames,
          timedOutGames: newTimedOutGames,
          level: newLevel,
          gameStats: updatedGameStats,
        });

        // E envia uma notificação informando a conclusão ou alteração operacionais!
        try {
          const gameFriendly = getFriendlyGameName(resolvedGameType);
          const notiId = `noti_${Date.now()}_complete`;
          const title = (isAbandoned || keepInGameSelection) ? "Patrulha Interrompida! ⚠️" : "Patrulha Homologada! 📋✅";
          const message = (isAbandoned || keepInGameSelection)
            ? `Operação suspensa voluntariamente!\n\n• Patrulha: ${gameFriendly}\n• Pontos parciais consolidados: +${finalP1Score} pontos\n• XP ganho: +${xpGained} XP\n\n📊 SALDO ATUALIZADO:\n• Pontuação Geral Acumulada: ${newTotalScore} pontos`
            : `Inspecionada com sucesso!\n\n• Patrulha executada: ${gameFriendly}\n• Pontos adquiridos nesta partida: +${finalP1Score} pontos\n• XP ganho nesta partida: +${xpGained} XP\n\n📊 SALDO DE CARREIRA ATUALIZADO:\n• Pontuação Geral Acumulada: ${newTotalScore} pontos\n• Total de Patrulhas Executadas: ${newGamesPlayed} patrulhas\n\nA Central RodoPlay registrou suas métricas operacionais com sucesso. Continue rodando e preservando as vias!`;

          await setDoc(doc(db, 'notifications', notiId), {
            id: notiId,
            recipientId: player.uid,
            title,
            message,
            type: "patrol",
            timestamp: new Date().toISOString(),
            read: false,
            senderId: 'system',
            senderName: 'Central RodoPlay'
          });

          // Caso tenha subido de nível, receba uma notificação de parabéns!
          if (newLevel > (player.level || 1)) {
            const lvlNotiId = `noti_${Date.now()}_levelup_${newLevel}`;
            await setDoc(doc(db, 'notifications', lvlNotiId), {
              id: lvlNotiId,
              recipientId: player.uid,
              title: "Promoção de Nível! ⭐🎉",
              message: `Impressionante! Você progrediu para o Nível ${newLevel}. Continue rodando e inspecionando!`,
              type: "points",
              timestamp: new Date().toISOString(),
              read: false,
              senderId: 'system',
              senderName: 'Central RodoPlay'
            });
          }
        } catch (notiErr) {
          console.warn("Error creating patrol notifications:", notiErr);
        }

        // Se for multiplayer com parceiro, salve o resultado do duelo na coleção 'duels'
        if (isMultiplayer && partner) {
          const shouldWriteDuel = player.uid < partner.uid;
          if (shouldWriteDuel) {
            await addDoc(collection(db, 'duels'), {
              player1Id: player.uid,
              player1Name: player.displayName,
              player1Avatar: player.avatar || '',
              player2Id: partner.uid,
              player2Name: partner.displayName,
              player2Avatar: partner.avatar || '',
              p1Score: p1Score !== undefined ? p1Score : 0,
              p2Score: p2Score !== undefined ? p2Score : 0,
              gameType: resolvedGameType,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.warn("[Firebase Error] Falha ao sincronizar dados do fim de partida:", error);
      }
    })();
  };

  const getXpThreshold = (lvl: number) => ((lvl - 1) * lvl / 2) * 500;
  
  const currentLevel = player.level || 1;
  const displayTotalScore = (player.totalScore || 0) + sessionScore;
  const displayXP = (player.xp || 0) + (sessionScore / 2);
  
  const xpCurrentThreshold = getXpThreshold(currentLevel);
  const xpNextThreshold = getXpThreshold(currentLevel + 1);
  const xpProgress = Math.min(100, Math.max(0, ((displayXP - xpCurrentThreshold) / (xpNextThreshold - xpCurrentThreshold)) * 100));

  // Compute aggregated real-time metrics across all registered users
  // (We add current unsubmitted sessionScore so that the local user is immediately represented in real-time)
  const globalDisplayTotalScore = globalStats.totalScore + sessionScore;
  const globalDisplayTotalXP = globalStats.totalXP + (sessionScore / 2);
  const globalDisplayGamesPlayed = globalStats.gamesPlayed;
  const globalDisplayCompletedGames = globalStats.completedGames;
  const globalDisplayTimedOutGames = globalStats.timedOutGames;

  const isHome = view === 'home';

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-slate-900 border-x border-slate-800 shadow-2xl flex flex-col">
      {/* Top Hazard Stripe */}
      <div className="h-24 w-full hazard-stripe opacity-80 shrink-0" />

      {isQuotaExceeded && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/15 border-y border-amber-500/30 p-3.5 text-center px-4 space-y-1.5 z-40 relative backdrop-blur-sm shrink-0"
        >
          <div className="flex items-center justify-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider font-sans">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Sincronização Local RodoPlay Ativa 🚀
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed font-sans font-medium">
            Seu progresso operacional, pontuações e histórico de patrulhas estão sendo <strong>salvos com total segurança em seu dispositivo</strong>. A nuvem sincronizará em breve!
          </p>
          <div className="text-[9px] text-amber-300/90 font-sans mt-1 leading-relaxed bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
            ⚠️ O limite diário de escritas gratuitas do Cloud Firestore (Spark plan) foi atingido.
            Você pode monitorar ou atualizar o projeto no{' '}
            <a 
              href="https://console.firebase.google.com/project/project-ecca8e56-8821-41aa-a10/firestore/databases/ai-studio-2463f31a-95a2-4f79-8de0-6f946503774e/data?openUpgradeDialog=true"
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-extrabold text-amber-400 hover:text-white"
            >
              Console do Google Firebase
            </a>.
          </div>
        </motion.div>
      )}

      {/* Persistent Real-time Header */}
      {view === 'home' && (
        <div className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
          <header className={`relative flex transition-all duration-500 p-4 ${isHome ? 'flex-col gap-8 pt-8 pb-10' : 'justify-between items-center'}`}>
            {/* Notification Bell Button */}
            {isHome && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('notifications')}
                className={`absolute top-4 right-4 p-3 rounded-2xl bg-slate-800/90 border border-slate-700/50 hover:bg-slate-700/50 hover:border-yellow-500/30 transition-all cursor-pointer z-50 flex items-center justify-center shadow-lg ${
                  unreadCount > 0 ? 'text-yellow-400' : 'text-slate-400'
                }`}
              >
                <Bell size={18} className={unreadCount > 0 ? 'fill-yellow-500/10' : ''} />
                
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white font-mono border border-slate-900 shadow-md">
                    {unreadCount}
                  </span>
                )}
              </motion.button>
            )}

            {/* Exclusive Administrator Toggle Button badge */}
            {isHome && player?.email?.toLowerCase() === 'lgngregorio@icloud.com' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('admin' as any)}
                className="absolute top-4 left-4 h-12 px-4 rounded-2xl bg-yellow-400 text-slate-950 hover:bg-yellow-300 transition-all cursor-pointer z-50 flex items-center justify-center gap-1.5 shadow-lg border border-yellow-500 font-extrabold text-[10px] uppercase tracking-wider"
              >
                <Shield size={14} className="stroke-[2.5]" />
                <span>Painel Adm</span>
              </motion.button>
            )}

            <div className={`flex transition-all duration-500 ${isHome ? 'flex-col items-center gap-3' : 'items-center gap-3'}`}>
              <div className="flex flex-col items-center shrink-0">
                <div className={`rounded-2xl bg-slate-800 flex items-center justify-center shadow-inner border-2 border-slate-700 overflow-hidden transition-all duration-500 ${isHome ? 'w-24 h-24 text-4xl leading-none select-none shadow-[0_0_30px_rgba(30,41,59,0.5)]' : 'w-12 h-12 text-xl leading-none select-none'}`}>
                  {player.avatar?.startsWith('data') || player.avatar?.startsWith('http') ? (
                    <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-yellow-400">{(player.displayName || '??').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</span>
                  )}
                </div>
                <div 
                  style={{ 
                    backgroundColor: 'var(--primary-color)',
                    boxShadow: '0 2px 8px color-mix(in srgb, var(--primary-color) 40%, transparent)'
                  }}
                  className="mt-2.5 text-slate-950 px-3.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest border border-white/20 select-none"
                >
                  NÍVEL {player.level}
                </div>
              </div>
              <div className={isHome ? 'text-center' : ''}>
                <h1 className={`font-black uppercase text-white truncate transition-all duration-500 ${isHome ? 'text-2xl tracking-tight mb-2' : 'text-sm max-w-[120px]'}`}>
                  {player.displayName}
                </h1>
                {player.email && (
                  <p className={`text-slate-400 font-semibold tracking-tight lowercase truncate -mt-1.5 mb-2 ${isHome ? 'text-xs text-center' : 'text-[9px] text-left max-w-[120px]'}`} title={player.email}>
                    {player.email}
                  </p>
                )}
                <div className={`flex items-center gap-2 mt-0.5 ${isHome ? 'justify-center' : ''}`}>
                  <div className={`${isHome ? 'w-32 h-2' : 'w-20 h-1.5'} bg-slate-800 rounded-full overflow-hidden border border-white/5`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                    />
                  </div>
                  <span className={`${isHome ? 'text-[10px]' : 'text-[8px]'} text-slate-500 font-bold uppercase tracking-tighter`}>
                    {Math.floor(displayXP)} / {xpNextThreshold} XP
                  </span>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 transition-all duration-500 ${isHome ? 'justify-center w-full px-2' : ''}`}>
              <motion.div 
                key={displayTotalScore}
                initial={{ scale: 1.1, borderColor: 'rgba(250, 204, 21, 0.5)' }}
                animate={{ scale: 1, borderColor: 'rgba(51, 65, 85, 0.8)' }}
                className={`bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center shadow-lg transition-all duration-500 ${isHome ? 'flex-1 py-3' : 'min-w-[85px] px-3 py-1.5'}`}
              >
                <span className={`font-black text-yellow-500 uppercase tracking-[0.2em] leading-none mb-1 ${isHome ? 'text-[8px]' : 'text-[7px]'}`}>Meus Pontos</span>
                <span className={`font-black text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)] leading-none ${isHome ? 'text-xl' : 'text-sm'}`}>
                  {displayTotalScore.toLocaleString()}
                </span>
                <span className="text-[6.5px] font-[900] text-slate-500 uppercase tracking-[0.15em] mt-1 shrink-0">Total Acumulado</span>
              </motion.div>
              <div className={`bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center shadow-lg transition-all duration-500 ${isHome ? 'flex-1 py-3' : 'min-w-[85px] px-2 py-1.5'}`}>
                <span className={`font-black text-blue-400 uppercase tracking-[0.2em] leading-none mb-1 ${isHome ? 'text-[8px]' : 'text-[7px]'}`}>Minhas Patrulhas</span>
                <span className={`font-black text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] leading-none ${isHome ? 'text-xl' : 'text-sm'}`}>
                  {(player.gamesPlayed || 0).toLocaleString()}
                </span>
                <span className="text-[6.5px] font-[900] text-slate-500 uppercase tracking-[0.15em] mt-1 shrink-0">Aptidão Individual</span>
              </div>
              
              {/* New Details Grid */}
              <div className="col-span-2 grid grid-cols-3 gap-2 mt-2">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                   <span className="text-[7px] font-black text-slate-500 uppercase">Base</span>
                   <span className="text-[9px] font-black text-white uppercase text-center">{player.base || 'Base 01'}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                   <span className="text-[7px] font-black text-slate-500 uppercase">Turno</span>
                   <span className="text-[9px] font-black text-yellow-400 uppercase text-center">{player.shift || 'Turno A'}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                   <span className="text-[7px] font-black text-slate-500 uppercase">Praça</span>
                   <span className="text-[9px] font-black text-slate-300 uppercase text-center">{(player as any).praca || 'N/A'}</span>
                </div>
              </div>
            </div>
          </header>
        </div>
      )}
      
      <main className="flex-1 overflow-y-auto pb-24">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full"
            />
          </div>
        }>
          <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <Home 
                player={player} 
                onPlay={(gameType) => setView(gameType)} 
                onViewChange={(v) => setView(v as any)}
              />
            </motion.div>
          )}

          {view === 'multiplayer' && (
            <motion.div
              key="multiplayer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GamesGrid 
                onPlay={(gameType) => setView(gameType)} 
                onBack={() => setView('home')}
              />
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4"
            >
              <Leaderboard onBack={() => setView('home')} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Settings 
                player={player} 
                onUpdate={updateProfile} 
                onLogout={async () => {
                  await logout();
                  setView('home');
                }} 
                onDeleteProfile={async (passwordConfirm?: string) => {
                  if (player?.uid) {
                    await deleteProfile(player.uid, passwordConfirm);
                    setIsDeletedScreen(true);
                  }
                }}
                onBack={() => setView('home')}
              />
            </motion.div>
          )}

          {view === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <NotificationsPage 
                player={player} 
                onBack={() => setView('home')} 
                onAcceptInviteByDefault={handleAcceptInvite}
                onDeclineInviteByDefault={handleDeclineInvite}
              />
            </motion.div>
          )}

          {view === 'admin' && player?.email?.toLowerCase() === 'lgngregorio@icloud.com' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminPanel player={player} onBack={() => setView('home')} />
            </motion.div>
          )}

          {view === GameType.QUIZ_MASTER_APH && (
            <motion.div
              key={`quiz_master_aph_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <QuizMasterAPH
                currentPlayerId={player?.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                player={player}
                onCancel={() => {
                  setSessionScore(0);
                  setView('home');
                }}
              />
            </motion.div>
          )}

          {view === GameType.QUIZ && (
            <motion.div
              key={`quiz_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Quiz
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.HANGMAN && (
            <motion.div
              key={`hangman_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Hangman
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.WORD_SEARCH && (
            <motion.div
              key={`wordsearch_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <WordSearch
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.WORD_GUESS && (
            <motion.div
              key={`wordguess_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <WordGuess
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.NUMBER_GUESS && (
            <motion.div
              key={`numberguess_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <NumberColorGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.MEMORY && (
            <motion.div
              key={`memory_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <MemoryGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.REACTION && (
            <motion.div
              key={`reaction_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <ReactionGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.SPEED_MATH && (
            <motion.div
              key={`speedmath_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <SpeedMath
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.ROUTE_ORDER && (
            <motion.div
              key={`routeorder_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <RouteOrder
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.PARKING_ESCAPE && (
            <motion.div
              key={`parkingescape_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <ParkingEscape
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.TIC_TAC_TOE && (
            <motion.div
              key={`tictactoe_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <TicTacToe
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  if (activeRoom) {
                    handleLeaveSession();
                  } else {
                    setView('multiplayer');
                  }
                }}
                room={activeRoom}
                player={player}
                onLeaveRoom={handleLeaveSession}
              />
            </motion.div>
          )}

          {view === GameType.QUEENS && (
            <motion.div
              key={`queensgame_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <QueensGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.PALAVRAS_500 && (
            <motion.div
              key={`palavras550_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Palavras500
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.CONTEXTO && (
            <motion.div
              key={`contextogame_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <ContextoGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.SUDOKU && (
            <motion.div
              key={`sudokugame_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <SudokuGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}

          {view === GameType.DAMA && (
            <motion.div
              key={`damagame_${gameSessionId}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <DamaGame
                currentPlayerId={player.uid}
                onComplete={handleGameComplete}
                onScoreUpdate={handleScoreUpdate}
                onCancel={() => {
                  setSessionScore(0);
                  setView('multiplayer');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>

        {/* Global Professional Games Footer for all menu views */}
        {!Object.values(GameType).includes(view as any) && (
          <GamePremiumFooter />
        )}
      </main>

      {/* Bottom Nav visible in non-game views */}
      {!Object.values(GameType).includes(view as any) && view !== 'admin' && (
        <BottomNav activeView={view} onViewChange={(v) => setView(v as any)} unreadCount={unreadCount} />
      )}

      {/* Floating Match invitation block */}
      <AnimatePresence>
        {incomingInvite && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <div className="bg-slate-900 border-2 border-yellow-400 rounded-[2rem] p-6 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-3xl border-2 border-slate-700 overflow-hidden">
                  {incomingInvite.senderAvatar?.startsWith('data') || incomingInvite.senderAvatar?.startsWith('http') ? (
                    <img src={incomingInvite.senderAvatar} alt="Sender Avatar" className="w-full h-full object-cover" />
                  ) : (
                    incomingInvite.senderAvatar || '👷'
                  )}
                </div>
                <div>
                  <h4 className="text-white font-black uppercase text-sm italic tracking-tight">{incomingInvite.senderName || 'Parceiro'}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Te convidou para jogar!</p>
                </div>
              </div>
              
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                <p className="text-[10px] font-black text-slate-550 uppercase tracking-widest">JOGO DETECTADO</p>
                <p className="text-white font-black text-sm uppercase italic tracking-tighter mt-1">🚧 JOGO DA VELHA 🚧</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDeclineInvite(incomingInvite)}
                  className="h-12 bg-slate-850 hover:bg-slate-800 text-rose-400 border border-slate-700 font-extrabold uppercase tracking-wider rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
                >
                  Recusar ✖
                </button>
                <button
                  onClick={() => handleAcceptInvite(incomingInvite)}
                  className="h-12 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black uppercase tracking-wider rounded-xl text-xs active:scale-95 transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  Aceitar ✓
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activePatrolResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col justify-center items-center p-6 font-sans select-none"
          >
            {/* Ambient orange-yellow flare glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

            <motion.div 
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-yellow-500/30 rounded-[2rem] p-5 md:p-6 text-center space-y-4 shadow-[0_0_50px_rgba(250,204,21,0.15)] relative overflow-y-auto max-h-[88vh] flex flex-col items-center border-b-4 border-b-yellow-500 scrollbar-none"
            >
              {/* Dynamic Warning Operational Stripe */}
              <div className="absolute top-0 left-0 right-0 h-2 hazard-stripe opacity-60 rounded-t-[1.8rem]" />

              <div className="flex flex-col items-center">
                <div className="relative mt-1">
                  <div className="w-16 h-16 bg-slate-950 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 overflow-hidden">
                    {player?.avatar?.startsWith('data') || player?.avatar?.startsWith('http') ? (
                      <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-yellow-400 font-black">{(player?.displayName || '??').split(' ').filter(n => n).map(n=>n[0]).join('').substring(0,2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-md border border-slate-900">
                    ✓
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-black text-white uppercase italic tracking-wider leading-tight block">
                    {player?.displayName || 'Agente'}
                  </span>
                  <span className="text-[8px] font-black tracking-widest text-yellow-400 uppercase mt-0.5 block">
                    Operador
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="inline-block bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-0.5 font-black uppercase text-[8px] tracking-[0.2em] rounded-md leading-none">
                  {activePatrolResult.isAbandoned ? 'PATRULHA ABANDONADA! 🚨' : activePatrolResult.isTimeout ? 'TEMPO ESGOTADO! ⏱️' : 'PATRULHA HOMOLOGADA! 📋'}
                </span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                  {activePatrolResult.isAbandoned ? 'Vistoria Parcial' : activePatrolResult.isTimeout ? 'Inspeção Forçada' : 'Inspeção Concluída'}
                </h3>
                <p className="text-slate-400 text-[10px] leading-relaxed max-w-[250px] mx-auto">
                  {activePatrolResult.isAbandoned 
                    ? 'Sua patrulha foi interrompida pelo operador. Pontos acumulados foram creditados com sucesso!' 
                    : activePatrolResult.isTimeout 
                      ? 'O tempo programado para esta patrulha expirou. As métricas operacionais foram enviadas até onde concluiu.'
                      : 'Métricas de vistoria e aptidão operacional urbana salvas na central de tráfego.'}
                </p>
              </div>

              {/* Showcase box */}
              <div className="w-full space-y-2.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-center font-sans">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                  <span className="text-[9px] font-extrabold text-slate-550 uppercase tracking-widest">Setor Vistoriado</span>
                  <span className="text-[11px] font-black text-white uppercase tracking-tight">
                    {getFriendlyGameName(activePatrolResult.gameType)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="bg-slate-950/90 border border-slate-850/80 p-3 rounded-xl text-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Pontos Adquiridos</span>
                    <span className="text-sm md:text-base font-black text-blue-400 block leading-none">
                      +{activePatrolResult.score} PTS
                    </span>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-850/80 p-3 rounded-xl text-center">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">XP Ganho</span>
                    <span className="text-sm md:text-base font-black text-yellow-400 block leading-none">
                      +{activePatrolResult.score / 2} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid actions */}
              <div className="w-full flex flex-col gap-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActivePatrolResult(null);
                      setGameSessionId(prev => prev + 1);
                    }}
                    className="w-full h-11 border border-slate-805 text-slate-400 font-bold hover:text-white hover:bg-slate-800/80 text-[10px] rounded-xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>JOGAR NOVAMENTE 🔁</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const currentType = activePatrolResult.gameType;
                      const gameTypes = Object.values(GameType);
                      const otherTypes = gameTypes.filter(t => t !== currentType);
                      const randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
                      setActivePatrolResult(null);
                      setGameSessionId(prev => prev + 1);
                      setView(randomType as any);
                    }}
                    className="w-full h-11 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-yellow-500/10 border-none font-sans"
                  >
                    <Compass size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>AVANÇAR 🧭</span>
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActivePatrolResult(null);
                    setView('multiplayer');
                  }}
                  className="w-full h-11 border border-slate-800 text-slate-350 font-extrabold hover:text-white hover:bg-slate-800 text-[10px] rounded-xl uppercase tracking-widest active:scale-95 transition-all bg-slate-950/40 font-sans flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>VOLTAR À CENTRAL DE JOGOS</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Hazard Stripe */}
      <div className="h-24 w-full hazard-stripe opacity-80 shrink-0" />
    </div>
  );
}

function GamePremiumFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-slate-950/90 border-t border-slate-900/60 px-6 py-12 mt-12 text-center rounded-t-[2.5rem] relative overflow-hidden select-none pb-12">
      {/* Background neon ambient decoration glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes textColorFlow {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
        .developer-name-flow {
          background: linear-gradient(90deg, var(--primary-color, #fbbf24) 0%, var(--secondary-color, #6366f1) 50%, var(--primary-color, #fbbf24) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textColorFlow 6s linear infinite;
        }
        .gradient-border-card {
          position: relative;
          z-index: 10;
        }
        .gradient-border-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          padding: 1.5px;
          background: linear-gradient(90deg, #fbbf24, #10b981, #06b6d4, #fbbf24);
          background-size: 200% auto;
          animation: textColorFlow 6s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}}/>

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        <div className="flex justify-center items-center gap-2.5">
          <Gamepad2 className="text-yellow-450 h-5 w-5 animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-slate-800" />
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.25em]">CENTRAL DE PATRULHAS</span>
          <div className="h-2 w-2 rounded-full bg-slate-800" />
          <Shield className="text-yellow-450 h-5 w-5" />
        </div>

        <div className="space-y-1.5 px-2">
          <h4 className="text-sm font-black tracking-tight text-white uppercase italic leading-none">
            Plataforma De Capacitação Operacional
          </h4>
          <p className="text-[10px] text-slate-450 uppercase font-semibold leading-relaxed tracking-wider">
            Treinamento de memória, reflexo rápido, direção preventiva escolar e cálculo estratégico.
          </p>
        </div>

        {/* Developer Highlight Segment */}
        <div className="gradient-border-card bg-slate-900/40 p-5 rounded-2xl space-y-2.5 shadow-inner">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block leading-none">
            DESENVOLVEDOR EM DESTAQUE
          </span>
          <div className="relative group inline-block">
            <span className="developer-name-flow font-black tracking-widest uppercase italic text-sm sm:text-base md:text-lg block drop-shadow-[0_2px_10px_rgba(var(--primary-color),0.1)]">
              LUCAS GREGÓRIO DO NASCIMENTO
            </span>
            <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />
          </div>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            ENGENHARIA DE SOFTWARE & JOGABILIDADE MATRICIAL
          </p>
        </div>

        {/* Technical Version Metadata info log */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-2 border-t border-slate-900/40">
          <p className="text-[8px] font-semibold text-slate-500 tracking-widest uppercase">
            © {currentYear} • TODOS OS DIREITOS RESERVADOS
          </p>
          <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-850 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[7.5px] font-mono font-bold text-slate-400 uppercase tracking-wider">PRO SOLO EDITION • V3.5.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

