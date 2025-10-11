
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Phrase, PhraseCategory, Category, LanguageCode } from '../types';

// Local type definitions for Speech Recognition API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

// Extend window interface for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import PhraseListItem from '../components/PhraseListItem';
import XCircleIcon from '../components/icons/XCircleIcon';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import PhrasePreviewModal from '../components/PhrasePreviewModal';
import { FiCopy, FiZap } from 'react-icons/fi';
import CategoryFilterContextMenu from '../components/CategoryFilterContextMenu';
import FindDuplicatesModal from '../components/FindDuplicatesModal';

import * as backendService from '../services/backendService';
import { useTranslation } from '../src/hooks/useTranslation';
import { useLanguage } from '../src/contexts/languageContext';
import { SPEECH_LOCALE_MAP } from '../constants/speechLocales';
import { getLanguageLabel } from '../services/languageLabels';
import { useDebounce } from '../src/hooks/useDebounce';

interface PhraseListPageProps {
    phrases: Phrase[];
    onEditPhrase: (phrase: Phrase) => void;
    onDeletePhrase: (phraseId: string) => void;
    onFindDuplicates: () => Promise<{ duplicateGroups: string[][] }>;
    updateAndSavePhrases: (updater: (prevPhrases: Phrase[]) => Phrase[]) => void;
    onStartPractice: (phrase: Phrase) => void;
    highlightedPhraseId: string | null;
    onClearHighlight: () => void;
    onOpenSmartImport: () => void;
    categories: Category[];
    onUpdatePhraseCategory: (phraseId: string, newCategoryId: string) => void;
    onStartPracticeWithCategory: (categoryId: PhraseCategory) => void;
    onEditCategory: (category: Category) => void;
    onOpenAssistant: (category: Category) => void;
    backendService: typeof backendService;
    onOpenWordAnalysis?: (phrase: Phrase, word: string) => void;
}

type ListItem = 
    | { type: 'header'; title: string }
    | { type: 'phrase'; phrase: Phrase };

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const WORD_BOUNDARY_REGEX = /[\s.,!?;:'"()[\]{}\-]/;

const normalizeForSearch = (value: string) => value.normalize('NFD').replace(DIACRITICS_REGEX, '');

const computeMatchScore = (text: string | undefined | null, normalizedTerm: string): number => {
    if (!text) {
        return 0;
    }

    const normalizedText = normalizeForSearch(text.toLowerCase());
    if (!normalizedText) {
        return 0;
    }

    const termIndex = normalizedText.indexOf(normalizedTerm);
    if (termIndex === -1) {
        return 0;
    }

    let score = 100;

    if (termIndex === 0) {
        score += 50;
    }

    const endIndex = termIndex + normalizedTerm.length;
    const charBefore = normalizedText.charAt(termIndex - 1);
    const charAfter = normalizedText.charAt(endIndex);

    const isStartBoundary = termIndex === 0 || WORD_BOUNDARY_REGEX.test(charBefore);
    const isEndBoundary = endIndex >= normalizedText.length || WORD_BOUNDARY_REGEX.test(charAfter);

    if (isStartBoundary && isEndBoundary) {
        score += 20;
    }

    score -= Math.max(0, normalizedText.length - normalizedTerm.length) * 0.05;

    return score;
};


// FIX: Changed to a named export to resolve "no default export" error in App.tsx.
export const PhraseListPage: React.FC<PhraseListPageProps> = ({ phrases, onEditPhrase, onDeletePhrase, onFindDuplicates, updateAndSavePhrases, onStartPractice, highlightedPhraseId, onClearHighlight, onOpenSmartImport, categories, onUpdatePhraseCategory, onStartPracticeWithCategory, onEditCategory, onOpenAssistant, backendService, onOpenWordAnalysis }) => {
    const { t } = useTranslation();
    const { profile } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [categoryFilter, setCategoryFilter] = useState<'all' | PhraseCategory>('all');
    const [previewPhrase, setPreviewPhrase] = useState<Phrase | null>(null);
    const [isFindDuplicatesModalOpen, setIsFindDuplicatesModalOpen] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [recognitionLang, setRecognitionLang] = useState<LanguageCode>(profile.native);
    const nativeRecognitionRef = useRef<SpeechRecognition | null>(null);
    const learningRecognitionRef = useRef<SpeechRecognition | null>(null);
    
    const [contextMenu, setContextMenu] = useState<{ category: Category; x: number; y: number } | null>(null);
    // FIX: Changed `useRef<number>()` to the more explicit and safer `useRef<number | null>(null)`. The original syntax, while valid, can sometimes be misinterpreted by build tools, and this change resolves the potential ambiguity that might be causing the reported error.
    const longPressTimer = useRef<number | null>(null);
    const isLongPress = useRef(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const filterButtonsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const setupRecognizer = (langCode: LanguageCode): SpeechRecognition => {
                const recognition = new SpeechRecognitionAPI();
                recognition.lang = SPEECH_LOCALE_MAP[langCode] || 'en-US';
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                    if (event.error !== 'aborted' && event.error !== 'no-speech') {
                      console.error(`Speech recognition error (${langCode}):`, event.error);
                    }
                    setIsListening(false);
                };

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0]?.transcript ?? '')
                        .join('')
                        .trim();

                    if (transcript) {
                        setSearchTerm(transcript);
                    }

                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult?.isFinal) {
                        setIsListening(false);
                        try {
                            recognition.stop();
                        } catch (error) {
                            console.warn('Speech recognition could not be stopped cleanly:', error);
                        }
                    }
                };

                return recognition;
            }

            nativeRecognitionRef.current = setupRecognizer(profile.native);
            learningRecognitionRef.current = setupRecognizer(profile.learning);
        }
    }, [profile.native, profile.learning]);

    const handleLangChange = (lang: LanguageCode) => {
        if (lang === recognitionLang) return; // No change
        setRecognitionLang(lang);
        if (isListening) {
            // Stop current recognizer
            (recognitionLang === profile.native ? nativeRecognitionRef.current : learningRecognitionRef.current)?.stop();

            // Start new recognizer
            const newRecognizer = lang === profile.native ? nativeRecognitionRef.current : learningRecognitionRef.current;
            if (newRecognizer) {
                try {
                    newRecognizer.start();
                } catch(e) {
                    console.error("Could not switch recognition language:", e);
                    setIsListening(false);
                }
            }
        }
    };

    const handleMicClick = () => {
        const recognizer = recognitionLang === profile.native ? nativeRecognitionRef.current : learningRecognitionRef.current;
        if (!recognizer) return;

        if (isListening) {
            recognizer.stop();
        } else {
            setSearchTerm('');
            setIsListening(true);
            try {
                // Ensure the other recognizer is stopped
                (recognitionLang === profile.native ? learningRecognitionRef.current : nativeRecognitionRef.current)?.stop();
                recognizer.start();
            } catch (e) {
                console.error("Could not start recognition:", e);
                setIsListening(false);
            }
        }
    };
    
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        if (isListening) {
            nativeRecognitionRef.current?.stop();
            learningRecognitionRef.current?.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const handleContextMenuClose = () => {
        setContextMenu(null);
        isLongPress.current = false;
    };
    
    const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>, category: Category) => {
        if (categoryFilter === category.id) { // Only on active button
            isLongPress.current = false;
            longPressTimer.current = window.setTimeout(() => {
                isLongPress.current = true;
                setContextMenu({ category, x: e.clientX, y: e.clientY });
            }, 500);
        }
    };

    const handleButtonPointerUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleButtonClick = (category: Category) => {
        if (isLongPress.current) {
            return;
        }

        if (categoryFilter === category.id) {
            onStartPracticeWithCategory(category.id);
        } else {
            setCategoryFilter(category.id);
        }
    };


    const effectiveSearchTerm = useMemo(() => {
        if (isListening) {
            return searchTerm;
        }
        return debouncedSearchTerm || searchTerm;
    }, [searchTerm, debouncedSearchTerm, isListening]);

    const filteredPhrases = useMemo(() => {
        let baseList = phrases;

        if (categoryFilter !== 'all') {
            baseList = baseList.filter(p => p.category === categoryFilter);
        }
        
        const normalizedTermInput = effectiveSearchTerm.trim().toLowerCase();
        if (!normalizedTermInput) return baseList;

        const normalizedTerm = normalizeForSearch(normalizedTermInput);
        if (!normalizedTerm) {
            return baseList;
        }

        const scoredPhrases = baseList
            .map(phrase => {
                const searchTargets: Array<{ text: string | undefined; weight: number }> = [
                    { text: phrase.text.learning, weight: 1 },
                    { text: phrase.text.native, weight: 1 },
                    { text: phrase.romanization?.learning, weight: 0.7 },
                    { text: phrase.context?.native, weight: 0.5 },
                ];

                const bestScore = searchTargets.reduce((currentBest, target) => {
                    const score = computeMatchScore(target.text, normalizedTerm);
                    if (score <= 0) {
                        return currentBest;
                    }
                    const weightedScore = score * target.weight;
                    return weightedScore > currentBest ? weightedScore : currentBest;
                }, 0);

                return { phrase, score: bestScore };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return scoredPhrases.map(item => item.phrase);
    }, [phrases, categoryFilter, effectiveSearchTerm]);

    const listItems = useMemo((): ListItem[] => {
        const sections = {
            new: [] as Phrase[],
            inProgress: [] as Phrase[],
            mastered: [] as Phrase[]
        };

        // Single pass through filteredPhrases to categorize all phrases
        filteredPhrases.forEach(p => {
            if (p.isMastered) {
                sections.mastered.push(p);
            } else if (p.lastReviewedAt === null) {
                sections.new.push(p);
            } else {
                sections.inProgress.push(p);
            }
        });

        const items: ListItem[] = [];

        // Create sections in order: new, inProgress, mastered
        const sectionOrder: Array<{ key: keyof typeof sections; titleKey: string }> = [
            { key: 'new', titleKey: 'phraseList.sections.new' },
            { key: 'inProgress', titleKey: 'phraseList.sections.inProgress' },
            { key: 'mastered', titleKey: 'phraseList.sections.mastered' }
        ];

        sectionOrder.forEach(({ key, titleKey }) => {
            const phrases = sections[key];
            if (phrases.length > 0) {
                items.push({ type: 'header', title: `${t(titleKey)} (${phrases.length})` });
                phrases.forEach(p => items.push({ type: 'phrase', phrase: p }));
            }
        });

        return items;
    }, [filteredPhrases, t]);

    useEffect(() => {
        if (highlightedPhraseId) {
            const element = document.getElementById(`phrase-item-${highlightedPhraseId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const timer = setTimeout(() => {
                    onClearHighlight();
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [highlightedPhraseId, onClearHighlight, listItems]);

    // Прокрутка к активной кнопке фильтра
    useEffect(() => {
        if (!filterButtonsContainerRef.current) return;

        const container = filterButtonsContainerRef.current;
        const activeButton = container.querySelector('button.bg-purple-600') as HTMLButtonElement;
        
        if (!activeButton) return;

        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        // Проверяем, видна ли кнопка полностью
        const isFullyVisible =
            buttonRect.left >= containerRect.left &&
            buttonRect.right <= containerRect.right;

        if (!isFullyVisible) {
            // Если кнопка не полностью видна, прокручиваем к ней
            activeButton.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [categoryFilter]);



    return (
        <>
            <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
                <div className="flex-shrink-0 sticky top-20 z-20">
                    <div className="backdrop-blur-lg rounded-xl">
                        
                        {/* Поиск */}
                        <div className="relative group">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={isListening ? t('phraseList.search.listening') : t('phraseList.search.placeholder')}
                                className="w-full bg-slate-400/10 backdrop-blur-lg border border-white/20 rounded-full py-4 pl-5 pr-40 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1 z-10">
                                {searchTerm && !isListening && (
                                    <button onClick={handleClearSearch} className="p-1 text-slate-400 hover:text-white">
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                )}
                                <div className="flex items-center bg-slate-700/50 rounded-full p-0.5">
                                    <button
                                        onClick={() => handleLangChange(profile.native)}
                                        className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${recognitionLang === profile.native ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-600'}`}
                                    >
                                        {getLanguageLabel(profile.native)}
                                    </button>
                                    <button
                                        onClick={() => handleLangChange(profile.learning)}
                                        className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${recognitionLang === profile.learning ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-600'}`}
                                    >
                                        {getLanguageLabel(profile.learning)}
                                    </button>
                                </div>
                                <button onClick={handleMicClick} className="p-2 transition-colors">
                                    <MicrophoneIcon className={`w-6 h-6 ${isListening ? 'mic-color-shift-animation' : 'text-slate-400 group-hover:text-white'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Кнопки фильтры категорий */}
                        <div className="mt-4">
                            <div
                                ref={filterButtonsContainerRef}
                                className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar"
                            >
                                <button
                                    onClick={() => setCategoryFilter('all')}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                >
                                    {t('phraseList.filters.all')}
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onPointerDown={(e) => handleButtonPointerDown(e, cat)}
                                        onPointerUp={handleButtonPointerUp}
                                        onPointerLeave={handleButtonPointerUp}
                                        onClick={() => handleButtonClick(cat)}
                                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryFilter === cat.id ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Количество карточек
                            Работа с дубликатами
                            Кнопка ассистента
                        */}
                        <div className="flex justify-between items-end mt-3">
                            <span className="text-sm text-slate-400 pl-2">
                               {t('phraseList.summary.count', { count: filteredPhrases.length })}
                            </span>
                             <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setIsFindDuplicatesModalOpen(true)}
                                    className="flex-shrink-0 flex items-center justify-center space-x-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50 h-[34px] w-12 sm:w-36"
                                >
                                    <FiCopy className="w-5 h-5" />
                                    <span className="hidden sm:inline">{t('phraseList.actions.duplicates')}</span>
                                </button>
                                <button
                                    onClick={onOpenSmartImport}
                                    className="flex-shrink-0 flex items-center justify-center space-x-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-semibold transition-colors h-[34px] w-12 sm:w-36"
                                >
                                    <FiZap className="w-5 h-5"/>
                                    <span className="hidden sm:inline">{t('phraseList.actions.aiImport')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-grow pt-2">
                    <ul className="space-y-2">
                        {listItems.map((item, index) => {
                            if (item.type === 'header') {
                                return (
                                    <li key={`header-${item.title}`} className="px-4 py-1">
                                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{item.title}</h2>
                                    </li>
                                );
                            } else {
                                const categoryInfo = categories.find(c => c.id === item.phrase.category);
                                return (
                                    <li key={item.phrase.id}>
                                        <PhraseListItem
                                            phrase={item.phrase}
                                            onEdit={onEditPhrase}
                                            onDelete={onDeletePhrase}
                                            isDuplicate={false}
                                            isHighlighted={highlightedPhraseId === item.phrase.id}
                                            onPreview={setPreviewPhrase}
                                            onStartPractice={onStartPractice}
                                            onCategoryClick={setCategoryFilter}
                                            categoryInfo={categoryInfo}
                                            allCategories={categories}
                                            onUpdatePhraseCategory={onUpdatePhraseCategory}
                                            onOpenWordAnalysis={onOpenWordAnalysis}
                                        />
                                    </li>
                                );
                            }
                        })}
                    </ul>
                </div>
            </div>
            {previewPhrase && (
                <PhrasePreviewModal 
                    phrase={previewPhrase}
                    onClose={() => setPreviewPhrase(null)}
                    onStartPractice={onStartPractice}
                />
            )}
            {contextMenu && (
                <CategoryFilterContextMenu
                    category={contextMenu.category}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={handleContextMenuClose}
                    onEdit={() => {
                        handleContextMenuClose();
                        onEditCategory(contextMenu.category);
                    }}
                    onOpenAssistant={() => {
                        handleContextMenuClose();
                        onOpenAssistant(contextMenu.category);
                    }}
                />
            )}
            {isFindDuplicatesModalOpen && (
                <FindDuplicatesModal
                    onClose={() => setIsFindDuplicatesModalOpen(false)}
                    onFindDuplicates={onFindDuplicates}
                    updateAndSavePhrases={updateAndSavePhrases}
                    phrases={phrases}
                    backendService={backendService}
                />
            )}
        </>
    );
};
