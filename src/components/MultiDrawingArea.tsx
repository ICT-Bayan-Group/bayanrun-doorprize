import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Trophy, Users, Gift, Trash2, AlertTriangle, Clock, Target, CheckCircle, XCircle } from 'lucide-react';
import { Participant, Winner, AppSettings, Prize } from '../types';

interface MultiDrawingAreaProps {
  participants: Participant[];
  currentWinners: Winner[];
  isDrawing: boolean;
  settings: AppSettings;
  selectedPrize: Prize | null;
  onStartDraw: () => void;
  onStopDraw: (finalWinners: Winner[]) => void;
  onClearWinners: () => void;
  canDraw: boolean;
  isLocked: boolean;
  prizes: Prize[];
  selectedPrizeId: string | null;
  onRemoveParticipants: (participantIds: string[]) => void;
  updateDrawingState: (state: any) => void;
}

// Enhanced status types for better state management
type RemovalStatus = 'idle' | 'processing' | 'success' | 'error';

interface WinnerProcessingState {
  status: RemovalStatus;
  processedCount: number;
  totalCount: number;
  error?: string;
}

const MultiDrawingArea: React.FC<MultiDrawingAreaProps> = ({
  participants,
  currentWinners,
  isDrawing,
  settings,
  selectedPrize: legacySelectedPrize,
  onStartDraw,
  onStopDraw,
  onClearWinners,
  canDraw,
  isLocked,
  prizes,
  selectedPrizeId,
  onRemoveParticipants,
  updateDrawingState,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [drawingDuration, setDrawingDuration] = useState(0);
  
  // NEW: Pre-determined winners state
  const [predeterminedWinners, setPredeterminedWinners] = useState<Winner[]>([]);
  
  // Enhanced winner processing state
  const [winnerProcessing, setWinnerProcessing] = useState<WinnerProcessingState>({
    status: 'idle',
    processedCount: 0,
    totalCount: 0
  });

  // Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Calculate available participants (excluding current winners)
  const availableParticipants = useMemo(() => {
    const winnerNames = currentWinners.map(winner => winner.name);
    return participants.filter(participant => !winnerNames.includes(participant.name));
  }, [participants, currentWinners]);

  // Calculate draw count
  const drawCount = selectedPrize
    ? Math.min(selectedPrize.remainingQuota, availableParticipants.length)
    : Math.min(settings.multiDrawCount, availableParticipants.length);

  // Timer for drawing duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDrawing) {
      interval = setInterval(() => {
        setDrawingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDrawingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isDrawing]);

  // Enhanced winner processing with better state management
  const processWinnerRemoval = useCallback(async (winners: Winner[]) => {
    if (winners.length === 0) return;

    const winnerParticipantIds = winners.map(winner => {
      const participant = availableParticipants.find(p => p.name === winner.name);
      return participant?.id;
    }).filter(Boolean) as string[];

    if (winnerParticipantIds.length === 0) return;

    setWinnerProcessing({
      status: 'processing',
      processedCount: 0,
      totalCount: winnerParticipantIds.length
    });

    try {
      // Simulate processing steps for better UX
      for (let i = 0; i < winnerParticipantIds.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setWinnerProcessing(prev => ({
          ...prev,
          processedCount: i + 1
        }));
      }

      // Perform the actual removal
      onRemoveParticipants(winnerParticipantIds);

      setWinnerProcessing({
        status: 'success',
        processedCount: winnerParticipantIds.length,
        totalCount: winnerParticipantIds.length
      });

      // Reset status after showing success
      setTimeout(() => {
        setWinnerProcessing({
          status: 'idle',
          processedCount: 0,
          totalCount: 0
        });
      }, 2000);

    } catch (error) {
      setWinnerProcessing({
        status: 'error',
        processedCount: 0,
        totalCount: winnerParticipantIds.length,
        error: 'Failed to remove winners from participant list'
      });

      // Reset error status after showing it
      setTimeout(() => {
        setWinnerProcessing({
          status: 'idle',
          processedCount: 0,
          totalCount: 0
        });
      }, 3000);
    }
  }, [availableParticipants, onRemoveParticipants]);

  // Enhanced draw validation
  const validateDraw = useCallback((): { isValid: boolean; message?: string } => {
    if (!selectedPrize) {
      return { isValid: false, message: 'Please select a prize before starting the draw.' };
    }
    if (selectedPrize.remainingQuota === 0) {
      return { isValid: false, message: 'This prize has no remaining quota.' };
    }
    if (availableParticipants.length === 0) {
      return { isValid: false, message: 'No participants available for drawing (all have already won).' };
    }
    if (drawCount === 0) {
      return { isValid: false, message: 'No winners can be drawn with current settings.' };
    }
    return { isValid: true };
  }, [selectedPrize, availableParticipants, drawCount]);

  // NEW: Generate winners at draw start (not at stop)
  const generateWinners = useCallback((): Winner[] => {
    if (!selectedPrize || availableParticipants.length === 0) return [];

    const shuffledParticipants = [...availableParticipants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffledParticipants.slice(0, drawCount);

    return selectedParticipants.map((participant, index) => ({
      id: `${participant.id}-${Date.now()}-${index}`,
      name: participant.name,
      wonAt: new Date(),
      prizeId: selectedPrize.id,
      prizeName: selectedPrize.name,
      drawSession: `${selectedPrize.id}-${Date.now()}`
    }));
  }, [selectedPrize, availableParticipants, drawCount]);

  // FIXED: Enhanced handleDrawClick - Generate winners immediately
  const handleDrawClick = useCallback(() => {
    const validation = validateDraw();
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }
    
    console.log('Starting draw with prize:', selectedPrize);
    
    // STEP 1: Generate winners immediately and store them
    const finalWinners = generateWinners();
    setPredeterminedWinners(finalWinners);
    
    console.log('Pre-determined winners:', finalWinners);
    
    // STEP 2: Update Firebase state with pre-determined winners
    updateDrawingState({
      isDrawing: true,
      currentWinners: [],
      showConfetti: false,
      shouldStartSpinning: false,
      showWinnerDisplay: false,
      selectedPrizeName: selectedPrize?.name,
      selectedPrizeImage: selectedPrize?.image,
      selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
      participants: participants,
      drawStartTime: Date.now(),
      finalWinners: finalWinners, // Store pre-determined winners
      predeterminedWinners: finalWinners // For display page to use
    });
    
    onStartDraw();
  }, [validateDraw, generateWinners, onStartDraw, updateDrawingState, selectedPrize, participants]);

  // FIXED: handleStartSpinning - Start spinning animation
  const handleStartSpinning = useCallback(() => {
    console.log('Starting spinning animation with pre-determined winners:', predeterminedWinners);
    
    // Update Firebase state to start spinning
    updateDrawingState({
      shouldStartSpinning: true,
      isDrawing: true,
      predeterminedWinners: predeterminedWinners // Pass to display page
    });
  }, [updateDrawingState, predeterminedWinners]);

  // FIXED: handleStopDrawClick - Only trigger natural slowdown
  const handleStopDrawClick = useCallback(async () => {
    console.log('Starting natural slowdown to pre-determined winners:', predeterminedWinners);
    
    if (predeterminedWinners.length === 0) {
      console.error('No pre-determined winners found!');
      return;
    }
    
    // STEP 1: Start natural slowdown process
    updateDrawingState({
      shouldStartSlowdown: true, // NEW: Trigger slowdown
      shouldStartSpinning: true, // Keep spinning during slowdown
      predeterminedWinners: predeterminedWinners
    });
    
    // STEP 2: After 3.5 seconds (3s slowdown + 0.5s buffer), finalize results
    setTimeout(() => {
      console.log('Finalizing results after natural slowdown');
      
      updateDrawingState({
        isDrawing: false,
        shouldStartSpinning: false,
        shouldStartSlowdown: false,
        showWinnerDisplay: true,
        finalWinners: predeterminedWinners,
        currentWinners: predeterminedWinners,
        showConfetti: true
      });
      
      // Call onStopDraw with pre-determined winners
      onStopDraw(predeterminedWinners);
      
      // Process winner removal after draw completion
      setTimeout(() => {
        processWinnerRemoval(predeterminedWinners);
      }, 1000); // Longer delay to ensure everything is settled
      
      // Clear pre-determined winners
      setPredeterminedWinners([]);
      
    }, 3500); // 3.5 second total (3s slowdown + 0.5s buffer)
    
  }, [predeterminedWinners, updateDrawingState, onStopDraw, processWinnerRemoval]);

  // FIXED: Enhanced handleDeleteClick
  const handleDeleteClick = () => setShowDeleteConfirm(true);
  
  const handleConfirmDelete = () => {
    console.log('Clearing winners');
    
    // Clear pre-determined winners
    setPredeterminedWinners([]);
    
    // Update Firebase state
    updateDrawingState({
      showWinnerDisplay: false,
      currentWinners: [],
      finalWinners: [],
      showConfetti: false,
      predeterminedWinners: []
    });
    
    onClearWinners();
    setShowDeleteConfirm(false);
  };
  
  const handleCancelDelete = () => setShowDeleteConfirm(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          Undian Doorprize
        </h2>
        
        {isDrawing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-medium text-sm">
              Undian: {formatTime(drawingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Prize Selection Status */}
      {selectedPrize ? (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center gap-4">
            {selectedPrize.image ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={selectedPrize.image} 
                  alt={selectedPrize.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gift className="w-8 h-8 text-purple-600" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                  Hadiah Terpilih
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Live Update
                </span>
              </div>
              <h3 className="font-semibold text-purple-800 text-lg">{selectedPrize.name}</h3>
              <p className="text-purple-600 text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Draw {drawCount} pemenang{drawCount !== 1 ? 's' : ''} 
                ({selectedPrize.remainingQuota} tersisa)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">Hadiah Tidak Terpilih</p>
              <p className="text-orange-600 text-sm">Silakan pilih hadiah dari daftar hadiah untuk memulai pengundian</p>
            </div>
          </div>
        </div>
      )}

      {/* Draw Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-medium text-sm">Peserta</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{availableParticipants.length}</p>
          <p className="text-xs text-blue-600">
            {participants.length - availableParticipants.length} sudah menang
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium text-sm">Kuota</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{drawCount}</p>
        </div>
      </div>

      {/* Pre-determined Winners Status (for debugging) */}
      {predeterminedWinners.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Pemenang Sudah Ditentukan</p>
              <p className="text-yellow-600 text-sm">
                {predeterminedWinners.length} pemenang siap untuk diumumkan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {availableParticipants.length === 0 && participants.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Tidak ada Peserta Tersisa</p>
              <p className="text-red-600 text-sm">
                Semua peserta sudah menjadi pemenang
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Winner Processing Status */}
      {winnerProcessing.status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg border ${
            winnerProcessing.status === 'processing' ? 'bg-blue-50 border-blue-200' :
            winnerProcessing.status === 'success' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {winnerProcessing.status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
              />
            )}
            {winnerProcessing.status === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {winnerProcessing.status === 'error' && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            
            <div className="flex-1">
              <p className={`font-medium ${
                winnerProcessing.status === 'processing' ? 'text-blue-800' :
                winnerProcessing.status === 'success' ? 'text-green-800' :
                'text-red-800'
              }`}>
                {winnerProcessing.status === 'processing' && 
                  `Processing Winners (${winnerProcessing.processedCount}/${winnerProcessing.totalCount})`
                }
                {winnerProcessing.status === 'success' && 
                  `Successfully processed ${winnerProcessing.totalCount} winner${winnerProcessing.totalCount > 1 ? 's' : ''}`
                }
                {winnerProcessing.status === 'error' && 'Processing Failed'}
              </p>
              
              {winnerProcessing.status === 'processing' && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <motion.div 
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(winnerProcessing.processedCount / winnerProcessing.totalCount) * 100}%` 
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
              
              {winnerProcessing.status === 'success' && (
                <p className="text-green-600 text-sm">
                  Pemenang dihapus dari daftar peserta secara otomatis
                </p>
              )}
              
              {winnerProcessing.status === 'error' && (
                <p className="text-red-600 text-sm">
                  {winnerProcessing.error || 'An error occurred while processing winners'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Drawing Controls */}
      <div className="mb-6">
        <div className="flex space-x-3">
          {!isDrawing ? (
            <button
              onClick={handleDrawClick}
              disabled={!canDraw || isLocked || !selectedPrize || availableParticipants.length === 0}
              className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex-1 justify-center ${
                canDraw && !isLocked && selectedPrize && availableParticipants.length > 0
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              {!selectedPrize 
                ? 'Pilih Hadiah' 
                : availableParticipants.length === 0 
                  ? 'No Available Participants' 
                  : `Generate Winners (${drawCount})`
              }
            </button>
          ) : (
            <div className="flex space-x-3 flex-1">
              <button
                onClick={handleStartSpinning}
                disabled={predeterminedWinners.length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 mr-2" />
                Mulai Spinning!
              </button>
              
              <button
                onClick={handleStopDrawClick}
                disabled={predeterminedWinners.length === 0}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Square className="w-5 h-5 mr-2" />
                Natural Stop (3s)
              </button>
            </div>
          )}

          {currentWinners.length > 0 && !isDrawing && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold transition-all duration-200 hover:shadow-md"
              title="Bersihkan Data Pemenang"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drawing Status */}
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"
                />
                <span className="text-blue-600 font-medium">
                  {predeterminedWinners.length > 0 
                    ? 'Pemenang siap! Klik "Mulai Spinning" → "Natural Stop" untuk efek realistis!'
                    : 'Generating winners... Silakan tunggu!'
                  }
                </span>
              </div>
            </div>
          </motion.div>
        )}
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
            className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-800">Hapus Data Undian</h3>
            </div>

            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus semua pemenang saat ini? Ini akan menghapus {currentWinners.length} winner{currentWinners.length !== 1 ? 's' : ''} dari tampilan.
              <strong className="text-red-600"> Catatan: Ini TIDAK akan mengembalikan pemenang ke daftar peserta.</strong>
            </p>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Hapus 
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Current Winners Display */}
      {currentWinners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Pemenang Terakhir ({currentWinners.length})
            </h3>
            {selectedPrize && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-medium">
                {selectedPrize.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {currentWinners.map((winner, index) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{winner.name}</p>
                      <p className="text-xs text-gray-500">
                        
                      </p>
                    </div>
                  </div>
                  {selectedPrize?.image && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm">
                      <img 
                        src={selectedPrize.image} 
                        alt={selectedPrize.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiDrawingArea;