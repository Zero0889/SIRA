# Alertas SMS de SIRA

SIRA integra **SMS Gateway for Android** como proveedor opcional. Un teléfono Android recibe las solicitudes del backend y envía SMS normales mediante la SIM instalada. La integración comienza desactivada: instalar o iniciar SIRA no envía mensajes ni genera consumo.

## Requisitos

- Android 5 o posterior con la aplicación [SMS Gateway for Android](https://github.com/capcom6/android-sms-gateway).
- Permiso para enviar SMS, una SIM habilitada y cobertura celular.
- El destinatario en formato E.164: `+`, código de país y número sin espacios; por ejemplo, `+51...`.
- En Android, desactivar la optimización de batería para la aplicación y mantener el gateway en estado **Online**.

## Elegir un modo

### Local: recomendado si están en el mismo lugar

No requiere Internet. La computadora de SIRA y el Android deben compartir la misma red Wi-Fi o hotspot.

1. En la aplicación activa **Local Server** y pulsa **Offline** para dejarlo **Online**.
2. Copia la IP local, el usuario y la contraseña mostrados por la aplicación.
3. Configura `.env`:

```dotenv
SMS_PROVIDER=smsgate
SMSGATE_MODE=local
SMSGATE_BASE_URL=http://192.168.1.40:8080
SMSGATE_USERNAME=usuario_mostrado_en_android
SMSGATE_PASSWORD=contrasena_mostrada_en_android
SMSGATE_SIM_NUMBER=
SMS_TO=+51NUMERO_DESTINATARIO
```

La dirección es un ejemplo: utiliza exactamente la IP que muestra tu Android. No agregues `/message`; SIRA construye esa ruta automáticamente.

### Cloud: recomendado si el Android está lejos

La computadora y el Android pueden estar en redes o ciudades distintas, pero ambos necesitan Internet.

1. En la aplicación activa **Cloud Server** y déjalo **Online**.
2. Copia el usuario y la contraseña generados en la sección Cloud Server.
3. Configura `.env`:

```dotenv
SMS_PROVIDER=smsgate
SMSGATE_MODE=cloud
SMSGATE_BASE_URL=
SMSGATE_USERNAME=usuario_mostrado_en_android
SMSGATE_PASSWORD=contrasena_mostrada_en_android
SMSGATE_SIM_NUMBER=
SMS_TO=+51NUMERO_DESTINATARIO
```

Cuando la URL queda vacía, SIRA utiliza `https://api.sms-gate.app`. También se admite un servidor cloud compatible indicando su URL base.

### Private: despliegues administrados

Para un servidor SMSGate propio usa `SMSGATE_MODE=private` y coloca su origen HTTPS en `SMSGATE_BASE_URL`, por ejemplo `https://sms.example.com`. SIRA agrega automáticamente `/api/3rdparty/v1/messages`. Este modo requiere desplegar y mantener la infraestructura privada descrita por el proyecto SMSGate.

## Opciones comunes

Agrega o conserva estas variables en `.env`:

```dotenv
SMS_COOLDOWN_MINUTES=60
SMS_NOTIFY_IRRIGATION=true
SMS_NOTIFY_FROST=true
SMS_NOTIFY_TANK_LOW=true
```

`SMSGATE_SIM_NUMBER` es opcional. Usa `1`, `2` o `3` solamente cuando quieras seleccionar una SIM concreta; vacío utiliza la predeterminada del Android.

Reinicia SIRA después de cambiar `.env`.

## Verificación

1. Abre `http://localhost:3000/configuracion` y comprueba que aparezca **Listo para enviar**.
2. Abre `http://localhost:8000/docs`.
3. Ejecuta `POST /notifications/test` e introduce el valor de `INGEST_API_KEY` en la cabecera `X-API-Key`.
4. Revisa `GET /notifications/history`. Los números aparecen enmascarados y las credenciales nunca salen del backend.

## Eventos y protección contra repetición

SIRA puede avisar cuando recomienda riego, detecta una temperatura de 3 °C o menos, o encuentra el tanque por debajo del 15 %. El servidor guarda cada intento en SQLite y aplica un tiempo de espera por evento y parcela para reducir mensajes duplicados.

## Seguridad y límites

- Local Server usa autenticación Basic y HTTP dentro de la red local. No publiques su puerto en Internet; utiliza una red privada de confianza.
- Cloud Server viaja por HTTPS, pero depende de Internet y del servidor público de SMSGate.
- Usuario, contraseña y `INGEST_API_KEY` deben permanecer solamente en `.env` y nunca en el frontend o en capturas compartidas.
- El costo y los límites del SMS dependen de tu operador y del plan de la SIM.
- Obtén consentimiento del destinatario. No uses este sistema para campañas ni como único canal de una emergencia humana.

Referencias oficiales: [modo local](https://docs.sms-gate.app/getting-started/local-server/), [modo cloud](https://docs.sms-gate.app/getting-started/public-cloud-server/), [API de envío](https://docs.sms-gate.app/features/sending-messages/) y [código fuente](https://github.com/capcom6/android-sms-gateway).
