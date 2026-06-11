import type { Community, ComposerMode, CreateCommunityInput, CreateEventInput, CreatePostInput, KreisTopic } from "../../types";
import { CreateCommunityScreen } from "../communities/CreateCommunityScreen";
import { CreatePostScreen } from "../communities/CreatePostScreen";
import { CreateEventScreen } from "../events/CreateEventScreen";

type ComposerModalProps = {
  open: boolean;
  mode: ComposerMode;
  communities: Community[];
  eventTopics: KreisTopic[];
  eventTopicsStatus: "loading" | "ready" | "error";
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetryEventTopics: () => void;
  onCreateCommunity: (input: CreateCommunityInput) => void;
  onCreateEvent: (input: CreateEventInput) => void;
  onCreatePost: (input: CreatePostInput) => void;
};

export function ComposerModal({ open, mode, communities, eventTopics, eventTopicsStatus, submitting = false, error, onClose, onRetryEventTopics, onCreateCommunity, onCreateEvent, onCreatePost }: ComposerModalProps) {
  if (!open) return null;

  if (mode === "event") {
    return (
      <CreateEventScreen
        topics={eventTopics}
        topicsStatus={eventTopicsStatus}
        submitting={submitting}
        error={error}
        onClose={onClose}
        onRetryTopics={onRetryEventTopics}
        onCreateEvent={onCreateEvent}
      />
    );
  }

  if (mode === "community") {
    return (
      <CreateCommunityScreen
        topics={eventTopics}
        topicsStatus={eventTopicsStatus}
        submitting={submitting}
        error={error}
        onClose={onClose}
        onRetryTopics={onRetryEventTopics}
        onCreateCommunity={onCreateCommunity}
      />
    );
  }

  return (
    <CreatePostScreen
      communities={communities}
      submitting={submitting}
      error={error}
      onClose={onClose}
      onCreatePost={onCreatePost}
    />
  );
}
