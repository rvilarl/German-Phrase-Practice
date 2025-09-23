import React, { useState, useEffect, useCallback } from 'react';
import ePub from 'epubjs';
import { Book, BookRecord } from '../types';
import * as dbService from '../services/dbService';
import PlusIcon from '../components/icons/PlusIcon';
import Spinner from '../components/Spinner';

interface LibraryPageProps {
    onOpenBook: (bookId: number) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onOpenBook }) => {
    const [books, setBooks] = useState<BookRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingBook, setIsAddingBook] = useState(false);

    const loadBooks = useCallback(async () => {
        setIsLoading(true);
        const storedBooks = await dbService.getAllBooks();
        const bookRecords = storedBooks.map(book => ({
            ...book,
            id: book.id!,
            coverUrl: URL.createObjectURL(book.coverBlob)
        }));
        setBooks(bookRecords);
        setIsLoading(false);
    }, []);
    
    useEffect(() => {
        loadBooks();
        
        return () => {
            books.forEach(book => URL.revokeObjectURL(book.coverUrl));
        };
    }, []);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAddingBook(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const book = ePub(arrayBuffer);
            const metadata = await book.loaded.metadata;
            
            let coverBlob: Blob = new Blob();
            try {
                const coverUrl = await book.coverUrl();
                if (coverUrl) {
                    const coverResponse = await fetch(coverUrl);
                    coverBlob = await coverResponse.blob();
                } else {
                    throw new Error("No cover URL found.");
                }
            } catch (coverError) {
                console.warn("Could not load book cover, creating placeholder:", coverError);
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 450;
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#334155';
                ctx.fillRect(0, 0, 300, 450);
                ctx.fillStyle = '#cbd5e1';
                ctx.textAlign = 'center';
                ctx.font = '24px sans-serif';
                const words = metadata.title.split(' ');
                let line = '';
                let y = 180;
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > 260 && n > 0) {
                        ctx.fillText(line, 150, y);
                        line = words[n] + ' ';
                        y += 30;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, 150, y);
                
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) coverBlob = blob;
            }

            const newBook: Book = {
                title: metadata.title,
                author: metadata.creator,
                coverBlob,
                epubData: arrayBuffer,
                lastLocation: null,
                bookmarks: []
            };

            await dbService.addBook(newBook);
            await loadBooks(); // Reload all books to get the new one with its ID

        } catch (error) {
            console.error("Error processing EPUB file:", error);
            alert("Не удалось обработать EPUB файл. Возможно, он поврежден или имеет неподдерживаемый формат.");
        } finally {
            setIsAddingBook(false);
            event.target.value = ''; // Reset file input
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in">
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Spinner /></div>
            ) : (
                books.length === 0 ? (
                    <div className="text-center text-slate-400 py-16">
                        <h2 className="text-2xl font-bold text-white mb-4">Ваша библиотека пуста</h2>
                        <p className="mb-6">Добавьте свою первую книгу в формате EPUB, чтобы начать читать.</p>
                        <label className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-bold transition-colors cursor-pointer">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            <span>Добавить книгу</span>
                            <input type="file" accept=".epub" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {books.map(book => (
                            <div key={book.id} className="cursor-pointer group" onClick={() => onOpenBook(book.id)}>
                                <div className="aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden shadow-lg transform transition-transform group-hover:scale-105">
                                    <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="mt-2 text-sm font-semibold text-slate-100 truncate">{book.title}</h3>
                                <p className="text-xs text-slate-400 truncate">{book.author}</p>
                            </div>
                        ))}
                         <label className="relative aspect-[2/3] bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700/50 hover:border-purple-500 transition-colors cursor-pointer">
                            {isAddingBook ? <Spinner /> : <PlusIcon className="w-10 h-10" />}
                            <span className="mt-2 text-sm font-semibold">{isAddingBook ? 'Добавляем...' : 'Добавить книгу'}</span>
                            <input type="file" accept=".epub" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} disabled={isAddingBook} />
                        </label>
                    </div>
                )
            )}
        </div>
    );
};

export default LibraryPage;