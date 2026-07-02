import type { KreisEvent } from "../types";
import { adaptEvent, type EventSummary } from "./events";
import { bearerTokenHeaders, requestFormData, requestJson } from "./client";

type UserProfileResponse = {
  legajo: number;
  nombre: string;
  apellido: string;
  rol?: string;
  verificado?: boolean;
  avatar_url?: string | null;
  facultad: {
    nombre: string;
  };
  eventos_creados?: EventSummary[];
  eventos_anotado?: EventSummary[];
  comunidades_creadas?: unknown[];
  comunidades_miembro?: unknown[];
  topicos?: Array<{
    id_topico: string;
    topico: string;
  }>;
};

export type KreisUserProfile = {
  legajo: number;
  name: string;
  faculty: string;
  role?: string;
  verified?: boolean;
  avatarUrl?: string | null;
  topics: string[];
  createdEvents: KreisEvent[];
  stats: {
    createdEvents: number;
    enrolledEvents: number;
    createdCommunities: number;
    joinedCommunities: number;
  };
};

function countItems(items: unknown[] | undefined): number {
  return Array.isArray(items) ? items.length : 0;
}

function mapUserProfile(user: UserProfileResponse): KreisUserProfile {
  const createdEvents = user.eventos_creados?.map(adaptEvent) ?? [];

  return {
    legajo: user.legajo,
    name: `${user.nombre} ${user.apellido}`.trim(),
    faculty: user.facultad.nombre,
    role: user.rol,
    verified: user.verificado,
    avatarUrl: user.avatar_url ?? null,
    topics: user.topicos?.map((topic) => topic.topico).filter(Boolean) ?? [],
    createdEvents,
    stats: {
      createdEvents: createdEvents.length,
      enrolledEvents: countItems(user.eventos_anotado),
      createdCommunities: countItems(user.comunidades_creadas),
      joinedCommunities: countItems(user.comunidades_miembro)
    }
  };
}

export async function getMyProfile(accessToken: string, signal?: AbortSignal): Promise<KreisUserProfile> {
  const response = await requestJson<{ user: UserProfileResponse }>("/api/v1/users/me", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return mapUserProfile(response.user);
}

export async function uploadMyAvatar(accessToken: string, avatar: File): Promise<KreisUserProfile> {
  const formData = new FormData();
  formData.append("avatar", avatar);

  const response = await requestFormData<{ user: UserProfileResponse }>("/api/v1/users/me/avatar", formData, {
    headers: bearerTokenHeaders(accessToken)
  });

  return mapUserProfile(response.user);
}

export async function deleteMyAccount(
  accessToken: string,
  password: string
): Promise<void> {
  await requestJson("/api/v1/users/me", {
    method: "DELETE",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({
      password,
      confirmation: "ELIMINAR"
    })
  });
}
