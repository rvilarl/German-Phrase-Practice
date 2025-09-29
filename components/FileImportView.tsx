import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';
import Cropper from 'cropperjs';
import FilePlusIcon from './icons/FilePlusIcon';
import XCircleIcon from './icons/XCircleIcon';
import WandIcon from './icons/WandIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import CheckIcon from './icons/CheckIcon';
import CloseIcon from './icons/CloseIcon';

interface ImageCropperModalProps {
  isOpen: boolean;
  src: string | null;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, src, onConfirm, onCancel }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);

  useEffect(() => {
    if (isOpen && src && imageRef.current) {
      cropperRef.current = new Cropper(imageRef.current, {
        viewMode: 1,
        dragMode: 'move',
        background: false,
        responsive: true,
        autoCropArea: 0.95,
        zoomOnWheel: true,
        guides: true,
        aspectRatio: NaN, // Free crop
      });
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [isOpen, src]);

  const handleConfirm = () => {
    if (cropperRef.current) {
      const dataUrl = cropperRef.current.getCroppedCanvas({
        minWidth: 256,
        minHeight: 256,
        maxWidth: 4096,
        maxHeight: 4096,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      }).toDataURL('image/jpeg', 0.9);
      onConfirm(dataUrl);
    }
  };

  if (!isOpen || !src) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
        <img ref={imageRef} src={src} className="block max-w-full max-h-full" alt="Image to crop" />
      </div>
      <div className="mt-4 flex items-center space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center"
        >
          <CloseIcon className="w-5 h-5 mr-2" />
          <span>Отмена</span>
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors flex items-center"
        >
          <CheckIcon className="w-5 h-5 mr-2" />
          <span>Подтвердить</span>
        </button>
      </div>
    </div>
  );
};


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
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [refinement, setRefinement] = useState('');
  const [isRefineListening, setIsRefineListening] = useState(false);
  const refineRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImageSrc, setCroppedImageSrc] = useState<string | null>(null);
  const [croppedImageData, setCroppedImageData] = useState<{ mimeType: string, data: string } | null>(null);

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

  const clearFile = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setFile(null);
    setError(null);
    setRefinement('');
    setIsCropperOpen(false);
    setImageToCrop(null);
    setCroppedImageSrc(null);
    setCroppedImageData(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = (selectedFile: File | null) => {
    clearFile();
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Неподдерживаемый тип файла. Пожалуйста, выберите изображение (JPG, PNG, WEBP).');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Файл слишком большой. Максимальный размер 10 МБ.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(selectedFile);
  };
  
  const handleSubmit = async () => {
    if (!croppedImageData) {
      setError("Пожалуйста, сначала загрузите и обрежьте изображение.");
      return;
    }
    onProcessFile(croppedImageData, refinement.trim() || undefined);
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
  
  const handleCropConfirm = (dataUrl: string) => {
    setCroppedImageSrc(dataUrl);
    const base64Data = dataUrl.split(',')[1];
    setCroppedImageData({ mimeType: 'image/jpeg', data: base64Data });
    setIsCropperOpen(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
      clearFile();
  };


  return (
    <>
      <div className="flex flex-col items-center justify-center h-full text-center">
        {!croppedImageSrc ? (
          <>
              <p className="text-slate-400 -mt-4 mb-4 max-w-md">Загрузите изображение. AI распознает текст или опишет объекты на фото, превратив их в карточки.</p>
              <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
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
                  <span className="text-xs text-slate-500 mt-2">JPG, PNG, WEBP (макс. 10МБ)</span>
              </label>
          </>
        ) : (
          <div className="w-full flex flex-col items-center">
              <div className="w-full h-48 bg-slate-700/50 rounded-lg p-1 flex items-center justify-center relative mb-4">
                  <button onClick={clearFile} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white/70 hover:text-white transition-colors z-10">
                      <XCircleIcon className="w-6 h-6"/>
                  </button>
                  <img
                      src={croppedImageSrc}
                      alt="Предпросмотр обрезанного изображения"
                      className="max-w-full max-h-full object-contain rounded-md"
                  />
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
              <button onClick={handleSubmit} disabled={!croppedImageData} className="mt-4 w-full max-w-xs px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-md flex items-center justify-center disabled:opacity-50">
                  <WandIcon className="w-5 h-5 mr-2" />
                  <span>Создать карточки</span>
              </button>
          </div>
        )}
        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
      </div>
      <ImageCropperModal 
        isOpen={isCropperOpen}
        src={imageToCrop}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </>
  );
};

export default FileImportView;
