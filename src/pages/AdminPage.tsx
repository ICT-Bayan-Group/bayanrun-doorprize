import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { Participant, Winner, AppSettings, Prize } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useFirebaseDrawingState } from '../hooks/useFirebaseDrawingState';
import { exportToCsv } from '../utils/fileHandling';

import Header from '../components/Header';
import ParticipantManager from '../components/ParticipantManager';
import MultiDrawingArea from '../components/MultiDrawingArea';
import WinnerHistory from '../components/WinnerHistory';
import PrizeManager from '../components/PrizeManager';
import SettingsModal from '../components/SettingsModal';

const defaultSettings: AppSettings = {
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  animationType: 'wheel',
  soundEnabled: true,
  backgroundMusic: false,
  multiDrawCount: 10,
};

interface AdminPageProps {
  onLogout?: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
  // Firebase hooks
  const participantsHook = useFirestore<Participant>('participants', 'addedAt');
  const winnersHook = useFirestore<Winner>('winners', 'wonAt');
  const prizesHook = useFirestore<Prize>('prizes', 'createdAt');
  const settingsHook = useFirestore<AppSettings & { id: string }>('settings');
  const { drawingState, updateDrawingState } = useFirebaseDrawingState();
  
  // Extract data from hooks
  const participants = participantsHook.data;
  const winners = winnersHook.data;
  const prizes = prizesHook.data;
  const settings = settingsHook.data[0] || defaultSettings;
  
  const [currentWinners, setCurrentWinners] = useState<Winner[]>(drawingState.currentWinners || []);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(drawingState.isDrawing || false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfetti, setShowConfetti] = useState(drawingState.showConfetti || false);

  // Loading state
  const isLoading = participantsHook.loading || winnersHook.loading || prizesHook.loading || settingsHook.loading;

  // Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // Sync local state with Firebase drawing state
  React.useEffect(() => {
    setCurrentWinners(drawingState.currentWinners || []);
    setIsDrawing(drawingState.isDrawing || false);
    setShowConfetti(drawingState.showConfetti || false);
  }, [drawingState]);

  const addParticipant = useCallback((name: string) => {
    const newParticipant: Omit<Participant, 'id'> = {
      name,
      addedAt: new Date(),
    };
    participantsHook.add(newParticipant);
  }, [participantsHook]);

  const addMultipleParticipants = useCallback((names: string[]) => {
    const promises = names.map(name => participantsHook.add({
      name,
      addedAt: new Date(),
    }));
    Promise.all(promises).catch(console.error);
  }, [participantsHook]);

  const removeParticipant = useCallback((id: string) => {
    participantsHook.remove(id);
  }, [participantsHook]);

  const removeParticipants = useCallback((participantIds: string[]) => {
    participantsHook.removeMultiple(participantIds);
  }, [participantsHook]);

  const clearAllParticipants = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all participants?')) {
      participantsHook.clear();
    }
  }, [participantsHook]);

  // Start drawing - simplified since winners are now generated in MultiDrawingArea
  const startDrawing = useCallback(() => {
    if (participants.length === 0 || isDrawing) return;
    
    console.log('Admin: Starting draw with participants:', participants.length);
    
    setIsDrawing(true);
    setCurrentWinners([]);
    setShowConfetti(false);
    
    // Basic Firebase state - winners will be generated in MultiDrawingArea
    updateDrawingState({
      isDrawing: true,
      currentWinners: [],
      showConfetti: false,
      selectedPrizeName: selectedPrize?.name,
      selectedPrizeImage: selectedPrize?.image,
      selectedPrizeQuota: selectedPrize?.remainingQuota || 1,
      participants: participants,
      drawStartTime: Date.now(),
      showWinnerDisplay: false,
      shouldStartSpinning: false,
      shouldResetToReady: false,
      shouldStartSlowdown: false
    });
  }, [participants, isDrawing, selectedPrize, updateDrawingState]);

  // Stop drawing - handles pre-determined winners from MultiDrawingArea
  const stopDrawing = useCallback((finalWinners?: Winner[]) => {
    if (!isDrawing) return;

    console.log('Admin: Processing final winners:', finalWinners);

    if (!finalWinners || finalWinners.length === 0) {
      console.error('Admin: No final winners provided');
      return;
    }

    // These winners are already generated and passed from MultiDrawingArea
    const newWinners = finalWinners;
    
    // Add to winners database
    newWinners.forEach(winner => winnersHook.add(winner));
    
    // Update prize quota if prize was selected
    if (selectedPrize) {
      const newQuota = Math.max(0, selectedPrize.remainingQuota - newWinners.length);
      prizesHook.update(selectedPrize.id, {
        remainingQuota: newQuota
      });
      
      // Clear selected prize if quota is exhausted
      if (newQuota <= 0) {
        setSelectedPrizeId(null);
      }
    }
    
    // Set current winners
    setCurrentWinners(newWinners);
    
    // Show confetti - NO AUTO-HIDE, controlled by admin
    setShowConfetti(true);
    
    // Play sound effect
    if (settings.soundEnabled) {
      try {
        const audio = new Audio('/celebration-sound.mp3');
        audio.play().catch(() => console.log('Could not play sound'));
      } catch (error) {
        console.log('Sound not available');
      }
    }
    
    setIsDrawing(false);
  }, [isDrawing, selectedPrize, settings, winnersHook, prizesHook, setSelectedPrizeId]);

  // Clear current winners - MANUAL CONTROL
  const clearCurrentWinners = useCallback(() => {
    console.log('Admin: Manually clearing current winners');
    
    setCurrentWinners([]);
    setShowConfetti(false); // Manual confetti control
    
    updateDrawingState({ 
      currentWinners: [], 
      showConfetti: false,
      showWinnerDisplay: false,
      finalWinners: [],
      predeterminedWinners: [],
      shouldStartSlowdown: false,
      shouldStartSpinning: false
    });
  }, [updateDrawingState]);

  // NEW: Manual confetti control
  const toggleConfetti = useCallback(() => {
    const newShowConfetti = !showConfetti;
    setShowConfetti(newShowConfetti);
    updateDrawingState({ showConfetti: newShowConfetti });
    console.log('Admin: Manual confetti toggle:', newShowConfetti);
  }, [showConfetti, updateDrawingState]);

  // Prize management functions
  const addPrize = useCallback((prizeData: Omit<Prize, 'id' | 'createdAt'>) => {
    const newPrize: Omit<Prize, 'id'> = {
      ...prizeData,
      createdAt: new Date(),
    };
    prizesHook.add(newPrize);
  }, [prizesHook]);

  const updatePrize = useCallback((id: string, updates: Partial<Prize>) => {
    prizesHook.update(id, updates);
  }, [prizesHook]);

  const deletePrize = useCallback((id: string) => {
    prizesHook.remove(id);
    // Clear selection if deleted prize was selected
    if (selectedPrizeId === id) {
      setSelectedPrizeId(null);
    }
  }, [prizesHook, selectedPrizeId]);

  // Prize selection handler
  const handleSelectPrize = useCallback((prize: Prize | null) => {
    console.log('Admin: Prize selected:', prize?.name);
    setSelectedPrizeId(prize?.id || null);
  }, []);

  const handleExport = useCallback(() => {
    exportToCsv(participants, winners as any);
  }, [participants, winners]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
        <head>
          <title>Bayan Run 2025 - Winners List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2563eb; }
            .winner { margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #2563eb; }
            .prize-section { margin: 20px 0; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Bayan Run 2025 - Doorprize Winners</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          ${winners.reduce((acc, winner, index) => {
            const prizeSection = winner.prizeName && !acc.includes(winner.prizeName) ? 
              `<div class="prize-section"><h2>🏆 ${winner.prizeName}</h2></div>` : '';
            return acc + prizeSection + `
              <div class="winner">
                <strong>${index + 1}. ${winner.name}</strong><br>
                <small>Won on: ${new Date(winner.wonAt).toLocaleString()}</small>
                ${winner.prizeName ? `<br><em>Prize: ${winner.prizeName}</em>` : ''}
              </div>
            `;
          }, '')}
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }, [winners]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    if (settings.id) {
      settingsHook.update(settings.id, updatedSettings);
    } else {
      settingsHook.add(updatedSettings);
    }
  }, [settings, settingsHook]);

  const openDisplayPage = useCallback(() => {
    window.open('/display', '_blank');
  }, []);

  const canDraw = participants.length > 0 && !isDrawing && !isLocked;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <Header
        logo={settings.eventLogo}
        isFullscreen={false}
        isLocked={isLocked}
        onToggleFullscreen={openDisplayPage}
        onToggleLock={() => setIsLocked(prev => !prev)}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={onLogout}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Display Page Link */}
        <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Halaman Display</h3>
              <p className="text-blue-600">Buka Halaman ini untuk menampilkan ke para pengunjung</p>
            </div>
            <button
              onClick={openDisplayPage}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Display
            </button>
          </div>
        </div>

        {/* NEW: Manual Control Panel */}
        {currentWinners.length > 0 && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">Kontrol Manual Display</h3>
                <p className="text-green-600">Tampilan pemenang saat ini aktif - kontrol penuh ada di tangan admin</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={toggleConfetti}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    showConfetti
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {showConfetti ? 'Stop Confetti' : 'Start Confetti'}
                </button>
                <button
                  onClick={clearCurrentWinners}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Clear Display
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slowdown Status Indicator */}
        {drawingState.shouldStartSlowdown && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">Natural Slowdown Active</h3>
                  <p className="text-yellow-600">Animasi sedang melambat secara natural menuju pemenang yang sudah ditentukan...</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Participants */}
          <div className="space-y-6">
            <ParticipantManager
              participants={participants}
              onAddParticipant={addParticipant}
              onRemoveParticipant={removeParticipant}
              onClearAll={clearAllParticipants}
              onImportParticipants={addMultipleParticipants}
              isLocked={isLocked}
            />
          </div>

          {/* Center Left - Prize Management */}
          <div className="space-y-6">
            <PrizeManager
              prizes={prizes}
              onAddPrize={addPrize}
              onUpdatePrize={updatePrize}
              onDeletePrize={deletePrize}
              selectedPrize={selectedPrize}
              onSelectPrize={handleSelectPrize}
              isLocked={isLocked}
            />
          </div>

          {/* Center Right - Drawing Area */}
          <div>
            <MultiDrawingArea
              participants={participants}
              currentWinners={currentWinners}
              isDrawing={isDrawing}
              settings={settings}
              selectedPrize={selectedPrize}
              onStartDraw={startDrawing}
              onStopDraw={stopDrawing}
              onClearWinners={clearCurrentWinners}
              canDraw={canDraw}
              isLocked={isLocked}
              prizes={prizes}
              selectedPrizeId={selectedPrizeId}
              onRemoveParticipants={removeParticipants}
              updateDrawingState={updateDrawingState}
            />
          </div>

          {/* Right Column - Winners */}
          <div>
            <WinnerHistory
              winners={winners}
              isLocked={isLocked}
            />
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          🔒 Terkunci
        </motion.div>
      )}
    </div>
  );
};

export default AdminPage;