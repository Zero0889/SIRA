import base64
import json
from types import SimpleNamespace

import httpx
import pytest

from app.services import notifications


def smsgate_settings(**overrides):
    values = {
        "sms_provider": "smsgate",
        "smsgate_mode": "local",
        "smsgate_base_url": "http://192.168.1.40:8080",
        "smsgate_username": "usuario-secreto",
        "smsgate_password": "clave-secreta",
        "smsgate_sim_number": None,
        "sms_to": "+51922222222",
        "sms_cooldown_minutes": 60,
        "sms_notify_irrigation": True,
        "sms_notify_frost": True,
        "sms_notify_tank_low": False,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_smsgate_payload_uses_official_fields_and_normalizes_message():
    payload = notifications.build_smsgate_payload(
        "+51922222222", "SIRA   mensaje\n de prueba", 2
    )
    assert payload == {
        "phoneNumbers": ["+51922222222"],
        "textMessage": {"text": "SIRA mensaje de prueba"},
        "simNumber": 2,
    }


def test_smsgate_payload_rejects_non_e164_number():
    with pytest.raises(ValueError):
        notifications.build_smsgate_payload("922222222", "Prueba")


@pytest.mark.parametrize(
    ("mode", "base_url", "expected"),
    [
        ("local", "http://192.168.1.40:8080", "http://192.168.1.40:8080/message"),
        ("cloud", "", "https://api.sms-gate.app/3rdparty/v1/messages"),
        (
            "private",
            "https://sms.example.com",
            "https://sms.example.com/api/3rdparty/v1/messages",
        ),
    ],
)
def test_smsgate_url_matches_official_modes(mode, base_url, expected):
    assert notifications.build_smsgate_url(mode, base_url) == expected


@pytest.mark.parametrize(
    ("mode", "base_url"),
    [
        ("unknown", "https://example.com"),
        ("local", ""),
        ("private", "ftp://example.com"),
        ("private", "https://user:password@example.com"),
    ],
)
def test_smsgate_url_rejects_invalid_configuration(mode, base_url):
    with pytest.raises(ValueError):
        notifications.build_smsgate_url(mode, base_url)


def test_sms_status_never_exposes_secrets_or_full_numbers(monkeypatch):
    settings = smsgate_settings()
    monkeypatch.setattr(notifications, "get_settings", lambda: settings)
    status = notifications.sms_status()
    serialized = str(status)

    assert status["state"] == "ready"
    assert status["configured"] is True
    assert status["mode"] == "local"
    assert "usuario-secreto" not in serialized
    assert "clave-secreta" not in serialized
    assert "+51922222222" not in serialized
    assert status["recipient"].endswith("222")


@pytest.mark.asyncio
async def test_send_sms_uses_smsgate_basic_auth_and_local_endpoint(monkeypatch):
    settings = smsgate_settings()
    saved = []

    class FakeSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        def add(self, row):
            saved.append(row)

        async def commit(self):
            return None

    async def handler(request: httpx.Request) -> httpx.Response:
        credentials = base64.b64encode(b"usuario-secreto:clave-secreta").decode()
        assert request.url == "http://192.168.1.40:8080/message"
        assert request.headers["Authorization"] == f"Basic {credentials}"
        assert json.loads(request.content) == {
            "phoneNumbers": ["+51922222222"],
            "textMessage": {"text": "SIRA alerta de prueba"},
        }
        return httpx.Response(201, json={"id": "mensaje-1"})

    monkeypatch.setattr(notifications, "get_settings", lambda: settings)
    monkeypatch.setattr(notifications, "SessionLocal", FakeSession)

    result = await notifications.send_sms(
        "SIRA   alerta\n de prueba",
        event="test",
        bypass_cooldown=True,
        transport=httpx.MockTransport(handler),
    )

    assert result == {"sent": True, "reason": "sent"}
    assert len(saved) == 1
    assert saved[0].proveedor == "smsgate"
