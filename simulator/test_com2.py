"""Test simple: lee bytes crudos de COM2 para verificar que llegan datos de Proteus."""
import serial
import time

print("Abriendo COM2 a 9600 baudios...")
ser = serial.Serial("COM2", 9600, timeout=1.0)
time.sleep(1)
ser.reset_input_buffer()

print("Esperando datos (30 segundos max)...")
print("Si no ves nada, el COMPIM de Proteus NO esta enviando datos a COM1.")
print("-" * 60)

inicio = time.time()
while time.time() - inicio < 30:
    # Leer lo que haya disponible
    waiting = ser.in_waiting
    if waiting > 0:
        data = ser.read(waiting)
        print(f"[RECIBIDO {waiting} bytes]: {data}")
        try:
            print(f"  -> Texto: {data.decode('utf-8', errors='replace')}")
        except:
            pass
    else:
        # Intentar readline
        line = ser.readline()
        if line:
            print(f"[LINEA]: {line.decode('utf-8', errors='replace').strip()}")

print("-" * 60)
print("Fin del test. No se recibieron mas datos.")
ser.close()
