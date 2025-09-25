import React, { useState, useEffect } from 'react';
import { ProposedCard } from '../types';
import CloseIcon from './icons/CloseIcon';
import CheckIcon from './icons/CheckIcon';
import Spinner from './Spinner';
import SmartToyIcon from './icons/SmartToyIcon';
import RefreshIcon from './icons/RefreshIcon';
import WandIcon from './icons/WandIcon';

interface AutoFillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCards: ProposedCard[]) => void;
  onRefine: (refinementText: string) => void;
  categoryName: string;
  proposedCards: ProposedCard[];
  isLoading: boolean;
}

const AutoFillPreviewModal: React.FC<AutoFillPreviewModalProps> = ({
  isOpen, onClose, onConfirm, onRefine, categoryName, proposedCards, isLoading
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineText, setRefineText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIndices(new Set(proposedCards.map((_, i) => i)));
      setShowRefineInput(false);
      setRefineText('');
    }
  }, [isOpen, proposedCards]);

  if (!isOpen) return null;

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === proposedCards.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(proposedCards.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selected = proposedCards.filter((_, i) => selectedIndices.has(i));
    onConfirm(selected);
  };

  const handleRefine = () => {
    if (refineText.trim()) {
        onRefine(refineText);
        setShowRefineInput(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg m-4 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <SmartToyIcon className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <h2 className="text-lg font-bold text-slate-100 truncate" title={`Предложения для "${categoryName}"`}>
                Предложения для "{categoryName}"
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 ml-2">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>
        
        <div className="p-4 flex-grow overflow-y-auto hide-scrollbar relative">
            {isLoading && (
                <div className="absolute inset-0 bg-slate-800/80 flex flex-col items-center justify-center z-10">
                    <Spinner />
                    <p className="mt-4 text-slate-300">Подбираем новые варианты...</p>
                </div>
            )}
            {proposedCards.length > 0 ? (
                <ul className="space-y-2">
                    {proposedCards.map((card, index) => (
                    <li key={index}
                        onClick={() => toggleSelection(index)}
                        className={`p-3 rounded-lg flex items-start space-x-3 cursor-pointer transition-colors ${selectedIndices.has(index) ? 'bg-slate-700' : 'bg-slate-700/50 hover:bg-slate-700/80'}`}
                    >
                        <div className={`mt-1 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 ${selectedIndices.has(index) ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-600'}`}>
                            {selectedIndices.has(index) && <CheckIcon className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                            <p className="font-medium text-slate-200">{card.german}</p>
                            <p className="text-sm text-slate-400">{card.russian}</p>
                        </div>
                    </li>
                    ))}
                </ul>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                    <p>AI не предложил карточек. Попробуйте уточнить запрос.</p>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-slate-700 flex-shrink-0 space-y-3">
            {showRefineInput && (
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={refineText}
                        onChange={e => setRefineText(e.target.value)}
                        placeholder="Например: только названия, без фраз"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                    />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isLoading} className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50">
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <button onClick={toggleSelectAll} className="px-2 sm:px-4 py-2 text-sm rounded-md text-slate-300 hover:bg-slate-700 transition-colors">
                    {selectedIndices.size === proposedCards.length ? 'Снять все' : 'Выбрать все'}
                </button>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setShowRefineInput(prev => !prev)} className="px-3 sm:px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center">
                        <WandIcon className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">Уточнить</span>
                    </button>
                    <button onClick={handleConfirm} disabled={selectedIndices.size === 0 || isLoading} className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50">
                        <span className="sm:hidden">+</span>
                        <span className="hidden sm:inline">Добавить</span>
                        <span> ({selectedIndices.size})</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AutoFillPreviewModal;