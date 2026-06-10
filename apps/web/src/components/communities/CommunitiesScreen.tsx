import { EmptyState } from "../common/EmptyState";
import type { ActivityPost, Community } from "../../types";
import { PostComments } from "./PostComments";

type CommunityPostProps = {
  post: ActivityPost;
  accessToken: string;
  onCommentCountChange: (postId: string, total: number) => void;
};

function CommunityPost({ post, accessToken, onCommentCountChange }: CommunityPostProps) {
  return (
    <article className="grid grid-cols-[34px_minmax(0,1fr)] gap-2.5 border-b border-kreis-line py-[13px]">
      <div className="grid content-start justify-items-center gap-0.5 pt-0.5 text-[0.78rem] text-kreis-orange" aria-label={`${post.score} votos`}>
        <span aria-hidden="true">^</span>
        <strong className="text-[0.74rem] text-kreis-muted">{post.score}</strong>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-[5px] text-[0.72rem] font-semibold text-kreis-muted">
          <span className="grid size-[22px] place-items-center rounded-full bg-kreis-beige text-[0.62rem] font-black text-kreis-orange">{post.icon}</span>
          <span>{post.communityName}</span>
          <span>-</span>
          <span>{post.author}</span>
          <span>-</span>
          <span>{post.time}</span>
        </div>
        <h2 className="mb-0 mt-2 text-base font-bold leading-[1.18] text-kreis-ink">{post.title}</h2>
        <p className="mb-0 mt-[7px] text-[0.92rem] leading-[1.38] text-kreis-muted">{post.text}</p>
        <PostComments
          accessToken={accessToken}
          initialCount={post.comments}
          postId={post.id}
          onCountChange={onCommentCountChange}
        />
      </div>
    </article>
  );
}

type CommunitiesScreenProps = {
  communities: Community[];
  posts: ActivityPost[];
  accessToken: string;
  discover?: Community[];
  onToggleJoin?: (communityId: string) => void;
  onCommentCountChange: (postId: string, total: number) => void;
};

export function CommunitiesScreen({
  communities,
  posts,
  accessToken,
  onToggleJoin,
  onCommentCountChange
}: CommunitiesScreenProps) {
  const joined = communities.filter((community) => community.joined);
  const joinedIds = new Set(joined.map((community) => community.id));
  const feedPosts = posts.filter((post) => joinedIds.has(post.communityId));

  return (
    <section className="pt-[18px] animate-[rise_220ms_ease-out]" data-screen="communities">
      <section className="flex gap-2 overflow-x-auto pb-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Comunidades a las que perteneces">
        {joined.map((community) => (
          <button
            className="inline-flex min-h-8 flex-none items-center gap-[7px] rounded-full border border-kreis-line bg-transparent py-0 pl-1.5 pr-2.5 text-[0.8rem] font-semibold text-kreis-muted"
            key={community.id}
            type="button"
            onClick={() => onToggleJoin?.(community.id)}
            aria-label={`Salir de ${community.name}`}
          >
            <span className="grid size-[22px] place-items-center rounded-full bg-kreis-beige text-[0.64rem] font-black text-kreis-orange">{community.icon}</span>
            {community.name}
          </button>
        ))}
      </section>

      <section className="mt-0.5 grid" aria-label="Feed de comunidades">
        <div className="flex items-center justify-between gap-3 pb-1.5">
          <h2 className="m-0 text-[1.12rem] font-bold leading-none">Tu feed</h2>
          <span className="grid h-[25px] min-w-[25px] place-items-center rounded-full bg-kreis-surface text-[0.74rem] font-bold text-kreis-muted">{feedPosts.length}</span>
        </div>
        {feedPosts.length ? feedPosts.map((post) => (
          <CommunityPost
            accessToken={accessToken}
            key={post.id}
            post={post}
            onCommentCountChange={onCommentCountChange}
          />
        )) : <EmptyState text="Unite a una comunidad para ver mensajes aca." />}
      </section>
    </section>
  );
}
