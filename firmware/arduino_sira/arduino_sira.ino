/*
 * SIRA - Firmware para Arduino Uno en Proteus
 *
 * Conserva las lecturas directas del circuito probado por el usuario y
 * agrega un control seguro del rele para recibir ordenes desde SIRA.
 */

#include <DHT.h>

// --- Pines del circuito de Proteus ---
#define PIN_DHT       4
#define PIN_SUELO     A0
#define PIN_TRIG      10
#define PIN_ECHO      9
#define PIN_LLUVIA    3
#define PIN_RELE      8

// --- Configuracion ---
#define DHT_TIPO      DHT11
#define INTERVALO_MS  5000UL  // Enviar una lectura cada 5 segundos

// El modulo de rele usado en Proteus se activa con nivel bajo.
// Si otro modelo trabaja al contrario, basta cambiar LOW por HIGH.
#define RELE_ACTIVO_EN LOW
#define RELE_APAGADO_EN ((RELE_ACTIVO_EN == LOW) ? HIGH : LOW)

DHT dht(PIN_DHT, DHT_TIPO);

unsigned long ultimoEnvio = 0;
unsigned long inicioRiegoMs = 0;
unsigned long duracionRiegoMs = 0;
bool riegoActivo = false;

void encenderBomba();
void apagarBomba(bool informar);
void actualizarBomba();
void enviarLecturaJSON();
void procesarComando();

void setup() {
  Serial.begin(9600);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LLUVIA, INPUT);

  // Fijar primero el estado apagado evita un pulso al iniciar el Arduino.
  digitalWrite(PIN_RELE, RELE_APAGADO_EN);
  pinMode(PIN_RELE, OUTPUT);

  dht.begin();

  Serial.println(F("=========================================="));
  Serial.println(F("# SIRA Firmware Arduino Inicializado OK   #"));
  Serial.println(F("=========================================="));
}

void loop() {
  // Procesar primero las ordenes para que el motor responda inmediatamente.
  if (Serial.available() > 0) {
    procesarComando();
  }

  actualizarBomba();

  if (millis() - ultimoEnvio >= INTERVALO_MS) {
    ultimoEnvio = millis();
    enviarLecturaJSON();
  }
}

void encenderBomba() {
  digitalWrite(PIN_RELE, RELE_ACTIVO_EN);
  riegoActivo = true;
  inicioRiegoMs = millis();
}

void apagarBomba(bool informar) {
  digitalWrite(PIN_RELE, RELE_APAGADO_EN);
  riegoActivo = false;
  inicioRiegoMs = 0;
  duracionRiegoMs = 0;

  if (informar) {
    Serial.println(F("# Riego completado"));
  }
}

void actualizarBomba() {
  // Esta resta sigue funcionando aunque millis() se desborde.
  if (riegoActivo && millis() - inicioRiegoMs >= duracionRiegoMs) {
    apagarBomba(true);
  }
}

void enviarLecturaJSON() {
  float temp = dht.readTemperature();
  float hr = dht.readHumidity();
  if (isnan(temp) || temp <= 0) temp = 22.0;
  if (isnan(hr) || hr <= 0) hr = 50.0;

  // Lectura directa usada por el componente de humedad en Proteus.
  int sueloRaw = analogRead(PIN_SUELO);
  int sueloPct = map(sueloRaw, 0, 1023, 0, 100);
  sueloPct = constrain(sueloPct, 0, 100);

  // HC-SR04: conserva el valor en cm mostrado por el modelo de Proteus.
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long duracion = pulseIn(PIN_ECHO, HIGH, 30000UL);
  int tanquePct = 0;
  if (duracion > 0) {
    float distCm = (duracion * 0.0343) / 2.0;
    tanquePct = constrain((int)round(distCm), 0, 100);
  }

  int lluvia = (digitalRead(PIN_LLUVIA) == HIGH) ? 1 : 0;

  Serial.print(F("{\"temp\":"));    Serial.print(temp, 1);
  Serial.print(F(",\"hr\":"));       Serial.print(hr, 1);
  Serial.print(F(",\"suelo\":"));    Serial.print(sueloPct);
  Serial.print(F(",\"tanque\":"));   Serial.print(tanquePct);
  Serial.print(F(",\"lluvia\":"));   Serial.print(lluvia);
  Serial.println(F("}"));
}

void procesarComando() {
  String orden = Serial.readStringUntil('\n');
  orden.trim();

  if (orden.startsWith("ACCION:REGAR:")) {
    int minutos = orden.substring(13).toInt();

    // Ignorar recomendaciones repetidas mientras el riego ya esta activo.
    // Asi cada lectura de SIRA no reinicia el tiempo del motor.
    if (minutos > 0 && !riegoActivo) {
      duracionRiegoMs = (unsigned long)minutos * 60000UL;
      encenderBomba();
      Serial.print(F("# OK regando "));
      Serial.print(minutos);
      Serial.println(F(" min"));
    }
  } else if (orden.startsWith("ACCION:ESPERAR:") ||
             orden.startsWith("ACCION:CANCELAR_POR_LLUVIA:") ||
             orden.startsWith("ACCION:TANQUE_BAJO:")) {
    // Una condicion de seguridad enviada por SIRA detiene el motor.
    if (riegoActivo) {
      apagarBomba(false);
      Serial.println(F("# Riego cancelado por SIRA"));
    }
  }
}
