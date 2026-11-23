# Dashboard Café

Panel inicial para registrar y consultar ventas de café en grano y molido.

## Requisitos
- Node.js 20.9 o superior
- Una cuenta/proyecto de Supabase
- Visual Studio Code (recomendado)

## 1. Instalar dependencias
Abre una terminal dentro de esta carpeta y ejecuta:

```bash
npm install
```

## 2. Configurar Supabase
1. Abre tu proyecto de Supabase.
2. Entra a SQL Editor y crea una consulta nueva.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. Copia la Project URL y la clave pública/publishable (NO uses `service_role` ni una secret key).

## 3. Configurar variables
En la raíz del proyecto, crea un archivo llamado `.env.local` y coloca:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICABLE
```

Puedes tomar como referencia `.env.example`. No subas `.env.local` a GitHub.

## 4. Ejecutar localmente

```bash
npm run dev
```

Abre http://localhost:3000

## 5. Publicar
Sube el proyecto a GitHub y luego impórtalo desde Vercel. En Vercel agrega las mismas variables de entorno que en `.env.local`.

## Importante sobre seguridad
El SQL incluido habilita políticas de demostración para que puedas probar la app sin iniciar sesión. No publiques datos reales con estas políticas. Antes de usar la app en producción, configura Supabase Auth, RLS por usuario y políticas que restrinjan cada registro a su propietario.

## Estructura

```text
dashboard-cafe/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase.ts
├── supabase/
│   └── schema.sql
├── types/
│   └── venta.ts
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
