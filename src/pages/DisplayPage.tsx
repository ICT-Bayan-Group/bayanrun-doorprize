import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Winner, AppSettings, Participant } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useFirebaseDrawingState } from '../hooks/useFirebaseDrawingState';
import Confetti from 'react-confetti';

interface DrawingState {
  selectedPrizeQuota: number;
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
  selectedPrizeName?: string;
  selectedPrizeImage?: string;
  participants: Participant[];
  drawStartTime?: number;
  finalWinners?: Winner[];
  shouldStartSpinning?: boolean;
  shouldResetToReady?: boolean;
  predeterminedWinners?: Winner[];
  shouldStartSlowdown?: boolean;
}

const DisplayPage: React.FC = () => {
  // Firebase hooks
  const settingsHook = useFirestore<AppSettings & { id: string }>('settings');
  const { drawingState } = useFirebaseDrawingState();
  
  const settings = settingsHook.data[0] || {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    animationType: 'wheel',
    soundEnabled: true,
    backgroundMusic: false,
    multiDrawCount: 10
  };

  const [localState, setLocalState] = useState<DrawingState>({
    isDrawing: false,
    currentWinners: [],
    showConfetti: false,
    selectedPrizeName: undefined,
    selectedPrizeImage: undefined,
    participants: [],
    finalWinners: [],
    selectedPrizeQuota: 0,
    shouldStartSpinning: false,
    predeterminedWinners: []
  });
  
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const [participantsSnapshot, setParticipantsSnapshot] = useState<Participant[]>([]);
  const [lastDrawStartTime, setLastDrawStartTime] = useState<number | null>(null);
  const [hasShownResults, setHasShownResults] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSingleName, setCurrentSingleName] = useState<string>('');
  
  // FIXED: Enhanced slowdown states with convergence tracking
  const [isSlowingDown, setIsSlowingDown] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(100);
  const [slowdownProgress, setSlowdownProgress] = useState(0);
  const [hasConverged, setHasConverged] = useState(false); // NEW: Track if animation has converged to final winners
  const [finalConvergedNames, setFinalConvergedNames] = useState<string[]>([]); // NEW: Store converged names
  
  // Base animation speed
  const BASE_SPEED = 100; // milliseconds
  const SLOWDOWN_DURATION = 3000; // 3 seconds
  
  // FIXED: Enhanced speed progression with final lock phase
  const getSlowdownSpeed = (progress: number): number => {
    if (progress <= 0.2) return 100;   // 0-20%: 100ms
    if (progress <= 0.4) return 100;   // 20-40%: 200ms  
    if (progress <= 0.6) return 100;   // 40-60%: 200ms
    if (progress <= 0.8) return 100;   // 60-80%: 200ms
    if (progress <= 0.95) return 100; // 80-95%: 400ms
    return 100; // 95-100%: Lock at final names (very slow update)
  };
  
  // FIXED: Enhanced convergence probability with forced final convergence
  const getConvergenceChance = (progress: number): number => {
    if (progress <= 0.5) return 0.1;   // 10% chance until 50%
    if (progress <= 0.7) return 0.3;   // 30% chance until 70%
    if (progress <= 0.85) return 0.6;  // 60% chance until 85%
    if (progress <= 0.95) return 0.9;  // 90% chance until 95%
    return 50.0;                        // 100% chance - FORCE convergence
  };

  // FIXED: Better state synchronization
  useEffect(() => {
    console.log('Firebase drawingState changed:', drawingState);
    
    // Update local state with all Firebase changes
    setLocalState(prevState => ({
      ...prevState,
      ...drawingState
    }));
    
    // Handle spinning state changes
    if (drawingState.shouldStartSpinning !== undefined) {
      setIsSpinning(drawingState.shouldStartSpinning);
      console.log('Spinning state updated:', drawingState.shouldStartSpinning);
    }
    
    // FIXED: Handle slowdown trigger with convergence reset
    if (drawingState.shouldStartSlowdown && !isSlowingDown) {
      console.log('Starting natural slowdown process');
      setIsSlowingDown(true);
      setSlowdownProgress(0);
      setHasConverged(false); // Reset convergence state
      setFinalConvergedNames([]); // Reset converged names
    }
  }, [drawingState, isSlowingDown]);

  // FIXED: Handle drawing state changes with better logic
  useEffect(() => {
    console.log('State change detected:', {
      isDrawing: drawingState.isDrawing,
      shouldStartSpinning: drawingState.shouldStartSpinning,
      shouldStartSlowdown: drawingState.shouldStartSlowdown,
      currentIsSpinning: isSpinning,
      hasShownResults: hasShownResults
    });

    // Reset results when starting a new draw
    if (drawingState.isDrawing && !localState.isDrawing) {
      console.log('New draw started - resetting results');
      setHasShownResults(false);
      setParticipantsSnapshot(drawingState.participants || []);
      setLastDrawStartTime(drawingState.drawStartTime || Date.now());
      setIsSlowingDown(false);
      setSlowdownProgress(0);
      setHasConverged(false);
      setFinalConvergedNames([]);
    }
    
    // Show results when drawing stops
    if (!drawingState.isDrawing && localState.isDrawing && drawingState.finalWinners?.length > 0) {
      console.log('Drawing stopped - showing results');
      setHasShownResults(true);
      setIsSpinning(false);
      setIsSlowingDown(false);
      setHasConverged(false);
      setLocalState(prev => ({ ...prev, currentWinners: [...drawingState.finalWinners] }));
    }
    
    // Clear results when winners are cleared
    if (!drawingState.currentWinners?.length && localState.currentWinners?.length > 0) {
      console.log('Winners cleared');
      setHasShownResults(false);
      setIsSlowingDown(false);
      setHasConverged(false);
      setFinalConvergedNames([]);
    }
  }, [drawingState.isDrawing, drawingState.shouldStartSpinning, drawingState.currentWinners, drawingState.finalWinners, localState.isDrawing, localState.currentWinners]);

  // FIXED: Enhanced natural slowdown effect with convergence locking
  useEffect(() => {
    if (!isSlowingDown) return;

    console.log('Natural slowdown effect started');
    
    const startTime = Date.now();
    
    const slowdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SLOWDOWN_DURATION, 1);
      
      setSlowdownProgress(progress);
      
      const newSpeed = getSlowdownSpeed(progress);
      setCurrentSpeed(newSpeed);
      
      console.log(`Slowdown progress: ${Math.round(progress * 100)}%, Speed: ${newSpeed}ms, Converged: ${hasConverged}`);
      
      // FIXED: Force convergence at 90% and lock it
      if (progress >= 0.9 && !hasConverged) {
        const predeterminedWinners = localState.predeterminedWinners || [];
        if (predeterminedWinners.length > 0) {
          console.log('🎯 FORCING CONVERGENCE at 90% - locking to predetermined winners');
          setHasConverged(true);
          
          if (localState.selectedPrizeQuota === 1) {
            const finalName = predeterminedWinners[0].name;
            setCurrentSingleName(finalName);
            setFinalConvergedNames([finalName]);
          } else {
            const finalNames = predeterminedWinners.map(w => w.name);
            setRollingNames(finalNames);
            setFinalConvergedNames(finalNames);
          }
        }
      }
      
      // Complete slowdown
      if (progress >= 1) {
        console.log('Natural slowdown completed');
        setIsSlowingDown(false);
        setIsSpinning(false);
        clearInterval(slowdownInterval);
      }
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(slowdownInterval);
  }, [isSlowingDown, hasConverged, localState.predeterminedWinners, localState.selectedPrizeQuota]);

  // FIXED: Multi-slot animation with proper convergence locking
  useEffect(() => {
    console.log('Multi-slot animation effect:', {
      isSpinning,
      isSlowingDown,
      hasConverged,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota,
      predeterminedWinners: localState.predeterminedWinners?.length
    });

    if ((isSpinning || isSlowingDown) && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota > 1) {
      
      // FIXED: If already converged, don't change the names anymore
      if (hasConverged && finalConvergedNames.length > 0) {
        console.log('⚡ Animation locked to converged winners:', finalConvergedNames);
        setRollingNames([...finalConvergedNames]); // Keep showing the same winners
        return;
      }

      const drawCount = Math.min(localState.selectedPrizeQuota, participantsSnapshot.length);
      const predeterminedWinners = localState.predeterminedWinners || [];
      
      console.log('🎰 Starting multi-slot animation for', drawCount, 'slots with', predeterminedWinners.length, 'predetermined winners');
      
      const speed = isSlowingDown ? currentSpeed : BASE_SPEED;
      
      const interval = setInterval(() => {
        // Skip if converged
        if (hasConverged) {
          clearInterval(interval);
          return;
        }

        const convergenceChance = isSlowingDown ? getConvergenceChance(slowdownProgress) : 0;
        
        const newRollingNames = Array.from({ length: drawCount }, (_, index) => {
          // FIXED: During slowdown, increase chance of showing predetermined winner
          if (isSlowingDown && predeterminedWinners[index] && Math.random() < convergenceChance) {
            return predeterminedWinners[index].name;
          }
          
          // Otherwise show random name
          const shuffled = [...participantsSnapshot]
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
            .map(p => p.name);
          
          return shuffled[Math.floor(Math.random() * shuffled.length)] || '';
        });
        
        setRollingNames(newRollingNames);
        
        console.log(`🎰 Multi-slot update: speed=${speed}ms, convergence=${Math.round(convergenceChance * 100)}%`);
      }, speed);
  
      return () => {
        console.log('Clearing multi-slot animation interval');
        clearInterval(interval);
      };
    } else {
      setRollingNames([]);
    }
  }, [isSpinning, isSlowingDown, hasConverged, finalConvergedNames, currentSpeed, slowdownProgress, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, localState.predeterminedWinners]);

  // FIXED: Single name animation with proper convergence locking
  useEffect(() => {
    console.log('Single-name animation effect:', {
      isSpinning,
      isSlowingDown,
      hasConverged,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota,
      predeterminedWinners: localState.predeterminedWinners?.length
    });

    if ((isSpinning || isSlowingDown) && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota === 1) {
      
      // FIXED: If already converged, don't change the name anymore
      if (hasConverged && finalConvergedNames.length > 0) {
        console.log('⚡ Single name locked to converged winner:', finalConvergedNames[0]);
        setCurrentSingleName(finalConvergedNames[0]); // Keep showing the same winner
        return;
      }

      const predeterminedWinners = localState.predeterminedWinners || [];
      
      console.log('🎰 Starting single-name animation with', predeterminedWinners.length, 'predetermined winner');
      
      const speed = isSlowingDown ? currentSpeed : BASE_SPEED;
      
      const interval = setInterval(() => {
        // Skip if converged
        if (hasConverged) {
          clearInterval(interval);
          return;
        }

        const convergenceChance = isSlowingDown ? getConvergenceChance(slowdownProgress) : 0;
        
        let newName = '';
        
        // FIXED: During slowdown, increase chance of showing predetermined winner
        if (isSlowingDown && predeterminedWinners[0] && Math.random() < convergenceChance) {
          newName = predeterminedWinners[0].name;
        } else {
          // Otherwise show random name
          const randomParticipant = participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)];
          newName = randomParticipant?.name || '';
        }
        
        setCurrentSingleName(newName);
        console.log(`🎰 Single name update: "${newName}", speed=${speed}ms, convergence=${Math.round(convergenceChance * 100)}%`);
      }, speed);

      return () => {
        console.log('Clearing single-name animation interval');
        clearInterval(interval);
      };
    } else {
      setCurrentSingleName('');
    }
  }, [isSpinning, isSlowingDown, hasConverged, finalConvergedNames, currentSpeed, slowdownProgress, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, localState.predeterminedWinners]);

  const prizeQuota = localState.selectedPrizeQuota || 1;
  const drawCount = Math.min(prizeQuota, participantsSnapshot.length || localState.participants?.length || 0);

  // Calculate grid layout for machines
  const getGridLayout = (count: number) => {
    if (count <= 10) {
      return {
        gridCols: `repeat(${Math.min(count, 10)}, minmax(0, 1fr))`,
        maxWidth: 'max-w-full'
      };
    } else {
      return {
        gridCols: `repeat(10, minmax(0, 1fr))`,
        maxWidth: 'max-w-full'
      };
    }
  };

  const gridLayout = getGridLayout(drawCount);

  // Show loading state
  if (settingsHook.loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-300 to-red-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          transformOrigin: 'center center',
          transition: 'transform 0.2s',
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="fixed inset-0 bg-gradient-to-br from-blue-300 to-red-300 flex flex-col text-slate-800 overflow-hidden">
          {localState.showConfetti && localState.currentWinners && localState.currentWinners.length > 0 && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={300}
              gravity={0.3}
            />
          )}

          {/* Header with Logo (left) and Prize Info (right) */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-8 z-20">
            {/* Logo - Left Top */}
            {settings.eventLogo && (
              <motion.img
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                src={settings.eventLogo}
                alt="Event Logo"
                className="h-24 w-auto"
              />
            )}

            {/* Prize Info - Right Top */}
            {localState.selectedPrizeName && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-4 px-10 py-5 bg-white rounded-xl shadow-lg border"
              >
                {localState.selectedPrizeImage && (
                  <img
                    src={localState.selectedPrizeImage}
                    alt={localState.selectedPrizeName}
                    className="w-20 h-20 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div className="text-left">
                  <p className="text-lg font-bold text-slate-800 uppercase">{localState.selectedPrizeName}</p>
                  <p className="text-sm text-slate-600">Hadiah Undian</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* FIXED: Enhanced slowdown progress indicator */}
          {isSlowingDown && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white bg-opacity-90 rounded-full px-6 py-3 shadow-lg border ${
                  hasConverged ? 'border-green-300 bg-green-50' : 'border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: hasConverged ? 0.5 : 2, repeat: Infinity, ease: "linear" }}
                    className={`w-5 h-5 border-2 ${
                      hasConverged ? 'border-green-600 border-t-transparent' : 'border-blue-600 border-t-transparent'
                    } rounded-full`}
                  />
                  <span className={`font-medium ${hasConverged ? 'text-green-800' : 'text-slate-800'}`}>
                    {hasConverged ? '🎯 Locked to Winners!' : `Melambat... ${Math.round(slowdownProgress * 100)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                  <motion.div 
                    className={`h-1 rounded-full ${hasConverged ? 'bg-green-600' : 'bg-blue-600'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${slowdownProgress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                {hasConverged && (
                  <div className="text-center mt-2">
                    <span className="text-xs text-green-600 font-medium">
                      Animation locked to predetermined winners
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 pt-24">
            {localState.currentWinners && localState.currentWinners.length > 0 && hasShownResults ? (
              // Winners Display - Horizontal Layout
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                <motion.h2
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl font-bold text-emerald-600 mb-12 text-center"
                >
                 PEMENANG DOORPRIZE
                </motion.h2>
                
                {/* Winner Cards - Full width layout when > 1 */}
                {localState.currentWinners.length > 1 ? (
                  <div className="px-4">
                    <div 
                      className="gap-3"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(localState.currentWinners.length, 10)}, minmax(0, 1fr))`,
                        width: '100%'
                      }}
                    >
                      {localState.currentWinners.map((winner, index) => (
                        <motion.div
                          key={winner.id}
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative"
                        >
                          <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-slate-200 relative overflow-hidden min-h-[260px]">
                            {/* Prize Background */}
                            {localState.selectedPrizeImage && (
                              <div className="absolute inset-0 opacity-5">
                                <img
                                  src={localState.selectedPrizeImage}
                                  alt="Prize"
                                  className="w-full h-full object-cover rounded-3xl"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            <div className="relative z-10 h-full flex flex-col">
                              {/* Winner Name Display Area */}
                              <div className="flex-1 flex items-center justify-center relative px-2">
                                <span className="text-lg font-bold text-slate-800 text-center leading-snug">
                                  {winner.name}
                                </span>
                              </div>

                              {/* Prize Image at Bottom */}
                              {localState.selectedPrizeImage && (
                                <div className="mt-4 text-center">
                                  <img
                                    src={localState.selectedPrizeImage}
                                    alt={localState.selectedPrizeName}
                                    className="w-12 h-12 object-cover rounded-lg mx-auto opacity-60 shadow-md"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    {localState.currentWinners.map((winner, index) => (
                      <motion.div
                        key={winner.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                          delay: 0.5 + (index * 0.1),
                          type: "spring",
                          stiffness: 100
                        }}
                        className="bg-white rounded-2xl p-6 shadow-xl border-2 border-slate-200 text-center"
                        style={{ minWidth: '260px' }}
                      >
                        <div className="text-4xl mb-3">🏆</div>
                        <p className="text-2xl font-bold text-slate-800 mb-3">
                          {winner.name}
                        </p>
                        {localState.selectedPrizeImage && (
                          <img
                            src={localState.selectedPrizeImage}
                            alt={localState.selectedPrizeName}
                            className="w-24 h-24 object-cover rounded-xl mx-auto opacity-70"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : localState.isDrawing && !hasShownResults ? (
              // Drawing Animation
              prizeQuota === 1 ? (
                // Single Name Picker for quota 1
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center"
                >
                  <div className="relative overflow-hidden max-w-md mx-auto">
                    {/* Prize Background */}
                    {localState.selectedPrizeImage && (
                      <div className="absolute inset-0 opacity-5">
                        <img
                          alt="Prize"
                          className="w-full h-full object-cover rounded-3xl"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="relative z-10">
                      <div className="h-32 flex items-center justify-center mb-8">
                        {!isSpinning && !isSlowingDown ? (
                          <div className="text-center">
                              <span className="text-9xl font-bold text-slate-600 block uppercase">
                                Ready
                              </span>
                          </div>
                        ) : (
                          <motion.div
                            key={`${currentSingleName}-${hasConverged}`}
                            initial={{ 
                              scale: 0.8,
                              opacity: 0,
                              rotateX: 90
                            }}
                            animate={{ 
                              scale: hasConverged ? 1.2 : 1,
                              opacity: 1,
                              rotateX: 0
                            }}
                            transition={{ 
                              duration: (isSlowingDown ? currentSpeed : BASE_SPEED) / 1000,
                              ease: "easeInOut"
                            }}
                            className="text-center"
                          >
                            <div className={hasConverged ? "text-green-600" : "text-blue-800"}>
                              <span className={`font-bold ${isSlowingDown ? 'text-6xl' : 'text-5xl'} ${hasConverged ? 'text-green-600' : ''}`}>
                                {currentSingleName || '...'}
                              </span>
                              {isSlowingDown && (
                                <div className={`text-sm mt-2 ${hasConverged ? 'text-green-500' : 'text-slate-500'}`}>
                                  {hasConverged ? '' : `Speed: ${currentSpeed}ms`}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {localState.selectedPrizeImage && (
                        <div className="mt-8">
                          <img
                            src={localState.selectedPrizeImage}
                            alt={localState.selectedPrizeName}
                            className="w-30 h-30 object-cover rounded-2xl mx-auto opacity-60 shadow-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Multi Slot Machines for quota > 1
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-full px-4"
                >
                  <div 
                    className="gap-3 mx-auto"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: drawCount <= 10 ? 
                        `repeat(${drawCount}, minmax(0, 1fr))` : 
                        'repeat(10, minmax(0, 1fr))',
                      maxWidth: '100%'
                    }}
                  >
                    {Array.from({ length: drawCount }).map((_, columnIndex) => (
                      <motion.div
                        key={columnIndex}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: columnIndex * 0.05 }}
                        className="relative"
                      >
                        {/* Slot Machine */}
                        <div className={`bg-white rounded-xl p-3 shadow-xl border-2 relative overflow-hidden min-h-[300px] ${
                          hasConverged ? 'border-green-300 bg-green-50' : 'border-slate-200'
                        }`}>
                          {/* Prize Background */}
                          {localState.selectedPrizeImage && (
                            <div className="absolute inset-0 opacity-5">
                              <img
                                src={localState.selectedPrizeImage}
                                alt="Prize"
                                className="w-full h-full object-cover rounded-3xl"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="relative z-10 h-full flex flex-col">
                            {/* Main Display Area */}
                            <div className="flex-1 flex items-center justify-center relative">
                              <div className={`w-full h-32 bg-slate-50 rounded-xl border-2 overflow-hidden relative ${
                                hasConverged ? 'border-green-300 bg-green-50' : 'border-slate-300'
                              }`}>
                                {/* Show "Ready" state when not spinning */}
                                {!isSpinning && !isSlowingDown ? (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="bg-slate-100 rounded-lg px-3 py-2 shadow-md border border-slate-300">
                                        <span className="text-sm font-bold text-slate-600 block">
                                          Ready
                                        </span>
                                        <span className="text-xs text-slate-500 block">
                                          Start
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* Rolling Name - with convergence highlighting */
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                      key={`name-${columnIndex}-${rollingNames[columnIndex]}-${hasConverged}`}
                                      initial={{ 
                                        y: -50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      animate={{ 
                                        y: 0, 
                                        opacity: 1, 
                                        scale: hasConverged ? 1.2 : (isSlowingDown && slowdownProgress > 0.8 ? 1.1 : 1),
                                        filter: "blur(0px)"
                                      }}
                                      exit={{ 
                                        y: 50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      transition={{ 
                                        duration: (isSlowingDown ? currentSpeed : BASE_SPEED) / 1000,
                                        ease: "easeInOut"
                                      }}
                                      className="text-center px-1"
                                    >
                                      <div className={`rounded-lg px-2 py-2 shadow-md border ${
                                        hasConverged 
                                          ? 'border-green-400 bg-green-100 shadow-green-200' 
                                          : isSlowingDown && slowdownProgress > 0.6 
                                            ? 'border-emerald-200 bg-emerald-50' 
                                            : 'border-emerald-200 bg-white'
                                      }`}>
                                        <span className={`text-sm font-bold block leading-tight ${
                                          hasConverged 
                                            ? 'text-green-700' 
                                            : isSlowingDown && slowdownProgress > 0.8 
                                              ? 'text-emerald-600' 
                                              : 'text-slate-800'
                                        }`}>
                                          {rollingNames[columnIndex] || '...'}
                                        </span>
                                        {isSlowingDown && slowdownProgress > 0.7 && (
                                          <div className={`text-xs mt-1 ${
                                            hasConverged ? 'text-green-500' : 'text-slate-400'
                                          }`}>
                                            {hasConverged ? 'LOCKED!' : `${currentSpeed}ms`}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Prize Image at Bottom */}
                            {localState.selectedPrizeImage && (
                              <div className="mt-3 text-center">
                                <img
                                  src={localState.selectedPrizeImage}
                                  alt={localState.selectedPrizeName}
                                  className="w-10 h-10 object-cover rounded-lg mx-auto opacity-60 shadow-md"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-center mt-8"
                  >
                    {!isSpinning && !isSlowingDown && (
                      <p className="text-2xl text-slate-600 font-semibold">
                       
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )
            ) : (
              // Ready State
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Trophy className="w-40 h-40 text-yellow-500 mx-auto mb-12" />
                </motion.div>
                
                <h2 className="text-6xl font-bold text-slate-800 mb-8">
                  Ready to Draw Winners
                </h2>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl text-slate-600"
                >
                  {prizeQuota === 1 ? 'Single Winner Draw' : `Drawing ${prizeQuota} Winners`}
                </motion.p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DisplayPage;