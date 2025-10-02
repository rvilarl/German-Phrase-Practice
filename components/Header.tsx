import React from 'react';
import SettingsIcon from './icons/SettingsIcon.tsx';
import ListIcon from './icons/ListIcon.tsx';
import PracticeIcon from './icons/PracticeIcon.tsx';
import { View } from '../types.ts';
import { useAuth } from '../src/contexts/authContext.tsx';
import { useTranslation } from '../src/hooks/useTranslation.ts';

interface HeaderProps {
    view: View;
    onSetView: (view: View) => void;
    onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, onSetView, onOpenSettings }) => {
    const { t } = useTranslation();
    const { user, signOut, loading: authLoading } = useAuth();
    const isPracticeArea = view === 'practice' || view === 'list';

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (signOutError) {
            console.error('Sign out failed', signOutError);
        }
    };

    return (
        <header className="w-full fixed top-0 left-0 p-4 flex justify-between items-center z-30 h-20 backdrop-blur-sm border-b border-slate-700/50">
            <div className="text-left">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{t('header.title', 'Lingopo')}</h1>
            </div>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    {isPracticeArea ? (
                        view === 'practice' ? (
                            <button
                                onClick={() => onSetView('list')}
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                                aria-label={t('header.openList', 'Открыть список')}
                            >
                                <ListIcon className="w-6 h-6" />
                            </button>
                        ) : (
                            <button
                                onClick={() => onSetView('practice')}
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                                aria-label={t('header.openPractice', 'Начать тренировку')}
                            >
                                <PracticeIcon className="w-6 h-6" />
                            </button>
                        )
                    ) : (
                        <button
                            onClick={() => onSetView('practice')}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            aria-label={t('header.openPractice', 'Начать тренировку')}
                        >
                            <PracticeIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        onClick={onOpenSettings}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        aria-label={t('header.openSettings', 'Открыть настройки')}
                    >
                        <SettingsIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex items-center space-x-3">
                    {user?.email && (
                        <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>
                    )}
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-700/70 rounded-lg transition-colors disabled:opacity-60"
                        disabled={authLoading}
                        aria-label={t('header.signOut', 'Выйти')}
                    >
                        {authLoading ? t('header.signingOut', 'Выходим...') : t('header.signOut', 'Выйти')}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
