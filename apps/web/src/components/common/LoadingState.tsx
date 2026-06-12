import { cn } from "../../utils/cn";

type LoadingStateVariant = "block" | "inline" | "button";

type LoadingStateProps = {
  label?: string;
  variant?: LoadingStateVariant;
  className?: string;
};

export function LoadingState({ label = "Cargando", variant = "block", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "loading-state",
        variant === "block" && "loading-state--block",
        variant === "inline" && "loading-state--inline",
        variant === "button" && "loading-state--button",
        className
      )}
      role="status"
    >
      <span className="loading-state-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
