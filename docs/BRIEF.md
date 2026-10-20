# BUILD BRIEF: Ni Idea

## 1. Proyecto
- **Nombre**: Ni Idea
- **Creador**: Felipe Riquelme
- **Audiencia**: Grupos de amigos en reuniones presenciales, virtuales (Discord o videollamadas) y carretes que buscan jugar sin fricciones.
- **Registro de voz**: Informal pero sobrio. Directo, rapido, sin rodeos corporativos ni humor forzado.
- **Accion unica del usuario**: El anfitrion crea la sala y proyecta el codigo en pantalla grande; los invitados ingresan el codigo de cuatro letras desde su celular o navegador de escritorio.

## 2. Stack Tecnologico
- **Frontend**: Astro / TypeScript / Tailwind CSS (cliente ultraliviano sin descargas).
- **Tiempo Real y WebSockets**: PartyKit (Cloudflare Workers + Durable Objects) para latencia baja y escalabilidad a cero costo.
- **Persistencia Temporal**: Memoria en Durable Objects por sala de juego (sin base de datos pesada para el MVP).
- **Despliegue**: Vercel / Node (cliente web) + PartyKit Cloudflare (servidor WebSocket).

## 3. Contenido (Asignado por Ranuras)
- **Titulo**: Ni Idea
- **Bajada de soporte**: Trivia rápida, dibujos dudosos y votaciones para delatar a tus amigos.
- **Accion principal anfitrion**: Crear Sala (proyecta codigo de cuatro caracteres y abre el lobby).
- **Accion principal invitado**: Unirse a Sala (pide apodo y codigo de cuatro letras).
- **Bajo el pliegue**: Ninguno. Esta aplicacion es una consola de una sola vista fija sin scroll.
- **Regla estricta de copia**: Usar este texto palabra por palabra. Cero rayas em y cero rayas en en todo el codigo y metadatos.

## 4. Forma y Diseno
Ver especificacion completa y valores hexadecimales en `BRAND.md`.
- **Forma**: Consola de juego fija en una sola pantalla (one viewport, no scroll).
- **Paleta**: Fieltro nocturno. Esmeralda (#10B981), carmesi (#F43F5E) y negro tecnico (#030712).
- **Tipografias**: Space Grotesk (titulos), Inter (cuerpo), Fira Code (codigos de sala).
- **Textura de Fondo y Efectos**:
  - Grid de papel milimetrico o cuadriculado tecnico de 28px con opacidad sutil (0.05).
  - Linterna interactiva (spotlight) que revela el cuadrante tecnico bajo el cursor usando variables `--mouse-x` y `--mouse-y` con mascara radial.
  - Background poblado con planos tecnicos y marcas de agua de 1px (ruleta isometrica, dados y cartas) que dan densidad visual sin invadir la lectura.

## 5. Alcance Funcional del MVP (v1)
### Incluye
1. Generacion de sala con codigo de cuatro letras mayusculas.
2. Entrada inmediata por codigo y apodo temporal (hasta 16 jugadores), tanto desde moviles como desde escritorio.
3. Lobby con lista de jugadores conectados en vivo.
4. **Ciclo de Partida con Ruleta de Modos**: En cada ronda, los jugadores van rotando quien tira de la rueda para decidir el desafio:
   - **Modo Trivia**: Rondas de 4 opciones con temporizador decreciente y bonus de velocidad.
   - **Modo That's You (Preguntas para arruinar amistades)**: Premisas sociales del grupo donde las opciones son los nombres de los jugadores en la sala y todos votan en secreto.
   - **Modo Pinturillo (alcance acotado para MVP)**: Al jugador de turno le toca una palabra y un lienzo canvas tactil para dibujar trazos basicos; los demas ven el trazo en tiempo real y adivinan escribiendo.
5. Puntuacion en vivo al terminar cada ronda y podio final de sesion.
6. Boton de revancha inmediata en la misma sala sin necesidad de reconectar a los jugadores.

## 6. Salvaguardas Mandatorias de Arquitectura (MAGI Shield)
1. **Watchdog Anti-AFK con Alarma en el DO**: Si el jugador al que le toca girar la ruleta o dibujar no emite accion en 15 segundos (o se desconecta), el Durable Object ejecuta un `auto-skip` / `auto-spin` forzado mediante `storage.setAlarm()`. Jamas delegar el avance de estado al cliente.
2. **Reconexion Transparente por `sessionToken`**: El cliente guarda un UUID efimero en `sessionStorage`. Al recargar o reconectar el WebSocket, el DO reasocia la conexion al slot existente, preservando puntaje y apodo sin clonar jugadores fantasma.
3. **Serializacion Asimetrica Anti-Trampas**:
   - La palabra secreta de Pinturillo solo viaja al socket del dibujante activo.
   - En Trivia Rush y That's You, el servidor solo emite banderas `ha_respondido: true` para evitar que alguien abra las DevTools del navegador e inspeccione las respuestas antes de tiempo.
4. **Batching Vectorial en Pinturillo**: El canvas movil acumula trazos y los despacha en lotes compactos cada 33 ms (30 Hz) con coordenadas normalizadas de 0 a 1000.
