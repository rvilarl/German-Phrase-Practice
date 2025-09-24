import React from 'react';
import CloseIcon from './icons/CloseIcon';
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
  categories: Category[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, categories }) => {
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
  
  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md m-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">Настройки</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-purple-300 mb-2">Основные</legend>
            <div className="flex items-center justify-between">
              <label htmlFor="autoSpeak" className="text-slate-200">Автоматическое произношение</label>
              <button
                id="autoSpeak"
                role="switch"
                aria-checked={settings.autoSpeak}
                onClick={() => handleSettingChange('autoSpeak', !settings.autoSpeak)}
                className={`${settings.autoSpeak ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className={`${settings.autoSpeak ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="soundEffects" className="text-slate-200">Звуковые эффекты</label>
              <button
                id="soundEffects"
                role="switch"
                aria-checked={settings.soundEffects}
                onClick={() => handleSettingChange('soundEffects', !settings.soundEffects)}
                className={`${settings.soundEffects ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className={`${settings.soundEffects ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-purple-300 mb-2">Категории для практики</legend>
            {categories.map(category => (
                 <div className="flex items-center justify-between" key={category.id}>
                    <label htmlFor={category.id} className="text-slate-200">{category.name}</label>
                    <button
                        id={category.id}
                        role="switch"
                        aria-checked={settings.enabledCategories[category.id] ?? true}
                        onClick={() => handleCategoryChange(category.id, !(settings.enabledCategories[category.id] ?? true))}
                        className={`${(settings.enabledCategories[category.id] ?? true) ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    >
                        <span className={`${(settings.enabledCategories[category.id] ?? true) ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
            ))}
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-purple-300 mb-2">Автоматизация (AI)</legend>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="learnNextPhraseHabit" className="text-slate-200">Привычка "Следующая фраза"</label>
                <p className="text-xs text-slate-400">Автопереход при быстрой серии правильных ответов.</p>
              </div>
              <button
                id="learnNextPhraseHabit"
                role="switch"
                aria-checked={settings.automation.learnNextPhraseHabit}
                onClick={() => handleAutomationChange('learnNextPhraseHabit', !settings.automation.learnNextPhraseHabit)}
                className={`${settings.automation.learnNextPhraseHabit ? 'bg-purple-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className={`${settings.automation.learnNextPhraseHabit ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;