// =============================================================================
// DEFINICIONES OFICIALES DE INFORMES MINEDUC / PIE (DECRETO 170 / 2010 & LEY TEA)
// LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
// =============================================================================

export interface MineducReportType {
  id: string;
  code: string;
  title: string;
  category: 'MINISTERIAL' | 'SEMESTRAL' | 'PROTOCOLOS' | 'NEET' | 'NEEP';
  categoryName: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  purpose?: string;
  specificAreas?: string[];
}

// 5 Plantillas Oficiales de Alta Fidelidad solicitadas por MINEDUC y Agencia de Calidad
export const MINEDUC_OFFICIAL_TEMPLATES: MineducReportType[] = [
  {
    id: 'SIMCE_NEEP',
    code: 'CERT-SIMCE',
    title: 'Certificado Estudiante con NEEP (SIMCE)',
    category: 'MINISTERIAL',
    categoryName: 'Agencia de Calidad',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Certificado de acreditación NEEP para la Plataforma de Certificados SIMCE ante la Agencia de Calidad de la Educación.',
    purpose: 'Presentación ante la Agencia de Calidad de la Educación.'
  },
  {
    id: 'FUS_MINEDUC',
    code: 'FUS-MINEDUC',
    title: 'Formulario Único PIE (FUS) - Informe para la Familia',
    category: 'MINISTERIAL',
    categoryName: 'Decreto 170 / 2010',
    badgeColor: '#059669',
    badgeBg: '#d1fae5',
    description: 'Evaluación Diagnóstica Integral de Ingreso y Reevaluación a Modalidad de Educación Especial según Decreto 170/2010.',
    purpose: 'Normativa Decreto 170/2010 - Entrega obligatoria a la familia.'
  },
  {
    id: 'INFORME_FAMILIA_SEMESTRAL',
    code: 'INF-SEMESTRAL',
    title: 'Informe para la Familia (Semestral PIE)',
    category: 'SEMESTRAL',
    categoryName: 'Seguimiento Semestral',
    badgeColor: '#d97706',
    badgeBg: '#fef3c7',
    description: 'Reporte semestral de avances por áreas de apoyo: Psicopedagogía, Psicología, Fonoaudiología, Kinesiología y T. Ocupacional.',
    purpose: 'Reporte formal periódico para la familia y archivo escolar.'
  },
  {
    id: 'PAEC_PLAN_TEA',
    code: 'PAEC-TEA',
    title: 'Plan de Manejo Individual (PAEC / Plan TEA)',
    category: 'PROTOCOLOS',
    categoryName: 'Protocolo de Desescalada',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Plan de Acompañamiento Estratégico (PAEC), Perfil Sensorial, Gatillantes y Matriz de Crisis en 4 Fases.',
    purpose: 'Protocolo de Apoyo Individual y Desescalada Conductual.'
  },
  {
    id: 'PSICOPEDAGOGICO_DEC170',
    code: 'EVAL-PSICOPED',
    title: 'Informe de Evaluación Psicopedagógica Integral (Decreto 170)',
    category: 'MINISTERIAL',
    categoryName: 'Decreto 170 / 2010',
    badgeColor: '#0f766e',
    badgeBg: '#ccfbf1',
    description: 'Detección y Valoración Integral de NEE con pauta pedagógica (10 indicadores) y pauta social (10 indicadores) oficiales.',
    purpose: 'Informe de Evaluación Psicopedagógica con 20 pautas literales oficiales.'
  }
];

// 10 Formularios Únicos de Reevaluación por Diagnóstico (Decreto 170)
export const MINEDUC_DIAGNOSTIC_REPORT_TYPES: MineducReportType[] = [
  {
    id: 'DEA',
    code: 'FU-DEA',
    title: 'Dificultades Específicas del Aprendizaje (DEA)',
    category: 'NEET',
    categoryName: 'NEE Transitoria',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Reevaluación de procesos en Lectura (Decodificación y Comprensión), Escritura y Cálculo Matemático.',
    specificAreas: ['Lectura (Precisión y Fluidez)', 'Comprensión Lectora', 'Escritura y Ortografía', 'Cálculo y Resolución de Problemas']
  },
  {
    id: 'FIL',
    code: 'FU-FIL',
    title: 'Funcionamiento Intelectual Limítrofe (FIL / NEET)',
    category: 'NEET',
    categoryName: 'NEE Transitoria',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Capacidad intelectual en rango limítrofe y evaluación del funcionamiento adaptativo multidimensional.',
    specificAreas: ['Habilidades Conceptuales', 'Habilidades Prácticas de Vida', 'Habilidades Sociales', 'Velocidad de Procesamiento']
  },
  {
    id: 'TDA',
    code: 'FU-TDA',
    title: 'Trastorno por Déficit Atencional (TDA / TDAH)',
    category: 'NEET',
    categoryName: 'NEE Transitoria',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Atención focalizada, sostenida, control de impulsos, hiperactividad motora y autorregulación escolar.',
    specificAreas: ['Atención Sostenida y Concentración', 'Control de Impulsos e Inhibición', 'Nivel de Actividad Motora', 'Organización y Planificación de Tareas']
  },
  {
    id: 'TEL',
    code: 'FU-TEL',
    title: 'Trastorno Específico del Lenguaje (TEL)',
    category: 'NEET',
    categoryName: 'NEE Transitoria',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'Reevaluación fonoaudiológica en niveles fonológico, semántico, morfosintáctico y pragmático.',
    specificAreas: ['Nivel Fonológico y Articulatorio', 'Nivel Léxico-Semántico (Vocabulario)', 'Nivel Morfosintáctico (Estructuración)', 'Nivel Pragmático (Uso social del habla)']
  },
  {
    id: 'DISCAPACIDAD_INTELECTUAL',
    code: 'FU-DI',
    title: 'Discapacidad Intelectual (NEEP)',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Evaluación del funcionamiento intelectual, conducta adaptativa y efectividad de apoyos permanentes.',
    specificAreas: ['Desarrollo Cognitivo y Razonamiento', 'Comunicación Funcional', 'Autocuidado e Independencia Personal', 'Inclusión Social y Participación']
  },
  {
    id: 'TEA',
    code: 'FU-TEA',
    title: 'Trastorno del Espectro Autista (TEA)',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Interacción social recíproca, comunicación verbal/no verbal, flexibilidad conductual y procesamiento sensorial.',
    specificAreas: ['Interacción Social y Reciprocidad Emocional', 'Comunicación Verbal y No Verbal', 'Flexibilidad Conductual e Intereses', 'Integración Sensorial y Autorregulación']
  },
  {
    id: 'DISCAPACIDAD_AUDITIVA',
    code: 'FU-AUD',
    title: 'Discapacidad Auditiva',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Hipoacusia o sordera, ayudas técnicas auditivas, desarrollo de la lengua oral y/o lengua de señas.',
    specificAreas: ['Acceso a la Información y Audición Funcional', 'Vía de Comunicación (Oral / Lengua de Señas)', 'Lectura Labiofacial y Comprensión', 'Participación en el Aula Común']
  },
  {
    id: 'DISCAPACIDAD_VISUAL',
    code: 'FU-VIS',
    title: 'Discapacidad Visual',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Baja visión o ceguera, ayudas ópticas, sistema Braille, orientación y movilidad en el recinto escolar.',
    specificAreas: ['Funcionalidad Visual y Agudeza', 'Acceso al Texto (Macrotipo / Braille / Lector de Pantalla)', 'Orientación y Movilidad en el Liceo', 'Habilidades de la Vida Diaria']
  },
  {
    id: 'DISCAPACIDAD_MOTORA',
    code: 'FU-MOT',
    title: 'Discapacidad Motora',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Limitaciones neuromusculoesqueléticas, movilidad funcional, motricidad fina, uso de ayudas técnicas.',
    specificAreas: ['Movilidad y Desplazamiento Autónomo', 'Motricidad Fina y Escritura', 'Uso y Cuidado de Ayudas Técnicas', 'Autonomía en Actividades Cotidianas']
  },
  {
    id: 'DISCAPACIDAD_MULTIPLE',
    code: 'FU-MUL',
    title: 'Discapacidad Múltiple / Sordoceguera',
    category: 'NEEP',
    categoryName: 'NEE Permanente',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    description: 'Combinación de dos o más condiciones discapacitantes que requieren apoyos intensos y generalizados.',
    specificAreas: ['Canales Sensoriales de Comunicación', 'Desarrollo Cognitivo y Perceptivo', 'Autonomía y Convivencia', 'Efectividad de Apoyos Multidisciplinarios']
  }
];

export const ALL_MINEDUC_REPORT_TYPES: MineducReportType[] = [
  ...MINEDUC_OFFICIAL_TEMPLATES,
  ...MINEDUC_DIAGNOSTIC_REPORT_TYPES
];

// 10 Indicadores Oficiales de la Pauta Pedagógica (Decreto 170)
export const PAUTA_PEDAGOGICA_INDICADORES = [
  '1. Demuestra comprensión de instrucciones orales, escritas o señas con apoyos pertinentes.',
  '2. Manifiesta disposición para el aprendizaje, prestando atención e interés por las tareas.',
  '3. Mantiene la atención en actividades durante períodos adecuados a su edad.',
  '4. Organiza su tiempo y materiales demostrando progresiva autonomía.',
  '5. Utiliza estrategias personales o apoyos para resolver dificultades o pide ayuda.',
  '6. Participa en actividades grupales respetando turnos y aportando ideas.',
  '7. Muestra iniciativa proponiendo formas propias de realizar actividades.',
  '8. Expresa ideas, emociones o experiencias a través de diversos lenguajes.',
  '9. Evidencia avances en tareas mostrando esfuerzo, persistencia y sentido de logro.',
  '10. Reflexiona sobre su propio proceso reconociendo logros y desafíos.'
];

// 10 Indicadores Oficiales de Antecedentes Sociales y Comunicativos (Decreto 170)
export const PAUTA_SOCIAL_INDICADORES = [
  '1. Atiende y muestra interés ante interacciones comunicativas accesibles.',
  '2. Participa en intercambios respetando turnos mediante lenguaje oral o aumentativo.',
  '3. Colabora en actividades de juego colectivo según sus posibilidades.',
  '4. Inicia interacciones sociales mostrando iniciativa para participar con otros.',
  '5. Participa en la organización de juegos o tareas negociando acuerdos.',
  '6. Recibe y responde a comentarios o sugerencias de forma respetuosa.',
  '7. Solicita ayuda utilizando medios de comunicación acordes a su contexto.',
  '8. Acepta ayuda o acompañamiento de pares o adultos en el trabajo conjunto.',
  '9. Establece y mantiene vínculos positivos con sus compañeros.',
  '10. Reconoce y expresa emociones propias y ajenas mostrando empatía.'
];

export const getChileanDateComponents = (dateVal?: any) => {
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  let d = new Date();
  if (dateVal) {
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      } else {
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    } else if (dateVal instanceof Date) {
      d = dateVal;
    }
  }
  return {
    dia: String(d.getDate()),
    mes: months[d.getMonth()] || 'marzo',
    anio: String(d.getFullYear())
  };
};

export const formatChileDate = (val?: any): string => {
  if (!val) return 'No registrada';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  } else if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val);
};

