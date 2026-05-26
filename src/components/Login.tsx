/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { motion } from 'motion/react';
import { Shield, Mail, User, Landmark, Clock, LogOut, Trash2 } from 'lucide-react';
import { BASE_OPTIONS, SHIFT_OPTIONS } from '../constants';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

interface LoginProps {
  onLogin?: () => void;
  onCreateProfile?: (data: { displayName: string; base: string; shift: string }) => void;
  onSelectProfile?: (profile: any) => void;
  onCreateLocalProfile?: (displayName: string, email: string, base: string, shift: string, password?: string) => void;
  onLoginWithEmail?: (email: string, password?: string) => Promise<void>;
  isRegistration?: boolean;
}

export function Login({ 
  onLogin, 
  onCreateProfile, 
  onSelectProfile, 
  onCreateLocalProfile, 
  onLoginWithEmail,
  isRegistration 
}: LoginProps) {
  const [justDeleted] = useState(() => {
    return sessionStorage.getItem('just_deleted_account') === 'true';
  });

  useEffect(() => {
    if (justDeleted) {
      sessionStorage.removeItem('just_deleted_account');
    }
  }, [justDeleted]);

  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    if (justDeleted) return [];
    const saved = localStorage.getItem('saved_profiles');
    return saved ? JSON.parse(saved) : [];
  });

  const [localProfileUids] = useState<string[]>(() => {
    if (justDeleted) return [];
    const saved = localStorage.getItem('saved_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => p.uid);
        }
      } catch (e) {}
    }
    return [];
  });

  const [cachedPlayer] = useState<any | null>(() => {
    if (justDeleted) return null;
    const saved = localStorage.getItem('last_player_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [name, setName] = useState(cachedPlayer?.displayName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [base, setBase] = useState(cachedPlayer?.base || BASE_OPTIONS[0]);
  const [shift, setShift] = useState(cachedPlayer?.shift || SHIFT_OPTIONS[0]);
  const [showFastCreate, setShowFastCreate] = useState(() => {
    if (justDeleted) return true;
    const saved = localStorage.getItem('saved_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length === 0;
      } catch (e) {
        return true;
      }
    }
    return true;
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasAutoToggled, setHasAutoToggled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    if (justDeleted) return 'register';
    const wasExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
    return wasExplicitLogout ? 'login' : 'register';
  });
  const [hasAutoLoggedIn, setHasAutoLoggedIn] = useState(false);

  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u?.email) {
        setAuthEmail(u.email.trim().toLowerCase());
      } else {
        setAuthEmail(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSignOutAuth = async () => {
    localStorage.removeItem('saved_profiles');
    localStorage.removeItem('last_player_profile');
    localStorage.removeItem('active_player_uid');
    localStorage.removeItem('active_session_id');
    sessionStorage.removeItem('explicit_logout');
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Signout failed during account switch", e);
    }
    setSavedProfiles([]);
    setAuthEmail(null);
    setShowFastCreate(true);
  };

  const handleRemoveDeviceProfile = (uid: string) => {
    const updated = savedProfiles.filter((p) => p.uid !== uid);
    setSavedProfiles(updated);
    localStorage.setItem('saved_profiles', JSON.stringify(updated));
    if (updated.length === 0) {
      setShowFastCreate(true);
    }
    
    const activeUid = localStorage.getItem('active_player_uid');
    if (activeUid === uid) {
      localStorage.removeItem('active_player_uid');
      localStorage.removeItem('last_player_profile');
      localStorage.removeItem('active_session_id');
    }
  };

  useEffect(() => {
    // Determine the unique emails from saved profiles or last profile to show only profiles registered by the same person/account on this device
    const saved = localStorage.getItem('saved_profiles');
    let localEmails: string[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localEmails = parsed.map((p: any) => p.email).filter(Boolean);
        }
      } catch (e) {}
    }

    const last = localStorage.getItem('last_player_profile');
    if (last) {
      try {
        const parsed = JSON.parse(last);
        if (parsed.email) {
          localEmails.push(parsed.email);
        }
      } catch (e) {}
    }

    if (authEmail) {
      localEmails.push(authEmail);
    }

    // Dynamic support for multi-device real-time lookup
    const cleanedInputEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidInput = emailRegex.test(cleanedInputEmail);

    if (isValidInput && !localEmails.includes(cleanedInputEmail)) {
      localEmails.push(cleanedInputEmail);
    }

    // Filter unique emails
    const uniqueEmails = Array.from(new Set(localEmails.map(e => e.trim().toLowerCase()))).filter(Boolean);

    // If there are no emails saved or typed yet, fallback to localStorage saved_profiles list
    if (uniqueEmails.length === 0) {
      const savedList = localStorage.getItem('saved_profiles');
      if (savedList) {
        try {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedProfiles(parsed);
          }
        } catch (e) {}
      }
      return;
    }

    // Escuta em tempo real apenas os perfis cadastrados com o(s) e-mail(s) desta pessoa/dispositivo ou do e-mail digitado!
    const q = query(collection(db, 'players'), where('email', 'in', uniqueEmails.slice(0, 10)));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProfiles: any[] = [];
      snapshot.forEach((docSnap) => {
        dbProfiles.push({
          uid: docSnap.id,
          ...docSnap.data()
        });
      });

      // Ordena por atividade recente
      dbProfiles.sort((a, b) => {
        const tA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const tB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return tB - tA;
      });

      if (dbProfiles.length > 0) {
        setSavedProfiles(dbProfiles);
        localStorage.setItem('saved_profiles', JSON.stringify(dbProfiles));
        setHasAutoToggled((prev) => {
          if (!prev) {
            setShowFastCreate(false);
            return true;
          }
          return prev;
        });

        // Auto switch to login tab if a valid email is typed and matching profile exists on server
        if (isValidInput) {
          const hasMatchingProfile = dbProfiles.some(p => p.email?.trim().toLowerCase() === cleanedInputEmail);
          if (hasMatchingProfile) {
            setAuthMode('login');
          }
        }
      }
    }, (error) => {
      console.warn("Erro ao escutar perfis no Firestore, usando local:", error);
    });

    return () => unsubscribe();
  }, [authEmail, email]);

  // Automatic login when a profile already exists in saved_profiles on startup
  useEffect(() => {
    const wasExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
    if (wasExplicitLogout || justDeleted) return;

    if (!hasAutoLoggedIn && savedProfiles.length > 0) {
      // ONLY auto-log in if the profile was ALREADY present in the local device storage on startup / mount
      const mostRecentProfile = savedProfiles[0];
      const isLocal = localProfileUids.includes(mostRecentProfile?.uid);
      if (isLocal) {
        setHasAutoLoggedIn(true);
        console.log("Auto-connecting to existing startup profile:", mostRecentProfile.displayName);
        if (onSelectProfile) {
          onSelectProfile(mostRecentProfile);
        } else if (onLogin) {
          onLogin();
        }
      }
    }
  }, [savedProfiles, hasAutoLoggedIn, onSelectProfile, onLogin, localProfileUids, justDeleted]);

  const handleResetPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMessage('Por favor, digite o seu e-mail no campo acima para que possamos enviar o link de recuperação de senha.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMessage('E-mail enviado! Verifique sua caixa de entrada para redefinir sua senha.');
    } catch (err: any) {
      console.error("Error sending password reset email:", err);
      let errMsg = 'Erro ao enviar e-mail de recuperação de senha.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'Nenhum usuário correspondente a este e-mail foi encontrado cadastrado.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'O formato do e-mail inserido é inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Muitas solicitações seguidas. Por favor, tente novamente mais tarde.';
      }
      setErrorMessage(errMsg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isRegistration) {
      if (!name.trim()) {
        setErrorMessage('Por favor, insira sua identificação / apelido.');
        return;
      }
      if (onCreateProfile) {
        onCreateProfile({ displayName: name, base, shift });
      }
    } else {
      const targetEmail = email.trim();
      const targetName = name.trim();

      if (authMode === 'login') {
        if (!targetEmail) {
          setErrorMessage('Por favor, digite o seu e-mail.');
          return;
        }
        if (!password) {
          setErrorMessage('Por favor, digite sua senha.');
          return;
        }

        setSubmitting(true);
        try {
          if (onLoginWithEmail) {
            await onLoginWithEmail(targetEmail, password);
            setSuccessMessage('Acesso concedido com sucesso!');
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Erro ao realizar login.');
        } finally {
          setSubmitting(false);
        }
      } else {
        if (!targetEmail) {
          setErrorMessage('Por favor, digite o seu e-mail.');
          return;
        }
        if (!targetName) {
          setErrorMessage('Por favor, digite o seu nome ou apelido.');
          return;
        }
        if (!password || password.length < 6) {
          setErrorMessage('Por favor, insira uma senha de pelo menos 6 caracteres.');
          return;
        }

        setSubmitting(true);
        try {
          if (onCreateLocalProfile) {
            await onCreateLocalProfile(targetName, targetEmail, base, shift, password);
            setSuccessMessage('Acesso concedido com sucesso!');
          }
        } catch (err: any) {
          const msg = err.message || '';
          if (msg.includes('já está cadastrado') || msg.includes('already') || msg.includes('in use') || msg.includes('in-use')) {
            setAuthMode('login');
            setErrorMessage('Este e-mail já está cadastrado! Mudamos você automaticamente para a aba "Entrar / Login". Agora basta digitar sua senha para Entrar.');
          } else {
            setErrorMessage(msg || 'Erro ao processar o acesso.');
          }
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  const baseOptions = BASE_OPTIONS;
  const shiftOptions = SHIFT_OPTIONS;

  if (!isRegistration) {
    return (
      <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-slate-950 border-x border-slate-800 shadow-2xl flex flex-col items-center justify-center p-6 text-center">
        {/* Hazard Stripes */}
        <div className="absolute top-0 left-0 w-full h-12 hazard-stripe opacity-20 rotate-180" />
        <div className="absolute bottom-0 left-0 w-full h-12 hazard-stripe opacity-20" />

        <motion.div
         // Simple enter fade simulation instead of heavy layouts
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md z-10 py-6"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-400 p-1.5 rounded-[2.5rem] rotate-12 shadow-[12px_12px_0px_#1e293b] border-4 border-white w-28 h-28 flex items-center justify-center overflow-hidden">
              {!logoError ? (
                <img 
                  src="/%C3%ADcone-512%20png%20(2).png" 
                  alt="Logo RodoPlay" 
                  className="w-full h-full object-cover rounded-[1.8rem]"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Shield className="w-16 h-16 text-slate-900 fill-current" />
              )}
            </div>
          </div>

          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-1">
            RodoPlay
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-8">
            O Desafio Supremo
          </p>

          {/* Regular Login Selector or Fast Create toggle */}
          {!showFastCreate ? (
            <>
              {savedProfiles.length > 0 && (
                <div id="profiles-container" className="mb-6 space-y-4">
                  <div className="flex items-center justify-between px-2 gap-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      Selecione para entrar:
                    </p>
                    <button
                      type="button"
                      onClick={handleSignOutAuth}
                      className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <LogOut size={12} /> Sair / Trocar E-mail
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                    {savedProfiles.map((p) => (
                      <div
                        key={p.uid}
                        onClick={() => {
                          if (onSelectProfile) {
                            onSelectProfile(p);
                          } else if (onLogin) {
                            onLogin();
                          }
                        }}
                        className="flex items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 hover:border-yellow-400 backdrop-blur-sm shadow-xl transition-all text-left group cursor-pointer"
                      >
                        <div className="flex flex-1 items-center gap-3 overflow-hidden">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl border border-slate-700 overflow-hidden shrink-0 group-hover:border-yellow-400 group-hover:shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                            {p.avatar?.startsWith('data') || p.avatar?.startsWith('http') ? (
                              <img src={p.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              p.avatar || '👷'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white uppercase italic whitespace-nowrap">
                              {p.displayName}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              {p.base} • {p.shift}
                            </p>
                            {p.email && (
                              <p className="text-[8px] font-bold text-slate-500 lowercase truncate">
                                {p.email}
                              </p>
                            )}
                            {p.level !== undefined && (
                              <p className="text-[8px] font-bold text-yellow-500 uppercase tracking-wider mt-0.5">
                                LV {p.level} • {p.totalScore || 0} Pts
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDeviceProfile(p.uid);
                            }}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer border-none bg-transparent flex items-center gap-1 text-[8px] font-black uppercase tracking-wider"
                            title="Remover perfil deste dispositivo"
                          >
                            <Trash2 size={13} />
                            <span className="hidden xs:inline">REMOVER</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectProfile) {
                                onSelectProfile(p);
                              } else if (onLogin) {
                                onLogin();
                              }
                            }}
                            className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-[10px] font-black uppercase italic px-3 py-1.5 rounded-xl transition-all cursor-pointer border-none flex items-center gap-1"
                          >
                            ENTRAR
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <Button 
                  onClick={() => {
                    setAuthMode('login');
                    setShowFastCreate(true);
                  }}
                  className="h-14 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-2xl border-none transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  ENTRAR COM OUTRA CONTA 🔑
                </Button>
                <Button 
                  onClick={() => {
                    setAuthMode('register');
                    setShowFastCreate(true);
                  }}
                  className="h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl border border-slate-800 transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  CADASTRAR NOVO E-MAIL 🚧
                </Button>
              </div>
            </>
          ) : (
            <Card className="bg-slate-900/95 border-slate-700 shadow-2xl rounded-[2.5rem] backdrop-blur-xl border-t-white/10 text-left">
              <CardHeader className="pt-8 pb-4 text-center">
                <CardTitle className="text-2xl font-black text-white uppercase italic tracking-tighter">
                  Acesso por E-mail
                </CardTitle>
                <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                  Entre ou cadastre-se instantaneamente
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 px-6 pb-2 pt-1">
                  
                  {errorMessage && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center">
                      ⚠ {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-xl text-center animate-bounce">
                      ✓ {successMessage}
                    </div>
                  )}

                  {/* Information Banner for Live Sync */}
                  <div className="p-3.5 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl text-left flex items-start gap-2.5 mb-2.5">
                    <span className="text-base">🌐</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-yellow-400 uppercase tracking-wider leading-tight">
                        Acesso Simultâneo em Tempo Real Ativo
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5 leading-relaxed">
                        Jogue ao mesmo tempo em celulares e computadores! Conecte-se com o mesmo e-mail e tenha seu progresso e XP sincronizados instantaneamente.
                      </p>
                    </div>
                  </div>

                  {/* Perfis Cadastrados ou Buscados */}
                  {savedProfiles.length > 0 && (
                    <div className="p-4 bg-slate-950/60 rounded-2xl border-2 border-slate-800 space-y-3 mb-4 animate-fadeIn">
                      {/* Local verified profiles */}
                      {savedProfiles.some(p => localProfileUids.includes(p.uid)) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <User size={11} className="text-yellow-400" /> Perfis neste Dispositivo:
                            </p>
                            <span className="text-[7.5px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse">
                              Entrar Direto ⚡
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                            {savedProfiles.filter(p => localProfileUids.includes(p.uid)).map((p) => (
                              <div
                                key={p.uid}
                                className="flex items-center justify-between gap-2.5 bg-slate-900 border border-slate-800 hover:border-yellow-400/40 transition-all text-left p-2.5 rounded-xl group"
                              >
                                <div 
                                  onClick={() => {
                                    if (onSelectProfile) {
                                      onSelectProfile(p);
                                    } else if (onLogin) {
                                      onLogin();
                                    }
                                  }}
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                >
                                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-base border border-slate-700 overflow-hidden shrink-0">
                                    {p.avatar?.startsWith('data') || p.avatar?.startsWith('http') ? (
                                      <img src={p.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      p.avatar || '👷'
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black text-white uppercase italic truncate">
                                      {p.displayName}
                                    </p>
                                    <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">
                                      {p.base} • {p.shift}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveDeviceProfile(p.uid);
                                    }}
                                    className="p-1.5 text-slate-550 hover:text-red-400 hover:bg-red-500/15 rounded transition-all cursor-pointer border-none bg-transparent"
                                    title="Remover deste dispositivo"
                                  >
                                    <Trash2 size={10} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onSelectProfile) {
                                        onSelectProfile(p);
                                      } else if (onLogin) {
                                        onLogin();
                                      }
                                    }}
                                    className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-[9px] font-black uppercase italic px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border-none shrink-0"
                                  >
                                    ENTRAR
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Remote profiles found for the typed email */}
                      {savedProfiles.some(p => !localProfileUids.includes(p.uid)) && (
                        <div className={savedProfiles.some(p => localProfileUids.includes(p.uid)) ? "pt-3 border-t border-slate-800" : ""}>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[9px] font-black text-sky-450 uppercase tracking-wider flex items-center gap-1">
                              <User size={11} className="text-sky-400" /> Contas no Servidor:
                            </p>
                            <span className="text-[7.5px] font-bold text-sky-400 uppercase bg-sky-500/15 px-1.5 py-0.5 rounded">
                              Dispositivo Novo 🖥📱
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                            {savedProfiles.filter(p => !localProfileUids.includes(p.uid)).map((p) => (
                              <div
                                key={p.uid}
                                className="flex items-center justify-between gap-2.5 bg-slate-900 border border-slate-800 hover:border-sky-500/30 transition-all text-left p-2.5 rounded-xl group"
                              >
                                <div 
                                  onClick={() => {
                                    setEmail(p.email || '');
                                    setName(p.displayName || '');
                                    setAuthMode('login');
                                    setErrorMessage('');
                                    setSuccessMessage(`Perfil "${p.displayName}" selecionado! Insira sua senha para acessar.`);
                                    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                                    if (passwordInput) {
                                      passwordInput.focus();
                                    }
                                  }}
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                >
                                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-base border border-slate-705 overflow-hidden shrink-0">
                                    {p.avatar?.startsWith('data') || p.avatar?.startsWith('http') ? (
                                      <img src={p.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      p.avatar || '👷'
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black text-white uppercase italic truncate">
                                      {p.displayName}
                                    </p>
                                    <p className="text-[7.5px] font-bold text-sky-400 uppercase tracking-tight">
                                      Sincronizar em Tempo Real
                                    </p>
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEmail(p.email || '');
                                    setName(p.displayName || '');
                                    setAuthMode('login');
                                    setErrorMessage('');
                                    setSuccessMessage(`Perfil "${p.displayName}" selecionado! Insira sua senha para acessar.`);
                                    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
                                    if (passwordInput) {
                                      passwordInput.focus();
                                    }
                                  }}
                                  className="bg-sky-500 hover:bg-sky-600 text-white text-[9px] font-black uppercase italic px-2.5 py-1.5 rounded-lg transition-all cursor-pointer border-none shrink-0"
                                >
                                  CONECTAR 🔑
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center pt-1.5 border-t border-slate-850">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                          – OU ACESSE / CADASTRE OUTRA CONTA ABAIXO –
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mode selector (tabs) */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950/65 rounded-xl border border-slate-800/85 mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className={`py-2.5 text-[10px] font-black uppercase tracking-wider rounded-[10px] transition-all flex items-center justify-center gap-1 ${
                        authMode === 'register' 
                          ? 'bg-yellow-400 text-slate-950 shadow-md font-extrabold' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Novo Cadastro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className={`py-2.5 text-[10px] font-black uppercase tracking-wider rounded-[10px] transition-all flex items-center justify-center gap-1 ${
                        authMode === 'login' 
                          ? 'bg-yellow-400 text-slate-950 shadow-md font-extrabold' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Entrar / Login</span>
                    </button>
                  </div>

                  {/* Shared Email Field */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-1">
                      <Mail size={10} className="text-yellow-400" /> Seu E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-white font-bold focus:border-yellow-400 outline-none transition-all placeholder:text-slate-650"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-1">
                      <Shield size={10} className="text-yellow-400" /> Sua Senha
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-white font-bold focus:border-yellow-400 outline-none transition-all placeholder:text-slate-650"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      Sua pontuação e nível ficam protegidos por esta credencial
                    </p>
                    {authMode === 'login' && (
                      <div className="flex justify-end px-1 pt-0.5">
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="text-[10px] text-yellow-400 hover:text-yellow-300 font-extrabold uppercase tracking-widest transition-all cursor-pointer hover:underline border-none bg-transparent"
                        >
                          Esqueci minha senha 🔑
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Full Profile Fields (Register Mode only) */}
                  {authMode === 'register' && (
                    <div className="space-y-4 pt-1 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-1">
                          <User size={10} className="text-yellow-400" /> Identificação / Apelido
                        </label>
                        <input
                          type="text"
                          placeholder="Seu Nome ou Apelido"
                          className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 text-white font-bold focus:border-yellow-400 outline-none transition-all"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={authMode === 'register'}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-1">
                            <Landmark size={10} className="text-yellow-400" /> Sua Base
                          </label>
                          <select
                            className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-2 text-white font-bold focus:border-yellow-400 outline-none appearance-none"
                            value={base}
                            onChange={(e) => setBase(e.target.value)}
                          >
                            {baseOptions.map(opt => (
                              <option key={opt} value={opt} className="text-slate-950 bg-white" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-1">
                            <Clock size={10} className="text-yellow-400" /> Turno
                          </label>
                          <select
                            className="w-full h-12 bg-slate-800 border-2 border-slate-700 rounded-xl px-2 text-white font-bold focus:border-yellow-400 outline-none appearance-none"
                            value={shift}
                            onChange={(e) => setShift(e.target.value)}
                          >
                            {shiftOptions.map(opt => (
                              <option key={opt} value={opt} className="text-slate-950 bg-white" style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="px-6 pb-8 pt-4 flex flex-col gap-2">
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full h-14 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-black text-md rounded-xl shadow-lg uppercase italic tracking-tighter"
                  >
                    {submitting 
                      ? 'Processando...' 
                      : authMode === 'register' 
                        ? 'CADASTRAR NOVO PERFIL 🚧' 
                        : 'ENTRAR NO PÁTIO'
                    }
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setShowFastCreate(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    {savedProfiles.length > 0 
                      ? 'Voltar para Perfis Cadastrados 🧑‍✈️' 
                      : 'Voltar para o Início 🏠'
                    }
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
          
          <p className="mt-8 text-slate-600 font-bold text-[10px] uppercase tracking-widest leading-loose">
            Treinamento de elite para o time de excelência
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative overflow-x-hidden bg-slate-950 border-x border-slate-800 shadow-2xl flex flex-col items-center justify-center p-6">
      {/* Hazard Stripes */}
      <div className="absolute top-0 left-0 w-full h-12 hazard-stripe opacity-20 rotate-180" />
      <div className="absolute bottom-0 left-0 w-full h-12 hazard-stripe opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <Card className="bg-slate-900/80 border-slate-700 shadow-2xl rounded-[3rem] backdrop-blur-xl border-t-white/10">
          <CardHeader className="text-center space-y-4 pt-10">
            <div className="flex justify-center mb-2">
              <div className="bg-yellow-400 p-1.5 rounded-[2rem] rotate-12 shadow-[10px_10px_0px_#1e293b] w-24 h-24 flex items-center justify-center overflow-hidden border-2 border-white/20">
                {!logoError ? (
                  <img 
                    src="/%C3%ADcone-512%20png%20(2).png" 
                    alt="Logo RodoPlay" 
                    className="w-full h-full object-cover rounded-[1.4rem]"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Shield className="w-12 h-12 text-slate-900 fill-current" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="inline-block bg-yellow-400 text-slate-900 px-4 py-1 font-black skew-x-[-15deg] text-lg uppercase shadow-lg">
                RodoPlay
              </div>
              <CardTitle className="text-4xl font-black tracking-tighter text-white italic uppercase">Finalizar Perfil</CardTitle>
              <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">App de Treinamento e Rivalidade</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identificação / Apelido</label>
                <input
                  type="text"
                  placeholder="Seu Nome ou Apelido"
                  className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 text-white font-bold focus:border-yellow-400 outline-none transition-all placeholder:text-slate-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Base e Praça</label>
                      <select
                        className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl px-4 text-white font-bold focus:border-yellow-400 outline-none appearance-none"
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                      >
                        {baseOptions.map(opt => (
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Período de Trabalho</label>
                      <select
                        className="w-full h-14 bg-slate-800 border-2 border-slate-700 rounded-2xl px-4 text-white font-bold focus:border-yellow-400 outline-none appearance-none"
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                      >
                        {shiftOptions.map(opt => (
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
                  <div className="flex items-center gap-2 px-2 py-2 bg-yellow-400/5 rounded-xl border border-yellow-400/10">
                    <Shield size={12} className="text-yellow-400 shrink-0" />
                    <p className="text-[9px] font-bold text-yellow-400/60 uppercase leading-tight">
                      Atenção: Base e Turno não poderão ser alterados após o cadastro.
                    </p>
                  </div>
                </div>
            </CardContent>
            <CardFooter className="px-8 pb-10 pt-4">
              <Button type="submit" disabled={submitting} className="w-full h-16 bg-white hover:bg-yellow-400 text-slate-950 font-black text-xl rounded-2xl shadow-xl transition-all uppercase italic tracking-tighter group flex items-center justify-center gap-2">
                {submitting ? 'PROCESSANDO...' : 'FINALIZAR PERFIL 🚧'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
