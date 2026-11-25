-- Dashboard Café: autenticación, perfiles y permisos por usuario.
-- Ejecuta este SQL DESPUÉS de crear tu usuario administrador en
-- Supabase > Authentication > Users.
-- Antes de ejecutar: reemplaza TU_CORREO_ADMIN@EJEMPLO.COM por el correo
-- exacto con el que creaste tu cuenta en Supabase.

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  rol text not null default 'empleado' check (rol in ('admin', 'empleado')),
  created_at timestamptz not null default now()
);

-- Los usuarios nuevos se crean siempre como empleados. El rol admin
-- solamente se asigna manualmente desde el SQL Editor de Supabase.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, rol)
  values (new.id, new.email, 'empleado')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario_perfil on auth.users;
create trigger al_crear_usuario_perfil
after insert on auth.users
for each row execute procedure public.crear_perfil_usuario();

-- Crea perfiles para usuarios que ya existían antes de instalar el trigger.
insert into public.perfiles (id, email, rol)
select id, email, 'empleado' from auth.users
on conflict (id) do update set email = excluded.email;

-- Convierte TU cuenta en administrador. Cambia el correo de ejemplo.
update public.perfiles
set rol = 'admin'
where lower(email) = lower('TU_CORREO_ADMIN@EJEMPLO.COM');

-- Añade el propietario de cada venta. Las ventas históricas sin propietario
-- se asignan a la cuenta administradora indicada arriba.
alter table public.ventas_cafe
  add column if not exists user_id uuid references auth.users(id);

update public.ventas_cafe
set user_id = (
  select id from auth.users
  where lower(email) = lower('TU_CORREO_ADMIN@EJEMPLO.COM')
  limit 1
)
where user_id is null;

-- Si esta instrucción falla, revisa que el correo anterior coincida
-- exactamente con el de Authentication > Users.
alter table public.ventas_cafe alter column user_id set not null;
alter table public.ventas_cafe alter column user_id set default auth.uid();

-- RLS: solamente usuarios autenticados pueden consultar o registrar ventas.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

alter table public.perfiles enable row level security;
alter table public.ventas_cafe enable row level security;

-- Elimina las políticas de demostración abiertas al público.
drop policy if exists "demo lectura ventas" on public.ventas_cafe;
drop policy if exists "demo insertar ventas" on public.ventas_cafe;
drop policy if exists "ventas lectura por usuario" on public.ventas_cafe;
drop policy if exists "ventas insertar propias" on public.ventas_cafe;
drop policy if exists "ventas actualizar propias o admin" on public.ventas_cafe;
drop policy if exists "ventas eliminar propias o admin" on public.ventas_cafe;
drop policy if exists "perfiles lectura propia o admin" on public.perfiles;

create policy "perfiles lectura propia o admin"
on public.perfiles for select
to authenticated
using (id = (select auth.uid()) or (select public.es_admin()));

create policy "ventas lectura por usuario"
on public.ventas_cafe for select
to authenticated
using (user_id = (select auth.uid()) or (select public.es_admin()));

create policy "ventas insertar propias"
on public.ventas_cafe for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "ventas actualizar propias o admin"
on public.ventas_cafe for update
to authenticated
using (user_id = (select auth.uid()) or (select public.es_admin()))
with check (user_id = (select auth.uid()) or (select public.es_admin()));

create policy "ventas eliminar propias o admin"
on public.ventas_cafe for delete
to authenticated
using (user_id = (select auth.uid()) or (select public.es_admin()));

grant select on public.perfiles to authenticated;
grant select, insert, update, delete on public.ventas_cafe to authenticated;

-- No otorgues acceso a anon. No uses nunca la clave service_role en el navegador.
