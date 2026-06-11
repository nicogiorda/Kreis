import { Plus } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { ThemeToggleIcon } from "../common/Icons";
import type { ActivityPost, Community, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { PostComments } from "./PostComments";

const allCommunitiesFilter = "all";

type CommunityPostProps = {
  post: ActivityPost;
  accessToken: string;
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

function CommunityPost({ post, accessToken, onCommentCountChange }: CommunityPostProps) {
  return (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] gap-2 border-b border-kreis-line py-[10px]">
      <span className="mt-1 grid size-10 place-items-center rounded-full bg-kreis-event-surface text-[11px] font-medium uppercase leading-none text-kreis-orange" aria-hidden="true">
        {post.icon || getAvatarLabel(post.communityName)}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-[15px] text-kreis-ink">
            {post.author || "Kreis"}
          </strong>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-[15px] text-kreis-muted">
            {post.communityName} · {post.time}
          </span>
        </div>

        <p className="m-0 mt-[7px] whitespace-pre-wrap text-[12px] font-normal leading-[15px] text-kreis-ink">
          {post.text}
        </p>

        <PostComments
          accessToken={accessToken}
          initialCount={post.comments}
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
  onCommentCountChange: (postId: string, total: number) => void;
  onToggleTheme: () => void;
};

export function CommunitiesScreen({
  communities,
  posts,
  accessToken,
  themeMode,
  onCreateCommunity,
  onCommentCountChange,
  onToggleTheme
}: CommunitiesScreenProps) {
  const [activeFilter, setActiveFilter] = useState(allCommunitiesFilter);
  const joinedCommunities = useMemo(
    () => communities.filter((community) => community.joined && community.status !== "Pendiente"),
    [communities]
  );
  const joinedCommunityIds = useMemo(() => new Set(joinedCommunities.map((community) => community.id)), [joinedCommunities]);
  const selectedFilter = activeFilter === allCommunitiesFilter || joinedCommunityIds.has(activeFilter)
    ? activeFilter
    : allCommunitiesFilter;
  const feedPosts = posts
    .filter((post) => joinedCommunityIds.has(post.communityId))
    .filter((post) => selectedFilter === allCommunitiesFilter || post.communityId === selectedFilter);
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

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
          <Plus className="size-[21px]" weight="bold" aria-hidden="true" />
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
            post={post}
            onCommentCountChange={onCommentCountChange}
          />
        )) : joinedCommunities.length ? (
          <EmptyState text="No hay posts en esta comunidad todavía." />
        ) : (
          <EmptyState text="Unite a una comunidad desde Inicio para ver su feed." />
        )}
      </section>
    </section>
  );
}
