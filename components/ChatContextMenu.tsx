import React, { useState, useEffect, useCallback } from 'react';
import type { Phrase, WordAnalysis } from '../types';
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

const MenuSkeleton: React.FC = () => (
  <div className="animate-pulse p-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center px-2 py-3">
        <div className="w-5 h-5 mr-3 bg-slate-600 rounded"></div>
        <div className="w-40 h-4 bg-slate-600 rounded"></div>
      </div>
    ))}
  </div>
);


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
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
      const result = await onAnalyzeWord(proxyPhrase, word);
      if (isMounted) {
        setAnalysis(result);
        setIsLoading(false);
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

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const menuItems = [
    { label: 'Сведения о слове', icon: <InfoIcon className="w-5 h-5" />, action: () => onOpenWordAnalysis(proxyPhrase, word), condition: true },
    { label: 'Создать карточку для фразы', icon: <CardPlusIcon className="w-5 h-5" />, action: () => onCreateCard({ german: sentence.german, russian: sentence.russian }), condition: !!sentence.russian && !phraseCardExists },
    { label: 'Создать карточку для слова', icon: <PlusIcon className="w-5 h-5" />, action: () => { if (analysis) onCreateCard({ german: getCanonicalWordGerman(), russian: analysis.translation }); }, condition: !wordCardExists && !!analysis },
    { label: 'Сгенерировать еще такие фразы', icon: <WandIcon className="w-5 h-5" />, action: () => onGenerateMore(`Сгенерируй еще несколько примеров, похожих на "${sentence.german}"`), condition: true },
    { label: 'Озвучить фразу', icon: <SoundIcon className="w-5 h-5" />, action: () => onSpeak(sentence.german), condition: true },
    { label: 'Озвучить слово', icon: <SoundIcon className="w-5 h-5" />, action: () => onSpeak(word), condition: true },
    { label: 'Спряжение глагола', icon: <TableIcon className="w-5 h-5" />, action: () => { if (analysis?.verbDetails?.infinitive) onOpenVerbConjugation(analysis.verbDetails.infinitive); }, condition: !!analysis?.verbDetails },
    { label: 'Склонение существительного', icon: <TableIcon className="w-5 h-5" />, action: () => { if (analysis?.nounDetails) onOpenNounDeclension(analysis.word, analysis.nounDetails.article); }, condition: !!analysis?.nounDetails },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-700 rounded-lg shadow-2xl animate-fade-in-center text-white w-72 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {isLoading ? (
          <MenuSkeleton />
        ) : (
          menuItems
            .filter((item) => item.condition)
            .map((item) => (
              <button
                key={item.label}
                onClick={() => handleAction(item.action)}
                className="w-full flex items-center px-4 py-3 text-left hover:bg-slate-600 transition-colors text-sm"
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