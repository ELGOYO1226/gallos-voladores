// Detallitos de ambiente por escenario: luces que parpadean, foquitos, pajaritos, basurita en la calle...
// Todo se dibuja con código encima de las imágenes del escenario (las coordenadas salen de los PNG).
import { sonidoBombo } from './sonidos.js';

const ADD = Phaser.BlendModes.ADD;
const W = 720;

// por escenario: qué letreros brillan, dónde está la serie de foquitos, etc.
const NEON = {
  '6-taller-el-chato': {
    letreros: [
      { x: 385, y: 126, w: 244, h: 80, color: 0xff1a8c },             // "Los Gallos"
      { x: 361, y: 848, w: 634, h: 52, color: 0xff9a1a },             // taller El Chato
      { x: 545, y: 940, w: 150, h: 44, color: 0x18e0ff },             // El Goyo
      { x: 630, y: 983, w: 34, h: 22, color: 0x39ff14, foco: true },  // xD
    ],
    foquitos: { x0: 60, x1: 660, paso: 30, y: 698, comba: 8 },
  },
  '7-todo-el-barrio': {
    letreros: [
      { x: 360, y: 130, w: 416, h: 84, color: 0xffe000 },             // Gran baile sonidero
      { x: 361, y: 848, w: 634, h: 52, color: 0x22ff88 },             // abarrotes La Güera
      { x: 292, y: 909, w: 120, h: 34, color: 0xff2a6a, foco: true }, // ABIERTO
      { x: 535, y: 940, w: 160, h: 44, color: 0x18e0ff },             // Los Gallos
    ],
    bocinas: [{ x: 66, y: 920 }, { x: 66, y: 968 }, { x: 636, y: 920 }, { x: 636, y: 968 }],
    fiesta: true,
  },
};

export class Ambiente {
  constructor(escena, esc) {
    this.e = escena;
    this.t = 0;
    this.cosas = [];      // cosas que se mueven en update
    if (esc.estilo === 'neon') this.noche(NEON[esc.id] || {});
    else this.dia();
  }

  // ----- de noche (neón) -----
  noche(c) {
    const e = this.e;
    // estrellitas que titilan en el cielo
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(10, W - 10), y = Phaser.Math.Between(112, 185);
      if (x > 140 && x < 580) continue;
      const s = e.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.4), 0xffffff).setDepth(0.5);
      e.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(500, 1400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
    }
    // cono de luz del poste: tiembla tantito y a veces se apaga un instante
    const cono = e.add.graphics().setDepth(4.5).setBlendMode(ADD);
    cono.fillStyle(0xffa640, 0.13).fillTriangle(100, 660, 20, 1280, 260, 1280);
    cono.fillStyle(0xffa640, 0.35).fillEllipse(100, 657, 46, 18);
    this.cosas.push({ tipo: 'foco', obj: cono, siguiente: Phaser.Math.FloatBetween(2, 5) });

    // letreros de neón: brillan, zumban y de repente parpadean
    for (const l of c.letreros || []) {
      const brillo = e.add.rectangle(l.x, l.y, l.w + 26, l.h + 26, l.color, 0.12).setDepth(4.5).setBlendMode(ADD);
      e.tweens.add({ targets: brillo, alpha: 0.6, duration: Phaser.Math.Between(900, 1500), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // los focos chiquitos (ABIERTO, xD) prenden y apagan como letrero de tiendita
      if (l.foco) {
        const tapa = e.add.rectangle(l.x, l.y, l.w, l.h, 0x07040f, 0).setDepth(4.6);
        e.time.addEvent({ delay: 700, loop: true, callback: () => { tapa.fillAlpha = tapa.fillAlpha ? 0 : 0.75; } });
      } else {
        const tapa = e.add.rectangle(l.x, l.y, l.w, l.h, 0x07040f, 0).setDepth(4.6);
        this.cosas.push({ tipo: 'parpadeo', obj: tapa, glow: brillo, siguiente: Phaser.Math.FloatBetween(3, 9) });
      }
    }

    // serie de foquitos de colores que se prenden en cadena
    if (c.foquitos) {
      const f = c.foquitos, colores = [0x18e0ff, 0xffe000, 0x39ff14, 0xff1a8c];
      const focos = [];
      for (let x = f.x0, i = 0; x <= f.x1; x += f.paso, i++) {
        const k = (x - f.x0) / (f.x1 - f.x0), y = f.y + Math.sin(Math.PI * k) * f.comba;
        focos.push(e.add.circle(x, y, 11, colores[i % 4], 0).setDepth(4.5).setBlendMode(ADD));
      }
      this.cosas.push({ tipo: 'serie', focos });
    }

    // luz morada debajo del carro, como lowrider
    const bajo = e.add.ellipse(480, 1080, 380, 46, 0xb026ff, 0.15).setDepth(4.5).setBlendMode(ADD);
    e.tweens.add({ targets: bajo, alpha: 0.5, scaleX: 1.06, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    if (c.fiesta) this.fiesta(c);
  }

  // nivel 7: las bocinas laten con el bombo y dos luces de antro barren el edificio
  fiesta(c) {
    const e = this.e;
    this.anillos = (c.bocinas || []).map(b => e.add.circle(b.x, b.y, 18, 0xff3ba0, 0).setStrokeStyle(4, 0xff3ba0, 0.9).setDepth(4.6).setBlendMode(ADD));
    this.haces = [[70, 0x22ff88], [650, 0xff2a6a]].map(([x, color], i) => {
      const g = e.add.graphics({ x, y: 950 }).setDepth(4.4).setBlendMode(ADD);
      g.fillStyle(color, 0.1).fillTriangle(0, 0, -70, -900, 70, -900);
      g.fillStyle(color, 0.08).fillTriangle(0, 0, -30, -900, 30, -900);
      return { g, fase: i * Math.PI };
    });
    this.pulso = 0;
    this.cosas.push({ tipo: 'bombo' });
  }

  // ----- de día -----
  dia() {
    this.cosas.push({ tipo: 'pajaros', siguiente: 1.5 });
    this.cosas.push({ tipo: 'basura', siguiente: 3 });
  }

  pajaro() {
    const e = this.e, izq = Math.random() < 0.5, y = Phaser.Math.Between(118, 175);
    const grupo = [];
    const n = Phaser.Math.Between(1, 3);
    for (let i = 0; i < n; i++) {
      const g = e.add.graphics().setDepth(0.5);
      grupo.push({ g, dx: i * 26 * (izq ? -1 : 1), dy: (i % 2) * 12, fase: Math.random() * 6 });
    }
    return { tipo: 'pajaro', grupo, x: izq ? -30 : W + 30, y, vx: (izq ? 1 : -1) * Phaser.Math.Between(50, 90) };
  }

  dibujarPajaro(g, aleteo) {
    g.clear().lineStyle(2.5, 0x2b2b3a, 0.85);
    g.beginPath(); g.moveTo(-9, aleteo); g.lineTo(0, 0); g.lineTo(9, aleteo); g.strokePath();
  }

  basurita() {
    const e = this.e, viento = e.viento || 0;
    const lado = viento ? Math.sign(viento) : (Math.random() < 0.5 ? 1 : -1);
    const cual = Phaser.Utils.Array.GetRandom(['papel', 'hoja', 'bolsa']);
    const g = e.add.graphics().setDepth(5.5);
    if (cual === 'papel') g.fillStyle(0xf2efe6).fillRect(-8, -6, 16, 12).lineStyle(1, 0x999999).strokeRect(-8, -6, 16, 12);
    else if (cual === 'hoja') g.fillStyle(0x9c6b2e).fillEllipse(0, 0, 18, 9).lineStyle(1, 0x5a3a12).lineBetween(-8, 0, 8, 0);
    else g.fillStyle(0xffffff, 0.75).fillTriangle(-10, 8, 10, 8, 0, -10).lineStyle(1, 0xbbbbbb).strokeTriangle(-10, 8, 10, 8, 0, -10);
    const rapido = 90 + Math.abs(viento) * 3;
    return { tipo: 'basurita', obj: g, x: lado > 0 ? -20 : W + 20, y0: Phaser.Math.Between(1020, 1095), vx: lado * rapido, fase: 0 };
  }

  update(dt) {
    this.t += dt;
    const nuevos = [];
    this.cosas = this.cosas.filter(c => {
      switch (c.tipo) {
        case 'foco':
          c.siguiente -= dt;
          c.obj.alpha = 0.85 + Math.sin(this.t * 23) * 0.08;
          if (c.siguiente <= 0) {
            c.siguiente = Phaser.Math.FloatBetween(3, 7);
            // se apaga dos veces rapidito
            [0, 90, 160, 260].forEach((ms, i) => this.e.time.delayedCall(ms, () => { c.obj.visible = i % 2 === 1; }));
          }
          return true;
        case 'parpadeo':
          c.siguiente -= dt;
          if (c.siguiente <= 0) {
            c.siguiente = Phaser.Math.FloatBetween(4, 10);
            [0, 70, 130, 200, 260].forEach((ms, i) => this.e.time.delayedCall(ms, () => {
              const apagado = i % 2 === 0 && i < 4;
              c.obj.fillAlpha = apagado ? 0.7 : 0;
              c.glow.visible = !apagado;
            }));
          }
          return true;
        case 'serie': {
          const n = c.focos.length, cabeza = (this.t * 9) % n;
          c.focos.forEach((f, i) => {
            const dist = Math.min(Math.abs(i - cabeza), n - Math.abs(i - cabeza));
            f.fillAlpha = 0.08 + Math.max(0, 0.75 - dist * 0.22);
          });
          return true;
        }
        case 'bombo': {
          const pulso = Math.floor(this.t / 0.5);           // 120 por minuto
          if (pulso !== this.pulso) { this.pulso = pulso; sonidoBombo(); this.golpe = 1; }
          this.golpe = Math.max(0, (this.golpe || 0) - dt * 4);
          this.anillos.forEach(a => { a.setScale(1 + this.golpe * 0.5); a.setAlpha(0.25 + this.golpe * 0.75); });
          this.haces.forEach(h => { h.g.rotation = Math.sin(this.t * 0.9 + h.fase) * 0.45; });
          return true;
        }
        case 'pajaros':
          c.siguiente -= dt;
          if (c.siguiente <= 0) { c.siguiente = Phaser.Math.FloatBetween(5, 10); nuevos.push(this.pajaro()); }
          return true;
        case 'pajaro': {
          c.x += c.vx * dt;
          for (const p of c.grupo) {
            p.fase += dt * 11;
            p.g.setPosition(c.x + p.dx, c.y + p.dy + Math.sin(this.t * 2) * 4);
            this.dibujarPajaro(p.g, Math.sin(p.fase) * 6);
          }
          const fuera = c.x < -120 || c.x > W + 120;
          if (fuera) c.grupo.forEach(p => p.g.destroy());
          return !fuera;
        }
        case 'basura':
          c.siguiente -= dt;
          if (c.siguiente <= 0) { c.siguiente = Phaser.Math.FloatBetween(4, 9); nuevos.push(this.basurita()); }
          return true;
        case 'basurita': {
          c.x += c.vx * dt;
          c.fase += dt * 7;
          c.obj.setPosition(c.x, c.y0 - Math.abs(Math.sin(c.fase)) * 22);
          c.obj.rotation += dt * Math.sign(c.vx) * 6;
          const fuera = c.x < -40 || c.x > W + 40;
          if (fuera) c.obj.destroy();
          return !fuera;
        }
      }
      return true;
    });
    this.cosas.push(...nuevos);
  }
}
