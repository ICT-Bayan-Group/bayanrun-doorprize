import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { Participant, Winner, AppSettings, Prize } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { exportToCsv } from '../utils/fileHandling';

import Header from '../components/Header';
import ParticipantManager from '../components/ParticipantManager';
import MultiDrawingArea from '../components/MultiDrawingArea';
import WinnerHistory from '../components/WinnerHistory';
import PrizeManager from '../components/PrizeManager';
import SettingsModal from '../components/SettingsModal';

interface DrawingState {
  isDrawing: boolean;
  currentWinners: Winner[];
  showConfetti: boolean;
  participants: Participant[];
  selectedPrizeName?: string;
}

const defaultSettings: AppSettings = {
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  animationType: 'wheel',
  soundEnabled: true,
  backgroundMusic: false,
  multiDrawCount: 10,
};

const defaultDrawingState: DrawingState = {
  isDrawing: false,
  currentWinners: [],
  showConfetti: false,
  participants: []
};

const AdminPage: React.FC = () => {
  const [participants, setParticipants] = useLocalStorage<Participant[]>('doorprize-participants', []);
  const [winners, setWinners] = useLocalStorage<Winner[]>('doorprize-winners', []);
  const [prizes, setPrizes] = useLocalStorage<Prize[]>('doorprize-prizes', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('doorprize-settings', defaultSettings);
  const [lastWinners, setLastWinners] = useLocalStorage<Winner[]>('doorprize-last-winners', []);
  
  const [currentWinners, setCurrentWinners] = useState<Winner[]>(lastWinners);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Sync drawing state to localStorage for display page
  const [, setDrawingState] = useLocalStorage<DrawingState>('doorprize-drawing-state', defaultDrawingState);

  const addParticipant = useCallback((name: string) => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name,
      addedAt: new Date(),
    };
    setParticipants(prev => {
      const updated = [...prev, newParticipant];
      setDrawingState(prevState => ({ ...prevState, participants: updated }));
      return updated;
    });
  }, [setParticipants, setDrawingState]);

  const addMultipleParticipants = useCallback((names: string[]) => {
    const newParticipants: Participant[] = names.map(name => ({
      id: `${Date.now()}-${Math.random()}`,
      name,
      addedAt: new Date(),
    }));
    setParticipants(prev => {
      const updated = [...prev, ...newParticipants];
      setDrawingState(prevState => ({ ...prevState, participants: updated }));
      return updated;
    });
  }, [setParticipants, setDrawingState]);

  const removeParticipant = useCallback((id: string) => {
    setParticipants(prev => {
      const updated = prev.filter(p => p.id !== id);
      setDrawingState(prevState => ({ ...prevState, participants: updated }));
      return updated;
    });
  }, [setParticipants, setDrawingState]);

  const clearAllParticipants = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all participants?')) {
      setParticipants([]);
      setDrawingState(prevState => ({ ...prevState, participants: [] }));
    }
  }, [setParticipants, setDrawingState]);

  const startDrawing = useCallback(() => {
    if (participants.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setCurrentWinners([]);
    setShowConfetti(false);
    
    // Update drawing state for display page
    setDrawingState({
      isDrawing: true,
      currentWinners: [],
      showConfetti: false,
      selectedPrizeName: selectedPrize?.name,
      participants: participants
    });
  }, [participants, isDrawing, selectedPrize, setDrawingState]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const drawCount = selectedPrize ? 
      Math.min(selectedPrize.remainingQuota, participants.length) : 
      Math.min(settings.multiDrawCount, participants.length);
    
    // Select random winners
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const selectedParticipants = shuffled.slice(0, drawCount);
    
    const sessionId = Date.now().toString();
    const newWinners: Winner[] = selectedParticipants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      wonAt: new Date(),
      prizeId: selectedPrize?.id,
      prizeName: selectedPrize?.name,
      drawSession: sessionId,
    }));
    
    // Remove winners from participants
    setParticipants(prev => {
      const updated = prev.filter(p => !selectedParticipants.some(sp => sp.id === p.id));
      setDrawingState(prevState => ({ ...prevState, participants: updated }));
      return updated;
    });
    
    // Add to winners list
    setWinners(prev => [...newWinners, ...prev]);
    
    // Update prize quota if prize was selected
    if (selectedPrize) {
      setPrizes(prev => prev.map(prize => 
        prize.id === selectedPrize.id 
          ? { ...prize, remainingQuota: Math.max(0, prize.remainingQuota - newWinners.length) }
          : prize
      ));
      
      // Clear selected prize if quota is exhausted
      if (selectedPrize.remainingQuota <= newWinners.length) {
        setSelectedPrize(null);
      }
    }
    
    // Set current winners
    setCurrentWinners(newWinners);
    setLastWinners(newWinners);
    
    // Show confetti
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setDrawingState(prev => ({ ...prev, showConfetti: false }));
    }, 8000);
    
    // Update drawing state for display page
    setDrawingState({
      isDrawing: false,
      currentWinners: newWinners,
      showConfetti: true,
      selectedPrizeName: selectedPrize?.name,
      participants: participants.filter(p => !selectedParticipants.some(sp => sp.id === p.id))
    });
    
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
  }, [isDrawing, participants, selectedPrize, settings, setParticipants, setWinners, setPrizes, setLastWinners, setDrawingState]);

  // Prize management functions
  const addPrize = useCallback((prizeData: Omit<Prize, 'id' | 'createdAt'>) => {
    const newPrize: Prize = {
      ...prizeData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setPrizes(prev => [...prev, newPrize]);
  }, [setPrizes]);

  const updatePrize = useCallback((id: string, updates: Partial<Prize>) => {
    setPrizes(prev => prev.map(prize => 
      prize.id === id ? { ...prize, ...updates } : prize
    ));
  }, [setPrizes]);

  const deletePrize = useCallback((id: string) => {
    setPrizes(prev => prev.filter(prize => prize.id !== id));
    if (selectedPrize?.id === id) {
      setSelectedPrize(null);
    }
  }, [setPrizes, selectedPrize]);

  const handleClearWinners = () => {
    setCurrentWinners([]);
  }

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
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const openDisplayPage = useCallback(() => {
    window.open('/display', '_blank');
  }, []);

  const canDraw = participants.length > 0 && !isDrawing && !isLocked;

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
      />

      <main className="container mx-auto px-4 py-8">
        {/* Display Page Link */}
        <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Display Page</h3>
              <p className="text-blue-600">Open this page on projector/large screen for audience</p>
            </div>
            <button
              onClick={openDisplayPage}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Open Display Page
            </button>
          </div>
        </div>

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
              onSelectPrize={setSelectedPrize}
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
              onClearWinners={handleClearWinners} 
              onStopDraw={stopDrawing}
              canDraw={canDraw}
              isLocked={isLocked}
            />
          </div>

          {/* Right Column - Winners */}
          <div>
            <WinnerHistory
              winners={winners}
              onExport={handleExport}
              onPrint={handlePrint}
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
          🔒 Controls Locked
        </motion.div>
      )}
    </div>
  );
};

export default AdminPage;