/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Player } from '../types';
import { seedWelcomeNotifications } from '../lib/notifications';
import { writePlayerProfile } from '../lib/rankingSync';
import { DEFAULT_THEME, applyTheme } from '../lib/theme';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    // Attempt instant recovery of session on startup to bypass blank logins
    const activeUid = localStorage.getItem('active_player_uid');
    const savedProfile = localStorage.getItem('last_player_profile');
    if (activeUid && savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        return {
          uid: parsed.uid,
          displayName: parsed.displayName,
          email: parsed.email || '',
        } as any;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [player, setPlayer] = useState<Player | null>(() => {
    // Attempt instant recovery of player profile on startup
    const activeUid = localStorage.getItem('active_player_uid');
    const savedProfile = localStorage.getItem('last_player_profile');
    if (activeUid && savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    // If we have an active player session and profile ready, we can start with loading = false
    const activeUid = localStorage.getItem('active_player_uid');
    const savedProfile = localStorage.getItem('last_player_profile');
    return !(activeUid && savedProfile);
  });

  // Unified real-time profile snapshot synchronization
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Only transition to loading if we do not already have the player profile in state
    if (!player || player.uid !== user.uid) {
      setLoading(true);
    }
    const unsubscribeSnapshot = onSnapshot(doc(db, 'players', user.uid), 
      (snapshot) => {
        if (snapshot.exists()) {
          const playerData = snapshot.data() as Player;
          setPlayer(playerData);
          localStorage.setItem('last_player_profile', JSON.stringify(playerData));
          
          // Sync with saved profiles list in localStorage
          const saved = localStorage.getItem('saved_profiles');
          let profiles = saved ? JSON.parse(saved) : [];
          const index = profiles.findIndex((p: any) => p.uid === playerData.uid);
          if (index >= 0) {
            profiles[index] = {
              ...profiles[index],
              displayName: playerData.displayName,
              avatar: playerData.avatar,
              base: playerData.base,
              shift: playerData.shift,
              level: playerData.level,
              totalScore: playerData.totalScore,
              gamesPlayed: playerData.gamesPlayed || 0,
              completedGames: playerData.completedGames || 0,
              timedOutGames: playerData.timedOutGames || 0
            };
            localStorage.setItem('saved_profiles', JSON.stringify(profiles));
          }
        } else {
          // If profile doc in Firestore was deleted, keep the current player status if initialized to prevent registration race conditions.
          console.log("Player document snapshot does not exist yet for UID:", user.uid);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error watching player doc in snapshot:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, [user?.uid]);

  // Active online presence and multi-device state synchronization heartbeat
  useEffect(() => {
    if (!player?.uid) return;

    const docRef = doc(db, 'players', player.uid);
    
    // Generate or fetch persistent sessionId for this device
    let sessionId = localStorage.getItem('active_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('active_session_id', sessionId);
    }
    
    const sessionRef = doc(db, 'sessions', sessionId);
    
    // Parse device details securely
    const ua = navigator.userAgent;
    let platform = 'Desktop';
    if (/mobile/i.test(ua)) platform = 'Mobile';
    if (/tablet/i.test(ua) || /ipad/i.test(ua)) platform = 'Tablet';

    let deviceName = 'Navegador Web';
    if (/chrome|crios/i.test(ua)) {
      deviceName = 'Chrome';
    } else if (/safari/i.test(ua)) {
      deviceName = 'Safari';
    } else if (/firefox/i.test(ua)) {
      deviceName = 'Firefox';
    } else if (/edge/i.test(ua)) {
      deviceName = 'Edge';
    }

    let os = 'OS Desconhecido';
    if (/windows/i.test(ua)) {
      os = 'Windows';
    } else if (/mac/i.test(ua)) {
      os = 'macOS';
    } else if (/android/i.test(ua)) {
      os = 'Android';
      platform = 'Mobile';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = 'iOS';
      if (/ipad/i.test(ua)) platform = 'Tablet';
      else platform = 'Mobile';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    }

    const friendlyDeviceName = `${deviceName} no ${os}`;

    // Set status to online and record last active instantly on load
    const makeOnline = async () => {
      try {
        await updateDoc(docRef, {
          status: 'online',
          lastActive: new Date().toISOString()
        });
        
        await setDoc(sessionRef, {
          sessionId,
          userId: player.uid,
          email: player.email || '',
          deviceName: friendlyDeviceName,
          platform,
          online: true,
          lastSeen: new Date().toISOString(),
          loginTime: localStorage.getItem(`login_time_${sessionId}`) || new Date().toISOString()
        }, { merge: true });
        
        if (!localStorage.getItem(`login_time_${sessionId}`)) {
          localStorage.setItem(`login_time_${sessionId}`, new Date().toISOString());
        }
      } catch (err) {
        console.warn("Presence registration failed:", err);
      }
    };
    
    makeOnline();

    // Heartbeat every 20 seconds to keep session dynamic across multiple devices
    const interval = setInterval(async () => {
      try {
        await updateDoc(docRef, {
          status: 'online',
          lastActive: new Date().toISOString()
        });

        await setDoc(sessionRef, {
          lastSeen: new Date().toISOString(),
          online: true,
          email: player.email || ''
        }, { merge: true });
      } catch (err) {
        console.warn("Presence heartbeat failed:", err);
      }
    }, 20000);

    // Watch for remote session revocation/deletion
    const unsubscribeSession = onSnapshot(sessionRef, (snap) => {
      if (localStorage.getItem('active_session_id') === sessionId && !snap.exists()) {
        console.log("Sessão encerrada ou revogada remotamente.");
        localStorage.removeItem('active_player_uid');
        localStorage.removeItem('last_player_profile');
        localStorage.removeItem('active_session_id');
        localStorage.removeItem(`login_time_${sessionId}`);
        setUser(null);
        setPlayer(null);
        auth.signOut().catch(() => {});
      }
    }, (err) => {
      console.warn("Erro na assinatura de sessão:", err);
    });

    // Visibility change updates status immediately
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        makeOnline();
      } else {
        // Mark session as temporarily offline/away but do not touch other sessions
        setDoc(sessionRef, {
          online: false,
          lastSeen: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribeSession();
      // Clean up session if component unmounts or player changes
      setDoc(sessionRef, {
        online: false,
        lastSeen: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    };
  }, [player?.uid]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      const wasExplicitLogout = sessionStorage.getItem('explicit_logout') === 'true';
      const wasJustDeleted = sessionStorage.getItem('just_deleted_account') === 'true';
      if (wasExplicitLogout || wasJustDeleted) {
        setUser(null);
        setPlayer(null);
        setLoading(false);
        if (u) {
          auth.signOut().catch(() => {});
        }
        return;
      }

      const activeUid = localStorage.getItem('active_player_uid');
      if (u) {
        // If there is an active player profile distinct from Firebase Auth UID, preserve it
        if (activeUid && activeUid !== u.uid) {
          console.log("onAuthStateChanged: Preserving active multi-profile player UID:", activeUid);
          const savedProfile = localStorage.getItem('last_player_profile');
          if (savedProfile) {
            try {
              const parsed = JSON.parse(savedProfile);
              setUser({
                uid: parsed.uid,
                displayName: parsed.displayName,
                email: parsed.email || '',
              } as any);
              setPlayer(parsed);
            } catch (e) {}
          }
          setLoading(false);
          return;
        }

        setUser(u);
        localStorage.setItem('active_player_uid', u.uid);

        // If user signs in with Google, check if any existing player document has the same email.
        // This links the user's quick/local profile automatically so they don't have to re-register.
        if (u.email) {
          try {
            const playerSnap = await getDoc(doc(db, 'players', u.uid));
            if (!playerSnap.exists()) {
              const q = query(collection(db, 'players'), where('email', '==', u.email.trim().toLowerCase()));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const matchedPlayer = qSnap.docs[0].data() as Player;
                const linkedPlayer = {
                  ...matchedPlayer,
                  uid: u.uid,
                  email: u.email.trim().toLowerCase()
                };
                await setDoc(doc(db, 'players', u.uid), linkedPlayer);
              }
            }
          } catch (e) {
            console.warn("Failed checking for email-linked player profiles:", e);
          }
        }
      } else {
        // If there's an active local session, do not sign out/clear unless requested
        const currentActiveUid = localStorage.getItem('active_player_uid');
        if (!currentActiveUid) {
          setUser(null);
          setPlayer(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Login failed", error);
      setLoading(false);
      return null;
    }
  };

  const loginWithProfile = (savedProfile: any) => {
    setLoading(true);
    // 1. Set simulated user session
    const simulatedUser = {
      uid: savedProfile.uid,
      displayName: savedProfile.displayName,
      email: savedProfile.email || '',
    } as any;
    setUser(simulatedUser);

    // 2. Set current player
    const simulatedPlayer: Player = {
      uid: savedProfile.uid,
      displayName: savedProfile.displayName,
      avatar: savedProfile.avatar || '👷',
      base: savedProfile.base || 'Base 01',
      shift: savedProfile.shift || 'Turno A - Diurno',
      xp: savedProfile.xp || 0,
      level: savedProfile.level || 1,
      totalScore: savedProfile.totalScore || 0,
      gamesPlayed: savedProfile.gamesPlayed || 0,
      completedGames: savedProfile.completedGames || 0,
      timedOutGames: savedProfile.timedOutGames || 0,
      lastActive: new Date().toISOString(),
      ...savedProfile
    };
    setPlayer(simulatedPlayer);

    // 3. Keep in localStorage so page reload recovers automatically
    localStorage.setItem('active_player_uid', savedProfile.uid);
    localStorage.setItem('last_player_profile', JSON.stringify(simulatedPlayer));

    setLoading(false);
  };

  const createLocalProfile = async (displayName: string, email: string, base: string, shift: string, password?: string) => {
    setLoading(true);
    try {
      const cleanedEmail = email?.trim().toLowerCase() || '';
      const trimmedDisplayName = displayName ? displayName.trim() : '';

      if (!trimmedDisplayName) {
        throw new Error("Por favor, insira sua identificação / apelido.");
      }

      // 1. Check duplicate Email in Firestore
      if (cleanedEmail) {
        const qEmail = query(collection(db, 'players'), where('email', '==', cleanedEmail));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          throw new Error("Este e-mail já está cadastrado por outro perfil.");
        }
      }

      // 2. Check duplicate Nickname / Apelido in Firestore
      const qNick = query(collection(db, 'players'), where('displayName', '==', trimmedDisplayName));
      const snapNick = await getDocs(qNick);
      if (!snapNick.empty) {
        throw new Error("Este apelido já está em uso. Por favor, escolha outro.");
      }

      let authUser: User | null = null;
      const finalPassword = password && password.length >= 6 ? password : (cleanedEmail + "_rodoplay");

      if (cleanedEmail) {
        try {
          // Try creating standard User with Email in Firebase Auth
          const authResult = await createUserWithEmailAndPassword(auth, cleanedEmail, finalPassword);
          authUser = authResult.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            try {
              // Already exists in Firebase Auth, so log in
              const authResult = await signInWithEmailAndPassword(auth, cleanedEmail, finalPassword);
              authUser = authResult.user;
            } catch (signInErr: any) {
              console.warn("Sign-in failed with password, merging directly:", signInErr);
            }
          } else if (authErr.code === 'auth/operation-not-allowed') {
            console.warn("AVISO: O provedor de 'E-mail/Senha' está desativado no Firebase. Habilite-o no Firebase Console.");
          } else {
            console.warn("Aviso no Firebase Auth durante o cadastro, prosseguindo com perfil local:", authErr);
          }
        }
      }

      // Use Auth UID as the Player UID if auth was successful; otherwise, fallback to unique ID
      const targetUid = authUser ? authUser.uid : ('p_' + Math.random().toString(36).substring(2, 11));

      // Creating completely new profile in Firestore with all required fields
      const newPlayer: Player = {
        uid: targetUid,
        displayName: trimmedDisplayName,
        base: base,
        shift: shift,
        xp: 0,
        level: 1,
        totalScore: 0,
        gamesPlayed: 0,
        completedGames: 0,
        timedOutGames: 0,
        avatar: '👷',
        status: 'online',
        victories: 0,
        defeats: 0,
        favoriteGames: [],
        history: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };

      if (cleanedEmail) {
        newPlayer.email = cleanedEmail;
      }

      // Save to Firestore
      await writePlayerProfile(targetUid, newPlayer);
      
      // Seed welcome notifications ONLY on registration/signup
      try {
        await seedWelcomeNotifications(targetUid, trimmedDisplayName, 0, 0);
        localStorage.setItem(`notifications_seeded_${targetUid}`, 'true');
      } catch (seedErr) {
        console.warn("Failed to seed initial notifications during registration:", seedErr);
      }
      
      // Set local states
      setPlayer(newPlayer);
      setUser({
        uid: targetUid,
        displayName: trimmedDisplayName,
        email: cleanedEmail,
      } as any);

      localStorage.setItem('active_player_uid', targetUid);
      localStorage.setItem('last_player_profile', JSON.stringify(newPlayer));

      // Save profile updates to the multi-profile picker
      const saved = localStorage.getItem('saved_profiles');
      let profiles = saved ? JSON.parse(saved) : [];
      profiles = profiles.filter((p: any) => p.uid !== targetUid);

      const profileUpdate = {
        uid: targetUid,
        email: cleanedEmail,
        displayName: trimmedDisplayName,
        avatar: '👷',
        base: base,
        shift: shift,
        level: 1,
        totalScore: 0,
        gamesPlayed: 0,
        completedGames: 0,
        timedOutGames: 0
      };

      profiles.unshift(profileUpdate);
      localStorage.setItem('saved_profiles', JSON.stringify(profiles));
      return newPlayer;
    } catch (error) {
      console.error("Critical error inside createLocalProfile:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailString = async (email: string, password?: string) => {
    setLoading(true);
    const cleanedEmail = email.trim().toLowerCase();
    const authPassword = password && password.length >= 6 ? password : (cleanedEmail + "_rodoplay");
    let authUser: User | null = null;

    try {
      // 1. Check Firestore player profiles
      const q = query(collection(db, 'players'), where('email', '==', cleanedEmail));
      const qSnap = await getDocs(q);
      if (qSnap.empty) {
        setLoading(false);
        throw new Error("Nenhum perfil foi encontrado com este e-mail.");
      }

      const foundProfiles: Player[] = [];
      qSnap.forEach((docSnap) => {
        foundProfiles.push({
          uid: docSnap.id,
          ...docSnap.data()
        } as Player);
      });

      // Sort found profiles so that the most recently active profile is first
      foundProfiles.sort((a, b) => {
        const tA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const tB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return tB - tA;
      });

      // 2. Sign in or sign up in Firebase Auth
      try {
        const authResult = await signInWithEmailAndPassword(auth, cleanedEmail, authPassword);
        authUser = authResult.user;
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found') {
          // Create the auth user if they don't exist yet in Auth console but have a Firestore profile
          try {
            const authResult = await createUserWithEmailAndPassword(auth, cleanedEmail, authPassword);
            authUser = authResult.user;
          } catch (createErr) {
            console.error("Failed to create missing auth user during login:", createErr);
          }
        } else if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
          // Check if we can sign in with the backward-compatible fallback password
          const fallbackPassword = cleanedEmail + "_rodoplay";
          if (authPassword !== fallbackPassword) {
            try {
              const authResult = await signInWithEmailAndPassword(auth, cleanedEmail, fallbackPassword);
              authUser = authResult.user;
            } catch (fallbackErr) {
              throw new Error("Senha ou credenciais incorretas. Por favor, tente novamente.");
            }
          } else {
            throw new Error("Senha ou credenciais incorretas. Por favor, tente novamente.");
          }
        } else {
          console.error("Auth sign in error:", signInErr);
          throw signInErr;
        }
      }

      const activePlayer = foundProfiles[0];

      setPlayer(activePlayer);
      setUser({
        uid: activePlayer.uid,
        displayName: activePlayer.displayName,
        email: cleanedEmail
      } as any);

      localStorage.setItem('active_player_uid', activePlayer.uid);
      localStorage.setItem('last_player_profile', JSON.stringify(activePlayer));

      // Save ALL found profiles to local storage, tracking by UID only
      const saved = localStorage.getItem('saved_profiles');
      let profiles = saved ? JSON.parse(saved) : [];

      const fetchedUids = new Set(foundProfiles.map(p => p.uid));
      profiles = profiles.filter((p: any) => !fetchedUids.has(p.uid));

      const updatedProfiles = foundProfiles.map(p => ({
        uid: p.uid,
        email: cleanedEmail,
        displayName: p.displayName,
        avatar: p.avatar || '👷',
        base: p.base,
        shift: p.shift,
        level: p.level || 1,
        totalScore: p.totalScore || 0,
        gamesPlayed: p.gamesPlayed || 0,
        completedGames: p.completedGames || 0,
        timedOutGames: p.timedOutGames || 0
      }));

      profiles = [...updatedProfiles, ...profiles];
      localStorage.setItem('saved_profiles', JSON.stringify(profiles));
      setLoading(false);
      return activePlayer;
    } catch (e: any) {
      setLoading(false);
      throw e;
    }
  };

  const createProfile = async (data: Partial<Player>, customUid?: string) => {
    const uid = customUid || user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    
    const playerRef = doc(db, 'players', uid);
    let existingData: any = {};
    try {
      const snap = await getDoc(playerRef);
      if (snap.exists()) {
        existingData = snap.data();
      }
    } catch (e) {
      console.warn("Failed to retrieve existing player doc relative score:", e);
    }

    const userEmail = user?.email || auth.currentUser?.email || existingData.email || '';
    const newPlayer: Player = {
      uid: uid,
      displayName: data.displayName || existingData.displayName || auth.currentUser?.displayName || 'Anon',
      base: data.base || existingData.base || 'Base 01',
      shift: data.shift || existingData.shift || 'Turno A - Diurno',
      xp: existingData.xp || 0,
      level: existingData.level || 1,
      totalScore: existingData.totalScore || 0,
      gamesPlayed: existingData.gamesPlayed || 0,
      completedGames: existingData.completedGames || 0,
      timedOutGames: existingData.timedOutGames || 0,
      avatar: existingData.avatar || '👷',
      lastActive: new Date().toISOString(),
      ...existingData,
      ...data
    } as any;

    if (userEmail) {
      (newPlayer as any).email = userEmail.trim().toLowerCase();
    }

    await writePlayerProfile(uid, newPlayer);
    setPlayer(newPlayer);

    localStorage.setItem('active_player_uid', uid);
    localStorage.setItem('last_player_profile', JSON.stringify(newPlayer));

    // Update 'saved_profiles' too so the login selector reflects the up-to-date points/level
    const saved = localStorage.getItem('saved_profiles');
    let profiles = saved ? JSON.parse(saved) : [];
    const index = profiles.findIndex((p: any) => p.uid === uid);
    const profileUpdate = {
      uid: uid,
      email: (data as any).email || existingData.email || auth.currentUser?.email || '',
      displayName: newPlayer.displayName,
      avatar: newPlayer.avatar,
      base: newPlayer.base,
      shift: newPlayer.shift,
      level: newPlayer.level,
      totalScore: newPlayer.totalScore,
      gamesPlayed: newPlayer.gamesPlayed || 0,
      completedGames: newPlayer.completedGames || 0,
      timedOutGames: newPlayer.timedOutGames || 0
    };

    if (index >= 0) {
      profiles[index] = profileUpdate;
    } else {
      profiles.unshift(profileUpdate);
    }
    localStorage.setItem('saved_profiles', JSON.stringify(profiles));
  };

  const updateProfile = async (data: Partial<Player>) => {
    const activeUid = localStorage.getItem('active_player_uid') || user?.uid;
    if (!activeUid) return;

    // 1. Optimistically sync local state & localStorage immediately to ensure progress is NEVER lost!
    if (player) {
      const updatedPlayer = { ...player, ...data };
      setPlayer(updatedPlayer);
      localStorage.setItem('last_player_profile', JSON.stringify(updatedPlayer));

      const saved = localStorage.getItem('saved_profiles');
      let profiles = saved ? JSON.parse(saved) : [];
      const index = profiles.findIndex((p: any) => p.uid === activeUid);
      if (index >= 0) {
        profiles[index] = {
          ...profiles[index],
          displayName: updatedPlayer.displayName || profiles[index].displayName,
          avatar: updatedPlayer.avatar || profiles[index].avatar,
          base: updatedPlayer.base || profiles[index].base,
          shift: updatedPlayer.shift || profiles[index].shift,
          gamesPlayed: updatedPlayer.gamesPlayed !== undefined ? updatedPlayer.gamesPlayed : profiles[index].gamesPlayed,
          completedGames: updatedPlayer.completedGames !== undefined ? updatedPlayer.completedGames : profiles[index].completedGames,
          timedOutGames: updatedPlayer.timedOutGames !== undefined ? updatedPlayer.timedOutGames : profiles[index].timedOutGames,
          level: updatedPlayer.level !== undefined ? updatedPlayer.level : profiles[index].level,
          totalScore: updatedPlayer.totalScore !== undefined ? updatedPlayer.totalScore : profiles[index].totalScore,
        };
        localStorage.setItem('saved_profiles', JSON.stringify(profiles));
      }
    }

    // 2. Persist to Firestore database in background
    try {
      await writePlayerProfile(activeUid, data);
    } catch (error) {
      console.warn("[Firebase Error] Falha de sincronização de perfil na nuvem:", error);
    }
  };

  const deleteProfile = async (uid: string, passwordConfirm?: string) => {
    const currentUser = auth.currentUser;
    const isPasswordUser = currentUser?.providerData.some(p => p.providerId === 'password') || false;
    const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com') || false;

    // 1. RE-AUTHENTICATE FIRST IF AUTHENTICATED SYSTEM-WIDE to guarantee deleteUser credentials freshness
    if (currentUser) {
      if (isPasswordUser) {
        if (!passwordConfirm) {
          throw new Error("Usuário cadastrado por e-mail necessita de confirmação por senha.");
        }
        if (currentUser.email) {
          try {
            const credential = EmailAuthProvider.credential(currentUser.email, passwordConfirm);
            await reauthenticateWithCredential(currentUser, credential);
            console.log("Re-authentication succeeded for email/password user");
          } catch (e: any) {
            console.error("Re-authentication failed for email/password user:", e);
            throw new Error("Senha de confirmação incorreta. Por favor, tente novamente.");
          }
        }
      } else if (isGoogleUser) {
        try {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(currentUser, provider);
          console.log("Re-authentication succeeded for Google user");
        } catch (e: any) {
          console.error("Re-authentication failed for Google user:", e);
          if (e.code === 'auth/popup-blocked') {
            throw new Error("O popup de login do Google foi bloqueado pelo seu navegador. Por favor, permita popups e tente novamente.");
          } else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
            throw new Error("Reautenticação cancelada. É necessário reautenticar com o Google para confirmar a exclusão da sua conta.");
          }
          throw new Error("Falha na reautenticação com o Google. Para sua segurança, é necessário confirmar sua conta antes da exclusão.");
        }
      }
    }

    // 2. Perform all database deletions after re-authentication succeeded
    try {
      if (uid) {
        console.log("Starting full Firestore cleanup for user UID:", uid);
        
        // Capture player details to clean up rankings and master user document
        let currentPlayerBase = player?.base;
        let currentPlayerShift = player?.shift;

        if (!currentPlayerBase || !currentPlayerShift) {
          try {
            const playerSnap = await getDoc(doc(db, 'players', uid));
            if (playerSnap.exists()) {
              const pData = playerSnap.data();
              currentPlayerBase = currentPlayerBase || pData?.base;
              currentPlayerShift = currentPlayerShift || pData?.shift;
            }
          } catch (fetchErr) {
            console.warn("Could not fetch player doc before deletion:", fetchErr);
          }
        }

        // Delete player document
        await deleteDoc(doc(db, 'players', uid));

        // Delete associated user master document
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (uErr) {
          console.warn("Error deleting master user document during profile deletion:", uErr);
        }

        // Delete rankings documents
        try {
          await deleteDoc(doc(db, 'rankings', 'global', 'players', uid));
          if (currentPlayerBase) {
            await deleteDoc(doc(db, 'rankings', 'bases', 'all_bases', currentPlayerBase, 'players', uid));
          }
          if (currentPlayerShift) {
            await deleteDoc(doc(db, 'rankings', 'turnos', 'all_turnos', currentPlayerShift, 'players', uid));
          }
          console.log("Ranking documents deleted successfully");
        } catch (rankingErr) {
          console.warn("Failed to delete ranking documents during profile deletion:", rankingErr);
        }

        // Delete associated sessions
        try {
          const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', uid));
          const sessionsSnap = await getDocs(sessionsQuery);
          for (const sDoc of sessionsSnap.docs) {
            await deleteDoc(doc(db, 'sessions', sDoc.id));
          }
        } catch (errSession) {
          console.warn("Error deleting sessions during profile deletion:", errSession);
        }

        // Delete received or sent notifications
        try {
          const notisRxQuery = query(collection(db, 'notifications'), where('recipientId', '==', uid));
          const notisRxSnap = await getDocs(notisRxQuery);
          for (const nDoc of notisRxSnap.docs) {
            await deleteDoc(doc(db, 'notifications', nDoc.id));
          }
          const notisTxQuery = query(collection(db, 'notifications'), where('senderId', '==', uid));
          const notisTxSnap = await getDocs(notisTxQuery);
          for (const nDoc of notisTxSnap.docs) {
            await deleteDoc(doc(db, 'notifications', nDoc.id));
          }
        } catch (errNoti) {
          console.warn("Error deleting notifications during profile deletion:", errNoti);
        }

        // Delete invitations
        try {
          const listRxQuery = query(collection(db, 'invitations'), where('receiverId', '==', uid));
          const listRxSnap = await getDocs(listRxQuery);
          for (const iDoc of listRxSnap.docs) {
            await deleteDoc(doc(db, 'invitations', iDoc.id));
          }
          const listTxQuery = query(collection(db, 'invitations'), where('senderId', '==', uid));
          const listTxSnap = await getDocs(listTxQuery);
          for (const iDoc of listTxSnap.docs) {
            await deleteDoc(doc(db, 'invitations', iDoc.id));
          }
        } catch (errInvite) {
          console.warn("Error deleting invitations during profile deletion:", errInvite);
        }

        // Delete multiplayer rooms
        try {
          const roomsCreatorQuery = query(collection(db, 'multiplayer_rooms'), where('creatorId', '==', uid));
          const roomsCreatorSnap = await getDocs(roomsCreatorQuery);
          for (const rDoc of roomsCreatorSnap.docs) {
            await deleteDoc(doc(db, 'multiplayer_rooms', rDoc.id));
          }
          const roomsPartnerQuery = query(collection(db, 'multiplayer_rooms'), where('partnerId', '==', uid));
          const roomsPartnerSnap = await getDocs(roomsPartnerQuery);
          for (const rDoc of roomsPartnerSnap.docs) {
            await deleteDoc(doc(db, 'multiplayer_rooms', rDoc.id));
          }
        } catch (errRoom) {
          console.warn("Error deleting multiplayer rooms during profile deletion:", errRoom);
        }

        // Delete duels logs
        try {
          const duels1Query = query(collection(db, 'duels'), where('player1Id', '==', uid));
          const duels1Snap = await getDocs(duels1Query);
          for (const dDoc of duels1Snap.docs) {
            await deleteDoc(doc(db, 'duels', dDoc.id));
          }
          const duels2Query = query(collection(db, 'duels'), where('player2Id', '==', uid));
          const duels2Snap = await getDocs(duels2Query);
          for (const dDoc of duels2Snap.docs) {
            await deleteDoc(doc(db, 'duels', dDoc.id));
          }
        } catch (errDuel) {
          console.warn("Error deleting duels during profile deletion:", errDuel);
        }

        console.log("Firestore cleanup finished successfully");
      }
    } catch (e) {
      console.warn("Error during Firestore cleanup phase:", e);
    }

    // 3. Clear all saved profiles & custom themes on this device to return completely clean (zerado)
    try {
      localStorage.removeItem('saved_profiles');
    } catch (savedErr) {
      console.warn("Error clearing saved_profiles during deletion:", savedErr);
    }

    // Wipe theme settings and restore yellow/dark default styling
    try {
      localStorage.removeItem('app_theme_mode');
      localStorage.removeItem('app_theme_primary');
      localStorage.removeItem('app_theme_secondary');
      applyTheme(DEFAULT_THEME);
    } catch (themeResetErr) {
      console.warn("Error resetting theme during profile deletion:", themeResetErr);
    }

    // 4. Wipe active session identifiers & active caches
    localStorage.removeItem('active_player_uid');
    localStorage.removeItem('last_player_profile');
    localStorage.removeItem('active_session_id');
    sessionStorage.setItem('just_deleted_account', 'true');
    sessionStorage.removeItem('explicit_logout');

    setUser(null);
    setPlayer(null);
    setLoading(false);

    // 5. Delete Auth user account completely
    if (currentUser) {
      try {
        await deleteUser(currentUser);
        console.log("Firebase Auth user deleted successfully");
      } catch (authDeleteErr: any) {
        console.error("Erro final ao excluir usuário do Firebase Auth:", authDeleteErr);
        // Fallback to sign out
        try {
          await auth.signOut();
        } catch (signOutErr) {
          console.warn("SignOut fallback failed:", signOutErr);
        }
        throw new Error(`Seus dados de jogo foram apagados com sucesso, mas houve uma limitação do Firebase para excluir o login de forma síncrona: ${authDeleteErr.message || authDeleteErr}. No entanto, seu perfil foi totalmente limpo e deslogado.`);
      }
    } else {
      try {
        await auth.signOut();
      } catch (signOutErr) {
        console.warn("SignOut failed:", signOutErr);
      }
    }
  };

  const logout = async () => {
    const activeUid = localStorage.getItem('active_player_uid') || user?.uid;
    const sessionId = localStorage.getItem('active_session_id');

    // 1. Immediately clear local storage and states so the UI updates and redirects instantly
    localStorage.removeItem('active_player_uid');
    localStorage.removeItem('last_player_profile');
    sessionStorage.setItem('explicit_logout', 'true');
    setUser(null);
    setPlayer(null);

    // 2. Fire and forget the Firestore/Firebase network updates in the background
    if (sessionId) {
      setDoc(doc(db, 'sessions', sessionId), {
        online: false,
        lastSeen: new Date().toISOString()
      }, { merge: true }).catch((e) => {
        console.warn("Failed to update session offline on logout", e);
      });
      localStorage.removeItem('active_session_id');
      localStorage.removeItem(`login_time_${sessionId}`);
    }

    if (activeUid) {
      updateDoc(doc(db, 'players', activeUid), {
        status: 'offline',
        lastActive: new Date().toISOString()
      }).catch((err) => {
        console.warn("Failed to set offline status during logout:", err);
      });
    }

    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Signout failed but local session was successfully cleared.");
    }
  };

  return { user, player, loading, loginWithGoogle, loginWithProfile, loginWithEmailString, createLocalProfile, createProfile, updateProfile, logout, deleteProfile };
}
