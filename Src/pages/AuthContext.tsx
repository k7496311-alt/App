import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, Timestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, AuthState } from '../types';

const AuthContext = createContext<{
  state: AuthState;
  login: (phone: string, password: string) => Promise<void>;
  adminLogin: (phone: string) => Promise<void>;
  register: (phone: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
} | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let unsubUser: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Start listening to user document
        unsubUser = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setState({ user: { id: docSnap.id, ...docSnap.data() } as UserProfile, loading: false });
          } else {
            setState({ user: null, loading: false });
          }
        }, (error) => {
          console.error("User profile listener error:", error);
          setState(prev => ({ ...prev, loading: false }));
        });
      } else {
        if (unsubUser) unsubUser();
        setState({ user: null, loading: false });
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  const login = async (phone: string, password: string) => {
    // Ensure anonymous sign-in first to satisfy security rules for 'list'
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) throw new Error('User not found');
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.password !== password) throw new Error('Invalid password');
    
    setState({ user: { id: userDoc.id, ...userData } as UserProfile, loading: false });
  };

  const adminLogin = async (phone: string) => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const userId = auth.currentUser!.uid;

    // Master account bypass for initial setup (replace with real admin in console)
    if (phone === '01700000000') {
      const masterData = {
        phone,
        balance: 1000000,
        role: 'admin',
        referralCode: 'MASTER',
        referredBy: '',
        createdAt: Timestamp.now(),
        password: 'admin' // placeholder
      };
      await setDoc(doc(db, 'users', userId), masterData, { merge: true });
      setState({ user: { id: userId, ...masterData } as UserProfile, loading: false });
      return;
    }

    const q = query(collection(db, 'users'), where('phone', '==', phone), where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) throw new Error('Admin access denied or user not found');
    
    const adminDoc = querySnapshot.docs[0];
    setState({ user: { id: adminDoc.id, ...adminDoc.data() } as UserProfile, loading: false });
  };

  const register = async (phone: string, password: string, referralCode?: string) => {
    // Ensure anonymous sign-in first to satisfy security rules for 'list'
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    // Check if phone exists
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error('Phone already registered');

    const userId = auth.currentUser!.uid;
    
    const newUser: Omit<UserProfile, 'id'> = {
      phone,
      password,
      balance: 10,
      referralCode: Math.random().toString(36).substring(7).toUpperCase(),
      referredBy: referralCode || '',
      createdAt: Timestamp.now(),
      role: 'user'
    };

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, newUser);

      // Add signup bonus transaction
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId,
        type: 'referral', // Using referral type as a general bonus type or I could add 'bonus'
        amount: 10,
        status: 'approved',
        time: Timestamp.now(),
        description: 'Signup Bonus'
      });

      await batch.commit();
      setState({ user: { id: userId, ...newUser } as UserProfile, loading: false });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error('ডেটাবেজ পারমিশন এরর। অনুগ্রহ করে এডমিনকে জানান। (Firestore Rules Denied)');
      }
      throw err;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ state, login, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
