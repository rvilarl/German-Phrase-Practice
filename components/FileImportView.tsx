import React, { useState, useCallback } from 'react';
import FilePlusIcon from './icons/FilePlusIcon';
import XCircleIcon from './icons/XCircleIcon';

interface FileImportViewProps {
  onProcessFile: (fileData: { mimeType: string; data: string }) => void;
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
      onProcessFile({ mimeType: file.type, data: base64Data });
    } catch (e) {
      setError('Не удалось прочитать файл.');
      console.error(e);
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
            <button onClick={handleSubmit} className="mt-4 w-full max-w-xs px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-md">
                Распознать и создать карточки
            </button>
        </div>
      )}
      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default FileImportView;
