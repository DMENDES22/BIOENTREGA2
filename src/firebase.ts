import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, set, get, onValue, update } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';
import { Delivery, User } from './types';

// Let's resolve active configuration
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

function loadConfig() {
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
  // Fallback to auto-provisioned Firestore
  return { 
    config: {
      ...firebaseConfig,
      type: 'firestore' as const
    }, 
    isCustom: false 
  };
}

const { config: activeConfig, isCustom: isUsingCustomFirebase } = loadConfig();

// Initialize application
const app = initializeApp(activeConfig);

export const auth = getAuth(app);
export const isCustomFirebaseActive = isUsingCustomFirebase;
export const activeFirebaseType = activeConfig.type;
export const activeFirebaseProjectId = activeConfig.projectId;
export const activeFirebaseConfigDetails = activeConfig;

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

// 1. Implementation using Firestore
class FirestoreService implements IDatabaseService {
  private getDb() {
    const dbId = (activeConfig as any).firestoreDatabaseId || undefined;
    return getFirestore(app, dbId);
  }

  async getUserProfile(uid: string): Promise<any | null> {
    const db = this.getDb();
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  async saveUserProfile(uid: string, profile: any): Promise<void> {
    const db = this.getDb();
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, profile);
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
    const db = this.getDb();
    await setDoc(doc(db, 'deliveries', delivery.id), delivery);
  }

  async updateDelivery(deliveryId: string, updatedFields: Partial<Delivery>): Promise<void> {
    const db = this.getDb();
    await updateDoc(doc(db, 'deliveries', deliveryId), updatedFields as any);
  }
}

// 2. Implementation using Realtime Database (RTDB)
class RTDBService implements IDatabaseService {
  private getRtdb() {
    return getDatabase(app, activeConfig.databaseURL);
  }

  async getUserProfile(uid: string): Promise<any | null> {
    const rtdb = this.getRtdb();
    const userRef = ref(rtdb, `users/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  }

  async saveUserProfile(uid: string, profile: any): Promise<void> {
    const rtdb = this.getRtdb();
    const userRef = ref(rtdb, `users/${uid}`);
    await set(userRef, profile);
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

// Select active service helper
export const dbService: IDatabaseService = activeConfig.type === 'rtdb' ? new RTDBService() : new FirestoreService();

// Export legacy db object for compatibility or validation checks (fallback)
export const db = getFirestore(app, (activeConfig as any).firestoreDatabaseId || undefined);

// --- Firestore Hardened Error Transporters ---
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
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
