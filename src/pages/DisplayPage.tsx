import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Winner, AppSettings, Participant } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
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
}

const DisplayPage: React.FC = () => {
  const [settings] = useLocalStorage<AppSettings>('doorprize-settings', {
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    animationType: 'wheel',
    soundEnabled: true,
    backgroundMusic: false,
    multiDrawCount: 10
  });
  
  const [drawingState] = useLocalStorage<DrawingState>('doorprize-drawing-state', {
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

  const [localState, setLocalState] = useState<DrawingState>({
    ...{
      isDrawing: false,
      currentWinners: [],
      showConfetti: false,
      selectedPrizeName: undefined,
      selectedPrizeImage: undefined,
      participants: [],
      finalWinners: [],
      shouldStartSpinning: false
    },
    ...drawingState
  });
  
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [participantsSnapshot, setParticipantsSnapshot] = useState<Participant[]>([]);
  const [lastDrawStartTime, setLastDrawStartTime] = useState<number | null>(null);
  const [hasShownResults, setHasShownResults] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSingleName, setCurrentSingleName] = useState<string>('');

  // Listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newState = JSON.parse(localStorage.getItem('doorprize-drawing-state') || '{}');
      if (newState.isDrawing !== undefined) {
        const updatedState = {
          ...{
            isDrawing: false,
            currentWinners: [],
            showConfetti: false,
            selectedPrizeName: undefined,
            selectedPrizeImage: undefined,
            participants: [],
            finalWinners: [],
            shouldStartSpinning: false
          },
          ...newState
        };
        
        // Check if drawing just stopped - immediately show results
        if (!updatedState.isDrawing && localState.isDrawing) {
          setHasShownResults(true);
          setIsSpinning(false);
          if (updatedState.finalWinners && updatedState.finalWinners.length > 0) {
            updatedState.currentWinners = [...updatedState.finalWinners];
          }
        }
        
        // Check if this is a new draw
        if (updatedState.isDrawing && (!localState.isDrawing || updatedState.drawStartTime !== lastDrawStartTime)) {
          setParticipantsSnapshot(updatedState.participants || []);
          setLastDrawStartTime(updatedState.drawStartTime || Date.now());
          setAnimationSpeed(100);
          setHasShownResults(false);
          
          // Start spinning only when shouldStartSpinning is true
          if (updatedState.shouldStartSpinning) {
            setIsSpinning(true);
          }
        }
        
        // Handle shouldStartSpinning flag
        if (updatedState.shouldStartSpinning && updatedState.isDrawing && !isSpinning) {
          setIsSpinning(true);
        }
        
        if (!updatedState.isDrawing && updatedState.currentWinners && updatedState.currentWinners.length > 0) {
          setHasShownResults(true);
        }
        
        if (updatedState.currentWinners?.length === 0) {
          setHasShownResults(false);
        }
        
        setLocalState(updatedState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const currentState = JSON.parse(localStorage.getItem('doorprize-drawing-state') || '{}');
      if (JSON.stringify(currentState) !== JSON.stringify(localState)) {
        const updatedState = {
          ...{
            isDrawing: false,
            currentWinners: [],
            showConfetti: false,
            selectedPrizeName: undefined,
            selectedPrizeImage: undefined,
            participants: [],
            finalWinners: [],
            shouldStartSpinning: false
          },
          ...currentState
        };
        
        if (!updatedState.isDrawing && localState.isDrawing) {
          setHasShownResults(true);
          setIsSpinning(false);
          if (updatedState.finalWinners && updatedState.finalWinners.length > 0) {
            updatedState.currentWinners = [...updatedState.finalWinners];
          }
        }
        
        if (updatedState.isDrawing && (!localState.isDrawing || updatedState.drawStartTime !== lastDrawStartTime)) {
          setParticipantsSnapshot(updatedState.participants || []);
          setLastDrawStartTime(updatedState.drawStartTime || Date.now());
          setAnimationSpeed(100);
          setHasShownResults(false);
          
          // Start spinning only when shouldStartSpinning is true
          if (updatedState.shouldStartSpinning) {
            setIsSpinning(true);
          }
        }
        
        // Handle shouldStartSpinning flag
        if (updatedState.shouldStartSpinning && updatedState.isDrawing && !isSpinning) {
          setIsSpinning(true);
        }
        
        if (!updatedState.isDrawing && updatedState.currentWinners && updatedState.currentWinners.length > 0) {
          setHasShownResults(true);
        }
        
        if (updatedState.currentWinners?.length === 0) {
          setHasShownResults(false);
        }
        
        setLocalState(updatedState);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [localState, lastDrawStartTime, isSpinning]);

  // Animation effect for multi-slot machines
  useEffect(() => {
    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota > 1) {
      const drawCount = Math.min(localState.selectedPrizeQuota, participantsSnapshot.length);
      
      const slowDownInterval = setInterval(() => {
        setAnimationSpeed(prev => Math.min(prev + 25, 350));
      }, 1500);
  
      const interval = setInterval(() => {
        const newRollingNames = Array.from({ length: drawCount }, () => {
          const shuffled = [...participantsSnapshot]
            .sort(() => Math.random() - 0.5)
            .slice(0, 8)
            .map(p => p.name);
          
          return shuffled[Math.floor(Math.random() * shuffled.length)] || '';
        });
        setRollingNames(newRollingNames);
      }, animationSpeed);
  
      return () => {
        clearInterval(interval);
        clearInterval(slowDownInterval);
      };
    } else {
      setRollingNames([]);
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, animationSpeed, hasShownResults, localState.selectedPrizeQuota]);

  // Animation effect for single name picker
  useEffect(() => {
    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults && localState.selectedPrizeQuota === 1) {
      const slowDownInterval = setInterval(() => {
        setAnimationSpeed(prev => Math.min(prev + 30, 400));
      }, 2000);

      const interval = setInterval(() => {
        const randomParticipant = participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)];
        setCurrentSingleName(randomParticipant?.name || '');
      }, animationSpeed);

      return () => {
        clearInterval(interval);
        clearInterval(slowDownInterval);
      };
    } else {
      setCurrentSingleName('');
    }
  }, [isSpinning, localState.isDrawing, participantsSnapshot, animationSpeed, hasShownResults, localState.selectedPrizeQuota]);

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
                className="h-20 w-auto"
              />
            )}

            {/* Prize Info - Right Top */}
            {localState.selectedPrizeName && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-xl shadow-lg border"
              >
                {localState.selectedPrizeImage && (
                  <img
                    src={localState.selectedPrizeImage}
                    alt={localState.selectedPrizeName}
                    className="w-12 h-12 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div className="text-left">
                  <p className="text-lg font-bold text-slate-800">{localState.selectedPrizeName}</p>
                  <p className="text-sm text-slate-600">Prize for this draw</p>
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
                className="w-full max-w-6xl"
              >
                <motion.h2
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl font-bold text-emerald-600 mb-8 text-center"
                >
                  WINNERS!
                </motion.h2>
                
                {/* Horizontal Winner Cards */}
                <div className="flex flex-wrap justify-center gap-4 max-w-full">
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
                      className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 text-center flex-shrink-0"
                      style={{ minWidth: '180px', maxWidth: '220px' }}
                    >
                      <div className="text-3xl mb-2">🏆</div>
                      <p className="text-lg font-bold text-slate-800 mb-2">
                        {winner.name}
                      </p>
                      
                      {localState.selectedPrizeImage && (
                        <img
                          src={localState.selectedPrizeImage}
                          alt={localState.selectedPrizeName}
                          className="w-12 h-12 object-cover rounded-lg mx-auto opacity-70"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="text-2xl text-center mt-8 text-slate-600"
                >
                  Congratulations!
                </motion.p>
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
                  <motion.h2
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-6xl font-bold text-slate-800 mb-12"
                  >
                    Drawing Winner...
                  </motion.h2>

                  <div className="bg-white rounded-3xl p-12 shadow-2xl border-4 border-slate-200 relative overflow-hidden max-w-md mx-auto">
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
                    
                    <div className="relative z-10">
                      <div className="text-8xl mb-8">🎯</div>
                      
                      <div className="h-32 flex items-center justify-center mb-8">
                        {!isSpinning ? (
                          <div className="text-center">
                            <div className="bg-slate-100 rounded-xl px-8 py-6 shadow-lg border-2 border-slate-300">
                              <span className="text-2xl font-bold text-slate-600 block">
                                Ready
                              </span>
                              <span className="text-sm text-slate-500 block mt-1">
                                Click Start to Begin
                              </span>
                            </div>
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
                              duration: animationSpeed / 1000,
                              ease: "easeInOut"
                            }}
                            className="text-center"
                          >
                            <div className="bg-gradient-to-r from-emerald-400 to-blue-500 text-white rounded-xl px-8 py-6 shadow-lg border-2 border-white">
                              <span className="text-3xl font-bold block">
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
                            className="w-24 h-24 object-cover rounded-2xl mx-auto opacity-60 shadow-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-8"
                  >
                    {!isSpinning && (
                      <p className="text-2xl text-slate-600 font-semibold">
                        Waiting for draw to start...
                      </p>
                    )}
                  </motion.div>
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
                        <div className="bg-white rounded-2xl p-3 shadow-xl border-2 border-slate-200 relative overflow-hidden min-h-[300px]">
                          {/* Prize Background */}
                          {localState.selectedPrizeImage && (
                            <div className="absolute inset-0 opacity-5">
                              <img
                                src={localState.selectedPrizeImage}
                                alt="Prize"
                                className="w-full h-full object-cover rounded-2xl"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="relative z-10 h-full flex flex-col">
                            {/* Position Number */}
                            <div className="text-center mb-3">
                              <motion.div
                                animate={{ 
                                  scale: [1, 1.1, 1],
                                  color: ["#10b981", "#059669", "#10b981"]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-2xl font-black text-emerald-500"
                              >
                               
                              </motion.div>
                            </div>
                            
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
                                        duration: animationSpeed / 1000,
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
                        Waiting for draw to start...
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