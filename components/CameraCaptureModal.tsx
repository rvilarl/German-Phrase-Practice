import React, { useState, useEffect, useRef } from 'react';
import CloseIcon from './icons/CloseIcon';
import CameraIcon from './icons/CameraIcon';
import RefreshIcon from './icons/RefreshIcon';
import Spinner from './Spinner';
import { useTranslation } from '../src/hooks/useTranslation';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(true);
      const startCamera = async () => {
        try {
          // Prefer back camera on mobile devices
          const constraints = {
            video: { facingMode: 'environment' }
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setIsLoading(false);
        } catch (err) {
          console.error("Error accessing camera:", err);
          if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
              setError(t('modals.cameraCapture.errors.permission'));
          } else if (err instanceof DOMException && err.name === 'NotFoundError') {
              setError(t('modals.cameraCapture.errors.notFound'));
          } else {
              setError(t('modals.cameraCapture.errors.generic'));
          }
          setIsLoading(false);
        }
      };
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(dataUrl);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[110] flex flex-col items-center justify-center animate-fade-in">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 hover:bg-black/80 transition-colors text-white"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="relative w-full h-full max-w-4xl max-h-[85vh]">
        {isLoading && (
            <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                <Spinner className="w-10 h-10"/>
            </div>
        )}
        {error && (
            <div className="w-full h-full bg-slate-900 rounded-lg flex flex-col items-center justify-center text-center p-4">
                <p className="text-red-400 text-lg font-semibold mb-2">{t('modals.cameraCapture.errorTitle')}</p>
                <p className="text-slate-300">{error}</p>
                 <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white">
                    {t('common.actions.close')}
                </button>
            </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain rounded-lg ${isLoading || error ? 'hidden' : 'block'}`}
        />
      </div>

      {!isLoading && !error && (
        <div className="absolute bottom-8 flex items-center justify-center">
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-white/30 hover:scale-105 transition-transform"
            aria-label={t('modals.cameraCapture.aria.capture')}
          >
            <div className="w-16 h-16 rounded-full bg-white ring-2 ring-inset ring-black"></div>
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default CameraCaptureModal;
