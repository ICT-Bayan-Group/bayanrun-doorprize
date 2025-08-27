import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, RotateCcw } from 'lucide-react';
import { Participant, Winner, AppSettings } from '../types';
import { wheelSpinVariants, scrollTextVariants, cardShuffleVariants } from '../utils/animations';

interface DrawingAreaProps {
  participants: Participant[];
  currentWinner: Winner | null;
  isDrawing: boolean;
  settings: AppSettings;
  onDraw: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isLocked: boolean;
}

const DrawingArea: React.FC<DrawingAreaProps> = ({
  participants,
  currentWinner,
  isDrawing,
  settings,
  onDraw,
  onUndo,
  canUndo,
  isLocked
}) => {
  const canDraw = participants.length > 0 && !isDrawing && !isLocked;

  const renderAnimation = () => {
    switch (settings.animationType) {
      case 'wheel':
        return (
          <motion.div
            variants={wheelSpinVariants}
            animate={isDrawing ? 'spinning' : 'idle'}
            className="w-64 h-64 rounded-full border-8 border-blue-500 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg"
            style={{ borderColor: settings.primaryColor }}
          >
            <div className="text-white text-center">
              <Shuffle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">Drawing...</p>
            </div>
          </motion.div>
        );
      
      case 'scroll':
        return (
          <div className="w-80 h-32 bg-gray-100 rounded-lg border-4 overflow-hidden relative"
               style={{ borderColor: settings.primaryColor }}>
            <AnimatePresence>
              {isDrawing && (
                <motion.div
                  variants={scrollTextVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
                  style={{ color: settings.primaryColor }}
                >
                  Selecting Winner...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      
      case 'cards':
        return (
          <motion.div
            variants={cardShuffleVariants}
            animate={isDrawing ? 'animate' : 'initial'}
            className="w-48 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` 
            }}
          >
            <Shuffle className="w-12 h-12 text-white" />
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <h2 className="text-2xl font-semibold text-gray-800 mb-8">Random Drawing</h2>
      
      <div className="flex flex-col items-center space-y-8">
        {currentWinner ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl font-bold text-green-600 mb-2">Winner!</h3>
            <p className="text-4xl font-bold text-gray-800 p-6 bg-yellow-100 rounded-lg border-4 border-yellow-400">
              {currentWinner.name}
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center">
            {renderAnimation()}
            
            <div className="mt-8 text-gray-600">
              {participants.length === 0 ? (
                <p>Add participants to start drawing</p>
              ) : isDrawing ? (
                <p>Drawing a winner...</p>
              ) : (
                <p>{participants.length} participant{participants.length !== 1 ? 's' : ''} ready</p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={onDraw}
            disabled={!canDraw}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold flex items-center gap-3"
            style={{ 
              backgroundColor: canDraw ? settings.primaryColor : undefined,
              ...(canDraw && {
                ':hover': {
                  backgroundColor: settings.secondaryColor
                }
              })
            }}
          >
            <Shuffle className="w-6 h-6" />
            {isDrawing ? 'Drawing...' : 'Draw Winner'}
          </button>
          
          {canUndo && !isLocked && (
            <button
              onClick={onUndo}
              className="px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Undo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawingArea;