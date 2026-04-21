"use client";

import { useRef, useState } from "react";
import { parseReceiptText } from "@/services/receiptParser";
import type { ParsedReceipt, ParsedItem } from "@/types";
import { PrimaryButton, SecondaryButton } from "./UI";

export function ReceiptScanner({
  onReceipt,
}: {
  onReceipt: (receipt: ParsedReceipt) => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setIsScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.lines && data.lines.length > 0) {
        const receipt = parseReceiptText(data.lines);
        onReceipt(receipt);
      } else {
        setError(
          data.message ||
            "Couldn't read that one. Try a clearer pic or just type it in."
        );
      }
    } catch {
      setError("Something went wrong. Try again or type it in manually.");
    } finally {
      setIsScanning(false);
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6B6B]" />
          <p className="text-gray-500">Reading your receipt...</p>
        </div>
      ) : (
        <>
          <span className="text-6xl">📸</span>
          <h2 className="text-xl font-semibold text-center">
            Snap a pic or pick from your photos
          </h2>
          <p className="text-gray-500 text-center">
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
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Or just type it in
            </button>
          </div>
        </>
      )}
    </div>
  );
}
