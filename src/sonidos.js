// Sonidos hechos con el sintetizador del navegador (sin archivos de audio).
let ctx = null;
const audio = () => {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// ruido blanco corto, pasado por un filtro
function ruido(a, t, dur, frec, q, vol) {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = frec; f.Q.value = q; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

// golpe metálico: varios tonos que no combinan entre sí (suena a fierro)
function fierro(a, t, base, dur, vol) {
  for (const [k, v] of [[1, 1], [2.76, 0.6], [5.4, 0.4], [8.93, 0.25]]) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'triangle'; o.frequency.value = base * k;
    g.gain.setValueAtTime(vol * v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / k ** 0.3);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur);
  }
}

// la reja: traqueteo de cadena mientras parpadea y luego el portazo de fierro
export function sonidoReja(aviso = 0.72) {
  try {
    const a = audio(), t = a.currentTime;
    for (let i = 0; i < 6; i++) {
      const ti = t + i * aviso / 6;
      ruido(a, ti, 0.05, 3200 + Math.random() * 1500, 6, 0.5);
      fierro(a, ti, 900 + Math.random() * 300, 0.08, 0.05);
    }
    const golpe = t + aviso;
    ruido(a, golpe, 0.25, 1400, 1.2, 0.9);
    fierro(a, golpe, 180, 0.9, 0.35);
    fierro(a, golpe + 0.012, 247, 0.7, 0.2);
  } catch { /* sin audio, no pasa nada */ }
}

// un tono que va de una frecuencia a otra y se apaga
function tono(a, t, tipo, de, hasta, dur, vol) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(de, t);
  o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

// envoltura común: si el navegador no deja sonar, no pasa nada
const suena = fn => (...args) => { try { const a = audio(); fn(a, a.currentTime, ...args); } catch { /* sin audio */ } };

// la liga de la resortera al soltar
export const sonidoLiga = suena((a, t) => {
  tono(a, t, 'triangle', 180, 720, 0.09, 0.18);
  ruido(a, t, 0.12, 2500, 1.5, 0.25);
});

// le atinaste: "pop" y campanita
export const sonidoEntrega = suena((a, t) => {
  tono(a, t, 'sine', 300, 900, 0.07, 0.3);
  tono(a, t + 0.06, 'triangle', 1320, 1320, 0.25, 0.12);
  tono(a, t + 0.12, 'triangle', 1760, 1760, 0.3, 0.1);
});

// golpe sordo contra la pared
export const sonidoPared = suena((a, t) => {
  tono(a, t, 'sine', 160, 50, 0.18, 0.4);
  ruido(a, t, 0.12, 600, 1, 0.5);
});

// el gallo pega en la reja
export const sonidoRejazo = suena((a, t) => {
  fierro(a, t, 520, 0.4, 0.18);
  ruido(a, t, 0.06, 4000, 3, 0.3);
});

// algo suave: sábana, michi o ventana vacía
export const sonidoSuave = suena((a, t) => ruido(a, t, 0.18, 900, 0.7, 0.35));

// aleteo de paloma
export const sonidoAleteo = suena((a, t) => {
  for (let i = 0; i < 4; i++) ruido(a, t + i * 0.06, 0.05, 1800, 2, 0.35);
  tono(a, t + 0.05, 'sine', 520, 380, 0.25, 0.08);
});

// chanclazo: cachetada
export const sonidoChanclazo = suena((a, t) => {
  ruido(a, t, 0.08, 2200, 0.8, 0.9);
  tono(a, t, 'square', 240, 90, 0.08, 0.1);
});

// el michi se queja
export const sonidoMiau = suena((a, t) => {
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(500, t);
  o.frequency.linearRampToValueAtTime(900, t + 0.15);
  o.frequency.linearRampToValueAtTime(420, t + 0.45);
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t); o.stop(t + 0.5);
});

// cliente que se va enojado: "bluuu" que baja
export const sonidoEnojo = suena((a, t) => tono(a, t, 'sawtooth', 220, 90, 0.35, 0.07));

// aviso de la chancla
export const sonidoAvisoChancla = suena((a, t) => {
  tono(a, t, 'square', 700, 700, 0.07, 0.06);
  tono(a, t + 0.1, 'square', 700, 700, 0.07, 0.06);
});

// la chancla sale volando hacia ti
export const sonidoZumbido = suena((a, t) => ruido(a, t, 0.4, 700, 4, 0.4));

// polvo/golpe de la reja al caer ya está en sonidoReja; esta es la sirena corta de la patrulla
export const sonidoSirena = suena((a, t, dur = 3) => {
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'triangle';
  for (let k = 0; k < dur / 0.5; k++) {
    o.frequency.setValueAtTime(650, t + k * 0.5);
    o.frequency.linearRampToValueAtTime(950, t + k * 0.5 + 0.25);
    o.frequency.linearRampToValueAtTime(650, t + k * 0.5 + 0.5);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.3);
  g.gain.setValueAtTime(0.06, t + dur - 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
});

// la pantalla se agrieta: crujido y tintineo de vidrio (fuerte = se rompe toda)
export const sonidoVidrio = suena((a, t, fuerte = false) => {
  ruido(a, t, fuerte ? 0.5 : 0.18, 5000, 1.2, fuerte ? 0.9 : 0.6);
  const n = fuerte ? 10 : 4;
  for (let i = 0; i < n; i++) {
    const f = 2500 + Math.random() * 3500;
    tono(a, t + 0.03 + Math.random() * (fuerte ? 0.6 : 0.2), 'sine', f, f * 0.98, 0.15, 0.05);
  }
});

// ganaste: fanfarria corta
export const sonidoVictoria = suena((a, t) => {
  [523, 659, 784, 1047].forEach((f, i) => tono(a, t + i * 0.11, 'square', f, f, i === 3 ? 0.5 : 0.12, 0.07));
});

// bajo de la fiesta sonidera (nivel 7): bombo suave
export const sonidoBombo = suena((a, t) => tono(a, t, 'sine', 120, 40, 0.22, 0.16));

// viento: ruido que se oye más fuerte con más viento (fuerza de 0 a 1)
let aire = null;
export const sonidoViento = suena((a, t, fuerza) => {
  if (!aire) {
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8; g.gain.value = 0;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
    aire = { g, f };
  }
  aire.g.gain.setTargetAtTime(0.09 * fuerza, t, 0.6);
  aire.f.frequency.setTargetAtTime(380 + 500 * fuerza, t, 0.6);
});

// final dramático: sirena de dos tonos (arresto) o un tono que se cae (te moriste)
export function sonidoFin(arresto) {
  try {
    const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = arresto ? 'square' : 'sawtooth';
    if (arresto) {
      for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(i % 2 ? 620 : 880, t + i * 0.28);
    } else {
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 1.6);
    }
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (arresto ? 1.7 : 1.8));
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 1.9);
  } catch { /* sin audio, no pasa nada */ }
}