import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CORREO, crearScript } from './google-falso.mjs';

const CLAVE = 'clave-de-prueba';
const IDS = ['mini', 'blanco1'];
const crear = (opciones = {}) => crearScript({ clave: CLAVE, ids: IDS, ...opciones });
const canje = (extra = {}) => ({ k: CLAVE, accion: 'canjear', id: 'mini', nombre: 'Vale por una limpieza del mini', ...extra });

test('rechaza una clave incorrecta sin enviar nada ni enseñar los canjes', () => {
  const { llamar, correos } = crear();
  assert.equal(llamar(canje({ k: 'mala' })).codigo, 403);
  assert.equal(llamar({ k: 'mala', accion: 'estado' }).codigo, 403);
  assert.equal(correos.length, 0);
});

test('canjea, envía un correo a tu dirección y lo registra', () => {
  const { llamar, correos } = crear();
  assert.equal(llamar(canje()).codigo, 200);
  assert.equal(correos.length, 1);
  assert.equal(correos[0].para, CORREO);
  assert.equal(correos[0].asunto, '¡SE HA CANJEADO "Vale por una limpieza del mini"!');
  assert.match(correos[0].cuerpo, /toca cumplirlo/);

  const estado = llamar({ k: CLAVE, accion: 'estado' });
  assert.equal(estado.canjes.mini.nombre, 'Vale por una limpieza del mini');
});

test('un vale solo se canjea una vez', () => {
  const { llamar, correos } = crear();
  llamar(canje());
  const segunda = llamar(canje());
  assert.equal(segunda.codigo, 409);
  assert.equal(segunda.canje.nombre, 'Vale por una limpieza del mini');
  assert.equal(correos.length, 1);
});

test('si falla el correo el vale queda libre y se puede reintentar', () => {
  let falla = true;
  const { llamar, correos } = crear({ fallaCorreo: () => falla });
  assert.equal(llamar(canje()).codigo, 502);
  assert.deepEqual(llamar({ k: CLAVE, accion: 'estado' }).canjes, {});

  falla = false;
  assert.equal(llamar(canje()).codigo, 200);
  assert.equal(correos.length, 1);
});

test('rechaza vales desconocidos y nombres vacíos o demasiado largos', () => {
  const { llamar, correos } = crear();
  assert.equal(llamar(canje({ id: 'inventado' })).codigo, 400);
  assert.equal(llamar(canje({ nombre: '   ' })).codigo, 400);
  assert.equal(llamar(canje({ nombre: 'x'.repeat(81) })).codigo, 400);
  assert.equal(correos.length, 0);
});

test('el estado inicial está vacío', () => {
  const { llamar } = crear();
  const estado = llamar({ k: CLAVE, accion: 'estado' });
  assert.equal(estado.codigo, 200);
  assert.deepEqual(estado.canjes, {});
});

test('suelta el bloqueo tanto si canjea como si ya estaba canjeado', () => {
  const { llamar, estado } = crear();
  llamar(canje());
  llamar(canje());
  assert.equal(estado.bloqueos, 0);
});

test('un vale en blanco no puede meter saltos de línea en el asunto', () => {
  const { llamar, correos } = crear();
  llamar(canje({ id: 'blanco1', nombre: 'Vale por\nuna\r\ntarde' }));
  assert.equal(correos[0].asunto, '¡SE HA CANJEADO "Vale por una tarde"!');
});
