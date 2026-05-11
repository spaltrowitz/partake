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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
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
    if (editingId === id) setEditingId(null);
  }

  function startEdit(item: ParsedItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice((item.price * item.quantity).toFixed(2));
    setEditQty(item.quantity.toString());
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    const totalPrice = parseFloat(editPrice);
    const qty = Math.max(1, parseInt(editQty) || 1);
    if (isNaN(totalPrice) || totalPrice < 0) return;
    const unitPrice = qty > 1 ? Math.round((totalPrice / qty) * 100) / 100 : totalPrice;
    onChange({
      ...receipt,
      items: receipt.items.map((i) =>
        i.id === editingId ? { ...i, name: editName.trim(), price: unitPrice, quantity: qty } : i
      ),
    });
    setEditingId(null);
  }

  function splitIntoIndividual(item: ParsedItem) {
    if (item.quantity <= 1) return;
    const newItems = Array.from({ length: item.quantity }, (_, idx) => ({
      id: idx === 0 ? item.id : crypto.randomUUID(),
      name: item.name,
      price: item.price,
      confidence: item.confidence,
      quantity: 1,
    }));
    const index = receipt.items.findIndex((i) => i.id === item.id);
    const updated = [...receipt.items];
    updated.splice(index, 1, ...newItems);
    onChange({ ...receipt, items: updated });
    setEditingId(null);
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
          <p className="text-[#64748B] text-sm">
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
          editingId === item.id ? (
            <div key={item.id} className="flex flex-col gap-2 p-3 rounded-xl bg-[#CCFBF1] border-2 border-[#0F766E]">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Item name"
                className="px-3 py-2 rounded-lg bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-[#0F766E]"
                autoFocus
              />
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#64748B]">Qty</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    aria-label="Item quantity"
                    className="min-h-11 min-w-12 rounded-lg bg-white px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#64748B]">Total $</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    aria-label="Item total price"
                    className="min-h-11 min-w-24 rounded-lg bg-white px-3 py-2 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={saveEdit} className="min-h-11 flex-1 rounded-lg text-white text-sm font-medium gradient-bg">
                  Save
                </button>
                {item.quantity > 1 && (
                  <button
                    onClick={() => splitIntoIndividual(item)}
                    className="min-h-11 flex-1 rounded-lg border border-[#0F766E] px-3 text-sm font-medium text-[#0F766E]"
                  >
                    Split into {item.quantity} items
                  </button>
                )}
                <button onClick={() => setEditingId(null)} className="min-h-11 rounded-lg px-3 text-sm text-[#64748B]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              onClick={() => startEdit(item)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#0F766E] transition-all ${
                item.confidence < 0.7 ? "bg-[#ECFDF5] border border-amber-700" : "bg-[#CCFBF1]"
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-[#64748B] w-5">{index + 1}</span>
                 <span className="font-medium">
                  {item.name}{item.quantity > 1 && <span className="text-[#64748B]"> ({item.quantity}×)</span>}
                </span>
              </div>
              <span className="font-bold text-[#14B8A6] ml-3">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                 className="ml-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm text-[#64748B] transition-colors hover:bg-white/60 hover:text-[#0F766E]"
              >
                ✕
              </button>
            </div>
          )
        ))}

        {/* Add item input */}
        <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#CCFBF1] focus-within:border-[#0F766E] transition-colors">
          <span className="text-xs text-[#0F766E]">+</span>
          <input
            ref={nameInputRef}
            type="text"
            placeholder={receipt.items.length === 0 ? "e.g. Margherita Pizza" : "Add missing item"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            aria-label="New item name"
            className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#0F766E]"
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
          <span className="text-[#64748B] text-sm">$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            aria-label="New item price"
            className="min-h-11 min-w-24 bg-transparent text-right text-sm font-bold outline-none placeholder:text-[#94A3B8] placeholder:font-normal focus:ring-2 focus:ring-[#0F766E]"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <button
            onClick={addItem}
            disabled={!newName.trim() || !newPrice}
            className="min-h-11 rounded-full px-3 text-sm font-bold text-[#0F766E] transition-opacity disabled:opacity-20"
          >
            Add
          </button>
        </div>

        {receipt.items.length === 0 && (
          <p className="text-xs text-[#64748B] text-center mt-1">
            Type a name and price, then hit Enter or +
          </p>
        )}
      </div>

      {/* Running subtotal + tax */}
      {receipt.items.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-[#CCFBF1]">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-[#64748B]">Subtotal ({receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""})</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#CCFBF1] rounded-xl">
            <span className="text-sm">Tax</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#64748B]">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={receipt.tax != null ? receipt.tax.toFixed(2) : ""}
                onChange={(e) => updateTax(e.target.value)}
                placeholder="0.00"
                aria-label="Tax amount"
                className="min-h-11 min-w-24 rounded-lg bg-white px-2 text-right text-sm font-bold outline-none placeholder:text-[#94A3B8] placeholder:font-normal focus:ring-2 focus:ring-[#0F766E]"
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
              className="flex min-h-11 items-center justify-between rounded-lg p-2 text-xs text-[#64748B] transition-colors hover:bg-[#CCFBF1]"
            >
              <span>💡 Use {suggestedRate.rate}% ({suggestedRate.jurisdiction})?</span>
              <span className="text-[#0F766E] font-semibold ml-2">
                +${(Math.round(subtotal * suggestedRate.rate) / 100).toFixed(2)}
              </span>
            </button>
          )}

          {/* Tip */}
          <div className="flex items-center justify-between p-3 bg-[#CCFBF1] rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm">Tip</span>
              <span className="text-xs text-[#64748B]">Adjust on split screen if needed</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#64748B]">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={receipt.tip != null ? receipt.tip.toFixed(2) : ""}
                onChange={(e) => updateTip(e.target.value)}
                placeholder="0.00"
                aria-label="Tip amount"
                className="min-h-11 min-w-24 rounded-lg bg-white px-2 text-right text-sm font-bold outline-none placeholder:text-[#94A3B8] placeholder:font-normal focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between p-3 bg-[#CCFBF1] rounded-xl">
            <div className="flex flex-col">
              <span className="text-sm">Discount</span>
              <span className="text-xs text-[#64748B]">Birthday, coupon, comp, etc.</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-[#64748B]">−$</span>
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
                aria-label="Discount amount"
                className="min-h-11 min-w-24 rounded-lg bg-white px-2 text-right text-sm font-bold outline-none placeholder:text-[#94A3B8] placeholder:font-normal focus:ring-2 focus:ring-[#0F766E]"
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
