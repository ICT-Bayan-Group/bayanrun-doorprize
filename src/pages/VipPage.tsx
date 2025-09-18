import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Square, Zap, Shield, CheckCircle, AlertTriangle, Play, Clock, Target, Trophy, Users, Gift } from 'lucide-react';
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
  const [drawingPhase, setDrawingPhase] = useState<'ready' | 'generated' | 'spinning' | 'stopping'>('ready');
  const [drawingDuration, setDrawingDuration] = useState(0);
  
  // VIP control state management - Enhanced from MultiDrawingArea
  const [vipControlActive, setVipControlActive] = useState(false);
  const [vipControlStatus, setVipControlStatus] = useState<'idle' | 'active' | 'processing' | 'completed'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'generating' | 'spinning' | 'stopping' | 'saving' | 'complete' | 'error'>('idle');
  const [lastDrawSession, setLastDrawSession] = useState<string | null>(null);

  // Enhanced: Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Enhanced: Calculate available participants (excluding current winners)
  const availableParticipants = useMemo(() => {
    const currentWinners = drawingState.currentWinners || [];
    const winnerNames = currentWinners.map(winner => winner.name);
    return participants.filter(participant => !winnerNames.includes(participant.name));
  }, [participants, drawingState.currentWinners]);

  // Enhanced: Calculate draw count
  const drawCount = selectedPrize
    ? Math.min(selectedPrize.remainingQuota, availableParticipants.length)
    : Math.min(settings.multiDrawCount, availableParticipants.length);

  // Enhanced: Monitor VIP control activity from Firebase state and localStorage
  useEffect(() => {
    const checkVipControl = () => {
      const firebaseVipActive = updateDrawingState && typeof updateDrawingState === 'function';
      const localStorageVipProcessed = localStorage.getItem('vipProcessedWinners') === 'true';
      const vipSession = localStorage.getItem('vipDrawSession');
      
      if (localStorageVipProcessed || vipSession) {
        setVipControlActive(true);
        setVipControlStatus('completed');
      } else if (firebaseVipActive) {
        const vipActive = (drawingState.currentWinners?.length || 0) > 0 && isDrawing;
        if (vipActive) {
          setVipControlActive(true);
          setVipControlStatus('active');
        }
      } else {
        setVipControlActive(false);
        setVipControlStatus('idle');
      }
    };
    
    checkVipControl();
    const interval = setInterval(checkVipControl, 1000);
    return () => clearInterval(interval);
  }, [updateDrawingState, drawingState.currentWinners, isDrawing]);

  // Enhanced: Timer for drawing duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDrawing) {
      interval = setInterval(() => {
        setDrawingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDrawingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isDrawing]);

  // Sync with Firebase state
  useEffect(() => {
    setIsDrawing(drawingState.isDrawing || false);
    if (drawingState.predeterminedWinners) {
      setPredeterminedWinners(drawingState.predeterminedWinners);
    }
    if (drawingState.selectedPrizeId) {
      setSelectedPrizeId(drawingState.selectedPrizeId);
    }
    
    // Enhanced phase management
    if (!drawingState.isDrawing) {
      setDrawingPhase('ready');
      setVipControlActive(false);
      setIsProcessing(false);
      setProcessingStatus('idle');
    } else if (drawingState.predeterminedWinners?.length > 0 && !drawingState.shouldStartSpinning) {
      setDrawingPhase('generated');
    } else if (drawingState.shouldStartSpinning && !drawingState.shouldStartSlowdown) {
      setDrawingPhase('spinning');
    } else if (drawingState.shouldStartSlowdown) {
      setDrawingPhase('stopping');
    }
    
    const vipProcessed = drawingState.vipProcessedWinners || false;
    setVipControlActive(vipProcessed || drawingState.vipControlActive || false);
  }, [drawingState]);

  // Auto-select first available prize
  useEffect(() => {
    if (!selectedPrizeId && prizes.length > 0) {
      const availablePrize = prizes.find(prize => prize.remainingQuota > 0);
      if (availablePrize) {
        setSelectedPrizeId(availablePrize.id);
        updateDrawingState({
          selectedPrizeId: availablePrize.id
        });
      }
    }
  }, [prizes, selectedPrizeId]);

  // Enhanced: Draw validation from MultiDrawingArea
  const validateDraw = useCallback((): { isValid: boolean; message?: string } => {
    if (!selectedPrize) {
      return { isValid: false, message: 'Please select a prize before starting the draw.' };
    }
    if (selectedPrize.remainingQuota === 0) {
      return { isValid: false, message: 'This prize has no remaining quota.' };
    }
    if (availableParticipants.length === 0) {
      return { isValid: false, message: 'No participants available for drawing (all have already won).' };
    }
    if (drawCount === 0) {
      return { isValid: false, message: 'No winners can be drawn with current settings.' };
    }
    return { isValid: true };
  }, [selectedPrize, availableParticipants, drawCount]);

  // Enhanced: Generate winners function from MultiDrawingArea
  const generateWinners = useCallback((): Winner[] => {
    if (!selectedPrize || availableParticipants.length === 0) return [];

    const shuffledParticipants = [...availableParticipants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffledParticipants.slice(0, drawCount);

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
  }, [selectedPrize, availableParticipants, drawCount]);

  // Enhanced: Database operations with conflict prevention
  const saveWinnersToDatabase = useCallback(async (winners: Winner[]) => {
    if (winners.length === 0) return false;
    
    try {
      setProcessingStatus('saving');
      console.log('VIP: Saving winners to database:', winners);
      
      const existingWinners = winnersHook.data.filter(w => 
        w.drawSession === lastDrawSession
      );
      
      if (existingWinners.length > 0) {
        console.log('VIP: Winners already exist for this session, skipping save');
        return true;
      }
      
      for (const winner of winners) {
        await winnersHook.add(winner);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('VIP: Successfully saved all winners');
      return true;
    } catch (error) {
      console.error('VIP: Error saving winners:', error);
      setProcessingStatus('error');
      return false;
    }
  }, [winnersHook, lastDrawSession]);
  
  // Enhanced: Prize quota update
  const updatePrizeQuota = useCallback(async (prize: Prize, winnersCount: number) => {
    try {
      const currentPrize = prizes.find(p => p.id === prize.id);
      if (!currentPrize) return false;
      
      const newQuota = Math.max(0, currentPrize.remainingQuota - winnersCount);
      
      await prizesHook.update(prize.id, {
        remainingQuota: newQuota
      });
      
      console.log('VIP: Updated prize quota:', { prizeId: prize.id, newQuota });
      
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

  // Enhanced: Main button handler with MultiDrawingArea logic adapted for single button
  const handleMainButton = useCallback(async () => {
    if (isProcessing && drawingPhase !== 'spinning' && drawingPhase !== 'generated') {
      console.log('VIP: Already processing, ignoring button click');
      return;
    }
    
    if (drawingPhase === 'ready') {
      // Step 1: Generate Winners (like handleDrawClick in MultiDrawingArea)
      const validation = validateDraw();
      if (!validation.isValid) {
        alert(validation.message);
        return;
      }

      setIsProcessing(true);
      setProcessingStatus('generating');
      setVipControlActive(true);
      
      console.log('VIP: Starting draw with prize:', selectedPrize);
      
      const finalWinners = generateWinners();
      setPredeterminedWinners(finalWinners);
      
      console.log('VIP: Pre-determined winners:', finalWinners);
      
      await updateDrawingState({
        isDrawing: true,
        currentWinners: [],
        showConfetti: false,
        shouldStartSpinning: false,
        showWinnerDisplay: false,
        selectedPrizeName: selectedPrize?.name,
        selectedPrizeImage: selectedPrize?.image,
        selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
        selectedPrizeId: selectedPrize?.id,
        participants: participants,
        drawStartTime: Date.now(),
        finalWinners: finalWinners,
        predeterminedWinners: finalWinners,
        vipProcessedWinners: false,
        vipControlActive: true
      });
      
      localStorage.removeItem('vipProcessedWinners');
      localStorage.removeItem('vipDrawSession');
      
      setIsDrawing(true);
      setDrawingPhase('generated');
      setProcessingStatus('complete');
      setIsProcessing(false);

    } else if (drawingPhase === 'generated') {
      // Step 2: Start Spinning (like handleStartSpinning in MultiDrawingArea)
      console.log('VIP: Starting spinning animation with pre-determined winners:', predeterminedWinners);
      
      setProcessingStatus('spinning');
      
      await updateDrawingState({
        shouldStartSpinning: true,
        isDrawing: true,
        predeterminedWinners: predeterminedWinners
      });
      
      setDrawingPhase('spinning');
      setProcessingStatus('complete');

    } else if (drawingPhase === 'spinning') {
      // Step 3: Stop Drawing (like handleStopDrawClick in MultiDrawingArea)
      if (predeterminedWinners.length === 0) return;

      setIsProcessing(true);
      setProcessingStatus('stopping');
      setDrawingPhase('stopping');
      
      console.log('VIP: Initiating stop sequence with winners:', predeterminedWinners);
      
      await updateDrawingState({
        shouldStartSlowdown: true,
        shouldStartSpinning: true,
        predeterminedWinners: predeterminedWinners,
        vipControlActive: true
      });
      
      setTimeout(async () => {
        console.log('VIP: Finalizing results after natural slowdown');
        
        const saveSuccess = await saveWinnersToDatabase(predeterminedWinners);
        if (!saveSuccess) {
          setProcessingStatus('error');
          setIsProcessing(false);
          setDrawingPhase('spinning');
          return;
        }
        
        if (selectedPrize) {
          await updatePrizeQuota(selectedPrize, predeterminedWinners.length);
        }
        
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
  }, [drawingPhase, validateDraw, generateWinners, selectedPrize, predeterminedWinners, updateDrawingState, participants, saveWinnersToDatabase, updatePrizeQuota, lastDrawSession, isProcessing]);

  // Enhanced: Button configuration with all phases
  const getButtonConfig = () => {
    if (isProcessing) {
      return {
        text: processingStatus === 'generating' ? 'GENERATING WINNERS...' : 
              processingStatus === 'spinning' ? 'STARTING SPIN...' :
              processingStatus === 'stopping' ? 'STOPPING...' : 
              processingStatus === 'saving' ? 'SAVING...' : 'PROCESSING...',
        colors: 'from-yellow-500 to-orange-600',
        disabled: true,
        glowColor: 'from-yellow-400/20 to-orange-500/20',
        icon: <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      };
    }
    
    switch (drawingPhase) {
      case 'ready':
        const canStart = selectedPrize && availableParticipants.length > 0;
        return {
          text: canStart ? `GENERATE ${drawCount} WINNERS` : 'SELECT PRIZE FIRST',
          colors: canStart 
            ? 'from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500'
            : 'from-gray-600 to-gray-700',
          disabled: !canStart,
          glowColor: 'from-blue-400/20 to-cyan-500/20',
          icon: <Play className="w-16 h-16" />
        };
        
      case 'generated':
        return {
          text: 'START SPINNING',
          colors: 'from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500',
          disabled: false,
          glowColor: 'from-green-400/20 to-emerald-500/20',
          icon: <Zap className="w-16 h-16" />
        };
        
      case 'spinning':
        return {
          text: 'STOP & REVEAL WINNERS',
          colors: 'from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500',
          disabled: false,
          glowColor: 'from-red-400/20 to-pink-500/20',
          icon: <Square className="w-16 h-16" />
        };
        
      case 'stopping':
        return {
          text: 'FINALIZING RESULTS...',
          colors: 'from-orange-500 to-red-600',
          disabled: true,
          glowColor: 'from-orange-400/20 to-red-500/20',
          icon: <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        };
        
      default:
        return {
          text: 'READY',
          colors: 'from-gray-600 to-gray-700',
          disabled: true,
          glowColor: 'from-gray-400/20 to-gray-500/20',
          icon: <div className="w-16 h-16"></div>
        };
    }
  };

  const buttonConfig = getButtonConfig();
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-900 to-slate-900 relative overflow-hidden">
      {/* Enhanced: VIP Control Status Indicator */}
      {vipControlActive && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`flex items-center gap-2 px-4 py-2 backdrop-blur-sm text-white rounded-full shadow-lg ${
            vipControlStatus === 'completed' ? 'bg-green-600/90' :
            vipControlStatus === 'active' ? 'bg-yellow-600/90' : 'bg-purple-600/90'
          }`}>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {vipControlStatus === 'completed' ? 'VIP Completed' :
               vipControlStatus === 'active' ? 'VIP Active' : 'VIP Control'}
            </span>
            {processingStatus === 'complete' && (
              <CheckCircle className="w-4 h-4 text-green-300" />
            )}
            {processingStatus === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-300" />
            )}
          </div>
        </div>
      )}

      {/* Enhanced: Drawing Timer */}
      {isDrawing && (
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur-sm text-white rounded-full shadow-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Drawing: {formatTime(drawingDuration)}
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

        {/* Enhanced: Single Large Control Button */}
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
            className={`group relative px-16 py-20 rounded-3xl font-bold text-4xl lg:text-6xl transition-all duration-300 shadow-2xl ${
              buttonConfig.disabled
                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                : `bg-gradient-to-r ${buttonConfig.colors} text-white cursor-pointer`
            }`}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={
                  drawingPhase === 'spinning' && !isProcessing ? { rotate: 360 } :
                  isProcessing ? { rotate: 360 } : {}
                }
                transition={
                  (drawingPhase === 'spinning' && !isProcessing) || isProcessing 
                    ? { duration: 1, repeat: Infinity, ease: "linear" } : {}
                }
              >
                {buttonConfig.icon}
              </motion.div>
              <span className="text-center leading-tight">{buttonConfig.text}</span>
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