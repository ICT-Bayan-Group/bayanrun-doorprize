import React, { useState, useEffect } from 'react';
import { motion} from 'framer-motion';
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
  const [hasConverged, setHasConverged] = useState(false);
  const [finalConvergedNames, setFinalConvergedNames] = useState<string[]>([]);
  const [showConvergedResult, setShowConvergedResult] = useState(false); // NEW: Control extended display
  
  // Base animation speed
  const BASE_SPEED = 100; // milliseconds
  const SLOWDOWN_DURATION = 3000; // 3 seconds
  const CONVERGED_DISPLAY_DURATION = 5000; // 5 seconds - NEW: Extended display time
  
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
      setShowConvergedResult(false); // Reset extended display
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
      setShowConvergedResult(false);
    }
    
    // Clear results when winners are cleared
    if (!drawingState.currentWinners?.length && localState.currentWinners?.length > 0) {
      console.log('Winners cleared');
      setHasShownResults(false);
      setIsSlowingDown(false);
      setHasConverged(false);
      setFinalConvergedNames([]);
      setShowConvergedResult(false);
    }
  }, [drawingState.isDrawing, drawingState.shouldStartSpinning, drawingState.currentWinners, drawingState.finalWinners, localState.isDrawing, localState.currentWinners]);

  // NEW: Handle extended display after convergence
  useEffect(() => {
    if (hasConverged && !showConvergedResult) {
      console.log('Starting extended converged result display');
      setShowConvergedResult(true);
      
      // Set timer to eventually hide the result
      const timer = setTimeout(() => {
        console.log('Extended display timer completed');
        setShowConvergedResult(false);
        setIsSpinning(false);
        setIsSlowingDown(false);
        setHasConverged(false);
        
        // Stop confetti
        setLocalState(prev => ({ ...prev, showConfetti: false }));
      }, CONVERGED_DISPLAY_DURATION);
      
      return () => clearTimeout(timer);
    }
  }, [hasConverged, showConvergedResult, localState.finalWinners]);

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
      showConvergedResult,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota,
      predeterminedWinners: localState.predeterminedWinners?.length
    });

    if ((isSpinning || isSlowingDown || showConvergedResult) && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota > 1) {
      
      // FIXED: If already converged, don't change the names anymore
      if ((hasConverged || showConvergedResult) && finalConvergedNames.length > 0) {
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
        if (hasConverged || showConvergedResult) {
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
  }, [isSpinning, isSlowingDown, hasConverged, showConvergedResult, finalConvergedNames, currentSpeed, slowdownProgress, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, localState.predeterminedWinners]);

  // FIXED: Single name animation with proper convergence locking and extended display
  useEffect(() => {
    console.log('Single-name animation effect:', {
      isSpinning,
      isSlowingDown,
      hasConverged,
      showConvergedResult,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota,
      predeterminedWinners: localState.predeterminedWinners?.length
    });

    if ((isSpinning || isSlowingDown || showConvergedResult) && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota === 1) {
      
      // FIXED: If already converged, don't change the name anymore
      if ((hasConverged || showConvergedResult) && finalConvergedNames.length > 0) {
        console.log('⚡ Single name locked to converged winner:', finalConvergedNames[0]);
        setCurrentSingleName(finalConvergedNames[0]); // Keep showing the same winner
        return;
      }

      const predeterminedWinners = localState.predeterminedWinners || [];
      
      console.log('🎰 Starting single-name animation with', predeterminedWinners.length, 'predetermined winner');
      
      const speed = isSlowingDown ? currentSpeed : BASE_SPEED;
      
      const interval = setInterval(() => {
        // Skip if converged or showing result
        if (hasConverged || showConvergedResult) {
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
    } else if (!localState.isDrawing) {
      setCurrentSingleName('');
    }
  }, [isSpinning, isSlowingDown, hasConverged, showConvergedResult, finalConvergedNames, currentSpeed, slowdownProgress, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota, localState.predeterminedWinners]);

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
          {/* Large Background Prize Image */}
          {localState.selectedPrizeImage && (
            <div className="absolute inset-0 z-0">
              <img
                src={localState.selectedPrizeImage}
                alt="Prize Background"
                className="w-1/2 h-1/2 object-contain opacity-100 mx-auto my-52"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/60 to-red-300/60"></div>
            </div>
          )}

          {(localState.showConfetti || showConvergedResult) && hasConverged && (
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
          </div>

          {/* FIXED: Enhanced slowdown progress indicator */}
          {isSlowingDown && !showConvergedResult && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white bg-opacity-90 rounded-full px-6 py-3 shadow-lg border ${
                  hasConverged ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: hasConverged ? 0.5 : 2, repeat: Infinity, ease: "linear" }}
                    className={`w-5 h-5 border-2 ${
                      hasConverged ? 'border-yellow-600 border-t-transparent' : 'border-blue-600 border-t-transparent'
                    } rounded-full`}
                  />
                  <span className={`font-medium ${hasConverged ? 'text-green-800' : 'text-slate-800'}`}>
                    {hasConverged ? 'Locked!' : `Melambat... ${Math.round(slowdownProgress * 100)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                  <motion.div 
                    className={`h-1 rounded-full ${hasConverged ? 'bg-yellow-600' : 'bg-blue-600'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${slowdownProgress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-4 pt-24 relative z-10">
            {localState.isDrawing || showConvergedResult ? (
              // Drawing Animation or Extended Result Display
              prizeQuota === 1 ? (
                // Single Name Picker for quota 1
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center"
                >
                  <div className="relative overflow-hidden max-w-md mx-auto">
                    <div className="relative z-10">
                      <div className="h-32 flex items-center justify-center mb-8">
                        {!isSpinning && !isSlowingDown && !showConvergedResult ? (
                          <div className="text-center">
                              <span className="text-9xl font-bold text-slate-600 block uppercase">
                                Ready
                              </span>
                          </div>
                        ) : (
                          <motion.div
                            key={`single-name-${currentSingleName}-${hasConverged}-${showConvergedResult}`}
                            initial={{ 
                              y: -50,
                              opacity: 0,
                              scale: 0.8,
                              filter: "blur(2px)"
                            }}
                            animate={{
                              y: 0,
                              opacity: 1,
                              scale: (hasConverged || showConvergedResult) ? 1.3 : (isSlowingDown && slowdownProgress > 0.8 ? 1.1 : 1),
                              filter: "blur(0px)"
                            }}
                            exit={{
                              y: 50,
                              opacity: 0,
                              scale: 0.8,
                              filter: "blur(2px)"
                            }}
                            transition={{
                              duration: showConvergedResult ? 0.8 : (isSlowingDown ? currentSpeed : BASE_SPEED) / 1000,
                              ease: "easeInOut"
                            }}
                            className="text-center px-4"
                          >
                            <div className={` px-4 py-3 shadow-md ${
                              (hasConverged || showConvergedResult)
                                ? 'border-transparent bg-transparent shadow-transparent' 
                                : isSlowingDown && slowdownProgress > 0.6 
                                  ? 'border-transparent bg-transparent shadow-transparent'

                                  : ' bg-transparent shadow-transparent'
                            }`}>
                              <span className={`text-6xl font-bold block ${
                                (hasConverged || showConvergedResult)
                                  ? 'text-green-600' 
                                  : isSlowingDown && slowdownProgress > 0.8 
                                    ? 'text-yellow-600'
                                    : 'text-slate-800'
                              }`}>
                                {currentSingleName || (showConvergedResult ? localState.finalWinners?.[0]?.name : '') || '...'}
                              </span>
                              {/* show winner */}
                              {showConvergedResult && (
                                <div className="text-xs mt-1 text-green-500 font-semibold">
                                  WINNER!
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
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
                        <div className={`bg-transparent rounded-xl p-3  border-2 relative overflow-hidden min-h-[300px] ${
                          (hasConverged || showConvergedResult) ? 'border-transparent' : 'border-transparent'
                        }`}>
                          
                          <div className="relative z-10 h-full flex flex-col">
                            {/* Main Display Area */}
                            <div className="flex-1 flex items-center justify-center relative">
                              <div className={`w-full h-32 bg-slate-50 rounded-xl border-2 overflow-hidden relative ${
                                (hasConverged || showConvergedResult) ? 'border-green-300 bg-green-50' : 'border-slate-300'
                              }`}>
                                {/* Show "Ready" state when not spinning */}
                                {!isSpinning && !isSlowingDown && !showConvergedResult ? (
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
                                      key={`name-${columnIndex}-${rollingNames[columnIndex]}-${hasConverged}-${showConvergedResult}`}
                                      initial={{ 
                                        y: -50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      animate={{ 
                                        y: 0, 
                                        opacity: 1, 
                                        scale: (hasConverged || showConvergedResult) ? 1.3 : (isSlowingDown && slowdownProgress > 0.8 ? 1.1 : 1),
                                        filter: "blur(0px)"
                                      }}
                                      exit={{ 
                                        y: 50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      transition={{ 
                                        duration: showConvergedResult ? 0.8 : (isSlowingDown ? currentSpeed : BASE_SPEED) / 1000,
                                        ease: "easeInOut"
                                      }}
                                      className="text-center px-1"
                                    >
                                      <div className={`rounded-lg px-2 py-2 shadow-md border ${
                                        (hasConverged || showConvergedResult)
                                          ? 'border-green-400 bg-green-100 shadow-green-200' 
                                          : isSlowingDown && slowdownProgress > 0.6 
                                            ? 'border-yellow-200 bg-yellow-50' 
                                            : 'border-yellow-200 bg-white'
                                      }`}>
                                        <span className={`text-sm font-bold block ${
                                          (hasConverged || showConvergedResult)
                                            ? 'text-green-700' 
                                            : isSlowingDown && slowdownProgress > 0.8 
                                              ? 'text-yellow-600' 
                                              : 'text-slate-800'
                                        }`}>
                                          {rollingNames[columnIndex] || (showConvergedResult ? localState.finalWinners?.[columnIndex]?.name : '') || '...'}
                                        </span>
                                        {/* show winner */}
                                        {showConvergedResult && (
                                          <div className="text-xs mt-1 text-green-500 font-semibold">
                                            WINNER!
                                          </div>
                                        )}
                                        {isSlowingDown && slowdownProgress > 0.7 && !showConvergedResult && (
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
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {showConvergedResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="text-center mt-8"
                    >
               
                    </motion.div>
                  )}
                  
                  {!isSpinning && !isSlowingDown && !showConvergedResult && (
                    <motion.div
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-center mt-8"
                    >
                      
                    </motion.div>
                  )}
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
                
                </motion.div>
                
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