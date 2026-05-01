import { EmptyState } from "../common/EmptyState";
import type { ActivityPost, Community } from "../../types";

type CommunityPostProps = {
  post: ActivityPost;
};

function CommunityPost({ post }: CommunityPostProps) {
  return (
    <article className="community-post">
      <div className="post-votes" aria-label={`${post.score} votos`}>
        <span aria-hidden="true">^</span>
        <strong>{post.score}</strong>
      </div>
      <div className="post-content">
        <div className="post-meta">
          <span className="post-community-avatar">{post.icon}</span>
          <span>{post.communityName}</span>
          <span>-</span>
          <span>{post.author}</span>
          <span>-</span>
          <span>{post.time}</span>
        </div>
        <h2>{post.title}</h2>
        <p>{post.text}</p>
        <div className="post-actions">
          <span>{post.comments} comentarios</span>
          <span>Compartir</span>
        </div>
      </div>
    </article>
  );
}

type CommunitiesScreenProps = {
  communities: Community[];
  posts: ActivityPost[];
  discover?: Community[];
  onToggleJoin?: (communityId: string) => void;
};

export function CommunitiesScreen({ communities, posts }: CommunitiesScreenProps) {
  const joined = communities.filter((community) => community.joined);
  const joinedIds = new Set(joined.map((community) => community.id));
  const feedPosts = posts.filter((post) => joinedIds.has(post.communityId));

  return (
    <section className="screen is-active" data-screen="communities">
      <section className="joined-strip" aria-label="Comunidades a las que perteneces">
        {joined.map((community) => (
          <span className="joined-pill" key={community.id}>
            <span>{community.icon}</span>
            {community.name}
          </span>
        ))}
      </section>

      <section className="community-feed" aria-label="Feed de comunidades">
        <div className="feed-heading">
          <h2>Tu feed</h2>
          <span>{feedPosts.length}</span>
        </div>
        {feedPosts.length ? feedPosts.map((post) => <CommunityPost post={post} key={post.id} />) : <EmptyState text="Unite a una comunidad para ver mensajes aca." />}
      </section>
    </section>
  );
}
