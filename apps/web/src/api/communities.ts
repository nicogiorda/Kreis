import type { Community } from "../types";
import { normalize } from "../utils/text";
import { bearerTokenHeaders, requestJson } from "./client";

type CommunityTopic = {
  id_topico: string;
  topico: string;
};

type CommunityResponse = {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  miembros: number;
  joined: boolean;
  topicos: CommunityTopic[];
};

type MembershipResponse = {
  membership: {
    id_comunidad: string;
    joined: boolean;
    miembros: number;
  };
};

type CreateCommunityInput = {
  name: string;
  category: string;
  topicId?: string;
};

function getCommunityIcon(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function adaptCommunity(community: CommunityResponse): Community {
  const category = community.topicos[0]?.topico ?? "General";

  return {
    id: community.id,
    name: community.nombre,
    members: community.miembros,
    category,
    icon: getCommunityIcon(community.nombre),
    joined: community.joined,
    recommended: true,
    popular: community.miembros >= 20,
    pulse: community.estado === "Pendiente"
      ? "Pendiente de aprobacion"
      : `Conversaciones sobre ${normalize(category) || "intereses compartidos"}`,
    description: community.descripcion ?? undefined,
    status: community.estado
  };
}

export async function listCommunities(accessToken: string, signal?: AbortSignal): Promise<Community[]> {
  const response = await requestJson<{ comunidades: CommunityResponse[] }>("/api/v1/communities", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return response.comunidades.map(adaptCommunity);
}

export async function joinCommunity(
  communityId: string,
  accessToken: string
): Promise<MembershipResponse["membership"]> {
  const response = await requestJson<MembershipResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members`,
    {
      method: "POST",
      headers: bearerTokenHeaders(accessToken)
    }
  );

  return response.membership;
}

export async function leaveCommunity(
  communityId: string,
  accessToken: string
): Promise<MembershipResponse["membership"]> {
  const response = await requestJson<MembershipResponse>(
    `/api/v1/communities/${encodeURIComponent(communityId)}/members`,
    {
      method: "DELETE",
      headers: bearerTokenHeaders(accessToken)
    }
  );

  return response.membership;
}

export async function createCommunity(
  input: CreateCommunityInput,
  accessToken: string
): Promise<Community> {
  const response = await requestJson<{ comunidad: CommunityResponse }>("/api/v1/communities", {
    method: "POST",
    headers: bearerTokenHeaders(accessToken),
    body: JSON.stringify({
      nombre: input.name,
      descripcion: `Comunidad sobre ${input.category}`,
      topicos: input.topicId ? [Number(input.topicId)] : []
    })
  });

  return adaptCommunity(response.comunidad);
}
