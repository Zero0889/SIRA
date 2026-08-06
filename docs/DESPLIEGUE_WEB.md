# Publicación web de SIRA

## Arquitectura productiva

La configuración incluida ejecuta cuatro servicios:

- **Caddy:** termina HTTPS y redirige el tráfico al frontend.
- **Next.js:** sirve el panel y reenvía `/api/*` al backend por la red privada.
- **FastAPI:** autentica usuarios y nodos, procesa telemetría y administra órdenes.
- **PostgreSQL:** conserva cuentas, parcelas, lecturas, credenciales y auditoría.

Los puertos del backend y de PostgreSQL no se publican hacia Internet. Los dispositivos usan la misma dirección web que los usuarios, por ejemplo `https://sira.ejemplo.com/api/ingest`.

## Requisitos

1. Un servidor con Docker y Docker Compose.
2. Un dominio cuyo registro DNS `A` apunte a la IP pública del servidor.
3. Puertos TCP 80 y 443 permitidos en el firewall.
4. Una copia de seguridad externa para el volumen de PostgreSQL.

## ¿Puede publicarse gratis?

Sí, para una demostración, un concurso o las primeras pruebas con pocos nodos. No se debe considerar una instalación gratuita como un sistema de riego productivo con disponibilidad garantizada.

### Ruta gratuita para demostración

- **Frontend:** Vercel Hobby, gratuito para uso personal y no comercial.
- **Backend:** Render Free. El servicio se suspende después de 15 minutos sin tráfico y puede tardar cerca de un minuto en reactivarse.
- **Base de datos:** Supabase Free, con PostgreSQL administrado y 500 MB de almacenamiento.
- **MQTT opcional:** HiveMQ Cloud Serverless, hasta 100 conexiones y 10 GB mensuales, sin garantía de disponibilidad.
- **Dirección web:** los subdominios entregados por Vercel y Render son gratuitos. Un dominio propio es opcional.

El firmware actual puede comunicarse por HTTPS y no necesita MQTT para funcionar. MQTT se incorpora cuando se requiera entrega en tiempo real o un número mayor de nodos.

### Ruta sin costo con servidor permanente

Oracle Cloud mantiene recursos Compute Always Free que permiten ejecutar la composición Docker completa. Esta alternativa se acerca más a la arquitectura incluida en el repositorio, pero requiere administrar Linux, firewall, actualizaciones y copias de seguridad. Oracle puede reclamar instancias inactivas y la capacidad gratuita no siempre está disponible en todas las regiones.

### Ruta recomendada para una bomba real

Usa un VPS que no se suspenda, PostgreSQL con copias de seguridad y un dominio con HTTPS. Mantén además las protecciones locales del firmware: temporizador máximo, parada física y estado seguro cuando se pierde Internet. La automatización no debe depender exclusivamente de que la nube esté disponible.

## Preparación

```bash
cp .env.production.example .env.production
```

Edita `.env.production`. Genera los secretos como cadenas hexadecimales para que también sean seguras dentro de la URL de conexión:

```bash
openssl rand -hex 32
```

No reutilices la contraseña del correo, dominio o servidor. `ALLOW_LEGACY_DEVICE_KEY` permanece deshabilitado en la composición productiva.

## Arranque

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

Caddy solicitará y renovará el certificado TLS cuando el dominio resuelva correctamente. El backend ejecuta `alembic upgrade head` antes de iniciar.

## Operación

```bash
# Logs
docker compose --env-file .env.production -f compose.production.yml logs -f --tail=100

# Copia lógica de PostgreSQL
docker compose --env-file .env.production -f compose.production.yml exec -T db \
  pg_dump -U sira -d sira > sira-backup.sql
```

Antes de activar una bomba real:

- instala contactor, relé y protecciones dimensionadas por un electricista;
- implementa un temporizador máximo y parada local en el firmware;
- verifica sensor de tanque y, de ser posible, sensor de caudal;
- prueba primero con la salida de bomba desconectada;
- conserva un interruptor físico de emergencia.

## Escalamiento

PostgreSQL permite varias cuentas y parcelas. Si aumenta el volumen de telemetría, se puede mover la base a un servicio administrado y añadir MQTT como transporte. La tabla de órdenes y las credenciales por nodo se conservan: MQTT solamente reemplaza la entrega por sondeo HTTP.
