# EDI@Energy Formula API: Compliance Proof

This document demonstrates the compliance of our implementation with the EDI@Energy formula specification (formel_v0.0.1).

## Overview

| Specification Requirement | Status | Section |
|---------------------------|--------|---------|
| FormulaLocation Structure | ✅ Implemented | [1.1](#11-formulalocation) |
| maloId / neloId Validation | ✅ Implemented | [1.2](#12-location-identification) |
| calculationFormulaTimeSlices | ✅ Implemented | [1.3](#13-time-slices) |
| Calculation Operations (6 types) | ✅ Implemented | [2](#2-calculation-operations) |
| Operand Types (4 types) | ✅ Implemented | [3](#3-operand-types) |
| meloOperand with Loss Factors | ✅ Implemented | [3.1](#31-melooperand) |
| Nested Formulas | ✅ Implemented | [4](#4-nested-formulas) |
| Transaction Headers | ✅ Implemented | [5](#5-transaction-headers) |
| Idempotency | ✅ Implemented | [6](#6-idempotency) |

---

## Endpoint

```
POST /formula/v0.0.1
```

## Prerequisite: Authentication

```bash
export TOKEN=$(curl -s -X POST http://localhost:8000/oauth/token \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

---

## 1. Data Structure Requirements

### 1.1 FormulaLocation

**Specification:** The request body must contain a FormulaLocation structure with:
- Either `maloId` OR `neloId` (not both)
- `calculationFormulaTimeSlices` array (at least one element)

**Implementation:** Server-side validation with appropriate error messages.

**Proof - Error Case (both IDs provided):**

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

**Expected Response:** HTTP 400 with error message "FormulaLocation must have either maloId OR neloId, not both"

---

### 1.2 Location Identification

**Specification:** IDs must conform to specific formats.

| ID Type | Format | Example |
|---------|--------|---------|
| maloId | 11 digits | `12345678901` |
| neloId | E + 9 alphanumeric + 1 digit | `E1234567891` |
| meloId | DE + 11 digits + 20 alphanumeric | `DE00014545768S0000000000000003054` |

**Proof - Valid maloId:**

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

**Proof - Invalid maloId (too short):**

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

**Expected Response:** HTTP 400 with error message "Invalid maloId format"

**Proof - Valid neloId:**

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

---

### 1.3 Time Slices

**Specification:** Each time slice (calculationFormulaTimeSlice) must contain:
- `timeSliceId` (integer)
- `timeSliceQuality` ("Gültige Daten" or "Keine Daten")
- `periodOfUseFrom` (ISO 8601 timestamp)
- `periodOfUseTo` (ISO 8601 timestamp)
- `calculationFormula` (formula expression)

**Proof - Multiple Time Slices:**

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

**Expected Response:** HTTP 202 with `"timeSlicesAccepted": 2` (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

---

## 2. Calculation Operations

**Specification:** The calculationFormula must contain exactly one of the following operations.

| Operation | Structure | Description |
|-----------|-----------|-------------|
| `add` | Array of operands | Addition |
| `sub` | `{minuend, subtrahend}` | Subtraction |
| `mul` | Array of operands | Multiplication |
| `div` | Array of operands | Division |
| `pos` | Single operand | Absolute value |
| `operand` | Single operand | Single value wrapper |

### 2.1 Addition (add)

**Formula:** `Meter_A + Meter_B`

Adds multiple meter values.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 2.2 Subtraction (sub)

**Formula:** `Consumption - FeedIn`

Calculates the difference between minuend and subtrahend.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 2.3 Multiplication (mul)

**Formula:** `MeterValue × 0.9951`

Multiplies values (e.g., to apply a 0.49% loss factor).

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 2.4 Division (div)

**Formula:** `MeterValue ÷ 1000`

Divides values (e.g., converting Wh to kWh).

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 2.5 Absolute Value (pos)

**Formula:** `|MeterValue|`

Returns the absolute value.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 2.6 Single Operand (operand)

**Formula:** `MeterValue`

Wrapper for a single operand.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

---

## 3. Operand Types

**Specification:** Each operand must have exactly one of the following types.

| Type | Description |
|------|-------------|
| `meloOperand` | Meter point with loss factors |
| `const` | Constant value (as string) |
| `formulaVar` | Variable reference (starts with letter) |
| `calculationFormula` | Nested formula |

### 3.1 meloOperand

**Specification:** The meloOperand must contain the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `meloId` | Yes | Meter point identifier (DE + 11 digits + 20 alphanumeric) |
| `energyDirection` | Yes | `"consumption"` or `"production"` |
| `lossFactorTransformer` | Yes | Transformer loss (0.0-1.0) |
| `lossFactorConduction` | Yes | Conduction loss (0.0-1.0) |
| `distributionFactorEnergyQuantity` | Yes | Distribution factor (0.0-1.0) |

**Proof - Complete meloOperand:**

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

**Proof - Invalid meloId:**

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
            "meloId": "INVALID",
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

**Expected Response:** HTTP 400 with error message "Invalid meloId format"

### 3.2 const

**Specification:** Constant numeric value as string.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

### 3.3 formulaVar

**Specification:** Variable reference, must start with a letter.

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
        "operand": {"formulaVar": "myVariable"}
      }
    }]
  }'
```

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

---

## 4. Nested Formulas

**Specification:** Formulas can be nested arbitrarily deep by using `calculationFormula` as an operand.

**Formula:** `(Consumption - FeedIn) × 0.98`

Calculates net consumption and applies a loss factor.

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

**Expected Response:** HTTP 202 Accepted (the formula was validated and accepted for processing. Calculation execution occurs asynchronously via the /v1/calculations endpoint.)

---

## 5. Transaction Headers

**Specification:** The following HTTP headers are required:

| Header | Format | Required | Description |
|--------|--------|----------|-------------|
| `transactionId` | UUID RFC4122 | Yes | Unique transaction ID |
| `creationDateTime` | ISO 8601 | Yes | Creation timestamp |
| `Content-Type` | `application/json` | Yes | Content type |
| `initialTransactionId` | UUID | No | For idempotency on retries |

**Proof - Missing transactionId Header:**

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

**Expected Response:** HTTP 400 with error message about missing header

---

## 6. Idempotency

**Specification:** When using `initialTransactionId`, repeated requests return the cached response.

**Proof:**

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

# Retry with same initialTransactionId
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

**Expected Response:** Both requests return identical response with same `transactionId`

---

## 7. Response Formats

### Successful Response (HTTP 202)

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

### Error Response (HTTP 400)

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

## 8. Retrieving Stored Formulas

### List All Formulas

```bash
curl http://localhost:8000/formulas \
  -H "Authorization: Bearer $TOKEN"
```

### Retrieve Formula by Location ID

```bash
curl http://localhost:8000/formulas/12345678901 \
  -H "Authorization: Bearer $TOKEN"
```
