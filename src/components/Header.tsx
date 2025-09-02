import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Settings, Monitor, Lock, Unlock } from 'lucide-react';

interface HeaderProps {
  logo?: string;
  isFullscreen: boolean;
  isLocked: boolean;
  onToggleFullscreen: () => void;
  onToggleLock: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({
  logo,
  isFullscreen,
  isLocked,
  onToggleFullscreen,
  onToggleLock,
  onOpenSettings
}) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-white to-white text-blue-800 p-4 shadow-lg"
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt="Event Logo" className="h-16 w-auto" />
          ) : (
            <Trophy className="w-8 h-8 text-yellow-400" />
          )}
          <div>
            <h1 className="text-2xl font-bold">BAYAN RUN 2025</h1>
            <p className="text-red-600 font-semibold text-sm">Undian Doorprize</p>
          </div>
        </div>
        
        {!isFullscreen && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleLock}
              className={`p-2 rounded-lg transition-colors ${
                isLocked ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-white'
              }`}
              title={isLocked ? 'Unlock Controls' : 'Lock Controls'}
            >
              {isLocked ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4" />}
            </button>
            
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-white hover:bg-white transition-colors"
              title="Open Display Page"
            >
              <Monitor className="w-4 h-4" />
            </button>
            
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-white hover:bg-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;