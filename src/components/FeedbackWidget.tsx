"use client";

import { useState } from "react";
import { TopBarButton } from "./UI";

type Category = "bug" | "idea" | "love";

const categories: { key: Category; emoji: string; label: string; placeholder: string }[] = [
  { key: "bug", emoji: "🐛", label: "Bug", placeholder: "What went wrong?" },
  { key: "idea", emoji: "💡", label: "Idea", placeholder: "What would make Partake better?" },
  { key: "love", emoji: "💜", label: "Love it", placeholder: "What do you love about Partake?" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.key === category);

  function reset() {
    setCategory(null);
    setDetails("");
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  }

  async function handleSubmit() {
    if (!category || !details.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details: details.trim() }),
      });
      if (!response.ok) {
        throw new Error("Feedback request failed");
      }
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 2000);
    } catch {
      setSubmitting(false);
      setError("Couldn't send feedback. Please try again.");
    }
  }

  return (
    <>
      <TopBarButton
        onClick={() => setOpen(true)}
        className="whitespace-nowrap"
        aria-label="Send feedback"
      >
        💬 Feedback
      </TopBarButton>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div className="bg-[#FBF8F4] w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2D2319]">Send Feedback</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="text-[#9C8E80] hover:text-[#2D2319] text-xl p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <p className="text-center py-8 text-lg">Thanks! We&apos;ll look into it 🙏</p>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border
                        ${
                          category === c.key
                            ? "gradient-bg text-white border-transparent"
                            : "bg-white border-[#F5EDE3] text-[#2D2319] hover:border-[#E8613C]"
                        }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={selectedCategory?.placeholder ?? "Tell us what happened or what you want to see."}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-[#F5EDE3] bg-white
                    text-[#2D2319] placeholder:text-[#9C8E80] focus:outline-none focus:border-[#E8613C] mb-4 resize-none"
                />

                {error && (
                  <p className="text-sm text-[#E8613C] mb-3">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!category || !details.trim() || submitting}
                  className="w-full py-3 px-6 rounded-full text-white font-semibold gradient-bg
                    hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
