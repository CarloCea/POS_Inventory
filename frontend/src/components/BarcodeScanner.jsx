import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Audio might be blocked before first user gesture
  }
};

const BarcodeScanner = ({ onScan, onClose, cartCount }) => {
  const [error, setError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [scanFlash, setScanFlash] = useState(false);

  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const lastScanRef = useRef({ code: '', time: 0 });
  const isMountedRef = useRef(true);
  const startingRef = useRef(false);

  const handleScannedCode = useCallback((rawCode) => {
    const clean = String(rawCode || '').trim();
    if (!clean) return;

    const now = Date.now();
    // 1.2s cooldown if scanning the exact same product repeatedly; immediate if different product
    if (clean === lastScanRef.current.code && now - lastScanRef.current.time < 1200) {
      return;
    }

    lastScanRef.current = { code: clean, time: now };
    playBeep();

    if (isMountedRef.current) {
      setLastScanned(clean);
      setScanFlash(true);
      setTimeout(() => {
        if (isMountedRef.current) setScanFlash(false);
      }, 500);
    }

    if (onScanRef.current) {
      onScanRef.current(clean);
    }
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        try {
          scannerRef.current.clear();
        } catch (e) {
          // ignore clear errors
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
    const container = document.getElementById('barcode-camera-view');
    if (container) {
      container.innerHTML = '';
    }
  };

  const startCamera = async (cameraIdToUse) => {
    if (startingRef.current) return;
    startingRef.current = true;

    setCameraLoading(true);
    setError(null);

    await stopScanner();
    if (!isMountedRef.current) {
      startingRef.current = false;
      return;
    }

    // Check for getUserMedia support
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.endsWith('.localhost');
    if (!window.isSecureContext && !isLocal && !hasMedia) {
      setError('Camera access requires HTTPS or localhost in your browser.');
      setCameraLoading(false);
      startingRef.current = false;
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('barcode-camera-view', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      let availableCameras = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
        if (isMountedRef.current && availableCameras.length > 0) {
          setCameras(availableCameras);
        }
      } catch (e) {
        console.warn('Could not enumerate cameras prior to permission:', e);
      }

      const scanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 180 },
        aspectRatio: 1.333333,
      };

      // Determine initial target
      let cameraTarget = null;
      if (cameraIdToUse) {
        cameraTarget = cameraIdToUse;
      } else if (availableCameras.length > 0) {
        const backCam = availableCameras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        cameraTarget = backCam ? backCam.id : availableCameras[0].id;
      } else {
        cameraTarget = { facingMode: 'environment' };
      }

      const onDecoded = (decodedText) => {
        handleScannedCode(decodedText);
      };

      // Try camera with fallback for PCs / laptops with only user/front camera
      let started = false;
      try {
        await html5QrCode.start(cameraTarget, scanConfig, onDecoded, () => {});
        started = true;
      } catch (err1) {
        console.warn('Primary camera target failed, trying fallback...', cameraTarget, err1);
        
        // If environment mode failed (typical on laptop/desktop webcams), try user facing
        if (!cameraIdToUse) {
          try {
            await html5QrCode.start({ facingMode: 'user' }, scanConfig, onDecoded, () => {});
            started = true;
          } catch (err2) {
            console.warn('Fallback to user camera failed:', err2);
          }
        }

        // If still not started and cameras were found, try the first camera id
        if (!started && availableCameras.length > 0) {
          try {
            await html5QrCode.start(availableCameras[0].id, scanConfig, onDecoded, () => {});
            started = true;
          } catch (err3) {
            console.warn('Fallback to first camera id failed:', err3);
          }
        }

        if (!started) {
          throw err1;
        }
      }

      // Now that camera permission is active, refresh the camera list for the dropdown
      try {
        const refreshedCameras = await Html5Qrcode.getCameras();
        if (isMountedRef.current && refreshedCameras.length > 0) {
          setCameras(refreshedCameras);
          if (typeof cameraTarget === 'string') {
            setCurrentCameraId(cameraTarget);
          } else {
            setCurrentCameraId(refreshedCameras[0].id);
          }
        }
      } catch (e) {
        // ignore enumeration errors
      }

      if (isMountedRef.current) {
        setCameraLoading(false);
      }
    } catch (err) {
      console.error('Camera start failed:', err);
      if (!isMountedRef.current) {
        startingRef.current = false;
        return;
      }
      setCameraLoading(false);
      const errMsg = err?.name || String(err || '');
      if (errMsg.includes('NotAllowedError') || errMsg.includes('PermissionDeniedError') || errMsg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera permissions in your browser address bar.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setError('No camera detected on this device.');
      } else {
        setError('Could not access camera. Please check camera permissions or ensure no other app is using it.');
      }
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hardware / USB / Bluetooth scanner listener while modal is open
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const clean = buffer.trim();
          buffer = '';
          handleScannedCode(clean);
        } else {
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (timeDiff > 70) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScannedCode]);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setCurrentCameraId(newId);
    startCamera(newId);
  };

  const handleClose = async () => {
    await stopScanner();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in duration-150">
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border transition-all ${
        scanFlash ? 'ring-4 ring-green-500 border-green-500' : 'border-gray-100'
      }`}>
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">Barcode Scanner</h3>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="p-3 sm:p-4 bg-white flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
            {/* Camera View Mount */}
            <div id="barcode-camera-view" className="w-full h-full object-cover"></div>

            {cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white z-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mb-2"></div>
                <span className="text-xs font-medium">Starting camera...</span>
              </div>
            )}

            {/* Target Viewfinder Box with Laser Line */}
            {!cameraLoading && !error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`w-3/4 h-1/2 border-2 rounded-xl relative transition-all duration-200 ${
                  scanFlash 
                    ? 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)] bg-green-500/10' 
                    : 'border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                }`}>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5 rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5 rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5 rounded-br-sm"></div>
                  
                  {/* Animated red laser scanline */}
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse relative top-1/2 -translate-y-1/2"></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 text-white p-5 text-center z-20">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-xs text-gray-200 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => startCamera(currentCameraId)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Camera Selection (if device has multiple cameras) */}
          {cameras.length > 1 && !error && (
            <div className="w-full mt-2.5 flex items-center space-x-2">
              <span className="text-[11px] font-medium text-gray-500 shrink-0">Camera:</span>
              <select
                value={currentCameraId}
                onChange={handleCameraChange}
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id || idx} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => startCamera(currentCameraId)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Refresh camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Last Scanned Feedback Banner */}
          {lastScanned && (
            <div className="w-full mt-2.5 p-2 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between text-xs text-green-800 animate-in fade-in duration-200">
              <div className="flex items-center space-x-1.5 truncate">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="font-semibold truncate">Scanned: {lastScanned}</span>
              </div>
              <span className="text-[10px] bg-green-200 text-green-900 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                Added
              </span>
            </div>
          )}
        </div>

        {/* Footer with "Done Scanning" button */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-600">
            {typeof cartCount === 'number' && cartCount > 0 ? (
              <span>Cart items: <strong className="text-blue-600 font-bold">{cartCount}</strong></span>
            ) : (
              <span className="text-[11px] text-gray-500">Scanner active</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Done Scanning
          </button>
        </div>

      </div>
    </div>
  );
};

export default BarcodeScanner;
