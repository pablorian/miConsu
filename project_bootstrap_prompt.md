# Prompt para Iniciar Nuevo Proyecto (Stack "PrianCo")

Copia y pega el siguiente prompt para iniciar un nuevo proyecto con Antigravity o tu asistente de IA.
Solo necesitas reemplazar `[NOMBRE_DEL_PROYECTO]` y `[TEMATICA]`.

---

**Prompt:**

Actúa como un arquitecto de software experto y desarrollador full-stack. Quiero que inicies un nuevo proyecto Monorepo utilizando **Turborepo** llamado `[NOMBRE_DEL_PROYECTO]`.

La temática del proyecto es: **[TEMATICA]**.

### Stack Tecnológico (Obligatorio)
Utiliza exactamente estas tecnologías y versiones (basadas en un proyecto de referencia exitoso "miConsu"):

1.  **Framework**: Next.js 15+ (App Router).
2.  **Lenguaje**: TypeScript.
3.  **Estilos**: **Tailwind CSS v4** (Usando `@tailwindcss/postcss`).
    *   Diseño visual: Estilo "TailAdmin". Premium, limpio, con glassmorphism, bordes sutiles y soporte nativo para Dark Mode.
    *   **Importante**: Usa variables CSS nativas para el theming en `globals.css`.
4.  **Autenticación**:
    *   Provider: **WorkOS** (usando `@workos-inc/node`).
    *   Sesión: JWT custom almacenado en cookies httpOnly, gestionado con la librería `jose` (Edge compatible).
5.  **Base de Datos**:
    *   MongoDB (Atlas).
    *   ORM: **Mongoose** (`^9.0.0`).
    *   Estructura: Paquete compartido `@repo/database`.
6.  **Internacionalización**: `next-intl` (Soporte inicial: Español e Inglés).

### Estructura del Proyecto

Quiero que configures la siguiente arquitectura:

*   `apps/web`: Aplicación Next.js principal.
*   `packages/database`: Lógica de conexión a MongoDB y modelos de Mongoose (Schemas).
*   `packages/ui` (Opcional): Componentes compartidos si es necesario.

### Requerimientos Funcionales Clave

1.  **Página de Login (`/login`)**:
    *   Diseño split-screen: Mitad izquierda con visuales/branding (color sólido o imagen) y cita testimonial. Mitad derecha con el formulario.
    *   **Responsive**: En móvil, el formulario debe ocupar toda la pantalla (`min-h-screen`) y estar centrado verticalmente. El logo debe aparecer pequeño en el footer.
    *   Botón "Iniciar sesión con Google" (WorkOS).
    *   Footer simple con enlaces a términos y privacidad.

2.  **Dashboard (`/dashboard`)**:
    *   Layout protegido por Middleware.
    *   **Sidebar**: Navegación lateral fija (desktop) y colapsable (móvil). Debe mostrar el perfil del usuario (Avatar/Iniciales) en la parte inferior con un menú desplegable de "Logout".
    *   **Header**: Barra superior sticky con botón de menú hamburguesa (móvil) y selector de idioma.
    *   **Loading State**: Implementar skeletons (esqueletos de carga) para las tablas y tarjetas mientras se obtienen los datos.

3.  **Middleware & Auth Guards**:
    *   Crear `middleware.ts` en la raíz de `apps/web`.
    *   Lógica de protección:
        *   Si no hay token -> Redirigir a `/login`.
        *   Si hay token y intenta ir a `/login` -> Redirigir a `/dashboard`.
    *   Manejo de internacionalización con `next-intl`.

4.  **Estética**:
    *   Usa una paleta de colores profesional. Sugerencia: Azules `blue-600` para acciones primarias, `zinc-900` para fondos oscuros.
    *   Asegura que todos los inputs, botones y tarjetas tengan `rounded-xl` y sombras suaves (`shadow-sm` a `shadow-md`).

### Instrucciones de Ejecución Paso a Paso

1.  Inicializa el monorepo.
2.  Configura las dependencias clave (`mongoose`, `jose`, `next-intl`, `@workos-inc/node`).
3.  Crea la conexión a BDD en `packages/database`.
4.  Implementa las utilidades de sesión (`lib/session.ts` con `jose`) para crear y verificar JWTs.
5.  Configura el Middleware.
6.  Desarrolla las páginas de Login y el Layout del Dashboard basándote en la temática **[TEMATICA]**.

---
