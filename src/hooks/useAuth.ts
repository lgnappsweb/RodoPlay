/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Player } from '../types';
import { writePlayerProfile } from '../lib/rankingSync';
import { createNotification } from '../lib/notifications';
import { saveThemeSettings, applyTheme } from '../lib/theme';

const normalizeShift = (val: string | undefined): string => {
  if (!val) return 'Turno A - Diurno';
  const mapped: Record<string, string> = {
    'Turno A Diurno': 'Turno A - Diurno',
    'Turno A Noturno': 'Turno A - Noturno',
    'Turno B Diurno': 'Turno B - Diurno',
    'Turno B Noturno': 'Turno B - Noturno',
  };
  return mapped[val] || val;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  // Set up real-time listener for Auth State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      // Clean up previous profile listeners to prevent leaks
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }

      if (authUser) {
        setUser(authUser);
        localStorage.setItem('active_player_uid', authUser.uid);

        // Optimized instant profile restoration from local cache before network snapshot resolve
        const lastProfileStr = localStorage.getItem('last_player_profile');
        if (lastProfileStr) {
          try {
            const cached = JSON.parse(lastProfileStr);
            if (cached && (cached.uid === authUser.uid || cached.email === authUser.email)) {
              if (cached.shift) {
                cached.shift = normalizeShift(cached.shift);
              }
              setPlayer(cached);
              setLoading(false);
            }
          } catch (e) {}
        } else {
          try {
            const savedProfilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
            const savedList = JSON.parse(savedProfilesStr);
            const found = savedList.find((p: any) => p.email.toLowerCase() === authUser.email?.toLowerCase());
            if (found) {
              const fallbackPlayer: Player = {
                uid: authUser.uid,
                displayName: found.displayName,
                email: found.email,
                avatar: found.avatar || '👷',
                base: found.base || 'Base 01',
                shift: normalizeShift(found.shift || 'Turno A - Diurno'),
                xp: 0,
                level: 1,
                totalScore: 0,
                gamesPlayed: 0,
                completedGames: 0,
                timedOutGames: 0,
                status: 'online',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                lastActive: new Date().toISOString(),
              };
              (fallbackPlayer as any).praca = found.praca || 'Não Aplicável';
              setPlayer(fallbackPlayer);
              setLoading(false);
            }
          } catch (e) {}
        }

        // Define profile document path for snapshot mapping
        const playerRef = doc(db, 'users', authUser.uid);

        // Bind dynamic onSnapshot for realtime, multi-device synchronization instantly
        unsubscribeProfileRef.current = onSnapshot(playerRef, (snapshot) => {
          if (snapshot.exists()) {
            const playerData = snapshot.data() as Player;
            if (playerData && playerData.shift) {
              playerData.shift = normalizeShift(playerData.shift);
            }
            setPlayer({
              ...playerData,
              uid: snapshot.id
            });
            localStorage.setItem('last_player_profile', JSON.stringify(playerData));

            // Sync theme settings across multiple devices
            if (playerData.themeMode || playerData.themePrimary || playerData.themeSecondary) {
              try {
                const synchronizedTheme = {
                  mode: playerData.themeMode || 'dark',
                  primary: playerData.themePrimary || '#fbbf24',
                  secondary: playerData.themeSecondary || '#6366f1'
                };
                saveThemeSettings(synchronizedTheme);
                applyTheme(synchronizedTheme);
              } catch (errTheme) {
                console.warn("Theme synchronization error:", errTheme);
              }
            }

            // Automatically sync status metadata to local saved device profiles
            try {
              if (playerData.email) {
                const savedProfilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
                const savedList = JSON.parse(savedProfilesStr);
                const existingSaved = savedList.find((p: any) => p.email.toLowerCase() === playerData.email.toLowerCase());
                const savedPass = localStorage.getItem('last_auth_password') || existingSaved?.password || '';
                
                if (savedPass) {
                  const filteredList = savedList.filter((p: any) => p.email.toLowerCase() !== playerData.email.toLowerCase());
                  
                  filteredList.unshift({
                    uid: snapshot.id,
                    email: playerData.email,
                    password: savedPass,
                    displayName: playerData.displayName || 'Membro do Time',
                    avatar: playerData.avatar || '👷',
                    base: playerData.base || 'Base 01',
                    shift: normalizeShift(playerData.shift || 'Turno A - Diurno'),
                    praca: (playerData as any).praca || (playerData as any).praça || 'Não Aplicável'
                  });
                  
                  localStorage.setItem('roplay_saved_profiles', JSON.stringify(filteredList));
                }
              }
            } catch (errLocal) {
              console.warn("Snapshot saved profiles updates mapping error:", errLocal);
            }

            localStorage.removeItem('pending_registration_data');
            setLoading(false);
          } else {
            // Document does not exist in Firestore yet. Look at local caches to restore the correct user settings.
            const pendingRegStr = localStorage.getItem('pending_registration_data');
            const lastProfileStr = localStorage.getItem('last_player_profile');
            
            let hasValidCache = false;
            let cachedPlayer: Player | null = null;
            
            if (pendingRegStr) {
              try {
                const pending = JSON.parse(pendingRegStr);
                if (pending && pending.email?.toLowerCase() === authUser.email?.toLowerCase()) {
                  hasValidCache = true;
                  const temporaryPlayer: Player = {
                    uid: authUser.uid,
                    displayName: pending.displayName || 'Parceiro RodoPlay',
                    email: pending.email || authUser.email || '',
                    base: pending.base || 'Base 01',
                    shift: normalizeShift(pending.shift || 'Turno A - Diurno'),
                    xp: 0,
                    level: 1,
                    totalScore: 0,
                    gamesPlayed: 0,
                    completedGames: 0,
                    timedOutGames: 0,
                    avatar: pending.avatar || '👷',
                    status: 'online',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    lastActive: new Date().toISOString(),
                  };
                  (temporaryPlayer as any).praca = pending.praca || 'Não Aplicável';
                  (temporaryPlayer as any).praça = pending.praca || 'Não Aplicável';
                  cachedPlayer = temporaryPlayer;
                }
              } catch (e) {}
            }
            
            if (!hasValidCache && lastProfileStr) {
              try {
                const cached = JSON.parse(lastProfileStr);
                if (cached && (cached.uid === authUser.uid || cached.email?.toLowerCase() === authUser.email?.toLowerCase())) {
                  hasValidCache = true;
                  cachedPlayer = cached;
                }
              } catch (e) {}
            }
            
            if (hasValidCache && cachedPlayer) {
              console.log("Averting race condition: Using temporary profile cache for pending user:", cachedPlayer.displayName);
              if (cachedPlayer.shift) {
                cachedPlayer.shift = normalizeShift(cachedPlayer.shift);
              }
              setPlayer(cachedPlayer);
              setLoading(false);
            } else {
              console.log("Profile document deleted on backend. Logging out user to prevent zombie sessions.");
              setUser(null);
              setPlayer(null);
              localStorage.removeItem('active_player_uid');
              localStorage.removeItem('last_player_profile');
              localStorage.removeItem('last_auth_password');
              localStorage.removeItem('pending_registration_data');
              signOut(auth).catch(errSync => console.warn(errSync));
              setLoading(false);
            }
          }
        }, (err) => {
          console.error("Realtime profile snapshot sync error:", err);
          setLoading(false);
        });

      } else {
        // Logged out
        setUser(null);
        setPlayer(null);
        localStorage.removeItem('active_player_uid');
        localStorage.removeItem('last_player_profile');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
      }
    };
  }, []);

  // Professional login using standard Firebase Auth
  const loginWithEmailString = async (email: string, password?: string) => {
    if (!email || !password) {
      throw new Error("Por favor, informe o e-mail e a senha.");
    }
    setLoading(true);
    try {
      const cleanedEmail = email.trim().toLowerCase();
      const res = await signInWithEmailAndPassword(auth, cleanedEmail, password);
      
      // Save password for quick login syncing
      localStorage.setItem('last_auth_password', password);
      
      // Update last login timestamp in Firestore in background without block-await
      writePlayerProfile(res.user.uid, {
        lastLogin: new Date().toISOString(),
        status: 'online'
      }).catch((writeErr) => {
        console.warn("Background log statistics update error:", writeErr);
      });

      return res.user;
    } catch (err: any) {
      const isExpectedAuthError = err && (
        err.code?.startsWith('auth/') || 
        err.message?.includes('auth/') ||
        err.message?.includes('invalid-credential') ||
        err.message?.includes('wrong-password')
      );
      if (isExpectedAuthError) {
        console.warn("[Login Validation] expected bad credentials or auth block:", err.code || err.message);
      } else {
        console.error("Login failure inside hook:", err);
      }
      let errorMsg = "E-mail ou senha incorretos.";
      if (err.code === 'auth/user-not-found') {
        errorMsg = "Este e-mail não está cadastrado.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = "Senha incorreta. Verifique os dados.";
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = "O e-mail digitado é inválido.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Professional sign-up registering both authentication and Firestore database models
  const createLocalProfile = async (
    displayName: string, 
    email: string, 
    base: string, 
    shift: string, 
    password?: string,
    praca?: string
  ) => {
    if (!displayName || !email || !password) {
      throw new Error("Campos obrigatórios ausentes.");
    }
    
    setLoading(true);
    try {
      const cleanedEmail = email.trim().toLowerCase();
      
      // Cache details in localStorage in case snapshot reads before write finishes (robust race condition fallback)
      localStorage.setItem('pending_registration_data', JSON.stringify({
        displayName: displayName.trim(),
        email: cleanedEmail,
        base: base || 'Base 01',
        shift: shift || 'Turno A - Diurno',
        praca: praca || 'Praça 01',
        avatar: '👷'
      }));

      // 1. Create Auth User
      const res = await createUserWithEmailAndPassword(auth, cleanedEmail, password);
      const uid = res.user.uid;

       // 2. Build detailed profile
      const localThemeMode = (localStorage.getItem('app_theme_mode') as 'dark' | 'light') || 'dark';
      const localThemePrimary = localStorage.getItem('app_theme_primary') || '#fbbf24';
      const localThemeSecondary = localStorage.getItem('app_theme_secondary') || '#6366f1';

      const newPlayer: Player = {
        uid: uid,
        displayName: displayName.trim(),
        email: cleanedEmail,
        base: base || 'Base 01',
        shift: shift || 'Turno A - Diurno',
        xp: 0,
        level: 1,
        totalScore: 0,
        gamesPlayed: 0,
        completedGames: 0,
        timedOutGames: 0,
        avatar: '👷',
        status: 'online',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        themeMode: localThemeMode,
        themePrimary: localThemePrimary,
        themeSecondary: localThemeSecondary
      };
      
      // Store PT-BR attributes under exact keys
      (newPlayer as any).praca = praca || 'Praça 01';
      (newPlayer as any).praça = praca || 'Praça 01';

      // Set user and player state instantly to prevent any loading screen or lag
      setUser(res.user);
      setPlayer(newPlayer);
      localStorage.setItem('last_player_profile', JSON.stringify(newPlayer));
      setLoading(false);

      // Save user to the cached quick login accounts list immediately so they can log back in instantly
      try {
        const savedProfilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
        const savedList = JSON.parse(savedProfilesStr);
        const filteredList = savedList.filter((p: any) => p.email.toLowerCase() !== cleanedEmail.toLowerCase());
        
        filteredList.unshift({
          uid: uid,
          email: cleanedEmail,
          password: password,
          displayName: displayName.trim(),
          avatar: '👷',
          base: base || 'Base 01',
          shift: shift || 'Turno A - Diurno',
          praca: praca || 'Não Aplicável'
        });
        localStorage.setItem('roplay_saved_profiles', JSON.stringify(filteredList));
      } catch (errLocal) {
        console.warn("Failed saving profile to local list during register:", errLocal);
      }

      // 3. Persist atomically to rankings and default tables in background without blocking await
      writePlayerProfile(uid, newPlayer).catch((writeErr) => {
        console.warn("Background profile write error:", writeErr);
      });

      // 4. Send a professional welcome notification
      try {
        const welcomeTitle = `Bem-vindo(a) ao RodoPlay, ${displayName.trim()}! 👷🎖️`;
        const welcomeMsg = `Olá, Operador(a) ${displayName.trim()}!\n\nSeja muito bem-vindo(a) à nossa plataforma de capacitação operacional e patrulhamento de vias.\n\nSeu cadastro do turno ${shift} na ${base} foi homologado com absoluto sucesso em nosso sistema de monitoramento profissional. A partir de agora, você está habilitado(a) a registrar patrulhas, acumular pontos operacionais, melhorar suas habilidades e subir no ranking geral de conhecimento.\n\nSua integridade física e atenção nas vias permanecem como prioridade número um. Desejamos uma excelente jornada d'água e muito sucesso nas suas inspeções operacionais!`;
        
        createNotification(
          uid,
          welcomeTitle,
          welcomeMsg,
          'system',
          'system',
          'Suporte RodoPlay',
          '🚨'
        ).catch((errNoti) => {
          console.warn("Welcome notification creation failed:", errNoti);
        });
      } catch (errNotiOuter) {
        console.warn("Welcome notification dispatch error:", errNotiOuter);
      }

      // Clean localStorage cache
      localStorage.removeItem('pending_registration_data');
      return newPlayer;
    } catch (err: any) {
      const isExpectedAuthError = err && (
        err.code?.startsWith('auth/') || 
        err.message?.includes('auth/') || 
        err.message?.includes('already-in-use') ||
        err.message?.includes('already in use')
      );
      if (isExpectedAuthError) {
        console.warn("[Register Validation] expected signup conflict or restriction:", err.code || err.message);
      } else {
        console.error("Signup failure inside hook:", err);
      }
      localStorage.removeItem('pending_registration_data');
      let errorMsg = "Não foi possível criar a conta.";
      if (
        err.code === 'auth/email-already-in-use' || 
        err.message?.includes('already-in-use') || 
        err.message?.includes('already in use') || 
        err.message?.includes('já possui uma conta')
      ) {
        errorMsg = "Este email já possui uma conta. Faça login para acessar.";
      } else if (err.code === 'auth/weak-password') {
        errorMsg = "A senha é muito fraca. Escolha uma senha de pelo menos 6 caracteres.";
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = "O e-mail fornecido é inválido.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      throw new Error(errorMsg);
    } finally {
      // setLoading(false); is handled inside catch block or specifically above on success
    }
  };

  const loginWithGoogle = async () => null;
  const loginWithProfile = (savedProfile: any) => {};
  const createProfile = async (data: Partial<Player>) => {
    if (!user) return;
    await writePlayerProfile(user.uid, data);
  };

  const updateProfile = async (data: Partial<Player>) => {
    if (!user || !player) return;
    try {
      await writePlayerProfile(user.uid, data);
    } catch (e) {
      console.warn("Profile update failed:", e);
    }
  };

  const logout = async () => {
    // Unsubscribe from active profile snapshot listener immediately
    if (unsubscribeProfileRef.current) {
      unsubscribeProfileRef.current();
      unsubscribeProfileRef.current = null;
    }

    // Instantly clear states to redirect to the AuthScreen with NO delay or spinner
    setUser(null);
    setPlayer(null);
    localStorage.removeItem('active_player_uid');
    localStorage.removeItem('last_player_profile');
    setLoading(false);

    // Complete backend updates and sign-out asynchronously in the background
    try {
      const existingUser = user;
      if (existingUser) {
        writePlayerProfile(existingUser.uid, { status: 'offline' }).catch(e => {
          console.warn("Failed marking profile offline during logout:", e);
        });
      }
      await signOut(auth);
    } catch (err) {
      console.error("Background sign out failure:", err);
    }
  };

  // Safe and professional delete profile method
  const deleteProfile = async (uid: string, passwordConfirm?: string) => {
    if (!user || user.uid !== uid) {
      throw new Error("Usuário não autorizado.");
    }
    setLoading(true);
    try {
      // 1. Double-delete core profiles with try-catch in case server cleared them first
      try {
        await deleteDoc(doc(db, 'players', uid));
        await deleteDoc(doc(db, 'users', uid));
      } catch (docErr) {
        console.warn("[useAuth] Client profile deletion completed by backend or skipped: ", docErr);
      }

      // 2. Delete associated auth credential
      try {
        console.log("[useAuth] Excluindo conta do Firebase Auth...");
        await deleteUser(user);
      } catch (authErr: any) {
        if (authErr.code === 'auth/requires-recent-login') {
          console.warn("[useAuth] Recent login required. Tentando reautenticação automática...");
          const savedPass = passwordConfirm || localStorage.getItem('last_auth_password');
          if (savedPass && user.email) {
            try {
              const credential = EmailAuthProvider.credential(user.email, savedPass);
              await reauthenticateWithCredential(user, credential);
              await deleteUser(user);
              console.log("[useAuth] Exclusão de Auth concluída após reautenticação!");
            } catch (reauthErr: any) {
              if (reauthErr.code === 'auth/user-not-found' || reauthErr.code === 'auth/invalid-credential' || reauthErr.code === 'auth/user-disabled' || reauthErr.message?.includes('not-found') || reauthErr.message?.includes('disabled')) {
                console.log("[useAuth] Account was already deleted in the backend API during re-auth fallback.");
              } else {
                console.error("[useAuth] Reautenticação automática falhou:", reauthErr);
                await signOut(auth);
                throw new Error("Para excluir sua conta por motivos de segurança, por favor faça login novamente para revalidar a sessão.");
              }
            }
          } else {
            await signOut(auth);
            throw new Error("Para excluir sua conta por motivos de segurança, por favor faça login novamente para revalidar a sessão.");
          }
        } else if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-disabled' || authErr.message?.includes('not-found') || authErr.message?.includes('disabled')) {
          console.log("[useAuth] Credencial de autenticação já excluída no backend (sucesso administrativo ou skip)");
        } else {
          throw authErr;
        }
      }

      // 3. Clear auth state immediately
      setUser(null);
      setPlayer(null);

    } catch (err: any) {
      console.error("[useAuth] Erro em deleteProfile:", err);
      try {
        await signOut(auth);
      } catch (eSig) {}
      setUser(null);
      setPlayer(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
