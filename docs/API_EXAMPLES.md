# API Examples

All examples can be copy-pasted directly into a terminal with the server running at `http://localhost:8000`.

## Additional Endpoints (Custom)

These endpoints extend the EDI@Energy specification for convenience.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/formulas` | GET | List all formulas |
| `/formulas/{id}` | GET | Get formula details |
| `/v1/time-series` | POST/GET | Time series data |
| `/v1/calculations` | POST | Execute calculations |
| `/oauth/token` | POST | Get access token |
| `/health` | GET | Health check |

## Examples

### Health Check

```bash
curl http://localhost:8000/health
```

### Get OAuth Token

```bash
curl -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret"
```

### Submit EDI@Energy Formula

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: 550e8400-e29b-41d4-a716-446655440000" \
  -H "creationDateTime: 2024-01-15T10:30:00Z" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {
        "add": [
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003054",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.02},
              "lossFactorConduction": {"percentvalue": 0.01},
              "distributionFactorEnergyQuantity": {"percentvalue": 0.95}
            }
          },
          {"const": "100.5"}
        ]
      }
    }]
  }'
```

### List All Formulas

```bash
curl http://localhost:8000/formulas
```

### Submit Time Series Data

```bash
curl -X POST http://localhost:8000/v1/time-series \
  -H "Content-Type: application/json" \
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
curl "http://localhost:8000/v1/time-series?marketLocationId=12345678901"
```

### Execute Calculation

```bash
curl -X POST http://localhost:8000/v1/calculations \
  -H "Content-Type: application/json" \
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
curl http://localhost:8000/v1/calculations/CALC-001
```
