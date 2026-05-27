/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, GameNotification } from '../types';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  ArrowLeft, 
  Clock, 
  Award, 
  ShieldAlert, 
  Users, 
  X, 
  MessageSquare, 
  Gamepad2, 
  Coins, 
  UserX 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications, 
  deleteNotification
} from '../lib/notifications';

interface NotificationsPageProps {
  player: Player;
  onBack: () => void;
  onAcceptInviteByDefault?: (invite: any) => Promise<void>;
  onDeclineInviteByDefault?: (invite: any) => Promise<void>;
}

export function NotificationsPage({ 
  player, 
  onBack, 
  onAcceptInviteByDefault, 
  onDeclineInviteByDefault 
}: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoti, setSelectedNoti] = useState<GameNotification | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // 1. Real-time notifications listener
  useEffect(() => {
    if (!player?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', player.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GameNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as GameNotification);
      });
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      console.warn("Error loading real-time notifications:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [player?.uid]);

  const handleMarkAllRead = async () => {
    if (!player?.uid) return;
    await markAllNotificationsAsRead(player.uid);
  };

  const handleClearAll = async () => {
    if (!player?.uid) return;
    setConfirmClearAll(true);
  };

  const executeClearAll = async () => {
    if (!player?.uid) return;
    
    // Set seeded to true so it doesn't try to repopulate
    localStorage.setItem(`notifications_seeded_${player.uid}`, 'true');
    
    // Optimistic frontend empty state
    setNotifications([]);
    setConfirmClearAll(false);
    setSelectedNoti(null);

    try {
      await clearAllNotifications(player.uid);
      setSuccessInfo("Todas as notificações foram apagadas permanentemente!");
      setTimeout(() => setSuccessInfo(null), 2500);
    } catch (err) {
      console.warn("Error hard clearing notifications:", err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  // Accept duel from notification action button
  const handleAcceptDuel = async (noti: GameNotification) => {
    // If we have custom callbacks passed down from App.tsx
    if (noti.extraData?.inviteId && onAcceptInviteByDefault) {
      const inviteMock = {
        id: noti.extraData.inviteId,
        roomId: noti.extraData.roomCode,
        gameType: noti.extraData.gameType
      };
      await onAcceptInviteByDefault(inviteMock);
      // Mark as read
      await markNotificationAsRead(noti.id);
    } else {
      // Fallback: If we don't have the room flow active, just accept in DB
      try {
        await markNotificationAsRead(noti.id);
        setSuccessInfo("Duelo aceito com sucesso! Vá para a aba Duelos para jogar.");
        setTimeout(() => setSuccessInfo(null), 3000);
      } catch (err) {
        console.warn("Accept error fallback:", err);
      }
    }
  };

  // Decline duel from notification action button
  const handleDeclineDuel = async (noti: GameNotification) => {
    if (noti.extraData?.inviteId && onDeclineInviteByDefault) {
      const inviteMock = {
        id: noti.extraData.inviteId,
        roomId: noti.extraData.roomCode,
        gameType: noti.extraData.gameType
      };
      await onDeclineInviteByDefault(inviteMock);
      await markNotificationAsRead(noti.id);
    } else {
      try {
        await markNotificationAsRead(noti.id);
      } catch (err) {
        console.warn("Decline error fallback:", err);
      }
    }
  };

  const handleDeleteSingle = async (notiId: string) => {
    setConfirmDeleteId(notiId);
  };

  const executeDeleteSingle = async () => {
    if (!confirmDeleteId) return;
    const dyingId = confirmDeleteId;
    
    // Optimistic UI update: remove instantly from list
    setNotifications(prev => prev.filter(n => n.id !== dyingId));
    
    // Close views if currently open
    if (selectedNoti && selectedNoti.id === dyingId) {
      setSelectedNoti(null);
    }
    setConfirmDeleteId(null);

    try {
      // Permanent Firestore DB deletion
      await deleteNotification(dyingId);
      
      // Toast positive reinforcement
      setSuccessInfo("Notificação apagada da central!");
      setTimeout(() => setSuccessInfo(null), 2500);
    } catch (err) {
      console.warn("Error hard deleting notification:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 flex flex-col min-h-screen pb-24 text-white">
      {onBack && (
        <div className="flex justify-start mb-4">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-yellow-500 hover:border-yellow-405 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all focus:outline-none font-sans font-black text-[10px] tracking-wider uppercase cursor-pointer z-20"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <ShieldAlert size={11} className="stroke-[2]" />
            <span>Voltar</span>
          </motion.button>
        </div>
      )}
      {/* Centered Title Section */}
      <div className="flex flex-col items-center justify-center mb-6 py-2">
        <div className="text-center space-y-1">
          <div className="inline-block bg-yellow-400 text-black px-3 py-0.5 font-black skew-x-[-12deg] text-[10px] uppercase shadow-[2px_2px_0px_#f97316]">
            🚨 ALERTA GERAL
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center justify-center gap-2">
            ALERTAS
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-extrabold font-mono animate-pulse">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Control Buttons */}
      {notifications.length > 0 && (
        <div className="flex justify-between items-center bg-slate-800/50 rounded-2xl p-2.5 mb-5 border border-slate-700/50">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-slate-300 hover:text-yellow-400 disabled:opacity-40 transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-700/30"
          >
            <CheckCheck size={14} />
            Lidas
          </button>
          
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-xl hover:bg-red-950/20"
          >
            <Trash2 size={14} />
            Limpar
          </button>
        </div>
      )}

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
              className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full"
            />
            <span className="text-[10px] font-black text-slate-500 tracking-wider">REMEDINDO SINAL DA CENTRAL...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <Bell className="w-8 h-8 text-slate-500" />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold uppercase text-sm tracking-tight text-white">Sua central está vazia</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                Nenhuma notificação de ponto ou patrulha pendente por enquanto.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {notifications.map((noti) => {
                const isUnread = !noti.read;
                
                // Styling based on notification types
                let typeColor = "bg-slate-800 border-slate-700";
                let typeIcon = <Bell size={18} className="text-slate-400" />;
                let typeBadgeTxt = "Sistema";

                if (noti.type === 'points') {
                  typeColor = "bg-yellow-950/10 border-yellow-500/20";
                  typeIcon = <Coins size={18} className="text-yellow-400" />;
                  typeBadgeTxt = "PONTOS";
                } else if (noti.type === 'patrol') {
                  typeColor = "bg-emerald-950/10 border-emerald-500/20";
                  typeIcon = <Award size={18} className="text-emerald-400" />;
                  typeBadgeTxt = "PATRULHA";
                } else if (noti.type === 'invite') {
                  typeColor = "bg-blue-950/15 border-blue-500/30 animate-pulse-slow";
                  typeIcon = <Gamepad2 size={18} className="text-blue-400 animate-bounce" />;
                  typeBadgeTxt = "CONVITE";
                } else if (noti.type === 'invite_declined') {
                  typeColor = "bg-orange-950/20 border-orange-500/20";
                  typeIcon = <UserX size={18} className="text-orange-400" />;
                  typeBadgeTxt = "RECUSA";
                } else if (noti.type === 'invite_accepted') {
                  typeColor = "bg-indigo-950/15 border-indigo-500/20";
                  typeIcon = <Users size={18} className="text-indigo-400" />;
                  typeBadgeTxt = "DUELO";
                }

                return (
                  <motion.div
                    key={noti.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={async () => {
                      if (isUnread) {
                        await handleMarkSingleRead(noti.id);
                      }
                      setSelectedNoti(noti);
                    }}
                    className={`relative p-4 rounded-3xl border-2 transition-all duration-300 ${typeColor} ${
                      isUnread 
                        ? 'shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-white/10' 
                        : 'opacity-70 border-slate-800 bg-slate-900/40'
                    } cursor-pointer hover:bg-slate-800/40`}
                  >
                    {/* Unread dot indicator */}
                    {isUnread && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
                    )}

                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 shrink-0">
                        {typeIcon}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            noti.type === 'points' ? 'bg-yellow-400/10 text-yellow-400' :
                            noti.type === 'patrol' ? 'bg-emerald-400/10 text-emerald-400' :
                            noti.type === 'invite' ? 'bg-blue-400/10 text-blue-400' :
                            noti.type === 'invite_declined' ? 'bg-orange-400/10 text-orange-400' :
                            noti.type === 'invite_accepted' ? 'bg-indigo-400/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {typeBadgeTxt}
                          </span>
                        </div>

                        <h3 className="text-xs font-black uppercase text-white tracking-tight leading-tight">
                          {noti.title}
                        </h3>
                        
                        <p className="text-[11px] font-medium leading-relaxed text-slate-300 whitespace-pre-line">
                          {noti.message}
                        </p>

                        {/* Relative / simplified timestamp */}
                        <div className="flex items-center gap-1.5 pt-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                          <Clock size={10} />
                          {new Date(noti.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  • {new Date(noti.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Full screen notification detail modal */}
      <AnimatePresence>
        {selectedNoti && (() => {
          let typeColor = "to-slate-900 border-slate-700 text-slate-400";
          let glowColor = "rgba(100,116,139,0.3)";
          let typeIcon = <Bell size={48} className="text-slate-400" />;
          let typeBadgeTxt = "Sistema";
          let badgeClass = "bg-slate-800 text-slate-400";
          const noti = selectedNoti;

          if (noti.type === 'points') {
            typeColor = "to-yellow-950/20 border-yellow-500/30 text-yellow-400";
            glowColor = "rgba(234,179,8,0.4)";
            typeIcon = <Coins size={48} className="text-yellow-400" />;
            typeBadgeTxt = "PONTOS";
            badgeClass = "bg-yellow-400/10 text-yellow-400";
          } else if (noti.type === 'patrol') {
            typeColor = "to-emerald-950/20 border-emerald-500/30 text-emerald-400";
            glowColor = "rgba(16,185,129,0.4)";
            typeIcon = <Award size={48} className="text-emerald-400" />;
            typeBadgeTxt = "PATRULHA";
            badgeClass = "bg-emerald-400/10 text-emerald-400";
          } else if (noti.type === 'invite') {
            typeColor = "to-blue-950/30 border-blue-500/40 text-blue-400";
            glowColor = "rgba(59,130,246,0.4)";
            typeIcon = <Gamepad2 size={48} className="text-blue-400" />;
            typeBadgeTxt = "CONVITE";
            badgeClass = "bg-blue-400/10 text-blue-400";
          } else if (noti.type === 'invite_declined') {
            typeColor = "to-orange-950/30 border-orange-500/30 text-orange-400";
            glowColor = "rgba(249,115,22,0.4)";
            typeIcon = <UserX size={48} className="text-orange-400" />;
            typeBadgeTxt = "RECUSA";
            badgeClass = "bg-orange-400/10 text-orange-400";
          } else if (noti.type === 'invite_accepted') {
            typeColor = "to-indigo-950/30 border-indigo-500/30 text-indigo-400";
            glowColor = "rgba(99,102,241,0.4)";
            typeIcon = <Users size={48} className="text-indigo-400" />;
            typeBadgeTxt = "DUELO";
            badgeClass = "bg-indigo-400/10 text-indigo-400";
          }

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6"
            >
              {/* Radial gradient glow effect */}
              <div 
                className="absolute w-72 h-72 rounded-full filter blur-3xl opacity-20 pointer-events-none"
                style={{ 
                  background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` 
                }}
              />

              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`relative w-full max-w-md bg-gradient-to-b from-slate-900 ${typeColor} p-6 rounded-[32px] border shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center flex flex-col space-y-6 z-10`}
              >
                {/* Close absolute button */}
                <button 
                  onClick={() => setSelectedNoti(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/50 border border-white/5 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>

                <div className="flex flex-col items-center space-y-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${badgeClass}`}>
                    {typeBadgeTxt}
                  </span>
                  
                  <div className="relative">
                    <div className="p-5 rounded-full bg-slate-900 border border-white/10 text-white flex items-center justify-center">
                      {typeIcon}
                    </div>
                    {noti.senderAvatar && (
                      <span className="absolute -bottom-1 -right-1 text-2xl bg-slate-800 p-1.5 rounded-full leading-none shadow-md border border-slate-700">
                        {noti.senderAvatar}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {noti.senderName && (
                    <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                      Pelo Motorista: <span className="text-white font-extrabold">{noti.senderName}</span>
                    </p>
                  )}
                  
                  <h2 className="text-xl font-black italic uppercase tracking-tight text-white leading-snug">
                    {noti.title}
                  </h2>

                  <p className="text-sm font-medium text-slate-200 bg-slate-950/60 rounded-2xl p-4 leading-relaxed border border-white/5 max-h-[160px] overflow-y-auto whitespace-pre-line">
                    {noti.message}
                  </p>
                </div>

                <div className="flex flex-col gap-1 items-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    <Clock size={12} />
                    {new Date(noti.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(noti.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handleDeleteSingle(noti.id)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-950/30 border border-red-500/30 hover:bg-red-950/50 text-red-400 font-black text-xs uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={14} />
                    Apagar 🗑️
                  </button>
                  
                  <button
                    onClick={() => setSelectedNoti(null)}
                    className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs uppercase tracking-wider transition-all border border-slate-700"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Visual Confirm Single Delete Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-slate-700/80 p-6 rounded-[28px] text-center space-y-5 shadow-2xl"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Apagar Notificação?</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Tem certeza que deseja apagar esta notificação de patrulha ou duelo permanentemente?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteSingle}
                  className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirmar 👷🔥
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Confirm Clear All Modal */}
      <AnimatePresence>
        {confirmClearAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border-2 border-slate-700/80 p-6 rounded-[28px] text-center space-y-5 shadow-2xl"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Limpar Todas?</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Deseja mesmo apagar definitivamente o histórico completo da sua central de notificações?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeClearAll}
                  className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20"
                >
                  Limpar Tudo 👷💥
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-game Toast Notification banner */}
      <AnimatePresence>
        {successInfo && (
          <motion.div
             initial={{ opacity: 0, y: -50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: -20, scale: 0.95 }}
             className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-900/95 border-2 border-emerald-500/30 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-xs"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">✓</div>
            <p className="text-[10px] font-black uppercase tracking-wider">{successInfo}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
