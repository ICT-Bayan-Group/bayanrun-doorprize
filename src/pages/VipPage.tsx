import React, { useState, useEffect, useCallback } from 'react';
import { motion} from 'framer-motion';
import { Square, Zap, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { useFirebaseDrawingState } from '../hooks/useFirebaseDrawingState';
import { Participant, Winner, Prize, AppSettings } from '../types';

const VipPage: React.FC = () => {
  // Firebase hooks
  const participantsHook = useFirestore<Participant>('participants', 'addedAt');
  const prizesHook = useFirestore<Prize>('prizes', 'createdAt');
  const winnersHook = useFirestore<Winner>('winners', 'wonAt');
  const settingsHook = useFirestore<AppSettings & { id: string }>('settings');
  const { drawingState, updateDrawingState } = useFirebaseDrawingState();

  // Extract data
  const participants = participantsHook.data;
  const prizes = prizesHook.data;
  const settings = settingsHook.data[0] || {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    animationType: 'wheel',
    soundEnabled: true,
    backgroundMusic: false,
    multiDrawCount: 10
  };

  // Local state
  const [isDrawing, setIsDrawing] = useState(drawingState.isDrawing || false);
  const [predeterminedWinners, setPredeterminedWinners] = useState<Winner[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(drawingState.selectedPrizeId || null);
  const [drawingPhase, setDrawingPhase] = useState<'ready' | 'spinning'>('ready');
  
  // NEW: VIP control state management
  const [vipControlActive, setVipControlActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'generating' | 'saving' | 'complete' | 'error'>('idle');
  const [lastDrawSession, setLastDrawSession] = useState<string | null>(null);

  // Sync with Firebase state
  useEffect(() => {
    setIsDrawing(drawingState.isDrawing || false);
    if (drawingState.predeterminedWinners) {
      setPredeterminedWinners(drawingState.predeterminedWinners);
    }
    if (drawingState.selectedPrizeId) {
      setSelectedPrizeId(drawingState.selectedPrizeId);
    }
    
    // Update phase based on drawing state
    if (!drawingState.isDrawing) {
      setDrawingPhase('ready');
      setVipControlActive(false);
      setIsProcessing(false);
      setProcessingStatus('idle');
    } else if (drawingState.shouldStartSpinning) {
      setDrawingPhase('spinning');
    }
    
    // Check if VIP control is active
    const vipProcessed = drawingState.vipProcessedWinners || false;
    setVipControlActive(vipProcessed);
  }, [drawingState]);

  // Auto-select first available prize only if none selected
  useEffect(() => {
    if (!selectedPrizeId && prizes.length > 0) {
      const availablePrize = prizes.find(prize => prize.remainingQuota > 0);
      if (availablePrize) {
        setSelectedPrizeId(availablePrize.id);
        // Update Firebase with selected prize
        updateDrawingState({
          selectedPrizeId: availablePrize.id
        });
      }
    }
  }, [prizes, selectedPrizeId]);

  const selectedPrize = React.useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Calculate available participants
  const availableParticipants = React.useMemo(() => {
    const currentWinners = drawingState.currentWinners || [];
    const winnerNames = currentWinners.map(winner => winner.name);
    return participants.filter(participant => !winnerNames.includes(participant.name));
  }, [participants, drawingState.currentWinners]);

  // Generate winners function
  const generateWinners = useCallback((): Winner[] => {
    if (!selectedPrize || availableParticipants.length === 0) return [];

    const drawCount = Math.min(selectedPrize.remainingQuota, availableParticipants.length);
    const shuffledParticipants = [...availableParticipants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffledParticipants.slice(0, drawCount);

    // Generate unique session ID for this draw
    const sessionId = `vip-${selectedPrize.id}-${Date.now()}`;
    setLastDrawSession(sessionId);
    return selectedParticipants.map((participant, index) => ({
      id: `${participant.id}-${Date.now()}-${index}`,
      name: participant.name,
      wonAt: new Date(),
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      drawSession: sessionId
    }));
  }, [selectedPrize, availableParticipants]);

  // NEW: Enhanced database operations with conflict prevention
  const saveWinnersToDatabase = useCallback(async (winners: Winner[]) => {
    if (winners.length === 0) return false;
    
    try {
      setProcessingStatus('saving');
      console.log('VIP: Saving winners to database:', winners);
      
      // Check for existing winners with same session to prevent duplicates
      const existingWinners = winnersHook.data.filter(w => 
        w.drawSession === lastDrawSession
      );
      
      if (existingWinners.length > 0) {
        console.log('VIP: Winners already exist for this session, skipping save');
        return true;
      }
      
      // Save winners one by one with delay to prevent race conditions
      for (const winner of winners) {
        await winnersHook.add(winner);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
      
      console.log('VIP: Successfully saved all winners');
      return true;
    } catch (error) {
      console.error('VIP: Error saving winners:', error);
      setProcessingStatus('error');
      return false;
    }
  }, [winnersHook, lastDrawSession]);
  
  // NEW: Enhanced prize quota update with conflict prevention
  const updatePrizeQuota = useCallback(async (prize: Prize, winnersCount: number) => {
    try {
      // Get fresh prize data to prevent stale updates
      const currentPrize = prizes.find(p => p.id === prize.id);
      if (!currentPrize) return false;
      
      const newQuota = Math.max(0, currentPrize.remainingQuota - winnersCount);
      
      await prizesHook.update(prize.id, {
        remainingQuota: newQuota
      });
      
      console.log('VIP: Updated prize quota:', { prizeId: prize.id, newQuota });
      
      // Clear selected prize if quota exhausted
      if (newQuota <= 0) {
        setSelectedPrizeId(null);
        await updateDrawingState({
          selectedPrizeId: null
        });
      }
      
      return true;
    } catch (error) {
      console.error('VIP: Error updating prize quota:', error);
      return false;
    }
  }, [prizes, prizesHook, updateDrawingState]);
  // Main button handler - handles all phases
  const handleMainButton = useCallback(async () => {
    if (isProcessing) {
      console.log('VIP: Already processing, ignoring button click');
      return;
    }
    
    if (drawingPhase === 'ready') {
      // Start Drawing and Spinning Phase (combined)
      if (!selectedPrize || availableParticipants.length === 0) return;

      setIsProcessing(true);
      setProcessingStatus('generating');
      setVipControlActive(true);
      
      console.log('VIP: Starting draw with prize:', selectedPrize);
      
      // Generate winners immediately
      const finalWinners = generateWinners();
      setPredeterminedWinners(finalWinners);
      
      console.log('VIP: Pre-determined winners:', finalWinners);
      
      // FIXED: Update Firebase state with VIP control flags
      await updateDrawingState({
        isDrawing: true,
        currentWinners: [],
        showConfetti: false,
        shouldStartSpinning: true, // Start spinning immediately
        showWinnerDisplay: false,
        selectedPrizeName: selectedPrize?.name,
        selectedPrizeImage: selectedPrize?.image,
        selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
        selectedPrizeId: selectedPrize?.id,
        participants: participants,
        drawStartTime: Date.now(),
        finalWinners: finalWinners,
        predeterminedWinners: finalWinners,
        shouldStartSlowdown: false,
        shouldResetToReady: false,
        vipProcessedWinners: false, // Will be set to true after processing
        vipControlActive: true // NEW: Mark VIP control as active
      });
      
      setIsDrawing(true);
      setDrawingPhase('spinning'); // Skip to spinning phase directly
      setProcessingStatus('complete');

    } else if (drawingPhase === 'spinning') {
      // Stop Drawing Phase
      if (predeterminedWinners.length === 0) return;

      setIsProcessing(true);
      setProcessingStatus('saving');
      
      console.log('VIP: Starting natural slowdown to pre-determined winners:', predeterminedWinners);
      
      // FIXED: Start natural slowdown process with VIP flags
      await updateDrawingState({
        shouldStartSlowdown: true,
        shouldStartSpinning: true,
        predeterminedWinners: predeterminedWinners,
        vipControlActive: true // Maintain VIP control
      });
      
   // FIXED: After 3.5 seconds, finalize results with proper sequencing
setTimeout(async () => {
  console.log('VIP: Finalizing results after natural slowdown');
  
  // Step 1: Save winners to database first
  const saveSuccess = await saveWinnersToDatabase(predeterminedWinners);
  if (!saveSuccess) {
    setProcessingStatus('error');
    setIsProcessing(false);
    return;
  }
  
  // Step 2: Update prize quota
  if (selectedPrize) {
    await updatePrizeQuota(selectedPrize, predeterminedWinners.length);
  }
  
  // Step 3: Update Firebase state to show results
  await updateDrawingState({
    isDrawing: false,
    shouldStartSpinning: false,
    shouldStartSlowdown: false,
    showWinnerDisplay: true,
    finalWinners: predeterminedWinners,
    currentWinners: predeterminedWinners,
    showConfetti: true,
    vipProcessedWinners: true,
    vipControlActive: true
  });
  
  // Step 4: Set localStorage flag for admin detection
  localStorage.setItem('vipProcessedWinners', 'true');
  localStorage.setItem('vipDrawSession', lastDrawSession || '');
  
  console.log('VIP: All processing complete, winners saved and displayed');
  
  setProcessingStatus('complete');
  setIsDrawing(false);
  setPredeterminedWinners([]);
  setDrawingPhase('ready');
  setIsProcessing(false);
  
}, 3500);
    }
  }, [drawingPhase, selectedPrize, availableParticipants, predeterminedWinners, generateWinners, updateDrawingState, participants, saveWinnersToDatabase, updatePrizeQuota, lastDrawSession, isProcessing]);

  // Button configuration based on phase
  const getButtonConfig = () => {
    if (isProcessing) {
      return {
        text: processingStatus === 'generating' ? 'GENERATING...' : 
              processingStatus === 'saving' ? 'SAVING...' : 'PROCESSING...',
        colors: 'from-yellow-500 to-orange-600',
        disabled: true,
        glowColor: 'from-yellow-400/20 to-orange-500/20'
      };
    }
    
    switch (drawingPhase) {
      case 'ready':
        const canStart = selectedPrize && availableParticipants.length > 0;
        return {
          text: 'START DOORPIZE',
          colors: canStart 
            ? 'from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500'
            : 'from-gray-600 to-gray-700',
          disabled: !canStart,
          glowColor: 'from-blue-400/20 to-cyan-500/20'
        };
      case 'spinning':
        return {
          text: 'STOP',
          colors: 'from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500',
          disabled: false,
          glowColor: 'from-red-400/20 to-pink-500/20'
        };
      default:
        return {
          text: 'START DOORPRIZE',
          colors: 'from-gray-600 to-gray-700',
          disabled: true,
          glowColor: 'from-gray-400/20 to-gray-500/20'
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 to-slate-900 relative overflow-hidden">
      {/* VIP Control Status Indicator */}
      {vipControlActive && (
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/90 backdrop-blur-sm text-white rounded-full shadow-lg">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">VIP Control Active</span>
            {processingStatus === 'complete' && (
              <CheckCircle className="w-4 h-4 text-green-300" />
            )}
            {processingStatus === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-300" />
            )}
          </div>
        </div>
      )}
      
      {/* Processing Status */}
      {isProcessing && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 px-6 py-3 bg-black/70 backdrop-blur-sm text-white rounded-lg shadow-xl">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">
              {processingStatus === 'generating' && 'Generating Winners...'}
              {processingStatus === 'saving' && 'Saving to Database...'}
              {processingStatus === 'complete' && 'Processing Complete!'}
              {processingStatus === 'error' && 'Error Occurred!'}
            </span>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.div className="inline-flex items-center justify-center bg-transparent object-contain">
             {settings.eventLogo && (
              <img
                src={settings.eventLogo}
                alt="Event Logo"
                className="h-32 w-auto"
              />
            )}
          </motion.div>
        </motion.div>

        {/* Single Large Control Button */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="flex justify-center"
        >
          <motion.button
            onClick={handleMainButton}
            disabled={buttonConfig.disabled}
            whileHover={{ scale: buttonConfig.disabled ? 1 : 1.05 }}
            whileTap={{ scale: buttonConfig.disabled ? 1 : 0.95 }}
            className={`group relative px-40 py-36 rounded-3xl font-bold text-8xl transition-all duration-300 shadow-2xl ${
              buttonConfig.disabled
                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                : `bg-gradient-to-r ${buttonConfig.colors} text-white cursor-pointer`
            }`}
          >
            <div className="flex items-center gap-6">
              <motion.div
                animate={drawingPhase === 'spinning' || isProcessing ? { rotate: 360 } : {}}
                transition={drawingPhase === 'spinning' || isProcessing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
              >
              </motion.div>
              <span>{buttonConfig.text}</span>
            </div>
            
            {!buttonConfig.disabled && (
              <motion.div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${buttonConfig.glowColor}`}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.button>
        </motion.div>
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-0 right-0 text-center"
        >
          <p className="text-white/50 text-sm">
            VIP Control Panel • Bayan Run 2025
          </p>
          {vipControlActive && (
            <p className="text-purple-300 text-xs mt-1">
              VIP Control Mode Active • Session: {lastDrawSession?.slice(-8)}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VipPage;