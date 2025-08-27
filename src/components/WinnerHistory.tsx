import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Download, Printer } from 'lucide-react';
import { Winner, Prize } from '../types';

interface WinnerHistoryProps {
  winners: Winner[];
  prizes: Prize[];
  onExport: () => void;
  onPrint: () => void;
  isLocked: boolean;
}

const WinnerHistory: React.FC<WinnerHistoryProps> = ({
  winners,
  prizes,
  onExport,
  onPrint,
  isLocked
}) => {
  // Group winners by draw session or prize
  const groupedWinners = winners.reduce((acc, winner) => {
    const key = winner.drawSession || new Date(winner.wonAt).toISOString().split('T')[0];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(winner);
    return acc;
  }, {} as Record<string, Winner[]>);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Winners ({winners.length})
        </h2>
        
        {winners.length > 0 && !isLocked && (
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onPrint}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {Object.entries(groupedWinners).map(([sessionKey, sessionWinners], sessionIndex) => (
            <div key={sessionKey} className="mb-6">
              {sessionWinners[0].prizeName && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                    🏆 {sessionWinners[0].prizeName}
                  </h3>
                  <p className="text-sm text-purple-600">
                    {sessionWinners.length} winner{sessionWinners.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                {sessionWinners.map((winner, index) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: (sessionIndex * sessionWinners.length + index) * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{winner.name}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(winner.wonAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Single winners (not part of multi-draw sessions) */}
          {winners.filter(w => !w.drawSession).map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{winner.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(winner.wonAt).toLocaleString()}
                  </p>
                  {winner.prizeName && (
                    <p className="text-xs text-purple-600">🏆 {winner.prizeName}</p>
                  )}
                </div>
              </div>
              <Trophy className="w-6 h-6 text-yellow-500" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {winners.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No winners yet</p>
            <p className="text-sm">Winners will appear here after drawing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WinnerHistory;