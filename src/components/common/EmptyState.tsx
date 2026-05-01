type EmptyStateProps = {
  text: string;
};

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <article className="empty-state card">
      <strong>Sin resultados</strong>
      <span className="muted">{text}</span>
    </article>
  );
}
