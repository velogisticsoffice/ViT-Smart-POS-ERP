import { useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

export default function BarcodeScanner({ onScan }) {
  const [data, setData] = useState("No barcode detected");

  return (
    <div className="bg-[#0b2f57] p-6 rounded-3xl border border-blue-800 shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Real-time Barcode Camera</h2>

      {/* Scanner */}
      <div className="overflow-hidden rounded-2xl border border-blue-900 mx-auto max-w-sm">
        <BarcodeScannerComponent
          width={380}
          height={280}
          onUpdate={(err, result) => {
            if (result) {
              setData(result.text);
              if (onScan) onScan(result.text);
            }
          }}
        />
      </div>

      {/* Result */}
      <div className="mt-4 bg-[#031B34] p-4 rounded-xl text-center">
        <h3 className="text-sm font-bold text-gray-400 mb-1">Scanned Value</h3>
        <p className="text-lg font-mono font-bold text-green-400">{data}</p>
      </div>
    </div>
  );
}