import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage, ContentPart, TranslationChatResponse, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import GeminiLogo from './icons/GeminiLogo';
import SoundIcon from './icons/SoundIcon';
import CheckIcon from './icons/CheckIcon';

interface DiscussTranslationModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalRussian: string;
    currentGerman: string;
    onDiscuss: (request: any) => Promise<TranslationChatResponse>;
    onAccept: (suggestion: { russian: string; german: string }) => void;
}

const ChatMessageContent: React.FC<{ message: ChatMessage; onSpeak: (text: string) => void }> = ({ message, onSpeak }) => {
    const { text, contentParts } = message;
    
    if (contentParts) {
        return (
            <div className="whitespace-pre-wrap leading-relaxed">
                {contentParts.map((part, index) =>
                    part.type === 'german' ? (
                        <span key={index} className="inline-flex items-center align-middle bg-slate-600/50 px-1.5 py-0.5 rounded-md mx-0.5">
                            <span className="font-medium text-purple-300">{part.text}</span>
                            <button onClick={() => onSpeak(part.text)} className="p-0.5 rounded-full hover:bg-white/20 ml-1.5">
                                <SoundIcon className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                        </span>
                    ) : (
                        <span key={index}>{part.text}</span>
                    )
                )}
            </div>
        );
    }
    return text ? <p>{text}</p> : null;
};

const DiscussTranslationModal: React.FC<DiscussTranslationModalProps> = ({ isOpen, onClose, originalRussian, currentGerman, onDiscuss, onAccept }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const [latestSuggestion, setLatestSuggestion] = useState<{ russian: string; german: string } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const handleSendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setLatestSuggestion(null);

        try {
            const response = await onDiscuss({
                originalRussian,
                currentGerman,
                history: [...messages, userMessage],
                userRequest: messageText,
            });
            setMessages(prev => [...prev, response]);
            if (response.suggestion) {
                setLatestSuggestion(response.suggestion);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', contentParts: [{ type: 'text', text: `Произошла ошибка: ${(error as Error).message}` }] }]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, originalRussian, currentGerman, onDiscuss]);

    useEffect(() => {
        if (isOpen) {
            setMessages([]);
            setLatestSuggestion(null);
            setInput('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'ru-RU';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', e.error);
                setIsListening(false);
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript.trim()) {
                    handleSendMessage(transcript.trim());
                }
            };
            recognitionRef.current = recognition;
        }
    }, [handleSendMessage]);

    const onSpeak = useCallback((text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'de-DE';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAccept = () => {
        if (latestSuggestion) {
            onAccept(latestSuggestion);
        }
    };
    
    const handleMicClick = () => {
        if (isListening) recognitionRef.current?.stop();
        else recognitionRef.current?.start();
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[90] flex justify-center items-end" onClick={onClose}>
            <div
                className={`bg-slate-800 w-full max-w-2xl h-[80%] max-h-[80vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <GeminiLogo className="w-7 h-7" />
                        <h2 className="text-lg font-bold text-slate-100">Обсудить перевод</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
                        <CloseIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </header>

                <div className="flex-grow p-4 overflow-y-auto hide-scrollbar space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl break-words ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-slate-700 text-slate-200 rounded-bl-lg'}`}>
                               <ChatMessageContent message={msg} onSpeak={onSpeak} />
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-lg flex items-center">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2 delay-150"></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
                    {latestSuggestion && (
                        <div className="bg-slate-700/50 p-3 rounded-lg mb-3">
                            <p className="text-sm text-slate-400">Предложение AI:</p>
                            <p className="font-semibold text-slate-200">{latestSuggestion.russian} → {latestSuggestion.german}</p>
                            <button onClick={handleAccept} className="w-full mt-2 text-sm flex items-center justify-center py-2 bg-green-600 hover:bg-green-700 rounded-md font-bold text-white">
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Принять этот вариант
                            </button>
                        </div>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={isListening ? "Слушаю..." : "Ваш комментарий..."}
                            className="flex-grow bg-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isLoading}
                        />
                        <button type="button" onClick={handleMicClick} className={`p-3 rounded-lg flex-shrink-0 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-slate-600'} hover:bg-slate-500`} disabled={isLoading}>
                             <MicrophoneIcon className="w-6 h-6 text-white" />
                        </button>
                        <button type="submit" disabled={!input.trim() || isLoading} className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-slate-600">
                            <SendIcon className="w-6 h-6 text-white" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DiscussTranslationModal;