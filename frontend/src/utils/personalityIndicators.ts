export type ReportLevelKey =
  | 'prekinder'
  | 'kinder'
  | 'basica_1_6'
  | 'basica_7_media_2'
  | 'media_3_4';

export interface ScaleOption {
  code: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface IndicatorItem {
  id: string;
  oa?: string;
  text: string;
}

export interface IndicatorNucleoOrArea {
  id: string;
  title: string;
  subtitle?: string;
  indicators: IndicatorItem[];
}

export interface IndicatorAmbito {
  id: string;
  ambitoTitle?: string; // Usado en Educación Parvularia (Ámbitos -> Núcleos)
  sections: IndicatorNucleoOrArea[];
}

export interface ReportLevelTemplate {
  key: ReportLevelKey;
  category: 'parvularia' | 'basica_media';
  reportTitle: string;
  levelLabel: string;
  shortLabel: string;
  defaultQualifier: string;
  scale: ScaleOption[];
  ambitos: IndicatorAmbito[];
}

export const PARVULARIA_SCALE: ScaleOption[] = [
  {
    code: 'L',
    label: 'Logrado',
    description: 'Logrado',
    color: '#15803d',
    bgColor: '#dcfce7'
  },
  {
    code: 'M/L',
    label: 'Medianamente Logrado',
    description: 'Medianamente Logrado',
    color: '#b45309',
    bgColor: '#fef3c7'
  },
  {
    code: 'P/L',
    label: 'Por Lograr',
    description: 'Por Lograr',
    color: '#dc2626',
    bgColor: '#fee2e2'
  },
  {
    code: 'N/E',
    label: 'No Evaluado',
    description: 'No Evaluado',
    color: '#475569',
    bgColor: '#f1f5f9'
  }
];

export const BASICA_MEDIA_SCALE: ScaleOption[] = [
  {
    code: 'S',
    label: 'Siempre',
    description: 'Siempre, permanencia y continuidad del rasgo',
    color: '#15803d',
    bgColor: '#dcfce7'
  },
  {
    code: 'G',
    label: 'Generalmente',
    description: 'Generalmente, la mayor parte de las veces demuestra el logro de este rasgo',
    color: '#1d4ed8',
    bgColor: '#dbeafe'
  },
  {
    code: 'R/V',
    label: 'Rara vez',
    description: 'Rara vez demuestra el logro de este rasgo',
    color: '#b45309',
    bgColor: '#fef3c7'
  }
];

export const PERSONALITY_REPORT_TEMPLATES: Record<ReportLevelKey, ReportLevelTemplate> = {
  // ===========================================================================
  // 1. EDUCACIÓN PARVULARIA — PRE-KÍNDER (Primer Nivel de Transición)
  // ===========================================================================
  prekinder: {
    key: 'prekinder',
    category: 'parvularia',
    reportTitle: 'INFORME AL HOGAR — EDUCACIÓN PARVULARIA (PRE-KÍNDER / NT1)',
    levelLabel: 'Pre-Kínder (Primer Nivel de Transición)',
    shortLabel: 'Pre-Kínder (NT1)',
    defaultQualifier: 'L',
    scale: PARVULARIA_SCALE,
    ambitos: [
      {
        id: 'pk_amb_1',
        ambitoTitle: 'ÁMBITO: DESARROLLO PERSONAL Y SOCIAL',
        sections: [
          {
            id: 'pk_nuc_identidad',
            title: 'Núcleo: Identidad y Autonomía',
            indicators: [
              { id: 'pk_id_1', oa: 'OA 1', text: 'Señala (indica o nombra) la emoción o sentimiento que le provocan diversas narraciones o situaciones observadas.' },
              { id: 'pk_id_2', oa: 'OA 2', text: 'Participa en juegos o actividades junto a algunos adultos o pares que no son de su grupo o curso.' },
              { id: 'pk_id_3', oa: 'OA 3', text: 'Señala (indica o nombra) emociones o sentimientos en otros, a partir de narraciones o situaciones observadas.' },
              { id: 'pk_id_4', oa: 'OA 5', text: 'Plantea preferencias, opiniones e ideas, por iniciativa propia, en diversas situaciones cotidianas y juegos.' },
              { id: 'pk_id_5', oa: 'OA 7', text: 'Señala (indica o nombra) el rol que asume dentro de su familia (hijo/a, hermano/a, nieto/a, entre otros).' },
              { id: 'pk_id_6', oa: 'OA 8', text: 'Señala (identifica o nombra) sus gustos y preferencias.' },
              { id: 'pk_id_7', oa: 'OA 9', text: 'Realiza prácticas de higiene, alimentación y vestuario, ante la sugerencia del adulto en situaciones cotidianas y juegos.' }
            ]
          },
          {
            id: 'pk_nuc_convivencia',
            title: 'Núcleo: Convivencia y Ciudadanía',
            indicators: [
              { id: 'pk_cv_1', oa: 'OA 1', text: 'Propone juegos o actividades para realizar con otros en forma espontánea.' },
              { id: 'pk_cv_2', oa: 'OA 3', text: 'Comparte con otros materiales y pertenencias en distintas situaciones cotidianas.' },
              { id: 'pk_cv_3', oa: 'OA 5', text: 'Señala (indica o nombra) el conflicto al que se enfrenta.' },
              { id: 'pk_cv_4', oa: 'OA 6', text: 'Cumple algunas normas establecidas por otros, en juegos y situaciones cotidianas.' },
              { id: 'pk_cv_5', oa: 'OA 7', text: 'Describe comportamientos y situaciones de riesgo que pueden atentar contra su bienestar y seguridad, o la de los demás, en contextos cotidianos o juegos.' },
              { id: 'pk_cv_6', oa: 'OA 10', text: 'Acepta las decisiones de la mayoría, participando en juegos o actividades acordadas grupalmente.' }
            ]
          },
          {
            id: 'pk_nuc_corporalidad',
            title: 'Núcleo: Corporalidad y Movimiento',
            indicators: [
              { id: 'pk_cm_1', oa: 'OA 1', text: 'Describe qué acciones realiza junto a su familia para el cuidado de su cuerpo.' },
              { id: 'pk_cm_2', oa: 'OA 2', text: 'Señala (indica o nombra) diversas acciones que puede realizar para cuidar su bienestar y apariencia personal.' },
              { id: 'pk_cm_3', oa: 'OA 3', text: 'Señala (indica o nombra) partes más específicas de su cuerpo (por ejemplo, caderas, codos, muñecas, tobillos, talón) y su funcionalidad, en situaciones cotidianas y juegos.' },
              { id: 'pk_cm_4', oa: 'OA 6', text: 'Realiza movimientos motrices finos cada vez más precisos y eficientes al dibujar libremente, colorear o rellenar dentro de algunos espacios sus propias creaciones.' },
              { id: 'pk_cm_5', oa: 'OA 7', text: 'Mantiene el equilibrio al desplazarse siguiendo líneas rectas, curvas, zigzag o laberintos, en juegos o situaciones cotidianas.' },
              { id: 'pk_cm_6', oa: 'OA 9', text: 'Realiza movimientos, posturas y desplazamientos, siguiendo instrucciones que involucran nociones espaciales como adelante/atrás/al lado/entre, usando como referencia la posición de su cuerpo, en situaciones cotidianas y lúdicas.' }
            ]
          }
        ]
      },
      {
        id: 'pk_amb_2',
        ambitoTitle: 'ÁMBITO: COMUNICACIÓN INTEGRAL',
        sections: [
          {
            id: 'pk_nuc_verbal',
            title: 'Núcleo: Lenguaje Verbal',
            indicators: [
              { id: 'pk_lv_1', oa: 'OA 1', text: 'Pronuncia correctamente palabras sencillas.' },
              { id: 'pk_lv_2', oa: 'OA 2', text: 'Responde preguntas explícitas a partir de un relato o explicación.' },
              { id: 'pk_lv_3', oa: 'OA 3', text: 'Identifica (nombrando o pareando) palabras que riman.' },
              { id: 'pk_lv_4', oa: 'OA 3', text: 'Separa (apuntando, aplaudiendo, graficando, nombrando, utilizando material concreto) las sílabas de las palabras, en situaciones de juego.' },
              { id: 'pk_lv_5', oa: 'OA 5', text: 'Anticipa el contenido de los textos que explora, a partir de sus imágenes, en contextos cotidianos.' },
              { id: 'pk_lv_6', oa: 'OA 6', text: 'Responde preguntas que hacen referencia al contenido explícito de un texto escuchado.' },
              { id: 'pk_lv_7', oa: 'OA 7', text: 'Asocia el grafema con su correspondiente fonema de las vocales A-E.' },
              { id: 'pk_lv_8', oa: 'OA 7', text: 'Reconoce su nombre escrito.' },
              { id: 'pk_lv_9', oa: 'OA 8', text: 'Experimenta realizando trazos simples (rectos y curvos).' },
              { id: 'pk_lv_10', oa: 'OA 8', text: 'Escribe las vocales asociando el fonema que quiere representar A-E.' },
              { id: 'pk_lv_11', oa: 'OA 8', text: 'Escribe su nombre.' }
            ]
          },
          {
            id: 'pk_nuc_artistico',
            title: 'Núcleo: Lenguaje Artístico',
            indicators: [
              { id: 'pk_la_1', oa: 'OA 3', text: 'Repite melodías o canciones, usando su voz, cuerpo, instrumentos musicales u objetos.' },
              { id: 'pk_la_2', oa: 'OA 4', text: 'Usa gestos, movimientos, posturas, desplazamientos o la voz al imitar diferentes personajes, animales u objetos.' },
              { id: 'pk_la_3', oa: 'OA 5', text: 'Incorpora líneas, formas, colores y texturas al crear sobre un soporte plano, para representar plásticamente emociones, ideas e intereses.' },
              { id: 'pk_la_4', oa: 'OA 6', text: 'Combina materiales, técnicas y procedimientos en distintos lenguajes artísticos: visual, corporal o musical.' },
              { id: 'pk_la_5', oa: 'OA 7', text: 'Usa trazos, formas y figuras para dibujar ideas, intereses y experiencias, dando nombre a sus creaciones.' },
              { id: 'pk_la_6', oa: 'OA 7', text: 'Dibuja algunos elementos simples del entorno (sin incluir detalles) que son reconocibles por otros, usando diversos tipos de materiales y soportes.' },
              { id: 'pk_la_7', oa: 'OA 7', text: 'Dibuja figuras humanas simples reconocibles por otros, incluyendo cabeza, tronco y extremidades, en diversos soportes.' }
            ]
          }
        ]
      },
      {
        id: 'pk_amb_3',
        ambitoTitle: 'ÁMBITO: INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO',
        sections: [
          {
            id: 'pk_nuc_natural',
            title: 'Núcleo: Exploración del Entorno Natural',
            indicators: [
              { id: 'pk_en_1', oa: 'OA 1', text: 'Explora el entorno, observando, manipulando y formulando preguntas sobre los cambios que ocurren en el entorno natural.' },
              { id: 'pk_en_2', oa: 'OA 6', text: 'Describe características (reproducción, cubierta, desplazamiento, tamaño, morfología) de algunos animales.' },
              { id: 'pk_en_3', oa: 'OA 2', text: 'Predice las consecuencias de un fenómeno natural que observa o conoce.' },
              { id: 'pk_en_4', oa: 'OA 7', text: 'Nombra algunas características de personas en diferentes etapas de su proceso de crecimiento.' },
              { id: 'pk_en_5', oa: 'OA 8', text: 'Describe algunas acciones que contribuyen al cuidado de ambientes sostenibles.' },
              { id: 'pk_en_6', oa: 'OA 9', text: 'Representa (dibuja, dramatiza, fotografía, modela, entre otros) los hallazgos obtenidos y los instrumentos que utilizó al explorar el entorno.' },
              { id: 'pk_en_7', oa: 'OA 10', text: 'Explora mezclas y disoluciones, describiendo semejanzas y diferencias entre ellas.' }
            ]
          },
          {
            id: 'pk_nuc_sociocultural',
            title: 'Núcleo: Comprensión del Entorno Sociocultural',
            indicators: [
              { id: 'pk_es_1', oa: 'OA 1', text: 'Señala (indica o nombra) el rol que tiene cada integrante de su familia, tales como: padre, madre, abuela/o, hermana/o, hija/o, nieta/o, entre otros.' },
              { id: 'pk_es_2', oa: 'OA 3', text: 'Explica los beneficios del uso de algunos objetos tecnológicos.' },
              { id: 'pk_es_3', oa: 'OA 4', text: 'Describe características de algunas creaciones e inventos, explicando para qué sirven.' },
              { id: 'pk_es_4', oa: 'OA 7', text: 'Describe el servicio que cumplen algunas instituciones, organizaciones, lugares y obras de interés patrimonial que forman parte de su localidad.' },
              { id: 'pk_es_5', oa: 'OA 8', text: 'Describe lo que llama su atención sobre el aporte de algunas personas relevantes o personajes típicos de su comunidad.' }
            ]
          },
          {
            id: 'pk_nuc_matematico',
            title: 'Núcleo: Pensamiento Matemático',
            indicators: [
              { id: 'pk_pm_1', oa: 'OA 1', text: 'Extiende patrones de movimientos, gestos, sonidos, de material concreto o pictórico, de dos o tres elementos.' },
              { id: 'pk_pm_2', oa: 'OA 2', text: 'Agrupa elementos por dos atributos que tienen en común (como forma, color, tamaño, función, masa o materialidad, entre otros), usando material concreto o pictórico.' },
              { id: 'pk_pm_3', oa: 'OA 2', text: 'Ordena una serie, por ensayo y error, según longitud o capacidad para contener, usando material concreto o pictórico.' },
              { id: 'pk_pm_4', oa: 'OA 3', text: 'Señala (indica o nombra) la posición de objetos y personas respecto de sí mismo, utilizando un concepto de ubicación (dentro/fuera; encima/debajo/ entre; al frente de/detrás de), distancia (cerca/lejos) y dirección (adelante/ atrás/hacia el lado), en situaciones cotidianas y lúdicas.' },
              { id: 'pk_pm_5', oa: 'OA 4', text: "Usa elementos concretos para representar un grupo con 'más', 'menos' o 'igual cantidad de elementos' que otro, en situaciones cotidianas." },
              { id: 'pk_pm_6', oa: 'OA 5', text: 'Ordena secuencias temporales de tres escenas o situaciones.' },
              { id: 'pk_pm_7', oa: 'OA 5', text: 'Determina la frecuencia de acciones cotidianas usando conceptos como siempre/a veces/ nunca.' },
              { id: 'pk_pm_8', oa: 'OA 6', text: 'Reconoce los números del 0-5.' },
              { id: 'pk_pm_9', oa: 'OA 6', text: 'Cuenta elementos concretos (entre 1 y 10) determinando la cantidad, en situaciones cotidianas o juegos.' },
              { id: 'pk_pm_10', oa: 'OA 7', text: 'Dispone la cantidad de elementos que indica un número, hasta el 5.' },
              { id: 'pk_pm_11', oa: 'OA 7', text: 'Dibuja la cantidad de elementos que indica un número, hasta el 5.' },
              { id: 'pk_pm_12', oa: 'OA 10', text: 'Nombra atributos (forma, cantidad de lados, caras) de figuras 2D.' }
            ]
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 2. EDUCACIÓN PARVULARIA — KÍNDER (Segundo Nivel de Transición)
  // ===========================================================================
  kinder: {
    key: 'kinder',
    category: 'parvularia',
    reportTitle: 'INFORME AL HOGAR — EDUCACIÓN PARVULARIA (KÍNDER / NT2)',
    levelLabel: 'Kínder (Segundo Nivel de Transición)',
    shortLabel: 'Kínder (NT2)',
    defaultQualifier: 'L',
    scale: PARVULARIA_SCALE,
    ambitos: [
      {
        id: 'ki_amb_1',
        ambitoTitle: 'ÁMBITO: DESARROLLO PERSONAL Y SOCIAL',
        sections: [
          {
            id: 'ki_nuc_identidad',
            title: 'Núcleo: Identidad y Autonomía',
            indicators: [
              { id: 'ki_id_1', oa: 'OA 2', text: 'Pide participar en juegos junto a algunos adultos o pares que no son parte del grupo o curso.' },
              { id: 'ki_id_2', oa: 'OA 4', text: 'Utiliza, de manera autónoma, algunas estrategias para regular sus emociones o sentimientos.' },
              { id: 'ki_id_3', oa: 'OA 5', text: 'Propone ideas (materiales, actividades, proyectos u otros) para desarrollar en diversas situaciones.' },
              { id: 'ki_id_4', oa: 'OA 9', text: 'Realiza prácticas de higiene, alimentación y vestuario, por iniciativa propia, de manera autónoma.' },
              { id: 'ki_id_5', oa: 'OA 13', text: 'Dramatiza situaciones, asumiendo una personificación o creando diálogos en situaciones cotidianas y juegos.' }
            ]
          },
          {
            id: 'ki_nuc_convivencia',
            title: 'Núcleo: Convivencia y Ciudadanía',
            indicators: [
              { id: 'ki_cv_1', oa: 'OA 1', text: 'Cumple los roles o tareas comprometidas en actividades o juegos colaborativos en los que participa.' },
              { id: 'ki_cv_2', oa: 'OA 5', text: 'Realiza, de manera espontánea, acciones pacíficas para resolver un conflicto cotidiano con otros niños.' },
              { id: 'ki_cv_3', oa: 'OA 6', text: 'Cumple las normas creadas colaborativamente con pares y adultos, para el bienestar del grupo.' },
              { id: 'ki_cv_4', oa: 'OA 10', text: 'Respeta turnos de manera espontánea, en juegos y actividades cotidianas.' }
            ]
          },
          {
            id: 'ki_nuc_corporalidad',
            title: 'Núcleo: Corporalidad y Movimiento',
            indicators: [
              { id: 'ki_cm_1', oa: 'OA 6', text: 'Combina, de forma autónoma y correcta, movimientos motrices finos que le permiten rasgar, plegar, construir, modelar, troquelar, recortar, bordar, pegar, dibujar, colorear, ensartar, trazar, escribir, entre otras, incorporando líneas curvas y mixtas.' },
              { id: 'ki_cm_2', oa: 'OA 7', text: 'Mantiene el equilibrio al adoptar posturas durante juegos y actividades cotidianas; por ejemplo, pararse en un pie, pararse en punta de pies, etc.' },
              { id: 'ki_cm_3', oa: 'OA 8', text: 'Ejecuta las posturas y movimientos que requiere para lograr sus objetivos al realizar acciones, como trepar sogas o escaleras, tirar la cuerda, entre otras.' },
              { id: 'ki_cm_4', oa: 'OA 9', text: 'Usa conceptos y nominaciones temporales como día/noche, hoy/mañana, antes/durante/después, en sus descripciones y relatos, durante situaciones cotidianas y juegos.' }
            ]
          }
        ]
      },
      {
        id: 'ki_amb_2',
        ambitoTitle: 'ÁMBITO: COMUNICACIÓN INTEGRAL',
        sections: [
          {
            id: 'ki_nuc_verbal',
            title: 'Núcleo: Lenguaje Verbal',
            indicators: [
              { id: 'ki_lv_1', oa: 'OA 3', text: 'Dice el fonema inicial y final de una palabra, a partir de canciones y juegos verbales.' },
              { id: 'ki_lv_2', oa: 'OA 3', text: 'Relaciona (nombrando o pareando) palabras que tienen la misma sílaba inicial.' },
              { id: 'ki_lv_3', oa: 'OA 4', text: 'Explica el significado de una palabra nueva.' },
              { id: 'ki_lv_4', oa: 'OA 5', text: 'Relaciona las características de los textos que explora con el propósito que tienen (imágenes, títulos, formato, palabras conocidas, etc.).' },
              { id: 'ki_lv_5', oa: 'OA 6', text: 'Explica el propósito de diferentes tipos de textos, según sus características y la información que entregan.' },
              { id: 'ki_lv_6', oa: 'OA 7', text: 'Lee vocales presentadas en diferentes formas (mayúsculas, minúsculas, imprenta y cursiva).' },
              { id: 'ki_lv_7', oa: 'OA 8', text: 'Escribe algunas palabras significativas con todas las letras que lo componen; por ejemplo, su nombre.' }
            ]
          },
          {
            id: 'ki_nuc_artistico',
            title: 'Núcleo: Lenguaje Artístico',
            indicators: [
              { id: 'ki_la_1', oa: 'OA 3', text: 'Marca el ritmo con instrumentos musicales u objetos, en canciones interpretadas por sí mismo.' },
              { id: 'ki_la_2', oa: 'OA 5', text: 'Combina líneas, formas, colores y texturas en sus creaciones de soporte en plano, para representar plásticamente emociones, ideas e intereses, incorporando detalles personales.' },
              { id: 'ki_la_3', oa: 'OA 5', text: 'Combina líneas, formas, colores y texturas en sus creaciones de soporte en volumen, para representar plásticamente emociones, ideas e intereses, incorporando algunos detalles personales.' },
              { id: 'ki_la_4', oa: 'OA 5', text: 'Crea diferentes producciones artísticas, utilizando técnicas o materiales de su agrado y elección, representando sus propios intereses e imaginación.' },
              { id: 'ki_la_5', oa: 'OA 7', text: 'Dibuja varios elementos del entorno que son reconocibles por otros, incluyendo detalles como ventanas en las casas, ruedas en los autos, pétalos en las flores, entre otros, usando diversos tipos de materiales y soportes.' },
              { id: 'ki_la_6', oa: 'OA 7', text: 'Dibuja figuras humanas simples reconocibles por otros, incluyendo detalles como pestañas, cejas, nariz, codos, etc., en diversos soportes.' }
            ]
          }
        ]
      },
      {
        id: 'ki_amb_3',
        ambitoTitle: 'ÁMBITO: INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO',
        sections: [
          {
            id: 'ki_nuc_natural',
            title: 'Núcleo: Exploración del Entorno Natural',
            indicators: [
              { id: 'ki_en_1', oa: 'OA 1', text: 'Utiliza diversas fuentes y procedimientos para observar, manipular y buscar respuestas a sus preguntas sobre los cambios que ocurren.' },
              { id: 'ki_en_2', oa: 'OA 2', text: 'Explica las causas de un fenómeno natural, a partir de lo que ha indagado, observado y experimentado.' },
              { id: 'ki_en_3', oa: 'OA 6', text: 'Explica la relación entre las características de algunos animales y su hábitat.' },
              { id: 'ki_en_4', oa: 'OA 7', text: 'Compara el proceso de crecimiento de personas, animales y plantas.' },
              { id: 'ki_en_5', oa: 'OA 8', text: 'Explica los beneficios que tiene para el medio ambiente, realizar acciones como reciclar, reducir y reutilizar.' },
              { id: 'ki_en_6', oa: 'OA 9', text: 'Representa gráficamente (mapas conceptuales, dibujos, tablas, fotografías u otros) los hallazgos obtenidos, explicando el proceso realizado.' },
              { id: 'ki_en_7', oa: 'OA 10', text: 'Anticipa los resultados que podría obtener al combinar dos elementos en situaciones de experimentación directa.' }
            ]
          },
          {
            id: 'ki_nuc_sociocultural',
            title: 'Núcleo: Comprensión del Entorno Sociocultural',
            indicators: [
              { id: 'ki_es_1', oa: 'OA 1', text: "Explica los diferentes roles que puede cumplir una persona en la sociedad; por ejemplo: 'Soy hijo, hermano, nieto, amigo, estudiante, debo cumplir las normas en mi familia y en la escuela'." },
              { id: 'ki_es_2', oa: 'OA 4', text: 'Describe las necesidades y situaciones que cree motivaron la creación de ciertos inventos.' },
              { id: 'ki_es_3', oa: 'OA 5', text: 'Describe algunos hechos significativos de su localidad y país (combate naval de Iquique), utilizando recursos como videos.' }
            ]
          },
          {
            id: 'ki_nuc_matematico',
            title: 'Núcleo: Pensamiento Matemático',
            indicators: [
              { id: 'ki_pm_1', oa: 'OA 3', text: 'Utiliza dos o más conceptos de ubicación (dentro/fuera; encima/debajo/ entre; al frente de/detrás de), distancia (cerca/lejos) y dirección (adelante/ atrás/hacia el lado), al describir la posición de objetos y personas respecto de un punto u objeto de referencia.' },
              { id: 'ki_pm_2', oa: 'OA 4', text: "Cuenta elementos para determinar en qué grupo hay 'más'." },
              { id: 'ki_pm_3', oa: 'OA 5', text: 'Utiliza conceptos de secuencia (antes/ahora/después/al mismo tiempo, día/noche), frecuencia (siempre/a veces/ nunca) y duración (larga/corta), al describir situaciones cotidianas.' },
              { id: 'ki_pm_4', oa: 'OA 6', text: 'Dice los números en orden desde el 1 hasta el 20 en situaciones cotidianas o juegos.' },
              { id: 'ki_pm_5', oa: 'OA 6', text: 'Reconoce los números del 0 al 10.' },
              { id: 'ki_pm_6', oa: 'OA 6', text: 'Cuenta del 1 al 10.' },
              { id: 'ki_pm_7', oa: 'OA 6', text: 'Identifica posición de un número.' },
              { id: 'ki_pm_8', oa: 'OA 7', text: 'Utiliza grafismos simples (círculos, cruces, entre otras) para representar cantidades hasta el 10.' }
            ]
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 3. EDUCACIÓN BÁSICA — 1° a 6° BÁSICO (Informe de Personalidad)
  // ===========================================================================
  basica_1_6: {
    key: 'basica_1_6',
    category: 'basica_media',
    reportTitle: 'INFORME DE PERSONALIDAD Y DESARROLLO PERSONAL (1° A 6° BÁSICO)',
    levelLabel: '1° a 6° Básico',
    shortLabel: '1° a 6° Básico',
    defaultQualifier: 'S',
    scale: BASICA_MEDIA_SCALE,
    ambitos: [
      {
        id: 'b16_amb_1',
        sections: [
          {
            id: 'b16_sec_crecimiento',
            title: 'Crecimiento y Autoformación Personal',
            indicators: [
              { id: 'b16_cr_1', text: 'Expresa con claridad y eficiencia opiniones, ideas y sentimientos' },
              { id: 'b16_cr_2', text: 'Reconoce sus errores' },
              { id: 'b16_cr_3', text: 'Demuestra una actitud positiva para superarlos' },
              { id: 'b16_cr_4', text: 'Demuestra actitud de respeto consigo mismo' },
              { id: 'b16_cr_5', text: 'Demuestra actitud de respeto con sus compañeros' },
              { id: 'b16_cr_6', text: 'Demuestra actitud de respeto con sus profesores' },
              { id: 'b16_cr_7', text: 'Demuestra actitud de respeto con los demás miembros de la comunidad educativa' },
              { id: 'b16_cr_8', text: 'Presenta actitud de superación personal en sus prácticas curriculares' }
            ]
          },
          {
            id: 'b16_sec_etica',
            title: 'Formación Ética',
            indicators: [
              { id: 'b16_et_1', text: 'Utiliza el diálogo como fuente de resolución de conflicto' },
              { id: 'b16_et_2', text: 'Respeta y valora ideas distintas de las propias' },
              { id: 'b16_et_3', text: 'Demuestra actitudes de solidaridad y generosidad hacia los demás' },
              { id: 'b16_et_4', text: 'Es tolerante y acepta a las personas sin distinción' },
              { id: 'b16_et_5', text: 'Procede con honradez en sus acciones escolares' }
            ]
          },
          {
            id: 'b16_sec_entorno',
            title: 'La Persona y su Entorno',
            indicators: [
              { id: 'b16_en_1', text: 'Participa responsablemente en actividades de su curso y establecimiento' },
              { id: 'b16_en_2', text: 'Respeta y valora nuestros símbolos patrios e institucionales' },
              { id: 'b16_en_3', text: 'Demuestra iniciativa personal y responsabilidad en el trabajo en equipo' },
              { id: 'b16_en_4', text: 'Se compromete con el cuidado de los bienes e infraestructura escolar' },
              { id: 'b16_en_5', text: 'Se compromete con el cuidado de la sala de clases' },
              { id: 'b16_en_6', text: 'Se compromete con el cuidado de las demás dependencias del liceo' },
              { id: 'b16_en_7', text: 'Se compromete con el cuidado del Medio Ambiente' },
              { id: 'b16_en_8', text: 'Cumple con la presentación de sus materiales' },
              { id: 'b16_en_9', text: 'Cumple con la presentación de sus tareas escolares' },
              { id: 'b16_en_10', text: 'Cuida su higiene y presentación personal' },
              { id: 'b16_en_11', text: 'Manifiesta actitudes de cortesía con compañeros, profesores y personal del establecimiento' },
              { id: 'b16_en_12', text: 'Respeta las normas de la sala de clases y del establecimiento' },
              { id: 'b16_en_13', text: 'Valoriza, y usa responsablemente los recursos didácticos y tecnológicos del Liceo' }
            ]
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 4. EDUCACIÓN BÁSICA Y MEDIA — 7° BÁSICO a 2° MEDIO (Informe de Personalidad)
  // ===========================================================================
  basica_7_media_2: {
    key: 'basica_7_media_2',
    category: 'basica_media',
    reportTitle: 'INFORME DE PERSONALIDAD Y DESARROLLO PERSONAL (7° BÁSICO A 2° MEDIO)',
    levelLabel: '7° Básico a 2° Medio',
    shortLabel: '7° Básico a 2° Medio',
    defaultQualifier: 'S',
    scale: BASICA_MEDIA_SCALE,
    ambitos: [
      {
        id: 'b7m2_amb_1',
        sections: [
          {
            id: 'b7m2_sec_crecimiento',
            title: 'Crecimiento y Autoformación Personal',
            indicators: [
              { id: 'b7m2_cr_1', text: 'Expresa con claridad y eficiencia opiniones, ideas y sentimientos' },
              { id: 'b7m2_cr_2', text: 'Reconoce sus errores' },
              { id: 'b7m2_cr_3', text: 'Demuestra una actitud positiva para superarlos' },
              { id: 'b7m2_cr_4', text: 'Demuestra actitud de respeto consigo mismo' },
              { id: 'b7m2_cr_5', text: 'Demuestra actitud de respeto con sus compañeros' },
              { id: 'b7m2_cr_6', text: 'Demuestra actitud de respeto con sus profesores' },
              { id: 'b7m2_cr_7', text: 'Demuestra actitud de respeto con los demás miembros de la comunidad educativa' },
              { id: 'b7m2_cr_8', text: 'Presenta actitud de superación personal en sus prácticas curriculares' }
            ]
          },
          {
            id: 'b7m2_sec_etica',
            title: 'Formación Ética',
            indicators: [
              { id: 'b7m2_et_1', text: 'Respeta y valora ideas distintas de las propias' },
              { id: 'b7m2_et_2', text: 'Demuestra actitudes de solidaridad y generosidad hacia los demás' },
              { id: 'b7m2_et_3', text: 'Es tolerante y acepta a las personas sin distinción' },
              { id: 'b7m2_et_4', text: 'Procede con honradez en sus acciones escolares' }
            ]
          },
          {
            id: 'b7m2_sec_entorno',
            title: 'La Persona y su Entorno',
            indicators: [
              { id: 'b7m2_en_1', text: 'Participa responsablemente en actividades de su curso y establecimiento' },
              { id: 'b7m2_en_2', text: 'Respeta y valora nuestros símbolos patrios e institucionales' },
              { id: 'b7m2_en_3', text: 'Demuestra iniciativa personal y responsabilidad en el trabajo en equipo' },
              { id: 'b7m2_en_4', text: 'Se compromete con el cuidado de los bienes e infraestructura escolar' },
              { id: 'b7m2_en_5', text: 'Se compromete con el cuidado de la sala de clases' },
              { id: 'b7m2_en_6', text: 'Se compromete con el cuidado de las demás dependencias del liceo' },
              { id: 'b7m2_en_7', text: 'Se compromete con el cuidado del Medio Ambiente' },
              { id: 'b7m2_en_8', text: 'Cumple con la presentación de sus materiales' },
              { id: 'b7m2_en_9', text: 'Cumple con la presentación de sus tareas escolares' },
              { id: 'b7m2_en_10', text: 'Cuida su higiene y presentación personal' },
              { id: 'b7m2_en_11', text: 'Manifiesta actitudes de cortesía con compañeros, profesores y personal del establecimiento' },
              { id: 'b7m2_en_12', text: 'Respeta las normas de la sala de clases y del establecimiento' },
              { id: 'b7m2_en_13', text: 'Valoriza, y usa responsablemente los recursos didácticos y tecnológicos del Liceo' }
            ]
          }
        ]
      }
    ]
  },

  // ===========================================================================
  // 5. EDUCACIÓN MEDIA — 3° y 4° MEDIO (Informe de Personalidad)
  // ===========================================================================
  media_3_4: {
    key: 'media_3_4',
    category: 'basica_media',
    reportTitle: 'INFORME DE PERSONALIDAD Y DESARROLLO PERSONAL (3° Y 4° MEDIO)',
    levelLabel: '3° y 4° Medio',
    shortLabel: '3° y 4° Medio',
    defaultQualifier: 'S',
    scale: BASICA_MEDIA_SCALE,
    ambitos: [
      {
        id: 'm34_amb_1',
        sections: [
          {
            id: 'm34_sec_crecimiento',
            title: 'Crecimiento y Autoformación Personal',
            indicators: [
              { id: 'm34_cr_1', text: 'Expresa sus sentimientos en forma adecuada' },
              { id: 'm34_cr_2', text: 'Reconoce sus virtudes y defectos' },
              { id: 'm34_cr_3', text: 'Demuestra actitudes de superación personal' },
              { id: 'm34_cr_4', text: 'Cuida su higiene y presentación personal' },
              { id: 'm34_cr_5', text: 'Demuestra actitudes de respeto, por si mismo y comunidad educativa' }
            ]
          },
          {
            id: 'm34_sec_entorno',
            title: 'La Persona y su Entorno',
            indicators: [
              { id: 'm34_en_1', text: 'Participa en actividades de su curso y del Liceo' },
              { id: 'm34_en_2', text: 'Trabaja en equipo con iniciativa, colaboración y responsabilidad' },
              { id: 'm34_en_3', text: 'Cumple con las normas internas del aula y Liceo' },
              { id: 'm34_en_4', text: 'Se compromete y cuida los bienes e infraestructura del Liceo' },
              { id: 'm34_en_5', text: 'Se compromete, cuida y respeta el medio ambiente inmediato del Liceo' },
              { id: 'm34_en_6', text: 'Valoriza, y usa responsablemente los recursos didácticos y tecnológicos del Liceo' }
            ]
          },
          {
            id: 'm34_sec_etica',
            title: 'Formación Ética y Moral',
            indicators: [
              { id: 'm34_et_1', text: 'Es tolerante con las ideas de los demás' },
              { id: 'm34_et_2', text: 'Utiliza el diálogo como fuente de resolución de conflictos' },
              { id: 'm34_et_3', text: 'Actúa con responsabilidad y honradez en su quehacer escolar' },
              { id: 'm34_et_4', text: 'Demuestra actitudes de generosidad y solidaridad hacia los demás' },
              { id: 'm34_et_5', text: 'Actúa respetuosamente ante los símbolos patrios e instituciones' }
            ]
          },
          {
            id: 'm34_sec_pensamiento',
            title: 'Desarrollo del Pensamiento',
            indicators: [
              { id: 'm34_pe_1', text: 'Reflexiona y evalúa sus ideas antes de opinar con juicio crítico' },
              { id: 'm34_pe_2', text: 'Demuestra iniciativa y proactividad' },
              { id: 'm34_pe_3', text: 'Realiza análisis e interpretación de la información' },
              { id: 'm34_pe_4', text: 'Expresa sus ideas en forma clara y ordenada' },
              { id: 'm34_pe_5', text: 'Demuestra perseverancia en actividades escolares' }
            ]
          }
        ]
      }
    ]
  }
};

export const detectReportTemplateKey = (courseName?: string | null): ReportLevelKey => {
  const norm = String(courseName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!norm) return 'basica_7_media_2';

  if (norm.includes('pre') || norm.includes('nt1') || norm.includes('primer nivel') || norm.includes('1er nivel')) {
    return 'prekinder';
  }
  if (norm.includes('kinder') || norm.includes('nt2') || norm.includes('segundo nivel') || norm.includes('2do nivel')) {
    return 'kinder';
  }
  if (norm.includes('medio')) {
    if (norm.includes('3') || norm.includes('4') || norm.includes('tercero') || norm.includes('cuarto')) {
      return 'media_3_4';
    }
    return 'basica_7_media_2';
  }
  if (norm.includes('basico') || norm.includes('basica')) {
    if (norm.includes('7') || norm.includes('8') || norm.includes('septimo') || norm.includes('octavo')) {
      return 'basica_7_media_2';
    }
    return 'basica_1_6';
  }

  return 'basica_7_media_2';
};

export const getQualifierStyle = (code: string, category: 'parvularia' | 'basica_media') => {
  const scale = category === 'parvularia' ? PARVULARIA_SCALE : BASICA_MEDIA_SCALE;
  const found = scale.find(s => s.code === code);
  if (found) {
    return { color: found.color, bgColor: found.bgColor };
  }
  return { color: '#475569', bgColor: '#f1f5f9' };
};
