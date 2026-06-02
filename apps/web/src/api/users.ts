import { bearerTokenHeaders, requestJson } from "./client";

type UserProfileResponse = {
  legajo: number;
  nombre: string;
  apellido: string;
  facultad: {
    nombre: string;
  };
};

export type KreisUserProfile = {
  name: string;
  faculty: string;
};

export async function getMyProfile(accessToken: string, signal?: AbortSignal): Promise<KreisUserProfile> {
  const response = await requestJson<{ user: UserProfileResponse }>("/api/v1/users/me", {
    headers: bearerTokenHeaders(accessToken),
    signal
  });

  return {
    name: `${response.user.nombre} ${response.user.apellido}`.trim(),
    faculty: response.user.facultad.nombre
  };
}
