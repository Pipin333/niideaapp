import type { TriviaPrompt } from './room-types';

/**
 * Banco curado de preguntas para Trivia Rush.
 * Cumple la regla de puntuacion sin rayas em ni rayas en.
 */
export const TRIVIA_BANK: TriviaPrompt[] = [
  {
    id: 'trv-01',
    category: 'Cultura General',
    question: '¿Cual es el metal liquido a temperatura ambiente conocido como azogue?',
    options: ['Galio', 'Mercurio', 'Cesio', 'Bromo'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-02',
    category: 'Geografia & Viajes',
    question: '¿En que ciudad chilena se encuentra el reloj de flores mas famoso de la costa central?',
    options: ['Valparaiso', 'Vina del Mar', 'La Serena', 'Concepcion'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-03',
    category: 'Ciencia & Redes',
    question: '¿Cuantos bits componen exactamente una direccion IPv4 estandar?',
    options: ['16 bits', '32 bits', '64 bits', '128 bits'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-04',
    category: 'Cine & Pop',
    question: '¿Que pelicula gano el Oscar a Mejor Pelicula en 2020 siendo la primera de habla no inglesa en lograrlo?',
    options: ['Roma', 'Parasite', 'Drive My Car', 'Amelie'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-05',
    category: 'Gastronomia Nocturna',
    question: '¿Que ingrediente diferencia a un completo "italiano" clasico de un "dinamico"?',
    options: [
      'El italiano lleva solo palta, tomate y mayonesa',
      'El italiano lleva chucrut y salsa americana',
      'El italiano se sirve en pan de molde',
      'El italiano lleva queso derretido encima'
    ],
    correctOptionIndex: 0
  },
  {
    id: 'trv-06',
    category: 'Astronomia',
    question: '¿Cual es el planeta con mayor cantidad de lunas confirmadas en el Sistema Solar?',
    options: ['Jupiter', 'Saturno', 'Urano', 'Neptuno'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-07',
    category: 'Videojuegos',
    question: '¿En que ano se lanzo originalmente la consola PlayStation 2 en Japon y Norteamerica?',
    options: ['1998', '2000', '2002', '2004'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-08',
    category: 'Musica',
    question: '¿De que banda chilena es el album "Corazones" publicado en 1990?',
    options: ['Los Tres', 'Los Prisioneros', 'La Ley', 'Los Bunkers'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-09',
    category: 'Cultura Pop',
    question: '¿Como se llama el periodista y presentador principal del noticiero 31 Minutos?',
    options: ['Juan Carlos Bodoque', 'Tulio Triviño', 'Policarpo Avendaño', 'Mario Hugo'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-10',
    category: 'Ciencia Curiosa',
    question: '¿Cuantos corazones tiene un pulpo comun?',
    options: ['Uno', 'Dos', 'Tres', 'Cuatro'],
    correctOptionIndex: 2
  },
  {
    id: 'trv-11',
    category: 'Videojuegos',
    question: '¿Cual es el bloque que necesitas picar con diamante para armar un portal al Nether en Minecraft?',
    options: ['Basalto', 'Obsidiana', 'Piedra base (Bedrock)', 'Adoquin profundo'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-12',
    category: 'Cocteleria & Carrete',
    question: '¿Que ingredientes lleva tradicionalmente un "Terremoto" chileno?',
    options: [
      'Pisco, bebida cola y hielo',
      'Vino pipeño, helado de piña y granadina',
      'Cerveza rubia, limon y sal',
      'Vino tinto, durazno picado y azucar'
    ],
    correctOptionIndex: 1
  },
  {
    id: 'trv-13',
    category: 'Geografia',
    question: '¿Cual es el pais mas pequeno del mundo en superficie terrestre?',
    options: ['Monaco', 'San Marino', 'Ciudad del Vaticano', 'Liechtenstein'],
    correctOptionIndex: 2
  },
  {
    id: 'trv-14',
    category: 'Cine & Series',
    question: 'En Breaking Bad, ¿cual era el alias que adopto Walter White en el mundo criminal?',
    options: ['Schrodinger', 'Heisenberg', 'Oppenheimer', 'Planck'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-15',
    category: 'Anatomia Humana',
    question: '¿Cual es el hueso mas largo del cuerpo humano?',
    options: ['Humero', 'Tibia', 'Femur', 'Radio'],
    correctOptionIndex: 2
  },
  {
    id: 'trv-16',
    category: 'Internet & Tecnologia',
    question: '¿Que significa el codigo de estado HTTP 418 introducido como broma oficial en 1998?',
    options: [
      'Servidor de vacaciones',
      'Soy una tetera (I am a teapot)',
      'Cable desconectado por un gato',
      'Demasiado cafe en memoria'
    ],
    correctOptionIndex: 1
  },
  {
    id: 'trv-17',
    category: 'Deportes',
    question: '¿En que ano gano la seleccion chilena su primera Copa America en el Estadio Nacional?',
    options: ['2014', '2015', '2016', '2017'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-18',
    category: 'Anime & Cultura Geek',
    question: 'En Neon Genesis Evangelion, ¿como se llaman las tres supercomputadoras que gobiernan Tokio-3?',
    options: ['HAL, Skynet y Matrix', 'Melchior, Balthasar y Casper (MAGI)', 'Alpha, Beta y Gamma', 'Seele, Nerv y Marduk'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-19',
    category: 'Historia',
    question: '¿En que año cayo el Muro de Berlin?',
    options: ['1987', '1989', '1991', '1993'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-20',
    category: 'Quimica',
    question: '¿Que elemento quimico se representa con el simbolo "Au" en la tabla periodica?',
    options: ['Plata', 'Oro', 'Aluminio', 'Argon'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-21',
    category: 'Cine Clasico',
    question: '¿Que objeto buscaban recuperar Indiana Jones y los nazis en su primera pelicula de 1981?',
    options: ['El Santo Grial', 'El Arca de la Alianza', 'La Calavera de Cristal', 'Las Piedras de Sankara'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-22',
    category: 'Gastronomia Mundial',
    question: '¿De que pais es originario originalmente el plato conocido como "Sushi" moderno (Edomae)?',
    options: ['Corea del Sur', 'Japon', 'Tailandia', 'Filipinas'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-23',
    category: 'Musica Urbana & Pop',
    question: '¿Que artista puertorriqueno lanzo el album "Un Verano Sin Ti" en 2022?',
    options: ['Rauw Alejandro', 'Bad Bunny', 'Daddy Yankee', 'Mora'],
    correctOptionIndex: 1
  },
  {
    id: 'trv-24',
    category: 'Naturaleza',
    question: '¿Cual es el unico mamifero capaz de volar de forma sostenida?',
    options: ['Ardilla voladora', 'Murcielago', 'Colugo', 'Petauro del azucar'],
    correctOptionIndex: 1
  }
];

/**
 * Premisas de delacion social para el modo Ese Eres Tu (That's You).
 */
export const SOCIAL_PROMPTS: string[] = [
  '¿Quien del grupo seria el primero en caer en una trampa obvia en una pelicula de terror?',
  '¿Quien dice "voy saliendo" cuando todavia esta en la ducha?',
  '¿A quien jamas le confiarias la clave del Wi-Fi ni el cuidado de una planta?',
  '¿Quien tiene mas probabilidades de hacerse amigo de un desconocido en la fila del bano?',
  '¿Quien armaria una teoria conspirativa por perder una llave en su propio bolsillo?',
  '¿Quien mandaria un audio de 4 minutos para explicar algo de dos palabras?',
  '¿Quien pediria la cuenta al segundo exacto de terminar su vaso?',
  '¿Quien prometeria "hoy me voy temprano" y terminaria cerrando el local?',
  '¿Quien sobreviviria mas tiempo perdido en una isla desierta a punta de puro ingenio dudoso?',
  '¿Quien se quedaria dormido en medio de un carrete sentado en el sillon?',
  '¿Quien compraria algo completamente inutil a las 3 de la manana por internet?',
  '¿Quien seria capaz de discutir con un bot de atencion al cliente pensando que es una persona?',
  '¿Quien tiene el historial de busqueda mas inexplicable de toda la sala?',
  '¿Quien pediria comida por delivery estando a dos cuadras del local?',
  '¿Quien se ofreceria a cocinar en el asado y terminaria quemando hasta el pan?',
  '¿Quien cambiaria la musica de la fiesta por un tema que solo le gusta a el o ella?',
  '¿Quien perderia el telefono teniendolo en la mano con la linterna prendida?',
  '¿Quien llegaria a un aeropuerto 5 horas antes del vuelo por pura paranoia?',
  '¿Quien aceptaria participar en un reality show sin pensarlo dos veces?',
  '¿Quien diria "no tengo hambre" y despues se comeria la mitad de las papas fritas ajenas?',
  '¿Quien fingiria saber de vinos solo leyendo la etiqueta con cara seria?',
  '¿Quien borraria sin querer la base de datos en su primer dia de trabajo?',
  '¿Quien adoptaria un animal callejero en medio de una salida nocturna?',
  '¿Quien responderia un mensaje del grupo tres semanas despues como si nada?'
];

/**
 * Palabras secretas para dibujar en el modo Pinturillo.
 */
export const SKETCH_WORDS: string[] = [
  'COMPLETO',
  'OVNI',
  'PARACAIDAS',
  'TERREMOTO',
  'DINOSAURIO',
  'SUBMARINO',
  'EMPANADA',
  'VOLCAN',
  'PINGUINO',
  'CATAPULTA',
  'HELICOPTERO',
  'FANTASMA',
  'SEMAFORO',
  'GUITARRA',
  'PULPO',
  'CACTUS',
  'ASTRONAUTA',
  'MICROONDAS',
  'PATINETA',
  'CASTILLO',
  'TORNADO',
  'HAMBURGUESA',
  'PIRATA',
  'TELESCOPIO',
  'CANGURO',
  'PARAGUAS',
  'BICICLETA',
  'DRACULA',
  'IGLU',
  'CAMALEON',
  'LAVADORA',
  'ESQUELETO',
  'BOMBERO',
  'UNICORNIO',
  'RELOJ DE ARENA',
  'MARIPOSA',
  'COHETE',
  'SANDIA',
  'TIBURON',
  'ROBOT'
];
