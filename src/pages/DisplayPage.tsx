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
    shouldStartSpinning: false
  });
  
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const [participantsSnapshot, setParticipantsSnapshot] = useState<Participant[]>([]);
  const [lastDrawStartTime, setLastDrawStartTime] = useState<number | null>(null);
  const [hasShownResults, setHasShownResults] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSingleName, setCurrentSingleName] = useState<string>('');
  
  // Stable animation speed - no slowdown
  const STABLE_ANIMATION_SPEED = 100; // milliseconds
  
  // FIXED: Better state synchronization
  useEffect(() => {
    console.log('Firebase drawingState changed:', drawingState);
    
    // Update local state with all Firebase changes
    setLocalState(prevState => ({
      ...prevState,
      ...drawingState
    }));
    
    // Handle spinning state changes separately with immediate effect
    if (drawingState.shouldStartSpinning !== undefined) {
      setIsSpinning(drawingState.shouldStartSpinning);
      console.log('Spinning state updated:', drawingState.shouldStartSpinning);
    }
  }, [drawingState]);

  // FIXED: Handle drawing state changes with better logic
  useEffect(() => {
    console.log('State change detected:', {
      isDrawing: drawingState.isDrawing,
      shouldStartSpinning: drawingState.shouldStartSpinning,
      currentIsSpinning: isSpinning,
      hasShownResults: hasShownResults
    });

    // Reset results when starting a new draw
    if (drawingState.isDrawing && !localState.isDrawing) {
      console.log('New draw started - resetting results');
      setHasShownResults(false);
      setParticipantsSnapshot(drawingState.participants || []);
      setLastDrawStartTime(drawingState.drawStartTime || Date.now());
    }
    
    // Show results when drawing stops
    if (!drawingState.isDrawing && localState.isDrawing && drawingState.finalWinners?.length > 0) {
      console.log('Drawing stopped - showing results');
      setHasShownResults(true);
      setIsSpinning(false);
      setLocalState(prev => ({ ...prev, currentWinners: [...drawingState.finalWinners] }));
    }
    
    // Clear results when winners are cleared
    if (!drawingState.currentWinners?.length && localState.currentWinners?.length > 0) {
      console.log('Winners cleared');
      setHasShownResults(false);
    }
  }, [drawingState.isDrawing, drawingState.shouldStartSpinning, drawingState.currentWinners, drawingState.finalWinners, localState.isDrawing, localState.currentWinners]);

  // FIXED: Animation effect for multi-slot machines
  useEffect(() => {
    console.log('Multi-slot animation effect:', {
      isSpinning,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota
    });

    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota > 1) {
      const drawCount = Math.min(localState.selectedPrizeQuota, participantsSnapshot.length);
      
      console.log('Starting multi-slot animation for', drawCount, 'slots');
      
      const interval = setInterval(() => {
        const newRollingNames = Array.from({ length: drawCount }, () => {
          const shuffled = [...participantsSnapshot]
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
            .map(p => p.name);
          
          return shuffled[Math.floor(Math.random() * shuffled.length)] || '';
        });
        setRollingNames(newRollingNames);
      }, STABLE_ANIMATION_SPEED);
  
      return () => {
        console.log('Clearing multi-slot animation interval');
        clearInterval(interval);
      };
    } else {
      setRollingNames([]);
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota]);

  // FIXED: Animation effect for single name picker
  useEffect(() => {
    console.log('Single-name animation effect:', {
      isSpinning,
      isDrawing: localState.isDrawing,
      participantsLength: participantsSnapshot.length,
      hasShownResults,
      prizeQuota: localState.selectedPrizeQuota
    });

    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota === 1) {
      console.log('Starting single-name animation');
      
      const interval = setInterval(() => {
        const randomParticipant = participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)];
        const newName = randomParticipant?.name || '';
        setCurrentSingleName(newName);
        console.log('Single name updated:', newName);
      }, STABLE_ANIMATION_SPEED);

      return () => {
        console.log('Clearing single-name animation interval');
        clearInterval(interval);
      };
    } else {
      setCurrentSingleName('');
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, hasShownResults, localState.selectedPrizeQuota]);

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
          <p className="text-white text-xl">Loading display...</p>
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
                        {!isSpinning ? (
                          <div className="text-center">
                              <span className="text-9xl font-bold text-slate-600 block uppercase">
                                Ready
                              </span>
                          </div>
                        ) : (
                          <motion.div
                            key={currentSingleName}
                            initial={{ 
                              scale: 0.8,
                              opacity: 0,
                              rotateX: 90
                            }}
                            animate={{ 
                              scale: 1,
                              opacity: 1,
                              rotateX: 0
                            }}
                            transition={{ 
                              duration: STABLE_ANIMATION_SPEED / 1000,
                              ease: "easeInOut"
                            }}
                            className="text-center"
                          >
                            <div className="text-blue-800 ">
                              <span className="text-5xl font-bold ">
                                {currentSingleName || '...'}
                              </span>
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
                        <div className="bg-white rounded-xl p-3 shadow-xl border-2 border-slate-200 relative overflow-hidden min-h-[300px]">
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
                              <div className="w-full h-32 bg-slate-50 rounded-xl border-2 border-slate-300 overflow-hidden relative">
                                {/* Show "Ready" state when not spinning */}
                                {!isSpinning ? (
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
                                  /* Rolling Name - only when spinning */
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                      key={`name-${columnIndex}-${rollingNames[columnIndex]}`}
                                      initial={{ 
                                        y: -50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      animate={{ 
                                        y: 0, 
                                        opacity: 1, 
                                        scale: 1,
                                        filter: "blur(0px)"
                                      }}
                                      exit={{ 
                                        y: 50, 
                                        opacity: 0, 
                                        scale: 0.8,
                                        filter: "blur(2px)"
                                      }}
                                      transition={{ 
                                        duration: STABLE_ANIMATION_SPEED / 1000,
                                        ease: "easeInOut"
                                      }}
                                      className="text-center px-1"
                                    >
                                      <div className="bg-white rounded-lg px-2 py-2 shadow-md border border-emerald-200">
                                        <span className="text-sm font-bold text-slate-800 block leading-tight">
                                          {rollingNames[columnIndex] || '...'}
                                        </span>
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
                    {!isSpinning && (
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