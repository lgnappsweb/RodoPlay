import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Player } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot, 
  orderBy, 
  limit, 
  startAfter, 
  QueryConstraint,
  writeBatch
} from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  Clock, 
  Check, 
  X, 
  Ban, 
  AlertTriangle, 
  Search, 
  BarChart3, 
  FileText, 
  Settings, 
  MessageSquare, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Hash,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { BASE_OPTIONS, SHIFT_OPTIONS } from '../constants';
import { sanitizeId } from '../lib/rankingSync';

interface AdminPanelProps {
  player: Player;
  onBack: () => void;
}

export function AdminPanel({ player, onBack }: AdminPanelProps) {
  // Navigation tabs
  type TabType = 'pendente' | 'aprovado' | 'bloqueado' | 'auditoria' | 'settings';
  const [activeTab, setActiveTab ] = useState<TabType>('pendente');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Loading States
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingNotis, setLoadingNotis] = useState(false);

  // States
  const [users, setUsers] = useState<Player[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Dashboard indicators
  const [counts, setCounts] = useState({
    approved: 0,
    pending: 0,
    blocked: 0,
    total: 0
  });

  // Central config state
  const [whatsappAdmin, setWhatsappAdmin] = useState('5511999999999');
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pendente' | 'aprovado' | 'bloqueado' | 'rejeitado'>('pendente');
  const [userBaseFilter, setUserBaseFilter] = useState('all');
  const [userShiftFilter, setUserShiftFilter] = useState('all');

  // Pagination for users
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [docHistory, setDocHistory] = useState<any[]>([]);
  const USERS_PER_PAGE = 10;
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  // Search input for audit logs
  const [auditSearch, setAuditSearch] = useState('');
  const [allPlayersList, setAllPlayersList] = useState<Player[]>([]);

  // Custom states for admin action confirmations
  interface ActionConfirmState {
    uid: string;
    actionName: 'aprovar' | 'rejeitar' | 'bloquear' | 'suspender' | 'excluir';
    displayName: string;
    email: string;
  }
  const [actionConfirm, setActionConfirm] = useState<ActionConfirmState | null>(null);

  // Custom toast notification status banner state
  const [toastAlert, setToastAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert]);

  // 1. Listen to counts and settings in Real-time
  useEffect(() => {
    // Counter aggregates
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snap) => {
      let app = 0, pen = 0, blo = 0, tot = 0;
      const plist: Player[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Player;
        const p = { ...raw, uid: docSnap.id };
        plist.push(p);

        tot++;
        // If lgngregorio, default count as approved
        const emailLower = p.email?.toLowerCase() || '';
        const status = p.statusConta || (emailLower === 'lgngregorio@icloud.com' ? 'aprovado' : 'aprovado');
        
        if (status === 'pendente') pen++;
        else if (status === 'bloqueado') blo++;
        else app++;
      });
      setCounts({ approved: app, pending: pen, blocked: blo, total: tot });
      setAllPlayersList(plist);
    });

    // Central Config Settings
    const unsubConfig = onSnapshot(doc(db, 'config', 'appSettings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.whatsappAdmin) {
          setWhatsappAdmin(data.whatsappAdmin);
        }
      }
    });

    // Unread counts for notifications live stream
    const notisQuery = query(
      collection(db, 'admin_notifications'), 
      orderBy('dataCadastro', 'desc'),
      limit(20)
    );
    const unsubNotis = onSnapshot(notisQuery, (snap) => {
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      setNotifications(list);
    });

    return () => {
      unsubPlayers();
      unsubConfig();
      unsubNotis();
    };
  }, []);

  // 2. Fetch Audit Logs with filter
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'auditoria'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      setAuditLogs(list);
    } catch (e) {
      console.warn("Error fetching audit logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'auditoria') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // 3. Paginated and filtered user list
  const fetchUsersList = async (isNext = false, isPrev = false) => {
    setLoadingUsers(true);
    try {
      // Because we want to filter with compound predicates and support simple indexing:
      // We will perform target lookup:
      const constraints: QueryConstraint[] = [];
      
      // Fetch all players to perform high performance client pagination without complex indexes constraints
      const q = query(collection(db, 'players'), orderBy('displayName', 'asc'));
      const snap = await getDocs(q);
      
      let filtered: Player[] = [];
      snap.forEach((d) => {
        const p = { ...(d.data() as Player), uid: d.id };
        const rawEmail = p.email?.toLowerCase() || '';
        const rawName = p.displayName?.toLowerCase() || '';
        const searchNorm = userSearch.toLowerCase();
        
        // Exact status evaluation
        const currentStatus = p.statusConta || (rawEmail === 'lgngregorio@icloud.com' ? 'aprovado' : 'aprovado');
        
        // Match Search Keyword
        const matchesSearch = !userSearch || 
          rawEmail.includes(searchNorm) || 
          rawName.includes(searchNorm);
        
        // Match Status
        let matchesStatus = false;
        if (userStatusFilter === 'all') {
          matchesStatus = true;
        } else if (userStatusFilter === 'bloqueado') {
          matchesStatus = currentStatus === 'bloqueado' || currentStatus === 'rejeitado';
        } else {
          matchesStatus = currentStatus === userStatusFilter;
        }
        
        // Match Base
        const matchesBase = userBaseFilter === 'all' || p.base === userBaseFilter;
        
        // Match Shift
        const matchesShift = userShiftFilter === 'all' || p.shift === userShiftFilter;

        if (matchesSearch && matchesStatus && matchesBase && matchesShift) {
          filtered.push(p);
        }
      });

      setTotalFilteredCount(filtered.length);

      // Perform custom mathematical pagination slice
      const startIdx = (currentPage - 1) * USERS_PER_PAGE;
      const paginatedResults = filtered.slice(startIdx, startIdx + USERS_PER_PAGE);
      setUsers(paginatedResults);

    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pendente' || activeTab === 'aprovado' || activeTab === 'bloqueado') {
      fetchUsersList();
    }
  }, [activeTab, userSearch, userStatusFilter, userBaseFilter, userShiftFilter, currentPage]);

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      if (currentPage * USERS_PER_PAGE < totalFilteredCount) {
        setCurrentPage(prev => prev + 1);
      }
    } else {
      if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    }
  };

  // 4. Quick Action Helpers (Approve, Reject, Block, Suspend, Delete)
  const triggerUserAction = (targetUid: string, actionName: 'aprovar' | 'rejeitar' | 'bloquear' | 'suspender' | 'excluir') => {
    const matchedUser = allPlayersList.find(u => u.uid === targetUid) || users.find(u => u.uid === targetUid);
    if (!matchedUser) {
      setToastAlert({ type: 'error', message: 'Usuário não localizado no sistema.' });
      return;
    }

    if (matchedUser.email?.toLowerCase() === 'lgngregorio@icloud.com') {
      setToastAlert({ type: 'error', message: 'Ações de administração de login são restritas para a conta mestre.' });
      return;
    }

    setActionConfirm({
      uid: targetUid,
      actionName,
      displayName: matchedUser.displayName || 'Jogador',
      email: matchedUser.email || ''
    });
  };

  const confirmAndExecuteAction = async () => {
    if (!actionConfirm) return;
    const { uid: targetUid, actionName, displayName, email } = actionConfirm;

    setActionConfirm(null);
    setLoadingUsers(true);

    try {
      const playerRef = doc(db, 'players', targetUid);
      const userRef = doc(db, 'users', targetUid);
      
      let statusConta = 'aprovado';
      let aprovado = true;
      let auditMsg = '';

      if (actionName === 'rejeitar') {
        statusConta = 'rejeitado';
        aprovado = false;
        auditMsg = 'Cadastro rejeitado pelo administrador';
      } else if (actionName === 'bloquear') {
        statusConta = 'bloqueado';
        aprovado = false;
        auditMsg = 'Acesso bloqueado pelo administrador';
      } else if (actionName === 'suspender') {
        statusConta = 'pendente';
        aprovado = false;
        auditMsg = 'Acesso suspenso para análise pelo administrador';
      } else if (actionName === 'aprovar') {
        statusConta = 'aprovado';
        aprovado = true;
        auditMsg = 'Cadastro aprovado pelo administrador';
      }

      if (actionName === 'excluir') {
        // Direct batch purge
        const batch = writeBatch(db);
        batch.delete(playerRef);
        batch.delete(userRef);
        batch.delete(doc(db, 'rankings/global/players', targetUid));
        
        await batch.commit();

        // Audit exclusion
        const auditId = `audit_${Date.now()}_del_${targetUid}`;
        await setDoc(doc(db, 'auditoria', auditId), {
          id: auditId,
          userId: targetUid,
          userName: displayName,
          userEmail: email,
          adminId: player.uid,
          adminName: player.displayName,
          adminEmail: player.email,
          action: 'Exclusão de conta',
          details: `O administrador removeu permanentemente a conta, o pedido e o perfil de ${displayName} (${email}).`,
          timestamp: new Date().toISOString()
        });

      } else {
        // Update both profiles for perfect synchronization
        await updateDoc(playerRef, { statusConta, aprovado });
        try {
          await updateDoc(userRef, { statusConta, aprovado });
        } catch (errUserDoc) {
          console.warn("User doc didn't exist or secure write: ", errUserDoc);
          try {
            await setDoc(userRef, { 
              uid: targetUid, 
              email: email, 
              statusConta, 
              aprovado 
            }, { merge: true });
          } catch(e) {}
        }

        // Sync to Rankings explicitly
        try {
          const rankGlobalRef = doc(db, 'rankings/global/players', targetUid);
          await updateDoc(rankGlobalRef, { statusConta, aprovado });
        } catch (rankErr) {
          console.warn("Rating not existing for updating status:", rankErr);
        }

        // Audit Log
        const auditId = `audit_${Date.now()}_status_${targetUid}`;
        await setDoc(doc(db, 'auditoria', auditId), {
          id: auditId,
          userId: targetUid,
          userName: displayName,
          userEmail: email,
          adminId: player.uid,
          adminName: player.displayName,
          adminEmail: player.email,
          action: actionName.toUpperCase(),
          details: `O status da conta do usuário ${displayName} (${email}) foi definido como "${statusConta}". ${auditMsg}.`,
          timestamp: new Date().toISOString()
        });
      }

      // Display beautiful confirmation toast
      const verb = actionName === 'excluir' ? 'excluído(a)' :
                   actionName === 'bloquear' ? 'bloqueado(a)' :
                   actionName === 'suspender' ? 'suspenso(a)' :
                   actionName === 'aprovar' ? 'aprovado(a)' : 'rejeitado(a)';

      setToastAlert({
        type: 'success',
        message: `O colaborador ${displayName} foi ${verb} com sucesso!`
      });
      fetchUsersList();
    } catch (e: any) {
      console.error(e);
      setToastAlert({
        type: 'error',
        message: "Houve um erro ao processar sua ação: " + e.message
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // 5. Read notification / clear all unread
  const handleMarkNotiRead = async (notiId: string) => {
    try {
      await updateDoc(doc(db, 'admin_notifications', notiId), { visualizado: true });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleMarkAllNotisRead = async () => {
    setLoadingNotis(true);
    try {
      const q = query(
        collection(db, 'admin_notifications'),
        where('visualizado', '==', false)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.update(doc(db, 'admin_notifications', docSnap.id), { visualizado: true });
      });
      await batch.commit();
      alert("Todas as notificações foram marcadas como lidas.");
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingNotis(false);
    }
  };

  // 6. Save Config central details
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'config', 'appSettings'), {
        whatsappAdmin: whatsappAdmin.replace(/\D/g, '')
      }, { merge: true });

      // Logger entries
      const auditId = `audit_${Date.now()}_config`;
      await setDoc(doc(db, 'auditoria', auditId), {
        id: auditId,
        userId: '',
        userName: '',
        userEmail: '',
        adminId: player.uid,
        adminName: player.displayName,
        adminEmail: player.email,
        action: 'ALTERAÇÃO DE CONFIGURAÇÃO',
        details: `O telefone de contato do administrador foi atualizado para: ${whatsappAdmin}.`,
        timestamp: new Date().toISOString()
      });

      alert("Configurações atualizadas e salvas com sucesso!");
      setShowSettingsModal(false);
    } catch (e: any) {
      alert("Falha ao salvar especificações: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const pendingUsersList = allPlayersList.filter(u => {
    const status = u.statusConta || (u.email?.toLowerCase() === 'lgngregorio@icloud.com' ? 'aprovado' : 'aprovado');
    return status === 'pendente' && u.email?.toLowerCase() !== 'lgngregorio@icloud.com';
  });

  return (
    <div className="space-y-6 pb-36 animate-fade-in text-white p-4">
      {/* Upper bar */}
      <div className="flex justify-between items-center bg-slate-900/95 border border-slate-800/80 p-4 rounded-3xl sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-yellow-450/15 border border-yellow-500/20 text-yellow-400">
            <Shield size={20} className="font-black animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">CONTROLE CORPORATIVO</h2>
            <p className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest italic -mt-0.5">Módulo de Administração Central</p>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE MENU ACTION BOARD */}
      {(activeTab === 'pendente' || activeTab === 'aprovado' || activeTab === 'bloqueado') && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters card */}
          <Card className="bg-slate-800/60 border-slate-700/50 rounded-[2rem] p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Search size={14} className="text-yellow-405" /> FILTRAR & BUSCAR COLABORADORES
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-1 md:col-span-2">
                <span className="text-[8px] font-black uppercase text-slate-500 ml-1">Pesquisar por Apelido ou E-mail</span>
                <input 
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-xs text-white outline-none focus:border-yellow-400"
                  placeholder="Procurar apelido, email ou credencial..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-700/40 pt-3">
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-500 ml-1">Filtrar por Base</span>
                <select
                  value={userBaseFilter}
                  onChange={(e: any) => {
                    setUserBaseFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-xs text-slate-200 outline-none focus:border-yellow-400"
                >
                  <option value="all">Todas as Bases</option>
                  {BASE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-500 ml-1">Filtrar por Turno</span>
                <select
                  value={userShiftFilter}
                  onChange={(e: any) => {
                    setUserShiftFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-12 bg-slate-900 border-2 border-slate-700 rounded-xl px-4 text-xs text-slate-200 outline-none focus:border-yellow-400"
                >
                  <option value="all">Todos os Turnos</option>
                  {SHIFT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {/* User Table Card */}
          <Card className="bg-slate-800/60 border-slate-700/50 rounded-[2rem] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-mono font-black text-slate-450 uppercase tracking-widest">
                Exibindo {users.length} de {totalFilteredCount} resultados
              </p>
              <div className="flex items-center gap-1 text-[9px] font-bold text-yellow-450/80 uppercase">
                <Users size={12} />
                <span>Base Ativa: RodoPlay</span>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 size={32} className="animate-spin text-yellow-400" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Sincronizando Colaboradores...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Nenhum colaborador coincide com os filtros.</p>
                <p className="text-[9px] text-slate-600 uppercase font-mono">Verifique os filtros de base, turno ou termos procurados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((u) => {
                  const isMestre = u.email?.toLowerCase() === 'lgngregorio@icloud.com';
                  const accountStatus = u.statusConta || (isMestre ? 'aprovado' : 'aprovado');
                  
                  return (
                    <div 
                      key={u.uid} 
                      className={`border rounded-[1.5rem] p-4 flex flex-col gap-4 bg-slate-900/40 relative overflow-hidden transition-colors ${
                        accountStatus === 'pendente' 
                          ? 'border-yellow-500/20 hover:border-yellow-500/40' 
                          : accountStatus === 'bloqueado' 
                          ? 'border-red-500/20 hover:border-red-500/40'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Avatar & Basic details */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-3xl border border-slate-700 overflow-hidden shrink-0 select-none">
                          {u.avatar?.startsWith('data') || u.avatar?.startsWith('http') ? (
                            <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            u.avatar || '👷'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-white uppercase truncate">{u.displayName}</p>
                            {isMestre && (
                              <span className="bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">MESTRE ADM</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 lowercase truncate leading-none mt-1">{u.email}</p>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[8px] font-black uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/80">
                              {u.base || 'Base 01'}
                            </span>
                            <span className="text-[8px] font-black uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/80">
                              {u.shift || 'Turno A'}
                            </span>
                          </div>
                        </div>

                        {/* Status Stamp Badge */}
                        <div className="text-right">
                          <span className={`inline-block py-1 px-3 rounded-full text-[8.5px] font-black uppercase tracking-widest ${
                            accountStatus === 'aprovado' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : accountStatus === 'bloqueado' 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : accountStatus === 'rejeitado'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'
                          }`}>
                            {accountStatus === 'aprovado' && 'Aprovado'}
                            {accountStatus === 'bloqueado' && 'Bloqueado'}
                            {accountStatus === 'pendente' && 'Pendente'}
                            {accountStatus === 'rejeitado' && 'Rejeitado'}
                          </span>
                        </div>
                      </div>

                      {/* Info logs */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/40 rounded-xl text-[9px] font-semibold text-slate-400 border border-white/5">
                        <div className="truncate">Pontos: <span className="font-mono text-white font-black">{u.totalScore || 0} xp</span></div>
                        <div>Nível: <span className="font-mono text-white font-black">{u.level || 1}</span></div>
                        <div className="truncate text-left shrink-0">Criado: <span className="font-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</span></div>
                        <div className="truncate">Último Login: <span className="font-mono">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : 'Sem login'}</span></div>
                      </div>

                      {/* Action buttons list */}
                      {!isMestre && (
                        <div className="flex flex-wrap gap-2 border-t border-slate-800/60 pt-3">
                          {accountStatus !== 'aprovado' && (
                            <button
                              onClick={() => triggerUserAction(u.uid, 'aprovar')}
                              className="flex-1 min-w-[80px] h-9 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95 duration-300"
                            >
                              <Check size={10} className="stroke-[3]" />
                              <span>Liberar</span>
                            </button>
                          )}

                          {accountStatus !== 'bloqueado' && (
                            <button
                              onClick={() => triggerUserAction(u.uid, 'bloquear')}
                              className="flex-1 min-w-[80px] h-9 px-3 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-red-500/20 flex items-center justify-center gap-1 cursor-pointer hover:border-red-500/40 active:scale-95 duration-300"
                            >
                              <Ban size={10} />
                              <span>Bloquear</span>
                            </button>
                          )}

                          {accountStatus === 'aprovado' && (
                            <button
                              onClick={() => triggerUserAction(u.uid, 'suspender')}
                              className="flex-1 min-w-[80px] h-9 px-3 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-amber-500/20 flex items-center justify-center gap-1 cursor-pointer hover:border-amber-500/40 active:scale-95 duration-300"
                            >
                              <Clock size={10} />
                              <span>Suspender</span>
                            </button>
                          )}

                          {accountStatus === 'pendente' && (
                            <button
                              onClick={() => triggerUserAction(u.uid, 'rejeitar')}
                              className="flex-1 min-w-[80px] h-9 px-3 bg-orange-500/10 hover:bg-orange-500 hover:text-slate-950 text-orange-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-orange-500/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95 duration-300"
                            >
                              <X size={10} />
                              <span>Rejeitar</span>
                            </button>
                          )}

                          <button
                            onClick={() => triggerUserAction(u.uid, 'excluir')}
                            className="h-9 w-9 bg-slate-900 hover:bg-red-600/20 text-slate-400 hover:text-red-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] rounded-xl transition-all duration-300 border border-slate-800 hover:border-red-500/30 flex items-center justify-center cursor-pointer ml-auto active:scale-95"
                            title="Remover permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                <div className="flex justify-between items-center bg-slate-900/40 border border-slate-750 p-4 rounded-2xl md:mt-4">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={currentPage === 1}
                    className="h-10 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all select-none cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  
                  <div className="text-center">
                    <p className="text-[10px] font-black text-yellow-405 uppercase">PÁGINA {currentPage}</p>
                    <p className="text-[7.5px] font-mono text-slate-500 mt-0.5">Mapeando {Math.min(currentPage*USERS_PER_PAGE, totalFilteredCount)} de {totalFilteredCount} itens</p>
                  </div>

                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={currentPage * USERS_PER_PAGE >= totalFilteredCount}
                    className="h-10 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all select-none cursor-pointer"
                  >
                    Próximo <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card className="bg-slate-800/60 border-slate-700/50 rounded-[2rem] p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <MessageSquare size={14} className="text-yellow-455" /> NOTIFICAÇÕES ADMINISTRATIVAS
              </h3>
              
              {notifications.some(n => !n.visualizado) && (
                <button
                  onClick={handleMarkAllNotisRead}
                  disabled={loadingNotis}
                  className="text-[9px] font-black uppercase text-yellow-405 bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none"
                >
                  Ler todas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 uppercase font-black">Nenhuma notificação emitida até o momento.</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col gap-2 ${
                      n.visualizado 
                        ? 'bg-slate-900/20 border-slate-800/50 opacity-70' 
                        : 'bg-yellow-500/5 border-yellow-500/20 animate-pulse'
                    }`}
                  >
                    {/* Badge type */}
                    <div className="flex justify-between items-start">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        n.type === 'Novo Cadastro' 
                          ? 'bg-yellow-400 text-slate-950' 
                          : n.type === 'Pedido de suporte'
                          ? 'bg-sky-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {n.type || 'Informativo'}
                      </span>
                      
                      <span className="text-[8px] font-mono text-slate-500">
                        {n.dataCadastro ? new Date(n.dataCadastro).toLocaleTimeString('pt-BR') : ''} • {n.dataCadastro ? new Date(n.dataCadastro).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 mt-1 font-semibold">{n.message}</p>

                    <div className="flex justify-between items-center text-[9px] text-slate-400 mt-2 border-t border-slate-850 pt-2 shrink-0">
                      <div>Base: <span className="font-bold text-white uppercase">{n.base || 'Não Aplicável'}</span></div>
                      {!n.visualizado && (
                        <button
                          onClick={() => handleMarkNotiRead(n.id)}
                          className="text-[8.5px] font-black uppercase text-emerald-400 hover:underline cursor-pointer"
                        >
                          ✓ Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="bg-slate-800/60 border-slate-700/50 rounded-[2rem] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-yellow-405" /> REGISTROS DE AUDITORIA
              </h3>
              <button 
                onClick={fetchAuditLogs}
                disabled={loadingLogs}
                className="text-[9px] font-black bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-400 hover:text-white uppercase transition-all select-none cursor-pointer"
              >
                Atualizar Logs
              </button>
            </div>

            {/* Micro Filter layout */}
            <div className="relative">
              <input 
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Digitar filtro de ação, usuário ou termos..."
                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-4 text-xs text-white outline-none focus:border-yellow-400"
              />
            </div>

            {loadingLogs ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-yellow-500" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {auditLogs
                  .filter(log => {
                    if (!auditSearch) return true;
                    const l = auditSearch.toLowerCase();
                    return (
                      log.action?.toLowerCase().includes(l) ||
                      log.userName?.toLowerCase().includes(l) ||
                      log.userEmail?.toLowerCase().includes(l) ||
                      log.details?.toLowerCase().includes(l)
                    );
                  })
                  .map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[10px] font-semibold space-y-1.5 transition-colors hover:border-slate-750">
                      <div className="flex justify-between items-start text-[8.5px] font-mono">
                        <span className="font-black text-yellow-500 uppercase tracking-widest bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-500/10">
                          {log.action}
                        </span>
                        <span className="text-slate-500">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('pt-BR') : ''} • {log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      
                      <p className="text-slate-200 mt-1 uppercase text-[9px] leading-normal">{log.details}</p>
                      
                      <div className="text-[8.5px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                        <span className="truncate max-w-[150px]">Colaborador: <span className="font-bold text-white lowercase">{log.userEmail || 'N/A'}</span></span>
                        {log.adminEmail && <span className="truncate max-w-[150px]">Admin: <span className="font-bold text-yellow-400 lowercase">{log.adminEmail}</span></span>}
                      </div>
                    </div>
                  ))}

                {auditLogs.length === 0 && (
                  <p className="text-xs text-slate-600 font-bold text-center py-8 uppercase">Nenhum evento auditado localizado.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="bg-slate-800/60 border-slate-700/50 rounded-[2rem] p-6 space-y-6">
            <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2 border-b border-slate-700/50 pb-3">
              <Settings size={14} className="text-yellow-405 animate-spin-slow" /> CONFIGURAÇÕES DO ADMINISTRADOR
            </h3>

            {/* Central admin number parameter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">WhatsApp Telefone do Administrador (Para Liberação)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={whatsappAdmin}
                  onChange={(e) => setWhatsappAdmin(e.target.value)}
                  className="w-full h-14 bg-slate-900 border-2 border-slate-700 rounded-2xl px-5 text-white font-mono font-bold outline-none focus:border-yellow-400"
                  placeholder="Ex: 5511999999999"
                />
              </div>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight italic ml-1">
                Insira o código internacional (55) + DDD (2 dígitos) + o número completo sem espaços ou traços. Este número será anexado automaticamente ao botão de solicitação de liberação do WhatsApp dos novos colaboradores registrados sob status "Pendente".
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || !whatsappAdmin.trim()}
              className="w-full h-14 rounded-xl bg-yellow-450 hover:bg-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {savingSettings ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Check size={16} className="stroke-[3]" />
              )}
              <span>{savingSettings ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>

            {/* Premium Corporate Logout/Exit Section */}
            <div className="border-t border-slate-700/40 pt-5 space-y-3">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block ml-1">ADMINISTRAÇÃO CENTRAL</span>
              <button
                onClick={onBack}
                className="w-full h-14 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} className="stroke-[2.5]" />
                <span>Encerrar Sessão & Sair</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Custom Modal for Corporate Settings (WhatsApp configuration) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-scale-in select-none">
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-yellow-500 animate-pulse" />

            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2.5 rounded-2xl bg-yellow-450/10 text-yellow-405 border border-yellow-500/20">
                  <Settings size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Ajustes de Contato</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest -mt-0.5">Parâmetro de Liberação Rápida</p>
                </div>
              </div>

              {/* Central admin number parameter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">
                  WhatsApp do Administrador
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={whatsappAdmin}
                    onChange={(e) => setWhatsappAdmin(e.target.value)}
                    className="w-full h-14 bg-slate-950 border-2 border-slate-800 focus:border-yellow-500 rounded-2xl px-5 text-white font-mono font-bold text-sm outline-none transition-all"
                    placeholder="Ex: 5511999999999"
                  />
                </div>
                <p className="text-[9px] text-slate-500 uppercase leading-snug font-bold tracking-tight italic block ml-1">
                  Insira o código do país (55) + DDD (2 dígitos) + o número de celular completo sem espaços ou traços. Este número é associado ao botão de contato para novos cadastros "Pendentes".
                </p>
              </div>

              <div className="flex gap-2.5 mt-6 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-755 text-slate-300 font-black text-[10px] uppercase tracking-wider border border-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || !whatsappAdmin.trim()}
                  className="flex-1 h-12 rounded-xl bg-yellow-400 hover:bg-yellow-350 disabled:opacity-40 text-slate-950 font-black text-[10px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingSettings ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Check size={14} className="stroke-[3]" />
                  )}
                  <span>{savingSettings ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Admin Actions */}
      {actionConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 rounded-[2.5rem] max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-scale-in">
            {/* Ambient pattern / card glow gradient */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              actionConfirm.actionName === 'excluir' ? 'bg-red-500' :
              actionConfirm.actionName === 'bloquear' ? 'bg-red-400' :
              actionConfirm.actionName === 'suspender' ? 'bg-amber-400' :
              actionConfirm.actionName === 'rejeitar' ? 'bg-orange-500' :
              'bg-emerald-500'
            }`} />

            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                actionConfirm.actionName === 'excluir' ? 'bg-red-500/10 text-red-500' :
                actionConfirm.actionName === 'bloquear' ? 'bg-red-400/10 text-red-400' :
                actionConfirm.actionName === 'suspender' ? 'bg-amber-400/10 text-amber-400' :
                actionConfirm.actionName === 'rejeitar' ? 'bg-orange-500/10 text-orange-500' :
                'bg-emerald-500/10 text-emerald-500'
              }`}>
                {actionConfirm.actionName === 'excluir' ? <Trash2 size={22} className="animate-bounce" /> :
                 actionConfirm.actionName === 'bloquear' ? <Ban size={22} /> :
                 actionConfirm.actionName === 'suspender' ? <Clock size={22} /> :
                 actionConfirm.actionName === 'rejeitar' ? <X size={22} /> :
                 <Check size={22} />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  {actionConfirm.actionName === 'excluir' && 'Confirmar Exclusão'}
                  {actionConfirm.actionName === 'bloquear' && 'Confirmar Bloqueio'}
                  {actionConfirm.actionName === 'suspender' && 'Confirmar Suspensão'}
                  {actionConfirm.actionName === 'rejeitar' && 'Confirmar Rejeição'}
                  {actionConfirm.actionName === 'aprovar' && 'Confirmar Aprovação'}
                </h3>
                
                <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
                  {actionConfirm.actionName === 'excluir' && 'Você está prestes a excluir permanentemente o pedido de cadastro e o perfil do usuário. Esta ação é definitiva e removerá o pedido e o perfil definitivamente.'}
                  {actionConfirm.actionName === 'bloquear' && 'Isso impedirá temporariamente que o colaborador acesse o aplicativo ou jogue novos games.'}
                  {actionConfirm.actionName === 'suspender' && 'Isto reverterá o status do colaborador para pendente. Ele precisará ser liberado novamente.'}
                  {actionConfirm.actionName === 'rejeitar' && 'Esta ação recusará o pedido de acesso atual deste usuário.'}
                  {actionConfirm.actionName === 'aprovar' && 'Isso dará acesso completo e imediato do usuário ao aplicativo.'}
                </p>
                
                {/* Specific details card */}
                <div className="mt-4 bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase font-black">Colaborador Alvo</div>
                  <div className="text-xs font-black text-white uppercase truncate">{actionConfirm.displayName}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{actionConfirm.email}</div>
                  <div className="text-[9px] text-slate-600 font-mono select-all truncate mt-1">UID: {actionConfirm.uid}</div>
                </div>

                <div className="flex gap-2.5 mt-6">
                  <button
                    onClick={() => setActionConfirm(null)}
                    className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-black text-[10px] uppercase tracking-wider border border-slate-700/60 active:scale-95 transition-all cursor-pointer"
                  >
                    Mudar de Ideia
                  </button>
                  <button
                    onClick={confirmAndExecuteAction}
                    className={`flex-1 h-11 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-950 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      actionConfirm.actionName === 'excluir' ? 'bg-red-500 hover:bg-red-400 text-white' :
                      actionConfirm.actionName === 'bloquear' ? 'bg-red-400 hover:bg-red-300 text-slate-950' :
                      actionConfirm.actionName === 'suspender' ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' :
                      actionConfirm.actionName === 'rejeitar' ? 'bg-orange-500 hover:bg-orange-400 text-slate-950' :
                      'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <span>Confirmar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alerts */}
      {toastAlert && (
        <div className="fixed top-4 right-4 z-[110] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-in pointer-events-auto">
          <div className={`p-2 rounded-xl shrink-0 ${
            toastAlert.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
            toastAlert.type === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-blue-500/10 text-blue-400'
          }`}>
            {toastAlert.type === 'success' && <Check size={18} />}
            {toastAlert.type === 'error' && <AlertCircle size={18} />}
            {toastAlert.type === 'info' && <Shield size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white uppercase tracking-wider">Notificação do Sistema</p>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toastAlert.message}</p>
          </div>
          <button 
            onClick={() => setToastAlert(null)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* High-Fidelity Custom Bottom Navigation Bar for Administration */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/80 px-4 py-3 pb-8 flex justify-around items-end z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {(
          [
            { id: 'pendente', label: 'Pendentes', icon: Clock, badge: counts.pending },
            { id: 'aprovado', label: 'Aprovados', icon: Check, badge: counts.approved },
            { id: 'bloqueado', label: 'Bloqueados', icon: Ban, badge: counts.blocked },
            { id: 'auditoria', label: 'Auditoria', icon: FileText, badge: 0 },
            { id: 'settings', label: 'Ajustes', icon: Settings, badge: 0 },
          ] as { id: TabType; label: string; icon: any; badge: number }[]
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'pendente') {
                  setUserStatusFilter('pendente');
                  setCurrentPage(1);
                } else if (tab.id === 'aprovado') {
                  setUserStatusFilter('aprovado');
                  setCurrentPage(1);
                } else if (tab.id === 'bloqueado') {
                  setUserStatusFilter('bloqueado');
                  setCurrentPage(1);
                }
              }}
              className="relative group flex flex-col items-center gap-1 min-w-[60px] pb-1 cursor-pointer"
            >
              {isActive && (
                <motion.div
                  layoutId="admin-nav-active"
                  className="absolute -top-3 left-0 right-0 h-1 bg-yellow-400 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className={`relative p-2 rounded-2xl transition-all ${isActive ? 'bg-slate-800 text-yellow-400 scale-105 shadow-md border border-slate-700/50' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon size={20} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 font-bold text-[8px] text-white border border-slate-900 shadow-md animate-pulse">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-yellow-400' : 'text-slate-600'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
