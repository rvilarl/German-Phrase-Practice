import React from 'react';
import type { Phrase } from '../types';

interface PhrasePreviewModalProps {
  phrase: Phrase | null;
  onClose: () => void;
}

const PhrasePreviewModal: React.FC<PhrasePreviewModalProps> = ({ phrase, onClose }) => {
  if (!phrase) return null;

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4" 
        onClick={onClose}
    >
        <div className="[perspective:1000px] w-full max-w-md h-64" onClick={e => e.stopPropagation()}>
            <div className="relative w-full h-full [transform-style:preserve-3d] slow-rotate-animation">
                {/* Front Side (Russian) */}
                <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                    <h2 className="text-3xl font-semibold text-slate-100">{phrase.russian}</h2>
                </div>
                
                {/* Back Side (German) */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-500 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                    <h2 className="text-3xl font-bold text-white">{phrase.german}</h2>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PhrasePreviewModal;