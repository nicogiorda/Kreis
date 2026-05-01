type MetaProps = {
  items: string[];
};

export function Meta({ items }: MetaProps) {
  return (
    <div className="meta">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
