import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(drawingState.selectedPrizeId || null);
  const [isDrawing, setIsDrawing] = useState(drawingState.isDrawing || false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfetti, setShowConfetti] = useState(drawingState.showConfetti || false);

  // NEW: VIP control monitoring
  const [vipControlActive, setVipControlActive] = useState(false);

  // Loading state
  const isLoading = participantsHook.loading || winnersHook.loading || prizesHook.loading || settingsHook.loading;

  // Real-time prize synchronization
  const selectedPrize = useMemo(() => {
    if (!selectedPrizeId) return null;
    return prizes.find(prize => prize.id === selectedPrizeId) || null;
  }, [prizes, selectedPrizeId]);

  // ENHANCED: Monitor VIP control activity with better detection
  useEffect(() => {
    const checkVipControl = () => {
      const vipProcessed = drawingState.vipProcessedWinners || 
                          drawingState.vipControlActive || 
                          localStorage.getItem('vipProcessedWinners') === 'true';
      setVipControlActive(vipProcessed);
      
      if (vipProcessed && !vipControlActive) {
        console.log('Admin: VIP control terdeteksi, beralih ke mode monitoring');
      }
    };
    
    checkVipControl();
    
    // Set up periodic check for VIP control changes
    const interval = setInterval(checkVipControl, 500);
    return () => clearInterval(interval);
  }, [drawingState, vipControlActive]);

  // Sync local state with Firebase drawing state
  useEffect(() => {
    setCurrentWinners(drawingState.currentWinners || []);
    setIsDrawing(drawingState.isDrawing || false);
    setShowConfetti(drawingState.showConfetti || false);
    
    // Sync selected prize
    if (drawingState.selectedPrizeId !== undefined) {
      setSelectedPrizeId(drawingState.selectedPrizeId);
    }
    
    // ENHANCED: Handle VIP processed winners immediately
    if (drawingState.vipProcessedWinners && drawingState.currentWinners?.length > 0) {
      console.log('Admin: VIP telah memproses pemenang, memperbarui tampilan');
      setCurrentWinners(drawingState.currentWinners);
      setShowConfetti(drawingState.showConfetti || false);
      setVipControlActive(true);
    }
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
    if (window.confirm('Apakah Anda yakin ingin menghapus semua peserta?')) {
      participantsHook.clear();
    }
  }, [participantsHook]);

  // Start drawing - simplified since winners are now generated in MultiDrawingArea
  const startDrawing = useCallback(() => {
    if (participants.length === 0 || isDrawing) return;
    
    console.log('Admin: Memulai undian dengan peserta:', participants.length);
    
    // Clear VIP flags when starting new draw
    setVipControlActive(false);
    
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
      selectedPrizeId: selectedPrize?.id || null,
      participants: participants,
      drawStartTime: Date.now(),
      showWinnerDisplay: false,
      shouldStartSpinning: false,
      shouldResetToReady: false,
      shouldStartSlowdown: false,
      vipProcessedWinners: false // Reset VIP flag
    });
  }, [participants, isDrawing, selectedPrize, updateDrawingState]);

  // ENHANCED: Stop drawing - handles VIP processing check
  const stopDrawing = useCallback((finalWinners?: Winner[]) => {
    if (!isDrawing) return;

    console.log('Admin: Memproses pemenang akhir:', finalWinners);

    // ENHANCED: Check if VIP has already processed winners with multiple sources
    const vipProcessed = drawingState.vipProcessedWinners || 
                        drawingState.vipControlActive || 
                        vipControlActive ||
                        localStorage.getItem('vipProcessedWinners') === 'true';
    
    if (vipProcessed && (!finalWinners || finalWinners.length === 0)) {
      console.log('Admin: VIP telah memproses pemenang, melewati operasi database');
      
      // ENHANCED: Set current winners from drawing state with validation
      const winnersFromState = drawingState.currentWinners || drawingState.finalWinners || [];
      
      if (winnersFromState.length === 0) {
        console.warn('Admin: Tidak ada pemenang yang ditemukan dalam status yang diproses VIP');
        setIsDrawing(false);
        return;
      }
      
      setCurrentWinners(winnersFromState);
      
      // Show confetti - NO AUTO-HIDE, controlled by admin
      setShowConfetti(true);
      
      // Play sound effect
      if (settings.soundEnabled) {
        try {
          const audio = new Audio('/celebration-sound.mp3');
          audio.play().catch(() => console.log('Tidak dapat memutar suara'));
        } catch (error) {
          console.log('Suara tidak tersedia');
        }
      }
      
      setIsDrawing(false);
      return;
    }

    // ENHANCED: Validate final winners before processing
    if (!finalWinners || finalWinners.length === 0) {
      console.error('Admin: Tidak ada pemenang akhir yang diberikan dan VIP belum memproses');
      setIsDrawing(false);
      return;
    }

    // Admin processing (when VIP hasn't processed)
    const newWinners = finalWinners;
    
    // ENHANCED: Add to winners database with duplicate check
    const existingWinnerNames = winners.map(w => w.name);
    const uniqueNewWinners = newWinners.filter(winner => 
      !existingWinnerNames.includes(winner.name)
    );
    
    if (uniqueNewWinners.length > 0) {
      uniqueNewWinners.forEach(winner => winnersHook.add(winner));
      console.log('Admin: Menambahkan', uniqueNewWinners.length, 'pemenang baru ke database');
    } else {
      console.log('Admin: Semua pemenang sudah ada dalam database');
    }
    
    // Update prize quota if prize was selected
    if (selectedPrize) {
      const newQuota = Math.max(0, selectedPrize.remainingQuota - uniqueNewWinners.length);
      prizesHook.update(selectedPrize.id, {
        remainingQuota: newQuota
      });
      
      // Clear selected prize if quota is exhausted
      if (newQuota <= 0) {
        setSelectedPrizeId(null);
        updateDrawingState({
          selectedPrizeId: null
        });
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
        audio.play().catch(() => console.log('Tidak dapat memutar suara'));
      } catch (error) {
        console.log('Suara tidak tersedia');
      }
    }
    
    setIsDrawing(false);
  }, [isDrawing, selectedPrize, settings, winnersHook, prizesHook, setSelectedPrizeId, drawingState, vipControlActive, winners]);

  // Clear current winners - MANUAL CONTROL
  const clearCurrentWinners = useCallback(() => {
    console.log('Admin: Membersihkan pemenang saat ini secara manual');
    
    setCurrentWinners([]);
    setShowConfetti(false); // Manual confetti control
    setVipControlActive(false); // Reset VIP flag
    
    // ENHANCED: Clear VIP flags from localStorage
    localStorage.removeItem('vipProcessedWinners');
    localStorage.removeItem('vipDrawSession');
    
    updateDrawingState({ 
      currentWinners: [], 
      showConfetti: false,
      showWinnerDisplay: false,
      finalWinners: [],
      predeterminedWinners: [],
      shouldStartSlowdown: false,
      shouldStartSpinning: false,
      vipProcessedWinners: false, // Reset VIP flag
      vipControlActive: false // Reset VIP control flag
    });
  }, [updateDrawingState]);

  // NEW: Manual confetti control
  const toggleConfetti = useCallback(() => {
    const newShowConfetti = !showConfetti;
    setShowConfetti(newShowConfetti);
    updateDrawingState({ showConfetti: newShowConfetti });
    console.log('Admin: Toggle confetti manual:', newShowConfetti);
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
      updateDrawingState({
        selectedPrizeId: null
      });
    }
  }, [prizesHook, selectedPrizeId]);

  // Prize selection handler
  const handleSelectPrize = useCallback((prize: Prize | null) => {
    console.log('Admin: Hadiah dipilih:', prize?.name);
    setSelectedPrizeId(prize?.id || null);
    
    // Update Firebase state with selected prize
    updateDrawingState({
      selectedPrizeId: prize?.id || null,
      selectedPrizeName: prize?.name,
      selectedPrizeImage: prize?.image,
      selectedPrizeQuota: prize?.remainingQuota || 0
    });
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
          <title>Bayan Run 2025 - Daftar Pemenang</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2563eb; }
            .winner { margin: 10px 0; padding: 10px; background: #f0f9ff; border-left: 4px solid #2563eb; }
            .prize-section { margin: 20px 0; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Bayan Run 2025 - Pemenang Doorprize</h1>
          <p>Dibuat pada: ${new Date().toLocaleString()}</p>
          ${winners.reduce((acc, winner, index) => {
            const prizeSection = winner.prizeName && !acc.includes(winner.prizeName) ? 
              `<div class="prize-section"><h2>🏆 ${winner.prizeName}</h2></div>` : '';
            return acc + prizeSection + `
              <div class="winner">
                <strong>${index + 1}. ${winner.name}</strong><br>
                <small>Menang pada: ${new Date(winner.wonAt).toLocaleString()}</small>
                ${winner.prizeName ? `<br><em>Hadiah: ${winner.prizeName}</em>` : ''}
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
              <p className="text-blue-600">Buka halaman ini untuk menampilkan ke para pengunjung</p>
            </div>
            <button
              onClick={openDisplayPage}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Buka Display
            </button>
          </div>
        </div>

        {/* NEW: VIP Control Status */}
        {vipControlActive && (
          <div className="mb-6 p-4 bg-purple-100 border border-purple-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-800">Kontrol VIP Aktif</h3>
                <p className="text-purple-600">
                  Undian sedang dikontrol oleh panel VIP. Pemenang diproses secara otomatis.
                  {localStorage.getItem('vipDrawSession') && (
                    <span className="block text-sm mt-1">
                      Sesi: {localStorage.getItem('vipDrawSession')?.slice(-8)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Mode VIP
              </div>
            </div>
          </div>
        )}

        {/* ENHANCED: Manual Control Panel */}
        {currentWinners.length > 0 && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">Kontrol Manual Display</h3>
                <p className="text-green-600">
                  Tampilan pemenang saat ini aktif - kontrol penuh ada di tangan admin
                  {vipControlActive && <span className="text-purple-600 font-medium"> (Diproses oleh VIP)</span>}
                  <span className="block text-sm mt-1">
                    {currentWinners.length} pemenang ditampilkan
                  </span>
                </p>
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
                  {showConfetti ? 'Stop Confetti' : 'Mulai Confetti'}
                </button>
                <button
                  onClick={clearCurrentWinners}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Bersihkan Display
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
                  <h3 className="text-lg font-semibold text-yellow-800">Perlambatan Natural Aktif</h3>
                  <p className="text-yellow-600">
                    Animasi sedang melambat secara natural menuju pemenang yang sudah ditentukan...
                    {vipControlActive && <span className="text-purple-600 font-medium"> (Dikontrol VIP)</span>}
                  </p>
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