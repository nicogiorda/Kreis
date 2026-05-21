import { MapPoint } from "@solar-icons/react";
import { cn } from "../../utils/cn";

type MetaItem = string | {
  icon?: "location";
  text: string;
};

type MetaProps = {
  items: MetaItem[];
  className?: string;
  itemClassName?: string;
};

function getMetaText(item: MetaItem): string {
  return typeof item === "string" ? item : item.text;
}

export function Meta({ items, className, itemClassName }: MetaProps) {
  return (
    <div className={cn("mt-2.5 flex flex-wrap gap-2 text-[0.9rem] font-medium text-kreis-muted", className)}>
      {items.map((item) => {
        const text = getMetaText(item);
        const icon = typeof item === "string" ? undefined : item.icon;

        return (
          <span className={cn("inline-flex min-w-0 items-center gap-1", itemClassName)} key={text}>
            {icon === "location" ? (
              <MapPoint className="size-[1em] flex-none" weight="Outline" />
            ) : null}
            {text}
          </span>
        );
      })}
    </div>
  );
}
