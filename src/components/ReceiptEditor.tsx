"use client";

import { useState, useRef, useEffect } from "react";
import type { ParsedReceipt, ParsedItem } from "@/types";
import { suggestTaxRate } from "@/services/taxRate";

export function ReceiptEditor({
  receipt,
  onChange,
}: {
  receipt: ParsedReceipt;
  onChange: (receipt: ParsedReceipt) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [suggestedRate, setSuggestedRate] = useState<{ rate: number; jurisdiction: string } | null>(null);
  const [taxRateLoaded, setTaxRateLoaded] = useState(false);
  const isManualEntry = receipt.items.length === 0 && !receipt.restaurantName;

  // Auto-focus the first input on manual entry
  useEffect(() => {
    if (isManualEntry && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isManualEntry]);

  // Auto-suggest tax rate for manual entry (no receipt = no tax line)
  useEffect(() => {
    if (isManualEntry && !taxRateLoaded) {
      suggestTaxRate().then((result) => {
        if (result) setSuggestedRate(result);
        setTaxRateLoaded(true);
      });
    }
  }, [isManualEntry, taxRateLoaded]);

  function addItem() {
    if (!newName.trim() || !newPrice) return;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    const item: ParsedItem = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      price,
      confidence: 1.0,
      quantity: 1,
    };

    onChange({ ...receipt, items: [...receipt.items, item] });
    setNewName("");
    setNewPrice("");
    // Refocus name input for quick consecutive adds
    nameInputRef.current?.focus();
  }

  function removeItem(id: string) {
    onChange({
      ...receipt,
      items: receipt.items.filter((i) => i.id !== id),
    });
  }

  function updateTax(value: string) {
    const tax = parseFloat(value);
    onChange({ ...receipt, tax: isNaN(tax) ? undefined : tax });
  }

  const subtotal = receipt.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      {isManualEntry ? (
        <div className="text-center">
          <p className="text-[#8B9BB4] text-sm">
            Add each item from the receipt
          </p>
        </div>
      ) : (
        receipt.restaurantName && (
          <div className="text-center">
            <p className="text-lg font-semibold">{receipt.restaurantName}</p>
          </div>
        )
      )}

      {/* Item list */}
      <div className="flex flex-col gap-2">
        {receipt.items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-xl ${
              item.confidence < 0.7 ? "bg-[#2A1A0B] border border-orange-800" : "bg-[#1C2A4A]"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs text-[#8B9BB4] w-5">{index + 1}</span>
              <span className="font-medium">{item.name}</span>
            </div>
            <span className="font-bold text-[#FFAB91] ml-3">
              ${item.price.toFixed(2)}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="ml-3 text-[#8B9BB4] hover:text-[#FF8A80] transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add item input — always visible, looks like the next row */}
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#1C2A4A] focus-within:border-[#FF8A80] transition-colors">
          <span className="text-xs text-[#8B9BB4] w-5">{receipt.items.length + 1}</span>
          <input
            ref={nameInputRef}
            type="text"
            placeholder={receipt.items.length === 0 ? "e.g. Margherita Pizza" : "Next item"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#4A5568]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (newName && newPrice) {
                  addItem();
                } else if (newName && !newPrice) {
                  // Tab to price field
                  const priceInput = e.currentTarget.parentElement?.querySelector('input[type="number"]') as HTMLInputElement;
                  priceInput?.focus();
                }
              }
            }}
          />
          <span className="text-[#8B9BB4] text-sm">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-16 bg-transparent text-sm text-right outline-none font-bold placeholder:text-[#4A5568] placeholder:font-normal"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button
            onClick={addItem}
            disabled={!newName.trim() || !newPrice}
            className="text-[#FF8A80] font-bold text-lg disabled:opacity-20 transition-opacity"
          >
            +
          </button>
        </div>

        {receipt.items.length === 0 && (
          <p className="text-xs text-[#8B9BB4] text-center mt-1">
            Type a name and price, then hit Enter or +
          </p>
        )}
      </div>

      {/* Running subtotal + tax */}
      {receipt.items.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-[#1C2A4A]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-[#8B9BB4]">Subtotal ({receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""})</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#1C2A4A] rounded-xl">
            <span className="text-sm">Tax</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#8B9BB4]">$</span>
              <input
                type="number"
                step="0.01"
                value={receipt.tax ?? ""}
                onChange={(e) => updateTax(e.target.value)}
                placeholder="0.00"
                className="w-16 text-right bg-transparent font-bold text-sm outline-none placeholder:text-[#4A5568] placeholder:font-normal"
              />
            </div>
          </div>

          {/* Tax rate suggestion */}
          {suggestedRate && receipt.tax === undefined && (
            <button
              onClick={() => {
                const taxAmount = Math.round(subtotal * suggestedRate.rate) / 100;
                onChange({ ...receipt, tax: Math.round(taxAmount * 100) / 100 });
              }}
              className="flex items-center justify-between p-2 rounded-lg text-xs text-[#8B9BB4] hover:bg-[#1C2A4A] transition-colors"
            >
              <span>💡 Use {suggestedRate.rate}% ({suggestedRate.jurisdiction})?</span>
              <span className="text-[#FF8A80] font-semibold ml-2">
                +${(Math.round(subtotal * suggestedRate.rate) / 100).toFixed(2)}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between px-1 pt-1">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold gradient-text">
              ${(subtotal + (receipt.tax ?? 0)).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
