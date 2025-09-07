import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Winner, Participant } from '../types';

interface DrawingState {
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
  selectedPrizeName?: string;
  selectedPrizeImage?: string;
  selectedPrizeQuota: number;
  participants: Participant[];
  drawStartTime?: number;
  finalWinners?: Winner[];
  shouldStartSpinning?: boolean;
  showWinnerDisplay?: boolean;
  shouldResetToReady?: boolean;
}

const defaultDrawingState: DrawingState = {
  isDrawing: false,
  currentWinners: [],
  showConfetti: false,
  selectedPrizeQuota: 0,
  participants: [],
  shouldStartSpinning: false,
  showWinnerDisplay: false
};

export function useFirebaseDrawingState() {
  const [drawingState, setDrawingState] = useState<DrawingState>(defaultDrawingState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'drawingState', 'current');
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DrawingState;
          // Convert any Timestamp objects back to Date objects
          if (data.currentWinners) {
            data.currentWinners = data.currentWinners.map(winner => ({
              ...winner,
              wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
            }));
          }
          if (data.finalWinners) {
            data.finalWinners = data.finalWinners.map(winner => ({
              ...winner,
              wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
            }));
          }
          if (data.participants) {
            data.participants = data.participants.map(participant => ({
              ...participant,
              addedAt: participant.addedAt instanceof Date ? participant.addedAt : new Date(participant.addedAt)
            }));
          }
          setDrawingState(data);
        } else {
          setDrawingState(defaultDrawingState);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching drawing state:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateDrawingState = useCallback(async (updates: Partial<DrawingState>) => {
    try {
      const docRef = doc(db, 'drawingState', 'current');
      
      // Process the updates to handle Date objects
      const processedUpdates = { ...updates };
      if (processedUpdates.currentWinners) {
        processedUpdates.currentWinners = processedUpdates.currentWinners.map(winner => ({
          ...winner,
          wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
        }));
      }
      if (processedUpdates.finalWinners) {
        processedUpdates.finalWinners = processedUpdates.finalWinners.map(winner => ({
          ...winner,
          wonAt: winner.wonAt instanceof Date ? winner.wonAt : new Date(winner.wonAt)
        }));
      }
      if (processedUpdates.participants) {
        processedUpdates.participants = processedUpdates.participants.map(participant => ({
          ...participant,
          addedAt: participant.addedAt instanceof Date ? participant.addedAt : new Date(participant.addedAt)
        }));
      }

      await updateDoc(docRef, processedUpdates);
    } catch (err) {
      // If document doesn't exist, create it
      if ((err as any).code === 'not-found') {
        const docRef = doc(db, 'drawingState', 'current');
        await setDoc(docRef, { ...defaultDrawingState, ...updates });
      } else {
        console.error('Error updating drawing state:', err);
        setError((err as Error).message);
        throw err;
      }
    }
  }, []);

  const resetDrawingState = useCallback(async () => {
    try {
      const docRef = doc(db, 'drawingState', 'current');
      await setDoc(docRef, defaultDrawingState);
    } catch (err) {
      console.error('Error resetting drawing state:', err);
      setError((err as Error).message);
      throw err;
    }
  }, []);

  return {
    drawingState,
    loading,
    error,
    updateDrawingState,
    resetDrawingState
  };
}