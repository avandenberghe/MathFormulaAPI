# EDI@Energy Formula API Examples

This document provides comprehensive examples for the EDI@Energy formula specification as implemented by this API. All examples can be run directly against a server at `http://localhost:8000`.

## Quick Start

```bash
# Get authentication token
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

## Endpoint

```
POST /formula/v0.0.1
```

## Required Headers

| Header | Format | Description |
|--------|--------|-------------|
| `transactionId` | UUID RFC4122 | Unique transaction identifier |
| `creationDateTime` | ISO 8601 | Timestamp of request creation |
| `Content-Type` | `application/json` | Must be JSON |
| `initialTransactionId` | UUID (optional) | For retry/idempotency |

## ID Formats

| ID Type | Pattern | Example |
|---------|---------|---------|
| `maloId` | 11 digits | `12345678901` |
| `neloId` | E + 9 alphanumeric + 1 digit | `E1234567891` |
| `meloId` | DE + 11 digits + 20 alphanumeric | `DE00014545768S0000000000000003054` |

## Request Body Structure

```
FormulaLocation
├── maloId OR neloId (required, oneOf)
└── calculationFormulaTimeSlices[] (required)
    ├── timeSliceId (integer)
    ├── timeSliceQuality ("Gültige Daten" | "Keine Daten")
    ├── periodOfUseFrom (ISO 8601)
    ├── periodOfUseTo (ISO 8601)
    └── calculationFormula (operation)
```

---

## Formula Operations

The `calculationFormula` must contain exactly one of these operations:

| Operation | Structure | Description |
|-----------|-----------|-------------|
| `add` | Array of operands | Addition: sum all operands |
| `sub` | `{minuend, subtrahend}` | Subtraction: minuend - subtrahend |
| `mul` | Array of operands | Multiplication: product of all operands |
| `div` | Array of operands | Division: sequential division |
| `pos` | Single operand | Absolute value |
| `operand` | Single operand | Wrapper for single operand |

## Operand Types

Each operand must be exactly one of:

| Type | Description |
|------|-------------|
| `meloOperand` | Meter location with loss factors |
| `const` | Constant numeric value (as string) |
| `formulaVar` | Variable reference (must start with letter) |
| `calculationFormula` | Nested formula (recursive) |

---

## Examples by Operation

### 1. Addition (`add`)

Sum multiple meter readings with loss factors applied.

**Formula:**
```
Result = A + B

Where:
  A = meloId ...3054 (consumption) with 2% transformer loss, 1% conduction loss
  B = meloId ...3055 (consumption) with 2% transformer loss, 1% conduction loss
```

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
              "lossFactorTransformer": {"percentvalue": 0.02},
              "lossFactorConduction": {"percentvalue": 0.01},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          },
          {
            "meloOperand": {
              "meloId": "DE00014545768S0000000000000003055",
              "energyDirection": "consumption",
              "lossFactorTransformer": {"percentvalue": 0.02},
              "lossFactorConduction": {"percentvalue": 0.01},
              "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
            }
          }
        ]
      }
    }]
  }'
```

### 2. Subtraction (`sub`)

Calculate net consumption (consumption minus production).

**Formula:**
```
Result = A - B

Where:
  A = meloId ...3054 (consumption)
  B = meloId ...3055 (production)
```

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

### 3. Multiplication (`mul`)

Apply scaling factor to meter reading (e.g., 0.49% loss deduction).

**Formula:**
```
Result = A × 0.9951

Where:
  A = meloId ...3054 (consumption)
```

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

### 4. Division (`div`)

Convert units (e.g., Wh to kWh).

**Formula:**
```
Result = A ÷ 1000

Where:
  A = meloId ...3054 (consumption)
```

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

### 5. Absolute Value (`pos`)

Get absolute value of a meter reading.

**Formula:**
```
Result = |A|

Where:
  A = meloId ...3054 (consumption)
```

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

### 6. Single Operand (`operand`)

Reference a single meter with loss factors applied.

**Formula:**
```
Result = A × (1 + 0.02) × (1 + 0.01) × 0.95

Where:
  A = meloId ...3054 (consumption)
  0.02 = lossFactorTransformer
  0.01 = lossFactorConduction
  0.95 = distributionFactorEnergyQuantity
```

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

---

## Operand Type Examples

### meloOperand (Meter Location)

Full meter operand with all loss factors:

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

| Field | Required | Description |
|-------|----------|-------------|
| `meloId` | Yes | Meter location ID (DE + 11 digits + 20 alphanumeric) |
| `energyDirection` | Yes | `"consumption"` or `"production"` |
| `lossFactorTransformer` | Yes | Transformer loss factor (0.0-1.0) |
| `lossFactorConduction` | Yes | Conduction loss factor (0.0-1.0) |
| `distributionFactorEnergyQuantity` | Yes | Distribution factor (0.0-1.0) |

### const (Constant Value)

```json
{"const": "100.5"}
```

Note: Value must be a string representation of a number.

### formulaVar (Variable Reference)

```json
{"formulaVar": "myVariable"}
```

Note: Must start with a letter.

### calculationFormula (Nested Formula)

```json
{
  "calculationFormula": {
    "add": [
      {"const": "100"},
      {"const": "200"}
    ]
  }
}
```

---

## Nested Formula Examples

### Net Consumption with Loss Adjustment

**Formula:**
```
Result = (A - B) × 0.98

Where:
  A = meloId ...3054 (consumption)
  B = meloId ...3055 (production)
```

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

### Complex Multi-Meter Aggregation

**Formula:**
```
Result = (A + B) - (C + 50.0)

Where:
  A = meloId ...3054 (consumption)
  B = meloId ...3055 (consumption)
  C = meloId ...3056 (consumption)
```

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
          },
          "subtrahend": {
            "calculationFormula": {
              "add": [
                {
                  "meloOperand": {
                    "meloId": "DE00014545768S0000000000000003056",
                    "energyDirection": "consumption",
                    "lossFactorTransformer": {"percentvalue": 0.0},
                    "lossFactorConduction": {"percentvalue": 0.0},
                    "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                  }
                },
                {"const": "50.0"}
              ]
            }
          }
        }
      }
    }]
  }'
```

---

## Using Network Location ID (neloId)

Instead of `maloId`, you can use `neloId`.

**Formula:**
```
Result = 100.0
```

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
      "calculationFormula": {
        "operand": {
          "const": "100.0"
        }
      }
    }]
  }'
```

---

## Multiple Time Slices

Submit formulas with different validity periods.

**Formulas:**
```
Time Slice 1 (Jan-Jun): Result = 100 + 50 = 150
Time Slice 2 (Jul-Dec): Result = 200 + 75 = 275
```

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
        "calculationFormula": {
          "add": [
            {"const": "100"},
            {"const": "50"}
          ]
        }
      },
      {
        "timeSliceId": 2,
        "timeSliceQuality": "Gültige Daten",
        "periodOfUseFrom": "2024-07-01T00:00:00Z",
        "periodOfUseTo": "2024-12-31T23:59:59Z",
        "calculationFormula": {
          "add": [
            {"const": "200"},
            {"const": "75"}
          ]
        }
      }
    ]
  }'
```

---

## Idempotency (Retry Support)

Use `initialTransactionId` header for safe retries.

**Formula:**
```
Result = 100
```

```bash
# First request
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

# Retry with same initialTransactionId returns cached response
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

---

## Retrieving Submitted Formulas

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

## Response Format

### Success Response (202 Accepted)

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

### Error Response (400 Bad Request)

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

## Common Validation Errors

| Error | Cause |
|-------|-------|
| `FormulaLocation must have either maloId or neloId` | Missing location identifier |
| `FormulaLocation must have either maloId OR neloId, not both` | Both IDs provided |
| `Invalid maloId format` | maloId is not 11 digits |
| `Invalid neloId format` | neloId doesn't match E + 9 alphanumeric + 1 digit |
| `Invalid meloId format` | meloId doesn't match DE + 11 digits + 20 alphanumeric |
| `calculationFormula must have one of: add, sub, mul, div, pos, operand` | Missing operation |
| `Operand must have one of: meloOperand, const, formulaVar, calculationFormula` | Invalid operand type |
| `Invalid energyDirection` | Must be "consumption" or "production" |
| `percentvalue must be between 0.0 and 1.0` | Loss factor out of range |
| `Invalid timeSliceQuality` | Must be "Gültige Daten" or "Keine Daten" |
