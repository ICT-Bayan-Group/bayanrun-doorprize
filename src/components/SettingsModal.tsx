import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Palette, Volume2, VolumeX } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onUpdateSettings({ eventLogo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const colorPresets = [
    { name: 'Ocean Blue', primary: '#2563eb', secondary: '#1d4ed8' },
    { name: 'Forest Green', primary: '#059669', secondary: '#047857' },
    { name: 'Sunset Orange', primary: '#ea580c', secondary: '#dc2626' },
    { name: 'Royal Purple', primary: '#7c3aed', secondary: '#6d28d9' },
    { name: 'Rose Pink', primary: '#e11d48', secondary: '#be123c' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Logo Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Event Logo
                </h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {settings.eventLogo && (
                  <div className="mt-4">
                    <img
                      src={settings.eventLogo}
                      alt="Event Logo"
                      className="h-16 w-auto border rounded"
                    />
                  </div>
                )}
              </div>

              {/* Color Theme */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Theme
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => onUpdateSettings({
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary
                      })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        settings.primaryColor === preset.primary
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex">
                          <div
                            className="w-6 h-6 rounded-l"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded-r"
                            style={{ backgroundColor: preset.secondary }}
                          />
                        </div>
                        <span className="font-medium text-gray-800">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Style */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Animation Style</h3>
                <div className="space-y-3">
                  {['wheel', 'scroll', 'cards'].map((type) => (
                    <label key={type} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="animationType"
                        value={type}
                        checked={settings.animationType === type}
                        onChange={(e) => onUpdateSettings({ animationType: e.target.value as any })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="capitalize text-gray-700">{type} Animation</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Multi-Draw Count */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Draw Settings</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Draw Count (when no prize selected)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.multiDrawCount || 10}
                    onChange={(e) => onUpdateSettings({ multiDrawCount: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of winners to draw when no specific prize is selected
                  </p>
                </div>
              </div>

              {/* Sound Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  Sound Effects
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Enable Sound Effects</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.backgroundMusic}
                      onChange={(e) => onUpdateSettings({ backgroundMusic: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700">Background Music</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;