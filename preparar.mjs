// Genera docs/contenido.js a partir de privado/contenido.json, sustituyendo las respuestas
// por su huella para que no queden legibles en el repositorio público.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { huella, normalizar } from './docs/normalizar.js';

const raiz = new URL('./', import.meta.url);
const fuente = JSON.parse(readFileSync(new URL('privado/contenido.json', raiz), 'utf8'));

const ids = new Set(fuente.vales.map((vale) => vale.id));
const repartidos = fuente.acertijos.flatMap((acertijo) => acertijo.vales);
for (const id of repartidos) {
  if (!ids.has(id)) throw new Error(`El acertijo reparte un vale que no existe: ${id}`);
}
for (const id of ids) {
  if (!repartidos.includes(id)) throw new Error(`Ningún acertijo reparte el vale: ${id}`);
}

const acertijos = await Promise.all(
  fuente.acertijos.map(async ({ pregunta, vales, opciones, fechas, respuestas = [], contiene = [] }) => {
    if (![...respuestas, ...contiene].some(normalizar)) throw new Error(`Falta la respuesta de: ${pregunta}`);
    return {
      pregunta,
      vales,
      opciones,
      fechas,
      huellas: await Promise.all(respuestas.map(huella)),
      palabras: await Promise.all(contiene.map(huella)),
    };
  }),
);

const contenido = { api: fuente.api, vales: fuente.vales, acertijos };
writeFileSync(
  new URL('docs/contenido.js', raiz),
  `// Generado por preparar.mjs. No lo edites a mano.\nexport default ${JSON.stringify(contenido, null, 2)};\n`,
);

const rutaClave = new URL('privado/clave.txt', raiz);
if (!existsSync(rutaClave)) writeFileSync(rutaClave, randomBytes(16).toString('hex'));
const clave = readFileSync(rutaClave, 'utf8').trim();

const codigoGoogle = readFileSync(new URL('google/canjear.gs', raiz), 'utf8')
  .replace('__CLAVE__', clave)
  .replace('__CORREO__', fuente.correo)
  .replace('__IDS__', JSON.stringify([...ids]));
writeFileSync(new URL('privado/codigo-para-google.gs', raiz), codigoGoogle);

const pendientes = [];
if (fuente.web.includes('CAMBIAR')) pendientes.push('la dirección de la web ("web")');
if (fuente.api.includes('CAMBIAR')) pendientes.push('la dirección del script de Google ("api")');
const sinRespuesta = fuente.acertijos.filter((a) => a.respuestas?.includes('prueba'));
if (sinRespuesta.length) pendientes.push(`${sinRespuesta.length} respuestas de prueba`);

console.log(`docs/contenido.js generado: ${fuente.vales.length} vales y ${acertijos.length} acertijos.`);
console.log(`Enlace para ella: ${fuente.web}#k=${clave}`);
console.log('Código para Google Apps Script: privado/codigo-para-google.gs');
if (pendientes.length) console.warn(`\nTodavía sin rellenar: ${pendientes.join(', ')}.`);
