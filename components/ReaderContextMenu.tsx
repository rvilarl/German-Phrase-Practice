import React from 'react';
import CardPlusIcon from './icons/CardPlusIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import Spinner from './Spinner';

interface ReaderContextMenuProps {
    position: { x: number; y: number };
    onClose: () => void;
    isLoading: boolean;
    onCreateCard: () => void;
    onAnalyzeWord: () => void;
}

const ReaderContextMenu: React.FC<ReaderContextMenuProps> = ({ position, onClose, isLoading, onCreateCard, onAnalyzeWord }) => {
    
    return (
        <>
            <div className="fixed inset-0 z-[100]" onClick={onClose}></div>
            <div
                className="fixed z-[101] bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-2 flex items-center space-x-2 animate-fade-in"
                style={{ top: position.y, left: position.x, transform: 'translateY(-110%)' }}
            >
                {isLoading ? (
                    <div className="px-4 py-2"><Spinner className="w-5 h-5 text-purple-400"/></div>
                ) : (
                    <>
                        <button onClick={onCreateCard} className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors" title="Создать карточку">
                            <CardPlusIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={onAnalyzeWord} className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors" title="Анализ слова">
                            <AnalysisIcon className="w-5 h-5"/>
                        </button>
                    </>
                )}
            </div>
        </>
    );
};

export default ReaderContextMenu;
