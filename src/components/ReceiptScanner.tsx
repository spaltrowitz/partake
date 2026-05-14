"use client";

import { useRef, useState } from "react";
import { parseReceiptText } from "@/services/receiptParser";
import { recognizeText } from "@/services/ocr";
import type { ParsedReceipt } from "@/types";
import { PrimaryButton, SecondaryButton } from "./UI";
import { ReceiptSkeleton } from "./Skeleton";

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
      const ocr = await recognizeText(file);
      const { lines } = ocr;

      if (lines.length === 0) {
        setError("Couldn't detect any text. Make sure the receipt is in focus and well-lit.");
        return;
      }

      const receipt = parseReceiptText(lines);
      const warnings = [...(receipt.warnings ?? [])];
      if (ocr.warning) warnings.unshift(ocr.warning);

      // Quality checks — give specific feedback instead of bad results
      const issues: string[] = [];

      if (receipt.items.length === 0 && !receipt.subtotal && !receipt.total) {
        setError("Couldn't find any items or totals. Try:\n• Better lighting (avoid shadows)\n• Flatten the receipt\n• Get closer to the text");
        return;
      }

      if (receipt.items.length === 0 && (receipt.subtotal || receipt.total)) {
        issues.push("Found totals but no items — the item text may be hard to read");
      }

      if (receipt.items.some(i => i.confidence < 0.7)) {
        issues.push("Some items may be misread — tap to edit any that look wrong");
      }

      const itemSum = receipt.items.reduce((s, i) => s + i.price * i.quantity, 0);
      if (receipt.subtotal && Math.abs(itemSum - receipt.subtotal) > 2) {
        issues.push("Item prices don't add up to the subtotal — some may be missing or misread");
      }

      warnings.push(...issues);

      const scannedReceipt = {
        ...receipt,
        ocrEngine: ocr.engine,
        warnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
      } satisfies ParsedReceipt;

      if (issues.length > 0) {
        setProgress("");
        // Still show the results but with a warning
        onReceipt(scannedReceipt);
        return;
      }

      onReceipt(scannedReceipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again or type it in manually.");
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
      ocrEngine: "manual",
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {isScanning ? (
        <div className="flex flex-col items-center gap-4 w-full">
          <ReceiptSkeleton />
          <p className="text-[#8A7353] text-sm">{progress || "Reading your receipt..."}</p>
        </div>
      ) : (
        <>
          <span className="text-6xl">📸</span>
          <h2 className="text-xl font-semibold text-center">
            Snap a pic or pick from your photos
          </h2>
          <p className="text-[#8A7353] text-center">
            We&apos;ll read the items and prices for you
          </p>

          <div className="w-full max-w-xs rounded-2xl border border-[#FDE68A] bg-white/80 p-4 text-left text-sm text-[#8A7353]">
            <p className="mb-2 font-semibold text-[#5F4B32]">For the best scan:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Flatten the receipt and include all four corners</li>
              <li>Avoid shadows, glare, and folded totals</li>
              <li>Retake if the item prices look blurry</li>
            </ul>
          </div>

          {error && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl text-left w-full whitespace-pre-line">
                {error}
              </div>
              <SecondaryButton onClick={handleManualEntry}>
                Type it in instead
              </SecondaryButton>
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-3">
            {/* Camera capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              capture="environment"
              multiple={false}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <PrimaryButton onClick={() => cameraInputRef.current?.click()}>
              Take a photo
            </PrimaryButton>

            {/* Gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple={false}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>
              Pick from gallery
            </SecondaryButton>

            <button
              onClick={handleManualEntry}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-[#8A7353] hover:text-[#D97706] transition-colors"
            >
              Or just type it in
            </button>
          </div>
        </>
      )}
    </div>
  );
}
