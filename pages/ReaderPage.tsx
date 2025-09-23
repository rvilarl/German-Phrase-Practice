import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub, { Rendition } from 'epubjs';
import { Book } from '../types';
import * as dbService from '../services/dbService';
import Spinner from '../components/Spinner';
import CloseIcon from '../components/icons/CloseIcon';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import ArrowRightIcon from '../components/icons/ArrowRightIcon';

const SWIPE_THRESHOLD = 50;

interface ReaderPageProps {
    bookId: number;
    onClose: () => void;
}

const ReaderPage: React.FC<ReaderPageProps> = ({ bookId, onClose }) => {
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<ePub.Book | null>(null);
    const touchStartRef = useRef<number | null>(null);

    // --- Загружаем книгу
    useEffect(() => {
        let renditionInstance: Rendition | null = null;
        let bookInstance: ePub.Book | null = null;

        const loadBook = async () => {
            try {
                const bookRecord = await dbService.getBook(bookId);
                const viewerNode = viewerRef.current;
                if (!bookRecord || !viewerNode) {
                    setIsLoading(false);
                    return;
                }

                bookInstance = ePub(bookRecord.epubData);
                bookRef.current = bookInstance;

                const { width, height } = viewerNode.getBoundingClientRect();
                renditionInstance = bookInstance.renderTo(viewerNode, {
                    width,
                    height,
                    flow: 'paginated',
                    spread: 'auto',
                    // FIX: Removed invalid 'animation' property from RenditionOptions.
                });
                setRendition(renditionInstance);

                renditionInstance.themes.register('dark', {
                    body: { 
                        background: '#0f172a', 
                        color: '#e2e8f0',
                        'font-family': 'sans-serif',
                        'line-height': '1.6',
                    }
                });
                renditionInstance.themes.select('dark');
                renditionInstance.themes.fontSize('112.5%');

                await bookInstance.ready;
                await bookInstance.locations.generate(1650);

                try {
                    await renditionInstance.display(bookRecord.lastLocation || undefined);
                } catch (displayError) {
                    console.warn("Не удалось загрузить последнюю позицию, открываем начало.", displayError);
                    await renditionInstance.display();
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Ошибка загрузки книги:", error);
                setIsLoading(false);
            }
        };

        loadBook();

        return () => {
            renditionInstance?.destroy();
            bookInstance?.destroy();
        };
    }, [bookId]);

    // --- Resize
    useEffect(() => {
        if (!rendition || !viewerRef.current) return;

        const handleResize = () => {
            if (viewerRef.current) {
                const { width, height } = viewerRef.current.getBoundingClientRect();
                rendition.resize(width, height);
            }
        };

        const debounced = debounce(handleResize, 200);
        window.addEventListener('resize', debounced);

        return () => {
            window.removeEventListener('resize', debounced);
        };
    }, [rendition]);

    // --- Обновление прогресса
    useEffect(() => {
        if (!rendition) return;

        const onRelocated = (location: any) => {
            if (bookRef.current && bookRef.current.locations && location.start) {
                const cfi = location.start.cfi;
                dbService.updateBookLocation(bookId, cfi);

                // FIX: Replaced manual progress calculation with the more reliable built-in `percentageFromCfi` method.
                // This resolves issues with `locations.total` and `locationFromCfi` return types.
                try {
                    const percentage = bookRef.current.locations.percentageFromCfi(cfi);
                    setProgress(Math.round(percentage * 100));
                } catch (err) {
                    console.warn("Ошибка расчёта прогресса:", err);
                }
            }
        };

        rendition.on('relocated', onRelocated);
        return () => rendition.off('relocated', onRelocated);
    }, [rendition, bookId]);

    // --- Навигация кликом
    const handleTapNavigation = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rendition) return;
        const { clientX } = e;
        const { left, width } = e.currentTarget.getBoundingClientRect();
        const third = width / 3;
        if (clientX - left < third) {
            rendition.prev();
        } else if (clientX - left > width - third) {
            rendition.next();
        }
    };

    // --- Навигация свайпом
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartRef.current !== null) {
            const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
            if (deltaX < -SWIPE_THRESHOLD) rendition?.next();
            else if (deltaX > SWIPE_THRESHOLD) rendition?.prev();
        }
        touchStartRef.current = null;
    };

    // --- Клавиатурная навигация
    useEffect(() => {
        if (!rendition) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") rendition.prev();
            if (e.key === "ArrowRight") rendition.next();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [rendition]);

    return (
        <div className="w-full h-[540px] flex flex-col items-center justify-center relative bg-slate-900">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-900 z-20">
                    <Spinner />
                    <p className="mt-4 text-slate-400">Загружаем книгу...</p>
                </div>
            )}

            <div
                className="w-full flex-grow relative"
                onClick={handleTapNavigation}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div ref={viewerRef} className="w-full h-full epub-container"></div>
            </div>

            <div className="flex-shrink-0 w-full p-4 flex items-center justify-between gap-x-4 bg-slate-900 border-t border-slate-700/50">
                <button
                    onClick={() => rendition?.prev()}
                    className="p-3 bg-slate-800/50 hover:bg-slate-700/80 rounded-full transition-colors text-white"
                    aria-label="Предыдущая страница"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>

                <div className="flex-grow flex items-center justify-center gap-x-4">
                    <span className="text-xs font-mono text-slate-400">{progress}%</span>
                    <div className="w-full max-w-sm bg-slate-700 rounded-full h-1.5">
                        <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <button
                    onClick={() => rendition?.next()}
                    className="p-3 bg-slate-800/50 hover:bg-slate-700/80 rounded-full transition-colors text-white"
                    aria-label="Следующая страница"
                >
                    <ArrowRightIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default ReaderPage;

// --- вспомогательная функция debounce
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
}
