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

  function updateTip(value: string) {
    const tip = parseFloat(value);
    onChange({ ...receipt, tip: isNaN(tip) ? undefined : tip });
  }

  const subtotal = receipt.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      {isManualEntry ? (
        <div className="text-center">
          <p className="text-[#9C8E80] text-sm">
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
              item.confidence < 0.7 ? "bg-[#FFF3E0] border border-orange-800" : "bg-[#F5EDE3]"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs text-[#9C8E80] w-5">{index + 1}</span>
              <span className="font-medium">
                {item.quantity > 1 && <span className="text-[#9C8E80]">{item.quantity}× </span>}
                {item.name}
              </span>
            </div>
            <span className="font-bold text-[#F4A261] ml-3">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="ml-3 text-[#9C8E80] hover:text-[#E8613C] transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add item input */}
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#F5EDE3] focus-within:border-[#E8613C] transition-colors">
          <span className="text-xs text-[#E8613C]">+</span>
          <input
            ref={nameInputRef}
            type="text"
            placeholder={receipt.items.length === 0 ? "e.g. Margherita Pizza" : "Add missing item"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C4B5A6]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (newName && newPrice) {
                  addItem();
                } else if (newName && !newPrice) {
                  const priceInput = e.currentTarget.parentElement?.querySelector('input[type="text"][inputmode="decimal"]') as HTMLInputElement;
                  priceInput?.focus();
                }
              }
            }}
          />
          <span className="text-[#9C8E80] text-sm">$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-16 bg-transparent text-sm text-right outline-none font-bold placeholder:text-[#C4B5A6] placeholder:font-normal"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button
            onClick={addItem}
            disabled={!newName.trim() || !newPrice}
            className="text-[#E8613C] font-bold text-sm disabled:opacity-20 transition-opacity px-2 py-1"
          >
            Add
          </button>
        </div>

        {receipt.items.length === 0 && (
          <p className="text-xs text-[#9C8E80] text-center mt-1">
            Type a name and price, then hit Enter or +
          </p>
        )}
      </div>

      {/* Running subtotal + tax */}
      {receipt.items.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-[#F5EDE3]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-[#9C8E80]">Subtotal ({receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""})</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#F5EDE3] rounded-xl">
            <span className="text-sm">Tax</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#9C8E80]">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={receipt.tax != null ? receipt.tax.toFixed(2) : ""}
                onChange={(e) => updateTax(e.target.value)}
                placeholder="0.00"
                className="w-16 text-right bg-transparent font-bold text-sm outline-none placeholder:text-[#C4B5A6] placeholder:font-normal"
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
              className="flex items-center justify-between p-2 rounded-lg text-xs text-[#9C8E80] hover:bg-[#F5EDE3] transition-colors"
            >
              <span>💡 Use {suggestedRate.rate}% ({suggestedRate.jurisdiction})?</span>
              <span className="text-[#E8613C] font-semibold ml-2">
                +${(Math.round(subtotal * suggestedRate.rate) / 100).toFixed(2)}
              </span>
            </button>
          )}

          {/* Tip */}
          <div className="flex items-center justify-between p-3 bg-[#F5EDE3] rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm">Tip</span>
              <span className="text-xs text-[#9C8E80]">Adjust on split screen if needed</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#9C8E80]">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={receipt.tip != null ? receipt.tip.toFixed(2) : ""}
                onChange={(e) => updateTip(e.target.value)}
                placeholder="0.00"
                className="w-16 text-right bg-transparent font-bold text-sm outline-none placeholder:text-[#C4B5A6] placeholder:font-normal"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between p-3 bg-[#F5EDE3] rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm">Discount</span>
              <span className="text-xs text-[#9C8E80]">Birthday, coupon, comp, etc.</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#9C8E80]">−$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={receipt.discount != null ? receipt.discount.toFixed(2) : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({ ...receipt, discount: isNaN(val) || val <= 0 ? undefined : val });
                }}
                placeholder="0.00"
                className="w-16 text-right bg-transparent font-bold text-sm outline-none placeholder:text-[#C4B5A6] placeholder:font-normal"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pt-1">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold gradient-text">
              ${(subtotal - (receipt.discount ?? 0) + (receipt.tax ?? 0) + (receipt.tip ?? 0)).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
