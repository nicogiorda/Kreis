import { prisma } from "../../../core/database";

const ACCEPTED_COMMUNITY_STATUS = "Aceptado";

const postInclude = {
  usuario: {
    select: {
      legajo: true,
      nombre: true,
      apellido: true,
      avatar_url: true
    }
  },
  comunidad: {
    select: {
      id_comunidad: true,
      nombre: true
    }
  },
  _count: {
    select: {
      comentario: true
    }
  }
} as const;

export type CommunityPost = {
  id_post: bigint;
  legajo: number;
  id_comunidad: bigint;
  cuerpo: string;
  created_at: Date;
  usuario: {
    legajo: number;
    nombre: string;
    apellido: string;
    avatar_url: string | null;
  };
  comunidad: {
    id_comunidad: bigint;
    nombre: string;
  };
  _count: {
    comentario: number;
  };
};

export type CreateCommunityPostResult =
  | { status: "created"; post: CommunityPost }
  | { status: "community_not_found" }
  | { status: "not_community_member" };

export type DeleteCommunityPostResult =
  | { status: "deleted" }
  | { status: "not_found_or_not_owner" };

export type PostComment = {
  id_comentario: bigint;
  legajo: number;
  id_post: bigint;
  id_padre: bigint | null;
  cuerpo: string;
  created_at: Date;
  usuario: {
    legajo: number;
    nombre: string;
    apellido: string;
    avatar_url: string | null;
  };
};

export type PostCommentTree = PostComment & {
  respuestas: PostCommentTree[];
};

export type ListPostCommentsResult =
  | {
      status: "ok";
      comentarios: PostCommentTree[];
      total_comentarios: number;
    }
  | { status: "post_not_found" }
  | { status: "not_community_member" };

export type CreatePostCommentResult =
  | {
      status: "created";
      comentario: PostCommentTree;
      total_comentarios: number;
    }
  | { status: "post_not_found" }
  | { status: "not_community_member" }
  | { status: "invalid_parent" };

const commentInclude = {
  usuario: {
    select: {
      legajo: true,
      nombre: true,
      apellido: true,
      avatar_url: true
    }
  }
} as const;

function buildCommentTree(comments: PostComment[]): PostCommentTree[] {
  const commentsById = new Map<bigint, PostCommentTree>();
  const roots: PostCommentTree[] = [];

  for (const comment of comments) {
    commentsById.set(comment.id_comentario, {
      ...comment,
      respuestas: []
    });
  }

  for (const comment of commentsById.values()) {
    if (comment.id_padre === null) {
      roots.push(comment);
      continue;
    }

    const parent = commentsById.get(comment.id_padre);

    if (parent) {
      parent.respuestas.push(comment);
    } else {
      // Conserva visible cualquier dato historico inconsistente en lugar de perderlo.
      roots.push(comment);
    }
  }

  return roots;
}

async function findPostAccess(
  legajo: number,
  id_post: bigint
): Promise<"ok" | "post_not_found" | "not_community_member"> {
  const post = await prisma.post.findFirst({
    where: {
      id_post,
      comunidad: {
        estado: ACCEPTED_COMMUNITY_STATUS
      }
    },
    select: {
      comunidad: {
        select: {
          user_comunidad: {
            where: {
              legajo
            },
            select: {
              legajo: true
            },
            take: 1
          }
        }
      }
    }
  });

  if (!post) return "post_not_found";

  return post.comunidad.user_comunidad.length > 0
    ? "ok"
    : "not_community_member";
}

export async function findUserByAuthId(authId: string): Promise<{ legajo: number } | null> {
  return prisma.usuario.findUnique({
    where: {
      auth_id: authId
    },
    select: {
      legajo: true
    }
  });
}

export async function listCommunityFeed(legajo: number): Promise<CommunityPost[]> {
  return prisma.post.findMany({
    where: {
      comunidad: {
        estado: ACCEPTED_COMMUNITY_STATUS,
        user_comunidad: {
          some: {
            legajo
          }
        }
      }
    },
    include: postInclude,
    orderBy: {
      created_at: "desc"
    }
  });
}

export async function createCommunityPost(
  legajo: number,
  id_comunidad: bigint,
  cuerpo: string
): Promise<CreateCommunityPostResult> {
  const community = await prisma.comunidad.findFirst({
    where: {
      id_comunidad,
      estado: ACCEPTED_COMMUNITY_STATUS
    },
    select: {
      id_comunidad: true,
      user_comunidad: {
        where: {
          legajo
        },
        select: {
          legajo: true
        },
        take: 1
      }
    }
  });

  if (!community) {
    return { status: "community_not_found" };
  }

  if (community.user_comunidad.length === 0) {
    return { status: "not_community_member" };
  }

  const post = await prisma.post.create({
    data: {
      legajo,
      id_comunidad: community.id_comunidad,
      cuerpo
    },
    include: postInclude
  });

  return {
    status: "created",
    post
  };
}

export async function deleteCommunityPost(
  legajo: number,
  id_post: bigint
): Promise<DeleteCommunityPostResult> {
  const deleted = await prisma.post.deleteMany({
    where: {
      id_post,
      legajo
    }
  });

  return deleted.count > 0
    ? { status: "deleted" }
    : { status: "not_found_or_not_owner" };
}

export async function listPostComments(
  legajo: number,
  id_post: bigint
): Promise<ListPostCommentsResult> {
  const access = await findPostAccess(legajo, id_post);

  if (access !== "ok") {
    return { status: access };
  }

  const comments = await prisma.comentario.findMany({
    where: {
      id_post
    },
    include: commentInclude,
    orderBy: [
      {
        created_at: "asc"
      },
      {
        id_comentario: "asc"
      }
    ]
  });

  return {
    status: "ok",
    comentarios: buildCommentTree(comments),
    total_comentarios: comments.length
  };
}

export async function createPostComment(
  legajo: number,
  id_post: bigint,
  cuerpo: string,
  id_padre?: bigint
): Promise<CreatePostCommentResult> {
  const access = await findPostAccess(legajo, id_post);

  if (access !== "ok") {
    return { status: access };
  }

  if (id_padre !== undefined) {
    const parent = await prisma.comentario.findUnique({
      where: {
        id_comentario: id_padre
      },
      select: {
        id_post: true
      }
    });

    if (!parent || parent.id_post !== id_post) {
      return { status: "invalid_parent" };
    }
  }

  const comment = await prisma.comentario.create({
    data: {
      legajo,
      id_post,
      cuerpo,
      id_padre
    },
    include: commentInclude
  });

  const totalComments = await prisma.comentario.count({
    where: {
      id_post
    }
  });

  return {
    status: "created",
    comentario: {
      ...comment,
      respuestas: []
    },
    total_comentarios: totalComments
  };
}
