/**
 * Notification component for auto-fix progress
 */

import React from 'react';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoClose } from 'react-icons/io5';
import Spinner from './Spinner';
import type { AutoFixState } from '../hooks/useAutoFixPhrases';

interface AutoFixNotificationProps {
    state: AutoFixState;
    onDismiss: () => void;
}

const AutoFixNotification: React.FC<AutoFixNotificationProps> = ({ state, onDismiss }) => {
    const { status, validationSummary, progress, error, completedMessage } = state;

    // Don't show notification if idle or skipped
    if (status === 'idle' || status === 'skipped') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 animate-slide-up">
            <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        {status === 'validating' && (
                            <>
                                <Spinner className="w-5 h-5 text-blue-500" />
                                <span className="text-white font-semibold">Validating phrases...</span>
                            </>
                        )}
                        {status === 'fixing' && (
                            <>
                                <Spinner className="w-5 h-5 text-purple-500" />
                                <span className="text-white font-semibold">Auto-fixing phrases...</span>
                            </>
                        )}
                        {status === 'completed' && (
                            <>
                                <IoCheckmarkCircleOutline className="w-5 h-5 text-green-500" />
                                <span className="text-white font-semibold">Auto-fix complete</span>
                            </>
                        )}
                        {status === 'error' && (
                            <>
                                <IoCloseCircleOutline className="w-5 h-5 text-red-500" />
                                <span className="text-white font-semibold">Error</span>
                            </>
                        )}
                    </div>
                    {(status === 'completed' || status === 'error') && (
                        <button
                            onClick={onDismiss}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <IoClose className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Validation stage */}
                    {status === 'validating' && validationSummary && (
                        <div className="text-sm text-slate-300">
                            <p>Checking {validationSummary.totalPhrases} phrases for issues...</p>
                        </div>
                    )}

                    {/* Fixing stage */}
                    {status === 'fixing' && progress && (
                        <div className="space-y-3">
                            {/* Progress bar */}
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full transition-all duration-300"
                                    style={{
                                        width: `${(progress.processed / progress.total) * 100}%`
                                    }}
                                />
                            </div>

                            {/* Stats */}
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>
                                    {progress.processed} / {progress.total}
                                </span>
                                <span className="text-green-400">
                                    ✓ {progress.successful}
                                </span>
                                {progress.failed > 0 && (
                                    <span className="text-red-400">
                                        ✗ {progress.failed}
                                    </span>
                                )}
                            </div>

                            {/* Current phrase */}
                            {progress.currentPhrase && (
                                <div className="text-xs text-slate-400 truncate">
                                    Processing: {progress.currentPhrase}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completed stage */}
                    {status === 'completed' && completedMessage && (
                        <div className="space-y-2">
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 p-3 rounded">
                                {completedMessage}
                            </pre>
                        </div>
                    )}

                    {/* Error stage */}
                    {status === 'error' && error && (
                        <div className="space-y-2">
                            <p className="text-sm text-red-300">
                                Failed to auto-fix phrases:
                            </p>
                            <p className="text-xs text-red-200 bg-red-900/30 p-2 rounded">
                                {error}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer with dismiss button for completed/error */}
                {(status === 'completed' || status === 'error') && (
                    <div className="px-4 pb-4">
                        <button
                            onClick={onDismiss}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoFixNotification;
