import React from 'react';
import { Category } from '../types';
import SettingsIcon from './icons/SettingsIcon';
import SmartToyIcon from './icons/SmartToyIcon';
import { useTranslation } from '../src/hooks/useTranslation';

interface CategoryFilterContextMenuProps {
    category: Category;
    position: { x: number; y: number };
    onClose: () => void;
    onEdit: (category: Category) => void;
    onOpenAssistant: (category: Category) => void;
}

const CategoryFilterContextMenu: React.FC<CategoryFilterContextMenuProps> = ({
    category, position, onClose, onEdit, onOpenAssistant
}) => {
    const { t } = useTranslation();
    const menuStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translate(-50%, 10px)', // Position below the cursor
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose}></div>
            <div
                style={menuStyle}
                className="absolute z-50 w-64 bg-slate-700/90 backdrop-blur-md border border-slate-600 rounded-lg shadow-2xl p-2 animate-fade-in text-white overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-3 py-2 border-b border-slate-600">
                    <p className="font-bold text-slate-100 truncate">{category.name}</p>
                </div>
                <div className="p-1">
                    <button
                        onClick={() => onEdit(category)}
                        className="w-full flex items-center px-3 py-2 text-left text-sm hover:bg-slate-600/70 transition-colors rounded-md"
                    >
                        <SettingsIcon className="w-5 h-5 mr-3 text-slate-300" />
                        <span>{t('categories.filterMenu.actions.settings')}</span>
                    </button>
                    <button
                        onClick={() => onOpenAssistant(category)}
                        className="w-full flex items-center px-3 py-2 text-left text-sm hover:bg-slate-600/70 transition-colors rounded-md"
                    >
                        <SmartToyIcon className="w-5 h-5 mr-3 text-slate-300" />
                        <span>{t('categories.filterMenu.actions.aiAssistant')}</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default CategoryFilterContextMenu;
