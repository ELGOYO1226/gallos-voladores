// Candado de entrada: pide el código de la banda y con él abre privado/banda.bin (fotos y memes).
// El código no está escrito en ningún lado: solo sirve si logra abrir el archivo.
// Si no existe banda.bin (jugando en la PC sin empaquetar), entra directo con los archivos sueltos.
const GUARDADO = 'gallos.codigo';

async function abrir(bin, codigo) {
  const sal = bin.slice(0, 16), iv = bin.slice(16, 28), cerrado = bin.slice(28);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(codigo), 'PBKDF2', false, ['deriveKey']);
  const llave = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 200000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const paquete = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, llave, cerrado));
  const largo = new DataView(paquete.buffer).getUint32(0, true);
  const indice = JSON.parse(new TextDecoder().decode(paquete.slice(4, 4 + largo)));
  const datos = 4 + largo, rutas = {};
  for (const a of indice) {
    rutas[a.ruta] = URL.createObjectURL(new Blob([paquete.slice(datos + a.inicio, datos + a.inicio + a.largo)], { type: 'image/png' }));
  }
  return rutas;
}

function pantalla() {
  const caja = document.createElement('div');
  caja.id = 'candado';
  caja.innerHTML = `
    <div class="tarjeta">
      <div class="titulo">¡GALLOS<br>VOLADORES!</div>
      <div class="sub">Solo para la banda</div>
      <input id="codigo" type="password" placeholder="Código de la banda" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button id="entrar">Entrar</button>
      <div id="aviso"></div>
    </div>`;
  const css = document.createElement('style');
  css.textContent = `
    #candado { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 30%, #3a2470, #120a26 70%); font-family: 'Arial Black', Arial, sans-serif; z-index: 10; }
    #candado .tarjeta { width: min(86vw, 380px); padding: 28px 24px; border-radius: 18px; text-align: center;
      background: linear-gradient(160deg, #2b2b35, #15151c); border: 2px solid #8a8aa0;
      box-shadow: 0 0 0 1px #000, 0 10px 40px #000a, inset 0 1px 0 #ffffff33; }
    #candado .titulo { font-size: 38px; line-height: 1; color: #7CFC00; text-shadow: 3px 3px 0 #000, 0 0 18px #7CFC0066; }
    #candado .sub { color: #c9c9d6; font: bold 15px Arial; margin: 10px 0 18px; }
    #candado input { width: 100%; box-sizing: border-box; padding: 14px; font-size: 18px; border-radius: 10px;
      border: 2px solid #55556a; background: #0d0d12; color: #fff; text-align: center; outline: none; }
    #candado input:focus { border-color: #7CFC00; }
    #candado button { margin-top: 14px; width: 100%; padding: 14px; font: 900 20px 'Arial Black', Arial; color: #fff;
      border: 0; border-radius: 10px; background: linear-gradient(180deg, #9b4dff, #6a1fd0); box-shadow: 0 4px 0 #3c0f80; }
    #candado button:active { transform: translateY(3px); box-shadow: 0 1px 0 #3c0f80; }
    #candado #aviso { min-height: 22px; margin-top: 12px; color: #ff6b6b; font: bold 15px Arial; }`;
  document.head.appendChild(css);
  document.body.appendChild(caja);
  return caja;
}

// regresa { 'personajes/stickers/x.png': 'blob:...' } o null si no hay paquete (jugando en la PC)
export async function abrirCandado() {
  let bin;
  try {
    const r = await fetch('privado/banda.bin', { cache: 'no-cache' });
    if (!r.ok) return null;
    bin = new Uint8Array(await r.arrayBuffer());
  } catch { return null; }

  const guardado = localStorage.getItem(GUARDADO);
  if (guardado) {
    try { return await abrir(bin, guardado); } catch { localStorage.removeItem(GUARDADO); }
  }

  const caja = pantalla();
  const campo = caja.querySelector('#codigo'), boton = caja.querySelector('#entrar'), aviso = caja.querySelector('#aviso');
  return new Promise(listo => {
    const probar = async () => {
      const codigo = campo.value.trim();
      if (!codigo) return;
      boton.disabled = true;
      aviso.style.color = '#c9c9d6';
      aviso.textContent = 'Abriendo...';
      try {
        const rutas = await abrir(bin, codigo);
        localStorage.setItem(GUARDADO, codigo);
        caja.remove();
        listo(rutas);
      } catch {
        aviso.style.color = '#ff6b6b';
        aviso.textContent = 'Código equivocado';
        campo.value = '';
        boton.disabled = false;
        campo.focus();
      }
    };
    boton.addEventListener('click', probar);
    campo.addEventListener('keydown', e => { if (e.key === 'Enter') probar(); });
    campo.focus();
  });
}
