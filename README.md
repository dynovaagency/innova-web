# Innova Trabajo Social — Web

Sitio institucional de **Innova Trabajo Social**, espacio de formación, supervisión y orientación para Trabajo Social y disciplinas sociales.

Rediseño integral del sitio actual (https://innovatrabajosocial.com.ar/), construido sobre stack moderno propio en lugar de la instalación heredada en WordPress.

---

## Stack

- **Vite 6** + **React 19** (JSX, sin TypeScript)
- **React Router 7** para navegación SPA
- **CSS Modules** + variables CSS para tokens de marca
- **ESLint 9** (flat config) + **Prettier**
- Node 22 (ver `.nvmrc`)

---

## Setup

> En Windows con nvm-windows, abrir el proyecto desde **PowerShell** o **CMD**, no desde Git Bash (Git Bash pierde el PATH de Node entre sesiones).

```bash
# Asegurarse de estar en Node 22
nvm use 22

# Instalar dependencias
npm install

# Levantar el servidor de desarrollo
npm run dev
```

Por defecto, el sitio queda disponible en `http://localhost:5173`.

### Otros scripts

```bash
npm run build         # Build de producción a /dist
npm run preview       # Servir el build de producción localmente
npm run lint          # Correr ESLint
npm run lint:fix      # Correr ESLint y autofixear lo que pueda
npm run format        # Formatear con Prettier
npm run format:check  # Verificar formato sin escribir
```

---

## Estructura

```
innova-web/
├── public/                       # Assets estáticos (favicon, etc.)
├── src/
│   ├── assets/                   # Imágenes y recursos importados por código
│   ├── components/
│   │   └── layout/               # Navbar, Footer, Layout (estructura común)
│   ├── lib/                      # Utilidades, helpers, hooks, llamadas a API
│   ├── pages/                    # Una por ruta (Home, Servicios, etc.)
│   └── styles/
│       ├── reset.css             # Reset moderno
│       ├── tokens.css            # Variables CSS (placeholder, esperan manual de marca)
│       └── global.css            # Estilos base aplicados a body, headings, etc.
├── index.html                    # Entry point
├── vite.config.js
├── eslint.config.js              # Flat config (ESLint 9)
└── package.json
```

---

## Rutas

| Ruta              | Componente       | Estado       |
| ----------------- | ---------------- | ------------ |
| `/`               | `Home`           | Placeholder  |
| `/quienes-somos`  | `QuienesSomos`   | Placeholder  |
| `/servicios`      | `Servicios`      | Placeholder  |
| `/orientacion`    | `Orientacion`    | Placeholder  |
| `/biblioteca`     | `Biblioteca`     | Placeholder  |
| `/contacto`       | `Contacto`       | Placeholder  |

Todas las páginas son placeholders mínimos hasta que llegue el diseño definitivo desde Figma y los tokens del manual de marca.

---

## Decisiones técnicas pendientes

Estas decisiones se tomarán antes del desarrollo de los componentes finales:

- **Sistema de gestión de contenido**: cómo edita el cliente el libro del mes, biblioteca, entrevistas. Opciones: panel admin custom, Decap CMS sobre el repo, headless CMS (Sanity/Strapi).
- **Backend y DB relacional**: cuándo y dónde se hostea Postgres + endpoints para formularios e inscripciones a cursos.
- **Proveedor de deploy**: Vercel, Netlify o Cloudflare Pages (a definir según costos y zona geográfica).
- **Tailwind sí/no**: actualmente CSS modular con variables. Si Sebastián lo prefiere cuando entregue el diseño final, se incorpora en ese momento.
- **Configuración de fuentes**: cargar desde Google Fonts o autohospedadas (preferible lo segundo por privacidad y performance).

---

## Próximos pasos

1. Recibir wireframe definitivo y manual de marca de Sebastián.
2. Reemplazar tokens placeholder por valores reales en `src/styles/tokens.css`.
3. Migrar repo a GitHub bajo la organización de la agencia.
4. Implementar componentes por sección, en orden de prioridad: Inicio → Quiénes somos → Servicios → Orientación → Biblioteca → Contacto.
5. Definir e implementar sistema de gestión de contenido.
6. Configurar deploy y migración de dominio.
