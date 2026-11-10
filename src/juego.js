import { NIVELES } from './niveles.js';
import { BANDA, PALOMAS, MEMES } from './personajes.js';
import * as snd from './sonidos.js';
import { sonidoReja, sonidoFin } from './sonidos.js';
import * as fx from './efectos.js';
import { Ambiente } from './ambiente.js';
import { abrirCandado } from './candado.js';

const W = 720, H = 1280;

// letra de los letreros finales (Anton, libre con licencia OFL; ver fuentes/)
new FontFace('Anton', 'url(fuentes/Anton.ttf)').load().then(f => document.fonts.add(f)).catch(() => {});
// Vista de frente: la fachada llena la pantalla y tú estás abajo con la resortera (primera persona).
// El dibujo de cada nivel viene de src/escenarios (lo genera arte/generar-escenarios.cjs).
const FACHADA = { x0: 30, x1: 690, top: 196, base: 1000 };
const CALLE = { top: 1000, banqueta: 1110 };
const RESORTERA = { x: 360, y: 1097 };   // centro entre las puntas de la horqueta del fondo
const HORQUETA = 38;                      // distancia del centro a cada punta
const JALON_MAX = 180;
const ALCANCE = 5.6;                      // cuánto se aleja el destino por cada pixel de jalón

// Personajes de prueba: al final se cambian por las fotos de los cuates.
const CUATES = [
  { nombre: 'Cuate 1', color: 0xff6b9d },
  { nombre: 'Cuate 2', color: 0x4ecdc4 },
  { nombre: 'Cuate 3', color: 0xffd93d },
  { nombre: 'Cuate 4', color: 0x95e1d3 },
  { nombre: 'Cuate 5', color: 0xc77dff },
];

// lo que dicen las palomas (solo escrito, en un globito): al pegarles con el gallo, o de vez en cuando volando
const DICHOS_PALOMA = {
  pegue: ['Yo a este lo conozco', 'Yo a este lo he visto en algún lado', '¿De dónde lo conozco?', 'Mmm... yo a este lo conozco'],
  volando: ['Yo a este lo he visto en algún lado...', 'Yo a este lo conozco', '¿Y ese quién es?'],
};

const VERSION = '0.5.2';

// sábana, reja y michi: aviso que parpadea y luego tapan la ventana del cliente un ratito
const AVISO_MS = 700, DURA_MS = 1500;
const AVISOS = {
  reja:   { icono: '⚠️', color: 0xff2a2a, sonido: () => sonidoReja(AVISO_MS / 1000) },
  sabana: { icono: '👵', color: 0xe8f0ff, sonido: () => snd.sonidoSuave() },
  michi:  { icono: '🐈', color: 0xffa040, sonido: () => snd.sonidoMiau() },
};

const progreso = {
  get: () => Number(localStorage.getItem('gallos.nivel') || 1),
  set(n) { if (n > this.get()) localStorage.setItem('gallos.nivel', n); },
};

const estilo = (tam, color = '#ffffff', extra = {}) => ({
  fontFamily: 'Arial Black, Arial, sans-serif', fontSize: tam, color,
  stroke: '#000000', strokeThickness: Math.max(2, tam / 8), align: 'center', ...extra,
});

function boton(escena, x, y, texto, alClic, ancho = 560) {
  const fondo = escena.add.rectangle(x, y, ancho, 90, alClic ? 0x7b2cbf : 0x444444).setStrokeStyle(4, 0xffffff);
  const etiqueta = escena.add.text(x, y, alClic ? texto : '🔒 ' + texto, estilo(32)).setOrigin(0.5);
  if (alClic) fondo.setInteractive({ useHandCursor: true }).on('pointerup', alClic);
  return [fondo, etiqueta];
}

class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  preload() {
    this.load.json('escenarios', 'src/escenarios/escenarios.json');
    this.load.on('loaderror', () => {});   // si falta un sticker se usa el personaje de prueba
    // en internet las fotos vienen del paquete con candado; en la PC, de los archivos sueltos
    const ruta = r => (RUTAS && RUTAS[r]) || encodeURI(r);
    BANDA.forEach((b, i) => this.load.image(`banda-${i}`, ruta(`personajes/stickers/${b.archivo}.png`)));
    PALOMAS.forEach((p, i) => this.load.image(`paloma-${i}`, ruta(`memes/palomas/${p.archivo}.png`)));
    Object.entries(MEMES).forEach(([llave, r]) => this.load.image(`meme-${llave}`, ruta(r)));
  }

  create() {
    this.crearTexturas();
    this.add.text(W / 2, 190, '¡GALLOS\nVOLADORES!', estilo(88, '#7CFC00', { strokeThickness: 12 })).setOrigin(0.5);
    this.add.text(W / 2, 340, '(nombre de prueba)', estilo(24, '#bbbbbb')).setOrigin(0.5);
    this.add.text(W - 16, H - 14, `v${VERSION}`, estilo(20, '#888888')).setOrigin(1, 1);
    const abiertos = progreso.get();
    NIVELES.forEach((n, i) => {
      boton(this, W / 2, 470 + i * 110, `${i + 1}. ${n.nombre}`,
        i < abiertos ? () => this.scene.start('Juego', { nivel: i }) : null);
    });
  }

  crearTexturas() {
    if (this.textures.exists('gallo')) return;
    const g = this.add.graphics();
    g.fillStyle(0xf5f0e1).fillRoundedRect(0, 4, 16, 46, 6);
    g.fillStyle(0x6b8e23).fillCircle(5, 18, 2).fillCircle(11, 28, 2).fillCircle(6, 38, 2);
    g.fillStyle(0xff7b00).fillCircle(8, 4, 5);
    g.fillStyle(0xffd000).fillCircle(8, 3, 2.5);
    g.generateTexture('gallo', 16, 52);
    g.destroy();
  }
}

class Juego extends Phaser.Scene {
  constructor() { super('Juego'); }

  init(datos) {
    this.idx = datos.nivel;
    this.cfg = NIVELES[datos.nivel];
    this.esc = this.cache.json.get('escenarios')[datos.nivel];
  }

  preload() {
    const id = this.esc.id;
    this.load.image(`fondo-${id}`, `src/escenarios/${id}-fondo.png`);
    this.load.image(`frente-${id}`, `src/escenarios/${id}-frente.png`);
  }

  create() {
    const c = this.cfg;
    this.entregas = 0;
    this.gallos = c.gallos;
    this.tiempo = c.tiempo;
    this.terminado = false;
    this.apuntando = false;
    this.vuelo = [];
    this.palomas = [];
    this.chanclas = [];
    this.patrulla = null;
    this.idos = 0;
    this.viento = 0;
    this.golpes = 0;
    this.escondidos = false;
    this.pausado = false;
    fx.texturasEfectos(this);

    this.armarEscenario();
    this.ambiente = new Ambiente(this, this.esc);
    snd.sonidoViento(0);
    this.events.once('shutdown', () => snd.sonidoViento(0));
    this.armarResortera();
    this.mira = this.add.graphics().setDepth(9);

    this.add.rectangle(W / 2, 55, W, 110, 0x000000, 0.45).setDepth(19);
    this.hud = this.add.text(20, 18, '', estilo(28, '#ffffff', { align: 'left' })).setDepth(20);
    this.add.text(W / 2, 80, `Nivel ${this.idx + 1}: ${c.nombre}`, estilo(28, '#ffe066')).setOrigin(0.5).setDepth(20);
    this.actualizarHud();

    this.input.on('pointerdown', p => {
      if (!this.terminado && !this.pausado && p.y > CALLE.top) {
        this.apuntando = true;
        this.dibujarMira(p);
      }
    });
    this.input.on('pointermove', p => { if (this.apuntando) this.dibujarMira(p); });
    this.input.on('pointerup', p => {
      if (!this.apuntando) return;
      this.apuntando = false;
      this.mira.clear();
      this.ligas.setVisible(true);
      this.lanzar(p);
    });

    this.cada(1, () => {
      this.tiempo--;
      this.actualizarHud();
      if (this.tiempo <= 0) this.fin(false, '⏰ ¡Se acabó el tiempo!');
    });
    if (c.viento) {
      this.banderita = this.add.text(W / 2, 135, '', estilo(30, '#bdf4ff', { backgroundColor: '#000000aa', padding: { x: 12, y: 4 } })).setOrigin(0.5).setDepth(20);
      this.cambiarViento();
      this.cada(6, () => this.cambiarViento());
    }
    this.cada(c.aparicion, () => this.nuevoCliente());
    this.nuevoCliente();

    const o = c.obstaculos;
    for (const tipo of ['sabana', 'reja', 'michi']) if (o[tipo]) this.cada(o[tipo], () => this.obstaculoEnCliente(tipo));
    if (o.palomas) this.cada(o.palomas, () => this.paloma());
    if (o.patrulla) this.cada(o.patrulla, () => this.avisoPatrulla());
    this.mostrarInstrucciones();
  }

  // cada vez que entras a un nivel: tarjeta con lo nuevo de ese nivel; el juego espera a que le des «¡Va!»
  mostrarInstrucciones() {
    const lista = this.cfg.instrucciones || [];
    if (!lista.length) return;
    this.pausado = true;
    this.time.paused = true;
    const objs = [this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)];
    const alto = 230 + lista.length * 120;
    objs.push(this.add.rectangle(W / 2, H / 2, 640, alto, 0x1c1c26).setStrokeStyle(4, 0x9a9ab0));
    const arriba = H / 2 - alto / 2;
    objs.push(this.add.text(W / 2, arriba + 55, `NIVEL ${this.idx + 1}: ¡OJO!`, estilo(40, '#ffe066')).setOrigin(0.5));
    lista.forEach((t, i) => objs.push(this.add.text(W / 2, arriba + 150 + i * 120, t,
      estilo(25, '#ffffff', { wordWrap: { width: 560 }, lineSpacing: 4 })).setOrigin(0.5)));
    const cerrar = () => {
      objs.forEach(o => o.destroy());
      this.time.paused = false;
      this.time.delayedCall(150, () => { this.pausado = false; });   // que el mismo toque no dispare la resortera
    };
    objs.push(...boton(this, W / 2, arriba + alto - 70, '¡Va!', cerrar, 300));
    objs.forEach(o => o.setDepth(50));
  }

  cada(segundos, fn) {
    this.time.addEvent({ delay: segundos * 1000, loop: true, callback: () => { if (!this.terminado) fn(); } });
  }

  armarEscenario() {
    const esc = this.esc, { w, h } = esc.vidrio;
    this.neon = esc.estilo === 'neon';
    this.add.image(0, 0, `fondo-${esc.id}`).setOrigin(0).setDepth(0);
    this.add.image(0, 0, `frente-${esc.id}`).setOrigin(0).setDepth(4);
    // capas: fondo (0) → luz del cuarto (1) → quien se asoma (2) → michi (3) → marcos y rejas (4)
    this.ventanas = esc.ventanas.map(({ x, y }) => {
      const forma = this.make.graphics({}, false).fillRect(x - w / 2, y - h / 2, w, h);
      return { x, y, w, h, mascara: forma.createGeometryMask(), rect: new Phaser.Geom.Rectangle(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16), cliente: null, bloqueo: null };
    });
  }

  // stickers de la banda que sí se cargaron (la jefa y el subjefe se guardan para sus niveles)
  stickerAlAzar() {
    const listos = BANDA.map((b, i) => ({ b, llave: `banda-${i}` })).filter(o => o.b.papel === 'banda' && this.textures.exists(o.llave));
    return listos.length ? Phaser.Utils.Array.GetRandom(listos) : null;
  }

  armarResortera() {
    const { x, y } = RESORTERA;
    this.colorLiga = this.neon ? 0xffff00 : 0x4a2614;
    this.ligas = this.add.graphics().setDepth(10);
    this.ligas.lineStyle(6, this.colorLiga).lineBetween(x - HORQUETA, y, x, y + 10).lineBetween(x, y + 10, x + HORQUETA, y);
    // primera persona: no se ve a nadie, solo la resortera en tu mano
    this.add.text(x, H - 22, 'Jala hacia abajo y suelta', estilo(20)).setOrigin(0.5).setDepth(12);
  }

  // El destino en la fachada sale del jalón; el gallo vuela hacia allá "metiéndose" en la pantalla.
  jalon(p) {
    let dx = RESORTERA.x - p.x, dy = RESORTERA.y - p.y;
    const largo = Math.hypot(dx, dy);
    if (largo > JALON_MAX) { dx *= JALON_MAX / largo; dy *= JALON_MAX / largo; }
    return { dx, dy, largo: Math.min(largo, JALON_MAX) };
  }

  // viento = pixeles que el aire empuja al gallo de lado al llegar (se nota más al final del vuelo)
  trayecto(dx, dy, viento = 0) {
    const x0 = RESORTERA.x, y0 = RESORTERA.y;
    const sx = x0 + dx * ALCANCE * 0.55, ty = y0 + dy * ALCANCE;
    const dist = Math.hypot(sx - x0, ty - y0);
    return { x0, y0, sx, tx: sx + viento, ty, viento, T: 0.35 + dist / 1700, salto: 80 + dist * 0.18 };
  }

  posicion(tr, u) {
    return {
      x: tr.x0 + (tr.sx - tr.x0) * u + tr.viento * u * u,
      y: tr.y0 + (tr.ty - tr.y0) * u - Math.sin(Math.PI * u) * tr.salto,
      escala: 1.6 - 1.0 * u,
    };
  }

  dibujarMira(p) {
    const { dx, dy } = this.jalon(p), { x, y } = RESORTERA, g = this.mira;
    this.ligas.setVisible(false);
    g.clear();
    g.lineStyle(6, this.colorLiga);
    g.lineBetween(x - HORQUETA, y, x - dx, y - dy);
    g.lineBetween(x + HORQUETA, y, x - dx, y - dy);
    g.fillStyle(0xffffff).fillCircle(x - dx, y - dy, 9);
    if (dy >= 0) return;
    // en todos los niveles la mirilla marca justo dónde cae (sin contar el viento: ese lo compensas tú);
    // los puntitos del camino se ven más cortos en los niveles altos
    const tr = this.trayecto(dx, dy), hasta = this.cfg.mira;
    for (let u = 0.08; u < Math.min(0.95, hasta); u += 0.08) {
      const q = this.posicion(tr, u);
      g.fillStyle(0xffffff, 0.9 - u * 0.5).fillCircle(q.x, q.y, 6 * q.escala);
    }
    g.lineStyle(4, 0x000000, 0.6).strokeCircle(tr.tx, tr.ty, 15);
    g.lineStyle(3, 0xffffff).strokeCircle(tr.tx, tr.ty, 14);
    g.lineBetween(tr.tx - 22, tr.ty, tr.tx - 8, tr.ty).lineBetween(tr.tx + 8, tr.ty, tr.tx + 22, tr.ty)
      .lineBetween(tr.tx, tr.ty - 22, tr.tx, tr.ty - 8).lineBetween(tr.tx, tr.ty + 8, tr.tx, tr.ty + 22);
  }

  lanzar(p) {
    const { dx, dy, largo } = this.jalon(p);
    if (largo < 25 || dy >= 0 || this.terminado) return;
    if (this.patrulla?.viendo) {
      this.fin(false, 'Lanzaste con la patrulla enfrente', 'arresto');
      return;
    }
    if (this.gallos <= 0) return;
    this.gallos--;
    const tr = this.trayecto(dx, dy, this.viento);
    const obj = this.add.image(tr.x0, tr.y0, 'gallo').setDepth(8).setScale(1.6);
    this.vuelo.push({ obj, tr, u: 0, estela: fx.fxEstela(this, obj) });
    fx.fxDisparo(this, tr.x0, tr.y0);
    snd.sonidoLiga();
    this.actualizarHud();
  }

  nuevoCliente() {
    if (this.escondidos) return;          // mientras pasa la patrulla nadie se asoma
    const libres = this.ventanas.filter(v => !v.cliente && !v.bloqueo);
    if (!libres.length) return;
    const v = Phaser.Utils.Array.GetRandom(libres);
    const total = this.cfg.paciencia;
    const luz = this.neon ? Phaser.Utils.Array.GetRandom([0xffbf00, 0x00ffff]) : 0xffcf6b;
    const partes = [this.add.rectangle(v.x, v.y, v.w, v.h, luz, this.neon ? 0.9 : 0.8).setDepth(1)];
    const quien = this.stickerAlAzar();
    let cara;
    if (quien) {
      const img = this.add.image(v.x, v.y - v.h / 2 + quien.b.arriba * v.w / 84, quien.llave).setOrigin(0.5, 0);
      img.setScale((quien.b.ancho * v.w / 84) / img.width).setDepth(2).setMask(v.mascara);
      // se asoma desde abajo de la ventana con un rebotito
      this.tweens.add({ targets: img, y: { from: img.y + v.h * 0.8, to: img.y }, duration: 320, ease: 'Back.easeOut' });
      partes.push(img);
      cara = img;
    } else {
      const cuate = Phaser.Utils.Array.GetRandom(CUATES), r = v.w * 0.32;
      cara = this.add.circle(v.x, v.y + r * 0.6, r, cuate.color).setDepth(2).setMask(v.mascara);
      partes.push(cara);
      partes.push(this.add.text(v.x, v.y + r * 0.6, '😃', { fontSize: Math.round(r * 1.3) }).setOrigin(0.5).setDepth(2).setMask(v.mascara));
    }
    if (this.neon) {
      // el marco brilla como tubo de neón mientras hay alguien
      partes.push(this.add.rectangle(v.x, v.y, v.w + 22, v.h + 22).setStrokeStyle(10, luz, 0.35).setDepth(5).setBlendMode(Phaser.BlendModes.ADD));
      partes.push(this.add.rectangle(v.x, v.y, v.w + 14, v.h + 14).setStrokeStyle(3, luz).setDepth(5));
    }
    const barra = this.add.rectangle(v.x - v.w / 2, v.y + v.h / 2 + 16, v.w, 7, 0x7CFC00).setOrigin(0, 0.5).setDepth(5);
    partes.push(barra);
    // algunos clientes te avientan la chancla si no les llega su gallo (cuántos depende del nivel)
    const chanclero = Math.random() < (this.cfg.obstaculos.chancla || 0);
    v.cliente = { partes, barra, cara, restante: total, total, chanclero, avisado: false };
  }

  cambiarViento() {
    const max = this.cfg.viento;
    // a veces se calma; si no, sopla para un lado con fuerza al azar
    this.viento = Math.random() < 0.2 ? 0 : Phaser.Math.Between(Math.round(max * 0.35), max) * (Math.random() < 0.5 ? -1 : 1);
    const flechas = Math.round(Math.abs(this.viento) / max * 3);
    const lado = this.viento < 0 ? '⬅'.repeat(flechas) : '➡'.repeat(flechas);
    this.banderita.setText(this.viento ? `VIENTO ${lado}` : 'VIENTO: calma');
    snd.sonidoViento(Math.abs(this.viento) / max);
  }

  // airecito: rayitas con una curva que cruzan la pantalla hacia donde sopla;
  // con más viento salen más seguido, más largas y más rápido
  soplar(dt) {
    this.aire = this.aire || [];
    this.tAire = (this.tAire || 0) - dt;
    const fuerza = Math.abs(this.viento) / this.cfg.viento, lado = Math.sign(this.viento);
    if (fuerza > 0 && this.tAire <= 0) {
      this.tAire = 0.13 / fuerza * Phaser.Math.FloatBetween(0.5, 1.5);
      const largo = 70 + 110 * fuerza, V = Phaser.Math.Vector2;
      const curva = new Phaser.Curves.CubicBezier(new V(0, 0), new V(largo * 0.35, -12), new V(largo * 0.7, 12), new V(largo, 0));
      const g = this.add.graphics().setDepth(7).setAlpha(Phaser.Math.FloatBetween(0.6, 0.9));
      g.lineStyle(5, 0x000000, 0.25); curva.draw(g); g.lineStyle(3.5, 0xffffff, 0.95);
      curva.draw(g);
      // remolinito al final de algunas rayitas
      if (Math.random() < 0.4) g.strokeCircle(largo + 6, -6, 6);
      g.setPosition(lado > 0 ? -largo - 20 : W + largo + 20, Phaser.Math.Between(220, 980)).setScale(lado, 1);
      this.aire.push({ g, vx: lado * (420 + 520 * fuerza), y0: g.y, fase: Math.random() * 6 });
    }
    this.aire = this.aire.filter(a => {
      a.g.x += a.vx * dt;
      a.fase += dt * 5;
      a.g.y = a.y0 + Math.sin(a.fase) * 6;
      const fuera = a.g.x < -300 || a.g.x > W + 300;
      if (fuera) a.g.destroy();
      return !fuera;
    });
  }

  quitarCliente(v) {
    v.cliente.temblor?.remove();
    v.cortina = null;
    v.cliente.partes.forEach(o => o.destroy());
    v.cliente = null;
  }

  // Sábana, reja y michi solo salen en la ventana de alguien que está esperando su gallo:
  // primero un aviso que parpadea (con el dibujito de lo que viene), luego tapan el tiro 1.5 s y se quitan.
  // Si en ese momento no hay nadie asomado, no sale nada (lo intenta en la siguiente vuelta).
  obstaculoEnCliente(tipo) {
    if (this.escondidos) return;
    const conGente = this.ventanas.filter(v => v.cliente && !v.bloqueo && !v.cortina);
    if (!conGente.length) return;
    const v = Phaser.Utils.Array.GetRandom(conGente);
    const A = AVISOS[tipo];
    v.bloqueo = 'aviso';
    const marco = this.add.rectangle(v.x, v.y, v.w + 18, v.h + 18, A.color, 0.25).setStrokeStyle(9, A.color).setDepth(5);
    const alerta = this.add.text(v.x, v.y - v.h / 2 - 24, A.icono, { fontSize: 38 }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: [marco, alerta], alpha: 0.1, duration: 120, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: alerta, scale: 1.3, duration: 180, yoyo: true, repeat: 1 });
    A.sonido();
    this.time.delayedCall(AVISO_MS, () => {
      marco.destroy();
      alerta.destroy();
      if (this.terminado) { if (v.bloqueo === 'aviso') v.bloqueo = null; return; }
      if (v.bloqueo === 'aviso') v.bloqueo = tipo;
      const partes = this[`poner_${tipo}`](v);
      this.time.delayedCall(DURA_MS, () => {
        partes.forEach(o => o.destroy());
        if (v.bloqueo === tipo) v.bloqueo = null;
      });
    });
  }

  // la señora tendiendo la sábana enfrente de la ventana
  poner_sabana(v) {
    if (this.textures.exists('meme-sabana')) {
      const tela = this.add.image(v.x, v.y + 6, 'meme-sabana').setDepth(5);
      tela.setScale((v.w + 34) / tela.width);
      this.tweens.add({ targets: tela, y: { from: v.y - 40, to: v.y + 6 }, alpha: { from: 0, to: 1 }, duration: 180 });
      return [tela];
    }
    return [this.add.rectangle(v.x, v.y + 4, v.w + 20, v.h + 18, 0xf8f8ff).setStrokeStyle(3, 0x9999cc).setDepth(5),
      this.add.text(v.x, v.y - v.h / 2 - 16, '👵 tendiendo', estilo(15)).setOrigin(0.5).setDepth(5)];
  }

  // cae la reja enfrente del cliente
  poner_reja(v) {
    this.cameras.main.shake(90, 0.004);
    this.time.delayedCall(110, () => fx.fxPolvo(this, v.x, v.y + v.h / 2 + 6, v.w));
    const g = this.add.graphics().setDepth(5);
    const x0 = v.x - v.w / 2 - 6, y0 = v.y - v.h / 2 - 6, ww = v.w + 12, hh = v.h + 12;
    g.fillStyle(0x000000, 0.35).fillRect(x0, y0, ww, hh);
    g.lineStyle(7, 0x1a1a1a);
    for (let i = 0; i <= 4; i++) g.lineBetween(x0 + ww * i / 4, y0, x0 + ww * i / 4, y0 + hh);
    g.lineBetween(x0, y0 + hh / 2, x0 + ww, y0 + hh / 2);
    g.lineStyle(3, 0x8a8a8a);
    for (let i = 0; i <= 4; i++) g.lineBetween(x0 + ww * i / 4 - 2, y0, x0 + ww * i / 4 - 2, y0 + hh);
    g.y = -hh;
    this.tweens.add({ targets: g, y: 0, duration: 110, ease: 'Bounce.easeOut' });
    return [g];
  }

  // el michi se sube al marco enfrente del cliente, de la panza para arriba
  poner_michi(v) {
    if (this.textures.exists('meme-michi')) {
      const img = this.add.image(v.x, v.y + v.h / 2 + 4, 'meme-michi').setOrigin(0.5, 1).setDepth(3).setMask(v.mascara);
      img.setScale((v.w * 1.1) / img.width);
      this.tweens.add({ targets: img, y: { from: img.y + v.h, to: img.y }, duration: 220, ease: 'Back.easeOut' });
      return [img];
    }
    return [this.add.text(v.x, v.y + v.h * 0.2, '🐈', { fontSize: Math.round(v.h * 0.6) }).setOrigin(0.5).setDepth(3).setMask(v.mascara)];
  }

  paloma() {
    const izquierda = Math.random() < 0.5;
    const x = izquierda ? -50 : W + 50, y = Phaser.Math.Between(260, 880);
    const listas = PALOMAS.map((p, i) => ({ p, llave: `paloma-${i}` })).filter(o => this.textures.exists(o.llave));
    let obj;
    if (listas.length) {
      // la paloma del meme, volteada para que vea hacia donde vuela
      const { p, llave } = Phaser.Utils.Array.GetRandom(listas);
      obj = this.add.image(x, y, llave).setOrigin(0.5).setDepth(7);
      obj.setScale(60 / obj.height).setFlipX((p.mira === 'derecha') !== izquierda);
    } else {
      obj = this.add.text(x, y, '🕊️', { fontSize: 56 }).setOrigin(0.5).setDepth(7).setFlipX(!izquierda);
    }
    const p = { obj, vx: (izquierda ? 1 : -1) * Phaser.Math.Between(140, 220) };
    this.palomas.push(p);
    if (Math.random() < 0.35) this.time.delayedCall(Phaser.Math.Between(700, 1500), () => {
      if (p.obj.active && !this.terminado) this.globito(p, Phaser.Utils.Array.GetRandom(DICHOS_PALOMA.volando));
    });
  }

  // globito de cómic que sigue a la paloma (sin voz, solo texto)
  globito(p, texto) {
    p.globo?.destroy();
    const globo = this.add.text(p.obj.x, p.obj.y - 48, texto, {
      fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: 20, color: '#111111',
      backgroundColor: '#ffffff', padding: { x: 10, y: 6 }, wordWrap: { width: 230 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(16).setScale(0);
    this.tweens.add({ targets: globo, scale: 1, duration: 160, ease: 'Back.easeOut' });
    p.globo = globo;
    this.time.delayedCall(1800, () => { if (p.globo === globo) p.globo = null; globo.destroy(); });
  }

  // al cliente se le acaba la paciencia: se pone rojo, tiembla y amenaza (si le atinas a tiempo, se calma)
  avisoChancla(v) {
    const c = v.cliente;
    c.avisado = true;
    if (c.cara.setTint) c.cara.setTint(0xff5a5a); else c.cara.fillColor = 0xff3030;
    c.barra.fillColor = 0xff3030;
    const x0 = c.cara.x;
    c.temblor = this.tweens.add({ targets: c.cara, x: { from: x0 - 4, to: x0 + 4 }, duration: 60, yoyo: true, repeat: -1 });
    const t = this.add.text(Phaser.Math.Clamp(v.x, 155, W - 155), v.y - v.h / 2 - 20, '😠 ¡Ahorita vas a ver!', estilo(21, '#ffdddd')).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: t, scale: { from: 0.5, to: 1 }, duration: 150, ease: 'Back.easeOut' });
    c.partes.push(t);
    snd.sonidoAvisoChancla();
  }

  // el cliente enojado te avienta la chancla desde su ventana
  chancla(v) {
    if (this.terminado) return;
    snd.sonidoZumbido();
    // la chancla viene hacia ti: se hace más grande conforme se acerca
    let obj;
    if (this.textures.exists('meme-chancla')) {
      obj = this.add.image(v.x, v.y, 'meme-chancla').setDepth(7);
      obj.setScale(52 / obj.width);
      obj.base = obj.scale;              // la chancla crece desde su tamaño de imagen
    } else {
      obj = this.add.text(v.x, v.y, '🩴', { fontSize: 40 }).setOrigin(0.5).setDepth(7);
    }
    const ang = Phaser.Math.Angle.Between(v.x, v.y, RESORTERA.x, RESORTERA.y - 120);
    this.chanclas.push({ obj, vx: Math.cos(ang) * 340, vy: Math.sin(ang) * 340, crece: true });
  }

  // la chancla te pegó en la pantalla: se agrieta; al tercer golpe se rompe y pierdes
  chanclazoATi(ch) {
    if (this.terminado) return;
    const { x, y } = ch.obj;
    this.golpes = (this.golpes || 0) + 1;
    snd.sonidoChanclazo();
    fx.fxGolpe(this, x, y);
    this.cameras.main.shake(220, 0.012);
    this.cameras.main.flash(120, 255, 80, 80);
    this.agrietar(x, y, this.golpes);
    if (this.golpes >= 3) {
      this.regano?.destroy();
      snd.sonidoVidrio(true);
      this.fin(false, 'Te rompieron la pantalla a chanclazos', 'muerte');
      return;
    }
    snd.sonidoVidrio();
    this.regano?.destroy();
    const t = this.regano = this.add.text(W / 2, 620, '¡TE DIJE QUE NO!', estilo(54, '#ff4d4d', { strokeThickness: 10 })).setOrigin(0.5).setDepth(25).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, angle: { from: -8, to: 3 }, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: 580, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  // dibuja grietas de vidrio desde el punto del golpe; con cada golpe son más y más largas
  agrietar(x, y, nivel) {
    const g = this.add.graphics().setDepth(22);
    const rayos = [7, 11, 18][nivel - 1] || 18, largoMax = [170, 320, 700][nivel - 1] || 700;
    const lineas = [];
    for (let i = 0; i < rayos; i++) {
      // cada grieta es una línea quebrada que sale del golpe, a veces con una ramita
      const ang = (i / rayos) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const largo = Phaser.Math.FloatBetween(0.45, 1) * largoMax;
      let px = x, py = y, a = ang;
      const puntos = [{ x: px, y: py }];
      for (let s = 1; s <= 5; s++) {
        a += Phaser.Math.FloatBetween(-0.35, 0.35);
        px += Math.cos(a) * largo / 5; py += Math.sin(a) * largo / 5;
        puntos.push({ x: px, y: py });
        if (Math.random() < 0.3) {
          const b = a + Phaser.Math.FloatBetween(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1), lb = largo / 6;
          lineas.push([{ x: px, y: py }, { x: px + Math.cos(b) * lb, y: py + Math.sin(b) * lb }]);
        }
      }
      lineas.push(puntos);
    }
    // anillos alrededor del golpe (como vidrio estrellado)
    const anillos = nivel;
    for (let r = 1; r <= anillos; r++) {
      const radio = 22 * r + nivel * 10, pts = [];
      for (let k = 0; k <= rayos; k++) {
        const a = (k / rayos) * Math.PI * 2;
        const rr = radio * Phaser.Math.FloatBetween(0.85, 1.15);
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      lineas.push(pts);
    }
    const trazar = (grosor, color, alfa) => {
      g.lineStyle(grosor, color, alfa);
      for (const pts of lineas) g.strokePoints(pts, false);
    };
    trazar(5, 0x000000, 0.45);
    trazar(2, 0xffffff, 0.95);
    g.fillStyle(0xffffff, 0.35).fillCircle(x, y, 10 + nivel * 6);
    g.setScale(0.6).setPosition(x * 0.4, y * 0.4);   // "brota" desde el golpe
    this.tweens.add({ targets: g, scale: 1, x: 0, y: 0, duration: 120, ease: 'Quad.easeOut' });
    this.actualizarHud();
  }

  // al oír la sirena todos cierran la cortina y se hacen los que no hacen nada:
  // su tiempo se congela, no avientan chancla y no se les puede dar gallo hasta que se va la patrulla
  cerrarCortinas() {
    this.escondidos = true;
    const tela = this.neon ? [0x4a1670, 0x6a1b9a] : [0x9c2f24, 0xc0392b];
    for (const v of this.ventanas) {
      if (!v.cliente || v.cortina) continue;
      const mitad = v.w / 2 + 2, mitades = [];
      for (const lado of [-1, 1]) {
        // cada mitad crece desde su orilla hacia el centro, con pliegues
        const g = this.add.graphics({ x: v.x + lado * (v.w / 2), y: v.y - v.h / 2 }).setDepth(3.5).setMask(v.mascara);
        const x0 = lado < 0 ? 0 : -mitad;
        g.fillStyle(tela[1]).fillRect(x0, 0, mitad, v.h);
        for (let k = 0; k < 4; k++) g.fillStyle(tela[0], 0.8).fillRect(x0 + (k + 0.5) * mitad / 4 - 3, 0, 6, v.h);
        g.fillStyle(0x000000, 0.25).fillRect(x0, 0, mitad, 6);
        g.scaleX = 0;
        this.tweens.add({ targets: g, scaleX: 1, duration: 260, ease: 'Quad.easeOut' });
        mitades.push(g);
      }
      v.cortina = mitades;
      v.cliente.partes.push(...mitades);
    }
  }

  abrirCortinas() {
    this.escondidos = false;
    for (const v of this.ventanas) {
      if (!v.cortina) continue;
      const mitades = v.cortina;
      v.cortina = null;
      this.tweens.add({ targets: mitades, scaleX: 0, duration: 260, ease: 'Quad.easeIn', onComplete: () => mitades.forEach(m => m.destroy()) });
    }
  }

  // a medio camino el poli se asoma por la ventana de la patrulla un segundo, viendo para arriba
  asomarPoli(p) {
    const poli = this.add.container(p.obj.x, p.obj.y - 18).setDepth(5.9).setScale(1.5);
    p.luz.setVisible(false);   // el «¡ALTO AHÍ!» se quita mientras él se asoma
    const g = this.add.graphics();
    g.fillStyle(0x1d2b5c).fillRect(-17, 12, 34, 22);                 // camisa
    g.fillStyle(0xd9a066).fillCircle(0, 0, 16);                      // cara
    g.fillStyle(0x111111).fillRoundedRect(-13, -5, 26, 8, 3);        // lentes oscuros
    g.fillStyle(0x1d2b5c).fillRect(-17, -18, 34, 9).fillRect(-21, -10, 42, 4);  // gorra
    g.fillStyle(0xffd23f).fillCircle(0, -14, 3);                     // placa de la gorra
    g.fillStyle(0x6b3a1e).fillRect(-7, 7, 14, 3);                    // bigote
    poli.add(g);
    const dice = this.add.text(0, -40, Phaser.Utils.Array.GetRandom(['👀 Mmm...', '¿Qué hacen?', '¿Y ese olor?']),
      estilo(18, '#ffffff')).setOrigin(0.5).setAlpha(0);
    poli.add(dice);
    p.poli = poli;
    this.tweens.add({ targets: poli, y: p.obj.y - 95, duration: 220, ease: 'Back.easeOut', yoyo: true, hold: 1000,
      onComplete: () => { poli.destroy(); if (p.poli === poli) p.poli = null; if (p.luz.active) p.luz.setVisible(true); } });
    this.tweens.add({ targets: dice, alpha: 1, duration: 150, delay: 200, yoyo: true, hold: 750 });
  }

  avisoPatrulla() {
    if (this.patrulla || this.escondidos) return;
    const aviso = this.add.text(W / 2, 160, '🚨 ¡Ahí viene la patrulla! 🚨', estilo(34, '#ff4444')).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: aviso, alpha: 0.2, duration: 250, yoyo: true, repeat: 3, onComplete: () => aviso.destroy() });
    snd.sonidoSirena(5.5);
    this.cerrarCortinas();
    this.time.delayedCall(1800, () => {
      if (this.terminado) return;
      const y = (CALLE.top + CALLE.banqueta) / 2;
      let obj;
      if (this.textures.exists('meme-patrulla')) {
        // la imagen ve a la derecha y la patrulla va hacia la izquierda: se voltea
        obj = this.add.image(W + 120, y, 'meme-patrulla').setDepth(6).setFlipX(true);
        obj.setScale(230 / obj.width);
      } else {
        obj = this.add.text(W + 120, y, '🚓', { fontSize: 100 }).setOrigin(0.5).setDepth(6);
      }
      const luz = this.add.text(W + 120, y - 70, '¡ALTO AHÍ!', estilo(22, '#ff3030')).setOrigin(0.5).setDepth(6);
      // torreta: dos destellos (rojo y azul) que se turnan, y el reflejo de colores sobre el edificio
      const rojo = this.add.circle(0, 0, 22, 0xff2020).setAlpha(0).setDepth(6.5).setBlendMode(Phaser.BlendModes.ADD);
      const azul = this.add.circle(0, 0, 22, 0x2060ff).setAlpha(0).setDepth(6.5).setBlendMode(Phaser.BlendModes.ADD);
      const reflejo = this.add.rectangle(W / 2, (FACHADA.top + CALLE.banqueta) / 2, W, CALLE.banqueta - FACHADA.top, 0xff2020, 0)
        .setDepth(4.7).setBlendMode(Phaser.BlendModes.ADD);
      this.patrulla = { obj, luz, viendo: false, rojo, azul, reflejo };
    });
  }

  flotar(x, y, texto, color = '#ffffff') {
    const t = this.add.text(x, y, texto, estilo(28, color)).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  update(_, ms) {
    if (this.terminado || this.pausado) return;
    const dt = ms / 1000;

    for (const v of this.ventanas) {
      if (!v.cliente || this.escondidos) continue;   // con la cortina cerrada su tiempo no corre
      v.cliente.restante -= dt;
      v.cliente.barra.width = v.w * Math.max(0, v.cliente.restante / v.cliente.total);
      if (v.cliente.chanclero && !v.cliente.avisado && v.cliente.restante <= 1.3) this.avisoChancla(v);
      if (v.cliente.restante <= 0) {
        if (v.cliente.chanclero) { v.cliente.temblor?.remove(); this.chancla(v); }
        this.flotar(v.x, v.y, '😤 se fue');
        fx.fxEnojo(this, v.x, v.y - v.h / 2);
        snd.sonidoEnojo();
        this.quitarCliente(v);
        this.idos++;
        this.actualizarHud();
        if (this.cfg.enojados) this.tweens.add({ targets: this.hud, scale: 1.12, duration: 120, yoyo: true });
        if (this.cfg.enojados && this.idos >= this.cfg.enojados) this.fin(false, `😤 Se te fueron ${this.idos} clientes
sin su gallo`);
      }
    }

    if (this.cfg.viento) this.soplar(dt);
    this.ambiente.update(dt);

    const moverYLimpiar = lista => lista.filter(o => {
      o.obj.x += o.vx * dt;
      o.obj.y += (o.vy || 0) * dt;
      const fuera = o.obj.x < -100 || o.obj.x > W + 100 || o.obj.y > H + 50;
      if (fuera) { o.obj.destroy(); o.globo?.destroy(); }
      return !fuera;
    });
    this.palomas = moverYLimpiar(this.palomas);
    // el globito no se sale de la pantalla aunque la paloma vaya en la orilla
    for (const p of this.palomas) if (p.globo?.active) p.globo.setPosition(Phaser.Math.Clamp(p.obj.x, 130, W - 130), p.obj.y - 40);
    this.chanclas = moverYLimpiar(this.chanclas);
    for (const ch of this.chanclas) {
      ch.obj.rotation += dt * 10;
      ch.crece = Math.min(3, (ch.crece === true ? 1 : ch.crece) + dt * 1.2);
      ch.obj.setScale((ch.obj.base || 1) * ch.crece);
      // si no la tumbaste, la chancla te llega: ¡te dije que no!
      if (!ch.pego && Phaser.Math.Distance.Between(ch.obj.x, ch.obj.y, RESORTERA.x, RESORTERA.y - 120) < 70) {
        ch.pego = true;
        this.chanclazoATi(ch);
      }
    }
    this.chanclas = this.chanclas.filter(ch => { if (ch.pego) ch.obj.destroy(); return !ch.pego; });

    if (this.patrulla) {
      const p = this.patrulla;
      p.obj.x -= 230 * dt;
      p.luz.x = p.obj.x;
      const turno = Math.floor(this.time.now / 200) % 2;
      p.luz.setColor(turno ? '#ff3030' : '#3080ff');
      // la torreta va arriba del carro; el destello prende fuerte y se desvanece
      const brillo = 1 - (this.time.now % 200) / 200, techo = p.obj.y - (p.obj.displayHeight || 100) * 0.42;
      p.rojo.setPosition(p.obj.x - 14, techo).setAlpha(turno ? brillo : 0.1).setScale(1 + brillo * 0.6);
      p.azul.setPosition(p.obj.x + 14, techo).setAlpha(turno ? 0.1 : brillo).setScale(1 + brillo * 0.6);
      p.reflejo.fillColor = turno ? 0xff2020 : 0x2060ff;
      p.reflejo.fillAlpha = 0.13 * brillo;
      p.viendo = p.obj.x > -60 && p.obj.x < W + 60;
      if (!p.seAsomo && p.obj.x < W / 2 + 40) { p.seAsomo = true; this.asomarPoli(p); }
      if (p.poli) p.poli.x = p.obj.x + 20;
      if (p.obj.x < -150) {
        p.poli?.destroy();
        this.abrirCortinas();
        p.obj.destroy();
        p.luz.destroy();
        p.rojo.destroy();
        p.azul.destroy();
        p.reflejo.destroy();
        this.patrulla = null;
      }
    }

    for (const g of this.vuelo) {
      g.u += dt / g.tr.T;
      const q = this.posicion(g.tr, Math.min(1, g.u));
      g.obj.setPosition(q.x, q.y).setScale(q.escala);
      g.obj.rotation += dt * 9;
      const choca = (lista, r = 45) => lista.find(o => Phaser.Math.Distance.Between(o.obj.x, o.obj.y, q.x, q.y) < r);
      const paloma = choca(this.palomas, 32);
      if (paloma) {
        this.flotar(q.x, q.y + 40, '🕊️ ¡Se lo robó!');
        fx.fxPlumas(this, q.x, q.y);
        snd.sonidoAleteo();
        this.globito(paloma, Phaser.Utils.Array.GetRandom(DICHOS_PALOMA.pegue));
        g.muerto = true;
        continue;
      }
      if (choca(this.chanclas)) {
        this.flotar(q.x, q.y, '🩴 ¡Chanclazo!');
        fx.fxGolpe(this, q.x, q.y);
        snd.sonidoChanclazo();
        this.cameras.main.shake(80, 0.003);
        g.muerto = true;
        continue;
      }
      if (g.u >= 1) { this.aterriza(g); g.muerto = true; }
    }
    this.vuelo = this.vuelo.filter(g => { if (g.muerto) { g.estela.apagar(); g.obj.destroy(); } return !g.muerto; });

    if (!this.terminado && this.gallos <= 0 && !this.vuelo.length && this.entregas < this.cfg.meta) {
      this.fin(false, '😩 Te quedaste sin gallos');
    }
  }

  // El gallo llega a la fachada: o entra a una ventana, o pega en la pared y se cae.
  aterriza(g) {
    const { tx, ty } = g.tr;
    const v = this.ventanas.find(v => Phaser.Geom.Rectangle.Contains(v.rect, tx, ty));
    if (!v) {
      const enFachada = tx > FACHADA.x0 && tx < FACHADA.x1 && ty > FACHADA.top && ty < FACHADA.base;
      if (enFachada) { this.caidaEnPared(tx, ty); fx.fxPared(this, tx, ty); snd.sonidoPared(); }
      this.flotar(tx, ty, enFachada ? '¡Pegó en la pared!' : '¡Se fue volando!');
      return;
    }
    if (v.bloqueo === 'michi') {
      fx.fxPuf(this, tx, ty, 0xffc27a);
      snd.sonidoMiau();
      return this.globito({ obj: { x: v.x, y: v.y - v.h / 2 + 10 } }, Phaser.Utils.Array.GetRandom(['¡MIAU!', '¡Miaaau! 😾', '¡Mrrrau!']));
    }
    if (v.bloqueo === 'sabana') { fx.fxPuf(this, tx, ty); snd.sonidoSuave(); return this.flotar(v.x, v.y, '¡Pegó en la sábana!'); }
    if (v.bloqueo === 'reja') { fx.fxChispas(this, tx, ty); snd.sonidoRejazo(); return this.flotar(v.x, v.y, '¡Rejazo! 🔒'); }
    if (!v.cliente) { fx.fxPuf(this, tx, ty, 0xcccccc); snd.sonidoSuave(); return this.flotar(v.x, v.y, 'No hay nadie 🤷'); }
    if (v.cortina) { fx.fxPuf(this, tx, ty); snd.sonidoSuave(); return this.flotar(v.x, v.y, '🤫 Cortina cerrada'); }
    fx.fxEntrega(this, v.x, v.y);
    snd.sonidoEntrega();
    this.tweens.add({ targets: this.hud, scale: 1.1, duration: 100, yoyo: true });
    this.quitarCliente(v);
    this.entregas++;
    this.flotar(v.x, v.y, '+1 🔥', '#7CFC00');
    this.actualizarHud();
    if (this.entregas >= this.cfg.meta) this.fin(true);
  }

  caidaEnPared(x, y) {
    const cae = this.add.image(x, y, 'gallo').setScale(0.6).setDepth(5);
    this.tweens.add({ targets: cae, y: FACHADA.base, angle: 200, alpha: 0.3, duration: 700, ease: 'Quad.easeIn', onComplete: () => cae.destroy() });
  }

  actualizarHud() {
    const enojo = this.cfg.enojados ? `   😤 ${this.idos}/${this.cfg.enojados}` : '';
    const vidrio = this.cfg.obstaculos.chancla ? `   🩴 ${this.golpes}/3` : '';
    this.hud.setText(`🎯 ${this.entregas}/${this.cfg.meta}   🌿 ${this.gallos}   ⏱ ${Math.max(0, this.tiempo)}${enojo}${vidrio}`);
  }

  // drama = 'arresto' o 'muerte': todo se congela, se pone en blanco y negro, la cámara se acerca
  // despacito y sale el letrero grande; después aparecen los botones.
  fin(gano, motivo = '', drama = null) {
    if (this.terminado) return;
    this.terminado = true;
    this.mira.clear();
    this.vuelo.forEach(g => g.estela.apagar());
    snd.sonidoViento(0);
    if (gano) { progreso.set(this.idx + 2); fx.fxConfeti(this, W); snd.sonidoVictoria(); }
    if (drama) return this.finDramatico(motivo, drama);
    this.pantallaFinal(gano, motivo);
  }

  finDramatico(motivo, drama) {
    const cam = this.cameras.main;
    this.tweens.pauseAll();
    this.time.paused = true;
    try { cam.postFX.addColorMatrix().grayscale(); } catch { /* sin WebGL: sin gris */ }
    cam.zoomTo(1.12, 1400, 'Sine.easeOut');
    const arresto = drama === 'arresto';
    sonidoFin(arresto);
    // capa fija que no se acerca con la cámara: otra cámara solo para el letrero
    const capa = this.cameras.add(0, 0, W, H);
    capa.ignore(this.children.list);
    const objs = [];
    if (arresto) {
      // luces de patrulla, rojo y azul, a los lados
      const rojo = this.add.rectangle(0, H / 2, W / 2, H, 0xff0000, 0).setOrigin(0, 0.5);
      const azul = this.add.rectangle(W, H / 2, W / 2, H, 0x2050ff, 0).setOrigin(1, 0.5);
      objs.push(rojo, azul);
      let n = 0;
      this.luces = setInterval(() => { n++; rojo.fillAlpha = n % 2 ? 0.16 : 0; azul.fillAlpha = n % 2 ? 0 : 0.16; }, 230);
    }
    const franja = this.add.rectangle(W / 2, 575, W, 250, 0x000000, 0.75).setScale(1, 0);
    // letrero estilo meme: palabra gigante que aparece despacito (letra parecida, no la del juego original)
    const letrero = this.add.text(W / 2, 548, arresto ? 'BUSTED' : 'WASTED', {
      fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 150, color: arresto ? '#5aa9ff' : '#d4202c',
      stroke: '#000000', strokeThickness: 10, shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 12, fill: true },
    }).setOrigin(0.5).setAlpha(0).setScale(1.15);
    const sub = this.add.text(W / 2, 668, motivo, estilo(26, '#ffffff')).setOrigin(0.5).setAlpha(0);
    objs.push(franja, letrero, sub);
    objs.forEach(o => o.setDepth(40));
    cam.ignore(objs);
    // los tweens de la escena están en pausa: estos van con temporizadores del navegador
    const anim = (obj, props, ms) => {
      const ini = Object.fromEntries(Object.keys(props).map(k => [k, obj[k]])), t0 = performance.now();
      const paso = () => {
        const k = Math.min(1, (performance.now() - t0) / ms), e = 1 - (1 - k) ** 3;
        for (const p in props) obj[p] = ini[p] + (props[p] - ini[p]) * e;
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    setTimeout(() => { anim(franja, { scaleY: 1 }, 600); anim(letrero, { alpha: 1, scale: 1 }, 1100); }, 600);
    setTimeout(() => anim(sub, { alpha: 1 }, 400), 1500);
    setTimeout(() => {
      clearInterval(this.luces);
      const botones = [['Otra vez ↻', () => this.scene.restart({ nivel: this.idx })], ['Menú', () => this.scene.start('Menu')]];
      const nuevos = [];
      botones.forEach(([texto, fn], i) => boton(this, W / 2, 800 + i * 120, texto, fn).forEach(o => { o.setDepth(41); nuevos.push(o); }));
      cam.ignore(nuevos);
    }, 1800);
    this.events.once('shutdown', () => { clearInterval(this.luces); this.time.paused = false; this.tweens.resumeAll(); });
  }

  pantallaFinal(gano, motivo) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(30);
    const titulo = gano ? '¡NIVEL SUPERADO! 🔥' : motivo;
    this.add.text(W / 2, 420, titulo, estilo(44, gano ? '#7CFC00' : '#ff6060')).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, 540, `Entregas: ${this.entregas}/${this.cfg.meta}`, estilo(32)).setOrigin(0.5).setDepth(31);
    const botones = [];
    if (gano && this.idx + 1 < NIVELES.length) {
      botones.push(['Siguiente nivel ▶', () => this.scene.restart({ nivel: this.idx + 1 })]);
    }
    botones.push(['Otra vez ↻', () => this.scene.restart({ nivel: this.idx })]);
    botones.push(['Menú', () => this.scene.start('Menu')]);
    botones.forEach(([texto, fn], i) => boton(this, W / 2, 700 + i * 120, texto, fn).forEach(o => o.setDepth(31)));
  }
}

// primero el candado (pide el código de la banda si el juego está en internet); luego arranca el juego
const RUTAS = await abrirCandado();

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: W,
  height: H,
  backgroundColor: '#1b1035',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Menu, Juego],
});
window.juego = juego;
