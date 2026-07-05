import { Plus, User, X } from "@phosphor-icons/react";
import { WidgetAdd } from "@solar-icons/react";
import { type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { ThemeToggleIcon } from "../common/Icons";
import type { ActivityPost, Community, ThemeMode } from "../../types";
import { cn } from "../../utils/cn";
import { useVisualViewport } from "../../hooks/useVisualViewport";
import { PostComments, PostDetailCommentsLayout } from "./PostComments";
import type { PostLikeState } from "../../api/posts";

const allCommunitiesFilter = "all";

type CommunityPostProps = {
  post: ActivityPost;
  accessToken: string;
  expanded?: boolean;
  renderComments?: boolean;
  onOpen?: (postId: string) => void;
  onPostDeleted: (postId: string) => void | Promise<void>;
  onCommentCountChange: (postId: string, total: number) => void;
  onLikeToggle: (postId: string) => Promise<PostLikeState>;
};

const avatarPlaceholderTones = [
  "bg-[rgba(240,83,28,0.16)] text-kreis-orange",
  "bg-[rgba(46,75,60,0.14)] text-kreis-forest",
  "bg-[rgba(255,167,79,0.22)] text-[#ffa74f]"
] as const;

function getStableToneIndex(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % avatarPlaceholderTones.length;
  }

  return hash;
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

function CommunityPost({ post, accessToken, expanded = false, renderComments = true, onOpen, onPostDeleted, onCommentCountChange, onLikeToggle }: CommunityPostProps) {
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
        className={cn(
          "mt-1 grid size-10 place-items-center overflow-hidden rounded-full",
          post.authorAvatarUrl ? "bg-kreis-event-surface" : avatarPlaceholderTones[getStableToneIndex(`${post.author}-${post.id}`)]
        )}
        aria-hidden="true"
      >
        {post.authorAvatarUrl ? (
          <img className="size-full object-cover" src={post.authorAvatarUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <User className="size-[21px]" weight="fill" aria-hidden="true" />
        )}
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

        {renderComments ? (
          <PostComments
            accessToken={accessToken}
            expanded={expanded}
            initialCount={post.comments}
            initialLiked={post.likedByMe}
            isOwnPost={post.isOwn}
            onLikeToggle={onLikeToggle}
            onExpand={() => onOpen?.(post.id)}
            onPostDeleted={onPostDeleted}
            postId={post.id}
            score={post.score}
            onCountChange={onCommentCountChange}
          />
        ) : null}
      </div>
    </article>
  );
}

function getKeyboardDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("keyboard-debug") === "1";
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
  onDeletePost: (postId: string) => Promise<void>;
  onCommentCountChange: (postId: string, total: number) => void;
  onLikeToggle: (postId: string) => Promise<PostLikeState>;
  onPostDetailChange?: (open: boolean) => void;
  onToggleTheme: () => void;
};

export function CommunitiesScreen({
  communities,
  posts,
  accessToken,
  themeMode,
  onCreateCommunity,
  onCreatePost,
  onDeletePost,
  onCommentCountChange,
  onLikeToggle,
  onPostDetailChange,
  onToggleTheme
}: CommunitiesScreenProps) {
  const [activeFilter, setActiveFilter] = useState(allCommunitiesFilter);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const postDetailScrollRef = useRef<HTMLDivElement | null>(null);
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
  const expandedPostOpen = Boolean(expandedPost);
  const visualViewport = useVisualViewport(expandedPostOpen);
  const keyboardDebug = getKeyboardDebugEnabled();
  const [keyboardDebugMetrics, setKeyboardDebugMetrics] = useState("");
  const nextThemeLabel = themeMode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  async function handlePostDeleted(postId: string): Promise<void> {
    await onDeletePost(postId);
    setExpandedPostId((current) => current === postId ? null : current);
  }

  useEffect(() => {
    if (!expandedPostId || expandedPost) return;

    const frameId = window.requestAnimationFrame(() => setExpandedPostId(null));

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedPost, expandedPostId]);

  useEffect(() => {
    onPostDetailChange?.(expandedPostOpen);

    return () => onPostDetailChange?.(false);
  }, [expandedPostOpen, onPostDetailChange]);

  useEffect(() => {
    if (!expandedPostOpen) return;

    document.documentElement.classList.add("post-detail-open");

    return () => {
      document.documentElement.classList.remove("post-detail-open");
    };
  }, [expandedPostOpen]);

  useEffect(() => {
    if (!keyboardDebug || !expandedPostOpen) return;

    let frameId = 0;
    const scrollArea = postDetailScrollRef.current;

    function updateMetrics(): void {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById("root");
        const detailRoot = document.querySelector<HTMLElement>(".post-detail-viewport");
        setKeyboardDebugMetrics([
          `vv: ${Math.round(visualViewport.height)} top ${Math.round(visualViewport.offsetTop)}`,
          `keyboard: ${visualViewport.keyboardOpen ? "open" : "closed"}`,
          `html: ${Math.round(html.getBoundingClientRect().height)} ov ${getComputedStyle(html).overflow}`,
          `body: ${Math.round(body.getBoundingClientRect().height)} ov ${getComputedStyle(body).overflow}`,
          `root: ${Math.round(root?.getBoundingClientRect().height ?? 0)}`,
          `detail: ${Math.round(detailRoot?.getBoundingClientRect().height ?? 0)}`,
          `scroll: ${Math.round(scrollArea?.getBoundingClientRect().height ?? 0)} / ${scrollArea?.scrollTop.toFixed(0) ?? "0"}`
        ].join("\n"));
      });
    }

    updateMetrics();
    scrollArea?.addEventListener("scroll", updateMetrics);
    window.visualViewport?.addEventListener("resize", updateMetrics);
    window.visualViewport?.addEventListener("scroll", updateMetrics);

    return () => {
      window.cancelAnimationFrame(frameId);
      scrollArea?.removeEventListener("scroll", updateMetrics);
      window.visualViewport?.removeEventListener("resize", updateMetrics);
      window.visualViewport?.removeEventListener("scroll", updateMetrics);
    };
  }, [expandedPostOpen, keyboardDebug, visualViewport.height, visualViewport.keyboardOpen, visualViewport.offsetTop]);

  if (expandedPost) {
    return (
      <section
        className="post-detail-viewport animate-[rise_220ms_ease-out]"
        data-keyboard-open={visualViewport.keyboardOpen ? "true" : "false"}
        data-screen="communities-post-detail"
      >
        <header className="post-detail-header">
          <h1 className="sr-only">Detalle de post</h1>

          <button
            className="grid size-[37px] place-items-center rounded-[12px] border-0 bg-kreis-event-surface p-0 text-kreis-muted shadow-none transition-[transform,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95"
            type="button"
            aria-label="Cerrar post"
            onClick={() => setExpandedPostId(null)}
          >
            <X aria-hidden="true" size={19} weight="bold" />
          </button>
        </header>

        <PostDetailCommentsLayout
          accessToken={accessToken}
          active={expandedPostOpen}
          keyboardOpen={visualViewport.keyboardOpen}
          postId={expandedPost.id}
          onCountChange={onCommentCountChange}
          initialCount={expandedPost.comments}
          initialLiked={expandedPost.likedByMe}
          isOwnPost={expandedPost.isOwn}
          onLikeToggle={onLikeToggle}
          onPostDeleted={handlePostDeleted}
          score={expandedPost.score}
        >
          {({ comments, composer }) => (
            <>
              <div ref={postDetailScrollRef} className="post-detail-scroll">
                <div className="post-detail-content">
                  <CommunityPost
                    accessToken={accessToken}
                    expanded
                    renderComments={false}
                    post={expandedPost}
                    onPostDeleted={handlePostDeleted}
                    onCommentCountChange={onCommentCountChange}
                    onLikeToggle={onLikeToggle}
                  />
                  {comments}
                </div>
              </div>
              {composer}
            </>
          )}
        </PostDetailCommentsLayout>

        {keyboardDebug ? (
          <pre className="pointer-events-none absolute left-2 top-2 z-[70] m-0 max-w-[260px] whitespace-pre-wrap rounded-[10px] bg-black/75 px-2 py-1 text-[10px] leading-tight text-white">
            {keyboardDebugMetrics}
          </pre>
        ) : null}
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
            onPostDeleted={handlePostDeleted}
            post={post}
            onCommentCountChange={onCommentCountChange}
            onLikeToggle={onLikeToggle}
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
