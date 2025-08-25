import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phrase, ChatMessage, CheatSheetOption } from '../types';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import SoundIcon from './icons/SoundIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import CheckIcon from './icons/CheckIcon';

interface LearningAssistantModalProps {
  isOpen: boolean;
  onClose: (didSucceed?: boolean) => void;
  phrase: Phrase;
  onGuide: (phrase: Phrase, history: ChatMessage[], userAnswer: string) => Promise<ChatMessage>;
  onSuccess: (phrase: Phrase) => void;
  onOpenVerbConjugation: (infinitive: string) => void;
  onOpenNounDeclension: (noun: string, article: string) => void;
  onOpenPronounsModal: () => void;
  onOpenWFragenModal: () => void;
}

const ChatMessageContent: React.FC<{ message: ChatMessage; onSpeak: (text: string) => void }> = ({ message, onSpeak }) => {
    const { contentParts } = message;
    
    if (contentParts) {
        return (
            <div className="whitespace-pre-wrap leading-relaxed">
                {contentParts.map((part, index) =>
                    part.type === 'german' ? (
                        <span key={index} className="inline-flex items-center align-middle bg-slate-600/50 px-1.5 py-0.5 rounded-md mx-0.5">
                            <span className="font-medium text-purple-300">{part.text}</span>
                            <button
                                onClick={() => onSpeak(part.text)}
                                className="p-0.5 rounded-full hover:bg-white/20 flex-shrink-0 ml-1.5"
                                aria-label={`Speak: ${part.text}`}
                            >
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
    
    return message.text ? <p>{message.text}</p> : null;
};

const LearningAssistantModal: React.FC<LearningAssistantModalProps> = ({ isOpen, onClose, phrase, onGuide, onSuccess, onOpenVerbConjugation, onOpenNounDeclension, onOpenPronounsModal, onOpenWFragenModal }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [input, setInput] = useState('');
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [cheatSheetOptions, setCheatSheetOptions] = useState<CheatSheetOption[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onSpeak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (isOpen && phrase) {
      setMessages([]);
      setWordOptions([]);
      setCheatSheetOptions([]);
      setIsLoading(true);
      setIsSuccess(false);

      onGuide(phrase, [], '')
        .then(initialMessage => {
          setMessages([initialMessage]);
          setWordOptions(initialMessage.wordOptions || []);
          setCheatSheetOptions(initialMessage.cheatSheetOptions || []);
        })
        .catch(err => {
          setMessages([{ role: 'model', contentParts: [{type: 'text', text: `Произошла ошибка: ${(err as Error).message}`}] }]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, phrase, onGuide]);
  
  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading || isSuccess) return;

    setWordOptions([]);
    setCheatSheetOptions([]);

    const userMessage: ChatMessage = { role: 'user', text: messageText };
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setInput('');
    setIsLoading(true);

    try {
        const modelResponse = await onGuide(phrase, messagesWithUser, messageText);
        setMessages(prev => [...prev, modelResponse]);
        setWordOptions(modelResponse.wordOptions || []);
        setCheatSheetOptions(modelResponse.cheatSheetOptions || []);
        if (modelResponse.isCorrect) {
          setIsSuccess(true);
          onSuccess(phrase);
          setTimeout(() => onClose(true), 2500);
        }
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', contentParts: [{type: 'text', text: `Произошла ошибка: ${(error as Error).message}`}] }]);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, isSuccess, messages, phrase, onGuide, onSuccess, onClose]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };
  
  const handleCheatSheetClick = (option: CheatSheetOption) => {
    switch (option.type) {
      case 'verbConjugation':
        onOpenVerbConjugation(option.data);
        break;
      case 'nounDeclension':
        try {
          const nounData = JSON.parse(option.data);
          if (nounData.noun && nounData.article) {
            onOpenNounDeclension(nounData.noun, nounData.article);
          }
        } catch (e) { console.error("Failed to parse noun data for cheat sheet", e); }
        break;
      case 'pronouns':
        onOpenPronounsModal();
        break;
      case 'wFragen':
        onOpenWFragenModal();
        break;
    }
  };

  if (!isOpen) return null;

  const latestMessage = messages[messages.length - 1];
  const promptSuggestions = (latestMessage?.role === 'model' && latestMessage.promptSuggestions) || [];
  const showOptions = (wordOptions.length > 0 || cheatSheetOptions.length > 0) && !isLoading && !isSuccess;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end" onClick={() => onClose(false)}>
      <div 
        className={`bg-slate-800 w-full max-w-2xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <BookOpenIcon className="w-7 h-7 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">{phrase.russian}</h2>
          </div>
          <button onClick={() => onClose(false)} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>

        <div className="flex-grow p-4 overflow-y-auto hide-scrollbar">
          <div className="space-y-6">
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
            {isSuccess && (
              <div className="flex justify-center animate-fade-in">
                  <div className="flex items-center space-x-3 bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-lg">
                      <CheckIcon className="w-8 h-8"/>
                      <span className="text-xl font-bold">Отлично! Всё верно!</span>
                  </div>
              </div>
            )}
          </div>
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
          {showOptions && (
            <div className="pb-3 mb-3 border-b border-slate-700/50">
              <div className="flex flex-wrap justify-center gap-2">
                {wordOptions.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(word)}
                    className="px-4 py-2 bg-slate-600/80 hover:bg-slate-600 rounded-lg transition-colors text-slate-100 font-medium animate-fade-in"
                  >
                    {word}
                  </button>
                ))}
                {cheatSheetOptions.map((option, index) => (
                  <button
                    key={`cheat-${index}`}
                    onClick={() => handleCheatSheetClick(option)}
                    className="px-4 py-2 bg-sky-600/80 hover:bg-sky-600 rounded-lg transition-colors text-slate-100 font-medium animate-fade-in flex items-center gap-x-2"
                  >
                    <BookOpenIcon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isSuccess && promptSuggestions.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 hide-scrollbar">
                {promptSuggestions.map(prompt => (
                    <button 
                        key={prompt} 
                        onClick={() => handleSuggestionClick(prompt)} 
                        disabled={isLoading} 
                        className="text-nowrap px-4 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 text-sm font-medium rounded-full transition-all duration-300 disabled:opacity-50"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="flex items-end space-x-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(input);
                  }
              }}
              placeholder="Ваш ответ..."
              className="flex-grow bg-slate-700 rounded-lg p-3 text-slate-200 resize-none max-h-32 min-h-12 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={1}
              disabled={isLoading || isSuccess}
            />
            <button type="submit" disabled={!input.trim() || isLoading || isSuccess} className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
              <SendIcon className="w-6 h-6 text-white"/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LearningAssistantModal;