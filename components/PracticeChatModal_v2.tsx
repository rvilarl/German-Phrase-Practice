/**
 * Practice Chat Modal - Redesigned (v2)
 *
 * Natural conversation practice with AI tutor using user's learned phrases.
 * Features:
 * - Full-screen modal with slide-up animation
 * - Natural dialogue flow (AI doesn't parrot user)
 * - Explanations/corrections in native language
 * - Selective TTS (only dialogue, not corrections)
 * - Voice input support
 * - Matches app design style
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Phrase, PracticeChatMessage, PracticeChatSessionStats, SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import { sendPracticeChatMessage, createInitialGreeting } from '../services/practiceChatService';
import { useLanguage } from '../src/contexts/languageContext';
import { useTranslation } from '../src/hooks/useTranslation';
import { SPEECH_LOCALE_MAP } from '../constants/speechLocales';
import CloseIcon from './icons/CloseIcon';
import SendIcon from './icons/SendIcon';
import SoundIcon from './icons/SoundIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import MessageQuestionIcon from './icons/MessageQuestionIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allPhrases: Phrase[];
  settings?: {
    autoSpeak?: boolean;
  };
}

/**
 * Message Bubble Component
 */
const MessageBubble: React.FC<{
  message: PracticeChatMessage;
  onSpeak?: (text: string) => void;
  isUser: boolean;
}> = ({ message, onSpeak, isUser }) => {
  if (isUser) {
    // User message - simple bubble
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-lg bg-purple-600 text-white">
          <p className="text-base">{message.content.primary.text}</p>
        </div>
      </div>
    );
  }

  // AI message - with translation and optional explanation
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] space-y-2">
        {/* Main dialogue in learning language */}
        <div className="px-4 py-3 rounded-2xl rounded-bl-lg bg-slate-700 text-slate-200">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base flex-1 font-medium text-purple-300">
              {message.content.primary.text}
            </p>
            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content.primary.text)}
                className="p-1.5 rounded-full hover:bg-white/10 flex-shrink-0 transition-colors"
                title="Speak"
              >
                <SoundIcon className="w-4 h-4 text-slate-300" />
              </button>
            )}
          </div>

          {/* Translation in native language */}
          {message.content.primary.translation && (
            <p className="text-sm text-slate-400 mt-1 italic">
              {message.content.primary.translation}
            </p>
          )}
        </div>

        {/* Secondary explanation (corrections, hints) - in native language */}
        {message.content.secondary && (
          <div className="px-3 py-2 rounded-lg bg-slate-600/50 text-slate-300 text-sm border border-slate-600">
            <span className="opacity-75">💬 {message.content.secondary.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Quick Reply Suggestions Component
 */
const QuickReplies: React.FC<{
  suggestions: string[];
  onSelect: (text: string) => void;
}> = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex space-x-2 overflow-x-auto pb-3 mb-2 hide-scrollbar">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="text-nowrap px-4 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 text-sm font-medium rounded-full transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

/**
 * Typing Indicator Component
 */
const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-4">
    <div className="px-4 py-3 rounded-2xl rounded-bl-lg bg-slate-700 flex items-center gap-1">
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
    </div>
  </div>
);

/**
 * Main Practice Chat Modal Component
 */
export const PracticeChatModal_v2: React.FC<Props> = ({
  isOpen,
  onClose,
  allPhrases,
  settings
}) => {
  const { t } = useTranslation();
  const { profile } = useLanguage();
  const [messages, setMessages] = useState<PracticeChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Session stats
  const [stats, setStats] = useState<PracticeChatSessionStats>({
    phrasesUsedIds: [],
    correctCount: 0,
    incorrectCount: 0,
    hintsUsed: 0,
    duration: 0,
    messagesExchanged: 0,
    sessionStartTime: Date.now()
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const prevIsLoadingRef = useRef(isLoading);

  // Speech synthesis
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const learningLang = profile.learning || 'de';
      utterance.lang = SPEECH_LOCALE_MAP[learningLang] || 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [profile.learning]);

  // Initialize greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = createInitialGreeting(profile, allPhrases);
      setMessages([greeting]);
      setStats(prev => ({ ...prev, sessionStartTime: Date.now() }));

      // Auto-speak greeting if enabled
      if (settings?.autoSpeak && greeting.content.primary.text) {
        // Only speak the dialogue part, not the explanation
        setTimeout(() => speakText(greeting.content.primary.text), 300);
      }
    }
  }, [isOpen, profile, allPhrases, settings?.autoSpeak, speakText]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      const learningLang = profile.learning || 'de';
      recognition.lang = SPEECH_LOCALE_MAP[learningLang] || 'de-DE';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error);
        }
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(prev => (prev ? prev + ' ' : '') + transcript);
      };
      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [profile.learning]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-focus textarea
  useEffect(() => {
    if (isOpen && !isLoading) {
      textareaRef.current?.focus();
    }
  }, [isOpen, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userInput]);

  // Auto-speak AI responses (only dialogue, not corrections/explanations)
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    const lastMessage = messages[messages.length - 1];

    if (wasLoading && !isLoading && lastMessage?.role === 'assistant' && settings?.autoSpeak) {
      // Only speak the primary dialogue text, not the secondary explanation
      if (lastMessage.content.primary.text) {
        speakText(lastMessage.content.primary.text);
      }
    }

    prevIsLoadingRef.current = isLoading;
  }, [messages, isLoading, settings?.autoSpeak, speakText]);

  // Cleanup on unmount
  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  // Handle sending message
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (isListening) recognitionRef.current?.stop();

    const userMessage: PracticeChatMessage = {
      role: 'user',
      content: {
        primary: { text: text.trim() }
      },
      metadata: {
        timestamp: Date.now()
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const aiResponse = await sendPracticeChatMessage(
        messages,
        text.trim(),
        allPhrases,
        profile
      );

      setMessages(prev => [...prev, aiResponse]);

      // Update stats
      if (aiResponse.actions?.phraseUsed) {
        setStats(prev => ({
          ...prev,
          phrasesUsedIds: [...new Set([...prev.phrasesUsedIds, aiResponse.actions!.phraseUsed!])],
          messagesExchanged: prev.messagesExchanged + 1
        }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('[PracticeChatModal] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, allPhrases, profile, isListening]);

  // Handle quick reply
  const handleQuickReply = useCallback((text: string) => {
    handleSendMessage(text);
  }, [handleSendMessage]);

  // Handle microphone
  const handleMicClick = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }, [isListening]);

  // Get last assistant message for quick replies
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-end"
      onClick={onClose}
    >
      <div
        className={`bg-slate-800 w-full max-w-2xl h-full rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <MessageQuestionIcon className="w-7 h-7 text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t('practice.chat.title')}</h2>
              <p className="text-xs text-slate-400">
                {stats.phrasesUsedIds.length} {t('practice.chat.phrasesUsed') || 'phrases practiced'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700 transition-colors"
          >
            <CloseIcon className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        {/* Messages Area */}
        <div className="flex-grow p-4 overflow-y-auto hide-scrollbar">
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                message={msg}
                isUser={msg.role === 'user'}
                onSpeak={msg.role === 'assistant' ? speakText : undefined}
              />
            ))}

            {isLoading && <TypingIndicator />}

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-200">
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
          {/* Quick Replies */}
          {lastAssistantMessage?.actions?.suggestions && !isLoading && (
            <QuickReplies
              suggestions={lastAssistantMessage.actions.suggestions}
              onSelect={handleQuickReply}
            />
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(userInput);
            }}
            className="flex items-end space-x-3"
          >
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(userInput);
                }
              }}
              placeholder={isListening ? t('practice.chat.listeningPlaceholder') || 'Listening...' : t('practice.chat.placeholder') || 'Your message...'}
              className="flex-grow bg-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-400 resize-none max-h-32 min-h-12 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={1}
              disabled={isLoading}
            />

            {/* Microphone Button */}
            {recognitionRef.current && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading}
                className={`p-3 rounded-lg transition-colors flex-shrink-0 ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-slate-600 hover:bg-slate-500'
                } disabled:bg-slate-600 disabled:opacity-50`}
              >
                <MicrophoneIcon className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!userInput.trim() || isLoading}
              className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-slate-600 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <SendIcon className="w-6 h-6 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PracticeChatModal_v2;
