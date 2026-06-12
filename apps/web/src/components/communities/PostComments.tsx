import { ChatRound, Heart } from "@solar-icons/react";
import { ArrowBendDownRight, CaretDown, PaperPlaneTilt } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { createPostComment, listPostComments } from "../../api/posts";
import type { PostComment } from "../../types";
import { cn } from "../../utils/cn";

type PostCommentsProps = {
  postId: string;
  initialCount: number;
  score?: number;
  accessToken: string;
  onCountChange: (postId: string, total: number) => void;
};

type CommentNodeProps = {
  comment: PostComment;
  depth: number;
  replyingTo: string | null;
  replyBody: string;
  submitting: boolean;
  onReplyStart: (commentId: string) => void;
  onReplyCancel: () => void;
  onReplyBodyChange: (value: string) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>, parentId: string) => void;
};

function formatCommentTime(createdAt: string): string {
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));

  if (elapsedMinutes < 1) return "ahora";
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `hace ${elapsedHours} h`;

  return `hace ${Math.floor(elapsedHours / 24)} d`;
}

function insertReply(
  comments: PostComment[],
  parentId: string,
  reply: PostComment
): PostComment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...comment.replies, reply]
      };
    }

    if (!comment.replies.length) return comment;

    return {
      ...comment,
      replies: insertReply(comment.replies, parentId, reply)
    };
  });
}

function CommentForm({
  value,
  placeholder,
  submitting,
  compact = false,
  onChange,
  onCancel,
  onSubmit
}: {
  value: string;
  placeholder: string;
  submitting: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onCancel?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-2" onSubmit={onSubmit}>
      <textarea
        className={cn(
          "w-full resize-none rounded-[13px] border border-kreis-line bg-kreis-lace px-3 py-2.5 text-[0.86rem] leading-[1.35] text-kreis-ink outline-none transition-shadow placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/25",
          compact ? "min-h-[68px]" : "min-h-[78px]"
        )}
        maxLength={2000}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <button
            className="min-h-8 rounded-full border-0 bg-transparent px-3 text-[0.76rem] font-bold text-kreis-muted shadow-none"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        ) : null}
        <button
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border-0 bg-kreis-orange px-3 text-[0.76rem] font-black text-white shadow-none disabled:opacity-50"
          type="submit"
          disabled={submitting || !value.trim()}
        >
          <PaperPlaneTilt aria-hidden="true" size={15} weight="fill" />
          {submitting ? "Enviando" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

function CommentNode({
  comment,
  depth,
  replyingTo,
  replyBody,
  submitting,
  onReplyStart,
  onReplyCancel,
  onReplyBodyChange,
  onReplySubmit
}: CommentNodeProps) {
  const [deepRepliesVisible, setDeepRepliesVisible] = useState(depth < 3);
  const isReplying = replyingTo === comment.id;
  const hasHiddenDeepReplies = depth >= 3 && comment.replies.length > 0 && !deepRepliesVisible;

  return (
    <article className="min-w-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-full bg-kreis-beige text-[0.65rem] font-black uppercase text-kreis-orange">
          {comment.author.name.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <strong className="text-[0.8rem] leading-none text-kreis-ink">{comment.author.name}</strong>
            <span className="text-[0.68rem] font-semibold text-kreis-muted">{formatCommentTime(comment.createdAt)}</span>
          </div>
          <p className="mb-0 mt-1.5 whitespace-pre-wrap text-[0.84rem] leading-[1.4] text-kreis-ink">{comment.body}</p>
          <button
            className="mt-1.5 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[0.72rem] font-black text-kreis-muted shadow-none"
            type="button"
            onClick={() => isReplying ? onReplyCancel() : onReplyStart(comment.id)}
          >
            <ArrowBendDownRight aria-hidden="true" size={14} weight="bold" />
            Responder
          </button>
        </div>
      </div>

      {isReplying ? (
        <div className="ml-9 mt-2">
          <CommentForm
            compact
            value={replyBody}
            placeholder={`Responder a ${comment.author.name}`}
            submitting={submitting}
            onChange={onReplyBodyChange}
            onCancel={onReplyCancel}
            onSubmit={(event) => onReplySubmit(event, comment.id)}
          />
        </div>
      ) : null}

      {hasHiddenDeepReplies ? (
        <button
          className="ml-9 mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-kreis-line bg-kreis-surface px-3 text-[0.72rem] font-black text-kreis-muted shadow-none"
          type="button"
          onClick={() => setDeepRepliesVisible(true)}
        >
          <CaretDown aria-hidden="true" size={13} weight="bold" />
          Ver {comment.replies.length} {comment.replies.length === 1 ? "respuesta" : "respuestas"}
        </button>
      ) : null}

      {comment.replies.length && deepRepliesVisible ? (
        <div className={cn(
          "mt-2 grid gap-3",
          depth < 3
            ? "ml-3 border-l border-kreis-line pl-3"
            : "ml-9 border-l-0 pl-0"
        )}>
          {comment.replies.map((reply) => (
            <CommentNode
              comment={reply}
              depth={depth + 1}
              key={reply.id}
              replyingTo={replyingTo}
              replyBody={replyBody}
              submitting={submitting}
              onReplyStart={onReplyStart}
              onReplyCancel={onReplyCancel}
              onReplyBodyChange={onReplyBodyChange}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function PostComments({
  postId,
  initialCount,
  score,
  accessToken,
  onCountChange
}: PostCommentsProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [rootBody, setRootBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const displayedScore = typeof score === "number" ? score + (liked ? 1 : 0) : undefined;

  async function loadComments(): Promise<void> {
    setStatus("loading");
    setError(null);

    try {
      const result = await listPostComments(postId, accessToken);
      setComments(result.comments);
      onCountChange(postId, result.total);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar los comentarios.");
      setStatus("error");
    }
  }

  function toggleOpen(): void {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && status === "idle") {
      void loadComments();
    }
  }

  function startReply(commentId: string): void {
    setReplyingTo(commentId);
    setReplyBody("");
    setError(null);
  }

  function cancelReply(): void {
    setReplyingTo(null);
    setReplyBody("");
  }

  async function submitComment(body: string, parentId?: string): Promise<void> {
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await createPostComment(postId, body.trim(), accessToken, parentId);

      setComments((current) => parentId
        ? insertReply(current, parentId, result.comment)
        : [...current, result.comment]);
      onCountChange(postId, result.total);
      setRootBody("");
      cancelReply();
      setStatus("ready");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No pudimos publicar el comentario.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-[12px]">
      <div className="flex items-center gap-[25px] text-[12px] font-normal leading-[15px] text-kreis-muted">
        {typeof displayedScore === "number" ? (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none transition-colors duration-150",
              liked ? "text-kreis-orange" : "text-inherit"
            )}
            type="button"
            aria-label={liked ? "Quitar like" : "Dar like"}
            aria-pressed={liked}
            onClick={() => setLiked((current) => !current)}
          >
            <Heart aria-hidden="true" size={16} weight={liked ? "Bold" : "Outline"} />
            {displayedScore}
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none"
          type="button"
          aria-expanded={open}
          onClick={toggleOpen}
        >
          <ChatRound aria-hidden="true" size={16} weight={open ? "Bold" : "Outline"} />
          {initialCount}
        </button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 rounded-[15px] border border-kreis-line bg-kreis-event-surface p-3">
          <CommentForm
            value={rootBody}
            placeholder="Sumate a la conversación..."
            submitting={submitting}
            onChange={setRootBody}
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment(rootBody);
            }}
          />

          {status === "loading" ? (
            <p className="m-0 text-[0.8rem] font-bold text-kreis-muted">Cargando comentarios...</p>
          ) : null}

          {status === "error" ? (
            <button
              className="w-max border-0 bg-transparent p-0 text-[0.78rem] font-black text-kreis-orange shadow-none"
              type="button"
              onClick={() => void loadComments()}
            >
              Reintentar
            </button>
          ) : null}

          {error ? <p className="m-0 text-[0.78rem] font-bold leading-[1.35] text-kreis-orange">{error}</p> : null}

          {status === "ready" && comments.length === 0 ? (
            <p className="m-0 text-[0.8rem] leading-[1.4] text-kreis-muted">Todavía no hay comentarios. Podés abrir el hilo.</p>
          ) : null}

          {comments.length ? (
            <div className="grid gap-3 border-t border-kreis-line pt-3">
              {comments.map((comment) => (
                <CommentNode
                  comment={comment}
                  depth={0}
                  key={comment.id}
                  replyingTo={replyingTo}
                  replyBody={replyBody}
                  submitting={submitting}
                  onReplyStart={startReply}
                  onReplyCancel={cancelReply}
                  onReplyBodyChange={setReplyBody}
                  onReplySubmit={(event, parentId) => {
                    event.preventDefault();
                    void submitComment(replyBody, parentId);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
