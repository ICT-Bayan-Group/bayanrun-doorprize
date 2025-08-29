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
  shouldStartSpinning?: boolean; // New field to control when spinning starts
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
  const [isSpinning, setIsSpinning] = useState(false); // Local spinning state

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
          setIsSpinning(false); // Stop spinning when drawing stops
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
          setIsSpinning(false); // Stop spinning when drawing stops
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

  useEffect(() => {
    if (isSpinning && localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults) {
      // FIXED: Allow up to 10 slots instead of just 5
      const drawCount = Math.min(10, participantsSnapshot.length); // Changed from 5 to 10
      
      const slowDownInterval = setInterval(() => {
        setAnimationSpeed(prev => Math.min(prev + 25, 350));
      }, 1500);
  
      const interval = setInterval(() => {
        // FIXED: Generate names for all drawCount slots
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
  }, [isSpinning, localState.isDrawing, participantsSnapshot, animationSpeed, hasShownResults]);

  const prizeQuota = localState.selectedPrizeQuota || 100;
  const drawCount = Math.min(prizeQuota, participantsSnapshot.length || localState.participants?.length || 0);

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

          {/* Header */}
          <div className="text-center py-12">
            {settings.eventLogo && (
              <motion.img
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                src={settings.eventLogo}
                alt="Event Logo"
                className="h-28 w-auto mx-auto mb-6"
              />
            )}        
            {localState.selectedPrizeName && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 inline-flex items-center gap-6 px-8 py-4 bg-white rounded-2xl shadow-lg border"
              >
                {localState.selectedPrizeImage && (
                  <img
                    src={localState.selectedPrizeImage}
                    alt={localState.selectedPrizeName}
                    className="w-16 h-16 object-cover rounded-xl shadow-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div className="text-left">
                  <p className="text-2xl font-bold text-slate-800">{localState.selectedPrizeName}</p>
                  <p className="text-slate-600">Prize for this draw</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center px-8">
            {localState.currentWinners && localState.currentWinners.length > 0 && hasShownResults ? (
              // Winners Display
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-7xl"
              >
                <motion.h2
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-7xl font-bold text-emerald-600 mb-12 text-center"
                >
                  WINNERS!
                </motion.h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-6xl mx-auto">
                  {localState.currentWinners.map((winner, index) => (
                    <motion.div
                      key={winner.id}
                      initial={{ scale: 0, opacity: 0, rotateY: 180 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      transition={{ 
                        delay: 0.5 + (index * 0.2),
                        type: "spring",
                        stiffness: 100
                      }}
                      className="bg-white rounded-3xl p-8 shadow-xl border-2 border-slate-200 text-center relative overflow-hidden"
                    >
                      <div className="relative z-10">
                        <div className="text-6xl mb-6">🏆</div>
                        <div className="text-3xl font-bold text-emerald-500 mb-4">
                          #{index + 1}
                        </div>
                        <p className="text-2xl font-bold text-slate-800 mb-6 leading-tight">
                          {winner.name}
                        </p>
                        
                        {localState.selectedPrizeImage && (
                          <div className="mt-6">
                            <img
                              src={localState.selectedPrizeImage}
                              alt={localState.selectedPrizeName}
                              className="w-24 h-24 object-cover rounded-2xl mx-auto border-4 border-emerald-200 shadow-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            {localState.selectedPrizeName && (
                              <p className="text-lg text-slate-600 mt-3 font-semibold">
                                {localState.selectedPrizeName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-4xl text-center mt-16 text-slate-600"
                >
                  Congratulations to all winners!
                </motion.p>
              </motion.div>
            ) : localState.isDrawing && !hasShownResults ? (
              // Drawing Animation - Large Slots
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-7xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
                  {Array.from({ length: drawCount }).map((_, columnIndex) => (
                    <motion.div
                      key={columnIndex}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: columnIndex * 0.1 }}
                      className="relative"
                    >
                      {/* Large Slot Machine */}
                      <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-200 relative overflow-hidden min-h-[500px]">
                        {/* Prize Background */}
                        {localState.selectedPrizeImage && (
                          <div className="absolute inset-0 opacity-10">
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
                          {/* Position Number */}
                          <div className="text-center mb-6">
                            <motion.div
                              animate={{ 
                                scale: [1, 1.1, 1],
                                color: ["#10b981", "#059669", "#10b981"]
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="text-4xl font-black text-emerald-500"
                            >
                              #{columnIndex + 1}
                            </motion.div>
                          </div>
                          
                          {/* Main Display Area */}
                          <div className="flex-1 flex items-center justify-center relative">
                            <div className="w-full h-64 bg-slate-50 rounded-2xl border-4 border-slate-300 overflow-hidden relative">
                              {/* Show "Ready" state when not spinning */}
                              {!isSpinning ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="bg-slate-100 rounded-xl px-6 py-4 shadow-lg border-2 border-slate-300">
                                      <span className="text-2xl font-bold text-slate-600 block">
                                        Ready
                                      </span>
                                      <span className="text-sm text-slate-500 block mt-1">
                                        Click Start to Begin
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
                                      y: -100, 
                                      opacity: 0, 
                                      scale: 0.8,
                                      filter: "blur(3px)"
                                    }}
                                    animate={{ 
                                      y: 0, 
                                      opacity: 1, 
                                      scale: 1,
                                      filter: "blur(0px)"
                                    }}
                                    exit={{ 
                                      y: 100, 
                                      opacity: 0, 
                                      scale: 0.8,
                                      filter: "blur(3px)"
                                    }}
                                    transition={{ 
                                      duration: animationSpeed / 1000,
                                      ease: "easeInOut"
                                    }}
                                    className="text-center"
                                  >
                                    <div className="bg-white rounded-xl px-6 py-4 shadow-lg border-2 border-emerald-200">
                                      <span className="text-2xl font-bold text-slate-800 block">
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
                            <div className="mt-6 text-center">
                              <img
                                src={localState.selectedPrizeImage}
                                alt={localState.selectedPrizeName}
                                className="w-20 h-20 object-cover rounded-2xl mx-auto opacity-60 shadow-lg"
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
                  className="text-center mt-12"
                >
                  {!isSpinning && (
                    <p className="text-3xl text-slate-600 font-semibold">
                      Waiting for draw to start...
                    </p>
                  )}
                </motion.div>
              </motion.div>
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
                
                {localState.selectedPrizeName && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-12 inline-flex items-center gap-6 px-10 py-6 bg-white rounded-2xl shadow-lg border"
                  >
                    {localState.selectedPrizeImage && (
                      <img
                        src={localState.selectedPrizeImage}
                        alt={localState.selectedPrizeName}
                        className="w-20 h-20 object-cover rounded-2xl shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="text-left">
                      <p className="text-3xl font-bold text-slate-800">{localState.selectedPrizeName}</p>
                      <p className="text-xl text-slate-600">Prize for this draw</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DisplayPage;