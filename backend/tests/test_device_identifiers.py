import re

from app.routers.parcelas import build_device_id


def test_device_identifier_is_neutral_legible_and_unique():
    identifiers = {build_device_id() for _ in range(1_000)}

    assert len(identifiers) == 1_000
    assert all(
        re.fullmatch(r"SIRA-(?:[A-HJ-NP-Z2-9]{4}-){4}[A-HJ-NP-Z2-9]{4}", value)
        for value in identifiers
    )
