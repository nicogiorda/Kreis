export type Screen = "home" | "events" | "communities" | "profile";

export type ThemeMode = "light" | "dark";

export type HomeTab = "events" | "communities";

export type ComposerMode = "post" | "community" | "event";

export type EventTone = "orange" | "green" | "beige" | "pumpkin";

export type EventCategory = "Todos" | string;

export type EventLoadStatus = "loading" | "ready" | "error";

export type CommunityCategory = "Todos" | string;

export type KreisTopic = {
  id: string;
  name: string;
};

export type KreisEvent = {
  id: string;
  title: string;
  date: string;
  day: string;
  month: string;
  place: string;
  category: string;
  topics: KreisTopic[];
  icon: string;
  tone: EventTone;
  interested: boolean;
  description: string;
  detailDescription?: string;
  time?: string;
  organizer?: string;
  official?: boolean;
  imageUrl?: string;
};

export type Community = {
  id: string;
  name: string;
  members: number;
  category: string;
  topics?: KreisTopic[];
  icon: string;
  joined: boolean;
  recommended: boolean;
  popular: boolean;
  pulse: string;
  description?: string;
  status?: string;
};

export type ActivityPost = {
  id: string;
  communityId: string;
  communityName: string;
  icon: string;
  author: string;
  authorAvatarUrl?: string | null;
  time: string;
  title: string;
  text: string;
  score: number;
  comments: number;
};

export type PostComment = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: {
    legajo: number;
    name: string;
  };
  replies: PostComment[];
};

export type Profile = {
  name: string;
  career: string;
  photo: string;
};

export type CreateCommunityInput = {
  name: string;
  description: string;
  topicIds: string[];
};

export type CreateEventInput = {
  title: string;
  date: string;
  place: string;
  topicIds: string[];
  description: string;
  coverFile?: File;
};

export type CreatePostInput = {
  communityId: string;
  postText: string;
};
