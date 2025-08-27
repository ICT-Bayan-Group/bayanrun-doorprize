import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Trophy, Users, Gift } from 'lucide-react';
import { Participant, Winner, AppSettings, Prize } from '../types';

interface MultiDrawingAreaProps {
  participants: Participant[];
  currentWinners: Winner[];
  isDrawing: boolean;
  settings: AppSettings;
  selectedPrize: Prize | null;
  onStartDraw: () => void;
  onStopDraw: () => void;
  canDraw: boolean;
  isLocked: boolean;
}

const MultiDrawingArea: React.FC<MultiDrawingAreaProps> = ({
  participants,
  currentWinners,
  isDrawing,
  settings,
  selectedPrize,
  onStartDraw,
  onStopDraw,
  canDraw,
  isLocked,
}) => {
  const drawCount = selectedPrize ? 
    Math.min(selectedPrize.remainingQuota, participants.length) : 
    Math.min(settings.multiDrawCount, participants.length);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Trophy className="w-6 h-6 text-green-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-800">Multi-Winner Drawing</h2>
      </div>

      {/* Drawing Controls */}
      <div className="mb-6">
        {selectedPrize && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Gift className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="font-semibold text-purple-800">{selectedPrize.name}</p>
                <p className="text-sm text-purple-600">
                  {selectedPrize.remainingQuota} remaining
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-600">
            <Users className="w-5 h-5 mr-2" />
            <span className="text-sm">
              Drawing {drawCount} winner{drawCount > 1 ? 's' : ''} from {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          {!isDrawing ? (
            <button
              onClick={onStartDraw}
              disabled={!canDraw || isLocked}
              className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                canDraw && !isLocked
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Drawing
            </button>
          ) : (
            <button
              onClick={onStopDraw}
              className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Drawing
            </button>
          )}
        </div>
      </div>

      {/* Drawing Status */}
      {isDrawing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-800 font-semibold">
              Drawing {drawCount} winners...
            </p>
          </div>
          <p className="text-blue-600 text-sm mt-1">
            Please wait while we select the winners randomly
          </p>
        </div>
      )}

      {/* Current Winners Display - Styled like Winners section */}
      {currentWinners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-green-600">
              🏆 {currentWinners.length} Winner{currentWinners.length > 1 ? 's' : ''} Selected!
            </h3>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentWinners.map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {winner.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(winner.wonAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {winner.prizeName && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                      {winner.prizeName}
                    </span>
                  )}
                  <div className="text-yellow-500">
                    🏆
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Congratulations Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center"
          >
            <p className="text-green-800 font-semibold">
              🎉 Congratulations to all winners! 🎉
            </p>
            <p className="text-green-600 text-sm mt-1">
              Winners have been added to the winners list
            </p>
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {currentWinners.length === 0 && !isDrawing && (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Ready to Draw Winners</p>
          <p className="text-sm">
            {participants.length > 0 
              ? `Click "Start Drawing" to select ${drawCount} random winner${drawCount > 1 ? 's' : ''}`
              : 'Add participants first to start drawing'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MultiDrawingArea;