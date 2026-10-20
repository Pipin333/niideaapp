# Glosario de Dominio (Ubiquitous Language)

Este glosario define los terminos canonicos del dominio de **Ni Idea** sin detalles de implementacion.

- **Room (Sala)**: Sesion efimera identificada por un codigo alfanumerico de cuatro caracteres donde se congregan hasta 16 jugadores.
- **Host (Anfitrion)**: Jugador que inaugura la sala y tiene potestad para iniciar la partida, agregar participantes de practica o disparar la revancha.
- **Contender (Contendiente)**: Participante conectado a una sala mediante un apodo temporal y un token de sesion efimero.
- **SessionToken (Token de Sesion)**: Identificador unico por pestaña que permite reasociar a un contendiente tras una desconexion sin duplicar su asiento ni perder su puntaje.
- **Roulette (Ruleta de Modos)**: Mecanismo rotativo mediante el cual el contendiente de turno selecciona al azar el desafio de la ronda actual.
- **TriviaChallenge (Desafio Trivia Rush)**: Ronda de cuatro alternativas a contrarreloj donde el puntaje escala segun la velocidad de respuesta y la racha acumulada.
- **SocialVote (Votacion Ese Eres Tu)**: Ronda de delacion grupal donde las alternativas son los propios contendientes de la sala y ganan quienes coinciden con la mayoria.
- **SketchRound (Ronda Pinturillo)**: Ronda donde un dibujante activo recibe una palabra secreta para trazar en el lienzo mientras el resto intenta adivinarla en tiempo real.
- **VectorBatch (Lote Vectorial)**: Secuencia compacta de coordenadas normalizadas de 0 a 1000 emitida por el dibujante a intervalos de 30 Hz.
- **Watchdog (Vigilante Anti-AFK)**: Regla de negocio que fuerza el giro de ruleta o el salto de turno cuando el jugador activo no actua dentro del umbral de 15 segundos.
- **AsymmetricProjection (Proyeccion Asimetrica)**: Vista del estado de la sala adaptada a cada contendiente para ocultar respuestas correctas o palabras secretas antes de la revelacion.
- **Podium (Podio)**: Clasificacion final de la partida con opcion de revancha inmediata en la misma sala.
