import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import FilePlusIcon from './icons/FilePlusIcon';
import XCircleIcon from './icons/XCircleIcon';
import WandIcon from './icons/WandIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface FileImportViewProps {
  onProcessFile: (fileData: { mimeType: string; data: string }, refinement?: string) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve(base64Data);
      } else {
        reject(new Error('Failed to extract base64 data from file.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

const FileImportView: React.FC<FileImportViewProps> = ({ onProcessFile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [refinement, setRefinement] = useState('');
  const [isRefineListening, setIsRefineListening] = useState(false);
  const refineRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onstart = () => setIsRefineListening(true);
      recognition.onend = () => setIsRefineListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Refine speech recognition error:', event.error);
        setIsRefineListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setRefinement(transcript);
      };
      refineRecognitionRef.current = recognition;
    }
  }, []);


  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) {
        setFile(null);
        setPreviewSrc(null);
        return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Неподдерживаемый тип файла. Пожалуйста, выберите JPG, PNG, WEBP или PDF.');
      return;
    }
    
    if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
      setError('Файл слишком большой. Максимальный размер 4 МБ.');
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewSrc(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewSrc(null); // No preview for PDF
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      const base64Data = await fileToBase64(file);
      onProcessFile({ mimeType: file.type, data: base64Data }, refinement.trim() || undefined);
    } catch (e) {
      setError('Не удалось прочитать файл.');
      console.error(e);
    }
  };
  
  const handleMicClick = () => {
    if (!refineRecognitionRef.current) return;
    if (isRefineListening) {
      refineRecognitionRef.current.stop();
    } else {
      refineRecognitionRef.current.start();
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFile(null);
    setPreviewSrc(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      {!file ? (
        <>
            <p className="text-slate-400 -mt-4 mb-4 max-w-md">Загрузите изображение или PDF. AI распознает текст или опишет объекты на фото, превратив их в карточки.</p>
            <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/png, image/jpeg, image/webp, application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <label
                htmlFor="file-upload"
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onDragOver={(e) => handleDragEvents(e, true)}
                onDrop={handleDrop}
                className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-purple-500 bg-slate-700' : 'border-slate-600 hover:border-slate-500'}`}
            >
                <FilePlusIcon className="w-12 h-12 text-slate-500 mb-4" />
                <span className="font-semibold text-slate-300">Перетащите файл сюда</span>
                <span className="text-slate-400">или нажмите для выбора</span>
                <span className="text-xs text-slate-500 mt-2">JPG, PNG, WEBP, PDF (макс. 4МБ)</span>
            </label>
        </>
      ) : (
        <div className="w-full flex flex-col items-center">
            <div className="w-full h-48 bg-slate-700/50 rounded-lg p-3 flex items-center justify-center relative">
                <button onClick={clearFile} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white/70 hover:text-white transition-colors">
                    <XCircleIcon className="w-6 h-6"/>
                </button>
                {previewSrc ? (
                    <img src={previewSrc} alt="Предпросмотр" className="max-w-full max-h-full object-contain rounded-md" />
                ) : (
                    <div className="text-center">
                        <p className="text-lg font-semibold text-slate-300">PDF Документ</p>
                        <p className="text-sm text-slate-400">{file.name}</p>
                    </div>
                )}
            </div>
             <div className="relative w-full max-w-md mt-4">
                <textarea
                    value={refinement}
                    onChange={(e) => setRefinement(e.target.value)}
                    placeholder="Добавьте уточнение (необязательно)..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 pr-12 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors resize-none"
                    rows={2}
                />
                <button
                    type="button"
                    onClick={handleMicClick}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white"
                    aria-label="Голосовой ввод для уточнения"
                >
                    <MicrophoneIcon className={`w-5 h-5 ${isRefineListening ? 'text-purple-400' : ''}`} />
                </button>
            </div>
            <button onClick={handleSubmit} className="mt-4 w-full max-w-xs px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-md flex items-center justify-center">
                <WandIcon className="w-5 h-5 mr-2" />
                <span>Создать карточки</span>
            </button>
        </div>
      )}
      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default FileImportView;