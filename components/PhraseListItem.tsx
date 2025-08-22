import React from 'react';
import type { Phrase } from '../types';
import ProgressBar from './ProgressBar';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import * as srsService from '../services/srsService';
import GraduationCapIcon from './icons/GraduationCapIcon';

interface PhraseListItemProps {
    phrase: Phrase;
    onEdit: (phrase: Phrase) => void;
    onDelete: (phraseId: string) => void;
    isDuplicate: boolean;
    isHighlighted: boolean;
    onPreview: (phrase: Phrase) => void;
    onStartPractice: (phrase: Phrase) => void;
}

const PhraseListItem: React.FC<PhraseListItemProps> = ({ phrase, onEdit, onDelete, isDuplicate, isHighlighted, onPreview, onStartPractice }) => {
    
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(phrase);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(phrase.id);
    };
    
    const handlePracticeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartPractice(phrase);
    };

    const getRingClass = () => {
        if (isHighlighted) return 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900';
        if (isDuplicate) return 'ring-2 ring-yellow-500';
        return '';
    }

    return (
        <li 
            id={`phrase-item-${phrase.id}`}
            className={`bg-slate-800/70 p-4 rounded-lg flex items-center space-x-4 cursor-pointer hover:bg-slate-700/70 transition-all duration-300 ${getRingClass()}`}
            onClick={() => onPreview(phrase)}
        >
            <div className="flex-grow">
                <p className="font-semibold text-slate-100">{phrase.russian}</p>
                <p className="text-sm text-slate-400">{phrase.german}</p>
                <div className="mt-2">
                    <ProgressBar current={phrase.masteryLevel} max={srsService.MAX_MASTERY_LEVEL} />
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-1">
                 <button 
                    onClick={handlePracticeClick} 
                    className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                    aria-label="Учить эту фразу"
                >
                    <GraduationCapIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleEditClick} 
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                    aria-label="Редактировать фразу"
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleDeleteClick} 
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
