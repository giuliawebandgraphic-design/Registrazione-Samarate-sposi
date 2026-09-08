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
  const [isScanSuccessFlash, setIsScanSuccessFlash] = useState<boolean>(false);

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
    // Debounce 2.0s for identical code, 0.8s for different code
    if (decodedText === lastScannedCode && now - lastScanTimeRef.current < 2000) {
      return;
    }
    if (now - lastScanTimeRef.current < 800) {
      return;
    }

    lastScanTimeRef.current = now;
    setLastScannedCode(decodedText);
    setIsScanSuccessFlash(true);
    setTimeout(() => setIsScanSuccessFlash(false), 550);

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
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
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
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

      // Full sensor scanning without strict qrbox cropping so any QR in the frame is detected instantly
      try {
        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          (decodedText) => {
            handleDecoded(decodedText);
          },
          () => {
            // Frame errors are continuous and normal during search
          }
        );
      } catch (firstErr: any) {
        // Fallback for laptops/desktops without environment camera
        const errStr = String(firstErr?.message || firstErr || '');
        if (firstErr?.name === 'OverconstrainedError' || errStr.includes('Overconstrained') || errStr.includes('constraint')) {
          console.warn('Environment camera overconstrained, falling back to any available camera:', firstErr);
          await scanner.start(
            {},
            { fps: 15 },
            (decodedText) => handleDecoded(decodedText),
            () => {}
          );
        } else {
          throw firstErr;
        }
      }

      setIsScanning(true);

      // Check if torch / flashlight is supported
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        setHasTorch(Boolean(capabilities?.torchFeature()?.isSupported()));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      setIsScanning(false);

      const errName = err?.name || '';
      const errMsg = String(err?.message || err || '');
      const isPermissionIssue = 
        errName === 'NotAllowedError' || 
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') || 
        errMsg.toLowerCase().includes('denied') ||
        errMsg.toLowerCase().includes('not allowed');

      if (isPermissionIssue) {
        console.warn('Camera access not granted or restricted by browser/iframe:', err);
        setIsPermissionDenied(true);
        if (inIframe) {
          setIsIframeBlocked(true);
        }
        setErrorMsg("Accesso alla fotocamera non autorizzato. Clicca su 'Consenti Fotocamera' oppure apri in una nuova scheda.");
      } else if (errName === 'NotFoundError' || errMsg.includes('NotFoundError')) {
        console.warn('No camera found on device:', err);
        setErrorMsg("Nessuna fotocamera rilevata sul dispositivo.");
      } else if (errName === 'NotReadableError' || errMsg.includes('in use')) {
        console.warn('Camera in use by another app:', err);
        setErrorMsg("La fotocamera è già in uso da un'altra applicazione. Chiudi le altre app e riprova.");
      } else {
        console.warn('Camera start issue:', err);
        if (inIframe) {
          setIsIframeBlocked(true);
        }
        setErrorMsg(`Impossibile avviare la fotocamera (${errMsg || 'Verifica i permessi del browser'}).`);
      }
    }
  }, [handleDecoded, inIframe, stopScanner]);

  // Direct user-gesture permission request
  const handleRequestPermission = async () => {
    setErrorMsg(null);
    setIsPermissionDenied(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      }
      await startScanner();
    } catch (err: any) {
      console.warn('Permission re-request failed:', err);
      setIsPermissionDenied(true);
      setErrorMsg("Autorizzazione negata dal browser. Puoi aprire in nuova scheda o scansionare da foto.");
    }
  };

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
      console.warn('File scan info:', err);
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
    <div className="bg-[#16391C] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 text-white shadow-md border border-[#A89236]/30 overflow-hidden">
      {/* Top Header Controls - Compact on mobile */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C4AF56] text-[#16391C] flex items-center justify-center font-bold shadow-xs shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
                Scanner QR
              </h3>
              {isScanning && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ATTIVO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isScanning && (
            <>
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title={torchOn ? "Spegni Torcia" : "Accendi Torcia Flash"}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
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
                  title="Cambia fotocamera"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Toggle Camera Active State */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isOpen 
                ? 'bg-white/15 hover:bg-white/25 text-white border-white/20' 
                : 'bg-[#C4AF56] hover:bg-[#b09d4c] text-[#16391C] border-[#C4AF56]'
            }`}
          >
            {isOpen ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pausa</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Attiva</span>
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

            {/* Transient Code Detected Notification */}
            {lastScannedCode && (
              <div className="absolute top-3 inset-x-3 flex items-center justify-between p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-emerald-500/60 text-xs text-white z-30 shadow-xl animate-fade-in">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Rilevato: <strong className="font-mono text-emerald-300 font-bold">{lastScannedCode}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastScannedCode(null)}
                  className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] text-white shrink-0 ml-2 font-semibold transition-colors cursor-pointer"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* Instant Green Scan Success Flash Animation */}
            {isScanSuccessFlash && (
              <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-xs flex flex-col items-center justify-center z-40 pointer-events-none animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl scale-110">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <span className="text-white text-xs font-bold mt-2 px-3 py-1 rounded-full bg-black/60 shadow-xs">
                  Codice Rilevato!
                </span>
              </div>
            )}

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
              <div className="absolute inset-0 bg-neutral-950/95 p-5 sm:p-6 flex flex-col items-center justify-center text-center gap-3 z-20 overflow-y-auto">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isPermissionDenied 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {isPermissionDenied ? <Camera className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base font-serif">
                    {isPermissionDenied ? "Permesso Fotocamera Richiesto" : "Fotocamera non disponibile"}
                  </h4>
                  <p className="text-xs text-[#CAC8AA] mt-1 max-w-xs leading-relaxed">
                    {errorMsg}
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-1 w-full max-w-xs">
                  {/* Direct button to prompt permission on user click */}
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C4AF56] hover:bg-[#b09d4c] text-[#16391C] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Consenti e Avvia Fotocamera
                  </button>

                  {/* Open in full window (bypasses iframe restrictions) */}
                  <button
                    type="button"
                    onClick={handleOpenNewWindow}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#C4AF56]" />
                    Apri a Schermo Intero (Nuova Scheda)
                  </button>

                  {/* Immediate Photo Scan Fallback */}
                  <label 
                    htmlFor="qr-file-input-fallback"
                    className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#CAC8AA] hover:text-white text-xs font-medium border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C4AF56]" />
                    <span>Scansiona da Foto o Screenshot</span>
                    <input
                      id="qr-file-input-fallback"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileScan}
                    />
                  </label>
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

        {/* Alternative Scan Options */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-white/10 text-xs">
          <label 
            htmlFor="qr-file-input"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[#F7F4EC] text-xs font-medium border border-white/15 transition-colors cursor-pointer"
            title="Carica foto o screenshot del QR"
          >
            <Upload className="w-3.5 h-3.5 text-[#C4AF56]" />
            <span>Carica Foto / File QR</span>
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#CAC8AA] hover:text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer"
              title="Apri a schermo intero"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#C4AF56]" />
              <span>Nuova Scheda</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
