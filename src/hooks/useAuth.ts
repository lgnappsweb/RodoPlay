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
  User
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Player } from '../types';
import { writePlayerProfile } from '../lib/rankingSync';
import { createNotification } from '../lib/notifications';

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
                shift: found.shift || 'Turno A',
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
        const playerRef = doc(db, 'players', authUser.uid);

        // Bind dynamic onSnapshot for realtime, multi-device synchronization instantly
        unsubscribeProfileRef.current = onSnapshot(playerRef, (snapshot) => {
          if (snapshot.exists()) {
            const playerData = snapshot.data() as Player;
            setPlayer({
              ...playerData,
              uid: snapshot.id
            });
            localStorage.setItem('last_player_profile', JSON.stringify(playerData));

            // Automatically sync status metadata to local saved device profiles
            try {
              const savedPass = localStorage.getItem('last_auth_password');
              if (savedPass && playerData.email) {
                const savedProfilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
                const savedList = JSON.parse(savedProfilesStr);
                const filteredList = savedList.filter((p: any) => p.email.toLowerCase() !== playerData.email.toLowerCase());
                
                filteredList.unshift({
                  uid: snapshot.id,
                  email: playerData.email,
                  password: savedPass,
                  displayName: playerData.displayName || 'Membro do Time',
                  avatar: playerData.avatar || '👷',
                  base: playerData.base || 'Base 01',
                  shift: playerData.shift || 'Turno A',
                  praca: (playerData as any).praca || (playerData as any).praça || 'Não Aplicável'
                });
                
                localStorage.setItem('roplay_saved_profiles', JSON.stringify(filteredList));
              }
            } catch (errLocal) {
              console.warn("Snapshot saved profiles updates mapping error:", errLocal);
            }

            setLoading(false);
          } else {
            // The profile doesn't exist yet on search. Only recreate baseline if there matches no active registration cache.
            const cachedReg = localStorage.getItem('pending_registration_data');
            if (!cachedReg) {
              console.log("No profile and no pending registration. Auto-building default profile in background...");
              const defaultProfile: Player = {
                uid: authUser.uid,
                displayName: authUser.displayName || authUser.email?.split('@')[0] || 'Motorista RodoPlay',
                email: authUser.email || '',
                base: 'Base 01',
                shift: 'Turno A - Diurno',
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
              };
              (defaultProfile as any).praca = 'Não Aplicável';
              (defaultProfile as any).praça = 'Não Aplicável';

              // Assign state immediately to keep loading instantaneous
              setPlayer(prev => prev || defaultProfile);
              setLoading(false);

              writePlayerProfile(authUser.uid, defaultProfile).catch((err) => {
                console.warn("Failsafe profile creation background write error:", err);
              });
            } else {
              // There is a pending signup sequence, let the createLocalProfile route manage it. Keep it fast!
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
      
      // Update last login timestamp in Firestore in background without block-await
      writePlayerProfile(res.user.uid, {
        lastLogin: new Date().toISOString(),
        status: 'online'
      }).catch((writeErr) => {
        console.warn("Background log statistics update error:", writeErr);
      });

      return res.user;
    } catch (err: any) {
      console.error("Login failure inside hook:", err);
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
        lastActive: new Date().toISOString()
      };
      
      // Store PT-BR attributes under exact keys
      (newPlayer as any).praca = praca || 'Praça 01';
      (newPlayer as any).praça = praca || 'Praça 01';

      // Set user and player state instantly to prevent any loading screen or lag
      setUser(res.user);
      setPlayer(newPlayer);
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
        const welcomeMsg = `Olá, Operador(a) ${displayName.trim()}!\n\nSeja muito bem-vindo(a) à nossa plataforma de capacitação operacional e patrulhamento de vias.\n\nSeu cadastro do turno ${shift} na ${base} foi homologado com absoluto sucesso em nosso sistema de monitoramento profissional. A partir de agora, você está habilitado(a) a registrar patrulhas, acumular pontos operenciais, subir no ranking e desafiar outros colegas de equipe em duelos de conhecimento.\n\nSua integridade física e atenção nas vias permanecem como prioridade número um. Desejamos uma excelente jornada d'água e muito sucesso nas suas inspeções operacionais!`;
        
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
      console.error("Signup failure inside hook:", err);
      localStorage.removeItem('pending_registration_data');
      let errorMsg = "Não foi possível criar a conta.";
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = "Este e-mail já está sendo utilizado por outra conta.";
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
      // Clean up saved profile locally
      try {
        const emailToDelete = user.email;
        if (emailToDelete) {
          const profilesStr = localStorage.getItem('roplay_saved_profiles') || '[]';
          const profiles = JSON.parse(profilesStr);
          const updated = profiles.filter((p: any) => p.email.toLowerCase() !== emailToDelete.toLowerCase());
          localStorage.setItem('roplay_saved_profiles', JSON.stringify(updated));
        }
      } catch (errClean) {
        console.warn("Failed to clean deleted profile from local list:", errClean);
      }

      // 1. Delete associated data documents to leave databases clean
      await deleteDoc(doc(db, 'players', uid));
      await deleteDoc(doc(db, 'users', uid));
      
      // 2. Delete Auth Account
      await deleteUser(user);
    } catch (err: any) {
      console.error("Failed deleting user profile:", err);
      // If re-authentication is required, sign out gracefully
      if (err.code === 'auth/requires-recent-login') {
        await signOut(auth);
        throw new Error("Para excluir sua conta, você precisa ter feito login recentemente. Faça login novamente e tente de novo.");
      }
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
