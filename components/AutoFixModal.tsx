/**
 * Modal component for auto-fix progress
 * Shows a centered, engaging modal with progress and descriptions
 */

import React from 'react';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoRefreshOutline } from 'react-icons/io5';
import Spinner from './Spinner';
import type { AutoFixState } from '../hooks/useAutoFixPhrases';

interface AutoFixModalProps {
    state: AutoFixState;
    onDismiss: () => void;
}

const AutoFixModal: React.FC<AutoFixModalProps> = ({ state, onDismiss }) => {
    const { status, validationSummary, progress, error, completedMessage } = state;

    // Don't show modal if idle or skipped
    if (status === 'idle' || status === 'skipped') {
        return null;
    }

    // Get status text and icon
    const getStatusInfo = () => {
        switch (status) {
            case 'validating':
                return {
                    icon: <Spinner className="w-12 h-12 text-blue-500" />,
                    title: 'Проверка карточек',
                    description: validationSummary
                        ? `Проверяем ${validationSummary.totalPhrases} карточек на наличие проблем с транскрипцией...`
                        : 'Анализируем карточки...',
                    color: 'blue'
                };
            case 'fixing':
                return {
                    icon: <IoRefreshOutline className="w-12 h-12 text-purple-500 animate-spin" />,
                    title: 'Исправление транскрипции',
                    description: 'Автоматически исправляем проблемы с транскрипцией в карточках...',
                    color: 'purple'
                };
            case 'completed':
                return {
                    icon: <IoCheckmarkCircleOutline className="w-12 h-12 text-green-500" />,
                    title: 'Исправление завершено!',
                    description: 'Все проблемы с транскрипцией успешно исправлены.',
                    color: 'green'
                };
            case 'error':
                return {
                    icon: <IoCloseCircleOutline className="w-12 h-12 text-red-500" />,
                    title: 'Ошибка',
                    description: 'Произошла ошибка при исправлении карточек.',
                    color: 'red'
                };
            default:
                return {
                    icon: null,
                    title: '',
                    description: '',
                    color: 'slate'
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-lg w-full animate-scale-in overflow-hidden">
                    {/* Icon and Title Section */}
                    <div className="p-8 text-center border-b border-slate-700">
                        <div className="flex justify-center mb-4">
                            {statusInfo.icon}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {statusInfo.title}
                        </h2>
                        <p className="text-slate-300 text-sm">
                            {statusInfo.description}
                        </p>
                    </div>

                    {/* Content Section */}
                    <div className="p-6">
                        {/* Validation stage */}
                        {status === 'validating' && validationSummary && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">Всего карточек:</span>
                                    <span className="text-white font-semibold">{validationSummary.totalPhrases}</span>
                                </div>
                                {validationSummary.invalidPhrases > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Найдено проблем:</span>
                                        <span className="text-yellow-400 font-semibold">{validationSummary.invalidPhrases}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fixing stage */}
                        {status === 'fixing' && progress && (
                            <div className="space-y-4">
                                {/* Progress bar with percentage */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Прогресс</span>
                                        <span className="text-white font-semibold">
                                            {Math.round((progress.processed / progress.total) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-purple-400 h-full transition-all duration-500 ease-out shadow-lg"
                                            style={{
                                                width: `${(progress.processed / progress.total) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-white">
                                            {progress.processed}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Обработано
                                        </div>
                                    </div>
                                    <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                                        <div className="text-2xl font-bold text-green-400">
                                            {progress.successful}
                                        </div>
                                        <div className="text-xs text-green-300 mt-1">
                                            Исправлено
                                        </div>
                                    </div>
                                    {progress.failed > 0 && (
                                        <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                                            <div className="text-2xl font-bold text-red-400">
                                                {progress.failed}
                                            </div>
                                            <div className="text-xs text-red-300 mt-1">
                                                Ошибки
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Current phrase being processed */}
                                {progress.currentPhrase && (
                                    <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                                        <div className="text-xs text-slate-400 mb-1">
                                            Обрабатывается:
                                        </div>
                                        <div className="text-sm text-white truncate">
                                            {progress.currentPhrase}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Completed stage */}
                        {status === 'completed' && (
                            <div className="space-y-4">
                                {/* Success summary */}
                                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                                    {completedMessage && (
                                        <pre className="text-sm text-green-100 whitespace-pre-wrap font-mono">
                                            {completedMessage}
                                        </pre>
                                    )}
                                </div>

                                {/* Confetti effect */}
                                <div className="text-center text-4xl animate-bounce">
                                    🎉
                                </div>
                            </div>
                        )}

                        {/* Error stage */}
                        {status === 'error' && error && (
                            <div className="space-y-3">
                                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                                    <p className="text-sm text-red-200 mb-2">
                                        Не удалось автоматически исправить карточки:
                                    </p>
                                    <p className="text-xs text-red-300 bg-red-900/30 p-3 rounded font-mono">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer with dismiss button */}
                    {(status === 'completed' || status === 'error') && (
                        <div className="p-6 pt-0">
                            <button
                                onClick={onDismiss}
                                className={`
                                    w-full py-3 px-4 rounded-lg font-semibold text-white
                                    transition-all duration-200 transform hover:scale-105
                                    ${status === 'completed'
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30'
                                        : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
                                    }
                                `}
                            >
                                {status === 'completed' ? 'Отлично!' : 'Закрыть'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default AutoFixModal;
