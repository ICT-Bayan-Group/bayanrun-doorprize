import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Edit, Trash2, X, Upload, Image } from 'lucide-react';

interface Prize {
  id: string;
  name: string;
  description: string;
  quota: number;
  remainingQuota: number;
  imageUrl?: string;
  createdAt: Date;
}

interface PrizeManagerProps {
  prizes: Prize[];
  onAddPrize: (prize: Omit<Prize, 'id' | 'createdAt'>) => void;
  onUpdatePrize: (id: string, prize: Partial<Prize>) => void;
  onDeletePrize: (id: string) => void;
  selectedPrize: Prize | null;
  onSelectPrize: (prize: Prize | null) => void;
  isLocked: boolean;
  onSocketEmit?: (event: string, data: any) => void;
}

const PrizeManager: React.FC<PrizeManagerProps> = ({
  prizes,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  selectedPrize,
  onSelectPrize,
  isLocked,
  onSocketEmit
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quota: 1,
    imageUrl: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only .jpg, .png, and .webp files are allowed');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size must be less than 2MB');
      return;
    }

    setUploadError('');
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let imageUrl = formData.imageUrl;

    // Simulate image upload (in real app, upload to server)
    if (imageFile) {
      imageUrl = imagePreview || '';
    }

    const prizeData = {
      name: formData.name,
      description: formData.description,
      quota: formData.quota,
      remainingQuota: formData.quota,
      imageUrl
    };

    if (editingPrize) {
      onUpdatePrize(editingPrize.id, prizeData);
      setEditingPrize(null);
    } else {
      onAddPrize(prizeData);
    }

    // Emit socket event for real-time sync
    onSocketEmit?.('prize:update', { prizes: [...prizes, prizeData] });

    setFormData({ name: '', description: '', quota: 1, imageUrl: '' });
    setImageFile(null);
    setImagePreview(null);
    setShowAddForm(false);
  };

  const handleEdit = (prize: Prize) => {
    setFormData({
      name: prize.name,
      description: prize.description,
      quota: prize.quota,
      imageUrl: prize.imageUrl || ''
    });
    setImagePreview(prize.imageUrl || null);
    setEditingPrize(prize);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingPrize(null);
    setFormData({ name: '', description: '', quota: 1, imageUrl: '' });
    setImageFile(null);
    setImagePreview(null);
    setUploadError('');
  };

  const handleSelectPrize = (prize: Prize) => {
    onSelectPrize(prize);
    // Emit socket event for real-time display update
    onSocketEmit?.('prize:selected', { prize });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Gift className="w-4 h-4 text-purple-600" />
          </div>
          Data Hadiah ({prizes.length})
        </h2>
        
        {!isLocked && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="iPhone, Smartwatch, Gift Voucher"
                  required
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Image
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {imagePreview ? (
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-16 h-16 object-cover rounded-lg mb-2"
                          />
                        ) : (
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        )}
                        <p className="text-xs text-gray-500">
                          {imagePreview ? 'Click to change image' : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 2MB</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-sm text-red-600">{uploadError}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="Prize details..."
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quota (Number of Winners)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.quota}
                  onChange={(e) => setFormData(prev => ({ ...prev, quota: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  {editingPrize ? 'Update Prize' : 'Add Prize'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Prize Display */}
      {selectedPrize && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedPrize.imageUrl && (
                <img 
                  src={selectedPrize.imageUrl} 
                  alt={selectedPrize.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-medium text-green-800">Active Prize</h3>
                <p className="text-green-700 font-medium">{selectedPrize.name}</p>
                <p className="text-sm text-green-600">
                  {selectedPrize.remainingQuota} of {selectedPrize.quota} remaining
                </p>
              </div>
            </div>
            {!isLocked && (
              <button
                onClick={() => onSelectPrize(null)}
                className="text-green-600 hover:text-green-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prizes List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {prizes.map((prize) => (
            <motion.div
              key={prize.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`group p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-sm ${
                selectedPrize?.id === prize.id
                  ? 'border-green-300 bg-green-50'
                  : prize.remainingQuota > 0
                  ? 'border-gray-200 bg-white hover:border-purple-200'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
              onClick={() => !isLocked && prize.remainingQuota > 0 && handleSelectPrize(prize)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {prize.imageUrl ? (
                    <img 
                      src={prize.imageUrl} 
                      alt={prize.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{prize.name}</h3>
                    {prize.description && (
                      <p className="text-sm text-gray-500 truncate">{prize.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        prize.remainingQuota > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {prize.remainingQuota}/{prize.quota} left
                      </span>
                    </div>
                  </div>
                </div>
                
                {!isLocked && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(prize);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this prize?')) {
                          onDeletePrize(prize.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Prizes Yet</h3>
            <p className="text-gray-500 mb-4">Add your first prize to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrizeManager;