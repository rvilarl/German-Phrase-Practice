import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import { Category, PhraseCategory } from '../types';

interface Settings {
  autoSpeak: boolean;
  soundEffects: boolean;
  automation: {
    autoCheckShortPhrases: boolean;
    learnNextPhraseHabit: boolean;
  };
  enabledCategories: Record<PhraseCategory, boolean>;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  onOpenCategoryManager: () => void;
  categories: Category[];
}

type SettingsView = 'main' | 'general' | 'automation' | 'categories';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, onOpenCategoryManager, categories }) => {
  const [view, setView] = useState<SettingsView>('main');
  
  const titles: Record<SettingsView, string> = {
    main: 'Настройки',
    general: 'Основные',
    automation: 'Автоматизация (AI)',
    categories: 'Категории для практики',
  };
  
  if (!isOpen) return null;

  const handleSettingChange = (setting: keyof Omit<Settings, 'automation' | 'enabledCategories'>, value: boolean) => {
    onSettingsChange({ [setting]: value });
  };
  
  const handleAutomationChange = (setting: keyof Settings['automation'], value: boolean) => {
    onSettingsChange({
      automation: {
        ...settings.automation,
        [setting]: value,
      },
    });
  };

  const handleCategoryChange = (category: PhraseCategory, value: boolean) => {
    onSettingsChange({
      enabledCategories: {
        ...settings.enabledCategories,
        [category]: value,
      },
    });
  };
  
  const handleClose = () => {
    setView('main'); // Reset view on close
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in"
        onClick={handleClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md m-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 relative">
           {view !== 'main' && (
             <button onClick={() => setView('main')} className="absolute left-4 p-2 rounded-full hover:bg-slate-700">
                <ArrowLeftIcon className="w-6 h-6 text-slate-400"/>
             </button>
           )}
          <h2 className="text-lg font-bold text-slate-100 w-full text-center">{titles[view]}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-700 absolute right-4">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="relative h-[480px] overflow-hidden">
            {/* Main Settings View */}
            <div className={`absolute inset-0 p-6 space-y-4 transition-transform duration-300 ease-in-out ${view === 'main' ? 'translate-x-0' : '-translate-x-full'}`}>
                <button onClick={() => setView('general')} className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                    <span className="text-slate-200">Основные</span>
                    <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                </button>
                <button onClick={() => setView('automation')} className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                    <span className="text-slate-200">Автоматизация (AI)</span>
                    <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                </button>
                <button onClick={() => setView('categories')} className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                    <span className="text-slate-200">Категории для практики</span>
                    <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* General View */}
            <div className={`absolute inset-0 p-6 space-y-6 transition-transform duration-300 ease-in-out ${view === 'general' ? 'translate-x-0' : 'translate-x-full'}`}>
                <fieldset className="space-y-4">
                    <legend className="sr-only">Основные настройки</legend>
                    <div className="flex items-center justify-between">
                        <label htmlFor="autoSpeak" className="text-slate-200">Автоматическое произношение</label>
                        <button id="autoSpeak" role="switch" aria-checked={settings.autoSpeak} onClick={() => handleSettingChange('autoSpeak', !settings.autoSpeak)} className={`${settings.autoSpeak ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                            <span className={`${settings.autoSpeak ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <label htmlFor="soundEffects" className="text-slate-200">Звуковые эффекты</label>
                        <button id="soundEffects" role="switch" aria-checked={settings.soundEffects} onClick={() => handleSettingChange('soundEffects', !settings.soundEffects)} className={`${settings.soundEffects ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                            <span className={`${settings.soundEffects ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                </fieldset>
            </div>

             {/* Automation View */}
            <div className={`absolute inset-0 p-6 space-y-6 transition-transform duration-300 ease-in-out ${view === 'automation' ? 'translate-x-0' : 'translate-x-full'}`}>
                <fieldset className="space-y-4">
                     <legend className="sr-only">Настройки автоматизации</legend>
                    <div className="flex items-center justify-between">
                        <div>
                            <label htmlFor="autoCheckShortPhrases" className="text-slate-200">Автопроверка коротких фраз</label>
                            <p className="text-xs text-slate-400">Мгновенная проверка, если фраза собрана верно.</p>
                        </div>
                        <button id="autoCheckShortPhrases" role="switch" aria-checked={settings.automation.autoCheckShortPhrases} onClick={() => handleAutomationChange('autoCheckShortPhrases', !settings.automation.autoCheckShortPhrases)} className={`${settings.automation.autoCheckShortPhrases ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                            <span className={`${settings.automation.autoCheckShortPhrases ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <label htmlFor="learnNextPhraseHabit" className="text-slate-200">Привычка "Следующая фраза"</label>
                            <p className="text-xs text-slate-400">Автопереход при быстрой серии правильных ответов.</p>
                        </div>
                        <button id="learnNextPhraseHabit" role="switch" aria-checked={settings.automation.learnNextPhraseHabit} onClick={() => handleAutomationChange('learnNextPhraseHabit', !settings.automation.learnNextPhraseHabit)} className={`${settings.automation.learnNextPhraseHabit ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                            <span className={`${settings.automation.learnNextPhraseHabit ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                </fieldset>
            </div>


            {/* Categories View */}
            <div className={`absolute inset-0 p-6 space-y-4 transition-transform duration-300 ease-in-out hide-scrollbar overflow-y-auto ${view === 'categories' ? 'translate-x-0' : 'translate-x-full'}`}>
                 <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
                    {categories.map(category => (
                        <div className="flex items-center justify-between" key={category.id}>
                            <label htmlFor={category.id} className="text-slate-200 flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${category.color}`}></span>
                                {category.name}
                            </label>
                            <button id={category.id} role="switch" aria-checked={settings.enabledCategories[category.id] ?? true} onClick={() => handleCategoryChange(category.id, !(settings.enabledCategories[category.id] ?? true))} className={`${(settings.enabledCategories[category.id] ?? true) ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                <span className={`${(settings.enabledCategories[category.id] ?? true) ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    ))}
                </div>
                <button onClick={onOpenCategoryManager} className="w-full text-center px-4 py-3 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors font-semibold text-white shadow-md mt-2">
                    Управление категориями
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;