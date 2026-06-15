import { ArrowClockwise, Check, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";

type PullState = "idle" | "pulling" | "ready" | "refreshing" | "done" | "error";

type PullToRefreshProps = {
  disabled?: boolean;
  onRefresh: () => Promise<void>;
};

const triggerDistance = 76;
const maxPullDistance = 124;
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

function getIcon(state: PullState) {
  if (state === "done") return <Check className="size-[19px]" weight="bold" aria-hidden="true" />;
  if (state === "error") return <WarningCircle className="size-[20px]" weight="fill" aria-hidden="true" />;

  return <ArrowClockwise className={cn("size-[19px]", state === "refreshing" && "animate-spin")} weight="bold" aria-hidden="true" />;
}

export function PullToRefresh({ disabled = false, onRefresh }: PullToRefreshProps) {
  const [state, setState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
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
  const indicatorStyle = useMemo(() => {
    const translateY = state === "refreshing" || state === "done" || state === "error"
      ? 12
      : Math.max(-64, pullDistance - 74);

    return {
      opacity: visible ? 1 : 0,
      transform: `translate3d(-50%, ${translateY}px, 0) scale(${0.88 + progress * 0.12})`
    };
  }, [progress, pullDistance, state, visible]);

  useEffect(() => {
    function updatePullDistance(nextDistance: number): void {
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    }

    function resetGesture(): void {
      trackingRef.current = false;
      activeTouchIdRef.current = null;
      startYRef.current = 0;
      updatePullDistance(0);
      setState((current) => current === "refreshing" ? current : "idle");
    }

    async function finishRefresh(): Promise<void> {
      refreshingRef.current = true;
      setState("refreshing");
      updatePullDistance(triggerDistance);

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
      trackingRef.current = true;
    }

    function handleTouchMove(event: TouchEvent): void {
      if (!trackingRef.current || activeTouchIdRef.current === null || disabled || refreshingRef.current) return;

      const touch = Array.from(event.touches).find((item) => item.identifier === activeTouchIdRef.current);
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;
      if (deltaY <= 0) {
        resetGesture();
        return;
      }

      if (!isAtScrollTop()) {
        resetGesture();
        return;
      }

      const nextDistance = dampPullDistance(deltaY);
      event.preventDefault();
      updatePullDistance(nextDistance);
      setState(nextDistance >= triggerDistance ? "ready" : "pulling");
    }

    function handleTouchEnd(): void {
      if (!trackingRef.current) return;

      const shouldRefresh = pullDistanceRef.current >= triggerDistance;
      trackingRef.current = false;
      activeTouchIdRef.current = null;
      startYRef.current = 0;

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
    <div className="pointer-events-none fixed left-1/2 top-[max(7px,env(safe-area-inset-top))] z-[80] transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={indicatorStyle} role="status" aria-live="polite">
      <div className="flex min-h-[45px] items-center gap-2 rounded-full bg-kreis-lace/95 px-3 py-[7px] text-kreis-forest shadow-[0_12px_28px_rgba(69,39,20,0.13)] ring-1 ring-[rgba(10,10,10,0.06)] backdrop-blur-md">
        <span className={cn("grid size-[31px] place-items-center rounded-full", state === "error" ? "bg-[rgba(240,83,28,0.16)] text-kreis-orange" : "bg-[rgba(46,75,60,0.12)] text-kreis-forest")}>
          {getIcon(state)}
        </span>
        <span className="min-w-[118px] text-[13px] font-medium leading-[15px]">{label}</span>
      </div>
    </div>
  );
}
