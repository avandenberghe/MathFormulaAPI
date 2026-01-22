# EDI@Energy Formel-API: Konformitätsnachweis

Dieses Dokument weist die Konformität unserer Implementierung mit der EDI@Energy Formelspezifikation (formel_v0.0.1) nach.

## Übersicht

| Spezifikationsanforderung | Status | Abschnitt |
|---------------------------|--------|-----------|
| FormulaLocation Struktur | ✅ Implementiert | [1.1](#11-formulalocation) |
| maloId / neloId Validierung | ✅ Implementiert | [1.2](#12-standortidentifikation) |
| calculationFormulaTimeSlices | ✅ Implementiert | [1.3](#13-zeitscheiben) |
| Rechenoperationen (6 Typen) | ✅ Implementiert | [2](#2-rechenoperationen) |
| Operandentypen (4 Typen) | ✅ Implementiert | [3](#3-operandentypen) |
| meloOperand mit Verlustfaktoren | ✅ Implementiert | [3.1](#31-melooperand) |
| Verschachtelte Formeln | ✅ Implementiert | [4](#4-verschachtelte-formeln) |
| Transaktionsheader | ✅ Implementiert | [5](#5-transaktionsheader) |
| Idempotenz | ✅ Implementiert | [6](#6-idempotenz) |

---

## Endpunkt

```
POST /formula/v0.0.1
```

## Voraussetzung: Authentifizierung

```bash
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

---

## 1. Anforderungen an die Datenstruktur

### 1.1 FormulaLocation

**Spezifikation:** Der Request-Body muss eine FormulaLocation-Struktur enthalten mit:
- Entweder `maloId` ODER `neloId` (nicht beide)
- `calculationFormulaTimeSlices` Array (mindestens ein Element)

**Implementierung:** Validierung erfolgt serverseitig mit entsprechenden Fehlermeldungen.

**Nachweis - Fehlerfall (beide IDs angegeben):**

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: $(uuidgen)" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "maloId": "12345678901",
    "neloId": "E1234567891",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** HTTP 400 mit Fehlermeldung "FormulaLocation must have either maloId OR neloId, not both"

---

### 1.2 Standortidentifikation

**Spezifikation:** Die IDs müssen bestimmten Formaten entsprechen.

| ID-Typ | Format | Beispiel |
|--------|--------|----------|
| maloId | 11 Ziffern | `12345678901` |
| neloId | E + 9 alphanumerisch + 1 Ziffer | `E1234567891` |
| meloId | DE + 11 Ziffern + 20 alphanumerisch | `DE00014545768S0000000000000003054` |

**Nachweis - Gültige maloId:**

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
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

**Nachweis - Ungültige maloId (zu kurz):**

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: $(uuidgen)" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "maloId": "12345",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** HTTP 400 mit Fehlermeldung "Invalid maloId format"

**Nachweis - Gültige neloId:**

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: $(uuidgen)" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "neloId": "E1234567891",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

---

### 1.3 Zeitscheiben

**Spezifikation:** Jede Zeitscheibe (calculationFormulaTimeSlice) muss enthalten:
- `timeSliceId` (Ganzzahl)
- `timeSliceQuality` ("Gültige Daten" oder "Keine Daten")
- `periodOfUseFrom` (ISO 8601 Zeitstempel)
- `periodOfUseTo` (ISO 8601 Zeitstempel)
- `calculationFormula` (Formelausdruck)

**Nachweis - Mehrere Zeitscheiben:**

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: $(uuidgen)" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [
      {
        "timeSliceId": 1,
        "timeSliceQuality": "Gültige Daten",
        "periodOfUseFrom": "2024-01-01T00:00:00Z",
        "periodOfUseTo": "2024-06-30T23:59:59Z",
        "calculationFormula": {"operand": {"const": "100"}}
      },
      {
        "timeSliceId": 2,
        "timeSliceQuality": "Gültige Daten",
        "periodOfUseFrom": "2024-07-01T00:00:00Z",
        "periodOfUseTo": "2024-12-31T23:59:59Z",
        "calculationFormula": {"operand": {"const": "200"}}
      }
    ]
  }'
```

**Erwartete Antwort:** HTTP 202 mit `"timeSlicesAccepted": 2`  (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

---

## 2. Rechenoperationen

**Spezifikation:** Die calculationFormula muss genau eine der folgenden Operationen enthalten.

| Operation | Struktur | Beschreibung |
|-----------|----------|--------------|
| `add` | Array von Operanden | Addition |
| `sub` | `{minuend, subtrahend}` | Subtraktion |
| `mul` | Array von Operanden | Multiplikation |
| `div` | Array von Operanden | Division |
| `pos` | Einzelner Operand | Absolutwert |
| `operand` | Einzelner Operand | Einzelwert-Wrapper |

### 2.1 Addition (add)

**Formel:** `Zähler_A + Zähler_B`

Addiert mehrere Zählerwerte.

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
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003054",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          },
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003055",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          }
        ]
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 2.2 Subtraktion (sub)

**Formel:** `Bezug - Einspeisung`

Berechnet die Differenz zwischen Minuend und Subtrahend.

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
          "minuend": {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003054",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          },
          "subtrahend": {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003055",
              "energyDirection": "production",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          }
        }
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 2.3 Multiplikation (mul)

**Formel:** `Zählerwert × 0.9951`

Multipliziert Werte (z.B. zur Anwendung eines Verlustfaktors von 0,49%).

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
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003054",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          },
          {"const": "0.9951"}
        ]
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 2.4 Division (div)

**Formel:** `Zählerwert ÷ 1000`

Dividiert Werte (z.B. Umrechnung Wh in kWh).

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
        "div": [
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003054",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.0},
              "lossFactorConduction": {"percentvalue": 0.0},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          },
          {"const": "1000"}
        ]
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 2.5 Absolutwert (pos)

**Formel:** `|Zählerwert|`

Gibt den Absolutwert zurück.

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
        "pos": {
          "meloOperand": {
            "meloId": "DE00014545768S0000000000000003054",
            "energyDirection": "consumption",
            "lossFactorTransformer": {"percentvalue": 0.0},
            "lossFactorConduction": {"percentvalue": 0.0},
            "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
          }
        }
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 2.6 Einzeloperand (operand)

**Formel:** `Zählerwert`

Wrapper für einen einzelnen Operanden.

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
        "operand": {
          "meloOperand": {
            "meloId": "DE00014545768S0000000000000003054",
            "energyDirection": "consumption",
            "lossFactorTransformer": {"percentvalue": 0.02},
            "lossFactorConduction": {"percentvalue": 0.01},
            "distributionFactorEnergyQuantity": {"percentvalue": 0.95}
          }
        }
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

---

## 3. Operandentypen

**Spezifikation:** Jeder Operand muss genau einen der folgenden Typen haben.

| Typ | Beschreibung |
|-----|--------------|
| `meloOperand` | Zählpunkt mit Verlustfaktoren |
| `const` | Konstanter Wert (als String) |
| `formulaVar` | Variablenreferenz (beginnt mit Buchstabe) |
| `calculationFormula` | Verschachtelte Formel |

### 3.1 meloOperand

**Spezifikation:** Der meloOperand muss folgende Felder enthalten:

| Feld | Erforderlich | Beschreibung |
|------|--------------|--------------|
| `meloId` | Ja | Zählpunktbezeichnung (DE + 11 Ziffern + 20 alphanumerisch) |
| `energyDirection` | Ja | `"consumption"` oder `"production"` |
| `lossFactorTransformer` | Ja | Transformatorverlust (0.0-1.0) |
| `lossFactorConduction` | Ja | Leitungsverlust (0.0-1.0) |
| `distributionFactorEnergyQuantity` | Ja | Verteilungsfaktor (0.0-1.0) |

**Nachweis - Vollständiger meloOperand:**

```json
{
  "meloOperand": {
    "meloId": "DE00014545768S0000000000000003054",
    "energyDirection": "consumption",
    "lossFactorTransformer": {"percentvalue": 0.02},
    "lossFactorConduction": {"percentvalue": 0.01},
    "distributionFactorEnergyQuantity": {"percentvalue": 0.95}
  }
}
```

**Nachweis - Ungültige meloId:**

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
        "operand": {
          "meloOperand": {
            "meloId": "UNGUELTIG",
            "energyDirection": "consumption",
            "lossFactorTransformer": {"percentvalue": 0.0},
            "lossFactorConduction": {"percentvalue": 0.0},
            "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
          }
        }
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 400 mit Fehlermeldung "Invalid meloId format"

### 3.2 const

**Spezifikation:** Konstanter numerischer Wert als String.

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
        "operand": {"const": "123.456"}
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

### 3.3 formulaVar

**Spezifikation:** Variablenreferenz, muss mit einem Buchstaben beginnen.

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
        "operand": {"formulaVar": "meinVariable"}
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

---

## 4. Verschachtelte Formeln

**Spezifikation:** Formeln können beliebig tief verschachtelt werden durch Verwendung von `calculationFormula` als Operand.

**Formel:** `(Bezug - Einspeisung) × 0.98`

Berechnet den Nettoverbrauch und wendet einen Verlustfaktor an.

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
          {
            "calculationFormula": {
              "sub": {
                "minuend": {
                  "meloOperand": {
                    "meloId": "DE00014545768S0000000000000003054",
                    "energyDirection": "consumption",
                    "lossFactorTransformer": {"percentvalue": 0.0},
                    "lossFactorConduction": {"percentvalue": 0.0},
                    "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                  }
                },
                "subtrahend": {
                  "meloOperand": {
                    "meloId": "DE00014545768S0000000000000003055",
                    "energyDirection": "production",
                    "lossFactorTransformer": {"percentvalue": 0.0},
                    "lossFactorConduction": {"percentvalue": 0.0},
                    "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                  }
                }
              }
            }
          },
          {"const": "0.98"}
        ]
      }
    }]
  }'
```

**Erwartete Antwort:** HTTP 202 Accepted (die Formel wurde validiert und zur Verarbeitung angenommen.                                                                 
  Die Berechnung erfolgt asynchron über den /v1/calculations Endpunkt.)

---

## 5. Transaktionsheader

**Spezifikation:** Folgende HTTP-Header sind erforderlich:

| Header | Format | Erforderlich | Beschreibung |
|--------|--------|--------------|--------------|
| `transactionId` | UUID RFC4122 | Ja | Eindeutige Transaktions-ID |
| `creationDateTime` | ISO 8601 | Ja | Erstellungszeitpunkt |
| `Content-Type` | `application/json` | Ja | Inhaltstyp |
| `initialTransactionId` | UUID | Nein | Für Idempotenz bei Wiederholungen |

**Nachweis - Fehlender transactionId Header:**

```bash
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "creationDateTime: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** HTTP 400 mit Fehlermeldung bezüglich fehlendem Header

---

## 6. Idempotenz

**Spezifikation:** Bei Verwendung von `initialTransactionId` wird bei wiederholten Anfragen die gecachte Antwort zurückgegeben.

**Nachweis:**

```bash
# Erste Anfrage
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: 550e8400-e29b-41d4-a716-446655440001" \
  -H "initialTransactionId: 550e8400-e29b-41d4-a716-446655440001" \
  -H "creationDateTime: 2024-01-15T10:30:00Z" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'

# Wiederholung mit gleicher initialTransactionId
curl -X POST http://localhost:8000/formula/v0.0.1 \
  -H "Content-Type: application/json" \
  -H "transactionId: 550e8400-e29b-41d4-a716-446655440002" \
  -H "initialTransactionId: 550e8400-e29b-41d4-a716-446655440001" \
  -H "creationDateTime: 2024-01-15T10:31:00Z" \
  -d '{
    "maloId": "12345678901",
    "calculationFormulaTimeSlices": [{
      "timeSliceId": 1,
      "timeSliceQuality": "Gültige Daten",
      "periodOfUseFrom": "2024-01-01T00:00:00Z",
      "periodOfUseTo": "2024-12-31T23:59:59Z",
      "calculationFormula": {"operand": {"const": "100"}}
    }]
  }'
```

**Erwartete Antwort:** Beide Anfragen liefern identische Antwort mit gleicher `transactionId`

---

## 7. Antwortformate

### Erfolgreiche Antwort (HTTP 202)

```json
{
  "status": "accepted",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "acceptanceTime": "2024-01-15T10:30:05Z",
  "locationId": "12345678901",
  "locationType": "maloId",
  "timeSlicesAccepted": 1,
  "validationResults": [
    {
      "timeSliceId": 1,
      "valid": true
    }
  ]
}
```

### Fehlerantwort (HTTP 400)

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "validationErrors": [
    "FormulaLocation must have either maloId or neloId",
    "timeSlice[0]: calculationFormula must have one of: add, sub, mul, div, pos, operand"
  ]
}
```

---

## 8. Abruf gespeicherter Formeln

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
