// Ejecuta el script real con imitaciones de los servicios de Google, sin cuenta ni correos de verdad.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const PLANTILLA = readFileSync(new URL('../google/canjear.gs', import.meta.url), 'utf8');
export const CORREO = 'correo@ejemplo.com';

export function crearScript({ clave, ids, fallaCorreo = () => false }) {
  const correos = [];
  const propiedades = new Map();
  const estado = { bloqueos: 0 };

  const entorno = {
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => Object.fromEntries(propiedades),
        getProperty: (nombre) => propiedades.get(nombre) ?? null,
        setProperty: (nombre, valor) => { propiedades.set(nombre, valor); },
        deleteProperty: (nombre) => { propiedades.delete(nombre); },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => { estado.bloqueos += 1; },
        releaseLock: () => { estado.bloqueos -= 1; },
      }),
    },
    MailApp: {
      sendEmail: (para, asunto, cuerpo) => {
        if (fallaCorreo()) throw new Error('Cuota de correo agotada');
        correos.push({ para, asunto, cuerpo });
      },
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (texto) => ({ texto, setMimeType() { return this; } }),
    },
    Utilities: {
      formatDate: (fecha, zona) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: zona }).format(fecha),
    },
  };

  const codigo = PLANTILLA
    .replace('__CLAVE__', clave)
    .replace('__CORREO__', CORREO)
    .replace('__IDS__', JSON.stringify(ids));
  vm.createContext(entorno);
  vm.runInContext(codigo, entorno);

  return {
    correos,
    estado,
    llamar: (parametros) => JSON.parse(entorno.doPost({ parameter: parametros }).texto),
  };
}
