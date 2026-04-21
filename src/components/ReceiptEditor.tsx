"use client";

import { useState } from "react";
import type { ParsedReceipt, ParsedItem } from "@/types";

export function ReceiptEditor({
  receipt,
  onChange,
}: {
  receipt: ParsedReceipt;
  onChange: (receipt: ParsedReceipt) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  function addItem() {
    if (!newName || !newPrice) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    const item: ParsedItem = {
      id: crypto.randomUUID(),
      name: newName,
      price,
      confidence: 1.0,
      quantity: 1,
    };

    onChange({ ...receipt, items: [...receipt.items, item] });
    setNewName("");
    setNewPrice("");
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

  return (
    <div className="flex flex-col gap-4">
      {receipt.restaurantName && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span>📍</span>
          <span>{receipt.restaurantName}</span>
        </div>
      )}

      {/* Items */}
      <div>
        <h3 className="text-sm font-semibold text-[#8B9BB4] mb-2">Items</h3>
        <div className="flex flex-col gap-1">
          {receipt.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                item.confidence < 0.7
                  ? "bg-orange-50 dark:bg-orange-950/30"
                  : "bg-[#1C2A4A]"
              }`}
            >
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                {item.confidence < 0.7 && (
                  <p className="text-xs text-orange-500">
                    Might not be right — double check
                  </p>
                )}
              </div>
              <span className="font-bold ml-4">
                ${item.price.toFixed(2)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-3 text-[#8B9BB4] hover:text-[#FF8A80] transition-colors"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add item row */}
          <div className="flex items-center gap-2 p-2">
            <input
              type="text"
              placeholder="Item name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-[#1C2A4A] bg-transparent text-sm"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg border border-[#1C2A4A] bg-transparent text-sm text-right"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button
              onClick={addItem}
              disabled={!newName || !newPrice}
              className="text-[#FF8A80] text-xl disabled:opacity-30"
            >
              ⊕
            </button>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div>
        <h3 className="text-sm font-semibold text-[#8B9BB4] mb-2">
          Tax & Total
        </h3>
        <div className="flex items-center justify-between p-3 bg-[#1C2A4A] rounded-lg">
          <span>Tax</span>
          <div className="flex items-center gap-1">
            <span>$</span>
            <input
              type="number"
              step="0.01"
              value={receipt.tax?.toFixed(2) ?? ""}
              onChange={(e) => updateTax(e.target.value)}
              placeholder="0.00"
              className="w-20 text-right bg-transparent font-bold"
            />
          </div>
        </div>
        {receipt.subtotal !== undefined && (
          <div className="flex items-center justify-between p-3">
            <span>Subtotal</span>
            <span className="font-bold">${receipt.subtotal.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
