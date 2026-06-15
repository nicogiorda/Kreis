import { Plus, X } from "@phosphor-icons/react";
import { WidgetAdd } from "@solar-icons/react";
import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { ThemeToggleIcon } from "../common/Icons";
import type { ActivityPost, Community, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { PostComments } from "./PostComments";

const allCommunitiesFilter = "all";

type CommunityPostProps = {
  post: ActivityPost;
  accessToken: string;
  expanded?: boolean;
  onOpen?: (postId: string) => void;
  onCommentCountChange: (postId: string, total: number) => void;
};

function getAvatarLabel(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase() || "K";
}

function getDetailTime(time: string): string {
  const normalized = time.replace(/^hace\s+/i, "").trim();
  const hourMatch = normalized.match(/^(\d+)\s*h$/i);
  const minuteMatch = normalized.match(/^(\d+)\s*min$/i);
  const dayMatch = normalized.match(/^(\d+)\s*d$/i);

  if (hourMatch) return `${hourMatch[1]} ${hourMatch[1] === "1" ? "hora" : "horas"}`;
  if (minuteMatch) return `${minuteMatch[1]} ${minuteMatch[1] === "1" ? "minuto" : "minutos"}`;
  if (dayMatch) return `${dayMatch[1]} ${dayMatch[1] === "1" ? "dia" : "dias"}`;

  return normalized;
}

function CommunityPost({ post, accessToken, expanded = false, onOpen, onCommentCountChange }: CommunityPostProps) {
  function openPost(): void {
    if (expanded) return;
    onOpen?.(post.id);
  }

  function handlePostClick(event: MouseEvent<HTMLElement>): void {
    if ((event.target as HTMLElement).closest("button, input, textarea, select, a")) return;
    openPost();
  }

  function handlePostKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPost();
  }

  return (
    <article
      className={cn(
        "relative grid grid-cols-[40px_minmax(0,1fr)] gap-2",
        expanded ? "py-0" : "py-[10px]",
        expanded ? "animate-[rise_180ms_ease-out]" : "cursor-pointer"
      )}
      role={expanded ? undefined : "button"}
      aria-label={expanded ? undefined : `Abrir post de ${post.author || "Kreis"}`}
      tabIndex={expanded ? undefined : 0}
      onClick={expanded ? undefined : handlePostClick}
      onKeyDown={expanded ? undefined : handlePostKeyDown}
    >
      {!expanded ? (
        <span
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-kreis-line"
          aria-hidden="true"
        />
      ) : null}
      <span
        className="mt-1 grid size-10 place-items-center overflow-hidden rounded-full bg-kreis-event-surface text-[11px] font-medium uppercase leading-none text-kreis-orange"
        aria-hidden="true"
      >
        {post.authorAvatarUrl ? (
          <img className="size-full object-cover" src={post.authorAvatarUrl} alt="" loading="lazy" decoding="async" />
        ) : post.icon || getAvatarLabel(post.author)}
      </span>

      <div className="min-w-0">
        {expanded ? (
          <div className="grid min-w-0">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-[15px] text-kreis-muted">
              {post.communityName}
            </span>
            <div className="flex min-w-0 items-baseline gap-1.5">
              <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-[15px] text-kreis-ink">
                {post.author || "Kreis"}
              </strong>
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-[15px] text-kreis-muted">
                &middot; {getDetailTime(post.time)}
              </span>
            </div>
          </div>
        ) : (
        <div className="flex min-w-0 items-baseline gap-1.5">
          <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-[15px] text-kreis-ink">
            {post.author || "Kreis"}
          </strong>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-[15px] text-kreis-muted">
            {post.communityName} · {post.time}
          </span>
        </div>
        )}

        <p className="m-0 mt-[7px] whitespace-pre-wrap text-[12px] font-normal leading-[15px] text-kreis-ink">
          {post.text}
        </p>

        <PostComments
          accessToken={accessToken}
          expanded={expanded}
          initialCount={post.comments}
          onExpand={() => onOpen?.(post.id)}
          postId={post.id}
          score={post.score}
          onCountChange={onCommentCountChange}
        />
      </div>
    </article>
  );
}

type CommunityFilterRailProps = {
  communities: Community[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

function CommunityFilterRail({ communities, activeFilter, onFilterChange }: CommunityFilterRailProps) {
  const filters = [
    { id: allCommunitiesFilter, label: "Todo" },
    ...communities.map((community) => ({ id: community.id, label: community.name }))
  ];

  return (
    <section className="mt-[21px] min-w-0" aria-label="Filtrar feed por comunidad">
      <div className="flex min-w-0 gap-[7px] overflow-x-auto pb-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <button
              className={cn(
                "h-[21px] max-w-[128px] flex-none overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-0 px-[11px] text-[12px] font-normal leading-[15px] shadow-none transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]",
                active ? "bg-kreis-orange text-kreis-cream" : "bg-kreis-event-surface text-kreis-muted"
              )}
              type="button"
              key={filter.id}
              aria-pressed={active}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

type CommunitiesScreenProps = {
  communities: Community[];
  posts: ActivityPost[];
  accessToken: string;
  themeMode: ThemeMode;
  onCreateCommunity: () => void;
  onCreatePost: () => void;
  onCommentCountChange: (postId: string, total: number) => void;
  onToggleTheme: () => void;
};

export function CommunitiesScreen({
  communities,
  posts,
  accessToken,
  themeMode,
  onCreateCommunity,
  onCreatePost,
  onCommentCountChange,
  onToggleTheme
}: CommunitiesScreenProps) {
  const [activeFilter, setActiveFilter] = useState(allCommunitiesFilter);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const joinedCommunities = useMemo(
    () => communities.filter((community) => community.joined && community.status !== "Pendiente"),
    [communities]
  );
  const joinedCommunityIds = useMemo(() => new Set(joinedCommunities.map((community) => community.id)), [joinedCommunities]);
  const selectedFilter = activeFilter === allCommunitiesFilter || joinedCommunityIds.has(activeFilter)
    ? activeFilter
    : allCommunitiesFilter;
  const feedPosts = useMemo(
    () => posts
      .filter((post) => joinedCommunityIds.has(post.communityId))
      .filter((post) => selectedFilter === allCommunitiesFilter || post.communityId === selectedFilter),
    [joinedCommunityIds, posts, selectedFilter]
  );
  const expandedPost = expandedPostId ? feedPosts.find((post) => post.id === expandedPostId) ?? null : null;
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  useEffect(() => {
    if (!expandedPostId || expandedPost) return;

    const frameId = window.requestAnimationFrame(() => setExpandedPostId(null));

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedPost, expandedPostId]);

  if (expandedPost) {
    return (
      <section className="grid min-w-0 w-full max-w-[430px] animate-[rise_220ms_ease-out] pt-[max(29px,calc(env(safe-area-inset-top)+14px))] sm:mx-auto" data-screen="communities-post-detail">
        <h1 className="sr-only">Detalle de post</h1>

        <div className="mb-[15px] flex h-[37px] items-center justify-end">
          <button
            className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-muted shadow-none transition-[transform,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label="Cerrar post"
            onClick={() => setExpandedPostId(null)}
          >
            <X aria-hidden="true" size={19} weight="bold" />
          </button>
        </div>

        <CommunityPost
          accessToken={accessToken}
          expanded
          post={expandedPost}
          onCommentCountChange={onCommentCountChange}
        />
      </section>
    );
  }

  return (
    <section className="grid min-w-0 w-full max-w-[430px] animate-[rise_220ms_ease-out] pt-[63px] sm:mx-auto" data-screen="communities">
      <h1 className="sr-only">Comunidades</h1>

      <div className="mb-[21px] flex h-[37px] items-center justify-end gap-[11px]">
        <button
          className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-[transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
          type="button"
          aria-label="Crear comunidad"
          onClick={onCreateCommunity}
        >
          <WidgetAdd className="size-[21px]" weight="BoldDuotone" aria-hidden="true" />
        </button>
        <button
          className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-muted shadow-none transition-[transform,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 [&_svg]:size-[20px]"
          type="button"
          aria-label={nextThemeLabel}
          aria-pressed={themeMode === "dark"}
          onClick={onToggleTheme}
        >
          <ThemeToggleIcon themeMode={themeMode} />
        </button>
      </div>

      <CommunityFilterRail
        communities={joinedCommunities}
        activeFilter={selectedFilter}
        onFilterChange={setActiveFilter}
      />

      <section className="mt-[12px] grid min-w-0" aria-label="Feed de comunidades">
        {feedPosts.length ? feedPosts.map((post) => (
          <CommunityPost
            accessToken={accessToken}
            key={post.id}
            onOpen={setExpandedPostId}
            post={post}
            onCommentCountChange={onCommentCountChange}
          />
        )) : joinedCommunities.length ? (
          <EmptyState text="No hay posts en esta comunidad todavía." />
        ) : (
          <EmptyState text="Unite a una comunidad desde Inicio para ver su feed." />
        )}
      </section>

      <button
        className="fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+28px)] right-[max(11px,calc((100vw-430px)/2+11px))] z-40 grid size-[55px] place-items-center rounded-full border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-[transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
        type="button"
        aria-label="Subir post"
        onClick={onCreatePost}
      >
        <Plus className="size-[29px]" weight="bold" aria-hidden="true" />
      </button>
    </section>
  );
}
