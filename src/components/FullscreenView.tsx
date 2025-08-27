import React from 'react';
import { motion } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Winner, AppSettings } from '../types';
import Confetti from 'react-confetti';

interface FullscreenViewProps {
  currentWinner: Winner | null;
  isDrawing: boolean;
  settings: AppSettings;
  onExit: () => void;
  showConfetti: boolean;
}

const FullscreenView: React.FC<FullscreenViewProps> = ({
  currentWinner,
  isDrawing,
  settings,
  onExit,
  showConfetti
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 z-50 flex items-center justify-center text-white">
      {showConfetti && currentWinner && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <button
        onClick={onExit}
        className="absolute top-4 right-4 p-3 bg-black bg-opacity-30 rounded-full hover:bg-opacity-50 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="text-center max-w-4xl mx-auto p-8">
        {settings.eventLogo && (
          <img
            src={settings.eventLogo}
            alt="Event Logo"
            className="h-20 w-auto mx-auto mb-8"
          />
        )}
        
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-6xl font-bold mb-4"
        >
          Bayan Run 2025
        </motion.h1>
        
        <motion.p
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl mb-12 opacity-90"
        >
          Doorprize Drawing
        </motion.p>

        {currentWinner ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            className="space-y-8"
          >
            <div className="text-8xl mb-8">🎉</div>
            
            <motion.h2
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-5xl font-bold text-yellow-400 mb-6"
            >
              WINNER!
            </motion.h2>
            
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl p-12 border border-white border-opacity-30"
            >
              <p className="text-7xl font-bold text-white">
                {currentWinner.name}
              </p>
            </motion.div>
          </motion.div>
        ) : isDrawing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
              className="inline-block"
            >
              <Trophy className="w-32 h-32 text-yellow-400" />
            </motion.div>
            
            <h2 className="text-5xl font-bold">
              Drawing Winner...
            </h2>
            
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [-10, 10, -10],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-4 h-4 bg-white rounded-full"
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto" />
            <h2 className="text-4xl font-bold opacity-70">
              Ready to Draw Winner
            </h2>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FullscreenView;