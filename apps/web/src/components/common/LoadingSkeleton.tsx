import { cn } from "../../utils/cn";

type EventCardSkeletonProps = {
  variant?: "full" | "compact";
};

type SkeletonListProps = {
  count?: number;
  variant?: "full" | "compact";
  className?: string;
};

type CommentSkeletonProps = {
  count?: number;
};

type TopicRailSkeletonProps = {
  count?: number;
};

function SkeletonShape({ className }: { className: string }) {
  return <span className={cn("skeleton-shape", className)} aria-hidden="true" />;
}

function EventCardSkeleton({ variant = "full" }: EventCardSkeletonProps) {
  if (variant === "compact") {
    return (
      <article className="grid min-h-[71px] overflow-hidden rounded-[21px] bg-kreis-event-surface text-kreis-ink">
        <div className="grid min-h-[71px] grid-cols-[53px_minmax(0,1fr)_24px] items-center gap-3 px-2.5 py-[9px]">
          <SkeletonShape className="size-[53px] rounded-[16px]" />
          <div className="grid min-w-0 gap-2">
            <SkeletonShape className="h-[17px] w-[78%] rounded-full" />
            <SkeletonShape className="h-[13px] w-[54%] rounded-full" />
          </div>
          <SkeletonShape className="size-6 rounded-full" />
        </div>
      </article>
    );
  }

  return (
    <article className="grid h-[160px] min-w-0 content-start overflow-hidden rounded-[17px] bg-kreis-event-surface pt-2">
      <SkeletonShape className="mx-[9px] h-[72px] rounded-[12px]" />
      <div className="grid min-h-0 content-start gap-[7px] px-[9px] pb-2.5 pt-[9px]">
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <SkeletonShape className="h-[15px] w-[72%] rounded-full" />
          <SkeletonShape className="size-5 rounded-full" />
        </div>
        <SkeletonShape className="h-[12px] w-[58%] rounded-full" />
        <SkeletonShape className="h-[12px] w-[48%] rounded-full" />
      </div>
    </article>
  );
}

export function EventCardSkeletonList({ count = 4, variant = "full", className }: SkeletonListProps) {
  return (
    <div className={cn("contents", className)} role="status" aria-label="Cargando eventos">
      <span className="sr-only">Cargando eventos</span>
      {Array.from({ length: count }, (_, index) => (
        <EventCardSkeleton variant={variant} key={index} />
      ))}
    </div>
  );
}

export function CommentSkeletonList({ count = 3 }: CommentSkeletonProps) {
  return (
    <div className="grid gap-3 border-t border-kreis-line pt-3" role="status" aria-label="Cargando comentarios">
      <span className="sr-only">Cargando comentarios</span>
      {Array.from({ length: count }, (_, index) => (
        <div className="flex items-start gap-2.5" key={index}>
          <SkeletonShape className="mt-0.5 size-7 flex-none rounded-full" />
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="flex items-center gap-2">
              <SkeletonShape className="h-[11px] w-[96px] rounded-full" />
              <SkeletonShape className="h-[9px] w-[46px] rounded-full" />
            </div>
            <SkeletonShape className="h-[11px] w-full rounded-full" />
            <SkeletonShape className="h-[11px] w-[72%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopicRailSkeleton({ count = 8 }: TopicRailSkeletonProps) {
  return (
    <div className="contents" role="status" aria-label="Cargando topicos">
      <span className="sr-only">Cargando topicos</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonShape className={cn("h-5 rounded-[15px]", index % 3 === 0 ? "w-[72px]" : index % 3 === 1 ? "w-[54px]" : "w-[86px]")} key={index} />
      ))}
    </div>
  );
}

export function AuthInterestSkeletonGrid() {
  return (
    <>
      {Array.from({ length: 9 }, (_, index) => (
        <SkeletonShape
          className={cn(
            "h-[22px] w-full rounded-full bg-[rgba(247,237,218,0.31)]",
            index % 4 === 0 && "opacity-80",
            index % 4 === 1 && "opacity-95",
            index % 4 === 2 && "opacity-70"
          )}
          key={index}
        />
      ))}
    </>
  );
}

export function ProfileMetaSkeleton() {
  return (
    <div className="mt-[5px] grid gap-2" role="status" aria-label="Cargando perfil">
      <span className="sr-only">Cargando perfil</span>
      <SkeletonShape className="h-[14px] w-[118px] rounded-full" />
    </div>
  );
}
