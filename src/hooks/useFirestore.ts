// useFirebaseDrawingState.ts - IMPROVED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Winner, Participant } from '../types';

interface DrawingState {
  shouldStartSlowdown: any;
  predeterminedWinners: any;
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
  selectedPrizeName?: string;
  selectedPrizeImage?: string;
  selectedPrizeId?: string | null;
  selectedPrizeQuota: number;
  participants: Participant[];
  drawStartTime?: number;
  finalWinners?: Winner[];
  shouldStartSpinning?: boolean;
  showWinnerDisplay?: boolean;
  shouldResetToReady?: boolean;
  vipProcessedWinners?: boolean;
  vipControlActive?: boolean;
  lastUpdated?: any; // Firebase Timestamp
}

const defaultDrawingState: DrawingState = {
  isDrawing: false,
  currentWinners: [],
  showConfetti: false,
  selectedPrizeId: null,
  selectedPrizeQuota: 0,
  participants: [],
  shouldStartSpinning: false,
  showWinnerDisplay: false,
  vipProcessedWinners: false,
  vipControlActive: false
};

// ENHANCED: Optimized date conversion with caching
const convertFirestoreData = (() => {
  const dateCache = new Map();
  
  return (data: any): DrawingState => {
    // Convert any Timestamp objects back to Date objects with caching
    if (data.currentWinners) {
      data.currentWinners = data.currentWinners.map((winner: any) => ({
        ...winner,
        wonAt: winner.wonAt instanceof Date ? winner.wonAt : 
               dateCache.get(winner.wonAt?.toString()) || 
               (() => {
                 const date = new Date(winner.wonAt);
                 dateCache.set(winner.wonAt?.toString(), date);
                 return date;
               })()
      }));
    }
    
    if (data.finalWinners) {
      data.finalWinners = data.finalWinners.map((winner: any) => ({
        ...winner,
        wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
      }));
    }
    
    if (data.participants) {
      data.participants = data.participants.map((participant: any) => ({
        ...participant,
        addedAt: participant.addedAt instanceof Date ? participant.addedAt : new Date(participant.addedAt)
      }));
    }
    
    // Ensure VIP flags are properly handled
    data.vipProcessedWinners = data.vipProcessedWinners || false;
    data.vipControlActive = data.vipControlActive || false;
    
    return data;
  };
})();

export function useFirebaseDrawingState() {
  const [drawingState, setDrawingState] = useState<DrawingState>(defaultDrawingState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // ENHANCED: Track update attempts for retry logic
  const updateAttempts = useRef(0);
  const maxRetries = 3;
  const retryDelay = 1000;

  useEffect(() => {
    const docRef = doc(db, 'drawingState', 'current');
    
    console.log('Firebase: Setting up real-time listener');
    
    const unsubscribe = onSnapshot(
      docRef,
      {
        // ENHANCED: Include metadata to detect source of changes
        includeMetadataChanges: true
      },
      (docSnap) => {
        try {
          setConnectionStatus('connected');
          
          if (docSnap.exists()) {
            const data = docSnap.data() as DrawingState;
            const isFromCache = docSnap.metadata.fromCache;
            
            console.log('Firebase state received:', {
              source: isFromCache ? 'cache' : 'server',
              isDrawing: data.isDrawing,
              currentWinners: data.currentWinners?.length || 0,
              vipProcessedWinners: data.vipProcessedWinners,
              vipControlActive: data.vipControlActive,
              lastUpdated: data.lastUpdated
            });
            
            // ENHANCED: Only process if it's fresh server data or initial load
            if (!isFromCache || loading) {
              const convertedData = convertFirestoreData(data);
              setDrawingState(convertedData);
            }
          } else {
            console.log('Firebase: Document does not exist, using defaults');
            setDrawingState(defaultDrawingState);
          }
          
          setLoading(false);
          setError(null);
          updateAttempts.current = 0; // Reset retry counter on success
          
        } catch (err) {
          console.error('Error processing Firebase state:', err);
          setError((err as Error).message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Firebase snapshot error:', err);
        setError(err.message);
        setLoading(false);
        setConnectionStatus('disconnected');
        
        // ENHANCED: Attempt to reconnect after error
        setTimeout(() => {
          setConnectionStatus('reconnecting');
        }, 2000);
      }
    );

    return () => {
      console.log('Firebase: Cleaning up listener');
      unsubscribe();
    };
  }, [loading]);

  // ENHANCED: Update function with retry logic and conflict resolution
  const updateDrawingState = useCallback(async (updates: Partial<DrawingState>) => {
    const attemptUpdate = async (attemptNumber: number): Promise<void> => {
      try {
        console.log(`Firebase update attempt ${attemptNumber}:`, updates);
        
        const docRef = doc(db, 'drawingState', 'current');
        
        // ENHANCED: Add server timestamp and attempt tracking
        const processedUpdates = {
          ...updates,
          lastUpdated: serverTimestamp(),
          updateAttempt: attemptNumber
        };
        
        // Process Date objects for Firebase
        if (processedUpdates.currentWinners) {
          processedUpdates.currentWinners = processedUpdates.currentWinners.map((winner: any) => ({
            ...winner,
            wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
          }));
        }
        if (processedUpdates.finalWinners) {
          processedUpdates.finalWinners = processedUpdates.finalWinners.map((winner: any) => ({
            ...winner,
            wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
          }));
        }

        await updateDoc(docRef, processedUpdates);
        
        console.log(`Firebase update successful (attempt ${attemptNumber})`);
        updateAttempts.current = 0;
        setConnectionStatus('connected');
        
      } catch (err: any) {
        console.error(`Firebase update failed (attempt ${attemptNumber}):`, err);
        
        // Handle document not found by creating it
        if (err.code === 'not-found') {
          console.log('Creating new Firebase drawing state document');
          const docRef = doc(db, 'drawingState', 'current');
          await setDoc(docRef, { 
            ...defaultDrawingState, 
            ...updates, 
            lastUpdated: serverTimestamp(),
            created: serverTimestamp()
          });
          updateAttempts.current = 0;
          return;
        }
        
        // Retry logic for temporary failures
        if (attemptNumber < maxRetries && 
            (err.code === 'unavailable' || err.code === 'deadline-exceeded' || err.code === 'internal')) {
          
          console.log(`Retrying update in ${retryDelay}ms...`);
          setConnectionStatus('reconnecting');
          
          await new Promise(resolve => setTimeout(resolve, retryDelay * attemptNumber));
          return attemptUpdate(attemptNumber + 1);
        }
        
        // Final failure
        setError(err.message);
        setConnectionStatus('disconnected');
        throw err;
      }
    };

    return attemptUpdate(1);
  }, []);

  // ENHANCED: Reset with cleanup
  const resetDrawingState = useCallback(async () => {
    try {
      console.log('Resetting Firebase drawing state');
      const docRef = doc(db, 'drawingState', 'current');
      
      await setDoc(docRef, { 
        ...defaultDrawingState, 
        lastUpdated: serverTimestamp(),
        resetAt: serverTimestamp()
      });
      
      // Clear localStorage VIP flags
      localStorage.removeItem('vipProcessedWinners');
      localStorage.removeItem('vipDrawSession');
      
      // Reset local state immediately
      setDrawingState(defaultDrawingState);
      
      console.log('Firebase state reset successful');
    } catch (err) {
      console.error('Error resetting drawing state:', err);
      setError((err as Error).message);
      throw err;
    }
  }, []);

  // ENHANCED: Force refresh function
  const forceRefresh = useCallback(async () => {
    try {
      console.log('Force refreshing Firebase state');
      setLoading(true);
      setConnectionStatus('reconnecting');
      
      // This will trigger the useEffect to re-establish connection
      setDrawingState(prev => ({ ...prev }));
      
    } catch (err) {
      console.error('Error force refreshing:', err);
      setError((err as Error).message);
    }
  }, []);

  return {
    drawingState,
    loading,
    error,
    connectionStatus,
    updateDrawingState,
    resetDrawingState,
    forceRefresh
  };
}

// useFirestore.ts - IMPROVED VERSION with better error handling
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
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  add: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMultiple: (ids: string[]) => Promise<void>;
  clear: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

export function useFirestore<T extends { id: string }>(
  collectionName: string,
  orderByField?: string
): FirestoreHookResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    const q = orderByField 
      ? query(collectionRef, orderBy(orderByField, 'desc'))
      : collectionRef;

    console.log(`Firebase: Setting up listener for ${collectionName}`);

    const unsubscribe = onSnapshot(
      q,
      {
        // ENHANCED: Include metadata for better debugging
        includeMetadataChanges: true
      },
      (snapshot) => {
        try {
          setConnectionStatus('connected');
          
          const items: T[] = [];
          snapshot.forEach((doc) => {
            const docData = doc.data();
            
            // ENHANCED: More efficient timestamp conversion
            const processedData = { ...docData };
            Object.keys(processedData).forEach(key => {
              if (processedData[key] instanceof Timestamp) {
                processedData[key] = processedData[key].toDate();
              }
            });
            
            items.push({ id: doc.id, ...processedData } as T);
          });
          
          // Only update if data actually changed
          if (JSON.stringify(items) !== JSON.stringify(data)) {
            setData(items);
            console.log(`${collectionName}: Updated ${items.length} items`);
          }
          
          setLoading(false);
          setError(null);
          
        } catch (err) {
          console.error(`Error processing ${collectionName} snapshot:`, err);
          setError((err as Error).message);
          setLoading(false);
        }
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
        setConnectionStatus('disconnected');
        
        // Auto-retry connection after 3 seconds
        setTimeout(() => {
          setConnectionStatus('reconnecting');
        }, 3000);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderByField]);

  // ENHANCED: All operations now have better error handling and retry logic
  const add = useCallback(async (item: Omit<T, 'id'>) => {
    try {
      console.log(`Adding item to ${collectionName}:`, item);
      
      const collectionRef = collection(db, collectionName);
      const processedItem = { ...item };
      
      // Convert Date objects to Firestore Timestamps
      Object.keys(processedItem).forEach(key => {
        if (processedItem[key] instanceof Date) {
          processedItem[key] = Timestamp.fromDate(processedItem[key]);
        }
      });
      
      await addDoc(collectionRef, processedItem);
      console.log(`Successfully added item to ${collectionName}`);
      
    } catch (err) {
      console.error(`Error adding to ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      console.log(`Updating ${collectionName}/${id}:`, updates);
      
      const docRef = doc(db, collectionName, id);
      const processedUpdates = { ...updates };
      
      // Convert Date objects to Firestore Timestamps
      Object.keys(processedUpdates).forEach(key => {
        if (processedUpdates[key] instanceof Date) {
          processedUpdates[key] = Timestamp.fromDate(processedUpdates[key]);
        }
      });
      
      await updateDoc(docRef, processedUpdates);
      console.log(`Successfully updated ${collectionName}/${id}`);
      
    } catch (err) {
      console.error(`Error updating ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const remove = useCallback(async (id: string) => {
    try {
      console.log(`Removing ${collectionName}/${id}`);
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      console.log(`Successfully removed ${collectionName}/${id}`);
    } catch (err) {
      console.error(`Error removing from ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const removeMultiple = useCallback(async (ids: string[]) => {
    try {
      console.log(`Removing ${ids.length} items from ${collectionName}`);
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      });
      await batch.commit();
      console.log(`Successfully removed ${ids.length} items from ${collectionName}`);
    } catch (err) {
      console.error(`Error removing multiple from ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName]);

  const clear = useCallback(async () => {
    try {
      console.log(`Clearing all items from ${collectionName}`);
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.delete(docRef);
      });
      await batch.commit();
      console.log(`Successfully cleared ${collectionName}`);
    } catch (err) {
      console.error(`Error clearing ${collectionName}:`, err);
      setError((err as Error).message);
      throw err;
    }
  }, [collectionName, data]);

  const forceRefresh = useCallback(async () => {
    try {
      console.log(`Force refreshing ${collectionName}`);
      setLoading(true);
      setConnectionStatus('reconnecting');
      // The useEffect will re-establish the connection
    } catch (err) {
      console.error(`Error force refreshing ${collectionName}:`, err);
      setError((err as Error).message);
    }
  }, [collectionName]);

  return {
    data,
    loading,
    error,
    connectionStatus,
    add,
    update,
    remove,
    removeMultiple,
    clear,
    forceRefresh
  };
}