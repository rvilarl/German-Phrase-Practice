import React from 'react';
import type { Phrase, PhraseCategory } from '../types';
import ProgressBar from './ProgressBar';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import * as srsService from '../services/srsService';
import GraduationCapIcon from './icons/GraduationCapIcon';

const categoryDisplay: Record<PhraseCategory, { name: string; color: string; }> = {
    general: { name: 'Общие', color: 'bg-slate-500' },
    'w-fragen': { name: 'W-Fragen', color: 'bg-blue-500' },
    pronouns: { name: 'Местоимения', color: 'bg-purple-500' },
    numbers: { name: 'Цифры', color: 'bg-green-500' },
    time: { name: 'Время', color: 'bg-amber-500' },
    money: { name: 'Деньги', color: 'bg-emerald-500' },
};

interface PhraseListItemProps {
    phrase: Phrase;
    onEdit: (phrase: Phrase) => void;
    onDelete: (phraseId: string) => void;
    isDuplicate: boolean;
    isHighlighted: boolean;
    onPreview: (phrase: Phrase) => void;
    onStartPractice: (phrase: Phrase) => void;
    onCategoryClick: (category: PhraseCategory) => void;
}

const PhraseListItem: React.FC<PhraseListItemProps> = React.memo(({ phrase, onEdit, onDelete, isDuplicate, isHighlighted, onPreview, onStartPractice, onCategoryClick }) => {
    
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
        if (isDuplicate) return 'ring-2 ring-amber-500';
        return '';
    }

    const categoryInfo = categoryDisplay[phrase.category] || categoryDisplay.general;

    return (
        <li 
            id={`phrase-item-${phrase.id}`}
            className={`bg-slate-400/10 backdrop-blur-xl border border-white/20 p-4 rounded-lg flex items-start space-x-4 cursor-pointer hover:bg-slate-400/20 transition-all duration-300 ${getRingClass()}`}
            onClick={() => onPreview(phrase)}
        >
            <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-100">{phrase.russian}</p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCategoryClick(phrase.category);
                        }}
                        className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${categoryInfo.color} transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white`}
                        aria-label={`Фильтр по категории: ${categoryInfo.name}`}
                    >
                        {categoryInfo.name}
                    </button>
                </div>
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
});

export default PhraseListItem;