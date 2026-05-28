export type Screen = "home" | "events" | "communities" | "profile";

export type ThemeMode = "light" | "dark";

export type HomeTab = "events" | "communities";

export type ComposerMode = "post" | "community" | "event";

export type EventTone = "orange" | "green" | "beige" | "pumpkin";

export type EventCategory = "Todos" | string;

export type CommunityCategory = "Todos" | string;

export type KreisEvent = {
  id: string;
  title: string;
  date: string;
  day: string;
  month: string;
  place: string;
  category: string;
  icon: string;
  tone: EventTone;
  interested: boolean;
  description: string;
  detailDescription?: string;
  imageUrl?: string;
  time?: string;
  organizer?: string;
  official?: boolean;
};

export type Community = {
  id: string;
  name: string;
  members: number;
  category: string;
  icon: string;
  joined: boolean;
  recommended: boolean;
  popular: boolean;
  pulse: string;
  description?: string;
};

export type ActivityPost = {
  id: string;
  communityId: string;
  communityName: string;
  icon: string;
  author: string;
  time: string;
  title: string;
  text: string;
  score: number;
  comments: number;
};

export type Profile = {
  name: string;
  career: string;
  photo: string;
};

export type CreateCommunityInput = {
  name: string;
  category: string;
};

export type CreateEventInput = {
  title: string;
  date: string;
  place: string;
  category: string;
  description: string;
};

export type CreatePostInput = {
  communityId: string;
  postText: string;
};
