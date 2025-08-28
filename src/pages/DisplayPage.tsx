import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Winner, AppSettings, Participant } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Confetti from 'react-confetti';

interface DrawingState {
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
  selectedPrizeName?: string;
  participants: Participant[];
  drawStartTime?: number; // Add timestamp to detect new draws
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
    participants: []
  });

  const [localState, setLocalState] = useState<DrawingState>({
    ...{
      isDrawing: false,
      currentWinners: [],
      showConfetti: false,
      participants: []
    },
    ...drawingState
  });
  
  const [rollingNames, setRollingNames] = useState<string[]>([]);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [participantsSnapshot, setParticipantsSnapshot] = useState<Participant[]>([]);
  const [lastDrawStartTime, setLastDrawStartTime] = useState<number | null>(null);
  const [hasShownResults, setHasShownResults] = useState(false); // New state to track if results have been shown

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
            participants: []
          },
          ...newState
        };
        
        // Check if this is a new draw (different start time or transitioning from not drawing to drawing)
        if (updatedState.isDrawing && (!localState.isDrawing || updatedState.drawStartTime !== lastDrawStartTime)) {
          // Snapshot participants at the start of drawing to prevent new additions from showing
          setParticipantsSnapshot(updatedState.participants || []);
          setLastDrawStartTime(updatedState.drawStartTime || Date.now());
          setAnimationSpeed(100); // Reset animation speed
          setHasShownResults(false); // Reset results flag for new draw
        }
        
        // If we have winners and drawing is finished, mark results as shown
        if (!updatedState.isDrawing && updatedState.currentWinners && updatedState.currentWinners.length > 0) {
          setHasShownResults(true);
        }
        
        // Reset hasShownResults only if we're starting a completely new draw or clearing winners
        if (updatedState.currentWinners?.length === 0) {
          setHasShownResults(false);
        }
        
        setLocalState(updatedState);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes (in case both pages are in same tab)
    const interval = setInterval(() => {
      const currentState = JSON.parse(localStorage.getItem('doorprize-drawing-state') || '{}');
      if (JSON.stringify(currentState) !== JSON.stringify(localState)) {
        const updatedState = {
          ...{
            isDrawing: false,
            currentWinners: [],
            showConfetti: false,
            participants: []
          },
          ...currentState
        };
        
        // Check if this is a new draw
        if (updatedState.isDrawing && (!localState.isDrawing || updatedState.drawStartTime !== lastDrawStartTime)) {
          setParticipantsSnapshot(updatedState.participants || []);
          setLastDrawStartTime(updatedState.drawStartTime || Date.now());
          setAnimationSpeed(100);
          setHasShownResults(false);
        }
        
        // If we have winners and drawing is finished, mark results as shown
        if (!updatedState.isDrawing && updatedState.currentWinners && updatedState.currentWinners.length > 0) {
          setHasShownResults(true);
        }
        
        // Reset hasShownResults only if we're starting a completely new draw or clearing winners
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
  }, [localState, lastDrawStartTime]);

  // Improved rolling animation effect with multiple names per column
  useEffect(() => {
    if (localState.isDrawing && participantsSnapshot.length > 0 && !hasShownResults) {
      const drawCount = Math.min(10, participantsSnapshot.length);
      
      // Gradually slow down the animation
      const slowDownInterval = setInterval(() => {
        setAnimationSpeed(prev => Math.min(prev + 25, 350));
      }, 1500);

      const interval = setInterval(() => {
        const newRollingNames = Array.from({ length: drawCount }, (_, columnIndex) => {
          // Create different animation patterns for each column
          const shuffled = [...participantsSnapshot]
            .sort(() => Math.random() - 0.5)
            .slice(0, 12) // More names for smoother scrolling
            .map(p => p.name);
          
          // Add some variety by repeating some names
          const extendedNames = [...shuffled, ...shuffled.slice(0, 6)];
          return extendedNames[Math.floor(Math.random() * extendedNames.length)] || '';
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
  }, [localState.isDrawing, participantsSnapshot, animationSpeed, hasShownResults]);

  const drawCount = Math.min(10, participantsSnapshot.length || localState.participants?.length || 0);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-orange-100 to-orange-300 flex flex-col text-blue-800 overflow-hidden">
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
      <div className="text-center py-8">
        {settings.eventLogo && (
          <motion.img
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            src={settings.eventLogo}
            alt="Event Logo"
            className="h-24 w-auto mx-auto mb-4"
          />
        )}
        
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl font-extrabold italic mb-2 text-red-600"
        >
          DOORPRIZE DRAWING
        </motion.h1>
        
        {localState.selectedPrizeName && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 inline-block px-6 py-3 bg-blue-800 text-white rounded-full"
          >
            <p className="text-xl font-semibold uppercase">Hadiah: {localState.selectedPrizeName}</p>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        {localState.currentWinners && localState.currentWinners.length > 0 && hasShownResults ? (
          // Winners Display - Only show when results have been shown and we're not drawing
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl"
          >
            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-6xl font-bold text-red-600 mb-8 text-center"
            >
              🎉 PEMENANG! 🎉
            </motion.h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
                  className="bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-gray-300 text-center shadow-lg"
                >
                  <div className="text-4xl mb-4">🏆</div>
                  <div className="text-2xl font-bold text-orange-500 mb-2">
                    {index + 1}
                  </div>
                  <p className="text-xl font-semibold text-blue-800 break-words leading-tight">
                    {winner.name}
                  </p>
                </motion.div>
              ))}
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-3xl text-center mt-12 opacity-80 uppercase"
            >
            Selamat untuk semua pemenang! 🎊
            </motion.p>
          </motion.div>
        ) : localState.isDrawing && !hasShownResults ? (
          // EPIC SLOT MACHINE DRAWING ANIMATION - Made wider with fewer columns
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-7xl"
          >
            {/* Dynamic Header with Pulsing Effect */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                textShadow: [
                  "0px 0px 20px rgba(59, 130, 246, 0.5)",
                  "0px 0px 30px rgba(59, 130, 246, 0.8)",
                  "0px 0px 20px rgba(59, 130, 246, 0.5)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-center mb-12"
            >
            </motion.div>
            
            {/* EPIC SLOT MACHINE GRID - Moderately wider */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-4 mb-8">
              {Array.from({ length: drawCount }).map((_, columnIndex) => (
                <motion.div
                  key={columnIndex}
                  initial={{ y: 50, opacity: 0, rotateX: -30 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1, 
                    rotateX: 0,
                    boxShadow: [
                      "0px 10px 30px rgba(0,0,0,0.2)",
                      "0px 15px 40px rgba(249, 115, 22, 0.4)",
                      "0px 10px 30px rgba(0,0,0,0.2)"
                    ]
                  }}
                  transition={{ 
                    delay: columnIndex * 0.1,
                    duration: 0.6,
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="relative w-full max-w-[140px] mx-auto"
                >
                  {/* Slot Machine Frame - Moderately sized */}
                  <div className="bg-gradient-to-b from-yellow-400 via-orange-400 to-red-500 rounded-2xl p-1.5 shadow-2xl relative overflow-hidden">
                    {/* Metallic Border Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse rounded-2xl"></div>
                    
                    {/* Position Number */}
                    <div className="text-center py-2 relative z-20">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          color: ["#f97316", "#dc2626", "#f97316"]
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-xl font-black text-white drop-shadow-lg"
                      >
                        {columnIndex + 1}
                      </motion.div>
                    </div>
                    
                    {/* MAIN SLOT WINDOW - Moderately sized */}
                    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl h-72 overflow-hidden relative border-4 border-yellow-300 shadow-inner mx-1">
                      {/* Slot Reel Background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-blue-900 opacity-80"></div>
                      
                      {/* Spinning Names Effect */}
                      <div className="relative h-full flex flex-col justify-center items-center overflow-hidden px-2">
                        {/* Current Name Display - Moderately sized */}
                        <motion.div
                          key={`slot-${columnIndex}-${rollingNames[columnIndex]}-${Date.now()}`}
                          initial={{ 
                            y: -60, 
                            opacity: 0, 
                            scale: 0.7,
                            rotateX: 90,
                            filter: "blur(5px)"
                          }}
                          animate={{ 
                            y: 0, 
                            opacity: 1, 
                            scale: 1,
                            rotateX: 0,
                            filter: "blur(0px)",
                            textShadow: [
                              "0px 0px 10px rgba(255,255,255,0.8)",
                              "0px 0px 20px rgba(59, 130, 246, 1)",
                              "0px 0px 10px rgba(255,255,255,0.8)"
                            ]
                          }}
                          exit={{ 
                            y: 60, 
                            opacity: 0, 
                            scale: 0.7,
                            rotateX: -90,
                            filter: "blur(5px)"
                          }}
                          transition={{ 
                            duration: animationSpeed / 1200,
                            ease: "easeInOut",
                            textShadow: { duration: 0.8, repeat: Infinity }
                          }}
                          className="absolute inset-x-1 flex items-center justify-center"
                        >
                          <div className="bg-gradient-to-r from-yellow-300 via-white to-yellow-300 text-gray-900 font-black text-sm px-3 py-2 rounded-lg shadow-lg border-2 border-yellow-400 text-center min-h-[3rem] w-full flex items-center justify-center leading-tight transform perspective-1000">
                            <span className="drop-shadow-sm break-words text-xs">
                              {rollingNames[columnIndex] || '...'}
                            </span>
                          </div>
                        </motion.div>
                        
                        {/* Blur Trail Effect */}
                        <motion.div
                          animate={{
                            y: [-20, 20, -20],
                            opacity: [0.3, 0.1, 0.3]
                          }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="absolute inset-x-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold text-xs px-2 py-1 rounded opacity-30 blur-sm"
                        >
                          <span>{participantsSnapshot[Math.floor(Math.random() * participantsSnapshot.length)]?.name || '...'}</span>
                        </motion.div>
                      </div>
                      
                      {/* Slot Machine Light Effects */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent animate-pulse"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent animate-pulse"></div>
                      
                      {/* Side Glow Effects */}
                      <motion.div
                        animate={{ 
                          x: [-5, 5, -5],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-yellow-400 via-orange-400 to-red-400 rounded-l-xl"
                      ></motion.div>
                      <motion.div
                        animate={{ 
                          x: [5, -5, 5],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-yellow-400 via-orange-400 to-red-400 rounded-r-xl"
                      ></motion.div>
                    </div>
                    
                    {/* Decorative Lights - Normal size */}
                    <div className="flex justify-between px-2 py-2">
                      <motion.div
                        animate={{ 
                          backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#ef4444"]
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-3 h-3 rounded-full shadow-lg"
                      ></motion.div>
                      <motion.div
                        animate={{ 
                          backgroundColor: ["#3b82f6", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]
                        }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                        className="w-3 h-3 rounded-full shadow-lg"
                      ></motion.div>
                      <motion.div
                        animate={{ 
                          backgroundColor: ["#22c55e", "#3b82f6", "#ef4444", "#f97316", "#eab308", "#22c55e"]
                        }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                        className="w-3 h-3 rounded-full shadow-lg"
                      ></motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Dynamic Footer Text */}
            <motion.div
              animate={{ 
                opacity: [0.7, 1, 0.7],
                y: [0, -5, 0]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="text-center"
            >
              <p className="text-3xl font-black bg-clip-text italic drop-shadow-lg">
                🎉 THE WINNERS ARE COMING... 🎉
              </p>
              <p className="text-lg text-gray-600 mt-2 font-semibold">
                Doorprize Bayan Run 2025
              </p>
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
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
            </motion.div>
            
            <h2 className="text-5xl font-bold text-blue-800 mb-6 uppercase italic">
              Siapkah Anda untuk menang?
            </h2>
            
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto mb-8">
              {Array.from({ length: Math.min(10, drawCount) }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center shadow-sm"
                >
                  <span className="text-blue-800 font-bold">{i + 1}</span>
                </motion.div>
              ))}
            </div>
            
            <p className="text-2xl opacity-60 mb-8">
             Menunggu untuk memulai pengundian...
            </p>
            
            <div className="text-lg opacity-50 uppercase">
              <p>Semoga Beruntung untuk semua partisipan Bayan Run 2025 !!</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DisplayPage;