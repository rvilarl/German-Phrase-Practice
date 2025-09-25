import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent, ProposedCard, Phrase, Category } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CheckIcon from './icons/CheckIcon';
import Spinner from './Spinner';
import RefreshIcon from './icons/RefreshIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SmartToyIcon from './icons/SmartToyIcon';
import SendIcon from './icons/SendIcon';
import * as fuzzyService from '../services/fuzzyService';

type View = 'assistant' | 'speech' | 'classifying' | 'suggestion' | 'processing' | 'preview';
type SpeechStatus = 'idle' | 'recording' | 'stopped';
type Language = 'ru' | 'de';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCards: (transcript: string, lang: Language) => Promise<ProposedCard[]>;
  onGenerateTopicCards: (topic: string, refinement?: string, existingPhrases?: string[]) => Promise<ProposedCard[]>;
  onCardsCreated: (cards: ProposedCard[], options?: { categoryId?: string; createCategoryName?: string }) => void;
  onClassifyTopic: (topic: string) => Promise<{ isCategory: boolean; categoryName: string }>;
  initialTopic?: string;
  allPhrases: Phrase[];
  categories: Category[];
}

const SmartImportModal: React.FC<SmartImportModalProps> = ({ 
    isOpen, onClose, onGenerateCards, onGenerateTopicCards, onCardsCreated, onClassifyTopic, 
    initialTopic, allPhrases, categories 
}) => {
  const [view, setView] = useState<View>('assistant');
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [lang, setLang] = useState<Language>('de');
  
  const [transcript, setTranscript] = useState('');
  const [assistantInput, setAssistantInput] = useState('');

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [proposedCards, setProposedCards] = useState<ProposedCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [canPaste, setCanPaste] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<{ name: string; existingCategory?: Category } | null>(null);
  const [generationOptions, setGenerationOptions] = useState<{ categoryId?: string; createCategoryName?: string } | undefined>();
  
  const [currentTopic, setCurrentTopic] = useState('');
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineText, setRefineText] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const assistantRecognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  
  const reset = useCallback(() => {
    setView('assistant');
    setSpeechStatus('idle');
    setTranscript('');
    finalTranscriptRef.current = '';
    setAssistantInput('');
    setIsPreviewing(false);
    setProposedCards([]);
    setSelectedIndices(new Set());
    setCategorySuggestion(null);
    setGenerationOptions(undefined);
    setCurrentTopic('');
    setShowRefineInput(false);
    setRefineText('');
    setIsRefining(false);
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
      if (initialTopic) {
        setView('assistant');
        setAssistantInput(initialTopic);
      }
    }
  }, [isOpen, reset, initialTopic]);

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

  const generateAndPreview = useCallback(async (options: { categoryId?: string; createCategoryName?: string }) => {
    setView('processing');
    setGenerationOptions(options);
    try {
        let cards: ProposedCard[] = [];
        if (options.createCategoryName || options.categoryId) {
            const topic = categorySuggestion?.name || assistantInput;
            setCurrentTopic(topic);
            let existingPhrases: string[] = [];
            if(options.categoryId) {
                existingPhrases = allPhrases
                    .filter(p => p.category === options.categoryId)
                    .map(p => p.german);
            }
            cards = await onGenerateTopicCards(topic, undefined, existingPhrases);
        } else {
            setCurrentTopic(''); // Clear topic for speech import
            const finalTranscript = finalTranscriptRef.current.trim();
            if (finalTranscript) {
                cards = await onGenerateCards(finalTranscript, lang);
            }
        }
        setProposedCards(cards);
        setSelectedIndices(new Set(cards.map((_, i) => i)));
        setView('preview');
    } catch (e) {
        console.error("Failed to generate cards:", e);
        onClose();
    }
  }, [allPhrases, onGenerateTopicCards, onGenerateCards, lang, assistantInput, categorySuggestion, onClose]);

  const handleProcessAssistantRequest = useCallback(async () => {
    if (!assistantInput.trim()) return;
    setView('classifying');
    try {
        const result = await onClassifyTopic(assistantInput);
        if (result.isCategory) {
            const existingCategory = categories.find(c => fuzzyService.isSimilar(c.name, [result.categoryName], 0.9));
            setCategorySuggestion({ name: result.categoryName, existingCategory });
            setView('suggestion');
        } else {
            await generateAndPreview({ categoryId: 'general' });
        }
    } catch (e) {
        console.error("Failed to classify topic:", e);
        await generateAndPreview({ categoryId: 'general' });
    }
  }, [assistantInput, onClassifyTopic, categories, generateAndPreview]);

  useEffect(() => {
    if (isOpen && initialTopic && assistantInput === initialTopic && view === 'assistant') {
        const timer = setTimeout(() => {
            handleProcessAssistantRequest();
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [isOpen, initialTopic, assistantInput, view, handleProcessAssistantRequest]);
  
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
  
  const handleRefine = async () => {
    if (!refineText.trim() || !currentTopic || isRefining) return;
    setIsRefining(true);
    try {
      const existingPhrases = allPhrases
        .filter(p => p.category === generationOptions?.categoryId)
        .map(p => p.german);
      const cards = await onGenerateTopicCards(currentTopic, refineText, existingPhrases);
      setProposedCards(cards);
      setSelectedIndices(new Set(cards.map((_, i) => i)));
      setRefineText('');
      setShowRefineInput(false);
    } catch (e) {
      console.error("Failed to refine cards:", e);
    } finally {
      setIsRefining(false);
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
    onCardsCreated(selected, generationOptions);
    onClose();
  };

  const renderSpeechContent = () => {
    const isRecording = speechStatus === 'recording';
    const isStopped = speechStatus === 'stopped';
    const currentTranscript = isRecording ? transcript : finalTranscriptRef.current.trim();
    
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-bold text-slate-100">Импорт из речи</h2>
            <p className="text-slate-400 mt-1 mb-4">Запишите речь или вставьте текст для создания карточек.</p>
            
            <div className="flex items-center space-x-2 bg-slate-700/50 rounded-full p-1 mb-4">
                <button onClick={() => setLang('de')} className={`px-4 py-1 text-sm font-bold rounded-full transition-colors ${lang === 'de' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>DE</button>
                <button onClick={() => setLang('ru')} className={`px-4 py-1 text-sm font-bold rounded-full transition-colors ${lang === 'ru' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>RU</button>
            </div>

            <div className="w-full h-40 bg-slate-700/50 rounded-lg p-3 overflow-y-auto text-left text-slate-200 mb-4">
                {currentTranscript || <span className="text-slate-500">Здесь появится транскрипция...</span>}
            </div>

            <div className="flex items-center justify-center space-x-4">
                {!isRecording && canPaste && (
                    <button onClick={handlePasteFromClipboard} className="p-3 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors text-white" aria-label="Вставить из буфера обмена">
                        <ClipboardIcon className="w-6 h-6" />
                    </button>
                )}
                <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                    <MicrophoneIcon className="w-10 h-10 text-white" />
                </button>
                {isStopped && (
                    <button onClick={() => generateAndPreview({})} className="p-3 rounded-full bg-green-600 hover:bg-green-700 transition-colors text-white" aria-label="Обработать">
                        <CheckIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
  };

  const renderAssistantContent = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-xl font-bold text-slate-100">AI Ассистент</h2>
        <p className="text-slate-400 mt-1 mb-6">Введите тему, и AI сгенерирует для вас набор карточек.</p>
        
        <div className="relative w-full max-w-md">
            <input
                type="text"
                value={assistantInput}
                onChange={e => setAssistantInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleProcessAssistantRequest(); }}
                placeholder="Например, 'В аэропорту' или 'Пальцы рук'"
                className="w-full bg-slate-700 border border-slate-600 rounded-full py-3 pl-5 pr-24 text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button onClick={handleMicClickAssistant} className="p-2 transition-colors">
                    <MicrophoneIcon className={`w-6 h-6 ${isListening ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`} />
                </button>
                 <button onClick={handleProcessAssistantRequest} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white" aria-label="Сгенерировать">
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );
  
  const renderSuggestionContent = () => {
    if (!categorySuggestion) return null;
    const { name, existingCategory } = categorySuggestion;

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <SmartToyIcon className="w-12 h-12 text-purple-400 mb-4" />
            {existingCategory ? (
                <>
                    <h2 className="text-xl font-bold text-slate-100">Дополнить категорию?</h2>
                    <p className="text-slate-400 mt-2 mb-6 max-w-sm">У вас уже есть категория "{existingCategory.name}". Хотите добавить новые карточки по теме "{name}" в нее?</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => generateAndPreview({ categoryId: existingCategory.id })} className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-white font-semibold">Да, добавить в "{existingCategory.name}"</button>
                        <button onClick={() => generateAndPreview({ categoryId: 'general' })} className="px-5 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors text-white font-semibold">Нет, добавить в "Общие"</button>
                    </div>
                </>
            ) : (
                <>
                    <h2 className="text-xl font-bold text-slate-100">Создать новую категорию?</h2>
                    <p className="text-slate-400 mt-2 mb-6 max-w-sm">Похоже, ваша тема "{name}" идеально подходит для отдельной категории. Как поступим?</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => generateAndPreview({ createCategoryName: name })} className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-white font-semibold">Создать категорию "{name}"</button>
                        <button onClick={() => generateAndPreview({ categoryId: 'general' })} className="px-5 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-700 transition-colors text-white font-semibold">Просто добавить в "Общие"</button>
                    </div>
                </>
            )}
        </div>
    );
  };
  
  const renderPreviewContent = () => (
    <div className="flex flex-col h-full">
        <header className="flex-shrink-0 flex items-center justify-between pb-4">
            <h2 className="text-xl font-bold text-slate-100">Предложенные карточки</h2>
            <button onClick={() => setView('assistant')} className="px-4 py-2 text-sm rounded-md bg-slate-600 hover:bg-slate-700 transition-colors text-white">Назад</button>
        </header>
        <div className="flex-grow overflow-y-auto hide-scrollbar -mx-6 px-6 min-h-0">
            <ul className="space-y-2">
                {proposedCards.map((card, index) => (
                    <li key={index} onClick={() => toggleSelection(index)} className={`p-3 rounded-lg flex items-start space-x-3 cursor-pointer transition-colors ${selectedIndices.has(index) ? 'bg-slate-700' : 'bg-slate-700/50 hover:bg-slate-700/80'}`}>
                        <div className={`mt-1 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 ${selectedIndices.has(index) ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-600'}`}>
                            {selectedIndices.has(index) && <CheckIcon className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                            <p className="font-medium text-slate-200">{card.german}</p>
                            <p className="text-sm text-slate-400">{card.russian}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
        <footer className="flex-shrink-0 pt-4 border-t border-slate-700 space-y-3">
            {showRefineInput && (
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={refineText}
                        onChange={e => setRefineText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !isRefining) handleRefine(); }}
                        placeholder="Уточнение, например: только глаголы"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                    />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isRefining} className="p-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50 flex-shrink-0 w-10 h-10 flex items-center justify-center">
                        {isRefining ? <Spinner className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <button onClick={toggleSelectAll} className="px-4 py-2 text-sm rounded-md text-slate-300 hover:bg-slate-700 transition-colors">
                    {selectedIndices.size === proposedCards.length ? 'Снять все' : 'Выбрать все'}
                </button>
                <div className="flex items-center space-x-2">
                    {currentTopic && (
                        <button onClick={() => setShowRefineInput(prev => !prev)} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors">
                            Уточнить
                        </button>
                    )}
                    <button onClick={handleAddSelected} disabled={selectedIndices.size === 0} className="px-6 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-50">
                        Добавить ({selectedIndices.size})
                    </button>
                </div>
            </div>
        </footer>
    </div>
  );

  const renderCurrentView = () => {
    switch (view) {
        case 'assistant': return renderAssistantContent();
        case 'speech': return renderSpeechContent();
        case 'classifying':
        case 'processing':
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <Spinner />
                    <p className="mt-4 text-slate-300">{view === 'classifying' ? 'Анализируем тему...' : 'AI генерирует карточки...'}</p>
                </div>
            );
        case 'suggestion': return renderSuggestionContent();
        case 'preview': return renderPreviewContent();
        default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex justify-center items-center backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
        <div className="relative w-full max-w-2xl min-h-[34rem] h-[80vh] max-h-[600px] bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
            <CloseIcon className="w-6 h-6 text-slate-400 absolute top-4 right-4 cursor-pointer hover:text-white" onClick={onClose} />
            
            {(view === 'assistant' || view === 'speech') && (
                 <div className="flex-shrink-0 flex items-center justify-center space-x-2 bg-slate-900/50 rounded-full p-1 self-center mb-6">
                    <button onClick={() => setView('assistant')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center space-x-2 ${view === 'assistant' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>
                        <SmartToyIcon className="w-5 h-5" />
                        <span>Ассистент</span>
                    </button>
                    <button onClick={() => setView('speech')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center space-x-2 ${view === 'speech' ? 'bg-purple-600 text-white' : 'text-slate-300'}`}>
                       <MicrophoneIcon className="w-5 h-5" />
                       <span>Из речи</span>
                    </button>
                </div>
            )}
            
            <div className="flex-grow min-h-0">
                {renderCurrentView()}
            </div>
        </div>
    </div>
  );
};

export default SmartImportModal;