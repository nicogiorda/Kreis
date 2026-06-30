import { prisma } from "../../../core/database";

export type TipoReporte = "Post" | "Comentario";
export type EstadoReporte = "Pendiente" | "Desestimado" | "Resuelto";

const reporteUsuarioSelect = {
  legajo: true,
  nombre: true,
  apellido: true,
  avatar_url: true
} as const;

const reporteComunidadSelect = {
  id_comunidad: true,
  nombre: true
} as const;

const reporteInclude = {
  reportante: {
    select: reporteUsuarioSelect
  },
  moderador: {
    select: reporteUsuarioSelect
  },
  post: {
    select: {
      id_post: true,
      cuerpo: true,
      created_at: true,
      usuario: {
        select: reporteUsuarioSelect
      },
      comunidad: {
        select: reporteComunidadSelect
      }
    }
  },
  comentario: {
    select: {
      id_comentario: true,
      id_post: true,
      id_padre: true,
      cuerpo: true,
      created_at: true,
      usuario: {
        select: reporteUsuarioSelect
      },
      post: {
        select: {
          id_post: true,
          comunidad: {
            select: reporteComunidadSelect
          }
        }
      }
    }
  }
} as const;

type ReporteSinSnapshots = Awaited<ReturnType<typeof listarReportesSinSnapshots>>[number];
type ReporteUsuarioSnapshot = Awaited<ReturnType<typeof buscarUsuariosSnapshot>>[number];
type ReporteComunidadSnapshot = Awaited<ReturnType<typeof buscarComunidadesSnapshot>>[number];

export type ReporteConRelaciones = ReporteSinSnapshots & {
  autorSnapshot: ReporteUsuarioSnapshot | null;
  comunidadSnapshot: ReporteComunidadSnapshot | null;
};

export type CrearReporteResult =
  | { estado: "creado"; reporte: ReporteConRelaciones }
  | { estado: "duplicado"; reporte: ReporteConRelaciones }
  | { estado: "objetivo_no_encontrado" };

export async function findUserByAuthId(authId: string): Promise<{ legajo: number; rol: string } | null> {
  return prisma.usuario.findUnique({
    where: { auth_id: authId },
    select: { legajo: true, rol: true }
  });
}

function uniqueNonNull<T>(values: Array<T | null | undefined>): T[] {
  return Array.from(new Set(values.filter((value): value is T => value !== null && value !== undefined)));
}

async function buscarUsuariosSnapshot(legajos: number[]) {
  if (legajos.length === 0) return [];

  return prisma.usuario.findMany({
    where: {
      legajo: {
        in: legajos
      }
    },
    select: reporteUsuarioSelect
  });
}

async function buscarComunidadesSnapshot(ids: bigint[]) {
  if (ids.length === 0) return [];

  return prisma.comunidad.findMany({
    where: {
      id_comunidad: {
        in: ids
      }
    },
    select: reporteComunidadSelect
  });
}

async function enriquecerReportes(reportes: ReporteSinSnapshots[]): Promise<ReporteConRelaciones[]> {
  const legajos = uniqueNonNull(reportes.map((reporte) => reporte.autor_legajo));
  const idsComunidad = uniqueNonNull(reportes.map((reporte) => reporte.id_comunidad));
  const [usuarios, comunidades] = await Promise.all([
    buscarUsuariosSnapshot(legajos),
    buscarComunidadesSnapshot(idsComunidad)
  ]);
  const usuariosPorLegajo = new Map(usuarios.map((usuario) => [usuario.legajo, usuario]));
  const comunidadesPorId = new Map(comunidades.map((comunidad) => [comunidad.id_comunidad.toString(), comunidad]));

  return reportes.map((reporte) => ({
    ...reporte,
    autorSnapshot: reporte.autor_legajo !== null ? usuariosPorLegajo.get(reporte.autor_legajo) ?? null : null,
    comunidadSnapshot: reporte.id_comunidad !== null ? comunidadesPorId.get(reporte.id_comunidad.toString()) ?? null : null
  }));
}

async function enriquecerReporte(reporte: ReporteSinSnapshots | null): Promise<ReporteConRelaciones | null> {
  if (!reporte) return null;

  const [enriquecido] = await enriquecerReportes([reporte]);
  return enriquecido ?? null;
}

async function listarReportesSinSnapshots(filters: {
  estado?: EstadoReporte;
  tipoReporte?: TipoReporte;
} = {}) {
  return prisma.reporte.findMany({
    where: {
      estado: filters.estado,
      tipo_reporte: filters.tipoReporte
    },
    include: reporteInclude,
    orderBy: {
      created_at: "desc"
    }
  });
}

async function buscarReporteExistente(
  legajoReportante: number,
  tipoReporte: TipoReporte,
  idObjetivo: bigint
): Promise<ReporteConRelaciones | null> {
  const reporte = await prisma.reporte.findFirst({
    where:
      tipoReporte === "Post"
        ? { tipo_reporte: "Post", id_post: idObjetivo, legajo_reportante: legajoReportante }
        : { tipo_reporte: "Comentario", id_comentario: idObjetivo, legajo_reportante: legajoReportante },
    include: reporteInclude
  });

  return enriquecerReporte(reporte);
}

async function buscarSnapshotObjetivo(
  tipoReporte: TipoReporte,
  idObjetivo: bigint
): Promise<{ contenido_reportado: string; autor_legajo: number; id_comunidad: bigint } | null> {
  if (tipoReporte === "Post") {
    const post = await prisma.post.findUnique({
      where: { id_post: idObjetivo },
      select: {
        cuerpo: true,
        legajo: true,
        id_comunidad: true
      }
    });

    if (!post) return null;

    return {
      contenido_reportado: post.cuerpo,
      autor_legajo: post.legajo,
      id_comunidad: post.id_comunidad
    };
  }

  const comentario = await prisma.comentario.findUnique({
    where: { id_comentario: idObjetivo },
    select: {
      cuerpo: true,
      legajo: true,
      post: {
        select: {
          id_comunidad: true
        }
      }
    }
  });

  if (!comentario) return null;

  return {
    contenido_reportado: comentario.cuerpo,
    autor_legajo: comentario.legajo,
    id_comunidad: comentario.post.id_comunidad
  };
}

export async function crearReporte(
  legajoReportante: number,
  input: { tipoReporte: TipoReporte; idObjetivo: bigint; motivo: string }
): Promise<CrearReporteResult> {
  const existente = await buscarReporteExistente(legajoReportante, input.tipoReporte, input.idObjetivo);

  if (existente) {
    return { estado: "duplicado", reporte: existente };
  }

  const snapshot = await buscarSnapshotObjetivo(input.tipoReporte, input.idObjetivo);

  if (!snapshot) {
    return { estado: "objetivo_no_encontrado" };
  }

  try {
    const reporte = await prisma.reporte.create({
      data: {
        tipo_reporte: input.tipoReporte,
        id_post: input.tipoReporte === "Post" ? input.idObjetivo : null,
        id_comentario: input.tipoReporte === "Comentario" ? input.idObjetivo : null,
        legajo_reportante: legajoReportante,
        motivo: input.motivo,
        contenido_reportado: snapshot.contenido_reportado,
        autor_legajo: snapshot.autor_legajo,
        id_comunidad: snapshot.id_comunidad
      },
      include: reporteInclude
    });
    const reporteEnriquecido = await enriquecerReporte(reporte);

    if (!reporteEnriquecido) {
      throw new Error("No se pudo enriquecer el reporte creado");
    }

    return { estado: "creado", reporte: reporteEnriquecido };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const duplicado = await buscarReporteExistente(legajoReportante, input.tipoReporte, input.idObjetivo);

      if (duplicado) {
        return { estado: "duplicado", reporte: duplicado };
      }
    }

    throw error;
  }
}

export async function listarReportes(filters: {
  estado?: EstadoReporte;
  tipoReporte?: TipoReporte;
} = {}) {
  const reportes = await listarReportesSinSnapshots(filters);
  return enriquecerReportes(reportes);
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as { code: string }).code === "P2025";
}

export async function actualizarEstadoReporte(
  id_reporte: bigint,
  estado: EstadoReporte,
  resueltoPor: number
): Promise<ReporteConRelaciones[] | null> {
  const reportes = await prisma.$transaction(async (tx) => {
    const existente = await tx.reporte.findUnique({
      where: { id_reporte },
      include: reporteInclude
    });

    if (!existente) return null;
    if (existente.estado !== "Pendiente" && estado !== "Pendiente") {
      return [existente];
    }

    const sameTargetFilter = existente.tipo_reporte === "Post" && existente.id_post
      ? {
          tipo_reporte: "Post" as const,
          id_post: existente.id_post
        }
      : existente.tipo_reporte === "Comentario" && existente.id_comentario
        ? {
            tipo_reporte: "Comentario" as const,
            id_comentario: existente.id_comentario
          }
        : null;
    const shouldCloseCase = existente.estado === "Pendiente"
      && estado !== "Pendiente"
      && sameTargetFilter !== null;
    const reportsToUpdate = shouldCloseCase
      ? await tx.reporte.findMany({
          where: {
            ...sameTargetFilter,
            estado: "Pendiente"
          },
          select: {
            id_reporte: true
          }
        })
      : [{ id_reporte }];
    const reportIds = reportsToUpdate.map((report) => report.id_reporte);
    const resolvedAt = estado === "Pendiente" ? null : new Date();

    await tx.reporte.updateMany({
      where: {
        id_reporte: {
          in: reportIds
        }
      },
      data: {
        estado,
        resuelto_at: resolvedAt,
        resuelto_por: estado === "Pendiente" ? null : resueltoPor
      }
    });

    if (estado === "Resuelto") {
      try {
        if (existente.tipo_reporte === "Post" && existente.id_post) {
          await tx.post.delete({ where: { id_post: existente.id_post } });
        }

        if (existente.tipo_reporte === "Comentario" && existente.id_comentario) {
          await tx.comentario.delete({ where: { id_comentario: existente.id_comentario } });
        }
      } catch (error) {
        if (!isRecordNotFound(error)) throw error;
      }
    }

    return tx.reporte.findMany({
      where: {
        id_reporte: {
          in: reportIds
        }
      },
      include: reporteInclude
    });
  });

  return reportes ? enriquecerReportes(reportes) : null;
}
