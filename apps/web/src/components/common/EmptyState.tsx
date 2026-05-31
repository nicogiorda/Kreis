type EmptyStateProps = {
  text: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ text, title = "Sin resultados", actionLabel, onAction }: EmptyStateProps) {
  return (
    <article className="grid gap-[5px] rounded-kreis-card border border-kreis-line bg-kreis-surface p-[18px] shadow-none">
      <strong>{title}</strong>
      <span className="mt-[5px] text-kreis-muted leading-[1.45]">{text}</span>
      {actionLabel && onAction ? (
        <button
          className="mt-2 w-max border-0 bg-transparent p-0 text-[14px] font-medium text-kreis-orange shadow-none"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
