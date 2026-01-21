
import React, { useRef, useState, useEffect } from 'react';

interface DocumentScannerProps {
  onCapture: (base64: string, mimeType: string) => void;
  onClose: () => void;
}

const DocumentScanner: React.FC<DocumentScannerProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashUI, setFlashUI] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 4096 },
            height: { ideal: 2160 } 
          },
          audio: false,
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera access denied", err);
        alert("Camera access is required for document scanning.");
        onClose();
      }
    }
    setupCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const applyTorch = async (state: boolean) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: state }]
        } as any);
      } catch (e) {
        console.error("Hardware flash control failed", e);
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    await applyTorch(true);
    setFlashUI(true);
    await new Promise(resolve => setTimeout(resolve, 250));

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (context && video.readyState >= 2) {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const wWidth = window.innerWidth;
      const wHeight = window.innerHeight;

      const vAspect = vWidth / vHeight;
      const sAspect = wWidth / wHeight;
      
      let sourceX = 0, sourceY = 0, sourceWidth = vWidth, sourceHeight = vHeight;

      if (vAspect > sAspect) {
        sourceWidth = vHeight * sAspect;
        sourceX = (vWidth - sourceWidth) / 2;
      } else {
        sourceHeight = vWidth / sAspect;
        sourceY = (vHeight - sourceHeight) / 2;
      }

      const hudW_CSS = Math.min(wWidth * 0.85, 450);
      const hudH_CSS = Math.min(wHeight * 0.6, 600);
      
      const hudX_Percent = (wWidth - hudW_CSS) / 2 / wWidth;
      const hudY_Percent = (wHeight - hudH_CSS) / 2 / wHeight;
      const hudW_Percent = hudW_CSS / wWidth;
      const hudH_Percent = hudH_CSS / wHeight;

      const finalSourceX = sourceX + (hudX_Percent * sourceWidth);
      const finalSourceY = sourceY + (hudY_Percent * sourceHeight);
      const finalSourceW = hudW_Percent * sourceWidth;
      const finalSourceH = hudH_Percent * sourceHeight;

      const scale = 3; 
      canvas.width = hudW_CSS * scale;
      canvas.height = hudH_CSS * scale;
      
      context.drawImage(
        video, 
        finalSourceX, finalSourceY, finalSourceW, finalSourceH, 
        0, 0, canvas.width, canvas.height
      );

      await applyTorch(false);
      setFlashUI(false);

      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      onCapture(base64, 'image/jpeg');
    } else {
      await applyTorch(false);
      setIsCapturing(false);
      setFlashUI(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden h-[100dvh] w-screen left-0 top-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      {flashUI && <div className="absolute inset-0 bg-white/30 z-[1200] pointer-events-none"></div>}

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[1100] px-4">
        <div className="w-full max-w-[450px] h-[60%] border-2 border-white/40 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 md:w-16 md:h-16 border-t-[6px] border-l-[6px] border-indigo-500 rounded-tl-[1.5rem] md:rounded-tl-[2rem]"></div>
          <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 border-t-[6px] border-r-[6px] border-indigo-500 rounded-tr-[1.5rem] md:rounded-tr-[2rem]"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 md:w-16 md:h-16 border-b-[6px] border-l-[6px] border-indigo-500 rounded-bl-[1.5rem] md:rounded-bl-[2rem]"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 md:w-16 md:h-16 border-b-[6px] border-r-[6px] border-indigo-500 rounded-br-[1.5rem] md:rounded-br-[2rem]"></div>
          
          <div className="absolute inset-x-0 h-[3px] bg-indigo-400 animate-[scan_2s_infinite] shadow-[0_0_15px_#6366f1] z-10"></div>
        </div>
        <p className="mt-8 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] bg-black/60 px-6 py-2 rounded-full backdrop-blur-md text-center max-w-[80%]">
          Position Receipt Inside Frame
        </p>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-32 md:h-40 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-around px-8 md:px-10 pb-8 md:pb-10 z-[1150]">
        <button onClick={onClose} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-white/10 text-white backdrop-blur-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button 
          onClick={capturePhoto} 
          disabled={isCapturing} 
          className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white p-1 bg-transparent group active:scale-90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            {isCapturing ? (
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-full"></div>
            )}
          </div>
        </button>

        <div className="w-12 h-12 md:w-14 md:h-14 invisible" />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DocumentScanner;
