import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, set, get, onValue, update } from 'firebase/database';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import firebaseConfig from '../firebase-applet-config.json';
import { Delivery, User } from './types';

// Connection Provider Types
export type DBProvider = 'firebase' | 'supabase';

// Supabase Custom Config schema
export interface CustomSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Resolution for Firebase config
export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  databaseURL?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  type: 'firestore' | 'rtdb';
}

function loadDbProvider(): DBProvider {
  const stored = localStorage.getItem('bioentregas_db_provider');
  if (stored === 'supabase') return 'supabase';
  return 'firebase';
}

export const activeDBProvider = loadDbProvider();

function loadFirebaseConfig(): { config: CustomFirebaseConfig; isCustom: boolean } {
  try {
    const raw = localStorage.getItem('bioentregas_custom_firebase_config');
    if (raw) {
      const parsed = JSON.parse(raw) as CustomFirebaseConfig;
      if (parsed && parsed.apiKey && parsed.projectId) {
        return { config: parsed, isCustom: true };
      }
    }
  } catch (e) {
    console.error('Error loading custom firebase config:', e);
  }
  return { 
    config: {
      ...firebaseConfig,
      type: 'firestore' as const
    }, 
    isCustom: false 
  };
}

function loadSupabaseConfig(): CustomSupabaseConfig {
  try {
    const raw = localStorage.getItem('bioentregas_custom_supabase_config');
    if (raw) {
      const parsed = JSON.parse(raw) as CustomSupabaseConfig;
      if (parsed && parsed.supabaseUrl) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom supabase config:', e);
  }
  return {
    supabaseUrl: 'https://ftfrewjzpbmkfwwyawaa.supabase.co',
    supabaseAnonKey: 'sb_publishable_BwWx9KIA6DdII6IXaaOl6g_C2c64OO0'
  };
}

// ---------------- FIREBASE INITIALIZATION ----------------
const { config: activeConfig, isCustom: isUsingCustomFirebase } = loadFirebaseConfig();
const firebaseApp = initializeApp(activeConfig);

export const auth = getAuth(firebaseApp);
export const isCustomFirebaseActive = isUsingCustomFirebase;
export const activeFirebaseType = activeConfig.type;
export const activeFirebaseProjectId = activeConfig.projectId;
export const activeFirebaseConfigDetails = activeConfig;

// ---------------- SUPABASE INITIALIZATION ----------------
export const activeSupabaseConfig = loadSupabaseConfig();
export const activeSupabaseUrl = activeSupabaseConfig.supabaseUrl;
export const isCustomSupabaseActive = !!localStorage.getItem('bioentregas_custom_supabase_config');

let supabase: SupabaseClient | null = null;
if (activeDBProvider === 'supabase') {
  try {
    // If user provided no key, use a generic JWT placeholder to prevent crashes
    const anonKey = activeSupabaseConfig.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0ZnJld2p6cGJta2Z3d3lhd2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMDAwMDAsImV4cCI6MjA0MDAwMDAwMH0.placeholder';
    supabase = createClient(activeSupabaseConfig.supabaseUrl, anonKey);
  } catch (err) {
    console.error('Erro ao instanciar Supabase Client:', err);
  }
}

// Interfaces for database layer abstraction
export interface IDatabaseService {
  getUserProfile(uid: string): Promise<any | null>;
  saveUserProfile(uid: string, profile: any): Promise<void>;
  subscribeDeliveries(
    role: 'ADMIN' | 'DRIVER',
    name: string,
    email: string,
    onData: (deliveries: Delivery[]) => void,
    onError: (error: any) => void
  ): () => void;
  createDelivery(delivery: Delivery): Promise<void>;
  updateDelivery(deliveryId: string, updatedFields: Partial<Delivery>): Promise<void>;
}

// Interfaces for Authentication layer abstraction
export interface IAuthService {
  onAuthStateChanged(callback: (user: any | null) => void): () => void;
  signOut(): Promise<void>;
  signInWithGoogle(): Promise<any>;
  signInWithEmail(email: string, password: string): Promise<any>;
  signUpWithEmail(email: string, password: string, name: string): Promise<any>;
}

// 1. Implementation using Firestore
class FirestoreService implements IDatabaseService {
  private getDb() {
    const dbId = (activeConfig as any).firestoreDatabaseId || undefined;
    return getFirestore(firebaseApp, dbId);
  }

  async getUserProfile(uid: string): Promise<any | null> {
    try {
      const db = this.getDb();
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const val = docSnap.data();
        localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(val));
        return val;
      }
      return null;
    } catch (e: any) {
      console.warn("Firestore getUserProfile offline/error fallback:", e);
      const cached = localStorage.getItem(`bioentregas_profile_${uid}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (_) {}
      }
      return null;
    }
  }

  async saveUserProfile(uid: string, profile: any): Promise<void> {
    localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(profile));
    try {
      const db = this.getDb();
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, profile);
    } catch (e: any) {
      console.warn("Firestore saveUserProfile backend offline:", e);
    }
  }

  subscribeDeliveries(
    role: 'ADMIN' | 'DRIVER',
    name: string,
    email: string,
    onData: (deliveries: Delivery[]) => void,
    onError: (error: any) => void
  ): () => void {
    const db = this.getDb();
    let q;
    if (role === 'ADMIN') {
      q = collection(db, 'deliveries');
    } else {
      q = query(
        collection(db, 'deliveries'),
        where('assignedDriver', '==', name)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const result: Delivery[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as Delivery);
      });
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(result);
    }, (error) => {
      onError(error);
    });
  }

  async createDelivery(delivery: Delivery): Promise<void> {
    try {
      const db = this.getDb();
      await setDoc(doc(db, 'deliveries', delivery.id), delivery);
    } catch (e: any) {
      console.warn("Firestore createDelivery offline:", e);
    }
  }

  async updateDelivery(deliveryId: string, updatedFields: Partial<Delivery>): Promise<void> {
    try {
      const db = this.getDb();
      await updateDoc(doc(db, 'deliveries', deliveryId), updatedFields as any);
    } catch (e: any) {
      console.warn("Firestore updateDelivery offline:", e);
    }
  }
}

// 2. Implementation using Realtime Database (RTDB)
class RTDBService implements IDatabaseService {
  private getRtdb() {
    return getDatabase(firebaseApp, activeConfig.databaseURL);
  }

  async getUserProfile(uid: string): Promise<any | null> {
    try {
      const rtdb = this.getRtdb();
      const userRef = ref(rtdb, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const val = snapshot.val();
        localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(val));
        return val;
      }
      return null;
    } catch (e: any) {
      console.warn("RTDB getUserProfile offline/error fallback:", e);
      const cached = localStorage.getItem(`bioentregas_profile_${uid}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (_) {}
      }
      return null;
    }
  }

  async saveUserProfile(uid: string, profile: any): Promise<void> {
    localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(profile));
    try {
      const rtdb = this.getRtdb();
      const userRef = ref(rtdb, `users/${uid}`);
      await set(userRef, profile);
    } catch (e: any) {
      console.warn("RTDB saveUserProfile backend offline:", e);
    }
  }

  subscribeDeliveries(
    role: 'ADMIN' | 'DRIVER',
    name: string,
    email: string,
    onData: (deliveries: Delivery[]) => void,
    onError: (error: any) => void
  ): () => void {
    const rtdb = this.getRtdb();
    const deliveriesRef = ref(rtdb, 'deliveries');

    return onValue(deliveriesRef, (snapshot) => {
      const result: Delivery[] = [];
      if (snapshot.exists()) {
        const val = snapshot.val();
        Object.keys(val).forEach((key) => {
          const item = val[key];
          const delivery = { id: key, ...item } as Delivery;
          if (role === 'ADMIN' || delivery.assignedDriver === name) {
            result.push(delivery);
          }
        });
      }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(result);
    }, (error) => {
      onError(error);
    });
  }

  async createDelivery(delivery: Delivery): Promise<void> {
    const rtdb = this.getRtdb();
    const deliveryRef = ref(rtdb, `deliveries/${delivery.id}`);
    await set(deliveryRef, delivery);
  }

  async updateDelivery(deliveryId: string, updatedFields: Partial<Delivery>): Promise<void> {
    const rtdb = this.getRtdb();
    const deliveryRef = ref(rtdb, `deliveries/${deliveryId}`);
    await update(deliveryRef, updatedFields);
  }
}

// 3. Implementation using Supabase
class SupabaseService implements IDatabaseService {
  async getUserProfile(uid: string): Promise<any | null> {
    try {
      const cached = localStorage.getItem(`bioentregas_profile_${uid}`);
      if (!supabase) {
        if (cached) return JSON.parse(cached);
        return null;
      }
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao carregar perfil no Supabase:', error.message);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch (_) {}
        }
        return null;
      }
      if (data) {
        localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(data));
      }
      return data;
    } catch (e) {
      console.error('Supabase Exception (getUserProfile):', e);
      const cached = localStorage.getItem(`bioentregas_profile_${uid}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (_) {}
      }
      return null;
    }
  }

  async saveUserProfile(uid: string, profile: any): Promise<void> {
    localStorage.setItem(`bioentregas_profile_${uid}`, JSON.stringify(profile));
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ id: uid, ...profile });

      if (error) {
        console.error('Erro ao salvar perfil no Supabase:', error.message);
      }
    } catch (e) {
      console.error('Supabase Exception (saveUserProfile):', e);
    }
  }

  subscribeDeliveries(
    role: 'ADMIN' | 'DRIVER',
    name: string,
    email: string,
    onData: (deliveries: Delivery[]) => void,
    onError: (error: any) => void
  ): () => void {
    if (!supabase) {
      onData([]);
      return () => {};
    }

    const fetchDeliveries = async () => {
      try {
        let query = supabase!.from('deliveries').select('*');
        if (role !== 'ADMIN') {
          query = query.eq('assignedDriver', name);
        }
        const { data, error } = await query;
        if (error) {
          console.warn('Erro ao ler entregas do Supabase (A tabela pode não estar criada):', error.message);
          onError(error);
          return;
        }
        if (data) {
          const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onData(sorted);
        }
      } catch (e) {
        console.error('Supabase Exception (fetchDeliveries):', e);
        onError(e);
      }
    };

    fetchDeliveries();

    try {
      // Postgres Changes Realtime
      const channel = supabase
        .channel('deliveries-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
          fetchDeliveries();
        })
        .subscribe();

      return () => {
        supabase!.removeChannel(channel).catch(err => console.error('Error removing channel:', err));
      };
    } catch (err) {
      console.error('Supabase Realtime subscription error:', err);
      return () => {};
    }
  }

  async createDelivery(delivery: Delivery): Promise<void> {
    if (!supabase) throw new Error('Supabase client não instanciado');
    const { error } = await supabase
      .from('deliveries')
      .insert([delivery]);

    if (error) {
      console.error('Supabase insert delivery error:', error.message);
      throw new Error(error.message);
    }
  }

  async updateDelivery(deliveryId: string, updatedFields: Partial<Delivery>): Promise<void> {
    if (!supabase) throw new Error('Supabase client não instanciado');
    const { error } = await supabase
      .from('deliveries')
      .update(updatedFields)
      .eq('id', deliveryId);

    if (error) {
      console.error('Supabase update delivery error:', error.message);
      throw new Error(error.message);
    }
  }
}

// Select active database service
export const dbService: IDatabaseService = activeDBProvider === 'supabase' 
  ? new SupabaseService() 
  : (activeConfig.type === 'rtdb' ? new RTDBService() : new FirestoreService());

// Legacy firestore db reference for backwards compatibility
export const db = getFirestore(firebaseApp, (activeConfig as any).firestoreDatabaseId || undefined);

// ---------------- AUTHENTICATION SERVICES ----------------
class FirebaseAuthService implements IAuthService {
  onAuthStateChanged(callback: (user: any | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
  async signOut(): Promise<void> {
    await signOut(auth);
  }
  async signInWithGoogle(): Promise<any> {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  }
  async signInWithEmail(email: string, password: string): Promise<any> {
    return await signInWithEmailAndPassword(auth, email, password);
  }
  async signUpWithEmail(email: string, password: string, name: string): Promise<any> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential.user;
  }
}

class SupabaseAuthService implements IAuthService {
  onAuthStateChanged(callback: (user: any | null) => void): () => void {
    if (!supabase) {
      callback(null);
      return () => {};
    }

    // Capture initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário Supabase',
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário Supabase',
        });
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async signInWithGoogle(): Promise<any> {
    if (!supabase) throw new Error('Supabase client não instanciado');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  async signInWithEmail(email: string, password: string): Promise<any> {
    if (!supabase) throw new Error('Supabase client não instanciado');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data.user;
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<any> {
    if (!supabase) throw new Error('Supabase client não instanciado');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });
    if (error) throw error;
    return data.user;
  }
}

export const authService: IAuthService = activeDBProvider === 'supabase' ? new SupabaseAuthService() : new FirebaseAuthService();

// --- Firestore/Supabase Hardened Error Transporters ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Database Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
