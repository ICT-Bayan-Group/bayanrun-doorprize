import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Edit, Trash2, X } from 'lucide-react';
import { Prize } from '../types';

interface PrizeManagerProps {
  prizes: Prize[];
  onAddPrize: (prize: Omit<Prize, 'id' | 'createdAt'>) => void;
  onUpdatePrize: (id: string, prize: Partial<Prize>) => void;
  onDeletePrize: (id: string) => void;
  selectedPrize: Prize | null;
  onSelectPrize: (prize: Prize | null) => void;
  isLocked: boolean;
}

const PrizeManager: React.FC<PrizeManagerProps> = ({
  prizes,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  selectedPrize,
  onSelectPrize,
  isLocked
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quota: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPrize) {
      onUpdatePrize(editingPrize.id, {
        name: formData.name,
        description: formData.description,
        quota: formData.quota,
        remainingQuota: formData.quota
      });
      setEditingPrize(null);
    } else {
      onAddPrize({
        name: formData.name,
        description: formData.description,
        quota: formData.quota,
        remainingQuota: formData.quota
      });
    }

    setFormData({ name: '', description: '', quota: 1 });
    setShowAddForm(false);
  };

  const handleEdit = (prize: Prize) => {
    setFormData({
      name: prize.name,
      description: prize.description,
      quota: prize.quota
    });
    setEditingPrize(prize);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPrize(null);
    setFormData({ name: '', description: '', quota: 1 });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" />
          Prize Management ({prizes.length})
        </h2>
        
        {!isLocked && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Prize
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prize Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Grand Prize, Smartphone, Gift Voucher"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Prize description..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quota (Number of Winners)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.quota}
                  onChange={(e) => setFormData(prev => ({ ...prev, quota: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {editingPrize ? 'Update Prize' : 'Add Prize'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Prize Display */}
      {selectedPrize && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Selected Prize for Next Draw</h3>
              <p className="text-green-700">{selectedPrize.name}</p>
              <p className="text-sm text-green-600">
                Remaining quota: {selectedPrize.remainingQuota}/{selectedPrize.quota}
              </p>
            </div>
            {!isLocked && (
              <button
                onClick={() => onSelectPrize(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prizes List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {prizes.map((prize) => (
            <motion.div
              key={prize.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedPrize?.id === prize.id
                  ? 'border-green-400 bg-green-50'
                  : prize.remainingQuota > 0
                  ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
              onClick={() => !isLocked && prize.remainingQuota > 0 && onSelectPrize(prize)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{prize.name}</h3>
                  {prize.description && (
                    <p className="text-sm text-gray-600 mt-1">{prize.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className={`text-sm px-2 py-1 rounded ${
                      prize.remainingQuota > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {prize.remainingQuota}/{prize.quota} remaining
                    </span>
                  </div>
                </div>
                
                {!isLocked && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(prize);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this prize?')) {
                          onDeletePrize(prize.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {prizes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No prizes added yet</p>
            <p className="text-sm">Add prizes to start organizing your doorprize event</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeManager;