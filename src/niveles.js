// Cada nivel: tamaño del edificio, reglas y cada cuántos segundos sale cada obstáculo.
// obstáculos = segundos entre apariciones (chancla = probabilidad).
// michi, sábana y reja: solo en la ventana de un cliente; aviso que parpadea y luego tapan 1.5 s (DURA_MS en juego.js).
// chancla = qué parte de los clientes te avienta la chancla si no les llega su gallo (0.6 = 6 de cada 10).
// Dificultad que sube por nivel:
//   mira     = qué tanto del camino enseñan los puntitos (la mirilla de dónde cae sale siempre)
//   viento   = cuánto puede mover el gallo de lado, en pixeles donde cae (cambia cada rato; 0 = sin viento)
//   enojados = cuántos clientes se pueden ir sin su gallo antes de perder (0 = sin límite)
export const NIVELES = [
  { nombre: 'La vecindad',       pisos: 4, columnas: 3, tiempo: 60, gallos: 12, meta: 7,  paciencia: 5,   aparicion: 2.3,
    mira: 1,    viento: 0,   enojados: 0,
    instrucciones: ['🎯 Jala la resortera hacia abajo y suelta.', '🔥 Atínale a los que se asoman antes de que se acabe su barrita.'],
    obstaculos: {} },
  { nombre: 'El michi',          pisos: 4, columnas: 3, tiempo: 60, gallos: 13, meta: 9,  paciencia: 4.8, aparicion: 2.1,
    mira: 0.8,  viento: 0,   enojados: 7,
    instrucciones: ['🐈 Si sale un gatito naranja sobre un cliente, el michi se va a subir a su ventana y tapa el tiro un ratito.', '⚠️ Si la ventana de un cliente parpadea en rojo, se cierra la reja: espérate.', '🩴 Si un cliente se pone rojo, dale su gallo rápido o te avienta la chancla. 3 chanclazos rompen la pantalla.'],
    obstaculos: { michi: 6, reja: 4, chancla: 0.6 } },
  { nombre: 'Día de lavar',      pisos: 5, columnas: 3, tiempo: 60, gallos: 16, meta: 9,  paciencia: 5,   aparicion: 2.1,
    mira: 0.65, viento: 0,   enojados: 6,
    instrucciones: ['👵 Si sale la señora sobre un cliente, va a tender la sábana enfrente de él un ratito.', '🚨 Cuando suene la sirena NO lances: si la patrulla te ve, te arrestan.', '🤫 Mientras pasa, todos cierran la cortina y su tiempo se congela.'],
    obstaculos: { michi: 6, sabana: 5, reja: 4.5, patrulla: 15, chancla: 0.6 } },
  { nombre: 'Las palomas',       pisos: 5, columnas: 3, tiempo: 60, gallos: 17, meta: 10, paciencia: 4.6, aparicion: 2.0,
    mira: 0.55, viento: 35,  enojados: 6,
    instrucciones: ['🕊️ Las palomas se roban el gallo si se atraviesan.', '💨 Llegó el viento: fíjate en las rayitas y apunta para el otro lado.'],
    obstaculos: { sabana: 5, palomas: 3.5, reja: 4, patrulla: 13, chancla: 0.6 } },
  { nombre: 'La jefa',           pisos: 5, columnas: 4, tiempo: 60, gallos: 18, meta: 11, paciencia: 4.3, aparicion: 1.9,
    mira: 0.45, viento: 55,  enojados: 6,
    instrucciones: ['😤 Clientes más desesperados y viento más fuerte.', '🩴 Tumba las chanclas con un gallo antes de que te lleguen.'],
    obstaculos: { palomas: 4, chancla: 0.6, reja: 3.5, patrulla: 11 } },
  { nombre: 'Ahí viene la poli', pisos: 5, columnas: 4, tiempo: 60, gallos: 19, meta: 12, paciencia: 4,   aparicion: 1.8,
    mira: 0.35, viento: 75,  enojados: 5,
    instrucciones: ['🌙 De noche: la patrulla pasa más seguido y el viento pega duro.'],
    obstaculos: { patrulla: 9, palomas: 4, reja: 3.2, chancla: 0.6 } },
  { nombre: 'Todo el barrio',    pisos: 5, columnas: 4, tiempo: 75, gallos: 23, meta: 15, paciencia: 3.8, aparicion: 1.6,
    mira: 0.25, viento: 100, enojados: 5,
    instrucciones: ['🎉 Todo el barrio junto. ¡Suerte!'],
    obstaculos: { michi: 4.5, sabana: 4, palomas: 3.5, chancla: 0.6, patrulla: 8, reja: 2.8 } },
];
