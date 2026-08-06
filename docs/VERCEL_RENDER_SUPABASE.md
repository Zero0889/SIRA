# Despliegue de SIRA con Vercel, Render y Supabase

Esta es la arquitectura preparada para la demostración web de SIRA:

- **Vercel** publica `frontend/` (Next.js).
- **Render** publica `backend/` (FastAPI mediante Docker).
- **Supabase** proporciona PostgreSQL administrado.

Las credenciales nunca deben escribirse en Git ni colocarse en variables cuyo
nombre empiece con `NEXT_PUBLIC_`.

## 1. Supabase

El backend usa el **Session pooler** de Supavisor en el puerto 5432, apropiado
para una conexión persistente desde Render. La variable de Render debe tener el
siguiente formato, sustituyendo únicamente `PASSWORD`:

```text
postgresql://postgres.prumlwdpognqptkhfrsl:PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```

Configura además `DATABASE_SSL_REQUIRE=true`. Alembic crea el esquema y el
contenedor carga el catálogo de cultivos de manera idempotente antes de iniciar
la API. Las tablas de SIRA tienen RLS y no conceden acceso directo a los roles
`anon` o `authenticated`; toda operación pasa por FastAPI.

## 2. Render

1. Conecta la cuenta de GitHub que contiene SIRA.
2. Crea un Blueprint y selecciona el `render.yaml` de la raíz.
3. Completa las variables marcadas como manuales:
   - `DATABASE_URL`: URL del Session pooler indicada arriba.
   - `CORS_ORIGINS`: primero la URL de Vercel, por ejemplo
     `https://sira.vercel.app`.
   - `BOOTSTRAP_ADMIN_EMAIL`: correo inicial del administrador.
   - `BOOTSTRAP_ADMIN_PASSWORD`: contraseña larga y única.
4. Conserva `ALLOW_LEGACY_DEVICE_KEY=false`.
5. Verifica `https://TU-SERVICIO.onrender.com/health`.

Render genera `APP_SECRET_KEY` automáticamente mediante `render.yaml`. No
copies esa clave al frontend.

## 3. Vercel

1. Importa el mismo repositorio.
2. Selecciona `frontend` como **Root Directory**.
3. Añade la variable de entorno:

```text
BACKEND_INTERNAL_URL=https://TU-SERVICIO.onrender.com
```

4. Despliega y copia la URL final.
5. Regresa a Render y define `CORS_ORIGINS` con esa URL exacta, sin barra final.

El frontend llama a rutas `/api/*`; Next.js las reenvía a Render. Así la URL de
Supabase y los secretos permanecen únicamente en el servidor.

## 4. Comprobaciones posteriores

- abrir `/api/health` desde la URL de Vercel;
- registrar o iniciar sesión con una cuenta de prueba;
- crear una parcela y copiar sus credenciales de dispositivo;
- enviar una lectura simulada y confirmar que aparece en el panel;
- probar una orden manual sin conectar una bomba real;
- revisar logs de Render y los asesores de seguridad/rendimiento de Supabase.

Para una bomba real no dependas solamente de la nube: conserva temporizador
máximo, parada local, sensor de tanque y un interruptor físico de emergencia.
