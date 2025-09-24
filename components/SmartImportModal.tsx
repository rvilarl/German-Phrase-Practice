import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent, ProposedCard } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CheckIcon from './icons/CheckIcon';
import Spinner from './Spinner';
import RefreshIcon from './icons/RefreshIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SmartToyIcon from './icons/SmartToyIcon';
import SendIcon from './icons/SendIcon';

type Mode = 'assistant' | 'speech';
type SpeechStatus = 'idle' | 'recording' | 'stopped';
type Language = 'ru' | 'de';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCards: (transcript: string, lang: Language) => Promise<ProposedCard[]>;
  onGenerateTopicCards: (topic: string) => Promise<ProposedCard[]>;
  onCardsCreated: (cards: ProposedCard[]) => void;
}

const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, onGenerateCards, onGenerateTopicCards, onCardsCreated }) => {
  const [mode, setMode] = useState<Mode>('assistant');
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [lang, setLang] = useState<Language>('de');
  
  const [transcript, setTranscript] = useState('');
  const [assistantInput, setAssistantInput] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [proposedCards, setProposedCards] = useState<ProposedCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [canPaste, setCanPaste] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const assistantRecognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  
  const reset = useCallback(() => {
    setMode('assistant');
    setSpeechStatus('idle');
    setTranscript('');
    finalTranscriptRef.current = '';
    setAssistantInput('');
    setIsProcessing(false);
    setIsPreviewing(false);
    setProposedCards([]);
    setSelectedIndices(new Set());
    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }
    if (assistantRecognitionRef.current) {
        assistantRecognitionRef.current.abort();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
        if (navigator.clipboard && navigator.permissions) {
            navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then(permissionStatus => {
                if (permissionStatus.state !== 'denied') setCanPaste(true); else setCanPaste(false);
                permissionStatus.onchange = () => { setCanPaste(permissionStatus.state !== 'denied'); };
            }).catch(() => { setCanPaste(true); });
        } else if (navigator.clipboard) {
            setCanPaste(true);
        } else {
            setCanPaste(false);
        }
    }
  }, [isOpen]);

  const handleProcessTranscript = useCallback(async () => {
    setIsProcessing(true);
    try {
        const finalTranscript = finalTranscriptRef.current.trim();
        if (!finalTranscript) {
            onClose(); return;
        }
        const cards = await onGenerateCards(finalTranscript, lang);
        setProposedCards(cards);
        setSelectedIndices(new Set(cards.map((_, i) => i)));
        setIsPreviewing(true);
    } catch (e) {
        console.error("Failed to generate cards:", e);
        onClose();
    } finally {
        setIsProcessing(false);
    }
  }, [lang, onGenerateCards, onClose]);

  const handleProcessAssistantRequest = useCallback(async () => {
    if (!assistantInput.trim()) return;
    setIsProcessing(true);
    try {
        const cards = await onGenerateTopicCards(assistantInput);
        setProposedCards(cards);
        setSelectedIndices(new Set(cards.map((_, i) => i)));
        setIsPreviewing(true);
    } catch (e) {
        console.error("Failed to generate cards from topic:", e);
        onClose();
    } finally {
        setIsProcessing(false);
    }
  }, [assistantInput, onGenerateTopicCards, onClose]);
  
  // Speech recognition for speech import mode
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'ru' ? 'ru-RU' : 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setSpeechStatus('recording');
      finalTranscriptRef.current = '';
      setTranscript('');
    };
    recognition.onend = () => {
      setSpeechStatus('stopped');
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setSpeechStatus('idle');
    };
    
    recognition.onresult = (event) => {
        const finalPart = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join('');
        const interimPart = Array.from(event.results).filter(result => !result.isFinal).map(result => result[0].transcript).join('');
        finalTranscriptRef.current = finalPart.trim();
        setTranscript((finalPart + interimPart).trim());
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [lang]);

  // Speech recognition for assistant mode
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Assistant speech recognition error:', event.error);
        setIsListening(false);
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAssistantInput(transcript);
    };

    assistantRecognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);


  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
            finalTranscriptRef.current = text.trim();
            setTranscript(text.trim());
            setSpeechStatus('stopped');
        }
    } catch (err) {
        console.error('Failed to paste from clipboard:', err);
        alert('Не удалось вставить текст из буфера обмена. Возможно, вы не предоставили разрешение.');
    }
  };

  const handleStartRecording = () => {
    if (recognitionRef.current && speechStatus !== 'recording') {
      try {
        setTranscript('');
        finalTranscriptRef.current = '';
        recognitionRef.current.start();
      } catch(e) { console.error("Could not start recognition:", e); }
    }
  };
  
  const handleStopRecording = () => {
    if (recognitionRef.current && speechStatus === 'recording') {
        recognitionRef.current.stop();
    }
  };

  const handleMicClickAssistant = () => {
    if (!assistantRecognitionRef.current) return;
    if (isListening) {
        assistantRecognitionRef.current.stop();
    } else {
        setAssistantInput('');
        assistantRecognitionRef.current.start();
    }
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) { newSelection.delete(index); } else { newSelection.add(index); }
    setSelectedIndices(newSelection);
  };
  
  const toggleSelectAll = () => {
    if (selectedIndices.size === proposedCards.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(proposedCards.map((_, i) => i)));
    }
  };

  const handleAddSelected = () => {
    const selected = proposedCards.filter((_, i) => selectedIndices.has(i));
    onCardsCreated(selected);
    onClose();
  };
  
  if (!isOpen) return null;

  const renderSpeechContent = () => {
    const isRecording = speechStatus === 'recording';
    const isStopped = speechStatus === 'stopped';
    const currentTranscript = isRecording ? transcript : finalTranscriptRef.current.trim();
    
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-bold text-slate-100">Импорт из речи / текста</h2>
            <div className="flex items-center space-x-4 my-4">
                <span className="text-sm text-slate-400">Язык:</span>
                <button onClick={() => setLang('ru')} className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors ${lang === 'ru' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Русский</button>
                <button onClick={() => setLang('de')} className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors ${lang === 'de' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Немецкий</button>
            </div>

            <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors my-4 ${isRecording ? 'bg-red-600/80 listening-glow' : 'bg-slate-700 hover:bg-slate-600'}`}>
                {isRecording ? <div className="w-8 h-8 bg-white rounded-md"></div> : <MicrophoneIcon className="w-10 h-10 text-white" />}
            </button>

            <div className="p-4 bg-slate-900/50 rounded-lg min-h-[120px] w-full max-w-lg text-left text-slate-300 overflow-y-auto hide-scrollbar">
                {currentTranscript || <span className="text-slate-500">{isRecording ? 'Говорите...' : 'Здесь появится транскрипция...'}</span>}
            </div>

            <div className="flex items-center space-x-4 mt-6">
                {canPaste && (
                    <button onClick={handlePasteFromClipboard} className="px-4 py-2 bg-slate-600/50 hover:bg-slate-600/80 rounded-lg text-slate-300 text-sm font-medium flex items-center gap-x-2 transition-colors">
                        <ClipboardIcon className="w-4 h-4" />
                        <span>Вставить</span>
                    </button>
                )}
                <button onClick={handleProcessTranscript} disabled={!finalTranscriptRef.current.trim()} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold flex items-center space-x-2 transition-colors disabled:opacity-50">
                    <span>Обработать</span>
                </button>
            </div>
        </div>
    );
  };
  
  const renderAssistantContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <SmartToyIcon className="w-16 h-16 text-purple-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-100">AI Ассистент</h2>
        <p className="text-slate-400 mt-2 mb-8 max-w-md">Что бы вы хотели выучить сегодня? Например: "дни недели", "популярные глаголы", "фразы для путешествий".</p>
        <form onSubmit={(e) => { e.preventDefault(); handleProcessAssistantRequest(); }} className="relative w-full max-w-md">
            <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder={isListening ? "Слушаю..." : "Например, 'цвета'..."}
                className="w-full bg-slate-700 text-white text-lg rounded-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 py-3 pl-5 pr-28 transition-colors"
                autoFocus
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                <button
                    type="button"
                    onClick={handleMicClickAssistant}
                    className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'}`}
                    aria-label={isListening ? 'Остановить запись' : 'Начать запись'}
                >
                    <MicrophoneIcon className="w-5 h-5 text-white" />
                </button>
                <button
                    type="submit"
                    disabled={!assistantInput.trim()}
                    className="p-2.5 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    aria-label="Сгенерировать"
                >
                    <SendIcon className="w-5 h-5 text-white" />
                </button>
            </div>
        </form>
    </div>
  );

  const renderPreviewContent = () => {
    const allSelected = selectedIndices.size === proposedCards.length && proposedCards.length > 0;
    return (
        <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold text-slate-100 flex-shrink-0">Предложенные карточки</h2>
            <div className="flex-shrink-0 flex justify-end items-center py-2">
                <div className="flex items-center space-x-2">
                   <label htmlFor="selectAll" className="text-sm text-slate-300 cursor-pointer">Выбрать все</label>
                   <input id="selectAll" type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-purple-500 focus:ring-purple-500 cursor-pointer" />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto hide-scrollbar -mx-6 px-6 border-t border-b border-slate-700/50 py-3">
                <ul className="space-y-3">
                    {proposedCards.map((card, index) => (
                        <li key={index} onClick={() => toggleSelection(index)} className="p-3 bg-slate-700/50 rounded-lg flex items-start space-x-3 cursor-pointer hover:bg-slate-700 transition-colors">
                            <input type="checkbox" checked={selectedIndices.has(index)} readOnly className="mt-1 w-5 h-5 rounded bg-slate-600 border-slate-500 text-purple-500 focus:ring-purple-500" />
                            <div>
                                <p className="text-slate-200">{card.russian}</p>
                                <p className="text-purple-300">{card.german}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex-shrink-0 pt-4 flex justify-between items-center">
                 <button onClick={() => setIsPreviewing(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm">
                    Назад
                </button>
                <button onClick={handleAddSelected} disabled={selectedIndices.size === 0} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                    Добавить {selectedIndices.size} {selectedIndices.size === 1 ? 'карточку' : (selectedIndices.size > 1 && selectedIndices.size < 5 ? 'карточки' : 'карточек')}
                </button>
            </div>
        </div>
    );
  };

  const renderProcessingContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <Spinner />
        <p className="text-slate-300 mt-4 text-lg">Анализируем текст...</p>
        <p className="text-slate-400 mt-1">Это может занять несколько секунд.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={onClose}>
        <div 
          className={`bg-slate-800 w-full max-w-3xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={e => e.stopPropagation()}
        >
            <header className="flex-shrink-0 p-4 flex justify-between items-center">
                {!isProcessing && !isPreviewing && (
                    <div className="flex items-center bg-slate-700 rounded-full p-1">
                        <button onClick={() => setMode('assistant')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'assistant' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>Ассистент</button>
                        <button onClick={() => setMode('speech')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'speech' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>Речь/Текст</button>
                    </div>
                )}
                <div className="flex-grow"></div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 z-10">
                    <CloseIcon className="w-6 h-6 text-slate-400"/>
                </button>
            </header>
            <div className="flex-grow p-6 pt-0 overflow-hidden">
                {isProcessing ? renderProcessingContent() : isPreviewing ? renderPreviewContent() : mode === 'assistant' ? renderAssistantContent() : renderSpeechContent()}
            </div>
        </div>
    </div>
  );
};

export default SmartImportModal;