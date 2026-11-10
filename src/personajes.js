// La banda de la bodega. Los stickers salen de las fotos (personajes/stickers, fuera de git).
// ancho: tamaño del sticker dentro de la ventana (el vidrio mide 84 px);
// arriba: dónde empieza la cabeza; con menos, se asoman más.
// papel: 'banda' = cliente normal; jefa, subjefe y clon se guardan para sus niveles.
export const BANDA = [
  { archivo: 'jefa final',  papel: 'jefa',    ancho: 110, arriba: 10 },
  { archivo: 'jefa enojada', papel: 'jefaFuria', ancho: 110, arriba: 2 },   // cuando se enfurece (nivel 7)
  { archivo: 'yo amarrado', papel: 'banda',   ancho: 100, arriba: -2 },
  { archivo: 'la que no fuma', papel: 'banda', ancho: 100, arriba: -2 },
  { archivo: 'pito',        papel: 'banda',   ancho: 165, arriba: -4 },
  { archivo: 'guardia',     papel: 'banda',   ancho: 105, arriba: -2 },
  { archivo: 'mmm',         papel: 'banda',   ancho: 105, arriba: -2 },
  { archivo: 'subjefe',     papel: 'subjefe', ancho: 165, arriba: -4 },
  { archivo: 'subjefe clon', papel: 'clon',   ancho: 110, arriba: -2 },
];

// Memes que pone el usuario (memes/, fuera de git). mira: hacia dónde ve la imagen original.
export const PALOMAS = [
  { archivo: 'paloma-1', mira: 'derecha' },
  { archivo: 'paloma-2', mira: 'izquierda' },
  { archivo: 'paloma-3', mira: 'izquierda' },
];

// Un meme por obstáculo; si falta la imagen, el juego usa el dibujo de prueba.
export const MEMES = {
  michi: 'memes/michi/michi.png',
  sabana: 'memes/sabana/sabana.png',
  chancla: 'memes/chancla/chancla.png',
  patrulla: 'memes/patrulla/patrulla.png',   // la imagen ve a la derecha
};
