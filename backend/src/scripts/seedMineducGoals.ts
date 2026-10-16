import { query } from '../config/db';

const goals = [
  // 7° BÁSICO - LENGUA Y LITERATURA
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Leer habitualmente para aprender y recrearse, y seleccionar textos de acuerdo con sus preferencias.', axis: 'Lectura', desc: 'Fomentar la lectura constante de novelas, cuentos, mitos, leyendas, crónicas y artículos de divulgación adaptados al nivel.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 2', title: 'Reflexionar sobre las diferentes dimensiones de la experiencia humana, propia y ajena, a partir de la lectura de obras literarias.', axis: 'Lectura', desc: 'Analizar cómo las obras literarias abordan temas como el viaje, la identidad, la justicia, los valores individuales y colectivos.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 3', title: 'Analizar las narraciones leídas para enriquecer su comprensión, considerando conflicto narrativo, personajes y ambiente.', axis: 'Lectura', desc: 'Identificar la evolución de los personajes, el espacio físico y psicológico, el narrador y la visión de mundo propuesta.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 4', title: 'Analizar los poemas leídos para enriquecer su comprensión, considerando lenguaje figurado, rima, ritmo y hablante lírico.', axis: 'Lectura', desc: 'Interpretar metáforas, comparaciones, personificaciones y el temple de ánimo que transmite el poema.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 7', title: 'Formular una interpretación de los textos literarios leídos o vistos, coherente con su contexto y análisis.', axis: 'Lectura', desc: 'Plantear posturas personales fundamentadas con citas textuales y relación con la actualidad.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 8', title: 'Formular una postura sobre un tema determinado a partir de la lectura de textos no literarios (argumentativos y expositivos).', axis: 'Lectura', desc: 'Distinguir hechos de opiniones, identificar tesis y argumentos en editoriales, cartas al director y ensayos breves.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 12', title: 'Aplicar flexible y creativamente las habilidades de escritura en textos literarios y no literarios.', axis: 'Escritura', desc: 'Planificar, redactar, revisar y editar cuentos, cartas, columnas de opinión y reportes respetando normas gramaticales y ortográficas.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 14', title: 'Escribir con el propósito de explicar un tema, utilizando una estructura organizada y conectores adecuados.', axis: 'Escritura', desc: 'Estructurar textos expositivos con introducción, desarrollo y conclusión, incorporando datos y fuentes fidedignas.', pri: false },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 20', title: 'Dialogar constructivamente para debatir o explorar ideas, fundamentando posturas con respeto y empatía.', axis: 'Comunicación Oral', desc: 'Participar en debates, paneles y mesas redondas escuchando activamente y respondiendo con argumentos sólidos.', pri: true },
  { grade: '7° Básico', subj: 'Lengua y Literatura', code: 'OA 21', title: 'Comprender, comparar y evaluar críticamente textos orales y audiovisuales (charlas, noticieros, documentales).', axis: 'Comunicación Oral', desc: 'Detectar intencionalidad, veracidad de los datos y recursos no verbales del expositor.', pri: false },

  // 7° BÁSICO - MATEMÁTICA
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 1', title: 'Mostrar que comprenden la adición y la sustracción de números enteros.', axis: 'Números', desc: 'Representar números enteros en la recta numérica y resolver problemas contextualizados (temperaturas, balances financieros, alturas).', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 2', title: 'Explicar la multiplicación y la división de fracciones positivas y decimales.', axis: 'Números', desc: 'Aplicar algoritmos de cálculo y resolver situaciones prácticas de reparto proporcional y medición.', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 3', title: 'Resolver problemas que involucren porcentajes en diversos contextos de la vida real.', axis: 'Números', desc: 'Calcular descuentos, IVA, recargos e intereses simples en situaciones de consumo y presupuesto familiar.', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 6', title: 'Utilizar el lenguaje algebraico para generalizar relaciones entre números y plantear ecuaciones.', axis: 'Álgebra y Funciones', desc: 'Traducir enunciados verbales a expresiones algebraicas y resolver ecuaciones de primer grado ax + b = c.', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 8', title: 'Modelar situaciones de la vida cotidiana usando la función lineal y la función afín.', axis: 'Álgebra y Funciones', desc: 'Graficar en el plano cartesiano e interpretar la pendiente y el punto de corte con el eje Y.', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 11', title: 'Mostrar que comprenden el círculo y la circunferencia (perímetro y área).', axis: 'Geometría', desc: 'Calcular área y perímetro de círculos y figuras compuestas, usando la aproximación de Pi en problemas de construcción y diseño.', pri: true },
  { grade: '7° Básico', subj: 'Matemática', code: 'OA 16', title: 'Representar datos obtenidos en una muestra mediante tablas de frecuencias y gráficos de barras y circulares.', axis: 'Probabilidad y Estadística', desc: 'Calcular e interpretar media aritmética, mediana y moda en investigaciones sociales y científicas.', pri: true },

  // 7° BÁSICO - CIENCIAS NATURALES
  { grade: '7° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Explicar el funcionamiento general de los sistemas digestivo, respiratorio, circulatorio y excretor.', axis: 'Biología', desc: 'Comprender la integración de los sistemas del cuerpo humano en el aporte de nutrientes y oxígeno a las células.', pri: true },
  { grade: '7° Básico', subj: 'Ciencias Naturales', code: 'OA 2', title: 'Explicar la formación de un nuevo individuo, considerando ciclo menstrual, fecundación y métodos de control natal.', axis: 'Biología', desc: 'Analizar la sexualidad humana desde una perspectiva biológica, afectiva y de autocuidado.', pri: true },
  { grade: '7° Básico', subj: 'Ciencias Naturales', code: 'OA 13', title: 'Investigar experimentalmente y explicar el comportamiento de gases ideales y las leyes de gases.', axis: 'Física y Química', desc: 'Comprobar las relaciones entre volumen, presión y temperatura en base al modelo cinético molecular.', pri: true },
  { grade: '7° Básico', subj: 'Ciencias Naturales', code: 'OA 14', title: 'Investigar y explicar la fuerza gravitacional y su efecto en el sistema solar y en la caída libre de los cuerpos.', axis: 'Física', desc: 'Comprender masa, peso y el movimiento de los planetas y satélites.', pri: true },

  // 7° BÁSICO - HISTORIA, GEOGRAFÍA Y CIENCIAS SOCIALES
  { grade: '7° Básico', subj: 'Historia, Geografía y Ciencias Sociales', code: 'OA 1', title: 'Explicar el proceso de hominización, reconociendo las principales etapas de la evolución de la especie humana.', axis: 'Historia', desc: 'Analizar el surgimiento de las sociedades recolectoras y la dispersión por el planeta.', pri: true },
  { grade: '7° Básico', subj: 'Historia, Geografía y Ciencias Sociales', code: 'OA 3', title: 'Explicar que en las primeras civilizaciones se consolidaron procesos como la estratificación social y la centralización del poder.', axis: 'Historia', desc: 'Estudiar civilizaciones fluviales: Mesopotamia, Egipto, India y China.', pri: true },
  { grade: '7° Básico', subj: 'Historia, Geografía y Ciencias Sociales', code: 'OA 4', title: 'Caracterizar la polis griega como un espacio de participación ciudadana y origen de la democracia.', axis: 'Historia', desc: 'Comparar el modelo democrático ateniense con la república romana y los sistemas políticos actuales.', pri: true },

  // 8° BÁSICO - LENGUA Y LITERATURA
  { grade: '8° Básico', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Leer habitualmente textos literarios de autores nacionales e internacionales, desarrollando gusto y juicio estético.', axis: 'Lectura', desc: 'Lectura de novelas contemporáneas, ciencia ficción, poesía y teatro.', pri: true },
  { grade: '8° Básico', subj: 'Lengua y Literatura', code: 'OA 2', title: 'Reflexionar sobre la experiencia humana, la soledad, el amor, el heroísmo y la identidad a partir de la literatura.', axis: 'Lectura', desc: 'Analizar tópicos literarios clásicos en textos modernos.', pri: true },
  { grade: '8° Básico', subj: 'Lengua y Literatura', code: 'OA 3', title: 'Analizar el conflicto dramático y las características del género teatral.', axis: 'Lectura', desc: 'Identificar acotaciones, diálogos, clímax y desenlace en obras dramáticas.', pri: true },
  { grade: '8° Básico', subj: 'Lengua y Literatura', code: 'OA 8', title: 'Analizar y evaluar textos de los medios de comunicación masiva (noticias, reportajes, publicidad).', axis: 'Lectura', desc: 'Identificar estereotipos, recursos persuasivos y propósitos explícitos e implícitos.', pri: true },
  { grade: '8° Básico', subj: 'Lengua y Literatura', code: 'OA 13', title: 'Escribir textos argumentativos sobre temas controversiales de interés público.', axis: 'Escritura', desc: 'Elaborar ensayos breves y columnas de opinión con argumentos sólidos, contraargumentos y citas.', pri: true },

  // 8° BÁSICO - MATEMÁTICA
  { grade: '8° Básico', subj: 'Matemática', code: 'OA 1', title: 'Multiplicar y dividir números enteros y racionales positivos y negativos en la resolución de problemas.', axis: 'Números', desc: 'Regla de los signos y operaciones combinadas con fracciones y decimales en contextos cotidianos.', pri: true },
  { grade: '8° Básico', subj: 'Matemática', code: 'OA 2', title: 'Mostrar que comprenden las potencias de base racional y exponente entero.', axis: 'Números', desc: 'Aplicar propiedades de potencias en cálculos algebraicos y notación científica.', pri: true },
  { grade: '8° Básico', subj: 'Matemática', code: 'OA 4', title: 'Mostrar que comprenden las raíces cuadradas de números naturales.', axis: 'Números', desc: 'Estimar raíces inexactas y aplicarlas en el Teorema de Pitágoras.', pri: true },
  { grade: '8° Básico', subj: 'Matemática', code: 'OA 8', title: 'Modelar situaciones usando sistemas de ecuaciones lineales 2x2.', axis: 'Álgebra y Funciones', desc: 'Resolver sistemas mediante métodos algebraicos (reducción, sustitución, igualación) y gráfico.', pri: true },
  { grade: '8° Básico', subj: 'Matemática', code: 'OA 11', title: 'Desarrollar y aplicar la fórmula para el área y volumen de prismas rectos y cilindros.', axis: 'Geometría', desc: 'Resolver problemas de envasado, almacenamiento y diseño arquitectónico.', pri: true },

  // 1° MEDIO - LENGUA Y LITERATURA
  { grade: '1° Medio', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Leer y analizar obras literarias de diversas épocas que aborden temas como la tragedia humana y las relaciones sociales.', axis: 'Lectura', desc: 'Analizar visión de mundo, contextos de producción y recepción en textos clásicos y universales.', pri: true },
  { grade: '1° Medio', subj: 'Lengua y Literatura', code: 'OA 2', title: 'Analizar poemas reconociendo motivos líricos, temple de ánimo y figuras retóricas complejas.', axis: 'Lectura', desc: 'Interpretación de metáforas, sinestesias, alegorías y métrica poética.', pri: true },
  { grade: '1° Medio', subj: 'Lengua y Literatura', code: 'OA 8', title: 'Formular juicios críticos sobre textos de opinión y columnas periodísticas.', axis: 'Lectura', desc: 'Evaluar consistencia argumentativa, falacias lógicas y postura editorial.', pri: true },
  { grade: '1° Medio', subj: 'Lengua y Literatura', code: 'OA 14', title: 'Escribir ensayos y monografías con rigor conceptual, citas bibliográficas y estructura académica.', axis: 'Escritura', desc: 'Uso de normas de citación (APA), desarrollo de tesis y contraargumentación.', pri: true },

  // 1° MEDIO - MATEMÁTICA
  { grade: '1° Medio', subj: 'Matemática', code: 'OA 1', title: 'Calcular operaciones con números racionales e irracionales en la recta numérica.', axis: 'Números', desc: 'Propiedades de clausura, aproximación por redondeo y truncamiento, números irracionales notables (Pi, raíz de 2).', pri: true },
  { grade: '1° Medio', subj: 'Matemática', code: 'OA 2', title: 'Mostrar que comprenden las potencias de base racional y exponente racional (raíces enésimas).', axis: 'Números', desc: 'Transformación entre potencias y radicales, racionalización simple de denominadores.', pri: true },
  { grade: '1° Medio', subj: 'Matemática', code: 'OA 3', title: 'Desarrollar los productos notables de manera concreta, pictórica y simbólica.', axis: 'Álgebra y Funciones', desc: 'Cuadrado de binomio, suma por su diferencia, binomios con término común y factorización.', pri: true },
  { grade: '1° Medio', subj: 'Matemática', code: 'OA 4', title: 'Resolver sistemas de ecuaciones lineales (2x2) relacionados con problemas del entorno.', axis: 'Álgebra y Funciones', desc: 'Interpretación gráfica del punto de intersección y análisis de soluciones (única, infinitas o sin solución).', pri: true },
  { grade: '1° Medio', subj: 'Matemática', code: 'OA 5', title: 'Graficar y analizar el comportamiento de la función cuadrática f(x) = ax² + bx + c.', axis: 'Álgebra y Funciones', desc: 'Determinar vértice, eje de simetría, concavidad y ceros de la función en problemas de trayectorias y optimización.', pri: true },

  // 2° MEDIO - LENGUA Y LITERATURA
  { grade: '2° Medio', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Formular interpretaciones de obras literarias considerando el diálogo intertextual y las tradiciones culturales.', axis: 'Lectura', desc: 'Identificar arquetipos, mitos universales y su recreación en la narrativa contemporánea.', pri: true },
  { grade: '2° Medio', subj: 'Lengua y Literatura', code: 'OA 8', title: 'Evaluar discursos públicos y argumentativos de líderes sociales, políticos y científicos.', axis: 'Lectura', desc: 'Analizar la legitimidad del emisor, la apelación a las emociones y la solidez lógica de los argumentos.', pri: true },
  { grade: '2° Medio', subj: 'Lengua y Literatura', code: 'OA 10', title: 'Escribir textos expositivos y argumentativos estructurados según modelos formales de investigación.', axis: 'Escritura', desc: 'Redacción de informes técnicos, ensayos y propuestas fundamentadas.', pri: true },

  // 2° MEDIO - MATEMÁTICA
  { grade: '2° Medio', subj: 'Matemática', code: 'OA 1', title: 'Realizar cálculos y estimaciones que involucren operaciones con números reales.', axis: 'Números', desc: 'Operaciones con radicales y logaritmos en base 10 y base e.', pri: true },
  { grade: '2° Medio', subj: 'Matemática', code: 'OA 2', title: 'Mostrar que comprenden las propiedades de los logaritmos y su relación con potencias y raíces.', axis: 'Números', desc: 'Resolver ecuaciones logarítmicas y aplicaciones en escalas de Richter, decibeles y pH.', pri: true },
  { grade: '2° Medio', subj: 'Matemática', code: 'OA 4', title: 'Resolver problemas usando la ecuación cuadrática ax² + bx + c = 0.', axis: 'Álgebra y Funciones', desc: 'Aplicar discriminante para determinar la naturaleza de las raíces y resolver problemas reales.', pri: true },
  { grade: '2° Medio', subj: 'Matemática', code: 'OA 7', title: 'Desarrollar y aplicar las razones trigonométricas en el triángulo rectángulo (seno, coseno, tangente).', axis: 'Geometría', desc: 'Resolver problemas de topografía, navegación y cálculo de distancias inaccesibles.', pri: true },

  // 3° MEDIO - LENGUA Y LITERATURA
  { grade: '3° Medio', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Formular interpretaciones de textos literarios que aborden problemáticas éticas, sociales y existenciales.', axis: 'Lectura', desc: 'Analizar la condición humana, el poder, la marginalidad y la justicia en la literatura universal y chilena.', pri: true },
  { grade: '3° Medio', subj: 'Lengua y Literatura', code: 'OA 3', title: 'Evaluar críticamente textos argumentativos y discursos persuasivos en medios digitales y redes.', axis: 'Lectura', desc: 'Detección de noticias falsas (fake news), sesgos algorítmicos y posverdad.', pri: true },
  { grade: '3° Medio', subj: 'Lengua y Literatura', code: 'OA 6', title: 'Producir textos escritos y multimodales orientados a incidir en debates comunitarios y ciudadanos.', axis: 'Escritura', desc: 'Elaboración de columnas de opinión, proyectos comunitarios y campañas de concientización.', pri: true },

  // 3° MEDIO - MATEMÁTICA
  { grade: '3° Medio', subj: 'Matemática', code: 'OA 1', title: 'Tomar decisiones en situaciones de incerteza que involucren el análisis de datos con medidas de dispersión y probabilidades condicionales.', axis: 'Probabilidad y Estadística', desc: 'Calcular varianza, desviación estándar, coeficiente de variación y probabilidad condicional.', pri: true },
  { grade: '3° Medio', subj: 'Matemática', code: 'OA 2', title: 'Modelar situaciones o fenómenos de cambio continuo mediante la función exponencial y logarítmica.', axis: 'Álgebra y Funciones', desc: 'Aplicaciones en crecimiento bacteriano, interés compuesto continuo y decaimiento radiactivo.', pri: true },
  { grade: '3° Medio', subj: 'Matemática', code: 'OA 3', title: 'Aplicar modelos geométricos mediante razones trigonométricas en situaciones de la vida real.', axis: 'Geometría', desc: 'Teorema del seno y coseno en triángulos oblicuángulos.', pri: true },

  // 3° MEDIO - CIENCIAS PARA LA CIUDADANÍA
  { grade: '3° Medio', subj: 'Ciencias para la Ciudadanía', code: 'OA 1', title: 'Evaluar hábitos de vida saludable, nutrición balanceada y prevención de enfermedades cardiovasculares y metabólicas.', axis: 'Bienestar y Salud', desc: 'Análisis de factores de riesgo, actividad física y epidemiología nacional.', pri: true },
  { grade: '3° Medio', subj: 'Ciencias para la Ciudadanía', code: 'OA 2', title: 'Analizar críticamente el impacto ambiental del consumo humano, el cambio climático y la gestión sustentable de recursos.', axis: 'Ambiente y Sustentabilidad', desc: 'Huella de carbono, crisis hídrica en Chile y energías renovables no convencionales.', pri: true },

  // 4° MEDIO - LENGUA Y LITERATURA
  { grade: '4° Medio', subj: 'Lengua y Literatura', code: 'OA 1', title: 'Formular interpretaciones de obras literarias leídas o vistas, que consideren la relación del texto con su contexto de producción.', axis: 'Lectura', desc: 'Analizar cómo las obras literarias interpelan a los lectores a través del tiempo.', pri: true },
  { grade: '4° Medio', subj: 'Lengua y Literatura', code: 'OA 2', title: 'Evaluar críticamente textos de diversa índole (argumentativos, periodísticos, audiovisuales), reconociendo sesgos e ideologías.', axis: 'Lectura', desc: 'Distinguir entre posturas legítimas, manipulación discursiva y propaganda.', pri: true },
  { grade: '4° Medio', subj: 'Lengua y Literatura', code: 'OA 3', title: 'Escribir ensayos, textos de opinión y reportes rigurosos, empleando estrategias de cohesión y coherencia formal.', axis: 'Escritura', desc: 'Uso de registro formal culto, vocabulario preciso y citas consistentes.', pri: true },

  // 4° MEDIO - MATEMÁTICA
  { grade: '4° Medio', subj: 'Matemática', code: 'OA 1', title: 'Fundamentar decisiones en el ámbito financiero y económico personal o comunitario mediante tasas de interés e índices económicos.', axis: 'Educación Financiera', desc: 'Cálculo de créditos de consumo, hipotecarios, CAE, UF, UTM e inflación.', pri: true },
  { grade: '4° Medio', subj: 'Matemática', code: 'OA 2', title: 'Fundamentar decisiones en situaciones de incerteza a partir de inferencia estadística y conjeturas probabilísticas.', axis: 'Probabilidad y Estadística', desc: 'Distribución normal estandarizada, intervalos de confianza y toma de decisiones.', pri: true },

  // 4° MEDIO - FILOSOFÍA
  { grade: '4° Medio', subj: 'Filosofía', code: 'OA 1', title: 'Describir las características del quehacer filosófico, diferenciándolo del conocimiento científico y del sentido común.', axis: 'Filosofía General', desc: 'Preguntas fundamentales sobre el sentido de la existencia, la verdad, el bien y la belleza.', pri: true },
  { grade: '4° Medio', subj: 'Filosofía', code: 'OA 2', title: 'Analizar y fundamentar problemas éticos contemporáneos (bioética, inteligencia artificial, justicia distributiva).', axis: 'Ética y Política', desc: 'Dilemas morales y corrientes éticas: utilitarismo, deontología kantiana y ética del cuidado.', pri: true },

  // 3° Y 4° MEDIO - EDUCACIÓN CIUDADANA
  { grade: '3° Medio', subj: 'Educación Ciudadana', code: 'OA 1', title: 'Comprender el rol del Estado, el principio de soberanía y la separación de poderes en la república democrática chilena.', axis: 'Democracia y Estado', desc: 'Estructura constitucional, órganos de control y participación cívica.', pri: true },
  { grade: '4° Medio', subj: 'Educación Ciudadana', code: 'OA 1', title: 'Evaluar los desafíos de la democracia contemporánea (desigualdad, medio ambiente, participación ciudadana y derechos humanos).', axis: 'Ciudadanía Crítica', desc: 'Mecanismos de resolución pacífica de conflictos y justicia social.', pri: true },

  // ESPECIALIDADES TÉCNICO-PROFESIONALES (LTP CAMPANARIO)
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 1', title: 'Mecanizar piezas metálicas y poliméricas en máquinas herramientas convencionales según planos de fabricación.', axis: 'Torno y Fresa', desc: 'Montaje de piezas, afilado de herramientas, cálculo de revoluciones y avances, torneado cilíndrico y roscado.', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 2', title: 'Interpretar planos técnicos mecánicos, vistas, cortes, secciones y símbolos de soldadura según normas ISO y DIN.', axis: 'Dibujo Técnico', desc: 'Lectura de tolerancias geométricas, rugosidad superficial y acotado normalizado.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 1', title: 'Programar y operar máquinas herramientas de control numérico computarizado (CNC) para manufactura de precisión.', axis: 'Mecanizado CNC', desc: 'Programación en código G y M, simulación en software CAD/CAM y mecanizado en torno CNC.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 2', title: 'Ejecutar procesos de soldadura por arco eléctrico (SMAW, GMAW, GTAW) conforme a normas de calidad y seguridad AWS.', axis: 'Soldadura Industrial', desc: 'Preparación de juntas en V y bisel, parámetros de corriente y control de defectos de soldadura.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 3', title: 'Realizar mantenimiento preventivo y correctivo a equipos mecánicos, bombas, reductores y circuitos electro-neumáticos.', axis: 'Mantenimiento Electromecánico', desc: 'Alineación de ejes, lubricación, cambio de rodamientos y detección de fallas.', pri: true },

  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 1', title: 'Planificar actividades lúdicas y formativas para niños y niñas de salas cuna y niveles medios, según Bases Curriculares Parvularias.', axis: 'Pedagogía Infantil', desc: 'Diseño de experiencias centradas en el juego, autonomía y desarrollo emocional.', pri: true },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 2', title: 'Promover hábitos de vida saludable, higiene, alimentación equilibrada y descanso en lactantes y párvulos.', axis: 'Salud y Nutrición', desc: 'Técnicas de muda, fomento de alimentación perceptiva y prevención de enfermedades.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 1', title: 'Elaborar recursos y ambientes pedagógicos inclusivos que favorezcan el desarrollo psicomotor, sensorial y cognitivo infantil.', axis: 'Didáctica y Recursos', desc: 'Confección de material multisensorial reciclable y ambientación de rincones de aprendizaje.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 2', title: 'Aplicar protocolos de primeros auxilios pediátricos y medidas de prevención de accidentes y evacuación en recintos educativos.', axis: 'Seguridad y Primeros Auxilios', desc: 'Manejo de atragantamientos, caídas, quemaduras leves y simulacros de emergencia.', pri: true }
];

async function run() {
  console.log('Seeding MINEDUC learning goals into Supabase PostgreSQL...');
  let inserted = 0;
  for (const g of goals) {
    const cleanGrade = g.grade.replace(/[^a-zA-Z0-9]/g, '');
    const cleanSubj = g.subj.replace(/[^a-zA-Z0-9]/g, '');
    const cleanCode = g.code.replace(/[^a-zA-Z0-9]/g, '');
    const id = `OA-${cleanGrade}-${cleanSubj}-${cleanCode}`;

    await query(`
      INSERT INTO curriculum_learning_goals (
        id, grade_level, subject, oa_code, oa_title, description, axis, is_prioritized
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        grade_level = EXCLUDED.grade_level,
        subject = EXCLUDED.subject,
        oa_code = EXCLUDED.oa_code,
        oa_title = EXCLUDED.oa_title,
        description = EXCLUDED.description,
        axis = EXCLUDED.axis,
        is_prioritized = EXCLUDED.is_prioritized
    `, [id, g.grade, g.subj, g.code, g.title, g.desc, g.axis, g.pri]);
    inserted++;
  }
  const count = await query('SELECT count(*) FROM curriculum_learning_goals');
  console.log(`Listo! ${inserted} OAs procesados. Total en BD: ${count.rows[0].count}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error seeding goals:', err);
  process.exit(1);
});
