import contenido from './contenido.js';
import { icono } from './iconos.js';
import { huella, normalizar } from './normalizar.js';

const { api, vales, acertijos } = contenido;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = Array.from({ length: 31 }, (_, indice) => String(indice + 1));
const PREFIJO = 'Vale por ';
const SIN_RED = 'No ha salido. El vale sigue intacto: inténtalo otra vez en un rato.';
const ENLACE_MALO = 'Este enlace no es el bueno: abre el que te pasé.';
const TANDA = 1;

const $ = (id) => document.getElementById(id);
const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// El navegador puede bloquear el almacenamiento: la web sigue funcionando sin recordar nada.
const almacen = {
  leer(nombre, porDefecto) {
    try {
      const valor = localStorage.getItem(`vales.${nombre}`);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch {
      return porDefecto;
    }
  },
  guardar(nombre, valor) {
    try {
      localStorage.setItem(`vales.${nombre}`, JSON.stringify(valor));
    } catch {}
  },
};

const claveDelEnlace = new URLSearchParams(location.hash.slice(1)).get('k');
if (claveDelEnlace) almacen.guardar('clave', claveDelEnlace);
const clave = claveDelEnlace ?? almacen.leer('clave', null);

// Subir TANDA olvida una vez el avance guardado en cada móvil. No toca la clave ni los canjes del script.
if (almacen.leer('tanda', null) !== TANDA) {
  almacen.guardar('tanda', TANDA);
  almacen.guardar('aciertos', 0);
  almacen.guardar('canjes', {});
  almacen.guardar('borradores', {});
}

let aciertos = almacen.leer('aciertos', 0);
let canjes = almacen.leer('canjes', {});
const borradores = almacen.leer('borradores', {});
let abierto = null;
let pasoPintado = null;

const pasoDe = new Map(acertijos.flatMap((acertijo, paso) => acertijo.vales.map((id) => [id, paso])));
const valePorId = new Map(vales.map((vale) => [vale.id, vale]));
const ordenados = acertijos.flatMap((acertijo) => acertijo.vales).map((id) => valePorId.get(id));

const conseguido = (vale) => pasoDe.get(vale.id) < aciertos;

function nombreDe(vale) {
  if (canjes[vale.id]) return canjes[vale.id].nombre;
  if (vale.enBlanco && borradores[vale.id]) return PREFIJO + borradores[vale.id];
  return vale.nombre;
}

function colorDe(vale) {
  if (canjes[vale.id]) return 'canjeado';
  return vale.enBlanco ? 'blanco' : vale.color;
}

function fechaLegible(iso) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));
}

function crearTicket(vale, esNuevo) {
  const disponible = conseguido(vale);
  const ticket = document.createElement(disponible ? 'button' : 'div');
  const canjeado = Boolean(canjes[vale.id]);
  ticket.className = 'ticket';
  ticket.dataset.color = disponible ? colorDe(vale) : 'bloqueado';
  ticket.classList.toggle('ticket--bloqueado', !disponible);
  ticket.classList.toggle('ticket--canjeado', canjeado);
  ticket.classList.toggle('ticket--blanco', disponible && Boolean(vale.enBlanco) && !canjeado);
  ticket.classList.toggle('ticket--nuevo', esNuevo);

  const talon = document.createElement('span');
  talon.className = 'ticket__talon';
  talon.innerHTML = icono(disponible ? vale.icono : 'candado');

  const cuerpo = document.createElement('span');
  cuerpo.className = 'ticket__cuerpo';
  const nombre = document.createElement('span');
  nombre.className = 'ticket__nombre';
  nombre.textContent = disponible ? nombreDe(vale) : `${PREFIJO}???`;
  cuerpo.append(nombre);
  if (canjeado) {
    const sello = document.createElement('span');
    sello.className = 'sello';
    sello.textContent = 'Canjeado';
    cuerpo.append(sello);
  }
  ticket.append(talon, cuerpo);

  if (disponible) {
    ticket.type = 'button';
    ticket.dataset.id = vale.id;
    ticket.addEventListener('click', () => abrir(vale, ticket));
  }
  return ticket;
}

function textoDeProgreso() {
  const total = vales.length;
  const llevas = vales.filter(conseguido).length;
  const gastados = Object.keys(canjes).length;
  if (gastados === total) return 'Los has gastado todos. Habrá que ir pensando en renovarlos.';
  if (llevas === total) return `Los tienes todos. Te quedan ${total - gastados} de ${total} por canjear.`;
  if (llevas === 0) return `Acierta la pregunta para conseguir el primero de ${total}.`;
  return `Llevas ${llevas} de ${total}. Acierta la siguiente para conseguir más.`;
}

function crearEntrada() {
  const entrada = document.createElement('input');
  entrada.id = 'respuesta';
  entrada.className = 'entrada';
  entrada.type = 'text';
  entrada.autocomplete = 'off';
  entrada.spellcheck = false;
  entrada.setAttribute('autocapitalize', 'off');
  entrada.setAttribute('enterkeyhint', 'go');
  entrada.setAttribute('aria-labelledby', 'pregunta');
  return entrada;
}

function crearOpcion(texto) {
  const boton = document.createElement('button');
  boton.className = 'boton boton--secundario';
  boton.type = 'button';
  boton.textContent = texto;
  boton.addEventListener('click', () => comprobar(texto));
  return boton;
}

function crearSelector(etiqueta, inicial, valores) {
  const selector = document.createElement('select');
  selector.className = 'entrada';
  selector.setAttribute('aria-label', etiqueta);
  selector.add(new Option(inicial, ''));
  for (const valor of valores) selector.add(new Option(valor, valor));
  return selector;
}

function crearFecha(nombre) {
  const grupo = document.createElement('div');
  grupo.className = 'fecha';
  const titulo = document.createElement('span');
  titulo.className = 'fecha__nombre';
  titulo.textContent = nombre;
  grupo.append(titulo, crearSelector(`Día de ${nombre}`, 'Día', DIAS), crearSelector(`Mes de ${nombre}`, 'Mes', MESES));
  return grupo;
}

function pintarCampos(acertijo) {
  $('pregunta').textContent = acertijo.pregunta;
  $('comprobar').hidden = Boolean(acertijo.opciones);
  $('campos').className = acertijo.opciones ? 'campos campos--opciones' : 'campos';
  $('campos').replaceChildren(
    ...(acertijo.opciones?.map(crearOpcion) ?? acertijo.fechas?.map(crearFecha) ?? [crearEntrada()]),
  );
}

function pintar(idsNuevos = []) {
  $('progreso').textContent = textoDeProgreso();

  const acertijo = acertijos[aciertos];
  $('acertijo').hidden = !acertijo;
  // Solo se rehace al cambiar de acertijo, para no borrar lo que esté escribiendo.
  if (acertijo && pasoPintado !== aciertos) pintarCampos(acertijo);
  pasoPintado = aciertos;

  $('tickets').replaceChildren(
    ...ordenados.map((vale) => {
      const fila = document.createElement('li');
      fila.append(crearTicket(vale, idsNuevos.includes(vale.id)));
      return fila;
    }),
  );
}

function sincronizarAciertos() {
  for (const id of Object.keys(canjes)) {
    if (pasoDe.has(id)) aciertos = Math.max(aciertos, pasoDe.get(id) + 1);
  }
  almacen.guardar('aciertos', aciertos);
}

async function pedir(datos) {
  const respuesta = await fetch(api, {
    method: 'POST',
    body: new URLSearchParams({ ...datos, k: clave ?? '' }),
  });
  const cuerpo = await respuesta.json();
  return { codigo: cuerpo.codigo, cuerpo };
}

function mostrarAviso(texto, conReintento) {
  $('aviso').hidden = !texto;
  $('aviso-texto').textContent = texto ?? '';
  $('reintentar').hidden = !conReintento;
}

async function cargarCanjes() {
  if (!clave) return mostrarAviso(ENLACE_MALO, false);
  mostrarAviso(null);
  try {
    const { codigo, cuerpo } = await pedir({ accion: 'estado' });
    if (codigo === 403) return mostrarAviso(ENLACE_MALO, false);
    if (codigo !== 200) throw new Error(`Estado ${codigo}`);
    canjes = cuerpo.canjes;
    almacen.guardar('canjes', canjes);
    sincronizarAciertos();
    if (!abierto) pintar();
  } catch {
    mostrarAviso('No he podido comprobar qué vales has canjeado.', true);
  }
}

function leerPropuesta(acertijo) {
  if (acertijo.fechas) {
    const valores = [...$('campos').querySelectorAll('select')].map((selector) => selector.value);
    return valores.every(Boolean) ? valores.join(' ') : '';
  }
  return $('respuesta').value.trim();
}

function alEnviar(evento) {
  evento.preventDefault();
  const acertijo = acertijos[aciertos];
  const propuesta = leerPropuesta(acertijo);
  if (propuesta) comprobar(propuesta);
  else $('resultado').textContent = acertijo.fechas ? 'Elige el día y el mes de las dos.' : 'Escribe algo, que así no vale.';
}

// Vale la frase entera o, si el acertijo tiene palabras clave, cualquier frase que contenga una.
async function esCorrecta(acertijo, propuesta) {
  if (acertijo.huellas.includes(await huella(propuesta))) return true;
  const palabras = await Promise.all(normalizar(propuesta).split(' ').map(huella));
  return palabras.some((palabra) => acertijo.palabras.includes(palabra));
}

async function comprobar(propuesta) {
  const paso = aciertos;
  const acertijo = acertijos[paso];
  const correcta = await esCorrecta(acertijo, propuesta);
  // Con dos pulsaciones seguidas, la segunda no debe saltarse el siguiente acertijo.
  if (paso !== aciertos) return;

  if (!correcta) {
    $('resultado').textContent = 'Esa no es.';
    $('campos').classList.remove('campos--mal');
    void $('campos').offsetWidth;
    $('campos').classList.add('campos--mal');
    return;
  }

  aciertos += 1;
  almacen.guardar('aciertos', aciertos);
  document.activeElement?.blur();
  const premios = acertijo.vales.map((id) => valePorId.get(id));
  $('resultado').textContent = premios.length > 1
    ? `¡Premio gordo! Tienes ${premios.length} vales en blanco.`
    : `¡Conseguido! ${premios[0].nombre}.`;
  pintar(acertijo.vales);
  const nuevo = document.querySelector(`[data-id="${acertijo.vales[0]}"]`);
  nuevo.scrollIntoView({ block: 'nearest', behavior: sinMovimiento() ? 'auto' : 'smooth' });
  navigator.vibrate?.(30);
}

function pintarDetalle(vale) {
  const canje = canjes[vale.id];
  $('hoja').dataset.color = colorDe(vale);
  $('detalle-icono').innerHTML = icono(vale.icono);
  $('detalle-nombre').textContent = nombreDe(vale);
  $('detalle-texto').textContent = vale.texto;
  $('detalle-texto').hidden = Boolean(canje) && Boolean(vale.enBlanco);
  $('detalle-campo').hidden = !vale.enBlanco || Boolean(canje);
  $('detalle-entrada').value = borradores[vale.id] ?? '';
  $('detalle-sello').hidden = !canje;
  $('detalle-hecho').textContent = canje ? `Canjeado el ${fechaLegible(canje.fecha)}.` : '';
  $('detalle-error').textContent = '';
  $('talon').hidden = Boolean(canje);
  $('canjear').hidden = false;
  $('confirmar').hidden = true;
}

function abrir(vale, origen) {
  abierto = vale;
  pintarDetalle(vale);
  $('cerrar').innerHTML = icono('cerrar');
  $('detalle').showModal();
  history.pushState({ detalle: vale.id }, '');
  if (sinMovimiento()) return;
  const desde = origen.getBoundingClientRect();
  const hasta = $('hoja').getBoundingClientRect();
  const escala = desde.width / hasta.width;
  $('hoja').animate(
    [
      { transform: `translate(${desde.left - hasta.left}px, ${desde.top - hasta.top}px) scale(${escala})`, opacity: 0.5, transformOrigin: '0 0' },
      { transform: 'none', opacity: 1, transformOrigin: '0 0' },
    ],
    { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}

function cerrar() {
  if (history.state?.detalle) history.back();
  else $('detalle').close();
}

function fijarOcupado(ocupado) {
  for (const id of ['confirmar-si', 'confirmar-no']) $(id).disabled = ocupado;
  $('confirmar-si').textContent = ocupado ? 'Canjeando...' : 'Sí, canjear';
}

function pedirConfirmacion() {
  if (abierto.enBlanco && !$('detalle-entrada').value.trim()) {
    $('detalle-error').textContent = 'Escribe primero qué quieres.';
    $('detalle-entrada').focus();
    return;
  }
  $('detalle-error').textContent = '';
  $('canjear').hidden = true;
  $('confirmar').hidden = false;
  $('confirmar-si').focus();
}

async function arrancarTalon() {
  $('detalle-sello').hidden = false;
  if (sinMovimiento()) {
    $('talon').hidden = true;
    return;
  }
  $('detalle-sello').animate(
    [
      { transform: 'rotate(-5deg) scale(1.8)', opacity: 0 },
      { transform: 'rotate(-5deg) scale(1)', opacity: 1 },
    ],
    { duration: 220, delay: 260, easing: 'cubic-bezier(0.3, 1.4, 0.6, 1)', fill: 'backwards' },
  );
  await $('talon').animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(16px) rotate(-3deg)', opacity: 1, offset: 0.45 },
      { transform: 'translateY(110px) rotate(-9deg)', opacity: 0 },
    ],
    { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.8, 0.5)' },
  ).finished;
  $('talon').hidden = true;
}

async function canjear() {
  const vale = abierto;
  fijarOcupado(true);
  $('detalle-error').textContent = '';
  try {
    const { codigo, cuerpo } = await pedir({ accion: 'canjear', id: vale.id, nombre: nombreDe(vale) });
    if (codigo === 403) {
      $('detalle-error').textContent = ENLACE_MALO;
      return;
    }
    if (codigo !== 200 && codigo !== 409) {
      $('detalle-error').textContent = SIN_RED;
      return;
    }
    canjes = { ...canjes, [vale.id]: cuerpo.canje };
    almacen.guardar('canjes', canjes);
    pintar();
    $('hoja').dataset.color = colorDe(vale);
    $('detalle-nombre').textContent = nombreDe(vale);
    $('detalle-campo').hidden = true;
    $('detalle-texto').hidden = Boolean(vale.enBlanco);
    $('detalle-hecho').textContent = codigo === 200
      ? 'Aviso enviado. Ya no hay marcha atrás.'
      : `Este vale ya estaba canjeado el ${fechaLegible(cuerpo.canje.fecha)}.`;
    await arrancarTalon();
  } catch {
    $('detalle-error').textContent = SIN_RED;
  } finally {
    fijarOcupado(false);
  }
}

$('acertijo').addEventListener('submit', alEnviar);
$('reintentar').addEventListener('click', cargarCanjes);
$('canjear').addEventListener('click', pedirConfirmacion);
$('confirmar-si').addEventListener('click', canjear);
$('confirmar-no').addEventListener('click', () => {
  $('confirmar').hidden = true;
  $('canjear').hidden = false;
  $('canjear').focus();
});
$('cerrar').addEventListener('click', cerrar);
$('detalle').addEventListener('click', (evento) => {
  if (evento.target === $('detalle')) cerrar();
});
$('detalle').addEventListener('cancel', (evento) => {
  evento.preventDefault();
  cerrar();
});
$('detalle').addEventListener('close', () => {
  const id = abierto?.id;
  abierto = null;
  pintar();
  document.querySelector(`[data-id="${id}"]`)?.focus({ preventScroll: true });
});
$('detalle-entrada').addEventListener('input', (evento) => {
  const texto = evento.target.value.trim();
  if (texto) borradores[abierto.id] = texto;
  else delete borradores[abierto.id];
  almacen.guardar('borradores', borradores);
  $('detalle-nombre').textContent = nombreDe(abierto);
});
addEventListener('popstate', () => {
  if ($('detalle').open) $('detalle').close();
});

sincronizarAciertos();
pintar();
cargarCanjes();
