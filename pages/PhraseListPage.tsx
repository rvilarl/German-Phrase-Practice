import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Phrase, SpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from '../types';
import PhraseListItem from '../components/PhraseListItem';
import XCircleIcon from '../components/icons/XCircleIcon';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import Spinner from '../components/Spinner';
import PhrasePreviewModal from '../components/PhrasePreviewModal';

interface PhraseListPageProps {
    phrases: Phrase[];
    onEditPhrase: (phrase: Phrase) => void;
    onDeletePhrase: (phraseId: string) => void;
    onFindDuplicates: () => Promise<{ duplicateGroups: string[][] }>;
    updateAndSavePhrases: (updater: (prevPhrases: Phrase[]) => Phrase[]) => void;
    onStartPractice: (phrase: Phrase) => void;
    highlightedPhraseId: string | null;
    onClearHighlight: () => void;
}

type ListItem = 
    | { type: 'header'; title: string }
    | { type: 'phrase'; phrase: Phrase };

const PhraseListPage: React.FC<PhraseListPageProps> = ({ phrases, onEditPhrase, onDeletePhrase, onFindDuplicates, updateAndSavePhrases, onStartPractice, highlightedPhraseId, onClearHighlight }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessingDuplicates, setIsProcessingDuplicates] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);
    const [previewPhrase, setPreviewPhrase] = useState<Phrase | null>(null);

    const [isListening, setIsListening] = useState(false);
    const [recognitionLang, setRecognitionLang] = useState<'ru' | 'de'>('ru');
    const ruRecognitionRef = useRef<SpeechRecognition | null>(null);
    const deRecognitionRef = useRef<SpeechRecognition | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const setupRecognizer = (lang: 'ru-RU' | 'de-DE'): SpeechRecognition => {
                const recognition = new SpeechRecognitionAPI();
                recognition.lang = lang;
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onend = () => {
                    setIsListening(false);
                };
                
                recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                    if (event.error !== 'aborted' && event.error !== 'no-speech') {
                      console.error(`Speech recognition error (${lang}):`, event.error);
                    }
                    setIsListening(false);
                };

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = event.results[0]?.[0]?.transcript;
                    if (transcript && transcript.trim()) {
                        setSearchTerm(transcript);
                    }
                };

                return recognition;
            }

            ruRecognitionRef.current = setupRecognizer('ru-RU');
            deRecognitionRef.current = setupRecognizer('de-DE');
        }
    }, []);

    const handleLangChange = (lang: 'ru' | 'de') => {
        if (lang === recognitionLang) return; // No change
        setRecognitionLang(lang);
        if (isListening) {
            // Stop current recognizer
            (recognitionLang === 'ru' ? ruRecognitionRef.current : deRecognitionRef.current)?.stop();

            // Start new recognizer
            const newRecognizer = lang === 'ru' ? ruRecognitionRef.current : deRecognitionRef.current;
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
        const recognizer = recognitionLang === 'ru' ? ruRecognitionRef.current : deRecognitionRef.current;
        if (!recognizer) return;
        
        if (isListening) {
            recognizer.stop();
        } else {
            setSearchTerm('');
            setIsListening(true);
            try {
                // Ensure the other recognizer is stopped
                (recognitionLang === 'ru' ? deRecognitionRef.current : ruRecognitionRef.current)?.stop();
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
            ruRecognitionRef.current?.stop();
            deRecognitionRef.current?.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const detectedSearchLang = useMemo(() => {
        if (!searchTerm) return 'ru';
        return /[\u0400-\u04FF]/.test(searchTerm) ? 'ru' : 'de';
    }, [searchTerm]);

    const filteredPhrases = useMemo(() => {
        const allDuplicateIds = new Set(duplicateGroups.flat());
        
        let baseList = phrases;
        if (allDuplicateIds.size > 0) {
            baseList = phrases.filter(p => allDuplicateIds.has(p.id));
        }

        const lowercasedTerm = searchTerm.toLowerCase().trim();
        if (!lowercasedTerm) return baseList;

        const scoredPhrases = baseList
            .map(phrase => {
                const phraseText = (detectedSearchLang === 'ru' ? phrase.russian : phrase.german).toLowerCase();
                let score = 0;

                if (!phraseText) {
                    return { phrase, score };
                }

                const termIndex = phraseText.indexOf(lowercasedTerm);

                // Main score: exact substring match
                if (termIndex !== -1) {
                    score += 100; // Base score for a match
                    
                    // Bonus for starting at the beginning of the string
                    if (termIndex === 0) {
                        score += 50;
                    }
                    
                    // Bonus for being a "whole word" match
                    const isStartBoundary = termIndex === 0 || /\s/.test(phraseText.charAt(termIndex - 1));
                    const endOfTermIndex = termIndex + lowercasedTerm.length;
                    const isEndBoundary = endOfTermIndex === phraseText.length || /\s/.test(phraseText.charAt(endOfTermIndex));
                    
                    if (isStartBoundary && isEndBoundary) {
                        score += 20;
                    }

                    // Penalty based on how much longer the phrase is than the search term
                    score -= (phraseText.length - lowercasedTerm.length) * 0.1;
                } else {
                    // Fallback: Check for all search words being present, but not necessarily in order
                    const searchWords = lowercasedTerm.split(/\s+/).filter(Boolean);
                    if (searchWords.length > 1) {
                        const allWordsIncluded = searchWords.every(word => phraseText.includes(word));
                        if (allWordsIncluded) {
                            score += 10; // Lower score for out-of-order or separated words
                        }
                    }
                }

                return { phrase, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return scoredPhrases.map(item => item.phrase);
    }, [phrases, searchTerm, duplicateGroups, detectedSearchLang]);

    const listItems = useMemo((): ListItem[] => {
        const inProgress: Phrase[] = [];
        const mastered: Phrase[] = [];
        const newPhrases: Phrase[] = [];

        filteredPhrases.forEach(p => {
            if (p.isMastered) mastered.push(p);
            else if (p.lastReviewedAt === null) newPhrases.push(p);
            else inProgress.push(p);
        });
        
        const items: ListItem[] = [];
        const createSection = (title: string, phrases: Phrase[]) => {
            if (phrases.length > 0) {
                items.push({ type: 'header', title: `${title} (${phrases.length})` });
                phrases.forEach(p => items.push({ type: 'phrase', phrase: p }));
            }
        };
        
        createSection('В процессе', inProgress);
        createSection('Освоенные', mastered);
        createSection('Новые', newPhrases);
        
        return items;
    }, [filteredPhrases]);

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


    const handleFindDuplicates = async () => {
        setIsProcessingDuplicates(true);
        setDuplicateGroups([]);
        try {
            const { duplicateGroups } = await onFindDuplicates();
            setDuplicateGroups(duplicateGroups);
            if (duplicateGroups.length === 0) {
                alert('Дубликаты не найдены.');
            }
        } catch (error) {
            alert(`Ошибка при поиске дубликатов: ${(error as Error).message}`);
        } finally {
            setIsProcessingDuplicates(false);
        }
    };

    const handleCleanDuplicates = useCallback(() => {
        if (duplicateGroups.length === 0) return;

        if (!window.confirm(`Найдено ${duplicateGroups.length} групп дубликатов. Удалить лишние фразы, оставив в каждой группе фразу с наибольшим прогрессом?`)) {
            return;
        }

        updateAndSavePhrases(currentPhrases => {
            const phraseMap = new Map(currentPhrases.map(p => [p.id, p]));
            const idsToDelete = new Set<string>();

// FIX: Refactored the duplicate cleaning logic to be more robust and type-safe.
            duplicateGroups.forEach(group => {
                const phrasesInGroup = group
                    .map(id => phraseMap.get(id))
                    .filter((p): p is Phrase => !!p);

                if (phrasesInGroup.length < 2) {
                    return;
                }

                // Sort by knowCount descending to find the best one
                phrasesInGroup.sort((a, b) => b.knowCount - a.knowCount);

                // The first item is the one to keep. Mark all others for deletion.
                for (let i = 1; i < phrasesInGroup.length; i++) {
                    idsToDelete.add(phrasesInGroup[i].id);
                }
            });

            return currentPhrases.filter(p => p && !idsToDelete.has(p.id));
        });

        setDuplicateGroups([]);
        alert('Дубликаты были успешно удалены.');
    }, [duplicateGroups, updateAndSavePhrases]);

    const duplicateIdSet = useMemo(() => new Set(duplicateGroups.flat()), [duplicateGroups]);

    return (
        <>
            <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
                <div className="flex-shrink-0 sticky top-20 z-20 bg-zinc-100/95 dark:bg-slate-900/95 backdrop-blur-sm px-2 py-3">
                    <div className="relative group">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={isListening ? "Слушаю..." : "Поиск по фразам..."}
                            className="w-full bg-white dark:bg-slate-800 border border-zinc-300 dark:border-slate-700 rounded-full py-4 pl-5 pr-40 text-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1 z-10">
                            {searchTerm && !isListening && (
                                <button onClick={handleClearSearch} className="p-1 text-zinc-400 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-white">
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            )}
                            <div className="flex items-center bg-zinc-200 dark:bg-slate-700/50 rounded-full p-0.5">
                                <button 
                                    onClick={() => handleLangChange('ru')}
                                    className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${recognitionLang === 'ru' ? 'bg-purple-600 text-white' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-300 dark:hover:bg-slate-600'}`}
                                >
                                    RU
                                </button>
                                <button 
                                    onClick={() => handleLangChange('de')}
                                    className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${recognitionLang === 'de' ? 'bg-purple-600 text-white' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-300 dark:hover:bg-slate-600'}`}
                                >
                                    DE
                                </button>
                            </div>
                            <button onClick={handleMicClick} className="p-2 transition-colors">
                                <MicrophoneIcon className={`w-6 h-6 ${isListening ? 'mic-color-shift-animation' : 'text-zinc-400 dark:text-slate-400 group-hover:text-zinc-800 dark:group-hover:text-white'}`} />
                            </button>
                        </div>
                    </div>
                     <div className="flex justify-end items-center pt-2 min-h-[34px]">
                        {duplicateGroups.length > 0 ? (
                             <div className="flex space-x-2">
                                <button
                                    onClick={() => setDuplicateGroups([])}
                                    className="px-3 py-1.5 text-sm bg-zinc-200 dark:bg-slate-600 hover:bg-zinc-300 dark:hover:bg-slate-700 text-zinc-800 dark:text-white font-semibold rounded-md transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleCleanDuplicates}
                                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                                >
                                    Очистить дубликаты ({duplicateGroups.length})
                                </button>
                             </div>
                        ) : (
                            <button
                                onClick={handleFindDuplicates}
                                disabled={isProcessingDuplicates}
                                className="relative text-sm text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200 font-medium transition-colors disabled:opacity-50 h-[34px] flex items-center justify-center px-3"
                            >
                                <span className={isProcessingDuplicates ? 'opacity-0' : 'opacity-100'}>
                                    Найти дубликаты
                                </span>
                                {isProcessingDuplicates && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Spinner />
                                    </div>
                                )}
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto px-2 pb-6 hide-scrollbar">
                    {listItems.length > 0 ? (
                        <ul className="space-y-2">
                            {listItems.map((item, index) => {
                                if (item.type === 'header') {
                                    return (
                                        <li key={`header-${index}`}>
                                            <h2 className="text-lg font-bold text-zinc-600 dark:text-slate-300 my-4 px-2 sticky top-0 bg-zinc-100/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 z-10 -mx-2">
                                                {item.title}
                                            </h2>
                                        </li>
                                    );
                                }
                                return (
                                    <PhraseListItem
                                        key={item.phrase.id}
                                        phrase={item.phrase}
                                        onEdit={onEditPhrase}
                                        onDelete={onDeletePhrase}
                                        isDuplicate={duplicateIdSet.has(item.phrase.id)}
                                        isHighlighted={item.phrase.id === highlightedPhraseId}
                                        onPreview={setPreviewPhrase}
                                        onStartPractice={onStartPractice}
                                    />
                                );
                            })}
                        </ul>
                    ) : (
                         <p className="text-center text-zinc-500 dark:text-slate-400 mt-8">
                            {searchTerm ? 'Фразы не найдены.' : 'Список фраз пуст.'}
                        </p>
                    )}
                </div>
            </div>
            <PhrasePreviewModal 
              phrase={previewPhrase} 
              onClose={() => setPreviewPhrase(null)} 
              onStartPractice={onStartPractice}
            />
        </>
    );
};

export default PhraseListPage;