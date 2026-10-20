# Ni Idea

Trivia rápida, dibujos dudosos y votaciones para delatar a tus amigos.

Consola de party game multijugador en tiempo real construida con **Astro**, **TypeScript**, **Tailwind CSS** y **PartyKit (Cloudflare Durable Objects)**. Cero cuentas de usuario, cero anuncios, cero paywalls y cero descargas.

---

## 1. Caracteristicas del MVP (v1)

- **Salas Instantaneas de 4 Caracteres**: El anfitrion crea la sala en un clic y proyecta el codigo PIN de cuatro letras/numeros en pantalla; hasta 16 jugadores entran desde su celular o navegador.
- **Ciclo de Partida con Ruleta de Modos**:
  1. **Trivia Rush**: Preguntas de 4 alternativas con reloj de 15 segundos, bonus de velocidad y multiplicador de rachas.
  2. **Ese Eres Tu (That's You)**: Votacion secreta donde las opciones son los nombres de los amigos en la sala.
  3. **Pinturillo**: Lienzo vectorial tactil con muestreo a 30 Hz (lotes cada 33 ms con coordenadas normalizadas de 0 a 1000) y adivinanzas en vivo.
- **Salvaguardas de Arquitectura (MAGI Shield)**:
  - **Watchdog Anti-AFK (15s)**: Si el jugador de turno no gira la ruleta o no inicia su trazo en 15 segundos, el servidor ejecuta `auto-spin` / `auto-skip` automatico mediante alarmas del servidor.
  - **Reconexion Transparente por `sessionToken`**: Recargar la pestaña reasocia al jugador a su asiento y preserva su puntaje sin duplicar participantes.
  - **Proyeccion Asimetrica Anti-Trampas**: El indice de respuesta correcta y la palabra secreta de Pinturillo nunca viajan a los sockets de los adivinadores antes de concluir la ronda.

---

## 2. 🐳 Ejecucion con Docker (1-Click Run)

Cualquier persona puede clonar y ejecutar tanto la consola web como el servidor WebSocket en tiempo real con un solo comando:

```bash
git clone https://github.com/Pipin333/niideaapp.git
cd niideaapp
cp .env.example .env
docker compose up --build
```

Una vez iniciado el contenedor, abre la consola en:
- **URL Local**: `http://localhost:4321`
- **Healthcheck**: `http://localhost:4321/health`

---

## 3. Desarrollo Local y Pruebas

### Requisitos
- Node.js 20+ y npm

### Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (Frontend Astro + PartyHub WebSocket integrado en :4321)
npm run dev

# Ejecutar suite de pruebas unitarias e invariantes (Vitest)
npm test

# Compilar para produccion
npm run build

# Ejecutar servidor de produccion unificado
npm start

# Desplegar actor WebSocket en Cloudflare PartyKit
npm run party:deploy
```

---

## 4. Estructura del Proyecto

- `src/domain/room-types.ts`: Contratos de dominio, comandos y proyeccion asimetrica.
- `src/domain/question-bank.ts`: Banco curado de preguntas de Trivia, premisas sociales y palabras de dibujo.
- `src/domain/room-engine.ts`: Motor determinista de partida (`RoomMatchEngine`).
- `party/server.ts`: Actor Durable Object para despliegue en Cloudflare PartyKit.
- `src/server/room-hub.ts`: Hub WebSocket compatible con `PartySocket` para ejecucion local y Docker sin depender de cuentas externas.
- `src/pages/index.astro`: Consola de juego fija en un solo viewport (Direccion B: Fieltro Nocturno).
- `GLOSSARY.md`: Glosario de lenguaje ubicuo (DDD).
- `docs/adr/0001-asymmetric-state-and-durable-objects.md`: Registro de decision de arquitectura.
