import React, { useState } from 'react';
import { X, Send, Trash2, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PREDEFINED_VIBES } from '../data/vibes';
import { VibeCategory, VibeItem } from '../types';

interface VibeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName?: string;
  currentSelectedVibes: string[];
  onSendVibes: (vibeIds: string[]) => Promise<void>;
}

export const VibeSelectorModal: React.FC<VibeSelectorModalProps> = ({
  isOpen,
  onClose,
  partnerName,
  currentSelectedVibes,
  onSendVibes,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentSelectedVibes);
  const [activeCategory, setActiveCategory] = useState<VibeCategory | 'all'>('all');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleVibe = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const handleSend = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await onSendVibes(selectedIds);
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#F43F5E', '#EC4899', '#FB7185', '#FDA4AF'],
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send vibe. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const categories: { label: string; value: VibeCategory | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Affection', value: 'affection' },
    { label: 'Energy', value: 'energy' },
    { label: 'Positive', value: 'positive' },
    { label: 'Mood', value: 'mood' },
    { label: 'Comfort', value: 'comfort' },
    { label: 'Emotion', value: 'emotion' },
  ];

  const filteredVibes =
    activeCategory === 'all'
      ? PREDEFINED_VIBES
      : PREDEFINED_VIBES.filter((v) => v.category === activeCategory);

  const selectedVibeObjects = selectedIds
    .map((id) => PREDEFINED_VIBES.find((v) => v.id === id))
    .filter(Boolean) as VibeItem[];

  const targetName = partnerName || 'Partner';

  return (
    <div
      id="vibe-selector-backdrop"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="vibe-selector-container"
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              How are you feeling?
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Choose vibes to share with {targetName}
            </p>
          </div>
          <button
            id="close-vibe-selector-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Horizontal Tabs */}
        <div className="px-5 py-2.5 flex space-x-1.5 overflow-x-auto no-scrollbar border-b border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-950/30">
          {categories.map((cat) => (
            <button
              key={cat.value}
              id={`vibe-category-${cat.value}`}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.value
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Selected Vibes Sticky Summary Bar */}
        <div className="px-5 py-2.5 bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between min-h-[44px]">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-200 whitespace-nowrap">
              Selected ({selectedIds.length}):
            </span>
            {selectedVibeObjects.length > 0 ? (
              <div className="flex items-center space-x-1">
                {selectedVibeObjects.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200 shadow-2xs border border-rose-200 dark:border-rose-900"
                  >
                    <span>{v.emoji}</span>
                    <span className="text-[10px]">{v.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-rose-400 italic">None selected</span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button
              id="clear-selected-vibes-btn"
              onClick={handleClear}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center space-x-1 font-medium px-2 py-0.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 transition shrink-0 ml-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Vibes Grid */}
        <div className="p-4 overflow-y-auto max-h-[45vh] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredVibes.map((vibe) => {
            const isSelected = selectedIds.includes(vibe.id);
            return (
              <button
                key={vibe.id}
                id={`vibe-chip-${vibe.id}`}
                onClick={() => toggleVibe(vibe.id)}
                className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 shadow-xs ring-2 ring-rose-300 dark:ring-rose-800/80 scale-[1.02]'
                    : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200/80 dark:border-stone-700/60 hover:bg-white dark:hover:bg-stone-800'
                }`}
              >
                <span className="text-2xl drop-shadow-xs">{vibe.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                    {vibe.name}
                  </div>
                  <div className="text-[10px] text-stone-400 capitalize">
                    {vibe.category}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/90 flex items-center space-x-3">
          <button
            id="cancel-vibe-modal-btn"
            onClick={onClose}
            className="w-1/3 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="submit-vibe-btn"
            onClick={handleSend}
            disabled={isSending}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSending
                ? 'Sending...'
                : selectedIds.length === 0
                ? 'Clear Vibes'
                : selectedIds.length === 1
                ? `Send to ${targetName}`
                : `Send ${selectedIds.length} Vibes to ${targetName}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
