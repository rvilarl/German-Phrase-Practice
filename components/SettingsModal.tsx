import React from 'react';
import CloseIcon from './icons/CloseIcon';

type Theme = 'light' | 'dark' | 'system';

interface Settings {
  autoSpeak: boolean;
  soundEffects: boolean;
  dynamicButtonLayout: boolean;
  theme: Theme;
  automation: {
    autoCheckShortPhrases: boolean;
    learnNextPhraseHabit: boolean;
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  const handleSettingChange = (setting: keyof Omit<Settings, 'automation' | 'theme'>, value: boolean) => {
    onSettingsChange({ [setting]: value });
  };
  
  const handleThemeChange = (theme: Theme) => {
    onSettingsChange({ theme });
  };

  const handleAutomationChange = (setting: keyof Settings['automation'], value: boolean) => {
    onSettingsChange({
      automation: {
        ...settings.automation,
        [setting]: value,
      },
    });
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center" 
        onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100">Настройки</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-zinc-500 dark:text-slate-400" />
          </button>
        </header>
        <div className="p-6 space-y-6">
            <section className="space-y-4">
                 <h3 className="text-sm font-semibold text-zinc-500 dark:text-slate-400">Основные</h3>
                <div className="flex items-center justify-between">
                    <label htmlFor="auto-speak" className="text-zinc-700 dark:text-slate-200">
                        Авто-озвучка при обороте карты
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            id="auto-speak"
                            className="sr-only peer"
                            checked={settings.autoSpeak}
                            onChange={(e) => handleSettingChange('autoSpeak', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="sound-effects" className="text-zinc-700 dark:text-slate-200">
                        Звуковые эффекты
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            id="sound-effects"
                            className="sr-only peer"
                            checked={settings.soundEffects}
                            onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                 <div className="flex items-center justify-between">
                    <label htmlFor="dynamic-layout" className="text-zinc-700 dark:text-slate-200">
                        Динамическое расположение кнопок
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            id="dynamic-layout"
                            className="sr-only peer"
                            checked={settings.dynamicButtonLayout}
                            onChange={(e) => handleSettingChange('dynamicButtonLayout', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </section>

             <section className="space-y-4 border-t border-zinc-200 dark:border-slate-700 pt-6">
                <h3 className="text-sm font-semibold text-zinc-500 dark:text-slate-400">Оформление</h3>
                <div className="flex justify-between items-center bg-zinc-100 dark:bg-slate-700 rounded-lg p-1">
                    {(['light', 'dark', 'system'] as const).map((themeOption) => (
                        <button
                            key={themeOption}
                            onClick={() => handleThemeChange(themeOption)}
                            className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${
                                settings.theme === themeOption
                                    ? 'bg-purple-600 text-white shadow'
                                    : 'text-zinc-600 dark:text-slate-300 hover:bg-zinc-200 dark:hover:bg-slate-600/50'
                            }`}
                        >
                            {themeOption === 'light' ? 'День' : themeOption === 'dark' ? 'Ночь' : 'Система'}
                        </button>
                    ))}
                </div>
            </section>
            
            <section className="space-y-4 border-t border-zinc-200 dark:border-slate-700 pt-6">
                 <h3 className="text-sm font-semibold text-zinc-500 dark:text-slate-400">Автоматизация</h3>
                <div className="flex items-center justify-between">
                    <label htmlFor="auto-check" className="text-zinc-700 dark:text-slate-200 pr-4">
                        Умная авто-проверка коротких фраз
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            id="auto-check"
                            className="sr-only peer"
                            checked={settings.automation.autoCheckShortPhrases}
                            onChange={(e) => handleAutomationChange('autoCheckShortPhrases', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                 <div className="flex items-center justify-between">
                    <label htmlFor="auto-next" className="text-zinc-700 dark:text-slate-200 pr-4">
                        Авто-переход к следующей фразе
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            id="auto-next"
                            className="sr-only peer"
                            checked={settings.automation.learnNextPhraseHabit}
                            onChange={(e) => handleAutomationChange('learnNextPhraseHabit', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 dark:bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;