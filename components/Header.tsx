import React from 'react';
import SettingsIcon from './icons/SettingsIcon';
import ListIcon from './icons/ListIcon';
import PracticeIcon from './icons/PracticeIcon';

type View = 'practice' | 'list';

interface HeaderProps {
    view: View;
    onSetView: (view: View) => void;
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, onSetView, onOpenSettings }) => {
    return (
        <header className="w-full absolute top-0 left-0 p-4 flex justify-between items-center z-10">
            <div className="text-left">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Практика немецкого языка</h1>
                <p className="text-slate-400 text-sm">Система интервального повторения</p>
            </div>
            <div className="flex items-center space-x-2">
                 {view === 'practice' ? (
                    <button onClick={() => onSetView('list')} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Показать список фраз">
                        <ListIcon className="w-6 h-6" />
                    </button>
                ) : (
                    <button onClick={() => onSetView('practice')} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Вернуться к практике">
                        <PracticeIcon className="w-6 h-6" />
                    </button>
                )}
                <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Настройки">
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;
