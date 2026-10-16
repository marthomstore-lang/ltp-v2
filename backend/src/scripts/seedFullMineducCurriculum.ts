import { query } from '../config/db';

interface GoalDef {
  grade: string;
  subj: string;
  code: string;
  title: string;
  axis: string;
  desc: string;
  pri: boolean;
}

const goals: GoalDef[] = [
  // =========================================================================
  // EDUCACIÓN PARVULARIA (Pre-Kinder y Kinder)
  // =========================================================================
  // Ámbito: Comunicación Integral - Lenguaje Verbal
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 1', title: 'Expresarse oralmente en situaciones cotidianas sobre sus necesidades, intereses y vivencias.', axis: 'Comunicación Oral', desc: 'Comunicarse en forma oral empleando vocabulario variado y oraciones simples.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Descubrir atributos fonológicos de palabras conocidas (conteo de sílabas, rimas, sonidos iniciales).', axis: 'Conciencia Fonológica', desc: 'Identificar sílabas y sonidos iniciales y finales en canciones y rimas.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Comprender contenidos explícitos de textos literarios y no literarios a partir de la escucha atenta.', axis: 'Comprensión Lectora', desc: 'Responder preguntas simples sobre personajes y acciones de cuentos narrados.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 8', title: 'Representar gráficamente algunos trazos y signos para comunicar mensajes.', axis: 'Iniciación a la Escritura', desc: 'Trazos rectos, curvos y semicírculos con progresiva coordinación visomotriz.', pri: false },
  // Ámbito: Interacción y Comprensión del Entorno - Pensamiento Matemático
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Matemática', code: 'OA 1', title: 'Crear patrones visuales, sonoros o corporales de 2 o 3 elementos.', axis: 'Patrones y Álgebra', desc: 'Reproducir y continuar patrones rítmicos y visuales con objetos concretos.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Matemática', code: 'OA 3', title: 'Clasificar y seriar objetos por 2 o más atributos simultáneos (color, forma, tamaño).', axis: 'Razonamiento Lógico', desc: 'Ordenar colecciones de menor a mayor y agrupar por criterios comunes.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Matemática', code: 'OA 6', title: 'Emplear los números del 1 al 10 para contar, cuantificar, ordenar y comparar cantidades.', axis: 'Números y Cantidades', desc: 'Asociar número con cantidad de objetos concretos e identificar cardinalidad.', pri: true },
  { grade: '1er nivel de Transición (Pre-kinder)', subj: 'Matemática', code: 'OA 10', title: 'Identificar atributos de figuras 2D y 3D en objetos de su entorno.', axis: 'Geometría', desc: 'Reconocer círculos, cuadrados, triángulos y esferas en situaciones lúdicas.', pri: false },
  // 2° Nivel Transición (Kinder)
  { grade: '2° nivel de Transición (Kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 1', title: 'Expresarse oralmente en forma clara y comprensible empleando estructuras oracionales completas.', axis: 'Comunicación Oral', desc: 'Relatar experiencias personales y opinar sobre relatos escuchados.', pri: true },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Identificar sonido inicial y final vocálico y consonántico en palabras significativas.', axis: 'Conciencia Fonológica', desc: 'Segmentar palabras en sílabas y asociar fonema con grafema inicial.', pri: true },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Comprender textos literarios y no literarios identificando tema central, personajes e ideas clave.', axis: 'Comprensión Lectora', desc: 'Hacer predicciones, inferencias simples y valorar actitudes de los personajes.', pri: true },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Lenguaje y Comunicación', code: 'OA 8', title: 'Escribir signos gráficos y letras respetando linealidad y orientación de izquierda a derecha.', axis: 'Iniciación a la Escritura', desc: 'Escribir el propio nombre y palabras familiares con intención comunicativa.', pri: false },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Matemática', code: 'OA 1', title: 'Crear patrones complejos de hasta 3 elementos combinando distintas variables.', axis: 'Patrones', desc: 'Extender e inventar patrones corporales, geométricos y pictóricos.', pri: true },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Matemática', code: 'OA 6', title: 'Emplear los números hasta el 20 para contar, ordenar y cuantificar elementos.', axis: 'Números y Cantidades', desc: 'Conteo uno a uno, correspondencia término a término y escritura de numerales.', pri: true },
  { grade: '2° nivel de Transición (Kinder)', subj: 'Matemática', code: 'OA 8', title: 'Resolver problemas simples de adición y sustracción con material concreto hasta el 10.', axis: 'Operaciones', desc: 'Agregar, quitar, juntar y separar elementos en contextos de juego.', pri: true },

  // =========================================================================
  // 1° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  // Lenguaje y Comunicación
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 1', title: 'Reconocer que los textos escritos transmiten mensajes y que son leídos de izquierda a derecha y de arriba hacia abajo.', axis: 'Lectura', desc: 'Familiarizarse con el soporte escrito y la direccionalidad de la lectura.', pri: true },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Identificar los sonidos que componen las palabras (conciencia fonológica), reconociendo, separando y combinando sus fonemas y sílabas.', axis: 'Lectura', desc: 'Desarrollar habilidades decodificadoras iniciales con vocales y consonantes frecuentes.', pri: true },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 4', title: 'Leer palabras aisladas y en contexto, aplicando su conocimiento de la correspondencia letra-sonido.', axis: 'Lectura', desc: 'Lectura fluida de palabras simples y oraciones de complejidad creciente.', pri: true },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 8', title: 'Demostrar comprensión de narraciones leídas o escuchadas: extrayendo información explícita e implícita.', axis: 'Lectura', desc: 'Identificar personajes principales, lugares y secuencia temporal de los hechos.', pri: true },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 10', title: 'Leer independientemente y comprender textos no literarios escritos con oraciones simples (instrucciones, cartas, recetas).', axis: 'Lectura', desc: 'Seguir instrucciones escritas simples y ubicar datos concretos.', pri: false },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 13', title: 'Experimentar con la escritura para comunicar hechos, ideas y sentimientos, utilizando trazos, letras y palabras.', axis: 'Escritura', desc: 'Escribir oraciones legibles con separación adecuada entre palabras.', pri: true },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 14', title: 'Escribir oraciones completas para transmitir mensajes, usando mayúscula inicial y punto final.', axis: 'Escritura', desc: 'Aplicar convenciones ortográficas básicas en la redacción.', pri: false },
  { grade: '1° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 18', title: 'Comprender textos orales (explicaciones, instrucciones, relatos) para obtener información y desarrollar su curiosidad.', axis: 'Comunicación Oral', desc: 'Escuchar atentamente y formular preguntas pertinentes.', pri: true },
  // Matemática
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 1', title: 'Contar números del 0 al 100 de 1 en 1, de 2 en 2, de 5 en 5 y de 10 en 10, hacia adelante y hacia atrás.', axis: 'Números y Operaciones', desc: 'Conteo oral y escrito en la tabla del 100 reconociendo regularidades.', pri: true },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 3', title: 'Leer números del 0 al 20 y representarlos en forma concreta, pictórica y simbólica.', axis: 'Números y Operaciones', desc: 'Asociación numeral, conteo con bloques multibase y recta numérica.', pri: true },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 4', title: 'Comparar y ordenar números del 0 al 20 de menor a mayor y viceversa.', axis: 'Números y Operaciones', desc: 'Uso de términos "mayor que", "menor que" e "igual que".', pri: true },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 9', title: 'Demostrar que comprenden la adición y la sustracción de números del 0 al 20 de manera concreta, pictórica y simbólica.', axis: 'Números y Operaciones', desc: 'Resolver problemas cotidianos de juntar, agregar, avanzar, quitar y retroceder.', pri: true },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 11', title: 'Reconocer, describir, crear y continuar patrones repetitivos (sonidos, figuras, ritmos) y numéricos hasta el 20.', axis: 'Patrones y Álgebra', desc: 'Identificar el patrón que se repite y predecir términos siguientes.', pri: false },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 14', title: 'Identificar en el entorno figuras 3D y figuras 2D y relacionarlas usando material concreto.', axis: 'Geometría', desc: 'Reconocer cubos, esferas, cilindros, triángulos, cuadrados, rectángulos y círculos.', pri: true },
  { grade: '1° Básico', subj: 'Matemática', code: 'OA 19', title: 'Recolectar y registrar datos usando tablas de conteo y pictogramas sencillos.', axis: 'Datos y Probabilidades', desc: 'Interpretar información representada en gráficos simples con una escala 1 a 1.', pri: false },
  // Ciencias Naturales
  { grade: '1° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Reconocer y observar, por medio de la exploración, que los seres vivos crecen, responden a estímulos, se reproducen y necesitan alimento.', axis: 'Ciencias de la Vida', desc: 'Diferenciar seres vivos de elementos no vivos en el entorno local.', pri: true },
  { grade: '1° Básico', subj: 'Ciencias Naturales', code: 'OA 6', title: 'Identificar y describir la ubicación y la función de los sentidos proponiendo medidas para protegerlos.', axis: 'Ciencias de la Vida', desc: 'Visión, audición, olfato, gusto y tacto en el cuidado de la salud.', pri: true },
  { grade: '1° Básico', subj: 'Ciencias Naturales', code: 'OA 8', title: 'Explorar y describir diferentes tipos de materiales en objetos de la vida cotidiana (madera, vidrio, metal, plástico, goma).', axis: 'Materia y Energía', desc: 'Propiedades de los materiales: flexibilidad, transparencia, dureza e impermeabilidad.', pri: true },
  { grade: '1° Básico', subj: 'Ciencias Naturales', code: 'OA 11', title: 'Describir y registrar el ciclo diario (día y noche) y los efectos en los seres vivos y el ambiente.', axis: 'Tierra y Universo', desc: 'Presencia del sol, luna, estrellas y actividades diarias y nocturnas.', pri: false },
  // Historia, Geografía y Ciencias Sociales
  { grade: '1° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Nombrar y secuenciar acontecimientos de su vida personal y familiar usando categorías temporales (antes, ahora, después, días de la semana).', axis: 'Historia', desc: 'Línea de tiempo personal y calendario escolar.', pri: true },
  { grade: '1° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 8', title: 'Reconocer que los planos son representaciones de lugares cotidianos (su pieza, la sala de clases) vistos desde arriba.', axis: 'Geometría y Espacio', desc: 'Ubicación espacial usando derecha, izquierda, adelante y atrás.', pri: true },
  { grade: '1° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 12', title: 'Conocer cómo viven otros niños en diferentes lugares del mundo y valorar la diversidad cultural.', axis: 'Sociedad y Cultura', desc: 'Costumbres, juegos, vestimentas y viviendas de diversas culturas.', pri: false },
  { grade: '1° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 14', title: 'Explicar y aplicar normas de buena convivencia en la sala de clases y en el patio escolar.', axis: 'Formación Ciudadana', desc: 'Respeto de turnos, cuidado de materiales y resolución pacífica de conflictos.', pri: true },

  // =========================================================================
  // 2° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  // Lenguaje y Comunicación
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 1', title: 'Leer en voz alta para adquirir fluidez: pronunciando cada palabra con precisión y respetando comas y puntos.', axis: 'Lectura', desc: 'Lectura expresiva respetando la puntuación fundamental.', pri: true },
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Comprender textos aplicando estrategias de comprensión lectora (releer, formular preguntas, visualizar).', axis: 'Lectura', desc: 'Identificar información explícita e implícita en cuentos y fábulas.', pri: true },
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 5', title: 'Demostrar comprensión de las narraciones leídas extrayendo información central y describiendo a los personajes.', axis: 'Lectura', desc: 'Reconocer inicio, desarrollo y desenlace de una historia.', pri: true },
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 7', title: 'Leer independientemente y familiarizarse con un amplio repertorio de literatura para aumentar su bagaje cultural.', axis: 'Lectura', desc: 'Poemas, leyendas, cuentos folclóricos y textos informativos.', pri: false },
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 12', title: 'Escribir frecuentemente para desarrollar la creatividad y expresar sus ideas, textos como poemas, diarios de vida, cartas.', axis: 'Escritura', desc: 'Estructuración de párrafos y uso de conectores temporales (primero, luego, finalmente).', pri: true },
  { grade: '2° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 17', title: 'Escribir con letra clara, separando las palabras con un espacio para que puedan ser leídas por otros con facilidad.', axis: 'Escritura', desc: 'Legibilidad, uso de mayúsculas en sustantivos propios y al comenzar una oración.', pri: false },
  // Matemática
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 1', title: 'Contar números del 0 al 1.000 de 2 en 2, de 5 en 5, de 10 en 10 y de 100 en 100.', axis: 'Números y Operaciones', desc: 'Secuencias numéricas crecientes y decrecientes en la tabla posicional.', pri: true },
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 3', title: 'Comparar y ordenar números naturales hasta 100 y 1.000 utilizando la recta numérica y valor posicional.', axis: 'Números y Operaciones', desc: 'Composición y descomposición aditiva en centenas, decenas y unidades.', pri: true },
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 9', title: 'Demostrar que comprende la adición y la sustracción en el ámbito del 0 al 100 usando el algoritmo estándar.', axis: 'Números y Operaciones', desc: 'Resolución de problemas con y sin reserva/canje.', pri: true },
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 11', title: 'Demostrar que comprende la multiplicación: usando representaciones concretas y pictóricas y expresando adiciones de sumandos iguales.', axis: 'Números y Operaciones', desc: 'Tablas de multiplicar del 2, 5 y 10 como suma iterada y arreglos bidimensionales.', pri: true },
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 14', title: 'Representar y describir la posición de objetos y personas en relación a sí mismos y a otros usando puntos de referencia.', axis: 'Geometría', desc: 'Coordenadas simples y cuadrículas de localización.', pri: false },
  { grade: '2° Básico', subj: 'Matemática', code: 'OA 19', title: 'Determinar la longitud de objetos usando unidades de medida no estandarizadas y estandarizadas (cm, m).', axis: 'Medición', desc: 'Uso de la regla graduada y cinta métrica en el aula.', pri: false },
  // Ciencias Naturales
  { grade: '2° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Observar, describir y clasificar por medio de la exploración los diferentes hábitats de animales y plantas.', axis: 'Ciencias de la Vida', desc: 'Hábitats terrestres, acuáticos y consecuencias de la contaminación.', pri: true },
  { grade: '2° Básico', subj: 'Ciencias Naturales', code: 'OA 5', title: 'Observar y comparar las características de las etapas del ciclo de vida de distintos animales (mamíferos, aves, insectos, anfibios).', axis: 'Ciencias de la Vida', desc: 'Metamorfosis de la mariposa y sapo versus desarrollo directo de mamíferos.', pri: true },
  { grade: '2° Básico', subj: 'Ciencias Naturales', code: 'OA 8', title: 'Explorar y describir el agua en sus tres estados (líquido, sólido y gaseoso) y los cambios de estado.', axis: 'Materia y Energía', desc: 'Evaporación, condensación, fusión y solidificación en la vida cotidiana.', pri: true },
  { grade: '2° Básico', subj: 'Ciencias Naturales', code: 'OA 11', title: 'Describir el ciclo del agua en la naturaleza reconociendo que es un recurso vital y proponiendo acciones para cuidarla.', axis: 'Tierra y Universo', desc: 'Precipitaciones, ríos, mares y preservación del agua potable.', pri: false },
  // Historia, Geografía y Ciencias Sociales
  { grade: '2° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Describir los modos de vida de algunos pueblos originarios de Chile en el período precolombino (mapuche, aymara, rapa nui, chango, yagán).', axis: 'Historia', desc: 'Nómadas y sedentarios, vivienda, alimentación y artesanía.', pri: true },
  { grade: '2° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 7', title: 'Ubicar a Chile en el mapa mundial, en el globo terráqueo y en el mapa de América del Sur identificando países limítrofes y el Océano Pacífico.', axis: 'Geografía', desc: 'Límites cardinales de Chile continental y oceánico.', pri: true },
  { grade: '2° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 11', title: 'Identificar la labor que cumplen diversas instituciones públicas (Carabineros, Bomberos, Hospitales, Escuelas, Municipalidades).', axis: 'Formación Ciudadana', desc: 'Servicios comunitarios y canales de ayuda ante emergencias.', pri: false },

  // =========================================================================
  // 3° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  { grade: '3° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Leer de manera fluida textos variados apropiados a su edad, respetando prosodia y puntuación.', axis: 'Lectura', desc: 'Lectura comprensiva de mitos, leyendas, cuentos folclóricos y textos expositivos.', pri: true },
  { grade: '3° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 4', title: 'Profundizar la comprensión de las narraciones leídas: extrayendo ideas clave, describiendo el ambiente y deduciendo causas.', axis: 'Lectura', desc: 'Relación causa-efecto y motivación de los personajes en la trama.', pri: true },
  { grade: '3° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Leer independientemente y comprender textos no literarios (artículos informativos, biografías, cartas, noticias).', axis: 'Lectura', desc: 'Distinguir entre idea principal y detalles secundarios.', pri: true },
  { grade: '3° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 12', title: 'Escribir creativamente narraciones (experiencias personales, relatos de ficción) que tengan una estructura clara.', axis: 'Escritura', desc: 'Uso de conectores lógicos, adjetivos calificativos y signos de interrogación y exclamación.', pri: true },
  { grade: '3° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 16', title: 'Escribir con letra clara y emplear vocabulario variado aprendido en textos leídos.', axis: 'Escritura', desc: 'Evitar repeticiones innecesarias utilizando sinónimos y pronombres.', pri: false },
  // Matemática 3° Básico
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 1', title: 'Contar números del 0 al 1.000 de 5 en 5, de 10 en 10, de 100 en 100, empezando por cualquier número.', axis: 'Números', desc: 'Identificar patrones en secuencias numéricas y tablas de posición.', pri: true },
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 3', title: 'Comparar y ordenar números hasta 1.000 utilizando la recta numérica y la tabla de valor posicional.', axis: 'Números', desc: 'Descomposición aditiva canónica y redondeo a la decena y centena más cercana.', pri: true },
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 8', title: 'Demostrar que comprenden las tablas de multiplicar hasta 10x10 de manera progresiva y memorística.', axis: 'Operaciones', desc: 'Propiedad distributiva, conmutativa y resolución de problemas multiplicativos.', pri: true },
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 9', title: 'Demostrar que comprenden la división con dividendos de dos dígitos y divisores de un dígito: repartos equitativos y agrupaciones.', axis: 'Operaciones', desc: 'Relación inversa entre la multiplicación y la división.', pri: true },
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 12', title: 'Generar, describir y registrar patrones numéricos usando una variedad de estrategias (tablas de multiplicar, calculadoras).', axis: 'Patrones y Álgebra', desc: 'Descubrir reglas de formación de secuencias numéricas.', pri: false },
  { grade: '3° Básico', subj: 'Matemática', code: 'OA 15', title: 'Demostrar que comprenden la línea recta, curva, semirrecta, segmento y ángulos rectos, agudos y obtusos.', axis: 'Geometría', desc: 'Identificación de ángulos en figuras planas y elementos del entorno.', pri: false },
  // Ciencias Naturales 3° Básico
  { grade: '3° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Observar y describir, por medio de la investigación experimental, las necesidades de las plantas y su relación con la raíz, el tallo y las hojas.', axis: 'Ciencias de la Vida', desc: 'Fotosíntesis básica, función del agua, luz solar y dióxido de carbono.', pri: true },
  { grade: '3° Básico', subj: 'Ciencias Naturales', code: 'OA 4', title: 'Describir la importancia de las plantas para los seres vivos, el ser humano y el medio ambiente (alimentación, oxígeno, medicina).', axis: 'Ciencias de la Vida', desc: 'Cuidado de la flora nativa y reforestación.', pri: true },
  { grade: '3° Básico', subj: 'Ciencias Naturales', code: 'OA 8', title: 'Distinguir fuentes naturales y artificiales de luz, y propiedades de la luz (propagación rectilínea, reflexión, refracción).', axis: 'Física', desc: 'Sombras, espejos, lentes y descomposición de la luz blanca.', pri: true },
  { grade: '3° Básico', subj: 'Ciencias Naturales', code: 'OA 12', title: 'Explicar las características de los movimientos de rotación y traslación de la Tierra y sus consecuencias (día, noche, estaciones del año).', axis: 'Tierra y Universo', desc: 'Inclinación del eje terrestre y duración del año solar.', pri: false },
  // Historia 3° Básico
  { grade: '3° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Reconocer aspectos de la vida cotidiana de la civilización griega de la Antigüedad (familia, educación, alimentación, polis, democracia).', axis: 'Historia', desc: 'Legado griego en la arquitectura, filosofía, juegos olímpicos y teatro.', pri: true },
  { grade: '3° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 3', title: 'Explicar la importancia del legado de la civilización romana en el mundo actual (leyes, idioma latín, infraestructura, acueductos).', axis: 'Historia', desc: 'La República y el Imperio Romano en la cuenca del Mediterráneo.', pri: true },
  { grade: '3° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 7', title: 'Distinguir hemisferios, el círculo del ecuador, los trópicos, el meridiano de Greenwich en globos terráqueos y mapas.', axis: 'Geografía', desc: 'Zonas climáticas de la Tierra: cálida, templada y polar.', pri: true },

  // =========================================================================
  // 4° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  { grade: '4° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 2', title: 'Comprender textos aplicando estrategias lectoras: determinar la estructura del texto, releer y conectar con conocimientos previos.', axis: 'Lectura', desc: 'Análisis de textos poéticos, leyendas indígenas y artículos científicos adaptados.', pri: true },
  { grade: '4° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 4', title: 'Profundizar la comprensión de las narraciones leídas: extrayendo moralejas, motivaciones de personajes y conflicto central.', axis: 'Lectura', desc: 'Diferenciar entre narrador y autor en relatos de aventuras.', pri: true },
  { grade: '4° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Leer independientemente y comprender textos no literarios reconociendo su propósito comunicativo y estructura.', axis: 'Lectura', desc: 'Noticias, entrevistas, infografías y reglamentos.', pri: true },
  { grade: '4° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 11', title: 'Escribir frecuentemente textos breves con propósitos informativos o creativos utilizando conectores temporales y causales.', axis: 'Escritura', desc: 'Cohesión textual, uso de mayúsculas, punto seguido y aparte.', pri: true },
  { grade: '4° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 15', title: 'Escribir con ortografía puntual y acentual correcta: reglas generales de acentuación (agudas, graves, esdrújulas).', axis: 'Escritura', desc: 'Acentuación fonética y gráfica en el vocabulario usual.', pri: false },
  // Matemática 4° Básico
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 1', title: 'Representar y describir números del 0 al 10.000: leyéndolos y escribiéndolos, componiéndolos y descomponiéndolos.', axis: 'Números', desc: 'Lectura y valor posicional en unidades de mil, centenas, decenas y unidades.', pri: true },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 3', title: 'Demostrar que comprenden la adición y la sustracción de números hasta 10.000 usando cálculo mental y algoritmos escritos.', axis: 'Operaciones', desc: 'Estimación de sumas y diferencias en compras y presupuestos.', pri: true },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 5', title: 'Demostrar que comprenden la multiplicación de números de tres dígitos por números de un dígito usando estrategias variadas.', axis: 'Operaciones', desc: 'Algoritmo convencional de la multiplicación y cálculo de áreas de rectángulos.', pri: true },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 6', title: 'Demostrar que comprenden la división con dividendos de tres dígitos y divisores de un dígito, con y sin resto.', axis: 'Operaciones', desc: 'Interpretación del resto en problemas cotidianos de reparto.', pri: true },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 8', title: 'Demostrar que comprende las fracciones con denominadores 2, 3, 4, 5, 6, 8, 10 y 12: representándolas de forma concreta y pictórica.', axis: 'Números', desc: 'Fracciones propias, equivalencia de fracciones y comparación con igual denominador.', pri: true },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 11', title: 'Describir y representar decimales (décimos y centésimos) y relacionarlos con fracciones decimales.', axis: 'Números', desc: 'Uso de números decimales en medición de longitudes y moneda nacional.', pri: false },
  { grade: '4° Básico', subj: 'Matemática', code: 'OA 22', title: 'Calcular el perímetro y área de cuadrados y rectángulos usando cuadrículas y fórmulas estándar.', axis: 'Medición', desc: 'Aplicación en problemas de cercado, embaldosado y pintura de superficies.', pri: false },
  // Ciencias Naturales 4° Básico
  { grade: '4° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Reconocer que el cuerpo humano tiene estructuras como huesos, articulaciones y músculos que permiten el movimiento y protección.', axis: 'Ciencias de la Vida', desc: 'Sistema locomotor y prevención de lesiones musculares.', pri: true },
  { grade: '4° Básico', subj: 'Ciencias Naturales', code: 'OA 6', title: 'Explicar, con apoyo de modelos, el movimiento del cuerpo y los efectos del ejercicio físico regular en la salud.', axis: 'Ciencias de la Vida', desc: 'Beneficios cardiovasculares y coordinación motriz.', pri: true },
  { grade: '4° Básico', subj: 'Ciencias Naturales', code: 'OA 9', title: 'Demostrar, por medio de la investigación experimental, que la materia tiene masa y ocupa espacio (volumen).', axis: 'Física y Química', desc: 'Uso de balanzas y probetas graduadas para medir masa y volumen.', pri: true },
  { grade: '4° Básico', subj: 'Ciencias Naturales', code: 'OA 15', title: 'Describir por medio de modelos las capas de la Tierra (corteza, manto, núcleo) y los movimientos de las placas tectónicas.', axis: 'Tierra y Universo', desc: 'Sismos, tsunamis y volcanismo en el contexto sísmico de Chile.', pri: true },
  // Historia 4° Básico
  { grade: '4° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Describir la civilización maya, considerando ubicación geográfica, organización política, economía, astronomía y religión.', axis: 'Historia', desc: 'Ciudades-estado, sistema de cultivo en milpa y calendario maya.', pri: true },
  { grade: '4° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 2', title: 'Describir la civilización azteca, considerando ubicación geográfica, imperio, Tenochtitlán, chinampas y religión.', axis: 'Historia', desc: 'Expansión territorial, tributos y cosmovisión náhuatl.', pri: true },
  { grade: '4° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 3', title: 'Describir la civilización inca, considerando el Tawantinsuyu, red de caminos (Qhapaq Ñan), terrazas de cultivo y el Cusco.', axis: 'Historia', desc: 'Administración imperial, chasquis, quipus e influencia en el territorio chileno.', pri: true },
  { grade: '4° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 11', title: 'Distinguir los principales recursos naturales de América y la importancia de su explotación sustentable.', axis: 'Geografía', desc: 'Recursos renovables y no renovables, minería, agricultura y silvicultura.', pri: false },

  // =========================================================================
  // 5° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  { grade: '5° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 1', title: 'Leer de manera fluida textos variados apropiados a su edad, pronunciando las palabras con precisión y entonación.', axis: 'Lectura', desc: 'Lectura de novelas breves, relatos históricos y textos argumentativos escolares.', pri: true },
  { grade: '5° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Analizar las narraciones leídas para enriquecer su comprensión, considerando personajes principales y secundarios, ambiente y conflicto.', axis: 'Lectura', desc: 'Evolución psicológica de los personajes y moralejas implícitas.', pri: true },
  { grade: '5° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Leer independientemente y comprender textos no literarios extrayendo ideas centrales e identificando el propósito del autor.', axis: 'Lectura', desc: 'Reportajes, infografías, columnas de opinión y ensayos breves.', pri: true },
  { grade: '5° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 13', title: 'Escribir frecuentemente para compartir ideas y reflexiones sobre sus lecturas, utilizando vocabulario preciso.', axis: 'Escritura', desc: 'Estructuración de párrafos con oraciones tópicas y secundarias.', pri: true },
  { grade: '5° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 18', title: 'Escribir con letra clara y emplear adecuadamente la puntuación (punto seguido, aparte, coma en enumeraciones).', axis: 'Escritura', desc: 'Edición y corrección de textos propios y de pares.', pri: false },
  // Matemática 5° Básico
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 1', title: 'Representar y describir números naturales de hasta más de 6 dígitos y menores que 1.000 millones.', axis: 'Números', desc: 'Lectura, escritura, comparación y orden en el sistema decimal.', pri: true },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 3', title: 'Demostrar que comprenden la multiplicación de números naturales de dos dígitos por números naturales de dos dígitos.', axis: 'Operaciones', desc: 'Descomposición aditiva, estimación y algoritmo convencional.', pri: true },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 4', title: 'Demostrar que comprenden la división con dividendos de tres dígitos y divisores de un dígito interpretando el resto.', axis: 'Operaciones', desc: 'Resolución de problemas de contexto real con operaciones combinadas.', pri: true },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 7', title: 'Demostrar que comprenden las fracciones impropias y los números mixtos: representándolos en la recta numérica.', axis: 'Números', desc: 'Conversión entre fracciones impropias y números mixtos.', pri: true },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 8', title: 'Resolver problemas que involucren sumas y restas de fracciones propias e impropias con denominadores iguales y múltiplos.', axis: 'Operaciones', desc: 'Mínimo común múltiplo y simplificación de fracciones.', pri: true },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 11', title: 'Comparar y ordenar decimales hasta la milésima y realizar adiciones y sustracciones con números decimales.', axis: 'Números', desc: 'Alineación de la coma decimal y resolución de problemas monetarios.', pri: false },
  { grade: '5° Básico', subj: 'Matemática', code: 'OA 19', title: 'Calcular el área de triángulos, paralelogramos y trapecios utilizando cuadrículas y fórmulas geométricas.', axis: 'Geometría', desc: 'Relación entre el área del rectángulo y el triángulo.', pri: false },
  // Ciencias 5° Básico
  { grade: '5° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Reconocer y explicar que los seres vivos están formados por una o más células y que estas se organizan en tejidos, órganos y sistemas.', axis: 'Biología', desc: 'Niveles de organización biológica en el ser humano.', pri: true },
  { grade: '5° Básico', subj: 'Ciencias Naturales', code: 'OA 5', title: 'Analizar el consumo de alimentos y sus aportes nutricionales en base a la pirámide alimentaria y guías nutricionales.', axis: 'Biología y Salud', desc: 'Nutrientes esenciales, etiquetado nutricional (sellos) y cálculo de calorías.', pri: true },
  { grade: '5° Básico', subj: 'Ciencias Naturales', code: 'OA 8', title: 'Investigar experimentalmente y explicar los circuitos eléctricos simples (fuente, conductores, interruptor, receptor).', axis: 'Física', desc: 'Corriente eléctrica, materiales conductores y aislantes y normas de seguridad.', pri: true },
  { grade: '5° Básico', subj: 'Ciencias Naturales', code: 'OA 12', title: 'Describir la distribución del agua dulce y salada en la Tierra, y proponer medidas para proteger los océanos y glaciares.', axis: 'Tierra y Universo', desc: 'Aguas subterráneas, cuencas hidrográficas y estrés hídrico.', pri: false },
  // Historia 5° Básico
  { grade: '5° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Explicar los viajes de descubrimiento de Cristóbal Colón, Hernando de Magallanes y otros navegantes europeos.', axis: 'Historia', desc: 'Avances tecnológicos de la navegación y consecuencias del encuentro entre dos mundos.', pri: true },
  { grade: '5° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 2', title: 'Describir el proceso de conquista de América y de Chile, considerando la expedición de Almagro y Valdivia.', axis: 'Historia', desc: 'Fundación de ciudades, resistencia indígena mapuche y Guerra de Arauco.', pri: true },
  { grade: '5° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 5', title: 'Describir los principales rasgos del período colonial en Chile (sociedad estamental, hacienda, mestizaje, comercio colonial).', axis: 'Historia', desc: 'Vida cotidiana colonial, sincretismo religioso y cultural.', pri: true },
  { grade: '5° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 13', title: 'Reconocer que la Constitución Política de Chile garantiza derechos fundamentales y establece la división de los poderes del Estado.', axis: 'Formación Ciudadana', desc: 'Poder Ejecutivo, Legislativo y Judicial en el sistema republicano.', pri: false },

  // =========================================================================
  // 6° BÁSICO - ENSEÑANZA BÁSICA
  // =========================================================================
  { grade: '6° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 2', title: 'Comprender textos aplicando estrategias de lectura: determinar el significado de palabras desconocidas por contexto y morfología.', axis: 'Lectura', desc: 'Etimología, prefijos, sufijos y familias léxicas.', pri: true },
  { grade: '6° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 3', title: 'Analizar las obras literarias leídas, evaluando la coherencia entre las acciones de los personajes y sus motivaciones.', axis: 'Lectura', desc: 'Dilemas morales planteados en obras narrativas y líricas.', pri: true },
  { grade: '6° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 6', title: 'Evaluar críticamente la información presente en textos de diversa procedencia determinando la confiabilidad de la fuente.', axis: 'Lectura', desc: 'Distinción entre hechos, opiniones y publicidad en medios digitales.', pri: true },
  { grade: '6° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 14', title: 'Escribir textos expositivos sobre temas de investigación escolar estructurando con introducción, desarrollo y conclusión.', axis: 'Escritura', desc: 'Uso de conectores explicativos, reformuladores y bibliografía básica.', pri: true },
  { grade: '6° Básico', subj: 'Lenguaje y Comunicación', code: 'OA 16', title: 'Planificar, escribir, revisar y editar sus textos para asegurar coherencia, cohesión y ortografía literal y puntual.', axis: 'Escritura', desc: 'Uso correcto de tildes diacríticas, dieréticas y grafías complejas (b/v, c/s/z).', pri: false },
  // Matemática 6° Básico
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 1', title: 'Demostrar que comprenden los factores y múltiplos, números primos y compuestos, y el mínimo común múltiplo.', axis: 'Números', desc: 'Descomposición en factores primos y criterios de divisibilidad.', pri: true },
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 3', title: 'Demostrar que comprenden el concepto de razón de manera concreta, pictórica y simbólica.', axis: 'Números y Proporciones', desc: 'Comparación por cuociente entre dos magnitudes en problemas cotidianos.', pri: true },
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 4', title: 'Demostrar que comprenden el concepto de porcentaje de manera concreta, pictórica y simbólica, calculando porcentajes simples (10%, 25%, 50%).', axis: 'Números', desc: 'Equivalencia entre fracción, decimal y porcentaje en descuentos e intereses.', pri: true },
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 8', title: 'Resolver problemas que involucren multiplicación y división de números decimales por números naturales y por potencias de 10.', axis: 'Operaciones', desc: 'Desplazamiento de la coma decimal y estimación de resultados.', pri: true },
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 11', title: 'Resolver ecuaciones de primer grado con una incógnita de la forma ax = b, x/a = b y ax + b = c.', axis: 'Álgebra', desc: 'Uso de la balanza en equilibrio y propiedades aditivas y multiplicativas de la igualdad.', pri: true },
  { grade: '6° Básico', subj: 'Matemática', code: 'OA 18', title: 'Calcular el área de la superficie y el volumen de cubos y paralelepípedos rectangulares expresando en unidades cúbicas.', axis: 'Geometría y Medición', desc: 'Resolución de problemas de capacidad y almacenamiento.', pri: false },
  // Ciencias 6° Básico
  { grade: '6° Básico', subj: 'Ciencias Naturales', code: 'OA 1', title: 'Explicar, a partir de una investigación experimental, los requerimientos de agua, dióxido de carbono y energía lumínica para la fotosíntesis.', axis: 'Biología', desc: 'Producción de glucosa y oxígeno y su rol en las cadenas tróficas.', pri: true },
  { grade: '6° Básico', subj: 'Ciencias Naturales', code: 'OA 4', title: 'Explicar las consecuencias del daño que el ser humano produce en los ecosistemas (deforestación, caza indiscriminada, contaminación).', axis: 'Ecología', desc: 'Especies nativas amenazadas y áreas silvestres protegidas en Chile.', pri: true },
  { grade: '6° Básico', subj: 'Ciencias Naturales', code: 'OA 8', title: 'Explicar que la energía es necesaria para que los objetos cambien y los seres vivos realicen sus procesos vitales.', axis: 'Física', desc: 'Transformación y conservación de la energía mecánica, térmica, eléctrica y química.', pri: true },
  { grade: '6° Básico', subj: 'Ciencias Naturales', code: 'OA 13', title: 'Clasificar los recursos energéticos en renovables y no renovables y proponer medidas de eficiencia energética en el hogar y escuela.', axis: 'Energía y Sustentabilidad', desc: 'Energía solar, eólica, geotérmica versus combustibles fósiles.', pri: false },
  // Historia 6° Básico
  { grade: '6° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 1', title: 'Explicar los múltiples factores que llevaron a la independencia de Chile y de América (Ilustración, Revolución Francesa, invasión napoleónica).', axis: 'Historia', desc: 'Juntas de Gobierno, Patria Vieja, Reconquista y Patria Nueva.', pri: true },
  { grade: '6° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 2', title: 'Explicar los principales desafíos que enfrentó la República de Chile en sus inicios (ensayos constitucionales, estabilidad económica).', axis: 'Historia', desc: 'Constitución de 1833 y organización autoritaria portaliana.', pri: true },
  { grade: '6° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 5', title: 'Describir el proceso de incorporación de nuevos territorios durante el siglo XIX (salitre, colonización alemana, anexión de Rapa Nui, conflicto en la Araucanía).', axis: 'Historia y Territorio', desc: 'Guerra del Pacífico y delimitación de las fronteras nacionales.', pri: true },
  { grade: '6° Básico', subj: 'Historia, Geografía Y Cs. Sociales', code: 'OA 15', title: 'Explicar los deberes y responsabilidades ciudadanas en una sociedad democrática (voto informado, pago de impuestos, respeto de leyes).', axis: 'Formación Ciudadana', desc: 'Participación ciudadana y rol activo en organizaciones comunitarias.', pri: false },

  // =========================================================================
  // IDIOMA EXTRANJERO INGLÉS (1° a 8° Básico y 1° a 4° Medio)
  // =========================================================================
  { grade: '1° Básico', subj: 'Inglés', code: 'OA 1', title: 'Reconocer palabras y expresiones muy sencillas de uso frecuente en canciones, rimas y saludos en inglés.', axis: 'Comprensión Oral', desc: 'Instrucciones del aula (stand up, sit down, listen) y colores básicos.', pri: true },
  { grade: '2° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender mensajes orales simples que contienen vocabulario de la familia, partes del cuerpo y animales.', axis: 'Comprensión Oral', desc: 'Asociación de audio con imágenes y respuesta gestual o de una palabra.', pri: true },
  { grade: '3° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender textos orales sencillos identificando información explícita sobre rutinas escolares y alimentos.', axis: 'Comprensión Oral', desc: 'Reconocer preguntas básicas (What is this? How many?).', pri: true },
  { grade: '4° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender textos orales adaptados relacionados con pasatiempos, profesiones y lugares de la ciudad.', axis: 'Comprensión Oral', desc: 'Identificar vocabulario temático y oraciones simples en presente.', pri: true },
  { grade: '5° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender textos orales y audiovisuales breves reconociendo tema general y palabras clave.', axis: 'Comprensión Auditiva', desc: 'Diálogos de presentación, horas, precios y preferencias personales.', pri: true },
  { grade: '5° Básico', subj: 'Inglés', code: 'OA 9', title: 'Leer comprensivamente textos no literarios sencillos (postales, menús, folletos informativos).', axis: 'Comprensión Lectora', desc: 'Extracción de información específica e identificación de cognados.', pri: true },
  { grade: '6° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender información explícita en textos orales auténticos o adaptados sobre viajes, climas y deportes.', axis: 'Comprensión Auditiva', desc: 'Oraciones con pasado simple regular y conectores básicos (and, but, because).', pri: true },
  { grade: '6° Básico', subj: 'Inglés', code: 'OA 14', title: 'Escribir oraciones breves y párrafos simples utilizando vocabulario temático y conectores elementales.', axis: 'Expresión Escrita', desc: 'Descripción de rutinas y relatos breves en tiempo presente y pasado.', pri: true },
  { grade: '7° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender información central y detalles relevantes en textos orales y conversaciones sobre vida cotidiana y culturas.', axis: 'Comprensión Oral', desc: 'Identificar ideas principales, intenciones de hablantes y vocabulario técnico elemental.', pri: true },
  { grade: '7° Básico', subj: 'Inglés', code: 'OA 9', title: 'Demostrar comprensión de textos auténticos o adaptados identificando ideas principales y secundarias.', axis: 'Comprensión Lectora', desc: 'Artículos de divulgación, blogs, relatos breves y noticias juveniles.', pri: true },
  { grade: '7° Básico', subj: 'Inglés', code: 'OA 13', title: 'Escribir textos breves (correos electrónicos, reseñas, descripciones) aplicando estructuras gramaticales aprendidas.', axis: 'Expresión Escrita', desc: 'Coherencia discursiva, uso de pronombres relativos y verbos modales básicos.', pri: false },
  { grade: '8° Básico', subj: 'Inglés', code: 'OA 1', title: 'Comprender textos orales con variedad de acentos estándar sobre temas globales, tecnología y medio ambiente.', axis: 'Comprensión Oral', desc: 'Diferenciar hechos de opiniones y captar inferencias simples.', pri: true },
  { grade: '8° Básico', subj: 'Inglés', code: 'OA 9', title: 'Leer y evaluar críticamente textos informativos y narrativos en inglés reconociendo postura del autor.', axis: 'Comprensión Lectora', desc: 'Comprensión de textos de mediana extensión con vocabulario técnico y académico.', pri: true },
  { grade: '8° Básico', subj: 'Inglés', code: 'OA 14', title: 'Escribir ensayos breves y relatos guiados con correcta concordancia verbal y sintaxis en presente, pasado y futuro.', axis: 'Expresión Escrita', desc: 'Uso de conectores de causa, contraste y consecuencia (however, therefore, although).', pri: false },
  { grade: '1° Medio', subj: 'Inglés', code: 'OA 1', title: 'Comprender información global y específica en conversaciones, entrevistas y podcasts sobre temas juveniles y contingencia.', axis: 'Comprensión Oral', desc: 'Interpretación de lenguaje idiomático, entonación y opiniones fundamentadas.', pri: true },
  { grade: '1° Medio', subj: 'Inglés', code: 'OA 9', title: 'Demostrar comprensión lectora de textos auténticos complejos aplicando técnicas de skimming y scanning.', axis: 'Comprensión Lectora', desc: 'Textos argumentativos, ensayos breves y manuales técnicos elementales.', pri: true },
  { grade: '1° Medio', subj: 'Inglés', code: 'OA 14', title: 'Escribir textos formales e informales estructurados (cartas de motivación, currículum vitae, ensayos) con precisión léxica.', axis: 'Expresión Escrita', desc: 'Uso de voz pasiva, condicionales 1 y 2, y vocabulario profesional.', pri: false },
  { grade: '2° Medio', subj: 'Inglés', code: 'OA 1', title: 'Analizar discursos y debates en inglés sobre problemáticas sociales, éticas y ambientales.', axis: 'Comprensión Auditiva', desc: 'Identificar sesgos, intencionalidad del emisor y argumentos clave.', pri: true },
  { grade: '2° Medio', subj: 'Inglés', code: 'OA 8', title: 'Producir textos orales fundamentando posturas personales en debates y presentaciones académicas estructuradas.', axis: 'Expresión Oral', desc: 'Fluidez comunicativa, lenguaje corporal y entonación adecuada.', pri: true },
  { grade: '2° Medio', subj: 'Inglés', code: 'OA 14', title: 'Redactar informes técnicos y propuestas de proyectos en inglés respetando normas de registro formal.', axis: 'Expresión Escrita', desc: 'Conectores avanzados, oraciones compuestas y vocabulario especializado.', pri: false },
  { grade: '3° Medio', subj: 'Inglés', code: 'OA 1', title: 'Comprender textos orales y audiovisuales avanzados relacionados con el mundo del trabajo, educación superior y ciencia.', axis: 'Comprensión Global', desc: 'Conferencias, entrevistas laborales simuladas y tutoriales técnicos especializados.', pri: true },
  { grade: '3° Medio', subj: 'Inglés', code: 'OA 3', title: 'Utilizar el idioma inglés como herramienta comunicativa y laboral en la resolución de problemas técnicos y profesionales.', axis: 'Inglés Técnico Laboral', desc: 'Lectura de fichas técnicas, especificaciones industriales y correspondencia laboral.', pri: true },
  { grade: '4° Medio', subj: 'Inglés', code: 'OA 1', title: 'Interactuar con fluidez y naturalidad en situaciones comunicativas formales y laborales en idioma inglés.', axis: 'Comunicación Profesional', desc: 'Presentación de proyectos profesionales, entrevistas y negociación técnica.', pri: true },
  { grade: '4° Medio', subj: 'Inglés', code: 'OA 2', title: 'Redactar documentación técnica y profesional en inglés (manuales de usuario, bitácoras, reportes técnicos).', axis: 'Redacción Profesional', desc: 'Uso de terminología técnica de la especialidad y normas de redacción comercial.', pri: true },

  // =========================================================================
  // ARTES VISUALES, MÚSICA, EDUCACIÓN FÍSICA Y TECNOLOGÍA
  // =========================================================================
  // Artes Visuales
  { grade: '7° Básico', subj: 'Artes Visuales', code: 'OA 1', title: 'Crear trabajos visuales basados en la apreciación y el análisis del entorno natural, cultural y artístico contemporáneo.', axis: 'Creación Artística', desc: 'Experimentar con técnicas mixtas, grabado, fotografía y pintura mural.', pri: true },
  { grade: '7° Básico', subj: 'Artes Visuales', code: 'OA 4', title: 'Interpretar y comparar obras de arte considerando su contexto histórico, estético y social.', axis: 'Apreciación Crítica', desc: 'Análisis de obras chilenas y latinoamericanas.', pri: false },
  { grade: '8° Básico', subj: 'Artes Visuales', code: 'OA 1', title: 'Crear obras visuales fundamentadas en problemáticas sociales, identitarias y de género en el arte contemporáneo.', axis: 'Creación Visual', desc: 'Instalaciones, arte digital, escultura y técnicas de reciclaje.', pri: true },
  { grade: '1° Medio', subj: 'Artes Visuales', code: 'OA 1', title: 'Crear proyectos visuales individuales o colectivos a partir de criterios estéticos y de comunicación social.', axis: 'Proyectos Artísticos', desc: 'Diseño gráfico, audiovisual y espacio público.', pri: true },
  { grade: '2° Medio', subj: 'Artes Visuales', code: 'OA 1', title: 'Desarrollar proyectos visuales interdisciplinarios que integren medios digitales y tradiciones patrimoniales.', axis: 'Artes Mediales', desc: 'Animación digital, fotografía documental e intervenciones artísticas.', pri: true },
  // Música
  { grade: '7° Básico', subj: 'Música', code: 'OA 1', title: 'Interpretar repertorio coral e instrumental diverso a una o más voces con expresividad y técnica adecuada.', axis: 'Interpretación Musical', desc: 'Canto coral, instrumentos melódicos y armónicos.', pri: true },
  { grade: '8° Básico', subj: 'Música', code: 'OA 1', title: 'Cantar y tocar música tradicional chilena, latinoamericana y del mundo demostrando dominio técnico básico.', axis: 'Interpretación', desc: 'Folclore nacional, Nueva Canción Chilena y música originaria.', pri: true },
  { grade: '1° Medio', subj: 'Música', code: 'OA 1', title: 'Crear e improvisar ideas musicales aplicando elementos del lenguaje musical (armonía, ritmo, textura).', axis: 'Creación Musical', desc: 'Composición de canciones y ambientación sonora con softwares de audio.', pri: true },
  // Educación Física y Salud
  { grade: '7° Básico', subj: 'Educación Física y Salud', code: 'OA 1', title: 'Aplicar habilidades motrices específicas en al menos un deporte individual y uno colectivo, respetando reglas.', axis: 'Habilidades Motrices', desc: 'Deportes colectivos: básquetbol, vóleibol, fútbol, balonmano y atletismo.', pri: true },
  { grade: '7° Básico', subj: 'Educación Física y Salud', code: 'OA 3', title: 'Desarrollar la resistencia cardiovascular, la fuerza muscular y la flexibilidad mediante planes de entrenamiento guiado.', axis: 'Condición Física y Salud', desc: 'Monitoreo de frecuencia cardíaca e índices de esfuerzo percibido.', pri: true },
  { grade: '8° Básico', subj: 'Educación Física y Salud', code: 'OA 1', title: 'Perfeccionar y aplicar tácticas defensivas y ofensivas en deportes colectivos con sentido de juego limpio (Fair Play).', axis: 'Deportes Colectivos', desc: 'Toma de decisiones rápidas, arbitraje participativo y trabajo cooperativo.', pri: true },
  { grade: '1° Medio', subj: 'Educación Física y Salud', code: 'OA 1', title: 'Diseñar y ejecutar un programa de acondicionamiento físico personal para mejorar la salud y calidad de vida.', axis: 'Vida Activa y Saludable', desc: 'Evaluación del IMC, gasto calórico y hábitos de hidratación y nutrición deportiva.', pri: true },
  { grade: '2° Medio', subj: 'Educación Física y Salud', code: 'OA 1', title: 'Liderar y participar en actividades deportivas y recreativas en el medio natural promoviendo el autocuidado y el respeto ambiental.', axis: 'Vida en la Naturaleza', desc: 'Trekking, orientación terrestre, campismo seguro y gestión de emergencias físicas.', pri: true },
  // Tecnología
  { grade: '7° Básico', subj: 'Tecnología', code: 'OA 1', title: 'Identificar oportunidades o necesidades de diseño en el entorno local proponiendo soluciones tecnológicas innovadoras.', axis: 'Diseño de Soluciones', desc: 'Levantamiento de requerimientos, bocetos técnicos y evaluación de impacto ambiental.', pri: true },
  { grade: '8° Básico', subj: 'Tecnología', code: 'OA 2', title: 'Planificar las etapas de elaboración de un producto tecnológico considerando recursos, costos y normas de seguridad.', axis: 'Planificación Técnica', desc: 'Carta Gantt, presupuesto de materiales y diagramas de flujo de procesos.', pri: true },
  { grade: '1° Medio', subj: 'Tecnología', code: 'OA 1', title: 'Diseñar soluciones tecnológicas que respondan a problemas de la comunidad integrando herramientas digitales CAD y prototipado.', axis: 'Proyectos Tecnológicos', desc: 'Modelado 3D, impresión, circuitos controlados y análisis de ciclo de vida.', pri: true },

  // =========================================================================
  // CIENCIAS NATURALES (Biología, Física, Química 1° y 2° Medio)
  // =========================================================================
  // 1° Medio - Biología
  { grade: '1° Medio', subj: 'Ciencias Naturales (Biología)', code: 'OA 1', title: 'Explicar cómo la evolución por selección natural produce la adaptación y diversidad biológica.', axis: 'Biología Evolutiva', desc: 'Evidencias fósiles, anatómicas, embriológicas y moleculares de la evolución.', pri: true },
  { grade: '1° Medio', subj: 'Ciencias Naturales (Biología)', code: 'OA 2', title: 'Analizar el impacto de las actividades humanas en la biodiversidad y el equilibrio ecológico.', axis: 'Ecología y Conservación', desc: 'Pérdida de hábitats, sobreexplotación, especies invasoras y cambio climático global.', pri: false },
  // 1° Medio - Física
  { grade: '1° Medio', subj: 'Ciencias Naturales (Física)', code: 'OA 1', title: 'Explicar fenómenos ondulatorios del sonido (reflexión, refracción, difracción, efecto Doppler) y sus aplicaciones.', axis: 'Ondas y Sonido', desc: 'Intensidad, tono, timbre, velocidad del sonido y ecografía/sonar.', pri: true },
  { grade: '1° Medio', subj: 'Ciencias Naturales (Física)', code: 'OA 2', title: 'Explicar las propiedades ópticas de la luz (reflexión, refracción, dispersión) en espejos y lentes.', axis: 'Óptica', desc: 'Formación de imágenes en lentes convergentes y divergentes y el ojo humano.', pri: false },
  // 1° Medio - Química
  { grade: '1° Medio', subj: 'Ciencias Naturales (Química)', code: 'OA 1', title: 'Explicar la formación de enlaces químicos (iónico, covalente y metálico) en base a la configuración electrónica.', axis: 'Estructura Atómica', desc: 'Estructuras de Lewis, electronegatividad y propiedades de los compuestos.', pri: true },
  { grade: '1° Medio', subj: 'Ciencias Naturales (Química)', code: 'OA 2', title: 'Balancear ecuaciones químicas y aplicar relaciones estequiométricas en reacciones cotidianas.', axis: 'Reacciones Químicas', desc: 'Ley de conservación de la materia, mol y masa molar.', pri: false },
  // 2° Medio - Biología
  { grade: '2° Medio', subj: 'Ciencias Naturales (Biología)', code: 'OA 1', title: 'Explicar cómo el sistema nervioso y endocrino coordinan e integran las funciones del organismo.', axis: 'Fisiología Humana', desc: 'Transmisión del impulso nervioso, sinapsis, neurotransmisores y regulación hormonal.', pri: true },
  { grade: '2° Medio', subj: 'Ciencias Naturales (Biología)', code: 'OA 3', title: 'Analizar el ciclo celular, mitosis y meiosis en la mantención del cariotipo y la variabilidad genética.', axis: 'Genética Celular', desc: 'Fases de la mitosis, entrecruzamiento meiótico y aneuploidías.', pri: true },
  // 2° Medio - Física
  { grade: '2° Medio', subj: 'Ciencias Naturales (Física)', code: 'OA 1', title: 'Analizar el movimiento rectilíneo uniforme (MRU) y rectilíneo uniformemente acelerado (MRUA) mediante gráficos y ecuaciones.', axis: 'Cinemática', desc: 'Posición, velocidad, aceleración y caída libre en situaciones reales.', pri: true },
  { grade: '2° Medio', subj: 'Ciencias Naturales (Física)', code: 'OA 3', title: 'Aplicar las leyes de Newton en la resolución de problemas de fuerzas, roce y dinamismo de cuerpos.', axis: 'Dinámica', desc: 'Diagramas de cuerpo libre, masa, peso y ley de gravitación universal.', pri: true },
  // 2° Medio - Química
  { grade: '2° Medio', subj: 'Ciencias Naturales (Química)', code: 'OA 1', title: 'Describir las propiedades coligativas de las disoluciones químicas y calcular concentraciones (molaridad, % m/m).', axis: 'Soluciones Químicas', desc: 'Presión de vapor, punto de ebullición, punto de congelación y presión osmótica.', pri: true },
  { grade: '2° Medio', subj: 'Ciencias Naturales (Química)', code: 'OA 3', title: 'Explicar las características del carbono y su capacidad de formar cadenas e hidrocarburos (alcanos, alquenos, alquinos).', axis: 'Química Orgánica', desc: 'Hibridación del carbono, fórmulas estructurales y grupos funcionales.', pri: true },

  // =========================================================================
  // CIENCIAS PARA LA CIUDADANÍA (3° y 4° Medio)
  // =========================================================================
  { grade: '3° Medio', subj: 'Ciencias Para La Ciudadanía', code: 'OA 1', title: 'Evaluar hábitos de vida saludable, nutrición balanceada y prevención de enfermedades cardiovasculares y metabólicas.', axis: 'Bienestar y Salud', desc: 'Análisis epidemiológico nacional, consumo de tabaco, alcohol y sedentarismo.', pri: true },
  { grade: '3° Medio', subj: 'Ciencias Para La Ciudadanía', code: 'OA 2', title: 'Analizar críticamente el impacto ambiental del consumo humano, el cambio climático y la gestión sustentable de recursos.', axis: 'Ambiente y Sustentabilidad', desc: 'Crisis hídrica, huella ecológica, reciclaje y energías renovables en Chile.', pri: true },
  { grade: '3° Medio', subj: 'Ciencias Para La Ciudadanía', code: 'OA 3', title: 'Evaluar los riesgos de desastres naturales en Chile (terremotos, aluviones, erupciones) y proponer protocolos de mitigación.', axis: 'Seguridad y Prevención', desc: 'Cultura sísmica, sistemas de alerta temprana y planificación de emergencias.', pri: false },
  { grade: '4° Medio', subj: 'Ciencias Para La Ciudadanía', code: 'OA 1', title: 'Analizar el impacto social y ético del avance de la biotecnología, la edición genética CRISPR y la nanotecnología.', axis: 'Tecnología y Sociedad', desc: 'Bioética médica, organismos genéticamente modificados y privacidad genética.', pri: true },
  { grade: '4° Medio', subj: 'Ciencias Para La Ciudadanía', code: 'OA 2', title: 'Diseñar proyectos comunitarios sustentables basados en el uso eficiente de la energía y el tratamiento de aguas residuales.', axis: 'Proyectos Ciudadanos', desc: 'Compostaje escolar, huertos orgánicos y paneles solares fotovoltaicos.', pri: true },

  // =========================================================================
  // FILOSOFÍA Y EDUCACIÓN CIUDADANA (3° y 4° Medio)
  // =========================================================================
  // Filosofía
  { grade: '3° Medio', subj: 'Filosofía', code: 'OA 1', title: 'Describir las características del quehacer filosófico, diferenciándolo del conocimiento científico y del sentido común.', axis: 'Epistemología', desc: 'Preguntas fundamentales sobre la realidad, el conocimiento y la duda metódica.', pri: true },
  { grade: '3° Medio', subj: 'Filosofía', code: 'OA 2', title: 'Formular preguntas filosóficas referidas al ser y a la naturaleza de la realidad a partir de textos clásicos.', axis: 'Ontología', desc: 'Platón, Aristóteles, Descartes y corrientes contemporáneas sobre el sentido de existir.', pri: true },
  { grade: '3° Medio', subj: 'Filosofía', code: 'OA 6', title: 'Aplicar principios lógicos en la construcción y evaluación de argumentos filosóficos evitando falacias.', axis: 'Lógica y Argumentación', desc: 'Silogismos, premisas válidas, falacias ad hominem, ad verecundiam y de generalización.', pri: false },
  { grade: '4° Medio', subj: 'Filosofía', code: 'OA 1', title: 'Analizar problemas éticos contemporáneos (inteligencia artificial, justicia distributiva, medio ambiente) desde corrientes éticas.', axis: 'Ética y Moral', desc: 'Utilitarismo, deontología kantiana y ética del cuidado en la toma de decisiones complejas.', pri: true },
  { grade: '4° Medio', subj: 'Filosofía', code: 'OA 2', title: 'Evaluar diferentes concepciones sobre el poder, el Estado y la justicia en la filosofía política moderna y contemporánea.', axis: 'Filosofía Política', desc: 'Hobbes, Locke, Rousseau, Marx, Foucault y teorías de la justicia de Rawls.', pri: true },
  // Educación Ciudadana
  { grade: '3° Medio', subj: 'Educación Ciudadana', code: 'OA 1', title: 'Comprender el rol del Estado, el principio de soberanía y la separación de poderes en la república democrática chilena.', axis: 'Democracia e Institucionalidad', desc: 'Constitución Política, órganos autónomos del Estado y derechos civiles.', pri: true },
  { grade: '3° Medio', subj: 'Educación Ciudadana', code: 'OA 2', title: 'Evaluar los mecanismos de participación ciudadana y electoral en el sistema democrático chileno.', axis: 'Participación Ciudadana', desc: 'Partidos políticos, movimientos sociales, plebiscitos y rendición de cuentas.', pri: true },
  { grade: '3° Medio', subj: 'Educación Ciudadana', code: 'OA 4', title: 'Promover la defensa y el respeto universal de los Derechos Humanos como base de la convivencia pacífica.', axis: 'Derechos Humanos', desc: 'Declaración Universal de los DDHH, tratados internacionales y no discriminación.', pri: false },
  { grade: '4° Medio', subj: 'Educación Ciudadana', code: 'OA 1', title: 'Evaluar los desafíos de la democracia contemporánea (desigualdad, medio ambiente, equidad de género, pueblos originarios).', axis: 'Ciudadanía Crítica', desc: 'Justicia social, inclusión laboral y políticas públicas de cohesión social.', pri: true },
  { grade: '4° Medio', subj: 'Educación Ciudadana', code: 'OA 2', title: 'Analizar el impacto de la globalización económica, las redes sociales y la inteligencia artificial en la vida comunitaria.', axis: 'Sociedad Global', desc: 'Ciudadanía digital, ciberseguridad, protección de datos y deliberación informada.', pri: true },

  // =========================================================================
  // ESPECIALIDAD TÉCNICO-PROFESIONAL: MECÁNICA INDUSTRIAL
  // =========================================================================
  // Objetivos de Aprendizaje de Especialidad (EMTP MINEDUC)
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 1', title: 'Mecanizar piezas metálicas y poliméricas en máquinas herramientas convencionales (torno paralelo y fresadora universal).', axis: 'Máquinas Herramientas', desc: 'Cálculo de velocidades de corte y avance, afilado de buriles, roscado métrico y whitworth.', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 2', title: 'Interpretar y elaborar planos mecánicos normalizados según especificaciones técnicas ISO/DIN.', axis: 'Dibujo Técnico Industrial', desc: 'Lectura de vistas, cortes, rugosidad superficial y tolerancias dimensionales y geométricas.', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 3', title: 'Medir y verificar magnitudes mecánicas usando instrumentos de precisión (pie de metro, micrómetro, comparador de carátula).', axis: 'Metrología y Verificación', desc: 'Ajustes y tolerancias ISO, control de calidad dimensional y registro en cartas de control.', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 4', title: 'Ejecutar operaciones de banco mecánico (trazado, aserrado, limado, taladrado y roscado manual) con normas de seguridad.', axis: 'Mecánica de Banco', desc: 'Manejo de herramientas de ajuste manual y aplicación estricta de elementos de protección personal (EPP).', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 5', title: 'Soldar componentes metálicos mediante procesos por arco eléctrico (SMAW y oxiacetilénica) en posiciones plana y horizontal.', axis: 'Soldadura Básica', desc: 'Preparación de biseles, regulación de amperaje, selección de electrodos E6011 y E7018.', pri: true },
  { grade: '3° Medio', subj: 'Mecánica Industrial', code: 'OA 6', title: 'Aplicar normas de seguridad, higiene laboral y gestión de residuos mecánicos y aceites lubricantes en el taller industrial.', axis: 'Seguridad y Medio Ambiente', desc: 'Normativa chilena de seguridad laboral (Ley 16.744) y manejo de residuos peligrosos (RESPEL).', pri: false },
  // 4° Medio Mecánica Industrial
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 1', title: 'Programar y operar máquinas herramientas de Control Numérico Computarizado (Torno y Fresa CNC).', axis: 'Mecanizado CNC Avanzado', desc: 'Programación en código ISO (G y M), compensación de radio de herramienta y simulación CAD/CAM.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 2', title: 'Ejecutar uniones soldadas complejas con procesos GMAW (MIG/MAG) y GTAW (TIG) en diversas posiciones conforme a normas AWS.', axis: 'Soldadura Industrial Avanzada', desc: 'Calificación de soldadores, control de deformaciones térmicas y ensayos no destructivos (líquidos penetrantes).', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 3', title: 'Realizar mantenimiento preventivo, predictivo y correctivo a equipos electromecánicos, bombas, reductores y circuitos neumáticos/hidráulicos.', axis: 'Mantenimiento Industrial', desc: 'Alineación de poleas y acoplamientos, lubricación industrial, cambio de rodamientos y análisis de vibraciones.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 4', title: 'Montar, alinear e instalar sistemas mecánicos industriales asegurando la correcta transmisión de potencia mecánica.', axis: 'Montaje de Equipos', desc: 'Montaje de rodamientos en caliente y frío, tensado de correas y calibración de cadenas transportadoras.', pri: true },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 5', title: 'Diagnosticar y reparar fallas en circuitos electroneumáticos y electrohidráulicos automatizados con PLC.', axis: 'Automatización y Control', desc: 'Lectura de diagramas de fluidos, electroválvulas, sensores inductivos/ópticos y actuadores.', pri: false },
  { grade: '4° Medio', subj: 'Mecánica Industrial', code: 'OA 6', title: 'Formular y evaluar proyectos de emprendimiento productivo o de servicios metalmecánicos.', axis: 'Emprendimiento y Gestión', desc: 'Costeo de materiales, horas máquina, cotizaciones formales y planes de negocio.', pri: false },

  // Módulos específicos del LTP Campanario para Mecánica Industrial:
  // Soldadura
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Soldadura', code: 'OA 1', title: 'Preparar juntas y biseles metálicos para soldadura por arco manual SMAW.', axis: 'Soldadura SMAW', desc: 'Limpieza de superficies, biselado en V y regulación de corriente según electrodo.', pri: true },
  { grade: '4° Medio Industrial (Mecánica Industrial) A', subj: 'Soldadura', code: 'OA 2', title: 'Ejecutar cordones de soldadura MIG/MAG y TIG en aceros al carbono e inoxidables.', axis: 'Soldadura GMAW/GTAW', desc: 'Flujo de gas inerte y activo, velocidad de alambre y control visual de discontinuidades.', pri: true },
  // Mecánica De Banco
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Mecánica De Banco', code: 'OA 1', title: 'Realizar trazado mecánico plano y al aire sobre planchas y perfiles metálicos.', axis: 'Trazado y Ajuste', desc: 'Uso de gramil, compás de punta, granete y regla biselada con precisión.', pri: true },
  // Medición y Verificación
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Medición y Verificación', code: 'OA 1', title: 'Medir cotas interiores, exteriores y de profundidad con vernier milimétrico y en pulgadas.', axis: 'Metrología', desc: 'Apreciación del nonio de 0.05 mm y 0.02 mm.', pri: true },
  // Lectura De Manuales y Planos
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Lectura De Manuales y Planos', code: 'OA 1', title: 'Interpretar esquemas y planos de ensamble mecánico y despiece industrial.', axis: 'Dibujo Técnico', desc: 'Interpretación de listas de materiales, acotado y simbología de rugosidad.', pri: true },
  // Mantenimiento De Herramientas
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Mantenimiento De Herramientas', code: 'OA 1', title: 'Mantener en condiciones operativas herramientas de corte y dispositivos de sujeción.', axis: 'Mantenimiento', desc: 'Afilado en esmeril de banco, lubricación de mordazas y calibración de prensas.', pri: true },
  // Mantenimiento y Reparación Industrial
  { grade: '4° Medio Industrial (Mecánica Industrial) A', subj: 'Mantenimiento y Reparación Industrial', code: 'OA 1', title: 'Elaborar planes de mantenimiento preventivo y ejecutar pautas de inspección de maquinaria.', axis: 'Mantenimiento Preventivo', desc: 'Registro en fichas de máquina, monitoreo de temperaturas y reemplazo de retenes.', pri: true },
  // Montaje De Equipos y Sistemas Industriales
  { grade: '4° Medio Industrial (Mecánica Industrial) A', subj: 'Montaje De Equipos y Sistemas Industriales', code: 'OA 1', title: 'Montar conjuntos mecánicos respetando tolerancias de alineación y apriete con torquímetro.', axis: 'Montaje Mecánico', desc: 'Secuencia de apriete de pernos de culata y bridas industriales.', pri: true },
  // Control De Procesos Industriales
  { grade: '4° Medio Industrial (Mecánica Industrial) A', subj: 'Control De Procesos Industriales', code: 'OA 1', title: 'Supervisar variables operacionales de procesos de manufactura mecánica.', axis: 'Control de Producción', desc: 'Tiempos de ciclo, control estadístico de procesos y optimización de productividad.', pri: true },
  // Detección De Fallas En Sistema Industriales
  { grade: '4° Medio Industrial (Mecánica Industrial) A', subj: 'Detección De Fallas En Sistema Industriales', code: 'OA 1', title: 'Aplicar metodología de árbol de causas y análisis de falla en componentes mecánicos y neumáticos.', axis: 'Diagnóstico de Fallas', desc: 'Detección de fatiga de materiales, cavitación en bombas y fugas de presión.', pri: true },
  // Electrotecnia
  { grade: '3° Medio Industrial (Mecánica Industrial) A', subj: 'Electrotecnia', code: 'OA 1', title: 'Conectar y medir parámetros eléctricos en motores trifásicos de inducción y contactores.', axis: 'Electricidad Industrial', desc: 'Circuito de fuerza y comando, relé térmico y uso de multímetro y pinza amperométrica.', pri: true },

  // =========================================================================
  // ESPECIALIDAD TÉCNICO-PROFESIONAL: ATENCIÓN DE PÁRVULOS
  // =========================================================================
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 1', title: 'Planificar e implementar experiencias de aprendizaje lúdicas para párvulos según las Bases Curriculares de la Educación Parvularia.', axis: 'Pedagogía y Juego', desc: 'Diseño de experiencias centradas en la autonomía, el juego y la afectividad en salas cuna y jardines infantiles.', pri: true },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 2', title: 'Promover hábitos de vida saludable, higiene personal, alimentación balanceada y descanso en lactantes y párvulos.', axis: 'Salud y Nutrición Infantil', desc: 'Técnicas de muda segura, lavado de manos guiado y fomento de alimentación perceptiva.', pri: true },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 3', title: 'Confeccionar material didáctico multisensorial inclusivo y ambientar espacios educativos que estimulen el aprendizaje infantil.', axis: 'Didáctica y Recursos', desc: 'Uso de materiales nobles y reciclables adaptados a las etapas del desarrollo sensoriomotor.', pri: true },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 4', title: 'Estimular el desarrollo psicomotor grueso y fino mediante actividades rítmicas, juegos motores y circuitos corporales.', axis: 'Psicomotricidad', desc: 'Gateo, marcha, equilibrio, prensión pinza y coordinación óculo-manual en la primera infancia.', pri: true },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 5', title: 'Fomentar la expresión literaria y teatral infantil a través de la narración de cuentos, títeres, rimas y canciones.', axis: 'Lenguaje y Expresión', desc: 'Técnicas de modulación de voz, uso del kamishibai y teatro de sombras infantiles.', pri: false },
  { grade: '3° Medio', subj: 'Atención de Párvulo', code: 'OA 6', title: 'Desarrollar la expresión musical y corporal en los párvulos a través de rondas, percusión corporal e instrumentos simples.', axis: 'Expresión Artística', desc: 'Discriminación auditiva, sentido rítmico y apreciación de melodías folclóricas e infantiles.', pri: false },
  // 4° Medio Atención de Párvulos
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 1', title: 'Aplicar protocolos de primeros auxilios pediátricos, prevención de accidentes y evacuación segura en recintos educativos.', axis: 'Seguridad y Primeros Auxilios', desc: 'Maniobra de Heimlich pediátrica, RCP básico, inmovilización ante caídas y control de fiebre.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 2', title: 'Establecer relaciones de comunicación empática y colaboración respetuosa con las familias y apoderados.', axis: 'Familia y Comunidad', desc: 'Entrevistas de recepción, bitácoras de comunicación diaria y talleres formativos familiares.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 3', title: 'Observar, registrar y evaluar el progreso y bienestar integral de los niños y niñas utilizando instrumentos pedagógicos (escalas de apreciación, registros anecdóticos).', axis: 'Evaluación Auténtica', desc: 'Detección temprana de rezagos en el desarrollo psicomotor, del lenguaje o socioemocional.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 4', title: 'Promover el cumplimiento de los Derechos del Niño, la no discriminación y la inclusión de párvulos con Necesidades Educativas Especiales (NEE).', axis: 'Derechos e Inclusión', desc: 'Aplicación del DUA en el aula parvularia y fomento de la convivencia respetuosa.', pri: true },
  { grade: '4° Medio', subj: 'Atención de Párvulo', code: 'OA 5', title: 'Gestionar la higiene, desinfección y sanitización de recintos, juguetes y mobiliario escolar según normas del MINSAL.', axis: 'Higiene y Bioseguridad', desc: 'Protocolos de desinfección de salas cuna y almacenamiento seguro de productos químicos.', pri: false },

  // Módulos específicos del LTP Campanario para Atención de Párvulos:
  // Actividades Educativas Para Párvulos
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Actividades Educativas Para Párvulos', code: 'OA 1', title: 'Diseñar experiencias de aprendizaje para los núcleos de Identidad y Autonomía y Convivencia y Ciudadanía.', axis: 'Planificación Pedagógica', desc: 'Estrategias lúdicas para fortalecer la autoimagen y el respeto mutuo.', pri: true },
  // Alimentación De Los Párvulos
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Alimentación De Los Párvulos', code: 'OA 1', title: 'Supervisar y asistir la alimentación de lactantes y párvulos respetando sus ritmos y necesidades nutricionales.', axis: 'Nutrición Infantil', desc: 'Manejo seguro de fórmulas lácteas, papillas, consistencia picada y prevención del atragantamiento.', pri: true },
  // Material Didáctico y De Ambientación
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Material Didáctico y De Ambientación', code: 'OA 1', title: 'Elaborar recursos didácticos tridimensionales y paneles temáticos seguros para salas cuna y niveles medios.', axis: 'Material Didáctico', desc: 'Texturas, contrastes visuales, paneles de estimulación sensorial y móviles seguros.', pri: true },
  // Higiene y Seguridad De Los Párvulos
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Higiene y Seguridad De Los Párvulos', code: 'OA 1', title: 'Ejecutar rutinas de higiene personal, lavado de dientes y control de esfínteres respetando la intimidad del párvulo.', axis: 'Higiene y Autocuidado', desc: 'Transición respetuosa del pañal a la bacinica y hábitos de higiene bucal.', pri: true },
  // Expresión Literaria y Teatral Con Párvulos
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Expresión Literaria y Teatral Con Párvulos', code: 'OA 1', title: 'Implementar rincones de lectura y actividades de narración interactiva para enriquecer el lenguaje infantil.', axis: 'Literatura Infantil', desc: 'Libros de tela, pop-up, títeres de dedo y adivinanzas infantiles.', pri: true },
  // Expresión Musical Para Párvulos
  { grade: '3° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Expresión Musical Para Párvulos', code: 'OA 1', title: 'Guiar juegos sonoros y rondas tradicionales para desarrollar la discriminación auditiva y el goce musical.', axis: 'Música en la Infancia', desc: 'Cancionero tradicional infantil y uso de maracas, cascabeles y panderos.', pri: true },
  // Recreación y Bienestar De Los Párvulos
  { grade: '4° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Recreación y Bienestar De Los Párvulos', code: 'OA 1', title: 'Organizar juegos al aire libre, actividades de recreación y períodos de relajación y sueño reparador.', axis: 'Bienestar y Descanso', desc: 'Condiciones ambientales de ventilación y penumbra para el descanso infantil.', pri: true },
  // Relación Con La Familia
  { grade: '4° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Relación Con La Familia', code: 'OA 1', title: 'Fortalecer el vínculo de apego y corresponsabilidad educativa entre el centro infantil y la familia.', axis: 'Familia y Escuela', desc: 'Comunicación asertiva sobre los avances y necesidades del niño o niña.', pri: true },
  // Salud en Párvulos
  { grade: '4° Medio Técnico Niños (Atención de Párvulos) A', subj: 'Salud en Párvulos', code: 'OA 1', title: 'Monitorear signos vitales básicos y aplicar medidas de prevención y control de enfermedades respiratorias e infecciosas.', axis: 'Salud Pediátrica', desc: 'Control de temperatura, detección de sarpullidos y aislamiento preventivo.', pri: true }
];

export async function seedFullMineducCurriculum() {
  console.log(`Iniciando poblamiento integral del catálogo MINEDUC: ${goals.length} OAs a procesar...`);
  let countInserted = 0;
  let countUpdated = 0;

  for (const g of goals) {
    const cleanGrade = g.grade.replace(/[^a-zA-Z0-9]/g, '');
    const cleanSubj = g.subj.replace(/[^a-zA-Z0-9]/g, '');
    const cleanCode = g.code.replace(/[^a-zA-Z0-9]/g, '');
    const id = `OA-${cleanGrade}-${cleanSubj}-${cleanCode}`.slice(0, 100);

    const check = await query('SELECT id FROM curriculum_learning_goals WHERE id = $1', [id]);
    if (check.rows && check.rows.length > 0) {
      await query(`
        UPDATE curriculum_learning_goals SET
          grade_level = $1,
          subject = $2,
          oa_code = $3,
          oa_title = $4,
          description = $5,
          axis = $6,
          is_prioritized = $7
        WHERE id = $8
      `, [g.grade, g.subj, g.code, g.title, g.desc, g.axis, Boolean(g.pri), id]);
      countUpdated++;
    } else {
      await query(`
        INSERT INTO curriculum_learning_goals (
          id, grade_level, subject, oa_code, oa_title, description, axis, is_prioritized
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [id, g.grade, g.subj, g.code, g.title, g.desc, g.axis, Boolean(g.pri)]);
      countInserted++;
    }
  }

  const total = await query('SELECT count(*), is_prioritized FROM curriculum_learning_goals GROUP BY is_prioritized');
  console.log('Poblamiento finalizado con éxito.');
  console.log(`Insertados: ${countInserted}, Actualizados: ${countUpdated}`);
  console.log('Totales en Base de Datos Supabase:', total.rows);
}

if (require.main === module) {
  seedFullMineducCurriculum()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error al poblar catálogo MINEDUC:', err);
      process.exit(1);
    });
}
