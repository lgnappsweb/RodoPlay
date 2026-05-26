/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Building, 
  MapPin, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Zap,
  Trash2
} from 'lucide-react';

interface AuthScreenProps {
  onLoginWithEmail: (email: string, passwordString: string) => Promise<any>;
  onCreateProfile: (
    displayName: string, 
    email: string, 
    base: string, 
    shift: string, 
    password?: string,
    praca?: string
  ) => Promise<any>;
}

export function AuthScreen({ onLoginWithEmail, onCreateProfile }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  const [savedProfiles, setSavedProfiles] = useState<any[]>(() => {
    try {
      const data = localStorage.getItem('roplay_saved_profiles');
      let parsed = data ? JSON.parse(data) : [];
      
      // If empty, let's pre-populate with the user's email so they can click and log in instantly on first load!
      if (parsed.length === 0) {
        const lastProfileStr = localStorage.getItem('last_player_profile');
        const lastPass = localStorage.getItem('last_auth_password') || '123456';
        
        if (lastProfileStr) {
          try {
            const profile = JSON.parse(lastProfileStr);
            parsed.push({
              uid: profile.uid || 'saved-user',
              email: profile.email || 'lgnappsweb@gmail.com',
              password: lastPass,
              displayName: profile.displayName || 'LGN APPS',
              avatar: profile.avatar || '👷',
              base: profile.base || 'Base 01',
              shift: profile.shift || 'Turno A Diurno',
              praca: (profile as any).praca || (profile as any).praça || 'Não Aplicável'
            });
          } catch (e) {
            console.warn("Error parsing last_player_profile:", e);
          }
        }
        
        // Guarantee that the main user email has a pre-saved profile ready to tap!
        const hasMainEmail = parsed.some((p: any) => p.email.toLowerCase() === 'lgnappsweb@gmail.com');
        if (!hasMainEmail) {
          parsed.push({
            uid: 'lgn-apps-default',
            email: 'lgnappsweb@gmail.com',
            password: lastPass,
            displayName: 'LGN APPS',
            avatar: '⚡',
            base: 'Base 01',
            shift: 'Turno A - Diurno',
            praca: 'Não Aplicável'
          });
        }
        
        localStorage.setItem('roplay_saved_profiles', JSON.stringify(parsed));
      }
      
      // Always filter out the test account 'teste@rodoplay.com.br' from list to keep only real registered users
      const filtered = parsed.filter((p: any) => p.email.toLowerCase() !== 'teste@rodoplay.com.br');
      if (filtered.length !== parsed.length) {
        localStorage.setItem('roplay_saved_profiles', JSON.stringify(filtered));
      }
      return filtered;
    } catch {
      return [];
    }
  });

  const handleQuickLogin = async (profile: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      localStorage.setItem('last_auth_password', profile.password);
      await onLoginWithEmail(profile.email, profile.password);
      setSuccessMsg(`Conectado como ${profile.displayName}! Entrando...`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar o perfil salvo. Digite a senha manualmente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedProfile = (email: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = savedProfiles.filter((p) => p.email.toLowerCase() !== email.toLowerCase());
    setSavedProfiles(updated);
    localStorage.setItem('roplay_saved_profiles', JSON.stringify(updated));
  };
  
  // Login input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register input states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regName, setRegName] = useState('');
  
  // Registration options
  const [regBase, setRegBase] = useState('Base 01');
  const [regPraca, setRegPraca] = useState('Não Aplicável');
  const [regShift, setRegShift] = useState('Turno A - Diurno');
  const [selectedLocation, setSelectedLocation] = useState('Base 01');

  // Request & Status Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown options
  const BASES = [
    'Base 01', 'Base 02', 'Base 03', 'Base 04', 'Base 05',
    'Base 06', 'Base 07', 'Base 08', 'Base 09'
  ];

  const PRACAS = [
    'Praça 01', 'Praça 02', 'Praça 03', 'Praça 04', 'Praça 05',
    'Praça 06', 'Praça 07', 'Praça 08', 'Praça 09'
  ];

  const SHIFTS = [
    'Turno A Diurno', 'Turno A Noturno', 
    'Turno B Diurno', 'Turno B Noturno',
    'Turno A', 'Turno B', 'Turno C', 'Turno D'
  ];

  // RegEx for clean e-mail verification
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailTrimmed = loginEmail.trim();
    if (!emailTrimmed) {
      setErrorMsg('Por favor, insira seu e-mail.');
      return;
    }

    if (!isEmailValid(emailTrimmed)) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (!loginPassword) {
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('last_auth_password', loginPassword);
      await onLoginWithEmail(emailTrimmed, loginPassword);
      setSuccessMsg('Conectado com sucesso! Entrando...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const nameTrimmed = regName.trim();
    const emailTrimmed = regEmail.trim();

    // 1. Validate Nickname
    if (!nameTrimmed) {
      setErrorMsg('O campo Apelido / Identificação é obrigatório.');
      return;
    }
    if (nameTrimmed.length < 3) {
      setErrorMsg('O Apelido deve conter pelo menos 3 caracteres.');
      return;
    }
    if (nameTrimmed.length > 25) {
      setErrorMsg('Para manter a organização do layout, escolha um nome mais curto (máx. 25).');
      return;
    }

    // 2. Validate Email
    if (!emailTrimmed) {
      setErrorMsg('O campo E-mail é obrigatório.');
      return;
    }
    if (!isEmailValid(emailTrimmed)) {
      setErrorMsg('Insira um e-mail válido para cadastro.');
      return;
    }

    // 3. Validate Password
    if (!regPassword) {
      setErrorMsg('A criação de uma senha é obrigatória.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Sua senha deve conter o mínimo de 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('last_auth_password', regPassword);
      await onCreateProfile(
        nameTrimmed,
        emailTrimmed,
        regBase,
        regShift,
        regPassword,
        regPraca
      );
      setSuccessMsg('Cadastro concluído com sucesso! Redirecionando...');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar o cadastro. Tente outro e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 relative">
      
      {/* Background graphic flare */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm mx-auto z-10 flex flex-col">
        {/* Decorative App Identity */}
        <div className="flex flex-col items-center gap-3 mb-8 justify-center text-center">
          <img 
            src="/%C3%ADcone-192%20png%20%282%29.png" 
            alt="RodoPlay Logo"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-[1.75rem] object-cover shadow-[0_0_25px_rgba(250,204,21,0.3)] border-2 border-yellow-400/90"
          />
          <div className="flex flex-col items-center mt-1">
            <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter leading-none">
              RodoPlay
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] font-sans mt-2">
              O Desafio Supremo
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 flex items-center mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              tab === 'login' 
                ? 'bg-slate-800 text-yellow-400 shadow-md border-b-2 border-yellow-400' 
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            Acessar Conta
          </button>
          
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              tab === 'register' 
                ? 'bg-slate-800 text-yellow-400 shadow-md border-b-2 border-yellow-400' 
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            Criar Cadastro
          </button>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-500/10 border-2 border-red-500/30 text-red-200 px-4 py-3 rounded-2xl flex items-start gap-2.5 mb-5"
            >
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold tracking-tight uppercase leading-relaxed text-left">
                {errorMsg}
              </p>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-2xl flex items-start gap-2.5 mb-5"
            >
              <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold tracking-tight uppercase leading-relaxed text-left">
                {successMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Login Saved Profiles if exist (Forced Above Card per User Intent) */}
        {savedProfiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="flex flex-col gap-3 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4.5 rounded-[2rem] border-2 border-yellow-400/35 mb-6 shadow-2xl relative overflow-hidden"
          >
            {/* Shimmer backdrop effect */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent animate-pulse" />
            
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping absolute" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                  Acesso Instantâneo Gravado
                </span>
              </div>
              <span className="text-[8px] bg-yellow-400/10 text-yellow-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest border border-yellow-400/20 active:scale-95 transition-all">
                Apenas 1 Clique
              </span>
            </div>
            
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {savedProfiles.map((p) => (
                <div
                  key={p.email}
                  onClick={() => !loading && handleQuickLogin(p)}
                  className={`w-full flex items-center gap-3 p-2.5 bg-slate-950/90 hover:bg-slate-900/60 border border-slate-800 hover:border-yellow-400/50 rounded-2xl transition-all text-left relative group select-none hover:shadow-[0_0_12px_rgba(250,204,21,0.1)] active:scale-[0.99] ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl border-2 border-slate-800 group-hover:border-yellow-400/30 overflow-hidden shrink-0 select-none transition-colors relative">
                    {p.avatar && (p.avatar.startsWith('data:image') || p.avatar.startsWith('http')) ? (
                      <img src={p.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="transition-transform duration-300 group-hover:scale-110 block">{p.avatar || '👷'}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white hover:text-yellow-400 uppercase tracking-tight truncate leading-none transition-colors">
                      {p.displayName}
                    </p>
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-1.5">
                      {p.base !== 'Não Aplicável' ? p.base : p.praca} • {p.shift}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black text-yellow-400 uppercase tracking-wider bg-yellow-400/10 px-2 py-0.5 rounded-md">
                      Entrar
                    </span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => handleRemoveSavedProfile(p.email, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/15 rounded-xl transition-all cursor-pointer pointer-events-auto"
                      title="Excluir conta salva neste dispositivo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Card Frame containing Forms */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-800 rounded-[2rem] p-6 shadow-xl flex flex-col relative overflow-hidden">
          
          {tab === 'login' ? (
            <div className="flex flex-col gap-4">

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                {/* Login Title */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Entrar com Outro E-mail</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Utilize suas credenciais cadastradas</p>
                </div>

              {/* Login Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type="email"
                    autoComplete="email"
                    keyboard-type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    disabled={loading}
                    className="w-full bg-slate-950 text-xs font-semibold text-white pl-11 pr-4 py-3.5 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Login Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Senha</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    disabled={loading}
                    className="w-full bg-slate-950 text-xs font-semibold text-white pl-11 pr-11 py-3.5 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex={-1}
                    className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm / Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-widest py-4 rounded-2xl px-4 mt-2 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <span>Acessar Painel</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-yellow-400 transition-colors mt-2 text-center underline tracking-wider cursor-pointer bg-transparent border-none"
              >
                Não tem conta? Cadastre-se aqui
              </button>
            </form>
          </div>
        ) : (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              {/* Register Title */}
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Novo Cadastro</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Insira dados de equipe e localização</p>
              </div>

              {/* Name / Apelido */}
              <div className="flex flex-col gap-1.2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Identificação / Apelido</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome no App"
                    disabled={loading}
                    className="w-full bg-slate-950 text-xs font-semibold text-white pl-11 pr-4 py-3.5 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type="email"
                    autoComplete="email"
                    keyboard-type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    disabled={loading}
                    className="w-full bg-slate-950 text-xs font-semibold text-white pl-11 pr-4 py-3.5 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Senha</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-500" size={16} />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                    className="w-full bg-slate-950 text-xs font-semibold text-white pl-11 pr-11 py-3.5 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                    className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Base and Praça dropdown combined */}
              <div className="flex flex-col gap-1.2">
                <div className="flex gap-1 items-center">
                  <Building size={12} className="text-slate-500" />
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sua Base / Praça</label>
                </div>
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLocation(val);
                    if (val.startsWith('Base')) {
                      setRegBase(val);
                      setRegPraca('Não Aplicável');
                    } else {
                      setRegBase('Não Aplicável');
                      setRegPraca(val);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-slate-950 text-xs font-bold text-slate-200 py-3.5 px-4 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all select-none"
                >
                  <optgroup label="Bases" className="bg-slate-950 text-slate-400 font-bold font-sans">
                    {BASES.map((b) => (
                      <option key={b} value={b} className="bg-slate-900 text-slate-100 border-none font-sans font-bold">
                        {b}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Praças" className="bg-slate-950 text-slate-400 font-bold font-sans">
                    {PRACAS.map((p) => (
                      <option key={p} value={p} className="bg-slate-900 text-slate-100 border-none font-sans font-bold">
                        {p}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Shift dropdown */}
              <div className="flex flex-col gap-1.2">
                <div className="flex gap-1 items-center">
                  <Clock size={12} className="text-slate-500" />
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Seu Turno</label>
                </div>
                <select
                  value={regShift}
                  onChange={(e) => setRegShift(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 text-xs font-bold text-slate-200 py-3.5 px-4 rounded-2xl border border-slate-800 focus:border-yellow-400/40 focus:outline-none transition-all select-none"
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 border-none font-sans font-bold">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Register Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-widest py-4 rounded-2xl px-4 mt-2 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(250,204,21,0.15)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Criar Conta</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-yellow-400 transition-colors mt-2 text-center underline tracking-wider cursor-pointer bg-transparent border-none"
              >
                Já possui conta? Entre por aqui
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
