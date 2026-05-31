/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Player } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { LogOut, User, Camera, Shield, Check, RefreshCw, Upload, Sun, Moon, Palette, Smartphone, Monitor, Laptop, HelpCircle, Activity, Trash2, X, FileText, Loader2, ArrowLeft, ChevronLeft, ChevronRight, MoveHorizontal, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { BASE_OPTIONS, SHIFT_OPTIONS } from '../constants';
import { ALL_AVATARS, DEFAULT_AVATAR } from '../data/avatars';
import { getThemeSettings, saveThemeSettings, applyTheme } from '../lib/theme';
import { isAudioEnabled, setAudioEnabled, isVisualEffectsEnabled, setVisualEffectsEnabled, playGameSfx } from '../lib/gameEffects';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { sanitizeId } from '../lib/rankingSync';

const getContrastColor = (hex: string) => {
  if (!hex) return '#ffffff';
  const c = hex.startsWith('#') ? hex.substring(1) : hex;
  let r = 0, g = 0, b = 0;
  if (c.length === 3) {
    r = parseInt(c.charAt(0) + c.charAt(0), 16);
    g = parseInt(c.charAt(1) + c.charAt(1), 16);
    b = parseInt(c.charAt(2) + c.charAt(2), 16);
  } else if (c.length === 6) {
    const rgb = parseInt(c, 16);
    r = (rgb >> 16) & 0xff;
    g = (rgb >> 8) & 0xff;
    b = (rgb >> 0) & 0xff;
  }
  const luma = 0.2116 * r + 0.7152 * g + 0.0722 * b;
  return luma < 140 ? '#ffffff' : '#0f172a';
};

interface SettingsProps {
  player: Player;
  onUpdate: (data: Partial<Player>) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteProfile: (password?: string) => Promise<void>;
  onBack?: () => void;
}

export function Settings({ player, onUpdate, onLogout, onDeleteProfile, onBack }: SettingsProps) {
  const [name, setName] = useState(player.displayName);
  const [shift, setShift] = useState(player.shift);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar || DEFAULT_AVATAR);
  const [avatarBatchIndex, setAvatarBatchIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [audioEnabled, setAudioEnabledState] = useState(isAudioEnabled());
  const [visualEffectsEnabled, setVisualEffectsEnabledState] = useState(isVisualEffectsEnabled());

  const handleToggleAudio = (val: boolean) => {
    setAudioEnabledState(val);
    setAudioEnabled(val);
    if (val) {
      setTimeout(() => {
        playGameSfx('correct');
      }, 50);
    }
  };

  const handleToggleVisual = (val: boolean) => {
    setVisualEffectsEnabledState(val);
    setVisualEffectsEnabled(val);
  };

  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSentSuccess, setSupportSentSuccess] = useState(false);
  const [supportError, setSupportError] = useState('');

  const handleSendSupportRequest = async () => {
    if (!supportMessage.trim()) return;
    setIsSendingSupport(true);
    setSupportError('');
    setSupportSentSuccess(false);
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const supportId = `admin_noti_${Date.now()}_support_${player.uid}`;
      await setDoc(doc(db, 'admin_notifications', supportId), {
        id: supportId,
        uidUsuario: player.uid,
        apelido: player.displayName || '',
        email: player.email || '',
        base: player.base || 'Base 01',
        turno: player.shift || 'Turno A',
        status: 'Pendente',
        dataCadastro: new Date().toISOString(),
        visualizado: false,
        type: 'Pedido de suporte',
        message: `Pedido de suporte de ${player.displayName || 'Jogador'}: ${supportMessage.trim()}`
      });
      setSupportMessage('');
      setSupportSentSuccess(true);
      setTimeout(() => setSupportSentSuccess(false), 5000);
    } catch (err: any) {
      console.error("Failed sending support request:", err);
      setSupportError("Não foi possível enviar a mensagem. " + (err.message || ""));
    } finally {
      setIsSendingSupport(false);
    }
  };
  
  const [sessions, setSessions] = useState<any[]>([]);
  const currentSessionIdLoc = localStorage.getItem('active_session_id') || '';

  // Real-time synchronization of active sessions across devices
  useEffect(() => {
    if (!player.uid) return;

    const q = player.email
      ? query(collection(db, 'sessions'), where('email', '==', player.email))
      : query(collection(db, 'sessions'), where('userId', '==', player.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      // Sort: active current session first, then online ones, then by lastSeen desc
      list.sort((a, b) => {
        if (a.id === currentSessionIdLoc) return -1;
        if (b.id === currentSessionIdLoc) return 1;
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return timeB - timeA;
      });
      setSessions(list);
    }, (error) => {
      console.warn("Error listening to sessions:", error);
    });

    return () => unsubscribe();
  }, [player.uid, player.email, currentSessionIdLoc]);

  const handleRevokeSession = async (sessId: string) => {
    try {
      await deleteDoc(doc(db, 'sessions', sessId));
    } catch (e) {
      console.warn("Failed to terminate remote session:", e);
    }
  };
  
  // Real-time synchronization support when playing/updating concurrently on multiple devices
  useEffect(() => {
    setName(player.displayName);
    setShift(player.shift);
    setSelectedAvatar(player.avatar || DEFAULT_AVATAR);
  }, [player.displayName, player.shift, player.avatar]);
  
  // Accent-insensitive, case-insensitive, and space-relaxed normalization to ensure the delete button activates smoothly
  const normalizeStr = (str: string) => 
    str.trim()
       .toLowerCase()
       .normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "");

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const isDeleteNameMatch = normalizeStr(confirmNameInput) === normalizeStr(player?.displayName || '');

  const [isPasswordUser, setIsPasswordUser] = useState(() => {
    const u = auth.currentUser;
    return u ? u.providerData.some((p) => p.providerId === 'password') : false;
  });
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        const hasPassword = u.providerData.some((p) => p.providerId === 'password');
        setIsPasswordUser(hasPassword);
      } else {
        setIsPasswordUser(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const isPasswordRequired = !!(player.email && isPasswordUser);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isWipingAll, setIsWipingAll] = useState(false);

  const handleWipeAllAccounts = async () => {
    setIsConfirmingDelete(false);
    setIsWipingAll(true);
    try {
      const uid = player.uid;
      const sEmail = player.email || '';
      // Capture the last auth password from local storage BEFORE clearing it
      const savedPass = localStorage.getItem('last_auth_password') || undefined;

      console.log(`[CLIENT DELETE] Chamando a API backend /api/deleteUserCompletely para UID ${uid}`);

      // 1. CALL SERVER-SIDE API ("CLOUD FUNCTION")
      let serverPurgeSucceeded = false;
      try {
        const response = await fetch('/api/deleteUserCompletely', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, email: sEmail }),
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            console.log("[CLIENT DELETE] Purga no backend executada com sucesso!");
            serverPurgeSucceeded = true;
          }
        }
      } catch (backendError) {
        console.warn("[CLIENT DELETE] Erro ao chamar API backend, executando fallback local:", backendError);
      }

      // 2. CLIENT-SIDE FALLBACK (If Server Purge Failed Or Was Incomplete)
      if (!serverPurgeSucceeded) {
        console.log("[CLIENT DELETE] Executando purga manual via Firestore no cliente...");
        try {
          const batch = writeBatch(db);

          // Delete user master profile documents
          batch.delete(doc(db, 'players', uid));
          batch.delete(doc(db, 'users', uid));
          batch.delete(doc(db, 'rankings/global/players', uid));

          // Clear from all possible shift and base rankings dynamically
          if (BASE_OPTIONS && Array.isArray(BASE_OPTIONS)) {
            BASE_OPTIONS.forEach((item) => {
              batch.delete(doc(db, `rankings/bases/all_bases/${sanitizeId(item)}/players`, uid));
            });
          }
          if (SHIFT_OPTIONS && Array.isArray(SHIFT_OPTIONS)) {
            SHIFT_OPTIONS.forEach((item) => {
              batch.delete(doc(db, `rankings/turnos/all_turnos/${sanitizeId(item)}/players`, uid));
            });
          }

          // Delete active sessions
          try {
            const sessionsQuery = sEmail 
              ? query(collection(db, 'sessions'), where('email', '==', sEmail))
              : query(collection(db, 'sessions'), where('userId', '==', uid));
            const sessionsSnap = await getDocs(sessionsQuery);
            sessionsSnap.forEach((docSnap) => {
              batch.delete(doc(db, 'sessions', docSnap.id));
            });
          } catch (e) {
            console.warn("Error background cleaning sessions:", e);
          }

          // Fetch and delete notifications (where user is sender or recipient)
          try {
            const notifsQuery1 = query(collection(db, 'notifications'), where('recipientId', '==', uid));
            const notifsSnap1 = await getDocs(notifsQuery1);
            notifsSnap1.forEach((docSnap) => {
              batch.delete(doc(db, 'notifications', docSnap.id));
            });
            const notifsQuery2 = query(collection(db, 'notifications'), where('senderId', '==', uid));
            const notifsSnap2 = await getDocs(notifsQuery2);
            notifsSnap2.forEach((docSnap) => {
              batch.delete(doc(db, 'notifications', docSnap.id));
            });
          } catch (e) {
            console.warn("Error background cleaning notifications:", e);
          }

          // Commit direct batch
          await batch.commit();
        } catch (fbClientErr) {
          console.warn("[Settings] Client-side data purge fallback returned warnings, continuing with account deletion:", fbClientErr);
        }
      }

      // 3. AUTH ACCOUNT TERMINATION (Must happen while session is still fully loaded in localStorage / IndexedDB)
      console.log("[CLIENT DELETE] Disparando exclusão de credencial Auth do Firebase...");
      await onDeleteProfile(savedPass);

      // 4. COMPLETE DEVICE WIPE & CLEANUP (LocalStorage, SessionStorage, IndexedDB)
      console.log("[CLIENT DELETE] Realizando limpeza total de caches e persistências locais...");
      localStorage.clear();
      sessionStorage.clear();

      // Clear local IndexedDB databases if accessible
      try {
        if (typeof window.indexedDB !== 'undefined' && window.indexedDB.databases) {
          const dbs = await window.indexedDB.databases();
          dbs.forEach(dbInfo => {
            if (dbInfo.name) {
              window.indexedDB.deleteDatabase(dbInfo.name);
            }
          });
        }
      } catch (errDb) {
        console.warn("Error wiping IndexedDB stores:", errDb);
      }

      // Default the redirect tab to registration for seamless layout sync
      localStorage.setItem('auth_default_tab', 'register');

    } catch (err: any) {
      console.error("Deletion failed:", err);
      if (err.message && err.message.includes("recentemente")) {
        alert(err.message);
      } else {
        alert("Erro ao excluir conta: " + (err.message || String(err)));
      }
    } finally {
      setIsWipingAll(false);
    }
  };

  // Load theme settings inside Settings component
  const initialTheme = getThemeSettings();
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(initialTheme.mode);
  const [primaryColor, setPrimaryColor] = useState(initialTheme.primary);
  const [secondaryColor, setSecondaryColor] = useState(initialTheme.secondary);

  const handleThemeModeChange = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    const newConfig = { mode, primary: primaryColor, secondary: secondaryColor };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
    onUpdate({
      themeMode: mode,
      themePrimary: primaryColor,
      themeSecondary: secondaryColor
    }).catch(err => console.warn("Failed syncing themeMode to Firestore:", err));
  };

  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color);
    const newConfig = { mode: themeMode, primary: color, secondary: secondaryColor };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
    onUpdate({
      themeMode,
      themePrimary: color,
      themeSecondary: secondaryColor
    }).catch(err => console.warn("Failed syncing primaryColor to Firestore:", err));
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
    const newConfig = { mode: themeMode, primary: primaryColor, secondary: color };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
    onUpdate({
      themeMode,
      themePrimary: primaryColor,
      themeSecondary: color
    }).catch(err => console.warn("Failed syncing secondaryColor to Firestore:", err));
  };

  const handlePresetSelect = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    const newConfig = { mode: themeMode, primary, secondary };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
    onUpdate({
      themeMode,
      themePrimary: primary,
      themeSecondary: secondary
    }).catch(err => console.warn("Failed syncing preset to Firestore:", err));
  };

  const COLOR_PRESETS = [
    { name: 'Rodoviário', primary: '#fbbf24', secondary: '#3b82f6', icon: '🟡' },
    { name: 'Azul Cósmico', primary: '#0ea5e9', secondary: '#10b981', icon: '🔵' },
    { name: 'Verde Esmeralda', primary: '#10b981', secondary: '#fbbf24', icon: '🟢' },
    { name: 'Roxo Elétrico', primary: '#a855f7', secondary: '#f43f5e', icon: '🟣' },
    { name: 'Vermelho Rubi', primary: '#ef4444', secondary: '#f59e0b', icon: '🔴' },
    { name: 'Chama Laranja', primary: '#f97316', secondary: '#6366f1', icon: '🟠' }
  ];

  const isImageAvatar = selectedAvatar.startsWith('data:image') || selectedAvatar.startsWith('http');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 1MB for base64 storage in Firestore
    if (file.size > 1024 * 1024) {
      alert('Imagem muito grande. Escolha uma imagem de até 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedAvatar(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Show 25 at a time
  const BATCH_SIZE = 25;
  const totalPages = Math.ceil(ALL_AVATARS.length / BATCH_SIZE);
  const currentAvatars = ALL_AVATARS.slice(
    avatarBatchIndex * BATCH_SIZE,
    (avatarBatchIndex * BATCH_SIZE) + BATCH_SIZE
  );

  const goToNextBatch = () => {
    setAvatarBatchIndex((prev) => (prev + 1) % totalPages);
  };

  const goToPrevBatch = () => {
    setAvatarBatchIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const rotateAvatars = () => {
    goToNextBatch();
  };

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const swipeThreshold = 50; // pixels
    if (diff > swipeThreshold) {
      goToNextBatch();
    } else if (diff < -swipeThreshold) {
      goToPrevBatch();
    }
    touchStartX.current = null;
  };

  const handleSave = () => {
    onUpdate({ 
      displayName: name,
      avatar: selectedAvatar,
      shift
    });
  };

  const hasChanges = name !== player.displayName || 
                    selectedAvatar !== player.avatar ||
                    shift !== player.shift;

  return (
    <div className="space-y-8 p-4 pb-12">
      {onBack && (
        <div className="flex justify-start pt-2">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-yellow-500 hover:border-yellow-405 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all focus:outline-none font-sans font-black text-[10px] tracking-wider uppercase cursor-pointer z-20"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <Activity size={11} className="stroke-[2]" />
            <span>Voltar</span>
          </motion.button>
        </div>
      )}
      {/* Centered Title Area */}
      <div className="text-center space-y-2 py-2">
        <div className="inline-block bg-yellow-400 text-black px-4 py-1 font-black skew-x-[-12deg] text-xs uppercase shadow-[3px_3px_0px_#f97316]">
          ⚙️ CONFIGURAÇÕES OPERACIONAIS
        </div>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter text-center">AJUSTES</h2>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">Configurações de Perfil e Conexão</p>
      </div>

      {/* Profile avatar centered preview is extra elegant */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-6xl border-2 border-slate-700 shadow-xl overflow-hidden select-none leading-none shrink-0 relative">
           {isImageAvatar ? (
              <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
           ) : (
              selectedAvatar
           )}
        </div>
        <div className="text-center">
          <p className="text-white font-black uppercase text-sm tracking-tight">{name || player.displayName}</p>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{player.base} • {shift || player.shift}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Seu Nome Operacional</label>
          <div className="relative">
             <input
               value={name}
               onChange={(e) => setName(e.target.value)}
               className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 text-white font-bold outline-none focus:border-yellow-400 transition-all placeholder:text-slate-600"
               placeholder="Ex: Operador 01"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3 opacity-60">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
              <Shield size={10} className="text-yellow-400" /> Base e Praça (Restrito)
            </label>
            <div className="w-full h-14 bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl px-5 text-slate-400 font-bold flex items-center cursor-not-allowed">
              {player.base}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
              Seu Turno
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl px-5 text-white font-bold outline-none focus:border-yellow-400 appearance-none transition-all"
            >
              {SHIFT_OPTIONS.map(opt => (
                <option 
                  key={opt} 
                  value={opt} 
                  className="text-slate-950 bg-white" 
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                >
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Escolher Avatar (Personagem)</label>
              <span className="text-[9px] font-bold text-slate-400 italic mt-0.5">Mais de 500 avatares disponíveis</span>
            </div>
            <button 
              type="button"
              onClick={rotateAvatars}
              className="text-[10px] font-black uppercase text-yellow-400 hover:text-yellow-300 flex items-center gap-1 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700 active:scale-95 transition-all"
            >
              <RefreshCw size={11} className="animate-spin-slow" /> Trocar Lote
            </button>
          </div>

          {/* Swipable Grid container using Touch Start/End and Motion drag helper */}
          <div className="relative overflow-hidden">
            {/* Visual indicator overlay */}
            <div className="absolute right-3 top-3 z-10 bg-slate-900/95 border border-slate-750 text-[8px] px-2 py-0.5 rounded-full font-black text-slate-400 flex items-center gap-1.5 pointer-events-none select-none uppercase tracking-wider">
              <MoveHorizontal size={10} className="text-yellow-400" />
              <span>Arraste para os lados</span>
            </div>

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(event, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  goToNextBatch();
                } else if (info.offset.x > swipeThreshold) {
                  goToPrevBatch();
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="grid grid-cols-5 gap-3 bg-slate-800/50 p-4 rounded-[2rem] border border-slate-700/50 md:cursor-grab active:cursor-grabbing touch-pan-y"
            >
              {currentAvatars.map((avatarUrl) => (
                <button
                  key={avatarUrl}
                  type="button"
                  onClick={() => setSelectedAvatar(avatarUrl)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden select-none transition-all active:scale-90 ${
                    selectedAvatar === avatarUrl ? 'bg-yellow-400 scale-110 shadow-lg border-2 border-yellow-500' : 'bg-slate-750 hover:bg-slate-700'
                  }`}
                >
                  <img 
                    src={avatarUrl} 
                    alt="Personagem" 
                    className="w-[85%] h-[85%] object-contain rounded-lg animate-fade-in" 
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </motion.div>
          </div>

          {/* Pagination carousel controls and quick select range slider */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-[1.5rem] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevBatch}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-white hover:text-yellow-400 w-10 h-10 rounded-xl justify-center border border-slate-700 transition-all select-none active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="text-center">
                <p className="text-[11px] font-black text-yellow-400 uppercase tracking-wider leading-none">
                  LOTE {avatarBatchIndex + 1} DE {totalPages}
                </p>
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                  {avatarBatchIndex * BATCH_SIZE + 1} - {Math.min((avatarBatchIndex + 1) * BATCH_SIZE, ALL_AVATARS.length)} de {ALL_AVATARS.length} avatares
                </p>
              </div>

              <button
                type="button"
                onClick={goToNextBatch}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-white hover:text-yellow-400 w-10 h-10 rounded-xl justify-center border border-slate-700 transition-all select-none active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Micro range slider to adjust/navigate batch easily */}
            <div className="space-y-1.5 px-1 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Ajuste Rápido de Lote</span>
                <span className="text-[8px] font-mono font-bold text-slate-400">Lote {avatarBatchIndex + 1}/{totalPages}</span>
              </div>
              <input 
                type="range"
                min="0"
                max={totalPages - 1}
                value={avatarBatchIndex}
                onChange={(e) => setAvatarBatchIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-405"
              />
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-0">
             <button 
               onClick={() => setShowGuidelines(true)}
               className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-700/50 transition-all group cursor-pointer text-left"
             >
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-yellow-400">
                    <Shield size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-xs font-black uppercase text-white">Central de Segurança</p>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Normas e Conduta</p>
                </div>
             </button>
             <div className="h-[1px] bg-slate-700/50 mx-6" />
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept="image/*" 
               className="hidden" 
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-700/50 transition-all group"
             >
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-sky-400">
                   <Camera size={20} />
                </div>
                <div className="text-left flex-1">
                   <p className="text-xs font-black uppercase text-white">Alterar Foto</p>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Upload de identificação</p>
                </div>
                {isImageAvatar && <span className="text-[8px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-black">OK</span>}
                <Upload size={14} className="text-slate-600 group-hover:text-sky-400 transition-colors" />
             </button>
          </CardContent>
        </Card>

        {/* Botão de Salvar Alterações integrado diretamente abaixo da Central de Segurança na rolagem com a cor dinâmica do Usuário */}
        <div className="pt-2">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            style={{ 
              backgroundColor: primaryColor,
              color: getContrastColor(primaryColor),
              borderColor: primaryColor,
              opacity: hasChanges ? 1.0 : 0.4
            }}
            className={`w-full h-14 font-black rounded-2xl uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 select-none border-none ${
              hasChanges 
                ? 'scale-100 animate-pulse cursor-pointer' 
                : 'scale-98 cursor-not-allowed'
            }`}
          >
            <Check size={20} />
            Salvar Alterações
          </Button>
        </div>

        {/* Card de Aparência e Cores */}
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
               <Palette size={20} className="text-yellow-400 animate-pulse" />
            </div>
            <div>
               <p className="text-xs font-black uppercase text-white">Customização de Aparência</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Tema e Cores Operacionais</p>
            </div>
          </div>

          {/* Tema Claro/Escuro */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest block ml-1">Modo Visual</label>
            <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-700/30">
              <button
                type="button"
                onClick={() => handleThemeModeChange('dark')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-yellow-400 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon size={14} />
                Modo Escuro
              </button>
              <button
                type="button"
                onClick={() => handleThemeModeChange('light')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-yellow-400 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sun size={14} />
                Modo Claro
              </button>
            </div>
          </div>

          {/* Presets de Cor */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-455 tracking-widest block ml-1">Paletas Rápidas</label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset.primary, preset.secondary)}
                    className={`flex items-center gap-2 p-2 bg-slate-905 p-3 rounded-xl border hover:border-slate-600 transition-all text-left cursor-pointer ${
                      isSelected ? 'border-yellow-400 bg-slate-900' : 'border-slate-800 bg-slate-900/40'
                    }`}
                  >
                    <span className="text-base shrink-0">{preset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase text-white truncate leading-tight">{preset.name}</p>
                      <div className="flex gap-1 mt-1 shrink-0">
                        <span className="w-4 h-1 rounded-sm" style={{ backgroundColor: preset.primary }} />
                        <span className="w-4 h-1 rounded-sm" style={{ backgroundColor: preset.secondary }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hex Color Picker de Cores */}
          <div className="space-y-3 pt-4 border-t border-slate-700/30">
            <label className="text-[10px] font-black uppercase text-slate-450 tracking-widest block ml-1">Ajuste Fino (Paleta Livre)</label>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Cor Principal */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-none">Cor Principal</span>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/50">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-sm" style={{ backgroundColor: primaryColor }}>
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer scale-150"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black text-white uppercase block leading-none">{primaryColor}</span>
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter block mt-0.5">EDITAR ➔</span>
                  </div>
                </div>
              </div>

              {/* Cor Secundária */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-none">Cor Secundária</span>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/50">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-sm" style={{ backgroundColor: secondaryColor }}>
                    <input 
                      type="color" 
                      value={secondaryColor} 
                      onChange={(e) => handleSecondaryColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer scale-150"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black text-white uppercase block leading-none">{secondaryColor}</span>
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter block mt-0.5">EDITAR ➔</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Efeitos de Som e Visuais das Partidas */}
        <Card id="configuracoes-efeitos-partidas" className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
               <Sparkles size={20} className="text-yellow-405 animate-pulse" />
            </div>
            <div>
               <p className="text-xs font-black uppercase text-white">Efeitos das Partidas</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Configurar Áudio e Efeitos Visuais ao Acertar</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Efeitos Sonoros */}
            <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${audioEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white">Efeitos Sonoros</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Sons ao encontrar palavras ou acertar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleAudio(!audioEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${audioEnabled ? 'bg-yellow-400' : 'bg-slate-750'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${audioEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Efeitos Visuais (Confete) */}
            <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visualEffectsEnabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Sparkles size={16} className={visualEffectsEnabled ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white">Efeitos Visuais de Explosão</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Explosão de confetes ao ganhar pontos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleVisual(!visualEffectsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${visualEffectsEnabled ? 'bg-yellow-400' : 'bg-slate-750'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${visualEffectsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Card de Fale Conosco / Suporte Corporativo */}
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden mt-4 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-705 p-1 rounded-xl flex items-center justify-center bg-slate-700 text-slate-400">
               <HelpCircle size={20} className="text-yellow-400 animate-pulse" />
            </div>
            <div>
               <p className="text-xs font-black uppercase text-white">Suporte Corporativo</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Enviar Dúvida ou Solicitação</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Digite aqui detalhadamente seu problema ou dúvida para o administrador..."
              className="w-full h-24 bg-slate-900/60 border-2 border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-yellow-400 transition-all resize-none placeholder:text-slate-600 font-sans"
            />
            {supportSentSuccess && (
              <p className="text-[10px] font-black uppercase text-emerald-400 text-center animate-bounce">✓ Mensagem enviada com sucesso ao administrador!</p>
            )}
            {supportError && (
              <p className="text-[10px] font-black uppercase text-red-550 text-center">{supportError}</p>
            )}
            <button
              onClick={handleSendSupportRequest}
              disabled={isSendingSupport || !supportMessage.trim()}
              className="w-full h-12 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[10px] uppercase tracking-wider font-sans font-black active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingSupport ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <HelpCircle size={12} />
              )}
              <span>{isSendingSupport ? 'Enviando...' : 'Pedir Ajuda / Comunicar Suporte'}</span>
            </button>
          </div>
        </Card>

        {/* Card de Gestão de Conta e Segurança */}
        <Card id="account-actions-card" className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden mt-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <div className="w-10 h-10 bg-slate-700/60 rounded-xl flex items-center justify-center text-red-150">
                <Shield size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white font-sans">Gestão da Conta</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Sair ou Excluir Perfil</p>
              </div>
            </div>

            <div className="h-[1px] bg-slate-700/30 mx-6" />

            {/* Sair da Conta */}
            <button 
              type="button"
              id="settings-logout-btn"
              onClick={async (e) => {
                e.preventDefault();
                setIsLoggingOut(true);
                try {
                  await onLogout();
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsLoggingOut(false);
                }
              }}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-700/40 active:bg-slate-700/60 transition-all group cursor-pointer text-left border-none bg-transparent pointer-events-auto select-none"
            >
              <div className="w-10 h-10 bg-slate-700/30 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-red-400 group-hover:bg-red-500/10 transition-colors">
                {isLoggingOut ? (
                  <Loader2 className="animate-spin text-red-500" size={18} />
                ) : (
                  <LogOut size={18} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase text-white group-hover:text-red-400 transition-colors">
                  {isLoggingOut ? 'Saindo...' : 'Sair / Trocar de Conta'}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter font-sans">
                  Encerra a sessão ativa com segurança e retorna ao Login
                </p>
              </div>
            </button>

            {/* Excluir Minha Conta / Cadastro */}
            <div className="h-[1px] bg-slate-700/30 mx-6" />
            <button 
              type="button"
              id="settings-wipe-all-btn"
              onClick={(e) => {
                e.preventDefault();
                setIsConfirmingDelete(true);
              }}
              disabled={isWipingAll}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-500/10 active:bg-red-500/20 transition-all group cursor-pointer text-left border-none bg-transparent pointer-events-auto select-none"
            >
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center text-red-400 group-hover:text-red-300 transition-colors">
                {isWipingAll ? (
                  <Loader2 className="animate-spin text-red-500" size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase text-red-400 group-hover:text-red-300 transition-colors">
                  {isWipingAll ? 'Excluindo minha conta...' : 'Excluir Minha Conta / Cadastro'}
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter font-sans leading-relaxed">
                  Exclui permanentemente seu e-mail, perfil, estatísticas de jogo e conquistas do servidor e limpa os dados locais
                </p>
              </div>
            </button>



          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Guidelines & Conduct Modal */}
      {showGuidelines && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="fixed inset-0 z-50 bg-slate-950/98 overflow-y-auto flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 p-4 md:p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-slate-950 shadow-md">
                <Shield size={20} className="fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Diretrizes & Conduta</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">RodoPlay Central de Segurança</p>
              </div>
            </div>
            <button 
              onClick={() => setShowGuidelines(false)}
              className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl mx-auto w-full p-6 md:p-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black bg-yellow-400/10 text-yellow-500 px-3 py-1 rounded-full uppercase tracking-widest border border-yellow-500/20">
                Segurança em Primeiro Lugar
              </span>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mt-3">NORMAS OPERACIONAIS</h1>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider max-w-md mx-auto">
                Termos de compromisso de conduta para motoristas parceiros e operadores rodoviários do aplicativo RodoPlay.
              </p>
            </div>

            <div className="space-y-6">
              {/* Item 1 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-black text-xs">
                    01
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Uso Seguro Fora de Condução</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">
                  É terminantemente proibido jogar ou ler notificações enquanto estiver conduzindo um veículo real na rodovia. O RodoPlay deve ser usado estritamente com o veículo estacionado, em momentos de repouso, pausas regulamentares ou em sala de treinamento.
                </p>
              </div>

              {/* Item 3 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                    02
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Idoneidade nas Respostas</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">
                  As tarefas de simulação de placas, ordem de rota e manobras de pátio devem ser executadas com dedicação individual. O uso de artifícios maliciosos, trapaças ou bots desqualifica a pontuação nacional da praça e invalida o aprendizado.
                </p>
              </div>

              {/* Item 4 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-black text-xs">
                    03
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Diretrizes do CTB e CONTRAN</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">
                  Nosso conteúdo didático é formulado de acordo com as leis do Código de Trânsito Brasileiro e resoluções federais. Embora atualizado constantemente, o RodoPlay é uma ferramenta educativa de gamificação e não substitui os manuais normativos oficiais das concessionárias ou do trânsito.
                </p>
              </div>

              {/* Item 5 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xs">
                    04
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Preservação da Saúde e Sono</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400 font-sans">
                  {player?.displayName ? player.displayName : 'Operador'}, sua integridade física é prioridade. Mantenha rotinas de sono regulares e hidrate-se durante as jornadas. Evite usar o aplicativo excessivamente para não comprometer seus períodos mínimos de descanso obrigatórios por lei.
                </p>
              </div>
            </div>

            {/* Acknowledgment block */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-center mb-8">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-yellow-400/10 rounded-full flex items-center justify-center text-yellow-400">
                  <FileText size={24} />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-white tracking-wider">Compromisso do Motorista</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  Ao usar este aplicativo, você atesta responsabilidade total por suas atitudes no trânsito real.
                </p>
              </div>
              <Button 
                onClick={() => setShowGuidelines(false)}
                className="w-full h-12 bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/10 transition-all cursor-pointer"
              >
                Ciente e De Acordo
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Professional Deletion Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-sm bg-slate-900 border-2 border-red-500/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
          >
            {/* Warning Glow element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Trash visual badge */}
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center text-red-500 shadow-md">
              <Trash2 size={28} />
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-black bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-1 rounded-lg uppercase tracking-widest leading-none">
                Confirmação Crítica
              </span>
              <h3 className="text-sm font-black text-white uppercase italic tracking-tight pt-2">
                Excluir Conta Permanentemente
              </h3>
              <p className="text-[11px] font-medium text-slate-400 leading-normal uppercase tracking-wide">
                Essa ação apagará permanentemente sua conta, rankings, partidas, patrulhas, pontuações e todos os dados vinculados. Essa ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {/* Confirm deletion */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWipeAllAccounts}
                className="w-full h-12 bg-red-500 hover:bg-red-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/15 border-none"
              >
                <span>Excluir Permanentemente</span>
              </motion.button>

              {/* Cancel deletion */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsConfirmingDelete(false)}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <span>Cancelar</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
