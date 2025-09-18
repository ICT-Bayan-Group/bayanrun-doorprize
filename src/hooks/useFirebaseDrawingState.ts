import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
          
          // ENHANCED: Data validation and conversion
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
          
          // ENHANCED: Ensure VIP flags are properly handled
          data.vipProcessedWinners = data.vipProcessedWinners || false;
          data.vipControlActive = data.vipControlActive || false;
          
          console.log('Firebase state updated:', {
            isDrawing: data.isDrawing,
            currentWinners: data.currentWinners?.length || 0,
            vipProcessedWinners: data.vipProcessedWinners,
            vipControlActive: data.vipControlActive
          });
          
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
      console.log('Updating Firebase drawing state:', updates);
      
      const docRef = doc(db, 'drawingState', 'current');
      
      // ENHANCED: Process the updates to handle Date objects and validation
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
      
      // Add timestamp for tracking
      processedUpdates.lastUpdated = new Date();

      await updateDoc(docRef, processedUpdates);
      console.log('Firebase state update successful');
    } catch (err) {
      // If document doesn't exist, create it
      if ((err as any).code === 'not-found') {
        console.log('Creating new Firebase drawing state document');
        const docRef = doc(db, 'drawingState', 'current');
        await setDoc(docRef, { 
          ...defaultDrawingState, 
          ...updates, 
          lastUpdated: new Date() 
        });
      } else {
        console.error('Error updating drawing state:', err);
        setError((err as Error).message);
        throw err;
      }
    }
  }, []);

  const resetDrawingState = useCallback(async () => {
    try {
      console.log('Resetting Firebase drawing state');
      const docRef = doc(db, 'drawingState', 'current');
      await setDoc(docRef, { 
        ...defaultDrawingState, 
        lastUpdated: new Date() 
      });
      
      // Clear localStorage VIP flags
      localStorage.removeItem('vipProcessedWinners');
      localStorage.removeItem('vipDrawSession');
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