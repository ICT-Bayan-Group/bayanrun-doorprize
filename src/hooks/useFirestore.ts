import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  addDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreHookResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  add: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMultiple: (ids: string[]) => Promise<void>;
  clear: () => Promise<void>;
}

export function useFirestore<T extends { id: string }>(
  collectionName: string,
  orderByField?: string
): FirestoreHookResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    const q = orderByField 
      ? query(collectionRef, orderBy(orderByField, 'desc'))
      : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          const docData = doc.data();
          // Convert Firestore Timestamps to Date objects
          const processedData = { ...docData };
          Object.keys(processedData).forEach(key => {
            if (processedData[key] instanceof Timestamp) {
              processedData[key] = processedData[key].toDate();
            }
          });
          items.push({ id: doc.id, ...processedData } as T);
        });
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderByField]);

  const add = useCallback(async (item: Omit<T, 'id'>) => {
    try {
      const collectionRef = collection(db, collectionName);
      // Convert Date objects to Firestore Timestamps
      const processedItem = { ...item };
      Object.keys(processedItem).forEach(key => {
        if (processedItem[key] instanceof Date) {
          processedItem[key] = Timestamp.fromDate(processedItem[key]);
        }
      });
      await addDoc(collectionRef, processedItem);
    } catch (err) {
      console.error(`Error adding to ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      // Convert Date objects to Firestore Timestamps
      const processedUpdates = { ...updates };
      Object.keys(processedUpdates).forEach(key => {
        if (processedUpdates[key] instanceof Date) {
          processedUpdates[key] = Timestamp.fromDate(processedUpdates[key]);
        }
      });
      await updateDoc(docRef, processedUpdates);
    } catch (err) {
      console.error(`Error updating ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const remove = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`Error removing from ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const removeMultiple = useCallback(async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      console.error(`Error removing multiple from ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const clear = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      console.error(`Error clearing ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName, data]);

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    removeMultiple,
    clear
  };
}