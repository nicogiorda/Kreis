export type ID = string;

export type ISODateTime = string;

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: {
    limit: number;
    offset: number;
    total?: number;
  };
};

export type UserDTO = {
  id: ID;
  name: string;
  career?: string;
  photoUrl?: string;
};

export type EventDTO = {
  id: ID;
  title: string;
  startsAt: ISODateTime;
  place: string;
  category: string;
  description: string;
  official: boolean;
  interested: boolean;
};

export type CommunityDTO = {
  id: ID;
  name: string;
  category: string;
  icon: string;
  members: number;
  joined: boolean;
  recommended: boolean;
  popular: boolean;
  pulse: string;
  description?: string;
};

export type PostDTO = {
  id: ID;
  communityId: ID;
  author: UserDTO;
  title: string;
  text: string;
  score: number;
  comments: number;
  createdAt: ISODateTime;
};

export type CreateCommunityRequest = {
  name: string;
  category: string;
};

export type CreateEventRequest = {
  title: string;
  startsAt: ISODateTime;
  place: string;
  category: string;
  description: string;
};

export type CreatePostRequest = {
  communityId: ID;
  text: string;
};

export type HomeFeedResponse = {
  events: EventDTO[];
  recommendedCommunities: CommunityDTO[];
  popularCommunities: CommunityDTO[];
};
