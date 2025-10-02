import React from 'react';
import CloseIcon from './icons/CloseIcon';
import { useAuth } from '../src/contexts/authContext.tsx';
import { useTranslation } from '../src/hooks/useTranslation.ts';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (signOutError) {
      console.error(t('header.errors.signOutFailed'), signOutError);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">{t('account.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{t('account.email')}</label>
            <div className="text-slate-200 bg-slate-700/50 px-3 py-2 rounded-lg">
              {user?.email}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-3 text-sm font-medium text-slate-300 hover:text-white border border-slate-700/70 rounded-lg transition-colors disabled:opacity-60"
            disabled={authLoading}
          >
            {authLoading ? t('header.actions.signingOut') : t('header.actions.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDrawer;