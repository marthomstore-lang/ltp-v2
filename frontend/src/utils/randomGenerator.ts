import { formatRut } from './rut';

const FIRST_NAMES_MALE = ['Juan', 'Diego', 'Matías', 'Benjamín', 'Nicolás', 'Joaquín', 'Gabriel', 'Tomás', 'Lucas', 'Felipe', 'Ignacio', 'Sebastián'];
const FIRST_NAMES_FEMALE = ['Sofía', 'Camila', 'Valentina', 'Martina', 'Isidora', 'Florencia', 'Constanza', 'Antonia', 'Catalina', 'Fernanda', 'Javiera', 'Francisca'];
const LAST_NAMES = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Araya', 'Torres', 'Espinoza', 'Valenzuela', 'Castillo'];
const COURSES = ['1° Medio A', '2° Medio B', '3° Medio Mecánica', '4° Medio Electricidad'];
const OCCUPATIONS = ['Técnico Mecánico', 'Comerciante', 'Profesora', 'Conductor de Transporte', 'Enfermera', 'Administrativo', 'Electricista', 'Emprendedora'];
const EDUCATION_LEVELS = ['Enseñanza Media Completa', 'Educación Superior Técnica', 'Universitaria Completa', 'Enseñanza Básica Completa'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomRutNumber(): string {
  const num = Math.floor(10000000 + Math.random() * 15000000);
  const dvDigits = ['0','1','2','3','4','5','6','7','8','9','K'];
  const dv = getRandomItem(dvDigits);
  return formatRut(`${num}-${dv}`);
}

export function generateRandomStudent(index: number): any {
  const isFemale = Math.random() > 0.5;
  const firstName = isFemale ? getRandomItem(FIRST_NAMES_FEMALE) : getRandomItem(FIRST_NAMES_MALE);
  const lastName1 = getRandomItem(LAST_NAMES);
  const lastName2 = getRandomItem(LAST_NAMES);
  const fullName = `${firstName} ${lastName1} ${lastName2}`;
  
  const motherName = `${getRandomItem(FIRST_NAMES_FEMALE)} ${lastName2} ${getRandomItem(LAST_NAMES)}`;
  const fatherName = `${getRandomItem(FIRST_NAMES_MALE)} ${lastName1} ${getRandomItem(LAST_NAMES)}`;
  
  const studentRut = generateRandomRutNumber();
  const course = getRandomItem(COURSES);

  // Generar hermano aleatorio (50% de probabilidad)
  const hasSibling = Math.random() > 0.5;
  const siblings = hasSibling ? [
    {
      name: `${getRandomItem(FIRST_NAMES_MALE)} ${lastName1} ${lastName2}`,
      run: generateRandomRutNumber(),
      level: getRandomItem(COURSES.filter(c => c !== course)),
      relation: 'Hermano/a'
    }
  ] : [];

  return {
    id: `rnd_std_${Date.now()}_${index}`,
    list_number: index + 1,
    run: studentRut,
    full_name: fullName,
    level_name: course,
    profesor_jefe: 'María López',
    birth_date: `2008-0${Math.floor(Math.random() * 8) + 1}-15`,
    address: `Av. Presidente Ibáñez #${Math.floor(100 + Math.random() * 900)}, Puerto Montt`,
    
    // Apoderado Titular (Madre o Padre)
    guardian_run: generateRandomRutNumber(),
    guardian_name: motherName,
    guardian_relation: 'Madre',
    guardian_phone: `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`,
    guardian_email: `${firstName.toLowerCase()}.${lastName1.toLowerCase()}@gmail.com`,
    guardian_occupation: getRandomItem(OCCUPATIONS),

    // Apoderado Suplente
    guardian_sec_run: generateRandomRutNumber(),
    guardian_sec_name: fatherName,
    guardian_sec_relation: 'Padre',
    guardian_sec_phone: `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`,
    guardian_sec_email: `${fatherName.split(' ')[0].toLowerCase()}.${lastName1.toLowerCase()}@gmail.com`,
    guardian_sec_occupation: getRandomItem(OCCUPATIONS),

    // Madre
    mother_name: motherName,
    mother_run: generateRandomRutNumber(),
    mother_phone: `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`,
    mother_email: `${motherName.split(' ')[0].toLowerCase()}@gmail.com`,
    mother_education: getRandomItem(EDUCATION_LEVELS),
    mother_occupation: getRandomItem(OCCUPATIONS),

    // Padre
    father_name: fatherName,
    father_run: generateRandomRutNumber(),
    father_phone: `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`,
    father_email: `${fatherName.split(' ')[0].toLowerCase()}@gmail.com`,
    father_education: getRandomItem(EDUCATION_LEVELS),
    father_occupation: getRandomItem(OCCUPATIONS),

    // Convivencia e Integrantes
    lives_with: 'Ambos Padres',
    family_count: 4,
    other_tutor_name: '',

    // Hermanos en el Liceo
    siblings,

    // Salud y PIE/SEP
    pie_program: Math.random() > 0.7,
    pie_diagnosis: Math.random() > 0.7 ? 'TEL Específico' : '',
    profesor_pie: 'Patricia Morales (Psicopedagoga)',
    is_retired: false
  };
}

export function generateRandomStudentBatch(count: number = 5): any[] {
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push(generateRandomStudent(i));
  }
  return batch;
}
