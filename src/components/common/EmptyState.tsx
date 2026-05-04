type EmptyStateProps = {
  text: string;
};

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <article className="grid gap-[5px] rounded-kreis-card border border-kreis-line bg-kreis-surface p-[18px] shadow-kreis-soft">
      <strong>Sin resultados</strong>
      <span className="mt-[5px] text-kreis-muted leading-[1.45]">{text}</span>
    </article>
  );
}
