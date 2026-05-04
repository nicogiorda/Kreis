type MetaItem = string | {
  icon?: "location";
  text: string;
};

type MetaProps = {
  items: MetaItem[];
};

function getMetaText(item: MetaItem): string {
  return typeof item === "string" ? item : item.text;
}

export function Meta({ items }: MetaProps) {
  return (
    <div className="meta">
      {items.map((item) => {
        const text = getMetaText(item);
        const icon = typeof item === "string" ? undefined : item.icon;

        return (
          <span key={text}>
            {icon === "location" ? (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
            ) : null}
            {text}
          </span>
        );
      })}
    </div>
  );
}
