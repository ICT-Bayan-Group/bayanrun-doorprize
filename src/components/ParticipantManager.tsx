import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Trash2, Users, X, CheckCircle, XCircle } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
}

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
  onClearAll: () => void;
  onImportParticipants: (participants: Array<{ name: string; phone?: string; email?: string }>) => void;
}

interface ImportResult {
  success: number;
  invalid: number;
  invalidNames: string[];
}

const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onClearAll,
  onImportParticipants,
}) => {
  const [newName, setNewName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple name validation (no duplicate check)
  const validateName = useCallback((name: string): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return { isValid: false, error: 'Nama tidak boleh kosong' };
    }
    
    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Nama minimal 2 karakter' };
    }
    
    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Nama maksimal 100 karakter' };
    }
    
    return { isValid: true };
  }, []);

  // Add participant without duplicate check
  const handleAddName = useCallback(() => {
    setValidationError(null);
    
    const validation = validateName(newName);
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Input tidak valid');
      return;
    }
    
    onAddParticipant(newName.trim());
    setNewName('');
  }, [newName, validateName, onAddParticipant]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddName();
    }
  };

  // Simple CSV parser
  const parseCSV = (text: string): string[] => {
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  // Import file handler (simplified, no duplicate detection)
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setValidationError(null);
    setImportResult(null);
    
    try {
      const text = await file.text();
      const lines = parseCSV(text);
      
      // Process and validate
      const validData: Array<{ name: string }> = [];
      const invalidNames: string[] = [];
      
      lines.forEach(line => {
        const name = line.trim();
        const validation = validateName(name);
        
        if (validation.isValid) {
          validData.push({ name });
        } else {
          invalidNames.push(name);
        }
      });
      
      const result: ImportResult = {
        success: validData.length,
        invalid: invalidNames.length,
        invalidNames
      };
      
      setImportResult(result);
      
      if (validData.length > 0) {
        onImportParticipants(validData);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      setValidationError(`Error importing file: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateName, onImportParticipants]);

  // Clear all with simple confirmation
  const handleClearAll = useCallback(() => {
    if (window.confirm(`Hapus semua ${participants.length} peserta?`)) {
      onClearAll();
      setValidationError(null);
      setImportResult(null);
    }
  }, [participants.length, onClearAll]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Peserta ({participants.length})
        </h2>
      </div>

      {/* Import Result Display */}
      {importResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-blue-800 font-medium">Hasil Import:</p>
              <p className="text-green-700">✓ {importResult.success} berhasil ditambahkan</p>
              {importResult.invalid > 0 && (
                <p className="text-orange-700">✗ {importResult.invalid} tidak valid</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Tambah Nama Peserta atau BIB"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                validationError 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {validationError}
              </p>
            )}
          </div>
          <button
            onClick={handleAddName}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

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
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          
          {participants.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          )}
        </div>
      </div>

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
              <button
                onClick={() => onRemoveParticipant(participant.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Hapus peserta"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Partisipan belum ditambahkan</p>
            <p className="text-sm">Tambahkan nama atau impor dari file</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantManager;