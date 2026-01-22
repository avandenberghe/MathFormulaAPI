# EDI@Energy Formel-API Beispiele

Technische Referenz für die EDI@Energy Formelspezifikation. Für vollständige Konformitätsnachweise siehe [EDI_ENERGY_KONFORMITAETSNACHWEIS.md](EDI_ENERGY_KONFORMITAETSNACHWEIS.md).

## Schnellstart

```bash
# Authentifizierungstoken abrufen
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

## Endpunkt

```
POST /formula/v0.0.1
```

## Erforderliche Header

| Header | Format | Beschreibung |
|--------|--------|--------------|
| `transactionId` | UUID RFC4122 | Eindeutige Transaktionskennung |
| `creationDateTime` | ISO 8601 | Zeitstempel der Anfrageerstellung |
| `Content-Type` | `application/json` | Muss JSON sein |
| `initialTransactionId` | UUID (optional) | Für Wiederholungen/Idempotenz |

## ID-Formate

| ID-Typ | Muster | Beispiel |
|--------|--------|----------|
| `maloId` | 11 Ziffern | `12345678901` |
| `neloId` | E + 9 alphanumerisch + 1 Ziffer | `E1234567891` |
| `meloId` | DE + 11 Ziffern + 20 alphanumerisch | `DE00014545768S0000000000000003054` |

## Request-Body Struktur

```
FormulaLocation
├── maloId ODER neloId (erforderlich, oneOf)
└── calculationFormulaTimeSlices[] (erforderlich)
    ├── timeSliceId (Ganzzahl)
    ├── timeSliceQuality ("Gültige Daten" | "Keine Daten")
    ├── periodOfUseFrom (ISO 8601)
    ├── periodOfUseTo (ISO 8601)
    └── calculationFormula (Operation)
```

---

## Formeloperationen

| Operation | Struktur | Beschreibung |
|-----------|----------|--------------|
| `add` | Array von Operanden | Addition |
| `sub` | `{minuend, subtrahend}` | Subtraktion |
| `mul` | Array von Operanden | Multiplikation |
| `div` | Array von Operanden | Division |
| `pos` | Einzelner Operand | Absolutwert |
| `operand` | Einzelner Operand | Wrapper für einzelnen Operanden |

## Operandentypen

| Typ | Beschreibung |
|-----|--------------|
| `meloOperand` | Zählpunkt mit Verlustfaktoren |
| `const` | Konstanter numerischer Wert (als String) |
| `formulaVar` | Variablenreferenz (muss mit Buchstabe beginnen) |
| `calculationFormula` | Verschachtelte Formel (rekursiv) |

---

## Kurzbeispiele

### Addition

**Formel:** `Zähler_A + Zähler_B`

```bash
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
          {"meloOperand": {"meloId": "DE00014545768S0000000000000003055", "energyDirection": "consumption", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}}
        ]
      }
    }]
  }'
```

### Subtraktion

**Formel:** `Bezug - Einspeisung`

```bash
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
        "sub": {
          "minuend": {"meloOperand": {"meloId": "DE00014545768S0000000000000003054", "energyDirection": "consumption", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}},
          "subtrahend": {"meloOperand": {"meloId": "DE00014545768S0000000000000003055", "energyDirection": "production", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}}
        }
      }
    }]
  }'
```

### Multiplikation

**Formel:** `Zählerwert × 0.9951`

```bash
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
        "mul": [
          {"meloOperand": {"meloId": "DE00014545768S0000000000000003054", "energyDirection": "consumption", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}},
          {"const": "0.9951"}
        ]
      }
    }]
  }'
```

### Verschachtelte Formel

**Formel:** `(Bezug - Einspeisung) × 0.98`

```bash
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
        "mul": [
          {"calculationFormula": {"sub": {"minuend": {"meloOperand": {"meloId": "DE00014545768S0000000000000003054", "energyDirection": "consumption", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}}, "subtrahend": {"meloOperand": {"meloId": "DE00014545768S0000000000000003055", "energyDirection": "production", "lossFactorTransformer": {"percentvalue": 0.0}, "lossFactorConduction": {"percentvalue": 0.0}, "distributionFactorEnergyQuantity": {"percentvalue": 1.0}}}}}},
          {"const": "0.98"}
        ]
      }
    }]
  }'
```

---

## Antwortformate

### Erfolg (HTTP 202)

```json
{
  "status": "accepted",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "acceptanceTime": "2024-01-15T10:30:05Z",
  "locationId": "12345678901",
  "locationType": "maloId",
  "timeSlicesAccepted": 1
}
```

### Fehler (HTTP 400)

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "validationErrors": ["..."]
}
```

---

## Weitere Informationen

Vollständige Beispiele mit Validierungsnachweisen: [EDI_ENERGY_KONFORMITAETSNACHWEIS.md](EDI_ENERGY_KONFORMITAETSNACHWEIS.md)
