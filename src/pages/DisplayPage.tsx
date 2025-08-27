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
  
  const [rollingNames, setRollingNames] = useState<string[][]>([]);

  // Listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newState = JSON.parse(localStorage.getItem('doorprize-drawing-state') || '{}');
      if (newState.isDrawing !== undefined) {
        setLocalState({
          ...{
            isDrawing: false,
            currentWinners: [],
            showConfetti: false,
            participants: []
          },
          ...newState
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes (in case both pages are in same tab)
    const interval = setInterval(() => {
      const currentState = JSON.parse(localStorage.getItem('doorprize-drawing-state') || '{}');
      if (JSON.stringify(currentState) !== JSON.stringify(localState)) {
        setLocalState({
          ...{
            isDrawing: false,
            currentWinners: [],
            showConfetti: false,
            participants: []
          },
          ...currentState
        });
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [localState]);

  // Rolling animation effect
  useEffect(() => {
    if (localState.isDrawing && localState.participants && localState.participants.length > 0) {
      const drawCount = Math.min(10, localState.participants.length);
      const interval = setInterval(() => {
        const newRollingNames = Array.from({ length: drawCount }, () => {
          const shuffled = [...localState.participants].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, 5).map(p => p.name);
        });
        setRollingNames(newRollingNames);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setRollingNames([]);
    }
  }, [localState.isDrawing, localState.participants]);

  const drawCount = Math.min(10, localState.participants?.length || 0);

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
            <p className="text-xl font-semibold uppercase">Hadiah :  {localState.selectedPrizeName}</p>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        {localState.currentWinners && localState.currentWinners.length > 0 ? (
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
              className="text-6xl font-bold text-red-600 mb-8 text-center"
            >
              🎉 WINNERS! 🎉
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
                    #{index + 1}
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
              className="text-3xl text-center mt-12 opacity-80"
            >
              Congratulations to all winners! 🎊
            </motion.p>
          </motion.div>
        ) : localState.isDrawing ? (
          // Drawing Animation
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl"
          >
            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-bold text-center mb-12 text-blue-800"
            >
              DRAWING {drawCount} WINNERS...
            </motion.h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: drawCount }).map((_, columnIndex) => (
                <div
                  key={columnIndex}
                  className="bg-orange-100 bg-opacity-80 backdrop-blur-sm rounded-xl p-4 border border-orange-300 h-80 overflow-hidden shadow-md"
                >
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-orange-500">#{columnIndex + 1}</div>
                  </div>
                  
                  <div className="relative h-64 overflow-hidden">
                    <AnimatePresence>
                      {rollingNames[columnIndex]?.map((name, nameIndex) => (
                        <motion.div
                          key={`${columnIndex}-${nameIndex}-${name}`}
                          initial={{ y: 300, opacity: 0 }}
                          animate={{ y: nameIndex * 50, opacity: 1 }}
                          exit={{ y: -50, opacity: 0 }}
                          transition={{ 
                            duration: 0.1,
                            ease: "linear"
                          }}
                          className="absolute w-full text-center py-2"
                        >
                          <div className="bg-orange-400 bg-opacity-70 rounded-lg py-2 px-3">
                            <p className="text-blue-800 font-medium text-sm break-words leading-tight">
                              {name}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-8">
              <div className="flex space-x-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [-15, 15, -15],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-6 h-6 bg-white rounded-full"
                  />
                ))}
              </div>
            </div>
            
            <p className="text-2xl font-semibold text-center mt-6 text-blue-700">
              And the winners are...
            </p>
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
            
            <h2 className="text-5xl font-bold text-blue-800 mb-6">
              Ready for Multi-Winner Draw
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
              Waiting for organizer to start the drawing...
            </p>
            
            <div className="text-lg opacity-50">
              <p>🎁 Good luck to all participants! 🎁</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DisplayPage;