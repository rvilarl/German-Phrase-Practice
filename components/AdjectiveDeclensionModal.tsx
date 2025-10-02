import React from 'react';
import type { Phrase, AdjectiveDeclension, AdjectiveDeclensionTable } from '../types';
import CloseIcon from './icons/CloseIcon';
import TableIcon from './icons/TableIcon';
import AudioPlayer from './AudioPlayer';

interface AdjectiveDeclensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjective: string;
  data: AdjectiveDeclension | null;
  isLoading: boolean;
  error: string | null;
  onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
}

const AdjectiveDeclensionSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        {/* Comparison */}
        <section>
            <div className="h-6 w-1/2 bg-slate-700 rounded mb-3"></div>
            <div className="bg-slate-700/50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-14 bg-slate-600 rounded"></div>
                <div className="h-14 bg-slate-600 rounded"></div>
                <div className="h-14 bg-slate-600 rounded"></div>
            </div>
        </section>
        {/* Table */}
        <section>
            <div className="h-6 w-2/3 bg-slate-700 rounded mb-3"></div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
                <div className="w-full min-w-[600px] space-y-1">
                    <div className="flex items-center p-2">
                        <div className="h-5 bg-slate-600 rounded w-1/5"></div>
                        <div className="h-5 bg-slate-600 rounded w-1/5 ml-2"></div>
                        <div className="h-5 bg-slate-600 rounded w-1/5 ml-2"></div>
                        <div className="h-5 bg-slate-600 rounded w-1/5 ml-2"></div>
                        <div className="h-5 bg-slate-600 rounded w-1/5 ml-2"></div>
                    </div>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center p-2 border-t border-slate-700">
                            <div className="h-6 bg-slate-600 rounded w-1/5"></div>
                            <div className="h-6 bg-slate-600 rounded w-1/5 ml-2"></div>
                            <div className="h-6 bg-slate-600 rounded w-1/5 ml-2"></div>
                            <div className="h-6 bg-slate-600 rounded w-1/5 ml-2"></div>
                            <div className="h-6 bg-slate-600 rounded w-1/5 ml-2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    </div>
);


const AdjectiveDeclensionModal: React.FC<AdjectiveDeclensionModalProps> = ({ isOpen, onClose, adjective, data, isLoading, error, onOpenWordAnalysis }) => {
  if (!isOpen) return null;
  
  const handleWordClick = (contextText: string, word: string) => {
    // FIX: Updated proxy phrase creation to match the new `Phrase` type with a nested `text` object.
    const proxyPhrase: Omit<Phrase, 'id'> & { id?: string } = {
        id: `proxy_adj_${adjective}`,
        text: { learning: contextText, native: `Склонение: ${adjective}` },
        category: 'general',
        masteryLevel: 0, lastReviewedAt: null, nextReviewAt: Date.now(),
        knowCount: 0, knowStreak: 0, isMastered: false,
        lapses: 0,
    };
    onOpenWordAnalysis(proxyPhrase as Phrase, word);
  };
  
  const renderEnding = (text: string) => {
    if (!text) return text;
    const parts = text.split('**');
    if (parts.length === 3) {
      return <>{parts[0]}<strong className="text-yellow-300 font-bold">{parts[1]}</strong>{parts[2]}</>;
    }
    return text;
  };
  
  const renderClickableGerman = (text: string) => {
      if (!text) return null;
      return text.split(' ').map((word, i, arr) => (
          <span
              key={i}
              onClick={(e) => {
                  e.stopPropagation();
                  const cleanedWord = word.replace(/[.,!?*"“”:;]/g, '');
                  if (cleanedWord) handleWordClick(text, cleanedWord);
              }}
              className="cursor-pointer hover:bg-white/20 px-1 py-0.5 rounded-md transition-colors"
          >
              {renderEnding(word)}{i < arr.length - 1 ? ' ' : ''}
          </span>
      ));
  };

  const renderDeclensionTable = (tableData: AdjectiveDeclensionTable, title: string) => {
    const cases: (keyof typeof tableData.masculine)[] = ['nominativ', 'akkusativ', 'dativ', 'genitiv'];
    return (
      <section>
        <h3 className="text-lg font-semibold text-purple-300 mb-3">{title}</h3>
        <div className="bg-slate-700/50 p-4 rounded-lg overflow-x-auto hide-scrollbar">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="p-2 text-sm font-semibold text-slate-400">Падеж</th>
                <th className="p-2 text-sm font-semibold text-slate-400">Мужской</th>
                <th className="p-2 text-sm font-semibold text-slate-400">Женский</th>
                <th className="p-2 text-sm font-semibold text-slate-400">Средний</th>
                <th className="p-2 text-sm font-semibold text-slate-400">Множ.</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(caseKey => (
                <tr key={caseKey} className="border-b border-slate-700 last:border-b-0">
                  <td className="p-2 text-slate-300 capitalize">{caseKey}</td>
                  <td className="p-2 text-slate-100 font-medium">{renderClickableGerman(tableData.masculine[caseKey])}</td>
                  <td className="p-2 text-slate-100 font-medium">{renderClickableGerman(tableData.feminine[caseKey])}</td>
                  <td className="p-2 text-slate-100 font-medium">{renderClickableGerman(tableData.neuter[caseKey])}</td>
                  <td className="p-2 text-slate-100 font-medium">{renderClickableGerman(tableData.plural[caseKey])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <AdjectiveDeclensionSkeleton />;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!data) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных.</p></div>;
    }

    return (
        <div className="space-y-8">
            <section>
                <h3 className="text-lg font-semibold text-purple-300 mb-3">Степени сравнения</h3>
                <div className="bg-slate-700/50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-slate-400">Положительная</p>
                        <div className="flex items-center justify-center gap-x-2"><AudioPlayer textToSpeak={data.comparison.positive} /><strong className="text-slate-100 text-lg">{renderClickableGerman(data.comparison.positive)}</strong></div>
                    </div>
                     <div>
                        <p className="text-sm text-slate-400">Сравнительная</p>
                        <div className="flex items-center justify-center gap-x-2"><AudioPlayer textToSpeak={data.comparison.comparative} /><strong className="text-slate-100 text-lg">{renderClickableGerman(data.comparison.comparative)}</strong></div>
                    </div>
                     <div>
                        <p className="text-sm text-slate-400">Превосходная</p>
                        <div className="flex items-center justify-center gap-x-2"><AudioPlayer textToSpeak={data.comparison.superlative} /><strong className="text-slate-100 text-lg">{renderClickableGerman(data.comparison.superlative)}</strong></div>
                    </div>
                </div>
            </section>
            {renderDeclensionTable(data.weak, 'Слабое склонение (с определенным артиклем)')}
            {renderDeclensionTable(data.mixed, 'Смешанное склонение (с неопределенным артиклем)')}
            {renderDeclensionTable(data.strong, 'Сильное склонение (без артикля)')}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-end" onClick={onClose}>
      <div 
        className={`bg-slate-800 w-full max-w-3xl h-[90%] max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <TableIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Прилагательное: {adjective}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 overflow-y-auto hide-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdjectiveDeclensionModal;