import React, { useState, useEffect, useCallback } from 'react';
import { motion} from 'framer-motion';
import { Square, Zap,  } from 'lucide-react';
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
    } else if (drawingState.shouldStartSpinning) {
      setDrawingPhase('spinning');
    }
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

    return selectedParticipants.map((participant, index) => ({
      id: `${participant.id}-${Date.now()}-${index}`,
      name: participant.name,
      wonAt: new Date(),
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      drawSession: `${selectedPrize.id}-${Date.now()}`
    }));
  }, [selectedPrize, availableParticipants]);

  // Main button handler - handles all phases
  const handleMainButton = useCallback(async () => {
    if (drawingPhase === 'ready') {
      // Start Drawing and Spinning Phase (combined)
      if (!selectedPrize || availableParticipants.length === 0) return;

      console.log('VIP: Starting draw with prize:', selectedPrize);
      
      // Generate winners immediately
      const finalWinners = generateWinners();
      setPredeterminedWinners(finalWinners);
      
      console.log('VIP: Pre-determined winners:', finalWinners);
      
      // Update Firebase state and start spinning immediately
      updateDrawingState({
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
        shouldResetToReady: false
      });
      
      setIsDrawing(true);
      setDrawingPhase('spinning'); // Skip to spinning phase directly

    } else if (drawingPhase === 'spinning') {
      // Stop Drawing Phase
      if (predeterminedWinners.length === 0) return;

      console.log('VIP: Starting natural slowdown to pre-determined winners:', predeterminedWinners);
      
      // Start natural slowdown process
      updateDrawingState({
        shouldStartSlowdown: true,
        shouldStartSpinning: true,
        predeterminedWinners: predeterminedWinners
      });
      
      // After 3.5 seconds, finalize results
      setTimeout(() => {
        console.log('VIP: Finalizing results after natural slowdown');
        
        updateDrawingState({
          isDrawing: false,
          shouldStartSpinning: false,
          shouldStartSlowdown: false,
          showWinnerDisplay: true,
          finalWinners: predeterminedWinners,
          currentWinners: predeterminedWinners,
          showConfetti: true
        });
        
        // Add winners to database
        predeterminedWinners.forEach(winner => winnersHook.add(winner));
        
        // Update prize quota
        if (selectedPrize) {
          const newQuota = Math.max(0, selectedPrize.remainingQuota - predeterminedWinners.length);
          prizesHook.update(selectedPrize.id, {
            remainingQuota: newQuota
          });
          
          // Clear selected prize if quota exhausted
          if (newQuota <= 0) {
            setSelectedPrizeId(null);
            updateDrawingState({
              selectedPrizeId: null
            });
          }
        }
        
        setIsDrawing(false);
        setPredeterminedWinners([]);
        setDrawingPhase('ready');
        
      }, 3500);
    }
  }, [drawingPhase, selectedPrize, availableParticipants, predeterminedWinners, generateWinners, updateDrawingState, participants, winnersHook, prizesHook]);

  // Button configuration based on phase
  const getButtonConfig = () => {
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
                animate={drawingPhase === 'spinning' ? { rotate: 360 } : {}}
                transition={drawingPhase === 'spinning' ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
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
        </motion.div>
      </div>
    </div>
  );
};

export default VipPage;