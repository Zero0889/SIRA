import pytest
from pydantic import ValidationError

from app.schemas import IngestPayload


def test_payload_proteus_antiguo_sigue_siendo_valido():
    payload = IngestPayload(device_id="ARDUINO-PROTEUS-01", humedad_suelo_pct=42)
    assert payload.modo_conexion == "serial"
    assert payload.modo_operacion == "recomendacion"
    assert payload.simulado is True
    assert payload.bateria_pct is None


def test_telemetria_valida_limites_de_bateria():
    with pytest.raises(ValidationError):
        IngestPayload(device_id="SIRA-001", bateria_pct=120)

