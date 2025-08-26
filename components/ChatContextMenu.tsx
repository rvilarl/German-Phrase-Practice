import React, { useState, useEffect, useCallback } from 'react';
import type { Phrase, WordAnalysis } from '../types';
import Spinner from './Spinner';
import InfoIcon from './icons/InfoIcon';
import CardPlusIcon from './icons/CardPlusIcon';
import PlusIcon from './icons/PlusIcon';
import WandIcon from './icons/WandIcon';
import SoundIcon from './icons/SoundIcon';
import TableIcon from './icons/TableIcon';

interface ChatContextMenuProps {
  target: { sentence: { german: string; russian: string }; word: string };
  onClose: () => void;
  onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
  onCreateCard: (data: { german: string; russian: string }) => void;
  onGenerateMore: (prompt: string) => void;
  onSpeak: (text: string) => void;
  onOpenVerbConjugation: (infinitive: string) => void;
  onOpenNounDeclension: (noun: string, article: string) => void;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
  allPhrases: Phrase[];
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  target,
  onClose,
  onAnalyzeWord,
  onCreateCard,
  onGenerateMore,
  onSpeak,
  onOpenVerbConjugation,
  onOpenNounDeclension,
  onOpenWordAnalysis,
  allPhrases,
}) => {
  const { sentence, word } = target;
  const [analysis, setAnalysis] = useState<WordAnalysis | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);

  const proxyPhrase = {
    ...sentence,
    id: `proxy_context_${Date.now()}`,
    german: sentence.german,
    russian: sentence.russian,
    masteryLevel: 0,
    lastReviewedAt: null,
    nextReviewAt: 0,
    knowCount: 0,
    knowStreak: 0,
    isMastered: false,
  };

  useEffect(() => {
    let isMounted = true;
    const analyze = async () => {
      setIsAnalysisLoading(true);
      const result = await onAnalyzeWord(proxyPhrase, word);
      if (isMounted) {
        setAnalysis(result);
        setIsAnalysisLoading(false);
      }
    };
    analyze();
    return () => {
      isMounted = false;
    };
  }, [word, sentence.german, onAnalyzeWord]);

  const getCanonicalWordGerman = useCallback(() => {
    if (!analysis) return word;
    if (analysis.verbDetails?.infinitive) return analysis.verbDetails.infinitive;
    if (analysis.nounDetails?.article) return `${analysis.nounDetails.article} ${analysis.word}`;
    return analysis.word;
  }, [analysis, word]);

  const phraseCardExists =
    !!sentence.russian &&
    allPhrases.some(
      (p) => p.german.trim().toLowerCase() === sentence.german.trim().toLowerCase()
    );

  const wordCardExists = allPhrases.some(
    (p) => p.german.trim().toLowerCase() === getCanonicalWordGerman().trim().toLowerCase()
  );

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    setTimeout(action, 0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const instantMenuItems = [
    { label: 'Создать карточку для фразы', icon: <CardPlusIcon />, action: () => onCreateCard({ german: sentence.german, russian: sentence.russian }), condition: !!sentence.russian && !phraseCardExists },
    { label: 'Сгенерировать еще такие фразы', icon: <WandIcon />, action: () => onGenerateMore(`Сгенерируй еще несколько примеров, похожих на "${sentence.german}"`), condition: true },
    { label: 'Озвучить фразу', icon: <SoundIcon />, action: () => onSpeak(sentence.german), condition: true },
    { label: 'Озвучить слово', icon: <SoundIcon />, action: () => onSpeak(word), condition: true },
  ];
  
  const deferredMenuItems = analysis ? [
    { label: 'Сведения о слове', icon: <InfoIcon />, action: () => onOpenWordAnalysis(proxyPhrase, word), condition: true },
    { label: 'Создать карточку для слова', icon: <PlusIcon />, action: () => { if (analysis) onCreateCard({ german: getCanonicalWordGerman(), russian: analysis.translation }); }, condition: !wordCardExists && !!analysis },
    { label: 'Спряжение глагола', icon: <TableIcon />, action: () => { if (analysis?.verbDetails?.infinitive) onOpenVerbConjugation(analysis.verbDetails.infinitive); }, condition: !!analysis?.verbDetails },
    { label: 'Склонение существительного', icon: <TableIcon />, action: () => { if (analysis?.nounDetails) onOpenNounDeclension(analysis.word, analysis.nounDetails.article); }, condition: !!analysis?.nounDetails },
  ] : [];


  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={handleBackdropClick} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-lg shadow-2xl animate-fade-in-center text-white w-72 overflow-hidden p-1"
        onClick={e => e.stopPropagation()}
      >
        {/* Instant Items */}
        {instantMenuItems
            .filter((item) => item.condition)
            .map((item) => (
              <button
                key={item.label}
                onClick={(e) => handleAction(e, item.action)}
                className="w-full flex items-center px-3 py-2.5 text-left hover:bg-slate-600 transition-colors text-sm rounded-md"
              >
                <div className="w-5 h-5 mr-3 text-slate-300">{item.icon}</div>
                <span>{item.label}</span>
              </button>
        ))}

        <hr className="border-slate-600 my-1" />
        
        {/* Deferred Items */}
        {isAnalysisLoading ? (
            <div className="flex items-center px-3 py-2.5 text-sm text-slate-400">
                <Spinner className="w-5 h-5 mr-3" />
                <span>Анализ...</span>
            </div>
        ) : (
            deferredMenuItems
                .filter((item) => item.condition)
                .map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => handleAction(e, item.action)}
                    className="w-full flex items-center px-3 py-2.5 text-left hover:bg-slate-600 transition-colors text-sm rounded-md"
                  >
                    <div className="w-5 h-5 mr-3 text-slate-300">{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                ))
        )}
      </div>
    </>
  );
};

export default ChatContextMenu;
