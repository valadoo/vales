// Guarda cada canje una sola vez y avisa por correo. Es una plantilla: preparar.mjs rellena los
// datos en privado/codigo-para-google.gs, que es el archivo que se pega en Google Apps Script.
const CLAVE = '__CLAVE__';
const CORREO = '__CORREO__';
const IDS = __IDS__;
const MAX_NOMBRE = 80;
const PREFIJO = 'canje:';

// Apps Script siempre responde con estado 200, así que el resultado real va dentro.
function responder(codigo, cuerpo) {
  return ContentService
    .createTextOutput(JSON.stringify({ codigo, ...cuerpo }))
    .setMimeType(ContentService.MimeType.JSON);
}

function leerCanjes(propiedades) {
  const todas = propiedades.getProperties();
  const canjes = {};
  for (const nombre of Object.keys(todas)) {
    if (nombre.startsWith(PREFIJO)) canjes[nombre.slice(PREFIJO.length)] = JSON.parse(todas[nombre]);
  }
  return canjes;
}

function enviarAviso(nombre, fecha) {
  const cuando = Utilities.formatDate(fecha, 'Europe/Madrid', "dd/MM/yyyy 'a las' HH:mm");
  const titulo = `¡SE HA CANJEADO "${nombre}"!`;
  MailApp.sendEmail(CORREO, titulo, `${titulo}\n\nYa no hay escapatoria: toca cumplirlo.\n\nCanjeado el ${cuando}.`);
}

function doPost(e) {
  const datos = e.parameter;
  if (datos.k !== CLAVE) return responder(403, { error: 'clave' });

  const propiedades = PropertiesService.getScriptProperties();
  if (datos.accion === 'estado') return responder(200, { canjes: leerCanjes(propiedades) });
  if (datos.accion !== 'canjear') return responder(400, { error: 'accion' });

  const nombre = String(datos.nombre || '').replace(/\s+/g, ' ').trim();
  if (!IDS.includes(datos.id)) return responder(400, { error: 'vale' });
  if (!nombre || nombre.length > MAX_NOMBRE) return responder(400, { error: 'nombre' });

  const propiedad = PREFIJO + datos.id;
  const fecha = new Date();
  const canje = { nombre, fecha: fecha.toISOString() };

  // El bloqueo impide que dos pulsaciones a la vez pasen las dos esta comprobación.
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    const existente = propiedades.getProperty(propiedad);
    if (existente) return responder(409, { error: 'canjeado', canje: JSON.parse(existente) });
    propiedades.setProperty(propiedad, JSON.stringify(canje));
  } finally {
    bloqueo.releaseLock();
  }

  try {
    enviarAviso(nombre, fecha);
  } catch (error) {
    // Sin aviso no hay canje: se libera el vale para que pueda volver a intentarlo.
    console.error(error);
    propiedades.deleteProperty(propiedad);
    return responder(502, { error: 'correo' });
  }

  return responder(200, { canje });
}
