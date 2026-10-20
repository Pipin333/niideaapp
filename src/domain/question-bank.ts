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
  }
];

/**
 * Premisas de delacion social para el modo Ese Eres Tu (That's You).
 */
export const SOCIAL_PROMPTS: string[] = [
  '¿Quien del grupo seria el primero en sobrevivir menos de 10 minutos en una pelicula de terror?',
  '¿Quien dice "voy saliendo" cuando todavia esta en la ducha?',
  '¿A quien jamas le confiarias la clave del Wi-Fi ni el cuidado de una planta?',
  '¿Quien tiene mas probabilidades de hacerse amigo de un desconocido en la fila del bano?',
  '¿Quien armaria una teoria conspirativa por perder una llave en su propio bolsillo?',
  '¿Quien mandaria un audio de 4 minutos para explicar algo de dos palabras?',
  '¿Quien pediria la cuenta al segundo exacto de terminar su vaso?',
  '¿Quien prometeria "hoy me voy temprano" y terminaria cerrando el local?'
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
  'CATAPULTA'
];
