"use client";

import { useRef, useState } from "react";
import { parseReceiptText } from "@/services/receiptParser";
import { recognizeText } from "@/services/ocr";
import type { ParsedReceipt } from "@/types";
import { PrimaryButton, SecondaryButton } from "./UI";

export function ReceiptScanner({
  onReceipt,
}: {
  onReceipt: (receipt: ParsedReceipt) => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setIsScanning(true);
    setError(null);
    setProgress("Reading your receipt...");

    try {
      const lines = await recognizeText(file);

      if (lines.length > 0) {
        const receipt = parseReceiptText(lines);
        onReceipt(receipt);
      } else {
        setError(
          "Couldn't read that one. Try a clearer pic or just type it in — no judgment."
        );
      }
    } catch {
      setError("Something went wrong. Try again or type it in manually.");
    } finally {
      setIsScanning(false);
      setProgress("");
    }
  }

  function handleManualEntry() {
    onReceipt({
      items: [],
      tax: undefined,
      subtotal: undefined,
      total: undefined,
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {isScanning ? (
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8A80]" />
          <p className="text-[#8B9BB4]">Reading your receipt...</p>
        </div>
      ) : (
        <>
          <span className="text-6xl">📸</span>
          <h2 className="text-xl font-semibold text-center">
            Snap a pic or pick from your photos
          </h2>
          <p className="text-[#8B9BB4] text-center">
            We&apos;ll read the items and prices for you
          </p>

          {error && (
            <p className="text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg text-center">
              {error}
            </p>
          )}

          <div className="w-full max-w-xs flex flex-col gap-3">
            {/* Camera capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <PrimaryButton onClick={() => cameraInputRef.current?.click()}>
              Take a photo
            </PrimaryButton>

            {/* Gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>
              Pick from gallery
            </SecondaryButton>

            <button
              onClick={handleManualEntry}
              className="text-sm text-[#8B9BB4] hover:text-[#8B9BB4] transition-colors"
            >
              Or just type it in
            </button>
          </div>
        </>
      )}
    </div>
  );
}
