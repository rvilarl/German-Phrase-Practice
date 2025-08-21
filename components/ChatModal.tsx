import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Phrase, ChatMessage, SpeechRecognition } from '../types';
import { getCache, setCache } from '../services/cacheService';
import { ApiProviderType } from '../services/apiProvider';
import GeminiLogo from './icons/GeminiLogo';
import DeepSeekLogo from './icons/DeepSeekLogo';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import SoundIcon from './icons/SoundIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  phrase: Phrase;
  onSpeak: (text: string) => void;
  onGenerateInitialExamples: (phrase: Phrase) => Promise<ChatMessage>;
  onContinueChat: (phrase: Phrase, history: ChatMessage[], newMessage: string) => Promise<ChatMessage>;
  apiProviderType: ApiProviderType;
}

const ChatMessageContent: React.FC<{ message: ChatMessage; onSpeak: (text: string) => void }> = ({ message, onSpeak }) => {
    const { text, examples, suggestions, contentParts } = message;
    
    // Render structured model responses with inline speakable parts
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
    
    // Render initial structured model responses
    if (message.role === 'model' && (examples?.length || suggestions?.length)) {
        return (
            <div className="space-y-4 text-left">
                {text && <p className="text-slate-300">{text}</p>}
                
                {examples && examples.length > 0 && (
                    <div className="space-y-3 pt-2">
                        {examples.map((example, index) => (
                            <div key={`ex-${index}`}>
                                <div className="flex items-start">
                                    <button
                                        onClick={() => onSpeak(example.german)}
                                        className="p-1 rounded-full hover:bg-white/20 flex-shrink-0 mt-0.5 mr-2"
                                        aria-label={`Speak: ${example.german}`}
                                    >
                                        <SoundIcon className="w-4 h-4 text-slate-300" />
                                    </button>
                                    <p className="flex-1 text-slate-100">{example.german}</p>
                                </div>
                                <p className="pl-7 text-sm text-slate-400 italic">{example.russian}</p>
                            </div>
                        ))}
                    </div>
                )}
                
                {suggestions && suggestions.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-600/50">
                        {suggestions.map((suggestion, index) => (
                            <div key={`sug-${index}`} className="bg-slate-600/50 p-3 rounded-lg">
                                <h4 className="font-semibold text-purple-300 mb-1">{suggestion.title}</h4>
                                <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
                                    {suggestion.contentParts.map((part, partIndex) =>
                                        part.type === 'german' ? (
                                            <span key={partIndex} className="inline-flex items-center align-middle bg-slate-500/50 px-1.5 py-0.5 rounded-md mx-0.5">
                                                <span className="font-medium text-purple-200">{part.text}</span>
                                                <button
                                                    onClick={() => onSpeak(part.text)}
                                                    className="p-0.5 rounded-full hover:bg-white/20 flex-shrink-0 ml-1.5"
                                                    aria-label={`Speak: ${part.text}`}
                                                >
                                                    <SoundIcon className="w-3.5 h-3.5 text-slate-200" />
                                                </button>
                                            </span>
                                        ) : (
                                            <span key={partIndex}>{part.text}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Fallback for user messages and simple text responses
    return text ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown> : null;
};

const ChatSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex justify-start">
            <div className="max-w-[85%] w-full px-4 py-3 rounded-2xl bg-slate-700 rounded-bl-lg space-y-3">
                <div className="h-4 bg-slate-600 rounded w-5/6"></div>
                <div className="h-4 bg-slate-600 rounded w-full"></div>
                <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                 <div className="space-y-3 pt-3 border-t border-slate-600/50">
                    <div className="h-5 bg-slate-600 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-600 rounded w-full"></div>
                 </div>
            </div>
        </div>
    </div>
);


const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, phrase, onSpeak, onGenerateInitialExamples, onContinueChat, apiProviderType }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [input, setInput] = useState('');
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' : '') + transcript);
        };
        recognitionRef.current = recognition;
    } else {
        setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setMessages([]);
      setPromptSuggestions([]);
      setUsedSuggestions([]);
      setIsLoading(true);

      const fetchInitialMessage = async () => {
        const cacheKey = `chat_initial_${phrase.id}`;
        const cachedMessage = getCache<ChatMessage>(cacheKey);

        if (cachedMessage) {
          setMessages([cachedMessage]);
          setPromptSuggestions(cachedMessage.promptSuggestions || []);
          setIsLoading(false);
        } else {
          try {
            const initialMessage = await onGenerateInitialExamples(phrase);
            setPromptSuggestions(initialMessage.promptSuggestions || []);
            if (initialMessage.examples && initialMessage.examples.length > 0) {
              setCache(cacheKey, initialMessage);
            }
            setMessages([initialMessage]);
          } catch(err) {
            setMessages([{ role: 'model', contentParts: [{type: 'text', text: `Произошла ошибка: ${(err as Error).message}`}] }]);
          } finally {
            setIsLoading(false);
          }
        }
      };

      fetchInitialMessage();

    } else {
      document.body.style.overflow = 'auto';
      if (isListening) {
        recognitionRef.current?.abort();
      }
    }
    return () => {
        document.body.style.overflow = 'auto';
        if (isListening) {
          recognitionRef.current?.abort();
        }
    };
  }, [isOpen, phrase, onGenerateInitialExamples]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMessage: ChatMessage = { role: 'user', text: messageText };
    const messagesWithUser = [...messages, userMessage];
    setMessages(messagesWithUser);
    setInput('');
    setIsLoading(true);

    try {
        const modelResponse = await onContinueChat(phrase, messagesWithUser, messageText);
        setMessages(prev => [...prev, modelResponse]);
        if (modelResponse.promptSuggestions && modelResponse.promptSuggestions.length > 0) {
            setPromptSuggestions(prev => {
                const newPrompts = modelResponse.promptSuggestions || [];
                const combined = [...newPrompts, ...prev];
                const uniquePrompts = Array.from(new Set(combined));
                return uniquePrompts;
            });
        }
    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, { role: 'model', contentParts: [{type: 'text', text: `Произошла ошибка: ${(error as Error).message}`}] }]);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, messages, phrase, isListening, onContinueChat]);
  
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
    setPromptSuggestions(prev => {
      const otherSuggestions = prev.filter(s => s !== suggestion);
      return [...otherSuggestions, suggestion];
    });
    setUsedSuggestions(prev => {
        if (!prev.includes(suggestion)) {
            return [...prev, suggestion];
        }
        return prev;
    });
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex justify-center items-end" onClick={onClose}>
      <div 
        className={`bg-slate-800 w-full max-w-2xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            {apiProviderType === 'deepseek' ? <DeepSeekLogo className="w-7 h-7" /> : <GeminiLogo className="w-7 h-7" />}
            <h2 className="text-lg font-bold text-slate-100">{phrase.german}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>

        {/* Chat Body */}
        <div className="flex-grow p-4 overflow-y-auto hide-scrollbar">
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl break-words ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-lg' : 'bg-slate-700 text-slate-200 rounded-bl-lg'}`}>
                   <ChatMessageContent message={msg} onSpeak={onSpeak} />
                </div>
              </div>
            ))}
            {isLoading && messages.length > 0 && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-700 text-slate-200 rounded-bl-lg flex items-center">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2 delay-150"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                    </div>
                </div>
            )}
            {isLoading && messages.length === 0 && (
                <ChatSkeleton />
            )}
          </div>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
          {promptSuggestions.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 hide-scrollbar">
                {promptSuggestions.map(prompt => (
                    <button 
                        key={prompt} 
                        onClick={() => handleSuggestionClick(prompt)} 
                        disabled={isLoading} 
                        className={`text-nowrap px-4 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 text-sm font-medium rounded-full transition-all duration-300 disabled:opacity-50 ${usedSuggestions.includes(prompt) ? 'opacity-40' : ''}`}
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
              placeholder={isListening ? "Слушаю..." : "Спросите что-нибудь..."}
              className="flex-grow bg-slate-700 rounded-lg p-3 text-slate-200 resize-none max-h-32 min-h-12 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={1}
              disabled={isLoading}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleListening}
                disabled={isLoading}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                className={`p-3 rounded-lg transition-colors flex-shrink-0 ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'} disabled:bg-slate-600 disabled:cursor-not-allowed`}
              >
                <MicrophoneIcon className="w-6 h-6 text-white" />
              </button>
            )}
            <button type="submit" disabled={!input.trim() || isLoading} className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex-shrink-0">
              <SendIcon className="w-6 h-6 text-white"/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;