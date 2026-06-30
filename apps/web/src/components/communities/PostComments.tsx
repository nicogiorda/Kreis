import { ChatRound, Heart } from "@solar-icons/react";
import { ArrowBendDownRight, CaretDown, DotsThree, PaperPlaneTilt } from "@phosphor-icons/react";
import { type FormEvent, type ReactNode, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { createPostComment, deletePostComment, listPostComments } from "../../api/posts";
import type { PostComment } from "../../types";
import { CommentSkeletonList } from "../common/LoadingSkeleton";
import { LoadingState } from "../common/LoadingState";
import { cn } from "../../utils/cn";
import { ReportContentSheet, type ReportTarget } from "./ReportContentSheet";

type PostCommentsProps = {
  postId: string;
  initialCount: number;
  score?: number;
  accessToken: string;
  expanded?: boolean;
  isOwnPost?: boolean;
  onExpand?: () => void;
  onPostDeleted?: (postId: string) => void | Promise<void>;
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
  onReport: (commentId: string, isOwn: boolean) => void;
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
  keyboardOpen,
  onChange,
  onSubmit
}: {
  value: string;
  submitting: boolean;
  keyboardOpen?: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasValue = value.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 38), 120)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  return (
    <form
      className="post-detail-composer"
      data-keyboard-open={keyboardOpen ? "true" : "false"}
      onSubmit={onSubmit}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="post-detail-composer-input"
          aria-label="Escribir comentario"
          maxLength={2000}
          placeholder="Unite a la conversacion"
          rows={1}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            window.requestAnimationFrame(() => {
              resizeTextarea();
            });
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
  onReplySubmit,
  onReport
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
          <div className="mt-1.5 flex items-center">
            <button
              className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[0.72rem] font-black text-kreis-muted shadow-none"
              type="button"
              onClick={() => isReplying ? onReplyCancel() : onReplyStart(comment.id)}
            >
              <ArrowBendDownRight aria-hidden="true" size={14} weight="bold" />
              Responder
            </button>
            <button
              className="ml-auto grid size-8 place-items-center border-0 bg-transparent p-0 text-kreis-muted shadow-none transition-transform duration-150 active:scale-95"
              type="button"
              aria-label={`Opciones del comentario de ${comment.author.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onReport(comment.id, comment.isOwn);
              }}
            >
              <DotsThree aria-hidden="true" size={18} weight="bold" />
            </button>
          </div>
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
              onReport={onReport}
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
  onReplyCancel,
  onReport
}: {
  comment: PostComment;
  isReplying: boolean;
  onReplyStart: (commentId: string) => void;
  onReplyCancel: () => void;
  onReport: (commentId: string, isOwn: boolean) => void;
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
        aria-label={`Opciones del comentario de ${comment.author.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onReport(comment.id, comment.isOwn);
        }}
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
  onReplySubmit,
  onReport
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

      <article className="relative grid w-full min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-2">
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
            onReport={onReport}
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
              onReport={onReport}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PostCommentThread = ReturnType<typeof usePostCommentThread>;

type PostCommentThreadState = {
  postId: string;
  status: "idle" | "loading" | "ready" | "error";
  comments: PostComment[];
  rootBody: string;
  replyingTo: string | null;
  replyBody: string;
  submitting: boolean;
  error: string | null;
  liked: boolean;
};

function createInitialThreadState(postId: string): PostCommentThreadState {
  return {
    postId,
    status: "idle",
    comments: [],
    rootBody: "",
    replyingTo: null,
    replyBody: "",
    submitting: false,
    error: null,
    liked: false
  };
}

function usePostCommentThread({
  postId,
  accessToken,
  active,
  onCountChange
}: {
  postId: string;
  accessToken: string;
  active: boolean;
  onCountChange: (postId: string, total: number) => void;
}) {
  const [threadState, setThreadState] = useState<PostCommentThreadState>(() => createInitialThreadState(postId));
  const currentThread = threadState.postId === postId ? threadState : createInitialThreadState(postId);

  const updateThread = useCallback((updater: (current: PostCommentThreadState) => PostCommentThreadState): void => {
    setThreadState((current) => updater(current.postId === postId ? current : createInitialThreadState(postId)));
  }, [postId]);

  const updateCurrentThread = useCallback((targetPostId: string, patch: Partial<PostCommentThreadState>): void => {
    setThreadState((current) => current.postId === targetPostId ? { ...current, ...patch } : current);
  }, []);

  const setRootBody = useCallback((value: string): void => {
    updateThread((current) => ({ ...current, rootBody: value }));
  }, [updateThread]);

  const setReplyBody = useCallback((value: string): void => {
    updateThread((current) => ({ ...current, replyBody: value }));
  }, [updateThread]);

  const setLiked = useCallback((value: SetStateAction<boolean>): void => {
    updateThread((current) => ({
      ...current,
      liked: typeof value === "function" ? value(current.liked) : value
    }));
  }, [updateThread]);

  const loadComments = useCallback(async (): Promise<void> => {
    if (!postId) return;

    updateThread((current) => ({
      ...current,
      status: "loading",
      error: null
    }));

    try {
      const result = await listPostComments(postId, accessToken);
      updateCurrentThread(postId, {
        comments: result.comments,
        status: "ready"
      });
      onCountChange(postId, result.total);
    } catch (loadError) {
      updateCurrentThread(postId, {
        error: loadError instanceof Error ? loadError.message : "No pudimos cargar los comentarios.",
        status: "error"
      });
    }
  }, [accessToken, onCountChange, postId, updateCurrentThread, updateThread]);

  useEffect(() => {
    if (!active || !postId || currentThread.status !== "idle") return;

    void Promise.resolve().then(loadComments);
  }, [active, currentThread.status, loadComments, postId]);

  function startReply(commentId: string): void {
    updateThread((current) => ({
      ...current,
      replyingTo: commentId,
      replyBody: "",
      error: null
    }));
  }

  function cancelReply(): void {
    updateThread((current) => ({
      ...current,
      replyingTo: null,
      replyBody: ""
    }));
  }

  async function submitComment(body: string, parentId?: string): Promise<void> {
    if (!body.trim() || !postId) return;

    updateThread((current) => ({
      ...current,
      submitting: true,
      error: null
    }));

    try {
      const result = await createPostComment(postId, body.trim(), accessToken, parentId);

      setThreadState((current) => {
        if (current.postId !== postId) return current;

        return {
          ...current,
          comments: parentId
            ? insertReply(current.comments, parentId, result.comment)
            : [...current.comments, result.comment],
          rootBody: "",
          replyingTo: null,
          replyBody: "",
          status: "ready"
        };
      });
      onCountChange(postId, result.total);
    } catch (submitError) {
      updateCurrentThread(postId, {
        error: submitError instanceof Error ? submitError.message : "No pudimos publicar el comentario."
      });
    } finally {
      updateCurrentThread(postId, {
        submitting: false
      });
    }
  }

  return {
    status: currentThread.status,
    comments: currentThread.comments,
    rootBody: currentThread.rootBody,
    replyingTo: currentThread.replyingTo,
    replyBody: currentThread.replyBody,
    submitting: currentThread.submitting,
    error: currentThread.error,
    liked: currentThread.liked,
    setRootBody,
    setReplyBody,
    setLiked,
    loadComments,
    startReply,
    cancelReply,
    submitComment
  };
}

export function PostDetailCommentsContent({
  initialCount,
  score,
  thread,
  onReportPost,
  onReportComment
}: {
  initialCount: number;
  score?: number;
  thread: PostCommentThread;
  onReportPost: () => void;
  onReportComment: (commentId: string, isOwn: boolean) => void;
}) {
  const displayedScore = typeof score === "number" ? score + (thread.liked ? 1 : 0) : undefined;

  return (
    <section className="mt-[12px]">
      <div className="flex h-[27px] items-center gap-[25px] text-[12px] font-normal leading-[15px] text-kreis-muted">
        {typeof displayedScore === "number" ? (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit shadow-none transition-colors duration-150",
              thread.liked ? "text-kreis-orange" : "text-inherit"
            )}
            type="button"
            aria-label={thread.liked ? "Quitar like" : "Dar like"}
            aria-pressed={thread.liked}
            onClick={() => thread.setLiked((current) => !current)}
          >
            <Heart aria-hidden="true" size={16} weight={thread.liked ? "Bold" : "Outline"} />
            {displayedScore}
          </button>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <ChatRound aria-hidden="true" size={16} weight="Bold" />
          {initialCount}
        </span>
        <button
          className="ml-auto grid size-[27px] place-items-center border-0 bg-transparent p-0 text-inherit shadow-none"
          type="button"
          aria-label="Opciones de la publicacion"
          onClick={onReportPost}
        >
          <DotsThree aria-hidden="true" size={19} weight="bold" />
        </button>
      </div>

      <div className="relative mt-[13px] grid gap-[14px] border-t border-kreis-line pt-[14px]">
        {thread.status === "loading" ? (
          <LoadingState label="Cargando comentarios" variant="inline" className="ml-12" />
        ) : null}

        {thread.status === "error" ? (
          <button
            className="ml-12 w-max border-0 bg-transparent p-0 text-[12px] font-medium leading-[15px] text-kreis-orange shadow-none"
            type="button"
            onClick={() => void thread.loadComments()}
          >
            Reintentar
          </button>
        ) : null}

        {thread.error ? <p className="m-0 ml-12 text-[12px] font-medium leading-[15px] text-kreis-orange">{thread.error}</p> : null}

        {thread.status === "ready" && thread.comments.length === 0 ? (
          <p className="m-0 ml-12 text-[12px] font-normal leading-[15px] text-kreis-muted">Todavia no hay comentarios.</p>
        ) : null}

        {thread.comments.length ? (
          <div className="grid gap-[17px]">
            {thread.comments.map((comment) => (
              <DetailCommentNode
                comment={comment}
                depth={0}
                key={comment.id}
                replyingTo={thread.replyingTo}
                replyBody={thread.replyBody}
                submitting={thread.submitting}
                onReplyStart={thread.startReply}
                onReplyCancel={thread.cancelReply}
                onReplyBodyChange={thread.setReplyBody}
                onReport={onReportComment}
                onReplySubmit={(event, parentId) => {
                  event.preventDefault();
                  void thread.submitComment(thread.replyBody, parentId);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PostDetailCommentComposer({
  thread,
  keyboardOpen
}: {
  thread: PostCommentThread;
  keyboardOpen: boolean;
}) {
  return (
    <DetailRootCommentForm
      keyboardOpen={keyboardOpen}
      value={thread.rootBody}
      submitting={thread.submitting}
      onChange={thread.setRootBody}
      onSubmit={(event) => {
        event.preventDefault();
        void thread.submitComment(thread.rootBody);
      }}
    />
  );
}

export function PostDetailCommentsLayout({
  postId,
  initialCount,
  score,
  accessToken,
  active,
  keyboardOpen,
  isOwnPost = false,
  onCountChange,
  onPostDeleted,
  children
}: {
  postId: string;
  initialCount: number;
  score?: number;
  accessToken: string;
  active: boolean;
  keyboardOpen: boolean;
  isOwnPost?: boolean;
  onCountChange: (postId: string, total: number) => void;
  onPostDeleted?: (postId: string) => void | Promise<void>;
  children: (parts: { comments: ReactNode; composer: ReactNode }) => ReactNode;
}) {
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const thread = usePostCommentThread({
    postId,
    accessToken,
    active,
    onCountChange
  });

  async function handleCommentDeleted(commentId: string): Promise<void> {
    await deletePostComment(postId, commentId, accessToken);
    await thread.loadComments();
  }

  return (
    <>
      {children({
        comments: (
          <PostDetailCommentsContent
            initialCount={initialCount}
            score={score}
            thread={thread}
            onReportPost={() => setReportTarget({ type: "Post", id: postId })}
            onReportComment={(commentId, isOwn) => setReportTarget({
              type: "Comentario",
              id: commentId,
              isOwn
            })}
          />
        ),
        composer: (
          <PostDetailCommentComposer
            keyboardOpen={keyboardOpen}
            thread={thread}
          />
        )
      })}
      <ReportContentSheet
        accessToken={accessToken}
        canDeletePost={isOwnPost && reportTarget?.type === "Post"}
        key={reportTarget ? `${reportTarget.type}-${reportTarget.id}` : "closed"}
        target={reportTarget}
        onCommentDeleted={handleCommentDeleted}
        onPostDeleted={onPostDeleted}
        onClose={() => setReportTarget(null)}
      />
    </>
  );
}

export function PostComments({
  postId,
  initialCount,
  score,
  accessToken,
  expanded,
  isOwnPost = false,
  onExpand,
  onPostDeleted,
  onCountChange
}: PostCommentsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const open = expanded ?? internalOpen;
  const thread = usePostCommentThread({
    postId,
    accessToken,
    active: open,
    onCountChange
  });

  async function handleCommentDeleted(commentId: string): Promise<void> {
    await deletePostComment(postId, commentId, accessToken);
    await thread.loadComments();
  }
  const displayedScore = typeof score === "number" ? score + (thread.liked ? 1 : 0) : undefined;

  function openThread(): void {
    if (open) return;

    if (onExpand) {
      onExpand();
      return;
    }

    setInternalOpen(true);
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
              thread.liked ? "text-kreis-orange" : "text-inherit"
            )}
            type="button"
            aria-label={thread.liked ? "Quitar like" : "Dar like"}
            aria-pressed={thread.liked}
            onClick={(event) => {
              event.stopPropagation();
              thread.setLiked((current) => !current);
            }}
          >
            <Heart aria-hidden="true" size={16} weight={thread.liked ? "Bold" : "Outline"} />
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
            aria-label="Opciones de la publicacion"
            onClick={(event) => {
              event.stopPropagation();
              setReportTarget({ type: "Post", id: postId });
            }}
          >
            <DotsThree aria-hidden="true" size={19} weight="bold" />
          </button>
        ) : null}
      </div>

      {open ? (
        expanded ? (
          <>
            <div className="relative mt-[13px] grid gap-[14px] border-t border-kreis-line pt-[14px]">
              {thread.status === "loading" ? (
                <LoadingState label="Cargando comentarios" variant="inline" className="ml-12" />
              ) : null}

              {thread.status === "error" ? (
                <button
                  className="ml-12 w-max border-0 bg-transparent p-0 text-[12px] font-medium leading-[15px] text-kreis-orange shadow-none"
                  type="button"
                  onClick={() => void thread.loadComments()}
                >
                  Reintentar
                </button>
              ) : null}

              {thread.error ? <p className="m-0 ml-12 text-[12px] font-medium leading-[15px] text-kreis-orange">{thread.error}</p> : null}

              {thread.status === "ready" && thread.comments.length === 0 ? (
                <p className="m-0 ml-12 text-[12px] font-normal leading-[15px] text-kreis-muted">Todavia no hay comentarios.</p>
              ) : null}

              {thread.comments.length ? (
                <div className="grid gap-[17px]">
                  {thread.comments.map((comment) => (
                    <DetailCommentNode
                      comment={comment}
                      depth={0}
                      key={comment.id}
                      replyingTo={thread.replyingTo}
                      replyBody={thread.replyBody}
                      submitting={thread.submitting}
                      onReplyStart={thread.startReply}
                      onReplyCancel={thread.cancelReply}
                      onReplyBodyChange={thread.setReplyBody}
                      onReport={(commentId, isOwn) => setReportTarget({
                        type: "Comentario",
                        id: commentId,
                        isOwn
                      })}
                      onReplySubmit={(event, parentId) => {
                        event.preventDefault();
                        void thread.submitComment(thread.replyBody, parentId);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <DetailRootCommentForm
              value={thread.rootBody}
              submitting={thread.submitting}
              onChange={thread.setRootBody}
              onSubmit={(event) => {
                event.preventDefault();
                void thread.submitComment(thread.rootBody);
              }}
            />
          </>
        ) : (
          <div className="mt-3 grid gap-3 rounded-[15px] border border-kreis-line bg-kreis-event-surface p-3">
            {thread.status === "loading" ? (
              <CommentSkeletonList />
            ) : null}

            {thread.status === "error" ? (
              <button
                className="w-max border-0 bg-transparent p-0 text-[0.78rem] font-black text-kreis-orange shadow-none"
                type="button"
                onClick={() => void thread.loadComments()}
              >
                Reintentar
              </button>
            ) : null}

            {thread.error ? <p className="m-0 text-[0.78rem] font-bold leading-[1.35] text-kreis-orange">{thread.error}</p> : null}

            {thread.status === "ready" && thread.comments.length === 0 ? (
              <p className="m-0 text-[0.8rem] leading-[1.4] text-kreis-muted">Todavia no hay comentarios. Podes abrir el hilo.</p>
            ) : null}

            {thread.comments.length ? (
              <div className="grid gap-3">
                {thread.comments.map((comment) => (
                  <CommentNode
                    comment={comment}
                    depth={0}
                    key={comment.id}
                    replyingTo={thread.replyingTo}
                    replyBody={thread.replyBody}
                    submitting={thread.submitting}
                    onReplyStart={thread.startReply}
                    onReplyCancel={thread.cancelReply}
                    onReplyBodyChange={thread.setReplyBody}
                    onReport={(commentId, isOwn) => setReportTarget({
                      type: "Comentario",
                      id: commentId,
                      isOwn
                    })}
                    onReplySubmit={(event, parentId) => {
                      event.preventDefault();
                      void thread.submitComment(thread.replyBody, parentId);
                    }}
                  />
                ))}
              </div>
            ) : null}

            <CommentForm
              value={thread.rootBody}
              placeholder="Sumate a la conversacion..."
              submitting={thread.submitting}
              onChange={thread.setRootBody}
              onSubmit={(event) => {
                event.preventDefault();
                void thread.submitComment(thread.rootBody);
              }}
            />
          </div>
        )
      ) : null}
      <ReportContentSheet
        accessToken={accessToken}
        canDeletePost={isOwnPost && reportTarget?.type === "Post"}
        key={reportTarget ? `${reportTarget.type}-${reportTarget.id}` : "closed"}
        target={reportTarget}
        onCommentDeleted={handleCommentDeleted}
        onPostDeleted={onPostDeleted}
        onClose={() => setReportTarget(null)}
      />
    </section>
  );
}
