import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Attendee } from '../types';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without this line
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Clean undefined values to prevent Firestore serialization errors
function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline or connecting.");
    }
    return false;
  }
}

// Subscribe to attendees collection with real-time updates for all devices
export function subscribeToAttendees(
  onData: (attendees: Attendee[]) => void,
  onError?: (err: any) => void
) {
  const path = 'attendees';
  const collRef = collection(db, path);

  return onSnapshot(
    collRef,
    (snapshot) => {
      const items: Attendee[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Attendee);
      });

      // Sort with newest registrations first
      items.sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
      onData(items);
    },
    (error) => {
      console.warn('Real-time attendees sync warning:', error);
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Save or create an attendee
export async function saveAttendeeToCloud(attendee: Attendee): Promise<void> {
  const path = `attendees/${attendee.id}`;
  try {
    const sanitized = sanitizeForFirestore(attendee);
    await setDoc(doc(db, 'attendees', attendee.id), sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete an attendee
export async function deleteAttendeeFromCloud(attendeeId: string): Promise<void> {
  const path = `attendees/${attendeeId}`;
  try {
    await deleteDoc(doc(db, 'attendees', attendeeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Seed initial attendees if Firestore is completely fresh
export async function seedInitialAttendeesIfEmpty(fallbackList: Attendee[]): Promise<void> {
  const path = 'attendees';
  try {
    const existing = await getDocs(collection(db, path));
    if (existing.empty && fallbackList.length > 0) {
      const batch = writeBatch(db);
      for (const item of fallbackList) {
        const ref = doc(db, 'attendees', item.id);
        batch.set(ref, sanitizeForFirestore(item));
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn('Could not seed initial data to cloud:', error);
  }
}

// Shared Logo Settings across devices
export function subscribeToCustomLogo(onUpdate: (logoBase64: string | null) => void) {
  const path = 'settings/logo';
  return onSnapshot(
    doc(db, 'settings', 'logo'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data()?.value || null);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('Logo sync warning:', error);
    }
  );
}

export async function saveCustomLogoToCloud(logoBase64: string | null): Promise<void> {
  const path = 'settings/logo';
  try {
    if (logoBase64) {
      await setDoc(doc(db, 'settings', 'logo'), { key: 'logo', value: logoBase64 }, { merge: true });
    } else {
      await deleteDoc(doc(db, 'settings', 'logo'));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
