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
                        'font-family': 'Inter, "Helvetica Neue", Arial, sans-serif !important',
                        'line-height': '1.6',
                        'user-select': 'none',
                        '-webkit-user-select': 'none',
                        '-moz-user-select': 'none',
                        '-ms-user-select': 'none'
                    },
                    p: { 'font-family': 'inherit !important' },
                    span: { 'font-family': 'inherit !important' }
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


    // --- Interactive hover highlights
    useEffect(() => {
        if (!rendition) return;

        const processedDocs = new WeakSet<Document>();
        const viewCleanups: Array<() => void> = [];

        const attachToView = (view: any) => {
            const doc: Document | undefined = view?.document;
            if (!doc || processedDocs.has(doc)) {
                return;
            }
            processedDocs.add(doc);
            const cleanup = initializeInteractiveHover(doc);
            viewCleanups.push(cleanup);
            if (typeof view?.on === 'function') {
                view.on('destroy', () => cleanup());
            }
        };

        const handleRendered = (_section: any, view: any) => {
            attachToView(view);
        };

        (rendition as any).on?.('rendered', handleRendered);

        const existingViews: any[] = (rendition as any).getContents?.() ?? [];
        existingViews.forEach((view) => attachToView(view));

        return () => {
            (rendition as any).off?.('rendered', handleRendered);
            viewCleanups.forEach((cleanup) => cleanup());
        };
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


const READER_BLOCK_TAGS = new Set<string>([
    'article',
    'aside',
    'blockquote',
    'div',
    'figcaption',
    'figure',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'li',
    'main',
    'nav',
    'ol',
    'p',
    'section',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
    'dd',
    'dt',
    'pre'
]);

const READER_EXCLUDED_TAGS = new Set<string>(['script', 'style', 'noscript']);

function initializeInteractiveHover(doc: Document): () => void {
    if (!doc.body) {
        return () => undefined;
    }

    if (doc.body.dataset.readerHoverReady === 'true') {
        return () => undefined;
    }

    doc.body.dataset.readerHoverReady = 'true';

    try {
        transformDocumentForHover(doc);
    } catch (error) {
        console.warn('Failed to prepare hoverable text in reader view:', error);
    }

    injectHoverStyles(doc);
    const detach = attachHoverHandlers(doc);
    return () => {
        detach();
    };
}

function transformDocumentForHover(doc: Document) {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    let currentNode: Node | null = walker.nextNode();
    while (currentNode) {
        const textNode = currentNode as Text;
        const parent = textNode.parentElement;
        if (parent) {
            const tagName = parent.tagName.toLowerCase();
            const isExcluded = READER_EXCLUDED_TAGS.has(tagName) || parent.classList.contains('reader-token');
            const content = textNode.textContent;
            if (!isExcluded && content && content.trim()) {
                textNodes.push(textNode);
            }
        }
        currentNode = walker.nextNode();
    }

    if (!textNodes.length) {
        return;
    }

    const tokenRegex = /[\p{L}\p{M}\p{N}'’\-]+|[.!?…]+|[,;:]+|[—–]+|\s+|./gu;
    const sentenceDelimiters = /[.!?…]/u;
    const phraseDelimiters = /[,;:—–]/u;

    const state = {
        sentenceId: 0,
        phraseId: 0,
        wordId: 0,
        newSentence: true,
        newPhrase: true,
    };

    textNodes.forEach((textNode) => {
        if (isStartOfBlock(textNode)) {
            state.newSentence = true;
            state.newPhrase = true;
        }

        const original = textNode.textContent ?? '';
        tokenRegex.lastIndex = 0;
        const tokens = original.match(tokenRegex);
        if (!tokens) {
            return;
        }

        const fragment = doc.createDocumentFragment();

        tokens.forEach((token) => {
            if (/^\s+$/.test(token)) {
                fragment.appendChild(doc.createTextNode(token));
                return;
            }

            if (sentenceDelimiters.test(token)) {
                fragment.appendChild(doc.createTextNode(token));
                state.newSentence = true;
                state.newPhrase = true;
                return;
            }

            if (phraseDelimiters.test(token)) {
                fragment.appendChild(doc.createTextNode(token));
                state.newPhrase = true;
                return;
            }

            const normalized = token.replace(/['’\-]/g, '');
            if (!normalized) {
                fragment.appendChild(doc.createTextNode(token));
                return;
            }

            if (state.newSentence) {
                state.sentenceId += 1;
                state.phraseId += 1;
                state.newSentence = false;
                state.newPhrase = false;
            } else if (state.newPhrase) {
                state.phraseId += 1;
                state.newPhrase = false;
            }

            const span = doc.createElement('span');
            span.className = 'reader-token';
            span.textContent = token;
            span.setAttribute('data-sentence-id', String(state.sentenceId));
            span.setAttribute('data-phrase-id', String(state.phraseId));
            span.setAttribute('data-word-id', String(state.wordId));
            state.wordId += 1;

            fragment.appendChild(span);
        });

        textNode.parentNode?.replaceChild(fragment, textNode);
    });
}

function attachHoverHandlers(doc: Document): () => void {
    const root = doc.documentElement;
    if (!root) {
        return () => undefined;
    }

    const phraseCache = new Map<string, HTMLElement[]>();
    const sentenceCache = new Map<string, HTMLElement[]>();

    let currentWord: HTMLElement | null = null;
    let currentPhraseId: string | null = null;
    let currentSentenceId: string | null = null;
    let pointerDown = false;

    const setWord = (el: HTMLElement | null) => {
        if (currentWord === el) {
            return;
        }
        if (currentWord) {
            currentWord.classList.remove('reader-word-highlight');
        }
        currentWord = el;
        if (el) {
            el.classList.add('reader-word-highlight');
        }
    };

    const setGroup = (type: 'phrase' | 'sentence', id: string | null) => {
        const activeId = type === 'phrase' ? currentPhraseId : currentSentenceId;
        if (activeId === id) {
            return;
        }

        const cache = type === 'phrase' ? phraseCache : sentenceCache;
        const className = type === 'phrase' ? 'reader-phrase-highlight' : 'reader-sentence-highlight';

        if (activeId) {
            const previous = cache.get(activeId);
            previous?.forEach((el) => el.classList.remove(className));
        }

        if (type === 'phrase') {
            currentPhraseId = id;
        } else {
            currentSentenceId = id;
        }

        if (!id) {
            return;
        }

        let elements = cache.get(id);
        if (!elements) {
            elements = Array.from(doc.querySelectorAll<HTMLElement>(`.reader-token[data-${type}-id="${id}"]`));
            cache.set(id, elements);
        }
        elements.forEach((el) => el.classList.add(className));
    };

    const clearHighlights = () => {
        setWord(null);
        setGroup('phrase', null);
        setGroup('sentence', null);
    };

    const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType === 'touch' || pointerDown) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (!target) {
            clearHighlights();
            return;
        }

        const wordEl = target.closest?.('.reader-token') as HTMLElement | null;
        if (!wordEl) {
            clearHighlights();
            return;
        }

        setWord(wordEl);
        setGroup('phrase', wordEl.getAttribute('data-phrase-id'));
        setGroup('sentence', wordEl.getAttribute('data-sentence-id'));
    };

    const handlePointerLeave = () => {
        clearHighlights();
    };

    const handlePointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'touch') {
            return;
        }
        pointerDown = true;
        clearHighlights();
    };

    const handlePointerUp = (event: PointerEvent) => {
        if (event.pointerType === 'touch') {
            return;
        }
        pointerDown = false;
    };

    root.addEventListener('pointermove', handlePointerMove);
    root.addEventListener('pointerover', handlePointerMove);
    root.addEventListener('pointerleave', handlePointerLeave);
    root.addEventListener('pointerdown', handlePointerDown);
    root.addEventListener('pointerup', handlePointerUp);
    root.addEventListener('pointercancel', handlePointerUp);
    doc.addEventListener('scroll', clearHighlights, true);

    return () => {
        clearHighlights();
        root.removeEventListener('pointermove', handlePointerMove);
        root.removeEventListener('pointerover', handlePointerMove);
        root.removeEventListener('pointerleave', handlePointerLeave);
        root.removeEventListener('pointerdown', handlePointerDown);
        root.removeEventListener('pointerup', handlePointerUp);
        root.removeEventListener('pointercancel', handlePointerUp);
        doc.removeEventListener('scroll', clearHighlights, true);
    };
}

function isStartOfBlock(textNode: Text): boolean {
    let ancestor: Element | null = textNode.parentElement;
    let blockAncestor: Element | null = null;

    while (ancestor) {
        if (READER_BLOCK_TAGS.has(ancestor.tagName.toLowerCase())) {
            blockAncestor = ancestor;
            break;
        }
        ancestor = ancestor.parentElement;
    }

    if (!blockAncestor) {
        return false;
    }

    let node: Node | null = textNode;
    while (node && node !== blockAncestor) {
        if (hasMeaningfulPreviousSibling(node)) {
            return false;
        }
        node = node.parentNode;
    }

    return true;
}

function hasMeaningfulPreviousSibling(node: Node): boolean {
    let prev = node.previousSibling;
    while (prev) {
        if (prev.nodeType === Node.TEXT_NODE) {
            if ((prev.textContent ?? '').trim()) {
                return true;
            }
        } else if (prev.nodeType === Node.ELEMENT_NODE) {
            const tagName = (prev as Element).tagName.toLowerCase();
            if (tagName === 'br' || tagName === 'wbr') {
                prev = prev.previousSibling;
                continue;
            }
            return true;
        }
        prev = prev.previousSibling;
    }
    return false;
}

function injectHoverStyles(doc: Document) {
    if (doc.getElementById('reader-hover-styles')) {
        return;
    }

    const style = doc.createElement('style');
    style.id = 'reader-hover-styles';
    style.textContent = `
        .reader-token {
            position: relative;
            display: inline;
            padding: 0 0.05em;
            margin: 0 -0.05em;
            border-radius: 0.3em;
            transition: background-color 120ms ease;
            cursor: default;
        }
        .reader-token.reader-sentence-highlight {
            background-color: rgba(148, 163, 184, 0.22);
        }
        .reader-token.reader-phrase-highlight {
            background-color: rgba(129, 140, 248, 0.28);
        }
        .reader-token.reader-word-highlight {
            background-color: rgba(168, 85, 247, 0.55);
        }
    `.trim();
    doc.head.appendChild(style);
}

// --- вспомогательная функция debounce
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
}
