# API Implementation Examples

This document provides examples for the general API endpoints used for time series data, calculations, and administration. For EDI@Energy formula specification examples, see [EDI_ENERGY_FORMULA_EXAMPLES.md](EDI_ENERGY_FORMULA_EXAMPLES.md).

## Authentication

```bash
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token: $TOKEN"
```

## Endpoints Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/oauth/token` | POST | No | Get access token |
| `/formula/v0.0.1` | POST | No | Submit EDI@Energy formula ([see examples](EDI_ENERGY_FORMULA_EXAMPLES.md)) |
| `/formulas` | GET | Yes | List all formulas |
| `/formulas/{id}` | GET | Yes | Get formula by location ID |
| `/v1/time-series` | POST | Yes | Submit time series data |
| `/v1/time-series` | GET | Yes | Query time series |
| `/v1/time-series/{id}` | GET | Yes | Get specific time series |
| `/v1/calculations` | POST | Yes | Execute calculation |
| `/v1/calculations/{id}` | GET | Yes | Get calculation result |

---

## Health Check

```bash
curl http://localhost:8000/health
```

---

## Time Series

### Submit Time Series Data

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

### Query Time Series

```bash
curl "http://localhost:8000/v1/time-series?marketLocationId=12345678901" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Specific Time Series

```bash
curl http://localhost:8000/v1/time-series/TS-001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Formulas

### List All Formulas

```bash
curl http://localhost:8000/formulas \
  -H "Authorization: Bearer $TOKEN"
```

### Get Formula by Location ID

```bash
curl http://localhost:8000/formulas/12345678901 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Calculations

### Execute Calculation

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

### Get Calculation Result

```bash
curl http://localhost:8000/v1/calculations/CALC-001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Workflow Example

```bash
# 1. Get authentication token
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Submit a formula (see EDI_ENERGY_FORMULA_EXAMPLES.md for details)
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

# 3. Verify formula was stored
curl -s http://localhost:8000/formulas -H "Authorization: Bearer $TOKEN"

# 4. Submit time series data
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

# 5. Execute calculation
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

# 6. Get calculation result
curl -s http://localhost:8000/v1/calculations/CALC-001 -H "Authorization: Bearer $TOKEN"
```
