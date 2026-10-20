# BRAND: Ni Idea

## 1. Material y Origen Visual
La paleta proviene de objetos fisicos de juego de mesa nocturno: fieltro verde esmeralda de mesa de ruleta, dados marfil pulido, peones y fichas carmesi sobre el chasis oscuro del portafolio feliperiquel.me.

## 2. Tokens de Color (Bloqueados)
- **Canvas / Background**: `#030712` (negro tecnico profundo)
- **Surface / Fieltro**: `#061814` (verde bosque profundo)
- **Surface Raised / Card**: `#0B241E` (fieltro elevado)
- **Border Subtle**: `#064E3B` (verde esmeralda oscuro, 20% a 40% opacidad)
- **Border Focus / Glow**: `#10B981` (resplandor esmeralda de ruleta)
- **Accent Primary**: `#10B981` (esmeralda mesa de juego)
- **Text on Accent**: `#022C22` (verde tinta profundo de alto contraste, 11.2:1 WCAG AAA)
- **Accent Secondary / Alerta**: `#F43F5E` (carmesi de naipe y ruleta)
- **Text on Secondary**: `#FFFFFF` (blanco puro)
- **Text Primary**: `#F8FAFC` (blanco marfil de dado)
- **Text Muted**: `#94A3B8` (gris tecnico sin deslumbramiento)

Cero sustituciones por paletas genericas de Tailwind o frameworks.

## 3. Tipografia y Escala
- **Display Font**: Space Grotesk (pesos 700 y 800)
- **Body Font**: Inter (pesos 400, 500 y 600)
- **Mono / Codigos de Sala**: Fira Code (pesos 500 y 700)

### Escala de Tamanos
- **Titulo de Consola**: 2.5rem a 3.5rem (Space Grotesk, letter-spacing: -0.03em)
- **Codigo PIN de Sala**: 2rem a 2.75rem (Fira Code, letter-spacing: 0.25em, mayusculas forzadas)
- **Bajada / Soporte**: 1rem a 1.125rem (Inter, letter-spacing: -0.01em)
- **Etiquetas y Metadatos**: 0.75rem (Fira Code, letter-spacing: 0.05em, uppercase)

## 4. Forma, Composicion y Fondo
- **Forma del sitio**: Una sola vista fija sin scroll (one viewport game console).
- **Elemento que carga la pagina**: La estructura de consola de juego centralizada.
- **Composicion en una frase**: Panel central de operaciones suspendido con ranura para codigo de sala de cuatro caracteres y selector doble anfitrion/invitado flanqueado por marcas de agua tecnicas de ruleta y cartas de juego.
- **Margenes de borde (Gutter)**: 16px en movil menor a 640px; 32px en escritorio.
- **Tratamiento de Fondo y Superficie Tecnica**:
  - **Grid de Papel Milimetrico**: Cuadricula base de 28px con lineas finas de 0.5px en tono esmeralda/gris tecnico (`opacity: 0.05`).
  - **Efecto Linterna / Spotlight Interactivo**: Capa superior de grid reactiva al cursor que sigue las variables `--mouse-x` y `--mouse-y` con una mascara radial (`mask-image: radial-gradient(380px circle at var(--mouse-x) var(--mouse-y), black 20%, rgba(0,0,0,0.3) 65%, transparent 100%)`).
  - **Marcas de Agua Blueprints (1px Stroke)**: Ilustraciones tecnicas perimetrales de una ruleta de casino seccionada y dados isometricos en trazo fino (opacidad 0.07 a 0.20 al interactuar), asegurando un fondo denso y poblado sin perjudicar la legibilidad.

## 5. Elemento Caracteristico (Signature Element)
- **Que es**: El cajetin de sala con cuatro ranuras de caracteres en monospaciado (`_ _ _ _`), con cursor pulsante y borde esmeralda que se ilumina al completar el codigo valido.
- **Donde vive**: Centro de la consola de juego.
- **En movil (375px)**: El teclado virtual activa solo caracteres mayusculos alfanumericos y salta automaticamente de ranura.
- **Con prefers-reduced-motion**: El foco es un borde verde solido de 2px sin animacion pulsante.

## 6. Inventario de Interaccion y Movimiento
- **Entrada a la pagina**: Fundido de opacidad suave de 200ms sobre la consola central.
- **Boton Crear Sala**:
  - Reposo: Fondo gradiente esmeralda a verde azulado con texto verde tinta.
  - Hover: Elevacion de -1px y sombra suave `shadow-[0_0_20px_rgba(16,185,129,0.3)]`.
  - Active: Escala 0.98.
- **Boton Unirse**:
  - Reposo: Fondo `#061814` con borde `#064E3B` y texto marfil.
  - Hover: Borde `#10B981` y texto blanco.
- **Curva de transicion unica**: `cubic-bezier(0.16, 1, 0.3, 1)` con duracion de 140ms.
- Cero animaciones con scroll, cero librerias pesadas de motion.

## 7. Reglas de Puntuacion
Prohibido el uso de rayas em y rayas en en cualquier texto o etiqueta. Usar puntos, comas o dos puntos.
