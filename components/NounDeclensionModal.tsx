import React from 'react';
import type { NounDeclension } from '../types';
import Spinner from './Spinner';
import CloseIcon from './icons/CloseIcon';
import TableIcon from './icons/TableIcon';
import AudioPlayer from './AudioPlayer';

interface NounDeclensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  noun: string;
  data: NounDeclension | null;
  isLoading: boolean;
  error: string | null;
}

type CaseKey = keyof NounDeclension['singular'];

const NounDeclensionModal: React.FC<NounDeclensionModalProps> = ({ isOpen, onClose, noun, data, isLoading, error }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex flex-col justify-center items-center h-full"><Spinner /><p className="mt-4 text-slate-400">Загружаем склонение...</p></div>;
    }
    if (error) {
      return <div className="flex justify-center items-center h-full"><div className="text-center bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg"><p className="font-semibold">Ошибка</p><p className="text-sm">{error}</p></div></div>;
    }
    if (!data) {
      return <div className="flex justify-center items-center h-full"><p className="text-slate-400">Нет данных.</p></div>;
    }

    const cases: CaseKey[] = ['nominativ', 'akkusativ', 'dativ', 'genitiv'];
    const caseInfo: { [key in CaseKey]: { name: string; question: string } } = {
        nominativ: { name: 'Nominativ', question: '(кто? что?)' },
        akkusativ: { name: 'Akkusativ', question: '(кого? что?)' },
        dativ: { name: 'Dativ', question: '(кому? чему?)' },
        genitiv: { name: 'Genitiv', question: '(кого? чего?)' },
    };
    
    const renderCellContent = (text: string) => (
        <div className="flex items-center justify-between w-full gap-x-2">
            <span>{text}</span>
            <AudioPlayer textToSpeak={text} />
        </div>
    );

    return (
        <div className="bg-slate-700/50 p-4 rounded-lg overflow-x-auto hide-scrollbar">
            <table className="w-full min-w-[500px] text-left">
                <thead>
                    <tr className="border-b border-slate-600">
                        <th className="p-3 text-sm font-semibold text-slate-400">Падеж</th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Единственное число</th>
                        <th className="p-3 text-sm font-semibold text-slate-400">Множественное число</th>
                    </tr>
                </thead>
                <tbody>
                    {cases.map(caseKey => (
                        <tr key={caseKey} className="border-b border-slate-700 last:border-b-0">
                            <td className="p-3 text-slate-300 whitespace-nowrap">
                                <div>{caseInfo[caseKey].name}</div>
                                <div className="text-xs text-slate-400">{caseInfo[caseKey].question}</div>
                            </td>
                            <td className="p-3 text-slate-100 font-medium">
                                {renderCellContent(data.singular[caseKey])}
                            </td>
                            <td className="p-3 text-slate-100 font-medium">
                                {renderCellContent(data.plural[caseKey])}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-xl m-4 rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <TableIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Склонение: {noun}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default NounDeclensionModal;