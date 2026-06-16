import { ChatRound, Heart } from "@solar-icons/react";
import { ArrowBendDownRight, CaretDown, DotsThree, PaperPlaneTilt } from "@phosphor-icons/react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPostComment, listPostComments } from "../../api/posts";
import type { PostComment } from "../../types";
import { CommentSkeletonList } from "../common/LoadingSkeleton";
import { LoadingState } from "../common/LoadingState";
import { cn } from "../../utils/cn";

type PostCommentsProps = {
  postId: string;
  initialCount: number;
  score?: number;
  accessToken: string;
  expanded?: boolean;
  onExpand?: () => void;
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

function formatDetailCommentTime(createdAt: string): string {
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));

  if (elapsedMinutes < 1) return "ahora";
  if (elapsedMinutes < 60) return `${elapsedMinutes} ${elapsedMinutes === 1 ? "minuto" : "minutos"}`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} ${elapsedHours === 1 ? "hora" : "horas"}`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ${elapsedDays === 1 ? "dia" : "dias"}`;
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

function getCommentLikeSeed(comment: PostComment): number {
  if (comment.replies.length) return Math.min(comment.replies.length + 1, 9);
  return Number.parseInt(comment.id.replace(/\D/g, "").slice(-1), 10) % 3 || 1;
}

function getCommentAvatarLabel(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase() || "K";
}

function CommentAvatar({
  comment,
  size = "normal"
}: {
  comment: PostComment;
  size?: "normal" | "detail";
}) {
  const sizeClass = size === "detail" ? "size-10" : "size-7";
  const labelClass = size === "detail" ? "text-[0.78rem]" : "text-[0.65rem]";

  return (
    <span
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full bg-kreis-beige font-black uppercase text-kreis-orange",
        sizeClass,
        labelClass,
        size === "detail" ? "mt-1" : "mt-0.5"
      )}
      aria-hidden="true"
    >
      {comment.author.avatarUrl ? (
        <img className="size-full object-cover" src={comment.author.avatarUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        getCommentAvatarLabel(comment.author.name)
      )}
    </span>
  );
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
          {submitting ? (
            <LoadingState label="Enviando comentario" variant="button" />
          ) : (
            <>
              <PaperPlaneTilt aria-hidden="true" size={15} weight="fill" />
              Publicar
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function DetailRootCommentForm({
  value,
  submitting,
  onChange,
  onSubmit
}: {
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasValue = value.trim().length > 0;
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "29px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 29), 96)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  useEffect(() => {
    const formElement = formRef.current;

    function updateKeyboardOffset(): void {
      if (!formElement || !window.visualViewport) return;

      const viewport = window.visualViewport;
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const visibleKeyboardOffset = keyboardOffset > 80 ? keyboardOffset : 0;

      formElement.style.transform = `translate3d(0, -${visibleKeyboardOffset}px, 0)`;
    }

    updateKeyboardOffset();
    window.visualViewport?.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardOffset);
    window.addEventListener("orientationchange", updateKeyboardOffset);

    return () => {
      if (formElement) formElement.style.transform = "";
      window.visualViewport?.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardOffset);
      window.removeEventListener("orientationchange", updateKeyboardOffset);
    };
  }, []);

  return (
    <form
      ref={formRef}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] bg-[var(--app-bg)] px-[22px] pb-[calc(42px+env(safe-area-inset-bottom))] pt-[19px] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      onSubmit={onSubmit}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="block h-[29px] max-h-24 min-h-[29px] w-full resize-none overflow-hidden rounded-[10px] border-0 bg-[rgba(10,10,10,0.08)] px-4 py-[7px] pr-11 text-[12px] font-normal leading-[15px] text-kreis-ink outline-none shadow-none placeholder:text-kreis-muted focus:ring-2 focus:ring-kreis-orange/20"
          maxLength={2000}
          placeholder="Unite a la conversacion"
          rows={1}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            window.requestAnimationFrame(resizeTextarea);
          }}
        />
        <button
          className={cn(
            "absolute right-1 top-1/2 grid size-[23px] -translate-y-1/2 place-items-center rounded-full border-0 bg-kreis-orange p-0 text-kreis-cream shadow-none transition-[opacity,transform] duration-150 active:scale-95",
            hasValue ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          type="submit"
          aria-label="Publicar comentario"
          disabled={submitting || !hasValue}
        >
          <PaperPlaneTilt aria-hidden="true" className={cn(submitting && "animate-pulse")} size={13} weight="fill" />
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
        <CommentAvatar comment={comment} />
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

function DetailCommentActions({
  comment,
  isReplying,
  onReplyStart,
  onReplyCancel
}: {
  comment: PostComment;
  isReplying: boolean;
  onReplyStart: (commentId: string) => void;
  onReplyCancel: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const likeCount = getCommentLikeSeed(comment) + (liked ? 1 : 0);

  return (
    <div className="mt-[7px] flex h-[27px] items-center gap-[22px] text-[12px] font-normal leading-[15px] text-kreis-muted">
      <button
        className="grid size-[27px] place-items-center border-0 bg-transparent p-0 text-inherit shadow-none transition-colors duration-150 active:scale-95"
        type="button"
        aria-label={isReplying ? "Cancelar respuesta" : `Responder a ${comment.author.name}`}
        onClick={() => isReplying ? onReplyCancel() : onReplyStart(comment.id)}
      >
        <ArrowBendDownRight aria-hidden="true" size={15} weight="regular" />
      </button>
      <button
        className={cn(
          "inline-flex h-[27px] items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none transition-colors duration-150 active:scale-95",
          liked && "text-kreis-orange"
        )}
        type="button"
        aria-label={liked ? "Quitar like del comentario" : "Dar like al comentario"}
        aria-pressed={liked}
        onClick={() => setLiked((current) => !current)}
      >
        <Heart aria-hidden="true" size={16} weight={liked ? "Bold" : "Outline"} />
        {likeCount}
      </button>
      <button
        className="ml-auto grid size-[27px] place-items-center border-0 bg-transparent p-0 text-inherit shadow-none"
        type="button"
        aria-label="Mas opciones"
      >
        <DotsThree aria-hidden="true" size={19} weight="bold" />
      </button>
    </div>
  );
}

function DetailCommentNode({
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
  const isReplying = replyingTo === comment.id;
  const hasReplies = comment.replies.length > 0;
  const indent = depth === 0 ? 0 : 18;

  return (
    <div className="relative min-w-0" style={{ marginLeft: indent }}>
      {hasReplies ? (
        <span
          className="pointer-events-none absolute bottom-0 left-0 top-[70px] w-px bg-kreis-line"
          aria-hidden="true"
        />
      ) : null}

      <article className="relative grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-2">
        <CommentAvatar comment={comment} size="detail" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-[15px] text-kreis-ink">
              {comment.author.name}
            </strong>
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-normal leading-[15px] text-kreis-muted">
              &middot; {formatDetailCommentTime(comment.createdAt)}
            </span>
          </div>

          <p className="m-0 mt-[7px] whitespace-pre-wrap text-[12px] font-normal leading-[15px] text-kreis-ink">
            {comment.body}
          </p>

          <DetailCommentActions
            comment={comment}
            isReplying={isReplying}
            onReplyStart={onReplyStart}
            onReplyCancel={onReplyCancel}
          />

          {isReplying ? (
            <div className="mt-2">
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
        </div>
      </article>

      {hasReplies ? (
        <div className="mt-[13px] grid gap-[13px]">
          {comment.replies.map((reply) => (
            <DetailCommentNode
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
    </div>
  );
}

export function PostComments({
  postId,
  initialCount,
  score,
  accessToken,
  expanded,
  onExpand,
  onCountChange
}: PostCommentsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [rootBody, setRootBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const open = expanded ?? internalOpen;
  const displayedScore = typeof score === "number" ? score + (liked ? 1 : 0) : undefined;

  const loadComments = useCallback(async (): Promise<void> => {
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
  }, [accessToken, onCountChange, postId]);

  useEffect(() => {
    if (!open || status !== "idle") return;

    void Promise.resolve().then(loadComments);
  }, [loadComments, open, status]);

  function openThread(): void {
    if (open) return;

    if (onExpand) {
      onExpand();
      return;
    }

    setInternalOpen(true);
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
      <div className={cn(
        "flex items-center gap-[25px] text-[12px] font-normal leading-[15px] text-kreis-muted",
        expanded && "h-[27px]"
      )}>
        {typeof displayedScore === "number" ? (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none transition-colors duration-150",
              liked ? "text-kreis-orange" : "text-inherit"
            )}
            type="button"
            aria-label={liked ? "Quitar like" : "Dar like"}
            aria-pressed={liked}
            onClick={(event) => {
              event.stopPropagation();
              setLiked((current) => !current);
            }}
          >
            <Heart aria-hidden="true" size={16} weight={liked ? "Bold" : "Outline"} />
            {displayedScore}
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none"
          type="button"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            openThread();
          }}
        >
          <ChatRound aria-hidden="true" size={16} weight={open ? "Bold" : "Outline"} />
          {initialCount}
        </button>
        {expanded ? (
          <button
            className="ml-auto grid size-[27px] place-items-center border-0 bg-transparent p-0 text-inherit shadow-none"
            type="button"
            aria-label="Mas opciones"
          >
            <DotsThree aria-hidden="true" size={19} weight="bold" />
          </button>
        ) : null}
      </div>

      {open ? (
        expanded ? (
          <>
            <div className="relative ml-[-52px] mt-[13px] grid gap-[14px] pt-[14px] before:pointer-events-none before:absolute before:left-[calc(var(--page-gutter)*-1)] before:top-0 before:h-px before:w-screen before:bg-kreis-line">
              {status === "loading" ? (
                <LoadingState label="Cargando comentarios" variant="inline" className="ml-12" />
              ) : null}

              {status === "error" ? (
                <button
                  className="ml-12 w-max border-0 bg-transparent p-0 text-[12px] font-medium leading-[15px] text-kreis-orange shadow-none"
                  type="button"
                  onClick={() => void loadComments()}
                >
                  Reintentar
                </button>
              ) : null}

              {error ? <p className="m-0 ml-12 text-[12px] font-medium leading-[15px] text-kreis-orange">{error}</p> : null}

              {status === "ready" && comments.length === 0 ? (
                <p className="m-0 ml-12 text-[12px] font-normal leading-[15px] text-kreis-muted">Todavia no hay comentarios.</p>
              ) : null}

              {comments.length ? (
                <div className="grid gap-[17px]">
                  {comments.map((comment) => (
                    <DetailCommentNode
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

            <DetailRootCommentForm
              value={rootBody}
              submitting={submitting}
              onChange={setRootBody}
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment(rootBody);
              }}
            />
          </>
        ) : (
          <div className="mt-3 grid gap-3 rounded-[15px] border border-kreis-line bg-kreis-event-surface p-3">
            {status === "loading" ? (
              <CommentSkeletonList />
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
              <p className="m-0 text-[0.8rem] leading-[1.4] text-kreis-muted">Todavia no hay comentarios. Podes abrir el hilo.</p>
            ) : null}

            {comments.length ? (
              <div className="grid gap-3">
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

            <CommentForm
              value={rootBody}
              placeholder="Sumate a la conversacion..."
              submitting={submitting}
              onChange={setRootBody}
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment(rootBody);
              }}
            />
          </div>
        )
      ) : null}
    </section>
  );
}
