import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";

type PullState = "idle" | "pulling" | "ready" | "refreshing" | "done" | "error";

type PullToRefreshProps = {
  children: ReactNode;
  disabled?: boolean;
  onRefresh: () => Promise<void>;
};

const activationDistance = 24;
const triggerDistance = 74;
const refreshHoldDistance = 56;
const maxPullDistance = 112;
const completionHoldMs = 760;

function dampPullDistance(distance: number): number {
  return maxPullDistance * (1 - Math.exp(-distance / maxPullDistance));
}

function isAtScrollTop(): boolean {
  return window.scrollY <= 0 && document.documentElement.scrollTop <= 0 && document.body.scrollTop <= 0;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, a, [role='button'], [data-pull-refresh-ignore='true']"));
}

function getLabel(state: PullState): string {
  if (state === "refreshing") return "Actualizando";
  if (state === "done") return "Actualizado";
  if (state === "error") return "No se pudo actualizar";
  if (state === "ready") return "Solta para actualizar";

  return "Desliza para actualizar";
}

export function PullToRefresh({ children, disabled = false, onRefresh }: PullToRefreshProps) {
  const [state, setState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const trackingRef = useRef(false);
  const activatedRef = useRef(false);
  const activeTouchIdRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const progress = Math.min(pullDistance / triggerDistance, 1);
  const visible = state !== "idle" || pullDistance > 0;
  const label = getLabel(state);
  const displayDistance = state === "refreshing" || state === "done" || state === "error"
    ? refreshHoldDistance
    : pullDistance;

  const contentStyle = useMemo(() => ({
    transform: `translate3d(0, ${displayDistance}px, 0)`
  }), [displayDistance]);

  const indicatorStyle = useMemo(() => {
    const translateY = Math.min(18, displayDistance - 44);
    return {
      opacity: visible ? 1 : 0,
      transform: `translate3d(0, ${translateY}px, 0) scale(${0.92 + progress * 0.08})`
    };
  }, [displayDistance, progress, visible]);

  useEffect(() => {
    function updatePullDistance(nextDistance: number): void {
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    }

    function resetGesture(): void {
      trackingRef.current = false;
      activatedRef.current = false;
      activeTouchIdRef.current = null;
      startYRef.current = 0;
      startXRef.current = 0;
      setIsTracking(false);
      updatePullDistance(0);
      setState((current) => current === "refreshing" ? current : "idle");
    }

    async function finishRefresh(): Promise<void> {
      refreshingRef.current = true;
      setState("refreshing");
      updatePullDistance(refreshHoldDistance);

      try {
        await onRefreshRef.current();
        setState("done");
      } catch {
        setState("error");
      } finally {
        window.setTimeout(() => {
          refreshingRef.current = false;
          updatePullDistance(0);
          setState("idle");
        }, completionHoldMs);
      }
    }

    function handleTouchStart(event: TouchEvent): void {
      if (disabled || refreshingRef.current || event.touches.length !== 1 || !isAtScrollTop() || isInteractiveTarget(event.target)) return;

      const touch = event.touches[0];
      activeTouchIdRef.current = touch.identifier;
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      trackingRef.current = true;
      activatedRef.current = false;
      setIsTracking(true);
    }

    function handleTouchMove(event: TouchEvent): void {
      if (!trackingRef.current || activeTouchIdRef.current === null || disabled || refreshingRef.current) return;

      const touch = Array.from(event.touches).find((item) => item.identifier === activeTouchIdRef.current);
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;
      const deltaX = Math.abs(touch.clientX - startXRef.current);
      if (deltaY <= 0) {
        resetGesture();
        return;
      }

      if (deltaX > deltaY * 1.2) {
        resetGesture();
        return;
      }

      if (!isAtScrollTop()) {
        resetGesture();
        return;
      }

      if (!activatedRef.current && deltaY < activationDistance) return;

      activatedRef.current = true;
      const nextDistance = dampPullDistance(deltaY - activationDistance);
      event.preventDefault();
      updatePullDistance(nextDistance);
      setState(nextDistance >= triggerDistance ? "ready" : "pulling");
    }

    function handleTouchEnd(): void {
      if (!trackingRef.current) return;

      const shouldRefresh = pullDistanceRef.current >= triggerDistance;
      trackingRef.current = false;
      activatedRef.current = false;
      activeTouchIdRef.current = null;
      startYRef.current = 0;
      startXRef.current = 0;
      setIsTracking(false);

      if (shouldRefresh) {
        void finishRefresh();
        return;
      }

      updatePullDistance(0);
      setState("idle");
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", resetGesture, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", resetGesture);
    };
  }, [disabled]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--app-bg)]" data-pull-refresh-root>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[20] flex justify-center pt-[calc(7px+env(safe-area-inset-top))] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={indicatorStyle}
        role="status"
        aria-live="polite"
      >
        <div className="pull-refresh-loader" aria-hidden="true" data-state={state}>
          <span />
          <span />
          <span />
        </div>
        <span className="sr-only">{label}</span>
      </div>
      <div
        className={cn(
          "relative z-[30] min-h-dvh bg-[var(--app-bg)]",
          isTracking ? "will-change-transform" : "transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none"
        )}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
}
