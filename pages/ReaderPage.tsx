import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ePub, { Rendition } from 'epubjs';
import { Book, WordAnalysis, Phrase } from '../types';
import * as dbService from '../services/dbService';
import Spinner from '../components/Spinner';
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon';
import ArrowRightIcon from '../components/icons/ArrowRightIcon';
import TextIcon from '../components/icons/TextIcon';
import BookmarkIcon from '../components/icons/BookmarkIcon';
import CloseIcon from '../components/icons/CloseIcon';
import ReaderContextMenu from '../components/ReaderContextMenu';
import ListIcon from '../components/icons/ListIcon';

interface ReaderPageProps {
    bookId: number;
    onClose: () => void;
    onCreateCard: (phraseData: { german: string; russian: string; }) => void;
    onTranslateGermanToRussian: (germanPhrase: string) => Promise<{ russian: string }>;
    onAnalyzeWord: (phrase: Phrase, word: string) => Promise<WordAnalysis | null>;
    onOpenWordAnalysis: (phrase: Phrase, word: string) => void;
    onOpenVerbConjugation: (infinitive: string) => void;
    onOpenNounDeclension: (noun: string, article: string) => void;
    onOpenAdjectiveDeclension: (adjective: string) => void;
}

const ReaderPage: React.FC<ReaderPageProps> = (props) => {
    const { bookId, onClose } = props;
    const [bookData, setBookData] = useState<Book | null>(null);
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuVisible, setIsMenuVisible] = useState(true);
    const [fontSize, setFontSize] = useState(100); // in percent
    const [progress, setProgress] = useState(0);
    const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState<{ cfi: string; label: string }[]>([]);
    const [currentPageCfi, setCurrentPageCfi] = useState<string | null>(null);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, text: string } | null>(null);
    const [isCardLoading, setIsCardLoading] = useState(false);
    
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<ePub.Book | null>(null);

    useEffect(() => {
        let renditionInstance: Rendition | null = null;
        let bookInstance: ePub.Book | null = null;

        const loadBook = async () => {
            try {
                const bookRecord = await dbService.getBook(bookId);
                const viewerNode = viewerRef.current;
                if (!bookRecord || !viewerNode) {
                    setIsLoading(false);
                    console.error("Book record not found or viewer not ready.");
                    return;
                }

                setBookData(bookRecord);
                setBookmarks(bookRecord.bookmarks || []);
                
                bookInstance = ePub(bookRecord.epubData);
                bookRef.current = bookInstance;

                const { width, height } = viewerNode.getBoundingClientRect();

                renditionInstance = bookInstance.renderTo(viewerNode, {
                    width,
                    height,
                    flow: 'paginated',
                    spread: 'auto',
                });
                setRendition(renditionInstance);

                renditionInstance.themes.register('dark', { body: { background: '#0f172a', color: '#e2e8f0' } });
                renditionInstance.themes.select('dark');
                
                await bookInstance.ready;
                await bookInstance.locations.generate(1650);

                try {
                    await renditionInstance.display(bookRecord.lastLocation || undefined);
                } catch (displayError) {
                    console.warn("Failed to display last location, displaying start of book instead.", displayError);
                    await renditionInstance.display();
                }

                setIsLoading(false);

            } catch (error) {
                console.error("Error loading book:", error);
                setIsLoading(false);
            }
        };
        
        loadBook();
        
        return () => {
            if (renditionInstance) renditionInstance.destroy();
            if (bookInstance) bookInstance.destroy();
        }
    }, [bookId]);
    
    // Handles resizing the epubjs rendition when the window size changes.
    useEffect(() => {
        if (!rendition || !viewerRef.current) return;

        const debouncedResize = () => {
            let timeoutId: number;
            return () => {
                clearTimeout(timeoutId);
                timeoutId = window.setTimeout(() => {
                    if (viewerRef.current) {
                        const { width, height } = viewerRef.current.getBoundingClientRect();
                        rendition.resize(width, height);
                    }
                }, 150); // Debounce for 150ms
            };
        };

        const handleResize = debouncedResize();
        
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, [rendition]);

    useEffect(() => {
        if (!rendition) return;

        const onRelocated = (location: any) => {
            if (bookRef.current && bookRef.current.locations && location.start) {
                const cfi = location.start.cfi;
                setCurrentPageCfi(cfi);
                dbService.updateBookLocation(bookId, cfi);
                
                const total = bookRef.current.locations.total;
                if (total > 0) {
                    const currentPage = bookRef.current.locations.locationFromCfi(cfi);
                    if (currentPage !== null) {
                        setProgress(Math.round(((currentPage + 1) / total) * 100));
                    }
                }
            }
        };

        const onSelected = (cfiRange: string, contents: any) => {
            if (!rendition) return;
            const range = rendition.getRange(cfiRange);
            if (range) {
                const rect = range.getBoundingClientRect();
                const selectedText = contents.window.getSelection()?.toString().trim();
                if (selectedText) {
                    setContextMenu({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        text: selectedText
                    });
                }
            }
        };
        
        const onKeyPressed = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') rendition?.prev();
            if (e.key === 'ArrowRight') rendition?.next();
        }

        rendition.on('relocated', onRelocated);
        rendition.on('selected', onSelected);
        rendition.on('keyup', onKeyPressed);
        rendition.hooks.content.register((contents: any) => {
           contents.window.addEventListener('keyup', onKeyPressed);
        });

        return () => {
            rendition.off('relocated', onRelocated);
            rendition.off('selected', onSelected);
            rendition.off('keyup', onKeyPressed);
        };
    }, [rendition, bookId]);

    const changeFontSize = (delta: number) => {
        const newSize = Math.max(80, Math.min(150, fontSize + delta));
        setFontSize(newSize);
        rendition?.themes.fontSize(`${newSize}%`);
    };
    
    const handleBookmark = async () => {
        if (!currentPageCfi || !bookData || !bookRef.current || !rendition) return;

        const isBookmarked = bookmarks.some(b => b.cfi === currentPageCfi);
        
        if (isBookmarked) {
            await dbService.deleteBookmark(bookId, currentPageCfi);
        } else {
            const currentLocation = rendition.currentLocation();
            const navItem = currentLocation ? bookRef.current.navigation.get(currentLocation.start.href) : null;
            const label = navItem?.label.trim() || `Закладка ${bookmarks.length + 1}`;
            await dbService.addBookmark(bookId, currentPageCfi, label);
        }
        const updatedBook = await dbService.getBook(bookId);
        setBookmarks(updatedBook?.bookmarks || []);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (rendition && bookRef.current && bookRef.current.locations) {
            const percentage = parseInt(e.target.value) / 100;
            const cfi = bookRef.current.locations.cfiFromPercentage(percentage);
            if (cfi) {
                rendition.display(cfi).catch(err => console.error("Failed to display CFI from progress bar:", cfi, err));
            }
        }
    };
    
    const navigateToBookmark = (cfi: string) => {
        rendition?.display(cfi).catch(err => console.error("Failed to display bookmark CFI:", cfi, err));
        setIsBookmarksOpen(false);
    }

    const handleCreateCard = async (text: string) => {
        setIsCardLoading(true);
        try {
            const { russian } = await props.onTranslateGermanToRussian(text);
            props.onCreateCard({ german: text, russian });
        } catch(e) {
            console.error(e);
        } finally {
            setIsCardLoading(false);
            setContextMenu(null);
        }
    }

    const handleAnalyzeWord = (text: string) => {
        setContextMenu(null);
        const proxyPhrase = { ...bookData, id: `proxy_${bookId}`, german: text, russian: "" } as Phrase;
        props.onOpenWordAnalysis(proxyPhrase, text);
    }
    
    const isCurrentPageBookmarked = useMemo(() => {
        if (!currentPageCfi) {
            return false;
        }
        return bookmarks.some(b => b.cfi === currentPageCfi);
    }, [bookmarks, currentPageCfi]);
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-900 z-20">
                    <Spinner />
                    <p className="mt-4 text-slate-400">Загружаем книгу...</p>
                </div>
            )}
            
            {/* Header Menu */}
            <div className={`fixed top-20 left-0 right-0 p-4 z-10 transition-transform ${isMenuVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="w-full max-w-3xl mx-auto bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-between p-2">
                   <div className="flex items-center gap-2">
                       <button onClick={onClose} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full"><CloseIcon className="w-6 h-6"/></button>
                       <div className="text-left">
                           <h2 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs">{bookData?.title}</h2>
                           <p className="text-xs text-slate-400 truncate">{bookData?.author}</p>
                       </div>
                   </div>
                   <div className="flex items-center space-x-1">
                        <button onClick={() => setIsBookmarksOpen(!isBookmarksOpen)} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full"><ListIcon className="w-5 h-5"/></button>
                        <button onClick={handleBookmark} className={`p-2 hover:bg-slate-700 rounded-full ${isCurrentPageBookmarked ? 'text-purple-400' : 'text-slate-300'}`}>
                           <BookmarkIcon className={`w-5 h-5 ${isCurrentPageBookmarked ? 'fill-current' : ''}`}/>
                        </button>
                   </div>
                </div>
            </div>

            {/* Main viewer area */}
            <div className="w-full h-full flex items-center justify-center" onClick={() => setContextMenu(null) || setIsMenuVisible(!isMenuVisible)}>
                <div ref={viewerRef} className="w-full h-full epub-container"></div>
            </div>

            {/* Footer Menu */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 z-10 transition-transform ${isMenuVisible ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="w-full max-w-3xl mx-auto bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col">
                    <div className="w-full flex items-center justify-between text-slate-300">
                        <span className="text-xs font-mono">{progress}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={progress} onChange={handleProgressChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-sm" />
                    
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                            <TextIcon className="w-5 h-5 text-slate-400"/>
                            <button onClick={() => changeFontSize(-10)} className="px-3 py-1 text-lg font-bold text-slate-300 hover:bg-slate-700 rounded-md">-</button>
                            <span className="text-sm w-12 text-center font-mono">{fontSize}%</span>
                            <button onClick={() => changeFontSize(10)} className="px-3 py-1 text-lg font-bold text-slate-300 hover:bg-slate-700 rounded-md">+</button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => rendition?.prev()} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full"><ArrowLeftIcon className="w-6 h-6"/></button>
                            <button onClick={() => rendition?.next()} className="p-2 text-slate-300 hover:bg-slate-700 rounded-full"><ArrowRightIcon className="w-6 h-6"/></button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bookmarks Panel */}
             {isBookmarksOpen && (
                <>
                <div className="fixed inset-0 bg-black/30 z-19" onClick={() => setIsBookmarksOpen(false)}></div>
                <div className={`fixed top-0 left-0 w-72 h-full bg-slate-800/90 backdrop-blur-sm shadow-lg z-20 p-4 border-r border-slate-700/50 transition-transform duration-300 ease-out ${isBookmarksOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Закладки</h3>
                        <button onClick={() => setIsBookmarksOpen(false)} className="p-1 hover:bg-slate-700 rounded-full"><CloseIcon className="w-5 h-5"/></button>
                    </div>
                    {bookmarks.length > 0 ? (
                        <ul>
                            {bookmarks.map(bm => (
                                <li key={bm.cfi} onClick={() => navigateToBookmark(bm.cfi)} className="p-2 text-sm text-slate-300 hover:bg-slate-700 rounded-md cursor-pointer truncate">
                                    {bm.label}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-400">Нет закладок.</p>
                    )}
                </div>
                </>
            )}
            
            {contextMenu && (
                <ReaderContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={() => setContextMenu(null)}
                    isLoading={isCardLoading}
                    onCreateCard={() => handleCreateCard(contextMenu.text)}
                    onAnalyzeWord={() => handleAnalyzeWord(contextMenu.text)}
                />
            )}
        </div>
    );
};

export default ReaderPage;