# ADR 0001: Estado Uniproceso en Durable Objects y Proyeccion Asimetrica Anti-Trampas

- **Estado**: Aceptado
- **Fecha**: 2026-10-19

## Contexto
Un party game multijugador en tiempo real para hasta 16 personas en reuniones o videollamadas enfrenta tres problemas criticos:
1. Condiciones de carrera al puntuar respuestas simultaneas con bonus de milisegundos.
2. Bloqueos de partida cuando un jugador apaga la pantalla del telefono o pierde senal en medio de su turno.
3. Trampas triviales si el estado transmitido por WebSocket incluye la respuesta correcta de Trivia o la palabra secreta de Pinturillo.

## Alternativas Analizadas
1. **Base de datos relacional (PostgreSQL / Supabase Realtime)**: Introduce latencia de red por transaccion, requiere limpieza periodica de salas muertas y complica el ordenamiento sub-20ms.
2. ** Estado en cliente (P2P / Host-authoritative)**: Si el telefono del anfitrion se bloquea o cambia de app, toda la sala colapsa.
3. **Actor uniproceso por sala (PartyKit / Cloudflare Durable Objects) con motor de dominio determinista (`RoomMatchEngine`)**: Cada sala vive en memoria dentro de un unico hilo de ejecucion con alarmas programables y proyeccion diferenciada por socket.

## Decision
Adoptamos un motor de dominio puro (`RoomMatchEngine`) ejecutado dentro de un actor por sala (PartyKit en Cloudflare Edge y hub WebSocket homologo para ejecucion local/Docker):
1. **Proyeccion Asimetrica**: El servidor nunca emite el estado crudo. Genera una vista especifica por `Contender` donde `secretWord` solo es visible para el dibujante activo y `correctOptionIndex` permanece oculto hasta la fase de revelacion.
2. **Watchdog Anti-AFK de 15 segundos**: Cada fase interactiva registra un `watchdogDeadlineAt`. Si el jugador de turno no gira la ruleta o no inicia su dibujo en 15 segundos, el servidor ejecuta `auto-spin` o `auto-skip` sin depender del cliente.
3. **Reconexion por `sessionToken`**: El asiento del jugador se indexa por `sessionToken` efimero, permitiendo recargar el navegador sin perder puntos ni clonar jugadores.

## Consecuencias
- **Positivas**: Latencia minima en memoria (`O(1)`), cero costo de base de datos, inmunidad ante inspeccion de tramas en DevTools y tolerancia a desconexiones moviles.
- **Negativas**: El estado de una sala es efimero y se destruye cuando todos los jugadores abandonan la sesion, lo cual se alinea con la regla de negocio de cero cuentas y cero historiales permanentes.
