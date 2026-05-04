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
    <div className="mt-2.5 flex flex-wrap gap-2 text-[0.9rem] font-medium text-kreis-muted">
      {items.map((item) => {
        const text = getMetaText(item);
        const icon = typeof item === "string" ? undefined : item.icon;

        return (
          <span className="inline-flex min-w-0 items-center gap-1" key={text}>
            {icon === "location" ? (
              <svg className="size-[1em] flex-none fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]" aria-hidden="true" viewBox="0 0 24 24">
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
