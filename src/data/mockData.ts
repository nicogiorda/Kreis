import type { ActivityPost, Community, KreisEvent } from "../types";

export const initialEvents: KreisEvent[] = [
  {
    id: "expo-uade",
    title: "Expo UADE",
    date: "Mar 28 May",
    day: "28",
    month: "MAY",
    place: "Microestadio",
    category: "Academico",
    icon: "EX",
    tone: "orange",
    interested: false,
    official: true,
    description: "Expo con propuestas, actividades y espacios para conectar con la comunidad UADE."
  },
  {
    id: "after-office-uade",
    title: "After Office UADE",
    date: "Jue 30 May",
    day: "30",
    month: "MAY",
    place: "Terraza Lima",
    category: "Social",
    icon: "EV",
    tone: "orange",
    interested: true,
    description: "Musica, juegos breves y mesas mezcladas para conocer gente fuera de tu carrera."
  },
  {
    id: "hack-night",
    title: "Hack Night Creativa",
    date: "Vie 31 May",
    day: "31",
    month: "MAY",
    place: "Lab 4.12",
    category: "Academico",
    icon: "HN",
    tone: "green",
    interested: false,
    description: "Una noche para prototipar ideas digitales con equipos armados en el momento."
  },
  {
    id: "cine-foro",
    title: "Cine Foro: Her",
    date: "Mar 4 Jun",
    day: "04",
    month: "JUN",
    place: "Auditorio B",
    category: "Cultural",
    icon: "CF",
    tone: "beige",
    interested: false,
    description: "Proyeccion y debate abierto sobre tecnologia, vinculos y vida universitaria."
  },
  {
    id: "running-club",
    title: "Running Club Palermo",
    date: "Sab 8 Jun",
    day: "08",
    month: "JUN",
    place: "Bosques de Palermo",
    category: "Deporte",
    icon: "5K",
    tone: "pumpkin",
    interested: true,
    description: "Salida grupal de 5K para todos los ritmos. Punto de encuentro en UADE."
  },
  {
    id: "mate-debate",
    title: "Mate & Debate",
    date: "Mie 12 Jun",
    day: "12",
    month: "JUN",
    place: "Patio central",
    category: "Social",
    icon: "MT",
    tone: "green",
    interested: false,
    description: "Ronda abierta para hablar de cursada, amistades y como atravesar la facu."
  }
];

export const initialCommunities: Community[] = [
  {
    id: "ux",
    name: "UX Lab UADE",
    members: 184,
    category: "Diseno",
    icon: "UX",
    joined: true,
    recommended: true,
    popular: true,
    pulse: "Charla nueva: portfolio express",
    description: "Encuentros para practicar investigacion, producto y portfolio con gente de distintas carreras."
  },
  {
    id: "gaming",
    name: "Gaming Kreis",
    members: 312,
    category: "Gaming",
    icon: "GG",
    joined: false,
    recommended: true,
    popular: true,
    pulse: "Buscan squad para torneo interno",
    description: "Comunidad para armar equipos, torneos internos y juntadas casuales despues de cursar."
  },
  {
    id: "data",
    name: "Data Club",
    members: 148,
    category: "Tecnologia",
    icon: "DB",
    joined: true,
    recommended: true,
    popular: true,
    pulse: "Subieron dataset para practicar",
    description: "Espacio para aprender analisis de datos, compartir recursos y resolver desafios semanales."
  },
  {
    id: "cine",
    name: "Cinefilos UADE",
    members: 96,
    category: "Cultura",
    icon: "CF",
    joined: false,
    recommended: true,
    popular: false,
    pulse: "Votacion abierta para la proxima peli",
    description: "Proyecciones, debates y recomendaciones para descubrir peliculas con otros estudiantes."
  },
  {
    id: "runner",
    name: "Running UADE",
    members: 75,
    category: "Deporte",
    icon: "5K",
    joined: false,
    recommended: false,
    popular: true,
    pulse: "Salida suave este sabado",
    description: "Salidas grupales por ritmo, objetivos compartidos y planes para moverse sin presion."
  },
  {
    id: "emprende",
    name: "Emprendedores",
    members: 203,
    category: "Negocios",
    icon: "EM",
    joined: true,
    recommended: true,
    popular: true,
    pulse: "Pitch night en preparacion",
    description: "Ideas, validacion, contactos y practicas de pitch para proyectos que estan arrancando."
  },
  {
    id: "photo",
    name: "Foto Club",
    members: 121,
    category: "Cultura",
    icon: "PH",
    joined: false,
    recommended: true,
    popular: false,
    pulse: "Salida fotografica en San Telmo",
    description: "Caminatas, retos visuales y edicion compartida para practicar fotografia urbana."
  },
  {
    id: "marketing",
    name: "Marketing Lab",
    members: 267,
    category: "Negocios",
    icon: "MK",
    joined: false,
    recommended: false,
    popular: true,
    pulse: "Analisis de marcas argentinas",
    description: "Casos, campanas y debates sobre estrategia, contenido y tendencias de consumo."
  },
  {
    id: "ai",
    name: "AI Builders",
    members: 341,
    category: "Tecnologia",
    icon: "AI",
    joined: false,
    recommended: true,
    popular: true,
    pulse: "Workshop de prompts aplicados",
    description: "Proyectos con inteligencia artificial, herramientas nuevas y demos rapidas entre estudiantes."
  },
  {
    id: "finance",
    name: "Finanzas Jovenes",
    members: 188,
    category: "Negocios",
    icon: "FI",
    joined: false,
    recommended: true,
    popular: false,
    pulse: "Debate sobre inversiones simples",
    description: "Finanzas personales, mercado local y habitos para ordenar plata desde la facultad."
  },
  {
    id: "music",
    name: "Kreis Music",
    members: 229,
    category: "Cultura",
    icon: "MU",
    joined: false,
    recommended: false,
    popular: true,
    pulse: "Playlist colaborativa abierta",
    description: "Bandas, playlists, fechas y juntadas para quienes quieren compartir musica."
  },
  {
    id: "volunteer",
    name: "Voluntariado UADE",
    members: 154,
    category: "Social",
    icon: "VO",
    joined: false,
    recommended: true,
    popular: false,
    pulse: "Campana solidaria en marcha",
    description: "Acciones sociales, colectas y proyectos para participar con impacto concreto."
  },
  {
    id: "basket",
    name: "Basket Kreis",
    members: 142,
    category: "Deporte",
    icon: "BK",
    joined: false,
    recommended: false,
    popular: true,
    pulse: "Arman equipo mixto semanal",
    description: "Partidos casuales, equipos por nivel y organizacion para jugar despues de cursar."
  },
  {
    id: "design",
    name: "Design Systems",
    members: 109,
    category: "Diseno",
    icon: "DS",
    joined: false,
    recommended: true,
    popular: false,
    pulse: "Critica de componentes este jueves",
    description: "Componentes, tokens, accesibilidad y revision de interfaces con mirada de producto."
  },
  {
    id: "debate",
    name: "Debate Club",
    members: 132,
    category: "Social",
    icon: "DC",
    joined: false,
    recommended: false,
    popular: true,
    pulse: "Tema nuevo para la ronda",
    description: "Conversaciones guiadas, argumentos y espacios para practicar hablar en publico."
  }
];

export const initialActivity: ActivityPost[] = [
  {
    id: "post-ux-portfolio",
    communityId: "ux",
    communityName: "UX Lab UADE",
    icon: "UX",
    author: "Mili",
    time: "hace 18 min",
    title: "Alguien quiere armar ronda de feedback de portfolio?",
    text: "Tengo 3 pantallas de un caso para revisar y estaria bueno cruzar opiniones antes de subirlo a Behance.",
    score: 24,
    comments: 8
  },
  {
    id: "post-data-dataset",
    communityId: "data",
    communityName: "Data Club",
    icon: "DB",
    author: "Tomi",
    time: "hace 42 min",
    title: "Dataset simple para practicar dashboards",
    text: "Subi un CSV de eventos universitarios con categorias, asistencia y horarios por si alguien quiere practicar visualizaciones.",
    score: 31,
    comments: 12
  },
  {
    id: "post-emprende-pitch",
    communityId: "emprende",
    communityName: "Emprendedores",
    icon: "EM",
    author: "Juli",
    time: "hace 1 h",
    title: "Busco dupla para validar una idea de marketplace",
    text: "La idea es entrevistar estudiantes esta semana y llegar con algo chico al pitch night.",
    score: 18,
    comments: 6
  },
  {
    id: "post-ux-research",
    communityId: "ux",
    communityName: "UX Lab UADE",
    icon: "UX",
    author: "Fran",
    time: "hace 2 h",
    title: "Plantilla corta para entrevistas de usuario",
    text: "Dejo una guia de 7 preguntas para quienes estan arrancando research y no saben como abrir la conversacion.",
    score: 46,
    comments: 15
  },
  {
    id: "post-data-tools",
    communityId: "data",
    communityName: "Data Club",
    icon: "DB",
    author: "Lola",
    time: "hace 3 h",
    title: "Power BI o Looker Studio para empezar?",
    text: "Quiero hacer mi primer dashboard para una materia. Cual recomiendan si todavia no tengo mucha base?",
    score: 13,
    comments: 19
  }
];
