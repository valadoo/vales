// Servidor local: sirve docs/ y ejecuta el script real con servicios de Google falsos. Los correos salen por consola.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import contenido from '../docs/contenido.js';
import { crearScript } from './google-falso.mjs';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const PUERTO = 4323;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

let fallaCorreo = false;
const nuevoScript = () => crearScript({
  clave: 'prueba',
  ids: contenido.vales.map((vale) => vale.id),
  acertijos: contenido.acertijos.length,
  fallaCorreo: () => fallaCorreo,
});
let script = nuevoScript();

createServer(async (peticion, respuesta) => {
  const { pathname, searchParams } = new URL(peticion.url, `http://localhost:${PUERTO}`);

  if (pathname === '/__prueba') {
    if (searchParams.has('reset')) script = nuevoScript();
    if (searchParams.has('fallaCorreo')) fallaCorreo = searchParams.get('fallaCorreo') === '1';
    respuesta.setHeader('Content-Type', 'application/json');
    respuesta.end(JSON.stringify({ fallaCorreo, correos: script.correos }));
    return;
  }

  if (pathname === '/canjear') {
    let cuerpo = '';
    for await (const trozo of peticion) cuerpo += trozo;
    const antes = script.correos.length;
    const salida = script.llamar(Object.fromEntries(new URLSearchParams(cuerpo)));
    if (script.correos.length > antes) console.log('Correo:', script.correos.at(-1).asunto);
    respuesta.setHeader('Content-Type', 'application/json');
    respuesta.end(JSON.stringify(salida));
    return;
  }

  try {
    const ruta = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
    let datos = await readFile(join(DOCS, ruta));
    // En local la web habla con este servidor, no con Google.
    if (ruta === 'contenido.js') datos = datos.toString().replace(/"api": ".*?"/, '"api": "/canjear"');
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] ?? 'application/octet-stream' });
    respuesta.end(datos);
  } catch {
    respuesta.writeHead(404);
    respuesta.end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`Abre http://localhost:${PUERTO}/#k=prueba`));
