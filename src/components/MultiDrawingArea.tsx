import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Trophy, Users, Gift, Trash2, AlertTriangle } from 'lucide-react';
import { Participant, Winner, AppSettings, Prize } from '../types';

interface MultiDrawingAreaProps {
  participants: Participant[];
  currentWinners: Winner[];
  isDrawing: boolean;
  settings: AppSettings;
  selectedPrize: Prize | null;
  onStartDraw: () => void;
  onStopDraw: () => void;
  onClearWinners: () => void;
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
  onClearWinners,
  canDraw,
  isLocked,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const drawCount = selectedPrize
    ? Math.min(selectedPrize.remainingQuota, participants.length)
    : Math.min(settings.multiDrawCount, participants.length);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (typeof onClearWinners === 'function') {
      onClearWinners();
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Trophy className="w-6 h-6 text-green-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-800">Undian</h2>
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
              Drawing {drawCount} winner{drawCount > 1 ? 's' : ''} from {participants.length}{' '}
              participant{participants.length !== 1 ? 's' : ''}
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

          {currentWinners.length > 0 && !isDrawing && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Clear Winners
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-mx-4 shadow-2xl"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Confirm Delete</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all current winners? This action cannot be undone.
            </p>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Winners Section */}
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
                className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{winner.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(winner.wonAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {winner.prizeName && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    {winner.prizeName}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default MultiDrawingArea;
