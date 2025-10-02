import React, { useState, useCallback } from 'react';
import type { Phrase } from '../types';
import Spinner from './Spinner';
import CloseIcon from './icons/CloseIcon';
import * as backendService from '../services/backendService';

interface FindDuplicatesModalProps {
  onClose: () => void;
  onFindDuplicates: () => Promise<{ duplicateGroups: string[][] }>;
  updateAndSavePhrases: (updater: (prevPhrases: Phrase[]) => Phrase[]) => void;
  phrases: Phrase[];
  backendService: typeof backendService;
}

const FindDuplicatesModal: React.FC<FindDuplicatesModalProps> = ({ onClose, onFindDuplicates, updateAndSavePhrases, phrases, backendService }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<string[][]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);

  const handleFindDuplicates = async () => {
    setIsProcessing(true);
    setDuplicateGroups([]);
    setSearchCompleted(false);
    try {
      const { duplicateGroups } = await onFindDuplicates();
      setDuplicateGroups(duplicateGroups);
    } catch (error) {
      alert(`Ошибка при поиске дубликатов: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      setSearchCompleted(true);
    }
  };

  const handleCleanDuplicates = useCallback(async () => {
    if (duplicateGroups.length === 0) return;

    const idsToDelete = new Set<string>();
    const phraseMap = new Map(phrases.map(p => [p.id, p]));

    duplicateGroups.forEach(group => {
        const phrasesInGroup = group
            .map(id => phraseMap.get(id))
            .filter((p): p is Phrase => !!p);

        if (phrasesInGroup.length < 2) return;

        phrasesInGroup.sort((a, b) => b.knowCount - a.knowCount);

        for (let i = 1; i < phrasesInGroup.length; i++) {
            idsToDelete.add(phrasesInGroup[i].id);
        }
    });

    // Optimistic UI update
    updateAndSavePhrases(currentPhrases =>
        currentPhrases.filter(p => p && !idsToDelete.has(p.id))
    );

    onClose();
    // No need for alert here, toasts will be shown from App.tsx or another central place.

    // Background deletion with delay
    const deletionPromises = [];
    for (const id of idsToDelete) {
        deletionPromises.push(
            backendService.deletePhrase(id).catch(err => {
                console.error(`Failed to delete phrase ${id}:`, err);
                // Optionally, show a toast for failed deletions
            })
        );
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
    }
    
    await Promise.all(deletionPromises);
    // Optionally, show a final toast when all deletions are done.

  }, [duplicateGroups, phrases, updateAndSavePhrases, onClose, backendService]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <div className="p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-white mb-4">Поиск дубликатов</h2>

          {!searchCompleted && !isProcessing && (
            <div className="text-center">
              <p className="text-slate-300 mb-6">Начать поиск дубликатов среди всех фраз?</p>
              <button
                onClick={handleFindDuplicates}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                Начать поиск
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center h-32">
              <Spinner />
              <p className="text-slate-300 mt-4 animate-pulse">Идет поиск...</p>
            </div>
          )}

          {searchCompleted && !isProcessing && (
            <div>
              {duplicateGroups.length > 0 ? (
                <div>
                  <p className="text-green-400 text-lg text-center mb-2">
                    Найдено {duplicateGroups.length} групп дубликатов.
                  </p>
                  <div className="max-h-60 overflow-y-auto bg-slate-900/50 rounded-lg p-3 border border-slate-700 space-y-3 my-4">
                    {duplicateGroups.map((group, index) => {
                      const phrasesInGroup = group
                        .map(id => phrases.find(p => p.id === id))
                        .filter((p): p is Phrase => !!p);

                      return (
                        <div key={index} className="bg-slate-800 p-3 rounded-md">
                          {phrasesInGroup.map(phrase => (
                            <div key={phrase.id} className="py-1 not-last:border-b border-slate-700">
                              <p className="text-white">{phrase.text.learning}</p>
                              <p className="text-slate-400 text-sm">{phrase.text.native}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-slate-400 text-xs mb-4 text-center">
                    Будет удалена фраза с наименьшим прогрессом в каждой группе.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onClose}
                      className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleCleanDuplicates}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-blue-400 text-lg text-center mb-6">Дубликаты не найдены.</p>
                   <button
                      onClick={onClose}
                      className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors"
                    >
                      Закрыть
                    </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindDuplicatesModal;