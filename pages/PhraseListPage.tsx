import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Phrase, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
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
    const [searchLang, setSearchLang] = useState<'ru' | 'de'>('ru');
    const [isProcessingDuplicates, setIsProcessingDuplicates] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);
    const [previewPhrase, setPreviewPhrase] = useState<Phrase | null>(null);

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const shouldRestartRecognition = useRef(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => setIsListening(true);
            
            recognition.onend = () => {
                setIsListening(false);
                if (shouldRestartRecognition.current) {
                    shouldRestartRecognition.current = false;
                    try {
                        recognition.start();
                    } catch(e) {
                        console.error("Error restarting recognition:", e);
                    }
                }
            };
            
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                if (event.error !== 'aborted' && event.error !== 'no-speech') {
                  console.error('Speech recognition error:', event.error);
                }
                shouldRestartRecognition.current = false;
                setIsListening(false);
            };

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setSearchTerm(transcript);
            };
            recognitionRef.current = recognition;
        }
    }, []);

    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            shouldRestartRecognition.current = false;
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.lang = searchLang === 'ru' ? 'ru-RU' : 'de-DE';
            recognitionRef.current.start();
        }
    };
    
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        if (isListening && recognitionRef.current) {
            shouldRestartRecognition.current = true;
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const filteredPhrases = useMemo(() => {
        const allDuplicateIds = new Set(duplicateGroups.flat());
        
        let baseList = phrases;
        if (allDuplicateIds.size > 0) {
            baseList = phrases.filter(p => allDuplicateIds.has(p.id));
        }

        const lowercasedTerm = searchTerm.toLowerCase().trim();
        if (!lowercasedTerm) return baseList;

        const searchWords = lowercasedTerm.split(/\s+/);

        return baseList.filter(p => {
            const phraseText = (searchLang === 'ru' ? p.russian : p.german).toLowerCase();
            return searchWords.every(word => phraseText.includes(word));
        });
    }, [phrases, searchTerm, duplicateGroups, searchLang]);

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

    const rowVirtualizer = useVirtualizer({
        count: listItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => (listItems[index].type === 'header' ? 56 : 96), // 56px for header, 96px for phrase item
        overscan: 10,
    });

    useEffect(() => {
        if (highlightedPhraseId) {
            const index = listItems.findIndex(item => item.type === 'phrase' && item.phrase.id === highlightedPhraseId);
            if (index !== -1) {
                rowVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
                const timer = setTimeout(() => {
                    onClearHighlight();
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [highlightedPhraseId, onClearHighlight, listItems, rowVirtualizer]);


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

            duplicateGroups.forEach(group => {
                let bestPhrase: Phrase | null = null;
                group.forEach(phraseId => {
                    const phrase = phraseMap.get(phraseId);
                    if (phrase) {
                        if (!bestPhrase || phrase.knowCount > bestPhrase.knowCount) {
                            if (bestPhrase) idsToDelete.add(bestPhrase.id);
                            bestPhrase = phrase;
                        } else {
                            idsToDelete.add(phrase.id);
                        }
                    }
                });
            });

            return currentPhrases.filter(p => p && !idsToDelete.has(p.id));
        });

        setDuplicateGroups([]);
        alert('Дубликаты были успешно удалены.');
    }, [duplicateGroups, updateAndSavePhrases]);

    const duplicateIdSet = useMemo(() => new Set(duplicateGroups.flat()), [duplicateGroups]);

    return (
        <>
            <div className="w-full max-w-2xl mx-auto flex flex-col pt-20 h-full">
                <div className="flex-shrink-0 px-2 py-4">
                    <div className="relative">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={(e) => e.target.placeholder = ''}
                            onBlur={(e) => e.target.placeholder = 'Поиск по фразам...'}
                            placeholder="Поиск по фразам..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-4 pr-32 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                            {searchTerm && (
                                <button onClick={handleClearSearch} className="p-1 text-slate-400 hover:text-white">
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            )}
                             <button 
                                onClick={() => setSearchLang('ru')} 
                                className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${searchLang === 'ru' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                RU
                            </button>
                            <button 
                                onClick={() => setSearchLang('de')} 
                                className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${searchLang === 'de' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                DE
                            </button>
                            <button onClick={handleMicClick} className={`p-1 ${isListening ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
                                <MicrophoneIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                     <div className="flex justify-end space-x-2 mt-2">
                        {duplicateGroups.length > 0 ? (
                             <>
                                <button
                                    onClick={() => setDuplicateGroups([])}
                                    className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleCleanDuplicates}
                                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                                >
                                    Очистить дубликаты ({duplicateGroups.length})
                                </button>
                             </>
                        ) : (
                            <button
                                onClick={handleFindDuplicates}
                                disabled={isProcessingDuplicates}
                                className="relative px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 min-w-[140px] h-[34px]"
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
                <div ref={parentRef} className="flex-grow overflow-y-auto px-2 pb-6 hide-scrollbar">
                    {rowVirtualizer.getVirtualItems().length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map(virtualItem => {
                                const item = listItems[virtualItem.index];
                                return (
                                    <div
                                        key={virtualItem.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        {item.type === 'header' ? (
                                            <h2 className="text-lg font-bold text-slate-300 my-4 px-2">
                                                {item.title}
                                            </h2>
                                        ) : (
                                            <div className="py-1">
                                                <PhraseListItem
                                                    phrase={item.phrase}
                                                    onEdit={onEditPhrase}
                                                    onDelete={onDeletePhrase}
                                                    isDuplicate={duplicateIdSet.has(item.phrase.id)}
                                                    isHighlighted={item.phrase.id === highlightedPhraseId}
                                                    onPreview={setPreviewPhrase}
                                                    onStartPractice={onStartPractice}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <p className="text-center text-slate-400 mt-8">
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