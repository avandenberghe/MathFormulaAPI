# API Implementierungsbeispiele

Dieses Dokument enthält Beispiele für die allgemeinen API-Endpunkte für Zeitreihendaten, Berechnungen und Administration. Für EDI@Energy Formelspezifikationsbeispiele siehe [EDI_ENERGY_KONFORMITAETSNACHWEIS.md](EDI_ENERGY_KONFORMITAETSNACHWEIS.md).

## Authentifizierung

```bash
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token: $TOKEN"
```

## Endpunkte Übersicht

| Endpunkt | Methode | Auth | Beschreibung |
|----------|---------|------|--------------|
| `/health` | GET | Nein | Zustandsprüfung |
| `/oauth/token` | POST | Nein | Zugriffstoken abrufen |
| `/formula/v0.0.1` | POST | Nein | EDI@Energy Formel übermitteln ([siehe Beispiele](EDI_ENERGY_KONFORMITAETSNACHWEIS.md)) |
| `/formulas` | GET | Ja | Alle Formeln auflisten |
| `/formulas/{id}` | GET | Ja | Formel nach Standort-ID abrufen |
| `/v1/time-series` | POST | Ja | Zeitreihendaten übermitteln |
| `/v1/time-series` | GET | Ja | Zeitreihen abfragen |
| `/v1/time-series/{id}` | GET | Ja | Bestimmte Zeitreihe abrufen |
| `/v1/calculations` | POST | Ja | Berechnung ausführen |
| `/v1/calculations/{id}` | GET | Ja | Berechnungsergebnis abrufen |

---

## Zustandsprüfung

```bash
curl http://localhost:8000/health
```

---

## Zeitreihen

### Zeitreihendaten übermitteln

```bash
curl -X POST http://localhost:8000/v1/time-series \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "timeSeries": [{
      "timeSeriesId": "TS-001",
      "marketLocationId": "12345678901",
      "meterLocationId": "DE00014545768S0000000000000003054",
      "measurementType": "CONSUMPTION",
      "unit": "KWH",
      "resolution": "PT15M",
      "period": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-01T01:00:00Z"
      },
      "intervals": [
        {"position": 1, "start": "2024-01-01T00:00:00Z", "end": "2024-01-01T00:15:00Z", "quantity": "125.5", "quality": "VALIDATED"},
        {"position": 2, "start": "2024-01-01T00:15:00Z", "end": "2024-01-01T00:30:00Z", "quantity": "130.2", "quality": "VALIDATED"},
        {"position": 3, "start": "2024-01-01T00:30:00Z", "end": "2024-01-01T00:45:00Z", "quantity": "128.7", "quality": "VALIDATED"},
        {"position": 4, "start": "2024-01-01T00:45:00Z", "end": "2024-01-01T01:00:00Z", "quantity": "131.1", "quality": "VALIDATED"}
      ]
    }]
  }'
```

### Zeitreihen abfragen

```bash
curl "http://localhost:8000/v1/time-series?marketLocationId=12345678901" \
  -H "Authorization: Bearer $TOKEN"
```

### Bestimmte Zeitreihe abrufen

```bash
curl http://localhost:8000/v1/time-series/TS-001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Formeln

### Alle Formeln auflisten

```bash
curl http://localhost:8000/formulas \
  -H "Authorization: Bearer $TOKEN"
```

### Formel nach Standort-ID abrufen

```bash
curl http://localhost:8000/formulas/12345678901 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Berechnungen

### Berechnung ausführen

```bash
curl -X POST http://localhost:8000/v1/calculations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "calculationId": "CALC-001",
    "maloId": "12345678901",
    "timeSliceId": 1,
    "inputTimeSeries": {
      "DE00014545768S0000000000000003054": "TS-001"
    },
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-01T01:00:00Z"
    }
  }'
```

### Berechnungsergebnis abrufen

```bash
curl http://localhost:8000/v1/calculations/CALC-001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Vollständiges Workflow-Beispiel

```bash
# 1. Authentifizierungstoken abrufen
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Formel übermitteln (siehe EDI_ENERGY_KONFORMITAETSNACHWEIS.md für Details)
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: $(uuidgen)" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {
        "add": [
          {"meloOperand": {"meloId": "DE00014545768S0000000000000003054", "energyDirection": "consumption", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}},
          {"const": "100.5"}
        ]
      }
    }]
  }'

# 3. Formel überprüfen
curl -s http://localhost:8000/formulas -H "Authorization: Bearer $TOKEN"

# 4. Zeitreihendaten übermitteln
curl -X POST http://localhost:8000/v1/time-series \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "timeSeries": [{
      "timeSeriesId": "TS-001",
      "marketLocationId": "12345678901",
      "meterLocationId": "DE00014545768S0000000000000003054",
      "measurementType": "CONSUMPTION",
      "unit": "KWH",
      "resolution": "PT15M",
      "period": {"start": "2024-01-01T00:00:00Z", "end": "2024-01-01T01:00:00Z"},
      "intervals": [
        {"position": 1, "start": "2024-01-01T00:00:00Z", "end": "2024-01-01T00:15:00Z", "quantity": "125.5", "quality": "VALIDATED"},
        {"position": 2, "start": "2024-01-01T00:15:00Z", "end": "2024-01-01T00:30:00Z", "quantity": "130.2", "quality": "VALIDATED"},
        {"position": 3, "start": "2024-01-01T00:30:00Z", "end": "2024-01-01T00:45:00Z", "quantity": "128.7", "quality": "VALIDATED"},
        {"position": 4, "start": "2024-01-01T00:45:00Z", "end": "2024-01-01T01:00:00Z", "quantity": "131.1", "quality": "VALIDATED"}
      ]
    }]
  }'

# 5. Berechnung ausführen
curl -X POST http://localhost:8000/v1/calculations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "calculationId": "CALC-001",
    "maloId": "12345678901",
    "timeSliceId": 1,
    "inputTimeSeries": {"DE00014545768S0000000000000003054": "TS-001"},
    "period": {"start": "2024-01-01T00:00:00Z", "end": "2024-01-01T01:00:00Z"}
  }'

# 6. Berechnungsergebnis abrufen
curl -s http://localhost:8000/v1/calculations/CALC-001 -H "Authorization: Bearer $TOKEN"
```
