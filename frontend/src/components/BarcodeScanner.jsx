import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [inputMode, setInputMode] = useState('camera'); // 'camera' or 'manual'

  const scannerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);
  const manualInputRef = useRef(null);

  // Stable callback for handling successful scan
  const handleScanSuccess = useCallback((decodedText) => {
    if (!isMountedRef.current || isStoppingRef.current) return;
    isStoppingRef.current = true;

    const cleanText = String(decodedText || '').trim();
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
          if (isMountedRef.current && onScan) {
            onScan(cleanText);
          }
        })
        .catch(() => {
          if (isMountedRef.current && onScan) {
            onScan(cleanText);
          }
        });
    } else {
      if (onScan) onScan(cleanText);
    }
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const startScanner = useCallback(async (cameraIdToUse) => {
    setCameraLoading(true);
    setError(null);

    // Ensure any previous scanner instance is stopped
    await stopScanner();

    if (!isMountedRef.current) return;

    // Check secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Camera access is restricted to secure contexts (HTTPS or localhost). Please enter the barcode manually below.');
      setCameraLoading(false);
      setInputMode('manual');
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader-view', {
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

      // Query available cameras
      let availableCameras = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
        if (isMountedRef.current) {
          setCameras(availableCameras);
        }
      } catch (e) {
        console.warn('Could not enumerate cameras:', e);
      }

      const scanConfig = {
        fps: 12,
        qrbox: { width: 260, height: 180 },
        aspectRatio: 1.333333,
      };

      // Determine camera target
      let cameraTarget = { facingMode: 'environment' };
      if (cameraIdToUse) {
        cameraTarget = cameraIdToUse;
      } else if (availableCameras.length > 0) {
        // Prefer rear camera or last camera
        const backCam = availableCameras.find((c) =>
          c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
        );
        cameraTarget = backCam ? backCam.id : availableCameras[0].id;
        if (isMountedRef.current) {
          setSelectedCameraId(typeof cameraTarget === 'string' ? cameraTarget : availableCameras[0].id);
        }
      }

      await html5QrCode.start(
        cameraTarget,
        scanConfig,
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // ignore frame scan errors
        }
      );

      if (isMountedRef.current) {
        setCameraLoading(false);
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      if (!isMountedRef.current) return;

      setCameraLoading(false);
      const errMsg = err?.name || String(err || '');
      if (errMsg.includes('NotAllowedError') || errMsg.includes('PermissionDeniedError') || errMsg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera permissions in your browser or enter barcode manually.');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setError('No camera detected on this device. You can enter the barcode manually below.');
      } else {
        setError('Could not access camera. Make sure no other app is using it, or enter barcode manually.');
      }
    }
  }, [handleScanSuccess, stopScanner]);

  useEffect(() => {
    isMountedRef.current = true;
    isStoppingRef.current = false;

    if (inputMode === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 150);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [inputMode, startScanner, stopScanner]);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualBarcode.trim();
    if (trimmed && onScan) {
      onScan(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              {inputMode === 'camera' ? <Camera className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">Barcode Scanner</h3>
              <p className="text-[11px] text-gray-500">Scan product or enter barcode</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopScanner();
              if (onClose) onClose();
            }} 
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="px-4 pt-3 pb-1 bg-white flex space-x-2">
          <button
            type="button"
            onClick={() => setInputMode('camera')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              inputMode === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Use Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('manual')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              inputMode === 'manual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Manual / USB Input</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 bg-white flex flex-col items-center">
          {inputMode === 'camera' ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                {/* HTML5 QR Code Mount Target */}
                <div id="barcode-reader-view" className="w-full h-full object-cover"></div>

                {cameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white z-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent mb-2"></div>
                    <span className="text-xs font-medium">Starting camera...</span>
                  </div>
                )}

                {/* Laser animation and target frame when camera is running */}
                {!cameraLoading && !error && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-3/4 h-1/2 border-2 border-blue-400/80 rounded-xl relative shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5 rounded-tl-sm"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5 rounded-tr-sm"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5 rounded-bl-sm"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5 rounded-br-sm"></div>
                      {/* Scanning red laser line */}
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse relative top-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 text-white p-5 text-center z-20">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <p className="text-xs text-gray-200 mb-4">{error}</p>
                    <button
                      type="button"
                      onClick={() => setInputMode('manual')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      Enter Barcode Manually
                    </button>
                  </div>
                )}
              </div>

              {/* Camera selection dropdown if multiple cameras exist */}
              {cameras.length > 1 && !error && (
                <div className="w-full mt-3 flex items-center space-x-2">
                  <span className="text-[11px] font-medium text-gray-500 shrink-0">Camera:</span>
                  <select
                    value={selectedCameraId}
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
                    onClick={() => startScanner(selectedCameraId)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Restart camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full py-4">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Barcode / ID Number
                  </label>
                  <div className="relative">
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Type or scan with USB scanner..."
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    You can type the barcode number or scan directly with a USB handheld scanner.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setManualBarcode('')}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={!manualBarcode.trim()}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                      manualBarcode.trim()
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Find & Add Product
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500 shrink-0">
          <span>Align barcode inside the target box</span>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              if (onClose) onClose();
            }}
            className="text-gray-500 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default BarcodeScanner;
