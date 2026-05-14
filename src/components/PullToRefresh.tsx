"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120;
const INDICATOR_SIZE = 36;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    // Only enable in standalone (PWA) mode
    const isStandalone =
      ("standalone" in navigator && (navigator as Record<string, unknown>).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (!isStandalone) return;

    let active = false;

    function onTouchStart(e: TouchEvent) {
      if (!isAtTop()) return;
      startY.current = e.touches[0].clientY;
      active = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active || refreshing) return;
      const deltaY = e.touches[0].clientY - startY.current;
      if (deltaY <= 0) {
        setPulling(false);
        setPullDistance(0);
        return;
      }
      // Dampen the pull with a decay curve
      const dampened = Math.min(deltaY * 0.5, MAX_PULL);
      setPulling(true);
      setPullDistance(dampened);

      if (dampened > 10) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (!active) return;
      active = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD * 0.5);
        // Reload page
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        setPulling(false);
        setPullDistance(0);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isAtTop, pullDistance, refreshing]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;
  const opacity = Math.min(progress * 1.5, 1);
  const showIndicator = pulling || refreshing;

  return (
    <div ref={containerRef} className="relative min-h-full flex flex-col">
      {showIndicator && (
        <div
          className="flex justify-center pointer-events-none"
          style={{
            height: pullDistance,
            transition: refreshing ? "height 0.2s ease" : "none",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-center rounded-full bg-white shadow-md"
            style={{
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              marginTop: Math.max(0, pullDistance - INDICATOR_SIZE - 8),
              opacity,
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {children}
    </div>
  );
}
