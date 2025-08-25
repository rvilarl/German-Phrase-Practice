import React from 'react';
import CloseIcon from './icons/CloseIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    autoSpeak: boolean;
    soundEffects: boolean;
    dynamicButtonLayout: boolean;
  };
  onSettingsChange: (newSettings: Partial<SettingsModalProps['settings']>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  const handleSettingChange = (setting: keyof typeof settings, value: boolean) => {
    onSettingsChange({ [setting]: value });
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center" 
        onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm m-4"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">Настройки</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <label htmlFor="auto-speak" className="text-slate-200">
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
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
            <div className="flex items-center justify-between">
                <label htmlFor="sound-effects" className="text-slate-200">
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
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
             <div className="flex items-center justify-between">
                <label htmlFor="dynamic-layout" className="text-slate-200">
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
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;