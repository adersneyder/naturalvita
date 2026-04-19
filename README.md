# NaturalVita

Tienda online de productos naturales en Colombia.

## Stack técnico

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** para estilos
- **Supabase** para base de datos, autenticación y storage
- **Bold** para procesamiento de pagos (Colombia)
- **Claude API** para chatbot de asesoría
- **Klaviyo** para email marketing y flujos de retención
- **Vercel** para hosting y despliegue continuo

## Estructura

```
naturalvita/
├── app/                    # Páginas y layouts (App Router)
│   ├── globals.css         # Estilos globales + tema Tailwind
│   ├── layout.tsx          # Layout raíz con SEO
│   └── page.tsx            # Home
├── lib/
│   └── supabase/           # Clientes de Supabase
│       ├── client.ts       # Cliente para componentes browser
│       └── server.ts       # Cliente para Server Components
├── .env.local.example      # Plantilla de variables de entorno
└── package.json
```

## Configuración local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Copiar variables de entorno:
   ```bash
   cp .env.local.example .env.local
   ```

3. Rellenar valores reales en `.env.local`.

4. Correr en desarrollo:
   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Despliegue

Conectado a Vercel — cada push a `main` despliega automáticamente.

## Roadmap

- [x] Setup inicial Next.js + Tailwind
- [ ] Schema de base de datos en Supabase (productos, usuarios, carritos)
- [ ] Scraper de laboratorios proveedores
- [ ] Catálogo y página de producto
- [ ] Carrito y checkout con Bold
- [ ] Chatbot con Claude API
- [ ] Flujos de email con Klaviyo
- [ ] SEO técnico y schema.org
