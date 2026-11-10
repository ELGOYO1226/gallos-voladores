// Efectos chiquitos hechos con las partículas de Phaser (gratis, sin imágenes extra).
// Las texturas se dibujan una sola vez con código; cada efecto es un "estallido" que se borra solo.

export function texturasEfectos(escena) {
  const tex = escena.textures;
  if (tex.exists('fx-humo')) return;
  // nube suave: círculo con degradado que se desvanece en la orilla
  const humo = tex.createCanvas('fx-humo', 48, 48), c = humo.getContext();
  const grad = c.createRadialGradient(24, 24, 2, 24, 24, 24);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 48, 48);
  humo.refresh();

  const g = escena.make.graphics({}, false);
  g.fillStyle(0xffffff).fillCircle(5, 5, 5);
  g.generateTexture('fx-punto', 10, 10);
  g.clear().fillStyle(0xffffff).fillRect(0, 0, 14, 4);
  g.generateTexture('fx-chispa', 14, 4);
  g.clear().fillStyle(0xffffff).fillRect(0, 0, 7, 7);
  g.generateTexture('fx-cuadro', 7, 7);
  // pluma: óvalo con su palito
  g.clear().fillStyle(0xffffff).fillEllipse(6, 10, 10, 18);
  g.fillStyle(0xbbbbbb).fillRect(5, 2, 2, 18);
  g.generateTexture('fx-pluma', 12, 22);
  // estrellita de caricatura de 5 picos
  g.clear().fillStyle(0xffffff);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4 : 10, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push({ x: 10 + Math.cos(a) * r, y: 10 + Math.sin(a) * r });
  }
  g.fillPoints(pts, true);
  g.generateTexture('fx-estrella', 20, 20);
  g.destroy();
}

// lanza "n" partículas de una vez y borra el emisor cuando terminan
function estallido(escena, x, y, textura, n, config, prof = 14) {
  const vida = typeof config.lifespan === 'object' ? config.lifespan.max : config.lifespan;
  const em = escena.add.particles(x, y, textura, { emitting: false, ...config }).setDepth(prof);
  em.explode(n);
  escena.time.delayedCall(vida + 100, () => em.destroy());
  return em;
}

// polvito café cuando sueltas la resortera
export function fxDisparo(e, x, y) {
  estallido(e, x, y, 'fx-humo', 7, {
    speed: { min: 40, max: 130 }, angle: { min: 200, max: 340 }, lifespan: 380,
    scale: { start: 0.5, end: 1.1 }, alpha: { start: 0.55, end: 0 }, tint: 0xd8c3a0,
  }, 11);
}

// estela de humo verde que sigue al gallo mientras vuela; se apaga sola al aterrizar
export function fxEstela(e, obj) {
  const em = e.add.particles(0, 0, 'fx-humo', {
    follow: obj, frequency: 18, lifespan: 480, speed: { min: 0, max: 25 },
    scale: { start: 0.8, end: 0.15 }, alpha: { start: 0.8, end: 0 },
    tint: [0x9be564, 0x7ccd4a, 0xc8f59a],
  }).setDepth(7);
  return {
    apagar() {
      em.stop();
      e.time.delayedCall(450, () => em.destroy());
    },
  };
}

// le diste al cliente: nube verde, estrellitas y chispas doradas
export function fxEntrega(e, x, y) {
  estallido(e, x, y, 'fx-humo', 10, {
    speed: { min: 30, max: 110 }, lifespan: 750, scale: { start: 0.7, end: 1.8 },
    alpha: { start: 0.7, end: 0 }, tint: [0x7CFC00, 0x9be564, 0x5fbf3a], gravityY: -60,
  });
  estallido(e, x, y, 'fx-estrella', 9, {
    speed: { min: 160, max: 320 }, lifespan: 650, scale: { start: 1.1, end: 0 },
    rotate: { min: 0, max: 360 }, tint: [0xffe066, 0xffffff, 0x7CFC00], gravityY: 420,
  }, 15);
}

// pegó en la pared: cascajo y polvo
export function fxPared(e, x, y) {
  estallido(e, x, y, 'fx-cuadro', 12, {
    speed: { min: 90, max: 230 }, angle: { min: 180, max: 360 }, lifespan: 650,
    scale: { start: 1, end: 0.4 }, rotate: { min: 0, max: 360 }, gravityY: 700,
    tint: [0x8b5a3c, 0xa0785a, 0x6e4a33],
  });
  estallido(e, x, y, 'fx-humo', 6, {
    speed: { min: 20, max: 70 }, lifespan: 600, scale: { start: 0.5, end: 1.3 },
    alpha: { start: 0.5, end: 0 }, tint: 0xcbb89a,
  });
}

// pegó en la reja: chispas que rebotan
export function fxChispas(e, x, y) {
  estallido(e, x, y, 'fx-chispa', 16, {
    speed: { min: 200, max: 420 }, lifespan: { min: 250, max: 500 }, rotate: { min: 0, max: 360 },
    scale: { start: 1, end: 0.2 }, gravityY: 800, blendMode: 'ADD',
    tint: [0xffe066, 0xffaa00, 0xffffff],
  }, 15);
}

// la paloma se robó el gallo: plumas que caen meciéndose
export function fxPlumas(e, x, y) {
  estallido(e, x, y, 'fx-pluma', 8, {
    speed: { min: 40, max: 140 }, lifespan: 1100, gravityY: 90,
    rotate: { min: -60, max: 60 }, alpha: { start: 1, end: 0 }, scale: { start: 1.1, end: 0.8 },
    tint: [0xd9d9d9, 0xa8a8b3, 0xffffff],
  });
}

// chanclazo: estrellas de golpe de caricatura
export function fxGolpe(e, x, y) {
  estallido(e, x, y, 'fx-estrella', 7, {
    speed: { min: 120, max: 240 }, lifespan: 500, scale: { start: 1.4, end: 0.2 },
    rotate: { min: 0, max: 360 }, tint: [0xffffff, 0xffe066],
  }, 15);
  estallido(e, x, y, 'fx-humo', 5, {
    speed: { min: 20, max: 60 }, lifespan: 400, scale: { start: 0.6, end: 1.4 },
    alpha: { start: 0.6, end: 0 }, tint: 0xffffff,
  });
}

// pegó en algo suave (sábana, michi): un "puf" blanco
export function fxPuf(e, x, y, color = 0xffffff) {
  estallido(e, x, y, 'fx-humo', 8, {
    speed: { min: 30, max: 100 }, lifespan: 500, scale: { start: 0.5, end: 1.4 },
    alpha: { start: 0.7, end: 0 }, tint: color,
  });
}

// cliente que se va enojado: vapor gris que sube
export function fxEnojo(e, x, y) {
  estallido(e, x, y, 'fx-humo', 7, {
    speedY: { min: -140, max: -70 }, speedX: { min: -30, max: 30 }, lifespan: 800,
    scale: { start: 0.4, end: 1.2 }, alpha: { start: 0.65, end: 0 }, tint: [0x777777, 0x999999],
  });
}

// polvo cuando cae la reja
export function fxPolvo(e, x, y, ancho) {
  estallido(e, x, y, 'fx-humo', 9, {
    x: { min: -ancho / 2, max: ancho / 2 }, speedY: { min: -60, max: -10 }, speedX: { min: -50, max: 50 },
    lifespan: 550, scale: { start: 0.4, end: 1.1 }, alpha: { start: 0.55, end: 0 }, tint: 0xbfae94,
  }, 6);
}

// ganaste: confeti cayendo de arriba
export function fxConfeti(e, W) {
  const em = e.add.particles(0, -20, 'fx-cuadro', {
    x: { min: 0, max: W }, lifespan: 2600, speedY: { min: 180, max: 360 }, speedX: { min: -60, max: 60 },
    rotate: { start: 0, end: 720 }, scaleX: { min: 0.6, max: 1.3 }, quantity: 4, frequency: 40,
    tint: [0xff3b6b, 0xffe066, 0x7CFC00, 0x3fc7ff, 0xc77dff],
  }).setDepth(60);
  e.time.delayedCall(1400, () => em.stop());
  e.time.delayedCall(4200, () => em.destroy());
  return em;
}
