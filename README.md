Dashboard Café
Panel de ventas con inicio de sesión y permisos por usuario usando Supabase Auth y Row Level Security (RLS).
Publicación desde GitHub y Vercel
Sube el contenido de esta carpeta a la raíz de tu repositorio de GitHub.
En Vercel, abre el proyecto conectado al repositorio y espera el nuevo despliegue.
Conserva las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la URL del proyecto y la clave pública `anon`/publishable. Nunca uses `service_role` ni una secret key en el navegador.
Configurar Supabase (una sola vez)
Crea primero tu cuenta administradora en Authentication → Users → Add user.
Abre `supabase/schema.sql`.
Antes de ejecutarlo, reemplaza las dos apariciones de `TU_CORREO_ADMIN@EJEMPLO.COM` por el correo exacto de tu cuenta administradora.
En Supabase abre SQL Editor → New query, pega el contenido completo y pulsa Run.
El SQL crea perfiles, asigna tu cuenta el rol `admin`, asocia las ventas antiguas a tu cuenta y activa RLS. Las cuentas futuras se crean como `empleado`.
Si el SQL falla en la instrucción `user_id set not null`, revisa que hayas sustituido correctamente el correo del administrador y vuelve a ejecutar el script completo después de corregirlo.
Dar de alta empleados
En Supabase abre Authentication → Users → Add user → Create new user.
Escribe el correo del empleado y asigna una contraseña temporal segura; confirma el correo si la opción aparece.
El trigger de Supabase crea automáticamente su perfil con rol `empleado`.
Comparte sus credenciales de forma segura. El empleado entra en Dashboard Café con su correo y contraseña.
No asignes el rol `admin` a empleados desde el navegador. Solo el administrador debe modificar roles desde el SQL Editor.
Permisos
Administrador: puede consultar todas las ventas.
Empleado: solo puede consultar sus propias ventas.
Cualquier venta nueva queda asociada al usuario que inició sesión.
RLS aplica los permisos en la base de datos, no solamente en la interfaz.
Desarrollo local (opcional)
Requiere Node.js 20.9 o superior. Instala dependencias con `npm install`, configura `.env.local` a partir de `.env.example` y ejecuta `npm run dev`.
