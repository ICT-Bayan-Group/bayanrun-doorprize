import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Trash2, Users, X } from 'lucide-react';
import { Participant } from '../types';
import { importFromFile } from '../utils/fileHandling';

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
  onClearAll: () => void;
  onImportParticipants: (names: string[]) => void;
  isLocked: boolean;
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onClearAll,
  onImportParticipants,
  isLocked
}) => {
  const [newName, setNewName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && !isLocked) {
      onAddParticipant(newName.trim());
      setNewName('');
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isLocked) return;

    setIsImporting(true);
    try {
      const names = await importFromFile(file);
      onImportParticipants(names);
    } catch (error) {
      alert('Error importing file. Please check the format and try again.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participants ({participants.length})
        </h2>
      </div>

      {!isLocked && (
        <div className="space-y-4 mb-6">
          <form onSubmit={handleAddName} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter participant name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import CSV/TXT'}
            </button>
            
            {participants.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto">
        <AnimatePresence>
          {participants.map((participant) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
            >
              <span className="text-gray-800">{participant.name}</span>
              {!isLocked && (
                <button
                  onClick={() => onRemoveParticipant(participant.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No participants added yet</p>
            <p className="text-sm">Add names manually or import from a file</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantManager;