import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Phrase, SpeechRecognition, SpeechRecognitionErrorEvent, TranslationChatResponse } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import XCircleIcon from './icons/XCircleIcon';
import Spinner from './Spinner';
import DiscussTranslationModal from './DiscussTranslationModal';
import AudioPlayer from './AudioPlayer';

interface EditPhraseModalProps {
    isOpen: boolean;
    onClose: () => void;
    phrase: Phrase;
    onSave: (phraseId: string, newGerman: string, newRussian: string) => void;
    onTranslate: (russianPhrase: string) => Promise<{ german: string }>;
    onDiscuss: (request: any) => Promise<TranslationChatResponse>;
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const EditPhraseModal: React.FC<EditPhraseModalProps> = ({ isOpen, onClose, phrase, onSave, onTranslate, onDiscuss }) => {
    const [russian, setRussian] = useState(phrase.russian);
    const [german, setGerman] = useState(phrase.german);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isDiscussModalOpen, setIsDiscussModalOpen] = useState(false);
    
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const debouncedRussian = useDebounce(russian, 1000);
    const initialRussianRef = useRef(phrase.russian);

    useEffect(() => {
        if (isOpen) {
            setRussian(phrase.russian);
            setGerman(phrase.german);
            setError(null);
            initialRussianRef.current = phrase.russian;
        }
    }, [isOpen, phrase]);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'ru-RU';
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
                 console.error('Speech recognition error:', e.error);
                 setIsListening(false);
            };
            recognition.onresult = (event) => {
                const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
                setRussian(transcript);
            };
            recognitionRef.current = recognition;
        }
    }, []);

    useEffect(() => {
        if (debouncedRussian && debouncedRussian.trim() && debouncedRussian !== initialRussianRef.current) {
            const getTranslation = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const { german } = await onTranslate(debouncedRussian);
                    setGerman(german);
                    initialRussianRef.current = debouncedRussian;
                } catch (err) {
                    setError('Не удалось получить перевод.');
                } finally {
                    setIsLoading(false);
                }
            };
            getTranslation();
        }
    }, [debouncedRussian, onTranslate]);
    
    const handleSave = () => {
        onSave(phrase.id, german, russian);
        onClose();
    };

    const handleMicClick = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };
    
    const handleDiscussionAccept = (suggestion: { russian: string; german: string }) => {
        setRussian(suggestion.russian);
        setGerman(suggestion.german);
        initialRussianRef.current = suggestion.russian; // Prevent re-translation
        setIsDiscussModalOpen(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[80] flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                    <header className="flex items-center justify-between p-4 border-b border-slate-700">
                        <h2 className="text-lg font-bold text-slate-100">Редактировать фразу</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
                            <CloseIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </header>
                    <div className="p-6 space-y-4">
                        {error && <div className="text-center bg-red-900/50 text-red-300 p-2 rounded-md text-sm">{error}</div>}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Русский</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={russian}
                                    onChange={(e) => setRussian(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 pr-20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                    {russian && (
                                        <button onClick={() => setRussian('')} className="p-1 text-slate-400 hover:text-white">
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={handleMicClick} className={`p-1 ${isListening ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
                                        <MicrophoneIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Немецкий</label>
                             <div className="relative">
                                <input
                                    type="text"
                                    value={german}
                                    readOnly
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md p-3 pr-20 text-slate-300 cursor-not-allowed"
                                />
                                 <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                    {isLoading ? <Spinner /> : german ? <AudioPlayer textToSpeak={german} /> : null}
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-2 flex justify-between items-center">
                            <button
                                onClick={() => setIsDiscussModalOpen(true)}
                                className="px-4 py-2 text-sm rounded-md bg-slate-600 hover:bg-slate-700 transition-colors font-semibold text-white"
                            >
                                Обсудить перевод
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!russian.trim() || !german.trim()}
                                className="px-6 py-2 rounded-md bg-purple-600 hover:bg-purple-700 transition-colors font-semibold text-white shadow-md disabled:opacity-50"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {phrase && <DiscussTranslationModal
                isOpen={isDiscussModalOpen}
                onClose={() => setIsDiscussModalOpen(false)}
                originalRussian={phrase.russian}
                currentGerman={german}
                onDiscuss={onDiscuss}
                onAccept={handleDiscussionAccept}
            />}
        </>
    );
};

export default EditPhraseModal;