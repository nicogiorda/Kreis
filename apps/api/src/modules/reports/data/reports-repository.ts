import { prisma } from "../../../core/database";

export type TipoReporte = "Post" | "Comentario";
export type EstadoReporte = "Pendiente" | "Desestimado" | "Resuelto";

const reporteUsuarioSelect = {
  legajo: true,
  nombre: true,
  apellido: true,
  avatar_url: true
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
        select: {
          id_comunidad: true,
          nombre: true
        }
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
            select: {
              id_comunidad: true,
              nombre: true
            }
          }
        }
      }
    }
  }
} as const;

export type ReporteConRelaciones = Awaited<ReturnType<typeof listarReportes>>[number];

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

async function buscarReporteExistente(
  legajoReportante: number,
  tipoReporte: TipoReporte,
  idObjetivo: bigint
): Promise<ReporteConRelaciones | null> {
  return prisma.reporte.findFirst({
    where:
      tipoReporte === "Post"
        ? { tipo_reporte: "Post", id_post: idObjetivo, legajo_reportante: legajoReportante }
        : { tipo_reporte: "Comentario", id_comentario: idObjetivo, legajo_reportante: legajoReportante },
    include: reporteInclude
  });
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

    return { estado: "creado", reporte };
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

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as { code: string }).code === "P2025";
}

export async function actualizarEstadoReporte(
  id_reporte: bigint,
  estado: EstadoReporte,
  resueltoPor: number
): Promise<ReporteConRelaciones | null> {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.reporte.findUnique({
      where: { id_reporte },
      include: reporteInclude
    });

    if (!existente) return null;

    await tx.reporte.update({
      where: { id_reporte },
      data: {
        estado,
        resuelto_at: estado === "Pendiente" ? null : new Date(),
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

    return tx.reporte.findUnique({
      where: { id_reporte },
      include: reporteInclude
    });
  });
}