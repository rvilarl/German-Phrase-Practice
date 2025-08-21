import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Phrase, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import PhraseListItem from '../components/PhraseListItem';
import XCircleIcon from '../components/icons/XCircleIcon';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import Spinner from '../components/Spinner';
import LanguagesIcon from '../components/icons/LanguagesIcon';

interface PhraseListPageProps {
    phrases: Phrase[];
    onEditPhrase: (phrase: Phrase) => void;
    onDeletePhrase: (phraseId: string) => void;
    onFindDuplicates: () => Promise<{ duplicateGroups: string[][] }>;
    updateAndSavePhrases: (updater: (prevPhrases: Phrase[]) => Phrase[]) => void;
}

type RecoLang = 'ru-RU' | 'de-DE';

const PhraseListPage: React.FC<PhraseListPageProps> = ({ phrases, onEditPhrase, onDeletePhrase, onFindDuplicates, updateAndSavePhrases }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessingDuplicates, setIsProcessingDuplicates] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);

    const [isListening, setIsListening] = useState(false);
    const [recognitionLang, setRecognitionLang] = useState<RecoLang>('ru-RU');
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
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

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = recognitionLang;
        }
    }, [recognitionLang]);

    const handleMicClick = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    const toggleRecoLang = () => {
        setRecognitionLang(prev => (prev === 'ru-RU' ? 'de-DE' : 'ru-RU'));
        if (isListening) {
            recognitionRef.current?.stop();
            // A short delay to allow the service to stop before restarting
            setTimeout(() => recognitionRef.current?.start(), 100);
        }
    };

    const filteredPhrases = useMemo(() => {
        if (!searchTerm) return phrases;
        const lowercasedTerm = searchTerm.toLowerCase();
        return phrases.filter(p =>
            p.russian.toLowerCase().includes(lowercasedTerm) ||
            p.german.toLowerCase().includes(lowercasedTerm)
        );
    }, [phrases, searchTerm]);

    const { inProgress, mastered, newPhrases } = useMemo(() => {
        const inProgress: Phrase[] = [];
        const mastered: Phrase[] = [];
        const newPhrases: Phrase[] = [];

        filteredPhrases.forEach(p => {
            if (p.isMastered) mastered.push(p);
            else if (p.lastReviewedAt === null) newPhrases.push(p);
            else inProgress.push(p);
        });

        return { inProgress, mastered, newPhrases };
    }, [filteredPhrases]);

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

    const handleCleanDuplicates = () => {
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

            return currentPhrases.filter(p => !idsToDelete.has(p.id));
        });

        setDuplicateGroups([]);
        alert('Дубликаты были успешно удалены.');
    };

    const duplicateIdSet = useMemo(() => new Set(duplicateGroups.flat()), [duplicateGroups]);

    const renderSection = (title: string, phraseList: Phrase[]) => (
        phraseList.length > 0 && (
            <section>
                <h2 className="text-lg font-bold text-slate-300 my-4 sticky top-0 bg-slate-900/80 backdrop-blur-sm py-2 z-10">{title} ({phraseList.length})</h2>
                <ul className="space-y-2">
                    {phraseList.map(phrase => (
                        <PhraseListItem
                            key={phrase.id}
                            phrase={phrase}
                            onEdit={onEditPhrase}
                            onDelete={onDeletePhrase}
                            isDuplicate={duplicateIdSet.has(phrase.id)}
                        />
                    ))}
                </ul>
            </section>
        )
    );

    return (
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-4 pr-24 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-1 text-slate-400 hover:text-white">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={toggleRecoLang}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            aria-label={`Язык ввода: ${recognitionLang === 'ru-RU' ? 'Русский' : 'Немецкий'}`}
                        >
                            <span className="font-bold text-sm">{recognitionLang === 'ru-RU' ? 'RU' : 'DE'}</span>
                        </button>
                        <button onClick={handleMicClick} className={`p-1 ${isListening ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
                            <MicrophoneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                 <div className="flex justify-end space-x-2 mt-2">
                    {duplicateGroups.length > 0 && (
                        <button
                            onClick={handleCleanDuplicates}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                        >
                            Очистить дубликаты ({duplicateGroups.length})
                        </button>
                    )}
                    <button
                        onClick={handleFindDuplicates}
                        disabled={isProcessingDuplicates}
                        className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
                    >
                        {isProcessingDuplicates ? <Spinner /> : 'Найти дубликаты'}
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto px-2 pb-6">
                {renderSection('В процессе', inProgress)}
                {renderSection('Освоенные', mastered)}
                {renderSection('Новые', newPhrases)}
            </div>
        </div>
    );
};

export default PhraseListPage;
