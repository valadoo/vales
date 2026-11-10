# Vales

Web móvil de vales en forma de ticket. Se desbloquean con acertijos en cadena y cada uno se canjea una sola vez, avisando por correo.

- `docs/`: la web que publica GitHub Pages.
- `google/canjear.gs`: plantilla del script de Google que guarda los canjes y envía el correo.
- `privado/`: preguntas, respuestas, clave, tu correo y el código ya rellenado para Google. Git la ignora y solo está en este ordenador: no la borres.

## Probar en local

```bash
npm run probar
```

```bash
npm run servidor
```

Luego abre `http://localhost:4323/#k=prueba`. Los correos salen por la consola, no se envía ninguno de verdad.

## Cambiar preguntas o textos

Edita `privado/contenido.json`. Da igual si la respuesta lleva mayúsculas o tildes, o si empieza por «el», «la» o «en». Cada acertijo puede ser de uno de estos tipos:

- `respuestas`: hay que escribir la frase exacta. Pon todas las formas válidas.
- `contiene`: vale cualquier frase que incluya una de esas palabras.
- `opciones` con `respuestas`: botones para elegir.
- `fechas` con `respuestas`: día y mes para cada nombre. La respuesta se escribe como `12 diciembre 13 agosto`, en el mismo orden que los nombres.

Después ejecuta:

```bash
npm run preparar
```

Ese comando genera `docs/contenido.js` y `privado/codigo-para-google.gs`, avisa de lo que falta por rellenar y muestra el enlace para ella.

Si añades o quitas vales o acertijos, tienes que volver a pegar `privado/codigo-para-google.gs` en Google y desplegar una versión nueva, como se explica en «Actualizar el script de Google».

## Publicar

### 1. Script de Google

1. Abre https://script.google.com/create con tu cuenta de Google.
2. Borra lo que haya y pega el contenido de `privado/codigo-para-google.gs`. Guarda.
3. Ve a Implementar > Nueva implementación, tipo **Aplicación web**. Ejecutar como **Yo** y acceso **Cualquier usuario**.
4. Autoriza el script. Google avisará de que la aplicación no está verificada porque es tuya: entra en Configuración avanzada y continúa.
5. Copia la URL de la aplicación web. Termina en `/exec`.

### Actualizar el script de Google

1. Ejecuta `npm run preparar`.
2. En el proyecto de Apps Script, borra el código, pega el nuevo contenido de `privado/codigo-para-google.gs` y guarda.
3. Ve a Implementar > Gestionar implementaciones, pulsa el lápiz, elige Versión **Nueva versión** e Implementar.

Así la URL no cambia. Con Nueva implementación saldría otra URL, y habría que ponerla en `api` y volver a subir la web.

### 2. GitHub Pages

1. Crea en github.com un repositorio público llamado `vales`, vacío.
2. En `privado/contenido.json`, rellena `api` con la URL de Google y `web` con `https://TU-USUARIO.github.io/vales/`.
3. Ejecuta `npm run preparar` y sube el proyecto.
4. En el repositorio, ve a Settings > Pages y elige Deploy from a branch, rama `main`, carpeta `/docs`.

### 3. Prueba real antes de dárselo

Abre el enlace en una ventana privada del móvil y canjea un vale. Debe llegarte el correo. Para dejar ese vale disponible otra vez, en el proyecto de Apps Script ve a Configuración del proyecto > Propiedades del script y borra la propiedad `canje:` de ese vale.

Las preguntas acertadas también se guardan ahí, en la propiedad `aciertos`, para que no se pierdan aunque el móvil borre los datos de la web o ella abra el enlace en otro navegador. Las comparten todos los móviles que abran su enlace. Si lo pruebas en el tuyo, lo que aciertes le contará a ella. Para que vuelva a empezar las preguntas, borra `aciertos`.

## Límites

- Google permite 100 correos al día con una cuenta personal, de sobra para esto. El script nunca envía más de un correo por vale.
- El repositorio es público: cualquiera con la dirección puede leer los vales, las preguntas y las opciones de los botones. Las respuestas escritas no se leen a simple vista, y tu correo y la clave solo están en Google y en `privado/`.
