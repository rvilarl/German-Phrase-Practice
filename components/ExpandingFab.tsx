import React, { useState, useEffect, useRef } from 'react';
import PlusIcon from './icons/PlusIcon';
import CardsIcon from './icons/CardsIcon';
import SmartToyIcon from './icons/SmartToyIcon';
import BookIcon from './BookIcon';

interface ExpandingFabProps {
  onAddPhrase: (options: { language: 'ru' | 'de'; autoSubmit: boolean }) => void;
  onSmartImport: () => void;
  onOpenLibrary: () => void;
  disabled: boolean;
}

const ExpandingFab: React.FC<ExpandingFabProps> = ({ onAddPhrase, onSmartImport, onOpenLibrary, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (disabled) return;
    if (isLangOpen) {
      setIsLangOpen(false);
      setTimeout(() => setIsOpen(prev => !prev), 150);
    } else {
      setIsOpen(prev => !prev);
    }
  };

  const toggleLangOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLangOpen(prev => !prev);
  };
  
  const handleAddClick = (language: 'ru' | 'de') => {
    onAddPhrase({
      language,
      autoSubmit: language === 'ru',
    });
    // Reset state after click
    setIsLangOpen(false);
    setIsOpen(false);
  };

  const handleSmartImportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSmartImport();
    setIsLangOpen(false);
    setIsOpen(false);
  };

  const handleLibraryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenLibrary();
    setIsLangOpen(false);
    setIsOpen(false);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-y-3">
        {/* Language Options */}
        <div className={`transition-all duration-200 ease-out flex flex-col items-center gap-y-3 ${isLangOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <button
              onClick={() => handleAddClick('de')}
              className="bg-slate-200 text-slate-800 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-md hover:bg-slate-300 transition-colors"
              aria-label="Добавить фразу на немецком"
            >
              DE
            </button>
            <button
              onClick={() => handleAddClick('ru')}
              className="bg-slate-200 text-slate-800 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-md hover:bg-slate-300 transition-colors"
              aria-label="Добавить фразу на русском"
            >
              RU
            </button>
        </div>

        {/* Main Options */}
        <div className={`transition-all duration-200 ease-out flex flex-col items-center gap-y-3 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
             <button
              onClick={handleLibraryClick}
              className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
              aria-label="Открыть библиотеку"
            >
              <BookIcon className="w-6 h-6" />
            </button>
             <button
              onClick={handleSmartImportClick}
              className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
              aria-label="Умный импорт из речи"
            >
              <SmartToyIcon className="w-6 h-6" />
            </button>
             <button
              onClick={toggleLangOpen}
              className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
              aria-label="Добавить новую карточку"
            >
              <CardsIcon className="w-6 h-6" />
            </button>
        </div>

      <button
        onClick={toggleOpen}
        disabled={disabled}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Добавить"
        aria-expanded={isOpen}
      >
        <PlusIcon className={`w-6 h-6 transition-transform duration-200 ${isOpen || isLangOpen ? 'rotate-45' : 'rotate-0'}`} />
      </button>
    </div>
  );
};

export default ExpandingFab;