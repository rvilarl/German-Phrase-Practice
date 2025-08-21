import React from 'react';
import type { Phrase } from '../types';
import ProgressBar from './ProgressBar';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import * as srsService from '../services/srsService';

interface PhraseListItemProps {
    phrase: Phrase;
    onEdit: (phrase: Phrase) => void;
    onDelete: (phraseId: string) => void;
    isDuplicate: boolean;
}

const PhraseListItem: React.FC<PhraseListItemProps> = ({ phrase, onEdit, onDelete, isDuplicate }) => {
    return (
        <li className={`bg-slate-800/70 p-4 rounded-lg flex items-center space-x-4 ${isDuplicate ? 'ring-2 ring-yellow-500' : ''}`}>
            <div className="flex-grow">
                <p className="font-semibold text-slate-100">{phrase.russian}</p>
                <p className="text-sm text-slate-400">{phrase.german}</p>
                <div className="mt-2">
                    <ProgressBar current={phrase.masteryLevel} max={srsService.MAX_MASTERY_LEVEL} />
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-2">
                <button 
                    onClick={() => onEdit(phrase)} 
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                    aria-label="Редактировать фразу"
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => onDelete(phrase.id)} 
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    aria-label="Удалить фразу"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </li>
    );
};

export default PhraseListItem;
