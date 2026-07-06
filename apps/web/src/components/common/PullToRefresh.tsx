import { type ReactNode, useEffect, useRef, useState } from "react";

const pullThreshold = 52;
const maxPullDistance = 76;
const refreshHoldDistance = 36;
const minimumRefreshDurationMs = 420;
const settleDurationMs = 220;

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  label: string;
};

function getDocumentScrollTop(): number {
  return Math.max(
    0,
    window.scrollY,
    document.documentElement.scrollTop,
    document.body.scrollTop
  );
}

function dampPullDistance(distance: number): number {
  return maxPullDistance * (1 - Math.exp(-distance / 95));
}

export function PullToRefresh({
  children,
  onRefresh,
  label
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const indicator = indicatorRef.current;

    if (!root || !content || !indicator) return;

    const contentElement = content;
    const indicatorElement = indicator;
    let disposed = false;
    const gesture = {
      tracking: false,
      startX: 0,
      startY: 0,
      distance: 0
    };

    function clearSettleTimer(): void {
      if (settleTimerRef.current === null) return;

      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    function setVisualOffset(
      distance: number,
      animate: boolean,
      state: "idle" | "pulling" | "armed" | "refreshing"
    ): void {
      const progress = Math.min(distance / pullThreshold, 1);
      contentElement.style.transition = animate
        ? `transform ${settleDurationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`
        : "none";
      contentElement.style.transform = `translate3d(0, ${distance}px, 0)`;
      indicatorElement.style.transition = animate
        ? `opacity 160ms ease-out, transform ${settleDurationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`
        : "none";
      indicatorElement.style.opacity = distance > 0 ? String(Math.max(0.18, progress)) : "0";
      indicatorElement.style.transform = `translate3d(0, ${-16 + progress * 16}px, 0)`;
      indicatorElement.dataset.state = state;
    }

    function settleAtOrigin(): void {
      clearSettleTimer();
      setVisualOffset(0, true, "idle");
      settleTimerRef.current = window.setTimeout(() => {
        contentElement.style.willChange = "";
        indicatorElement.style.willChange = "";
        settleTimerRef.current = null;
      }, settleDurationMs);
    }

    async function refresh(): Promise<void> {
      refreshingRef.current = true;
      setRefreshing(true);
      setVisualOffset(refreshHoldDistance, true, "refreshing");
      const startedAt = performance.now();

      try {
        await onRefreshRef.current();
      } catch {
        // The current content remains visible when a background refresh fails.
      } finally {
        const remainingDelay = Math.max(
          0,
          minimumRefreshDurationMs - (performance.now() - startedAt)
        );

        if (remainingDelay > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, remainingDelay);
          });
        }

        if (!disposed) {
          refreshingRef.current = false;
          setRefreshing(false);
          settleAtOrigin();
        }
      }
    }

    function resetGesture(): void {
      gesture.tracking = false;
      gesture.distance = 0;
    }

    function handleTouchStart(event: TouchEvent): void {
      if (
        refreshingRef.current ||
        event.touches.length !== 1 ||
        getDocumentScrollTop() > 1
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, input, textarea, select, a")
      ) {
        return;
      }

      clearSettleTimer();
      const touch = event.touches[0];
      gesture.tracking = true;
      gesture.startX = touch.clientX;
      gesture.startY = touch.clientY;
      gesture.distance = 0;
      contentElement.style.willChange = "transform";
      indicatorElement.style.willChange = "transform, opacity";
      setVisualOffset(0, false, "idle");
    }

    function handleTouchMove(event: TouchEvent): void {
      if (!gesture.tracking || event.touches.length !== 1) return;

      if (getDocumentScrollTop() > 1) {
        resetGesture();
        settleAtOrigin();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        resetGesture();
        settleAtOrigin();
        return;
      }

      if (deltaY <= 0) {
        gesture.distance = 0;
        setVisualOffset(0, false, "idle");
        return;
      }

      if (deltaY < 6) return;

      event.preventDefault();
      gesture.distance = dampPullDistance(deltaY);
      setVisualOffset(
        gesture.distance,
        false,
        gesture.distance >= pullThreshold ? "armed" : "pulling"
      );
    }

    function handleTouchEnd(): void {
      if (!gesture.tracking) return;

      const shouldRefresh = gesture.distance >= pullThreshold;
      resetGesture();

      if (shouldRefresh) {
        void refresh();
        return;
      }

      settleAtOrigin();
    }

    function handleTouchCancel(): void {
      if (!gesture.tracking) return;

      resetGesture();
      settleAtOrigin();
    }

    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd, { passive: true });
    root.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      disposed = true;
      clearSettleTimer();
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

  return (
    <div ref={rootRef} className="pull-to-refresh">
      <div
        ref={indicatorRef}
        className="pull-to-refresh__indicator"
        data-state="idle"
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span className="sr-only">{refreshing ? label : ""}</span>
      </div>
      <div ref={contentRef} className="pull-to-refresh__content">
        {children}
      </div>
    </div>
  );
}
