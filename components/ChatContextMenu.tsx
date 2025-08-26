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
    setTimeout(action, 50); // timeout to let modal close first
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
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl animate-fade-in-center text-white w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-lg font-bold text-purple-300 break-words">{word}</p>
            {isAnalysisLoading ? (
                 <div className="h-4 w-2/3 bg-slate-700 rounded animate-pulse mt-1"></div>
            ) : analysis ? (
                <p className="text-sm text-slate-400 capitalize">{analysis.translation}</p>
            ) : null}
        </div>
        <div className="p-2">
            {instantMenuItems
                .filter((item) => item.condition)
                .map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => handleAction(e, item.action)}
                    className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-700/60 transition-colors text-[15px] text-slate-200 rounded-lg"
                  >
                    <div className="w-5 h-5 mr-4 text-slate-400 flex-shrink-0">{item.icon}</div>
                    <span className="truncate">{item.label}</span>
                  </button>
            ))}

            {(instantMenuItems.filter(i => i.condition).length > 0) && <hr className="border-slate-700 mx-2 my-1" />}
            
            {isAnalysisLoading ? (
                <div className="flex items-center px-4 py-3 text-[15px] text-slate-400">
                    <Spinner className="w-5 h-5 mr-4" />
                    <span>Анализ...</span>
                </div>
            ) : (
                deferredMenuItems
                    .filter((item) => item.condition)
                    .map((item) => (
                      <button
                        key={item.label}
                        onClick={(e) => handleAction(e, item.action)}
                        className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-700/60 transition-colors text-[15px] text-slate-200 rounded-lg"
                      >
                        <div className="w-5 h-5 mr-4 text-slate-400 flex-shrink-0">{item.icon}</div>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))
            )}
        </div>
      </div>
    </>
  );
};

export default ChatContextMenu;
