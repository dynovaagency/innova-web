/**
 * Profesionales que dan las supervisiones.
 *
 * Alimenta el carrusel de la pestaña "Supervisión Profesional" en
 * /servicios y la página de perfil /servicios/supervisiones/:slug.
 *
 * ⚠️ DATOS DE EJEMPLO: reemplazar por la información real.
 *
 * Cómo sumar o editar un profesional:
 *   1. Copiá un bloque { ... } y completá los campos.
 *   2. `slug` es la parte final de la URL: minúsculas, sin acentos ni
 *      espacios (ej.: 'laura-gomez'). Tiene que ser único.
 *   3. Foto: guardala en public/supervisores/ (vertical, idealmente
 *      800×1000 px, en .jpg o .webp de menos de 200 KB) y poné la ruta
 *      empezando con /supervisores/ (ej.: '/supervisores/laura-gomez.jpg').
 *      Si `foto` queda en null se muestran las iniciales.
 *   4. El orden del array es el orden del carrusel.
 *
 * Campos:
 *   slug           → identificador para la URL (obligatorio).
 *   nombre         → nombre y apellido (obligatorio).
 *   titulo         → título profesional (ej.: 'Lic. en Trabajo Social').
 *   especialidad   → una línea; va arriba del nombre en la tarjeta.
 *   resumen        → una o dos oraciones para la tarjeta del carrusel.
 *   foto           → ruta a la foto, o null.
 *   matricula      → número de matrícula, o null para no mostrarla.
 *   areas          → temas de trabajo; se muestran como etiquetas.
 *   bio            → presentación completa: un string por párrafo.
 *   formacion      → títulos, posgrados y cursos: un string por ítem.
 *   modalidad      → { encuentro, formato } (ej.: 'Virtual y presencial').
 *   activo         → false para ocultarlo sin borrar los datos.
 */

export const supervisores = [
  {
    slug: 'laura-gomez',
    nombre: 'Laura Gómez',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Salud mental comunitaria',
    resumen:
      'Acompaña equipos de salud mental en la revisión de sus intervenciones y en el cuidado de quienes cuidan.',
    foto: null,
    matricula: 'M.P. 0000',
    areas: ['Salud mental', 'Trabajo en equipos', 'Cuidado profesional'],
    bio: [
      'Texto de ejemplo. Trabajadora social con más de quince años de experiencia en dispositivos de salud mental comunitaria y atención primaria.',
      'Coordina espacios de supervisión para equipos interdisciplinarios, con foco en la reflexión sobre la práctica cotidiana y en las condiciones de trabajo de los y las profesionales.',
    ],
    formacion: [
      'Licenciatura en Trabajo Social (ejemplo)',
      'Especialización en Salud Mental Comunitaria (ejemplo)',
    ],
    modalidad: { encuentro: 'Virtual y presencial', formato: 'Individual y grupal' },
    activo: true,
  },
  {
    slug: 'martin-rodriguez',
    nombre: 'Martín Rodríguez',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Niñez y adolescencias',
    resumen:
      'Supervisa prácticas en el sistema de protección de derechos de niñas, niños y adolescentes.',
    foto: null,
    matricula: null,
    areas: ['Protección de derechos', 'Niñez', 'Instituciones'],
    bio: [
      'Texto de ejemplo. Trabajador social con trayectoria en servicios locales y zonales de protección de derechos.',
      'Acompaña a profesionales que trabajan en situaciones de alta complejidad, ayudando a ordenar la intervención y a sostener criterios fundamentados.',
    ],
    formacion: ['Licenciatura en Trabajo Social (ejemplo)', 'Diplomatura en Infancias (ejemplo)'],
    modalidad: { encuentro: 'Virtual', formato: 'Individual y grupal' },
    activo: true,
  },
  {
    slug: 'carolina-perez',
    nombre: 'Carolina Pérez',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Géneros y violencias',
    resumen:
      'Espacios de supervisión para profesionales que intervienen en situaciones de violencia por motivos de género.',
    foto: null,
    matricula: 'M.P. 0000',
    areas: ['Géneros', 'Violencias', 'Abordaje territorial'],
    bio: [
      'Texto de ejemplo. Trabajadora social especializada en el abordaje de violencias por motivos de género desde una perspectiva territorial.',
      'Coordina grupos de supervisión y espacios de formación para equipos municipales y organizaciones sociales.',
    ],
    formacion: ['Licenciatura en Trabajo Social (ejemplo)', 'Maestría en Estudios de Género (ejemplo)'],
    modalidad: { encuentro: 'Virtual y presencial', formato: 'Grupal' },
    activo: true,
  },
  {
    slug: 'diego-fernandez',
    nombre: 'Diego Fernández',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Gestión de políticas sociales',
    resumen:
      'Acompaña a profesionales en roles de coordinación y gestión de programas sociales.',
    foto: null,
    matricula: null,
    areas: ['Políticas públicas', 'Gestión', 'Coordinación de equipos'],
    bio: [
      'Texto de ejemplo. Trabajador social con experiencia en la gestión de programas sociales en el Estado nacional y provincial.',
      'Su espacio de supervisión está orientado a quienes asumen roles de coordinación y necesitan revisar decisiones, vínculos de equipo y estrategias institucionales.',
    ],
    formacion: ['Licenciatura en Trabajo Social (ejemplo)', 'Maestría en Políticas Sociales (ejemplo)'],
    modalidad: { encuentro: 'Virtual', formato: 'Individual' },
    activo: true,
  },
  {
    slug: 'valeria-sosa',
    nombre: 'Valeria Sosa',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Personas mayores',
    resumen:
      'Supervisión de intervenciones con personas mayores, familias y dispositivos de cuidado.',
    foto: null,
    matricula: 'M.P. 0000',
    areas: ['Gerontología', 'Familias', 'Cuidados'],
    bio: [
      'Texto de ejemplo. Trabajadora social con formación en gerontología y experiencia en residencias y centros de día.',
      'Acompaña a profesionales en la construcción de estrategias de intervención que respeten la autonomía y los derechos de las personas mayores.',
    ],
    formacion: ['Licenciatura en Trabajo Social (ejemplo)', 'Especialización en Gerontología (ejemplo)'],
    modalidad: { encuentro: 'Virtual y presencial', formato: 'Individual y grupal' },
    activo: true,
  },
  {
    slug: 'nicolas-alvarez',
    nombre: 'Nicolás Álvarez',
    titulo: 'Lic. en Trabajo Social',
    especialidad: 'Ámbito socio-jurídico',
    resumen:
      'Acompaña la elaboración de informes sociales y la intervención en el ámbito judicial.',
    foto: null,
    matricula: null,
    areas: ['Pericias', 'Informes sociales', 'Ámbito judicial'],
    bio: [
      'Texto de ejemplo. Trabajador social perito con experiencia en juzgados de familia.',
      'Su espacio de supervisión ayuda a fortalecer la escritura de informes, la fundamentación técnica y el posicionamiento ético en el ámbito socio-jurídico.',
    ],
    formacion: ['Licenciatura en Trabajo Social (ejemplo)', 'Diplomatura en Peritaje Social (ejemplo)'],
    modalidad: { encuentro: 'Virtual', formato: 'Individual' },
    activo: true,
  },
];

/** Profesionales visibles, en el orden del array. */
export const getSupervisores = () => supervisores.filter((s) => s.activo !== false);

/** Un profesional visible por slug, o null. */
export const getSupervisorBySlug = (slug) =>
  getSupervisores().find((s) => s.slug === slug) || null;

/** Iniciales para cuando no hay foto (ej.: 'Laura Gómez' → 'LG'). */
export const getIniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');