import { prisma } from "../../../core/database";
import { normalizeCertificateName } from "../domain/certificate-verification";

const facultyAliases = [
  {
    sigla: "FADI",
    aliases: [
      "facultad de arquitectura y diseno",
      "arquitectura y diseno"
    ]
  },
  {
    sigla: "FACE",
    aliases: [
      "facultad de ciencias economicas",
      "ciencias economicas"
    ]
  },
  {
    sigla: "FACO",
    aliases: [
      "facultad de comunicacion",
      "comunicacion"
    ]
  },
  {
    sigla: "FAIN",
    aliases: [
      "facultad de ingenieria y ciencias exactas",
      "ingenieria y ciencias exactas"
    ]
  },
  {
    sigla: "FAJU",
    aliases: [
      "facultad de ciencias juridicas y sociales",
      "ciencias juridicas y sociales"
    ]
  },
  {
    sigla: "FASA",
    aliases: [
      "facultad de ciencias de la salud",
      "ciencias de la salud"
    ]
  }
] as const;

export type ResolvedCertificateFaculty = {
  id_facultad: number;
  nombre: string;
  sigla: string;
  nombre_detectado: string;
};

function normalizeFacultyName(value: string): string {
  return normalizeCertificateName(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFacultyAlias(facultyName: string): (typeof facultyAliases)[number] | null {
  const normalized = normalizeFacultyName(facultyName);

  return facultyAliases.find((faculty) => {
    const normalizedSigla = normalizeFacultyName(faculty.sigla);

    if (normalized === normalizedSigla) return true;

    return faculty.aliases.some((alias) => {
      const normalizedAlias = normalizeFacultyName(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias);
    });
  }) ?? null;
}

export async function resolveCertificateFaculty(
  facultyName: string | null | undefined
): Promise<ResolvedCertificateFaculty | null> {
  if (!facultyName) return null;

  const alias = findFacultyAlias(facultyName);
  if (!alias) return null;

  const faculties = await prisma.facultad.findMany({
    select: {
      id_facultad: true,
      nombre: true
    }
  });
  const matchedFaculty = faculties.find((faculty) => {
    const normalizedName = normalizeFacultyName(faculty.nombre);
    return normalizedName === normalizeFacultyName(alias.sigla)
      || alias.aliases.some((knownAlias) => normalizedName === normalizeFacultyName(knownAlias));
  });

  if (!matchedFaculty) return null;

  return {
    id_facultad: Number(matchedFaculty.id_facultad),
    nombre: matchedFaculty.nombre,
    sigla: alias.sigla,
    nombre_detectado: facultyName
  };
}