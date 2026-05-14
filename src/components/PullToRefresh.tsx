"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120;
const INDICATOR_SIZE = 36;

function isTouchDevice() {
  return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in navigator && Boolean((navigator as { standalone?: unknown }).standalone)) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isAtScrollTop() {
  if (typeof window === "undefined") return false;
  return window.scrollY <= 0 && document.documentElement.scrollTop <= 0 && document.body.scrollTop <= 0;
}

function reloadApp() {
  window.location.reload();
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    setEnabled(isTouchDevice() && isStandaloneMode());
  }, []);

  function resetPull() {
    active.current = false;
    pullDistanceRef.current = 0;
    setPulling(false);
    setPullDistance(0);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!enabled || refreshing || !isAtScrollTop()) return;
    startY.current = e.touches[0].clientY;
    active.current = true;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!enabled || !active.current || refreshing) return;
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY <= 0) {
      resetPull();
      return;
    }

    const dampened = Math.min(deltaY * 0.55, MAX_PULL);
    pullDistanceRef.current = dampened;
    setPulling(true);
    setPullDistance(dampened);
  }

  function handleTouchEnd() {
    if (!enabled || !active.current) return;
    active.current = false;
    if (pullDistanceRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.55);
      setTimeout(reloadApp, 250);
    } else {
      resetPull();
    }
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;
  const opacity = Math.min(progress * 1.5, 1);
  const showIndicator = enabled && (pulling || refreshing);

  return (
    <div
      className="relative min-h-full flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetPull}
      style={{
        transform: showIndicator ? `translateY(${Math.min(pullDistance * 0.35, 32)}px)` : undefined,
        transition: refreshing || !pulling ? "transform 0.18s ease" : "none",
      }}
    >
      {showIndicator && (
        <div
          className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{
            top: "max(10px, env(safe-area-inset-top))",
            opacity,
          }}
        >
          <div
            className="flex items-center justify-center rounded-full bg-white shadow-md"
            style={{
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              transform: `rotate(${rotation}deg)`,
              transition: refreshing ? "transform 0.3s linear" : "none",
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </div>
        </div>
      )}
      {enabled && (
        <button
          type="button"
          onClick={reloadApp}
          aria-label="Refresh Partake"
          className="fixed right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#D97706] shadow-md backdrop-blur"
          style={{ top: "max(12px, env(safe-area-inset-top))" }}
        >
          ↻
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {children}
    </div>
  );
}
