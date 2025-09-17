import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent, ProposedCard } from '../types';
import CloseIcon from './icons/CloseIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CheckIcon from './icons/CheckIcon';
import Spinner from './Spinner';
import RefreshIcon from './icons/RefreshIcon';

type Status = 'idle' | 'recording' | 'stopped' | 'processing' | 'preview';
type Language = 'ru' | 'de';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCards: (transcript: string, lang: Language) => Promise<ProposedCard[]>;
  onCardsCreated: (cards: ProposedCard[]) => void;
}

const TranscriptDisplay: React.FC<{ transcript: string, status: Status }> = ({ transcript, status }) => (
    <div className="mt-6 p-4 bg-slate-900/50 rounded-lg min-h-[120px] w-full max-w-lg text-left text-slate-300 overflow-y-auto hide-scrollbar">
        {transcript || <span className="text-slate-500">{status === 'recording' ? 'Говорите...' : 'Здесь появится транскрипция...'}</span>}
    </div>
);


const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose, onGenerateCards, onCardsCreated }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [lang, setLang] = useState<Language>('de');
  const [transcript, setTranscript] = useState('');
  const [proposedCards, setProposedCards] = useState<ProposedCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  
  const reset = useCallback(() => {
    setStatus('idle');
    setTranscript('');
    finalTranscriptRef.current = '';
    setProposedCards([]);
    setSelectedIndices(new Set());
    if (recognitionRef.current) {
        recognitionRef.current.abort();
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

  const handleProcessTranscript = useCallback(async () => {
    setStatus('processing');
    try {
        const finalTranscript = finalTranscriptRef.current.trim();
        if (!finalTranscript) {
            onClose(); // Nothing to process, just close
            return;
        }
        const cards = await onGenerateCards(finalTranscript, lang);
        setProposedCards(cards);
        setSelectedIndices(new Set(cards.map((_, i) => i)));
        setStatus('preview');
    } catch (e) {
        console.error("Failed to generate cards:", e);
        onClose();
    }
  }, [lang, onGenerateCards, onClose]);
  
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang === 'ru' ? 'ru-RU' : 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setStatus('recording');
      finalTranscriptRef.current = '';
      setTranscript('');
    };
    recognition.onend = () => {
      setStatus('stopped');
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setStatus('idle');
    };
    
    recognition.onresult = (event) => {
        const finalPart = Array.from(event.results)
            .filter(result => result.isFinal)
            .map(result => result[0].transcript)
            .join('');

        const interimPart = Array.from(event.results)
            .filter(result => !result.isFinal)
            .map(result => result[0].transcript)
            .join('');

        finalTranscriptRef.current = finalPart.trim();
        setTranscript((finalPart + interimPart).trim());
    };

    recognitionRef.current = recognition;

    return () => recognition.abort();
  }, [lang]);


  const handleStartRecording = () => {
    if (recognitionRef.current) {
      try {
        setTranscript('');
        finalTranscriptRef.current = '';
        recognitionRef.current.start();
      } catch(e) { console.error("Could not start recognition:", e); }
    }
  };
  
  const handleStopRecording = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
  };


  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
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

  const renderContent = () => {
    switch (status) {
        case 'idle':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-xl font-bold text-slate-100">Умный импорт</h2>
                    <p className="text-slate-400 mt-2 mb-6">Запишите речь, и AI разобьет ее на карточки.</p>
                    <div className="flex items-center space-x-4 mb-8">
                        <button onClick={() => setLang('ru')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${lang === 'ru' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Русский</button>
                        <button onClick={() => setLang('de')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${lang === 'de' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Немецкий</button>
                    </div>
                    <button onClick={handleStartRecording} className="w-24 h-24 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors">
                        <MicrophoneIcon className="w-10 h-10 text-white" />
                    </button>
                    <TranscriptDisplay transcript={transcript} status={status} />
                </div>
            );
        case 'recording':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-xl font-bold text-slate-100">Идет запись...</h2>
                    <p className="text-slate-400 mt-2 mb-6">Нажмите, чтобы остановить</p>
                    <button onClick={handleStopRecording} className="w-24 h-24 bg-red-600/80 hover:bg-red-700/80 rounded-full flex items-center justify-center listening-glow">
                        <div className="w-8 h-8 bg-white rounded-md"></div>
                    </button>
                    <TranscriptDisplay transcript={transcript} status={status} />
                </div>
            )
        case 'stopped':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-xl font-bold text-slate-100">Запись завершена</h2>
                    <p className="text-slate-400 mt-2 mb-6">Проверьте транскрипцию и обработайте текст.</p>
                     <div className="flex items-center space-x-4 mb-8">
                        <button onClick={handleStartRecording} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-semibold flex items-center space-x-2 transition-colors">
                            <RefreshIcon className="w-5 h-5" />
                            <span>Начать заново</span>
                        </button>
                         <button onClick={handleProcessTranscript} disabled={!finalTranscriptRef.current.trim()} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold flex items-center space-x-2 transition-colors disabled:opacity-50">
                            <span>Обработать</span>
                         </button>
                    </div>
                    <TranscriptDisplay transcript={finalTranscriptRef.current.trim()} status={status} />
                </div>
            )
        case 'processing':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Spinner />
                    <p className="text-slate-300 mt-4 text-lg">Анализируем текст...</p>
                    <p className="text-slate-400 mt-1">Это может занять несколько секунд.</p>
                </div>
            );
        case 'preview':
            const allSelected = selectedIndices.size === proposedCards.length && proposedCards.length > 0;
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-shrink-0 flex justify-between items-center pb-2">
                        <h2 className="text-xl font-bold text-slate-100">Предложенные карточки</h2>
                    </div>
                    <div className="flex-shrink-0 flex justify-end items-center pb-4">
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
                         <button onClick={() => setStatus('stopped')} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm">
                            Назад
                        </button>
                        <button onClick={handleAddSelected} disabled={selectedIndices.size === 0} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                            Добавить {selectedIndices.size} {selectedIndices.size === 1 ? 'карточку' : (selectedIndices.size > 1 && selectedIndices.size < 5 ? 'карточки' : 'карточек')}
                        </button>
                    </div>
                </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={onClose}>
        <div 
          className={`bg-slate-800 w-full max-w-3xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700 z-10">
                <CloseIcon className="w-6 h-6 text-slate-400"/>
            </button>
            <div className="flex-grow p-6 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default SmartImportModal;