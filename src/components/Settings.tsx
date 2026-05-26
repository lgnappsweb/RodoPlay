/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Player } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { LogOut, User, Camera, Shield, Check, RefreshCw, Upload, Sun, Moon, Palette, Smartphone, Monitor, Laptop, HelpCircle, Activity, Trash2, X, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BASE_OPTIONS, SHIFT_OPTIONS } from '../constants';
import { ALL_AVATARS } from '../data/avatars';
import { getThemeSettings, saveThemeSettings, applyTheme } from '../lib/theme';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

interface SettingsProps {
  player: Player;
  onUpdate: (data: Partial<Player>) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteProfile: (password?: string) => Promise<void>;
}

export function Settings({ player, onUpdate, onLogout, onDeleteProfile }: SettingsProps) {
  const [name, setName] = useState(player.displayName);
  const [shift, setShift] = useState(player.shift);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar || '👷');
  const [avatarBatchIndex, setAvatarBatchIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  
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
    setSelectedAvatar(player.avatar || '👷');
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
  };

  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color);
    const newConfig = { mode: themeMode, primary: color, secondary: secondaryColor };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
    const newConfig = { mode: themeMode, primary: primaryColor, secondary: color };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
  };

  const handlePresetSelect = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    const newConfig = { mode: themeMode, primary, secondary };
    saveThemeSettings(newConfig);
    applyTheme(newConfig);
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
  const currentAvatars = ALL_AVATARS.slice(
    avatarBatchIndex * BATCH_SIZE,
    (avatarBatchIndex * BATCH_SIZE) + BATCH_SIZE
  );

  const rotateAvatars = () => {
    const nextIndex = (avatarBatchIndex + 1) % Math.ceil(ALL_AVATARS.length / BATCH_SIZE);
    setAvatarBatchIndex(nextIndex);
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
    <div className="space-y-8 p-4 pb-28">
      <div className="flex items-center gap-4 mb-4">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-5xl border-2 border-slate-700 shadow-xl overflow-hidden select-none leading-none shrink-0">
               {isImageAvatar ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                  selectedAvatar
               )}
            </div>
            <div>
               <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">AJUSTES</h2>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-tight">Configurações de Perfil</p>
            </div>
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

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Escolher Avatar</label>
            <button 
              onClick={rotateAvatars}
              className="text-[10px] font-black uppercase text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Trocar Lote
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3 bg-slate-800/50 p-4 rounded-[2rem] border border-slate-700/50">
            {currentAvatars.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedAvatar(emoji)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl leading-none select-none transition-all ${
                  selectedAvatar === emoji ? 'bg-yellow-400 scale-110 shadow-lg' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
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

        {/* Card de Sessões e Multi-dispositivos */}
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-[2rem] overflow-hidden p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
               <Smartphone size={20} className="text-yellow-400 animate-pulse" />
            </div>
            <div className="flex-1">
               <p className="text-xs font-black uppercase text-white">Sessões e Dispositivos</p>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Status Multi-Dispositivo</p>
            </div>
            <span className="text-[9px] font-black bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-full uppercase tracking-wider font-sans">
              {sessions.length} {sessions.length === 1 ? 'Dispositivo Logado' : 'Dispositivos Logados'}
            </span>
          </div>

          <p className="text-[10px] text-slate-400 uppercase font-semibold leading-relaxed">
            Você pode acessar sua conta em vários dispositivos ao mesmo tempo. Gerencie seus logins ativos abaixo:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSessionIdLoc;
              const formattedTime = sess.loginTime ? new Date(sess.loginTime).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A';

              let DeviceIcon = Laptop;
              if (sess.platform === 'Mobile') DeviceIcon = Smartphone;
              if (sess.platform === 'Tablet') DeviceIcon = Laptop;
              if (sess.platform === 'Desktop') DeviceIcon = Monitor;

              return (
                <div 
                  key={sess.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    isCurrent 
                      ? 'bg-slate-900/80 border-yellow-400/30 shadow-md ring-1 ring-yellow-400/10' 
                      : 'bg-slate-900/40 border-slate-700/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 shrink-0 ${
                    isCurrent ? 'bg-yellow-400/10 text-yellow-400' : 'bg-slate-800'
                  }`}>
                    <DeviceIcon size={18} />
                  </div>

                  <div className="min-w-0 flex-1 relative">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase text-white truncate">{sess.deviceName || 'Conexão Segura'}</p>
                      {isCurrent && (
                        <span className="text-[7px] font-black bg-yellow-400 text-slate-950 px-1 py-0.5 rounded uppercase leading-none">
                          ATUAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 relative ${
                        sess.online ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}>
                        {sess.online && (
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        )}
                      </span>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter ml-1 truncate">
                        {sess.online ? 'ONLINE AGORA' : 'AUSENTE'} • LOGIN EM {formattedTime}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0 cursor-pointer"
                      title="Desconectar este dispositivo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className="text-center py-4 bg-slate-900/20 rounded-2xl border border-slate-800/40">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Buscando sessões operacionais...</p>
              </div>
            )}
          </div>
        </Card>

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



          </CardContent>
        </Card>

        <div className="fixed bottom-24 left-0 right-0 p-4 px-8 pointer-events-none">
          <div className="max-w-md mx-auto w-full pointer-events-auto">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className={`w-full h-14 font-black rounded-2xl uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${
                hasChanges 
                  ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300 scale-100 opacity-100 animate-pulse' 
                  : 'bg-slate-800 text-slate-500 scale-95 opacity-50'
              }`}
            >
              <Check size={20} />
              Salvar Alterações
            </Button>
          </div>
        </div>
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

              {/* Item 2 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-black text-xs">
                    02
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Respeito Mútuo no Multiplayer</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">
                  Os lobbies multiplayer e disputas por pontuação exigem ética profissional. Nomes de usuário ofensivos, xingamentos, preconceitos ou assédio moral contra outros motoristas resultarão em cancelamento definitivo da conta de motorista.
                </p>
              </div>

              {/* Item 3 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                    03
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
                    04
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
                    05
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">Preservação da Saúde e Sono</h4>
                </div>
                <p className="text-[10px] leading-relaxed font-semibold uppercase text-slate-400">
                  Operador, sua integridade física é prioridade. Mantenha rotinas de sono regulares e hidrate-se durante as jornadas. Evite usar o aplicativo excessivamente para não comprometer seus períodos mínimos de descanso obrigatórios por lei.
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

    </div>
  );
}
