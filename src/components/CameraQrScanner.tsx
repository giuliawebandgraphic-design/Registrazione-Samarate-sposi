import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  Upload, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { playFeedbackSound } from '../utils/audioFeedback';

interface CameraQrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isProcessing?: boolean;
}

export const CameraQrScanner: React.FC<CameraQrScannerProps> = ({
  onScanSuccess,
  isProcessing = false
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isIframeBlocked, setIsIframeBlocked] = useState<boolean>(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const containerId = 'interactive-qr-scanner-viewport';

  // Check if running inside an iframe
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      setIsScanning(false);
      setTorchOn(false);
    }
  }, []);

  const handleDecoded = useCallback((decodedText: string) => {
    const now = Date.now();
    // Debounce 2.2s for same code, 1.0s for different code
    if (decodedText === lastScannedCode && now - lastScanTimeRef.current < 2200) {
      return;
    }
    if (now - lastScanTimeRef.current < 900) {
      return;
    }

    lastScanTimeRef.current = now;
    setLastScannedCode(decodedText);

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([70, 40, 70]);
      } catch {
        // safe
      }
    }

    onScanSuccess(decodedText);
  }, [lastScannedCode, onScanSuccess]);

  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    setErrorMsg(null);
    setIsPermissionDenied(false);
    setIsIframeBlocked(false);

    try {
      // Check mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("La fotocamera non è supportata da questo browser o la pagina non è servita in HTTPS.");
        return;
      }

      // Stop existing instance if any
      await stopScanner();

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = scanner;

      // Query available cameras
      let foundCameras: CameraDevice[] = [];
      try {
        foundCameras = await Html5Qrcode.getCameras();
        setCameras(foundCameras);
      } catch (err) {
        console.warn('Could not enumerate cameras prior to permission:', err);
      }

      // Determine camera config: prefer rear/environment camera on phones
      let cameraConfig: any = { facingMode: 'environment' };
      if (cameraIdToUse) {
        cameraConfig = cameraIdToUse;
        setCurrentCameraId(cameraIdToUse);
      } else if (foundCameras.length > 0) {
        // Look for rear camera in labels
        const backCam = foundCameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('posteriore') ||
          c.label.toLowerCase().includes('environment')
        );
        if (backCam) {
          cameraConfig = backCam.id;
          setCurrentCameraId(backCam.id);
        } else {
          cameraConfig = foundCameras[foundCameras.length - 1].id;
          setCurrentCameraId(cameraConfig);
        }
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(200, Math.floor(minEdge * 0.72));
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // Frame errors are continuous and normal during search
        }
      );

      setIsScanning(true);

      // Check if torch / flashlight is supported
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        setHasTorch(Boolean(capabilities?.torchFeature()?.isSupported()));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);

      const errName = err?.name || '';
      const errMsg = String(err?.message || err || '');

      if (errName === 'NotAllowedError' || errMsg.includes('Permission') || errMsg.includes('denied')) {
        setIsPermissionDenied(true);
        if (inIframe) {
          setIsIframeBlocked(true);
        }
        setErrorMsg("Accesso alla fotocamera negato. Consenti l'autorizzazione nelle impostazioni del browser.");
      } else if (errName === 'NotFoundError' || errMsg.includes('NotFoundError')) {
        setErrorMsg("Nessuna fotocamera rilevata sul dispositivo.");
      } else if (errName === 'NotReadableError' || errMsg.includes('in use')) {
        setErrorMsg("La fotocamera è già in uso da un'altra applicazione. Chiudi le altre app e riprova.");
      } else {
        if (inIframe) {
          setIsIframeBlocked(true);
        }
        setErrorMsg(`Impossibile avviare la fotocamera (${errMsg || 'Errore sconosciuto'}).`);
      }
    }
  }, [handleDecoded, inIframe, stopScanner]);

  // Flip camera between front and back
  const handleToggleFlipCamera = async () => {
    if (cameras.length <= 1) {
      // Toggle facingMode if no enumerated list
      const nextMode = currentCameraId === 'front' ? 'back' : 'front';
      setCurrentCameraId(nextMode);
      await startScanner(nextMode === 'front' ? { facingMode: 'user' } : { facingMode: 'environment' } as any);
      return;
    }

    const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    await startScanner(nextCamera.id);
  };

  // Toggle flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore html5-qrcode types
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Scan from photo or gallery upload
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
        scannerRef.current = scanner;
      }

      const decodedResult = await scanner.scanFileV2(file, true);
      if (decodedResult?.decodedText) {
        playFeedbackSound('success');
        handleDecoded(decodedResult.decodedText);
      } else {
        playFeedbackSound('error');
        alert("Nessun QR Code valido rilevato in questa immagine. Assicurati che il codice sia ben visibile e a fuoco.");
      }
    } catch (err) {
      console.error('File scan error:', err);
      playFeedbackSound('error');
      alert("Nessun QR Code trovato nell'immagine caricata.");
    } finally {
      e.target.value = '';
    }
  };

  // Handle open in new window (essential for mobile users if iframe blocks camera)
  const handleOpenNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  // Lifecycle: start or stop when isOpen changes
  useEffect(() => {
    if (isOpen) {
      // Short delay to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  return (
    <div className="bg-[#16391C] rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-[#A89236]/30 overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#C4AF56] text-[#16391C] flex items-center justify-center font-bold shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-white tracking-wide">
                Scanner Fotocamera QR Live
              </h3>
              {isScanning && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ATTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-[#CAC8AA]">
              Punta la fotocamera del tuo smartphone verso il Pass per la convalida istantanea
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isScanning && (
            <>
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title={torchOn ? "Spegni Torcia" : "Accendi Torcia Flash"}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    torchOn 
                      ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-md' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleFlipCamera}
                  title="Cambia fotocamera (posteriore/anteriore)"
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Toggle Camera Active State */}
          <button
            type="button"
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                setIsOpen(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isOpen 
                ? 'bg-white/15 hover:bg-white/25 text-white border-white/20' 
                : 'bg-[#C4AF56] hover:bg-[#b09d4c] text-[#16391C] border-[#C4AF56]'
            }`}
          >
            {isOpen ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                Pausa Fotocamera
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                Attiva Fotocamera
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Viewport Area */}
      <div className="mt-4">
        {isOpen ? (
          <div className="relative w-full max-w-md mx-auto aspect-square sm:aspect-4/3 rounded-2xl overflow-hidden bg-black border-2 border-[#C4AF56]/40 shadow-inner flex items-center justify-center">
            {/* The video container for Html5Qrcode */}
            <div 
              id={containerId} 
              className="w-full h-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Target Reticle Overlay & Animation (Visible when scanning) */}
            {isScanning && !errorMsg && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Darkened vignette around target */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-[#C4AF56]/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Glowing corner brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#C4AF56] rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#C4AF56] rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#C4AF56] rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#C4AF56] rounded-br-lg" />

                  {/* Laser line moving vertically */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C4AF56] to-transparent shadow-[0_0_10px_#C4AF56] animate-[pulse_1.5s_ease-in-out_infinite] top-1/2 -translate-y-1/2" />
                  
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 text-[#F7F4EC] backdrop-blur-xs border border-white/20 shadow-xs">
                      Centra il QR Code nel mirino
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                <RefreshCw className="w-8 h-8 text-[#C4AF56] animate-spin" />
                <span className="text-sm font-bold text-white">Verifica ingresso in corso...</span>
              </div>
            )}

            {/* Error or Permission Blocked Overlay */}
            {errorMsg && (
              <div className="absolute inset-0 bg-neutral-900/95 p-6 flex flex-col items-center justify-center text-center gap-3.5 z-20">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base font-serif">
                    Accesso Fotocamera Limitato
                  </h4>
                  <p className="text-xs text-[#CAC8AA] mt-1.5 max-w-xs leading-relaxed">
                    {errorMsg}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 mt-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Riprova Connessione
                  </button>

                  {isIframeBlocked && (
                    <button
                      type="button"
                      onClick={handleOpenNewWindow}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#C4AF56] hover:bg-[#b09d4c] text-[#16391C] text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Apri in Nuova Scheda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 bg-black/30 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center gap-3">
            <CameraOff className="w-10 h-10 text-white/40" />
            <div>
              <p className="text-sm font-semibold text-white">Scanner fotocamera in pausa</p>
              <p className="text-xs text-[#CAC8AA] mt-0.5">Riattivalo per effettuare la scansione continua dal vivo</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#C4AF56] text-[#16391C] font-bold text-xs hover:bg-[#b09d4c] shadow-xs cursor-pointer transition-all"
            >
              Avvia Scanner Fotocamera
            </button>
          </div>
        )}

        {/* Alternative Scan Options: File upload (photo/gallery) + Open new window */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <label 
              htmlFor="qr-file-input"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#F7F4EC] border border-white/15 transition-colors cursor-pointer"
              title="Carica un'immagine, uno screenshot o scatta una foto del QR"
            >
              <Upload className="w-3.5 h-3.5 text-[#C4AF56]" />
              <span>Scansiona da Foto o Rullino</span>
              <input
                id="qr-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileScan}
              />
            </label>

            {inIframe && (
              <button
                type="button"
                onClick={handleOpenNewWindow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#CAC8AA] hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Apri l'app a schermo intero nel browser del telefono"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#C4AF56]" />
                <span>Schermo Intero</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-[#CAC8AA]/80 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Riconoscimento automatico e feedback sonoro attivo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
