// Compartido por la web y por preparar.mjs, para que ambos conviertan las respuestas igual.
const SAL = 'vales-sal-1:';

export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^((el|la|los|las|un|una|en|a) )+/, '');
}

export async function huella(texto) {
  const datos = new TextEncoder().encode(SAL + normalizar(texto));
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
