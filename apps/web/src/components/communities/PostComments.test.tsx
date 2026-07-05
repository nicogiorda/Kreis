import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PostLikeState } from "../../api/posts";
import { PostComments } from "./PostComments";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function renderPostLike({
  initialLiked = false,
  score = 4,
  onLikeToggle
}: {
  initialLiked?: boolean;
  score?: number;
  onLikeToggle: (postId: string) => Promise<PostLikeState>;
}) {
  return render(
    <PostComments
      accessToken="token"
      expanded={false}
      initialCount={0}
      initialLiked={initialLiked}
      onCountChange={vi.fn()}
      onLikeToggle={onLikeToggle}
      postId="15"
      score={score}
    />
  );
}

describe("PostComments likes", () => {
  it("updates optimistically and reconciles the server response", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<PostLikeState>();
    const onLikeToggle = vi.fn(() => deferred.promise);
    renderPostLike({ onLikeToggle });

    await user.click(screen.getByRole("button", { name: "Dar like" }));

    expect(onLikeToggle).toHaveBeenCalledWith("15");
    expect(screen.getByRole("button", { name: "Quitar like" })).toBeDisabled();
    expect(screen.getByText("5")).toBeInTheDocument();

    deferred.resolve({ liked: true, likesCount: 6 });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Quitar like" })).toBeEnabled();
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  it("rolls back the optimistic state when the request fails", async () => {
    const user = userEvent.setup();
    const deferred = createDeferred<PostLikeState>();
    renderPostLike({ onLikeToggle: () => deferred.promise });

    await user.click(screen.getByRole("button", { name: "Dar like" }));
    expect(screen.getByText("5")).toBeInTheDocument();

    deferred.reject(new Error("network error"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dar like" })).toBeEnabled();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });
});
