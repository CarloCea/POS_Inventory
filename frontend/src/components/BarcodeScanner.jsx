import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    // Need a delay to ensure the DOM element is rendered before initializing scanner
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 200, height: 200 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear();
            onScan(decodedText);
          },
          (errorMessage) => {
            // We can ignore scanning errors as it fires constantly while searching
          }
        );

        return () => {
          scanner.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
          });
        };
      } catch (err) {
        console.error(err);
        setError("Could not start camera. Please make sure you have given camera permissions.");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <style>
        {`
          #reader { border: none !important; width: 100% !important; max-width: 100% !important; }
          #reader video { max-width: 100% !important; height: auto !important; border-radius: 8px; }
          #reader img { display: none !important; }
          #reader__dashboard_section_csr span { color: white !important; margin-bottom: 10px; display: block; text-align: center; }
          #reader__dashboard_section_csr select { padding: 6px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #ccc; max-width: 100%; width: 100%; box-sizing: border-box; }
          #reader button { 
            background-color: #7c3aed !important; 
            color: white !important; 
            border: none !important; 
            border-radius: 6px !important; 
            padding: 8px 16px !important; 
            cursor: pointer !important; 
            font-weight: 600 !important;
            margin: 5px;
            max-width: 100%;
          }
          #reader a { display: none !important; }
        `}
      </style>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col relative">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">Scan Barcode</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 bg-gray-900 min-h-[300px] flex flex-col items-center justify-center">
          {error ? (
            <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</div>
          ) : (
            <div id="reader" className="w-full bg-black rounded-lg overflow-hidden"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
