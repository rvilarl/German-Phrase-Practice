import React from 'react';
import CloseIcon from './icons/CloseIcon';
import UsersIcon from './icons/UsersIcon';

interface PronounsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pronouns = [
    { german: 'ich', russian: 'я' },
    { german: 'du', russian: 'ты' },
    { german: 'er / sie / es', russian: 'он / она / оно' },
    { german: 'wir', russian: 'мы' },
    { german: 'ihr', russian: 'вы (неформ.)' },
    { german: 'sie / Sie', russian: 'они / Вы (форм.)' },
];

const PronounsModal: React.FC<PronounsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex justify-center items-center" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-sm m-4 rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <UsersIcon className="w-6 h-6 text-purple-400"/>
            <h2 className="text-lg font-bold text-slate-100">Личные местоимения</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
            <CloseIcon className="w-6 h-6 text-slate-400"/>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
           <div className="bg-slate-700/50 p-4 rounded-lg">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-600">
                            <th className="p-3 text-sm font-semibold text-slate-400">Немецкий</th>
                            <th className="p-3 text-sm font-semibold text-slate-400">Русский</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pronouns.map(p => (
                            <tr key={p.german} className="border-b border-slate-700 last:border-b-0">
                                <td className="p-3 text-slate-100 font-semibold text-lg">{p.german}</td>
                                <td className="p-3 text-slate-300 text-lg">{p.russian}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PronounsModal;
