import React, { useState, useEffect, useRef, useContext } from 'react';
import PlusIcon from './icons/PlusIcon';
import CardsIcon from './icons/CardsIcon';
import SmartToyIcon from './icons/SmartToyIcon';
import BookIcon from './BookIcon';
import { useTranslation } from '../src/hooks/useTranslation.ts';
import { LanguageContext } from '../src/contexts/languageContext.tsx';
import type { LanguageCode } from '../types.ts';
import { BiSolidUserVoice } from "react-icons/bi";


interface ExpandingFabProps {
  onAddPhrase: (options: { language: LanguageCode; autoSubmit: boolean }) => void;
  onSmartImport: () => void;
  onOpenLibrary: () => void;
  disabled: boolean;
}

const ExpandingFab: React.FC<ExpandingFabProps> = ({ onAddPhrase, onSmartImport, onOpenLibrary, disabled }) => {
  const { t } = useTranslation();
  const languageContext = useContext(LanguageContext);
  const profile = languageContext?.profile;

  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleOpen = () => {
    if (disabled) return;
    if (isLangOpen) {
      setIsLangOpen(false);
      setTimeout(() => setIsOpen((prev) => !prev), 150);
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const toggleLangOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsLangOpen((prev) => !prev);
  };

  const getBadgeLabel = (code: LanguageCode) =>
    t(`languages.badge.${code}`, { defaultValue: code.toUpperCase() });

  const handleAddClick = (language: LanguageCode) => {
    if (!profile) return;

    onAddPhrase({
      language,
      autoSubmit: language === profile.native,
    });

    setIsLangOpen(false);
    setIsOpen(false);
  };

  const handleSmartImportClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSmartImport();
    setIsLangOpen(false);
    setIsOpen(false);
  };

  const handleLibraryClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onOpenLibrary();
    setIsLangOpen(false);
    setIsOpen(false);
  };

  if (!profile) return null;

  const languageButtons: Array<{ code: LanguageCode; label: string }> = [
    { code: profile.learning, label: getBadgeLabel(profile.learning) },
    { code: profile.native, label: getBadgeLabel(profile.native) },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-y-3">
      {/* Language Options */}
      <div
        className={`transition-all duration-200 ease-out flex flex-col items-center gap-y-3 ${
          isLangOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {languageButtons.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => handleAddClick(code)}
            className="bg-slate-200 text-slate-800 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-md hover:bg-slate-300 transition-colors"
            aria-label={t('fab.addPhrase', { language: t(`languages.names.${code}`) })}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Options */}
      <div
        className={`transition-all duration-200 ease-out flex flex-col items-center gap-y-3 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button
          onClick={handleLibraryClick}
          className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
          aria-label={t('fab.openLibrary')}
        >
          <BookIcon className="w-6 h-6" />
        </button>
        <button
          onClick={handleSmartImportClick}
          className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
          aria-label={t('fab.smartImport')}
        >
          <SmartToyIcon className="w-6 h-6" />
        </button>
        <button
          onClick={toggleLangOpen}
          className="bg-purple-600 text-white rounded-full p-3 shadow-md hover:bg-purple-500 transition-colors"
          aria-label={t('fab.chooseLanguage')}
        >
          <CardsIcon className="w-6 h-6" />
        </button>
      </div>

      <button
        onClick={toggleOpen}
        disabled={disabled}
        className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t('fab.toggle')}
        aria-expanded={isOpen}
      >
        <PlusIcon
          className={`w-6 h-6 transition-transform duration-200 ${isOpen || isLangOpen ? 'rotate-45' : 'rotate-0'}`}
        />
      </button>
    </div>
  );
};

export default ExpandingFab;
