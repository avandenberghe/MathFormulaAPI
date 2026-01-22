# Energy Formula Registry

[![License: EUPL-1.2](https://img.shields.io/badge/License-EUPL--1.2-blue.svg)](https://opensource.org/licenses/EUPL-1.2)

## What is this?

In the German energy market, different companies (grid operators, metering service providers, suppliers) need to exchange mathematical formulas that describe how energy consumption and production values should be calculated. For example, a formula might define how to calculate a customer's net consumption by subtracting solar production from grid usage, while accounting for transformer losses.

This project provides:

1. **A REST API** that receives and stores these calculation formulas following the EDI@Energy standard — the official format used in the German energy sector.

2. **A web interface** where users can build, view, and manage formulas without writing JSON by hand.

3. **A calculation engine** that can execute these formulas against time series data (meter readings) to produce results.

This is a proof-of-concept implementation intended for testing and development, not production use.

## Quick Start

```bash
docker compose --profile demo up
```

**Services:**
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

## EDI@Energy Specification Compatibility

This implementation targets compatibility with the **EDI@Energy formel_v0.0.1** specification used in the German energy market for transmitting calculation formulas between market participants (MSBs, grid operators, suppliers).

### Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Endpoint** | ✅ | `POST /formula/v0.0.1` |
| **Required Headers** | ✅ | `transactionId` (UUID), `creationDateTime` (ISO 8601) |
| **Optional Headers** | ✅ | `initialTransactionId` for retry/idempotency |
| **FormulaLocation** | ✅ | Main request body structure |
| **maloId** | ✅ | Market Location ID (11 digits) |
| **neloId** | ✅ | Network Location ID (E + 9 alphanumeric + 1 digit) |
| **meloId** | ✅ | Meter Location ID (DE + 11 digits + 20 alphanumeric) |
| **calculationFormulaTimeSlices** | ✅ | Time-bounded formula definitions |
| **timeSliceQuality** | ✅ | "Gültige Daten" / "Keine Daten" |

### Calculation Formula Operations

| Operation | Status | Description |
|-----------|--------|-------------|
| `add` | ✅ | Addition (array of operands) |
| `sub` | ✅ | Subtraction (minuend - subtrahend) |
| `mul` | ✅ | Multiplication (array of operands) |
| `div` | ✅ | Division (array of operands) |
| `pos` | ✅ | Unary positive/absolute value |
| `operand` | ✅ | Single operand wrapper |

### Operand Types

| Operand | Status | Description |
|---------|--------|-------------|
| `meloOperand` | ✅ | Meter location with loss factors |
| `const` | ✅ | Constant numeric value |
| `formulaVar` | ✅ | Variable reference (starts with letter) |
| `calculationFormula` | ✅ | Nested formula (recursive) |

### meloOperand Structure

| Field | Status | Description |
|-------|--------|-------------|
| `meloId` | ✅ | Meter Location ID |
| `energyDirection` | ✅ | "consumption" or "production" |
| `lossFactorTransformer` | ✅ | Transformer loss (0.0-1.0) |
| `lossFactorConduction` | ✅ | Conduction loss (0.0-1.0) |
| `distributionFactorEnergyQuantity` | ✅ | Distribution factor (0.0-1.0) |

### ID Format Validation

| ID Type | Pattern | Example |
|---------|---------|---------|
| maloId | `\d{11}` | `12345678901` |
| meloId | `DE\d{11}[A-Z\d]{20}` | `DE00014545768S0000000000000003054` |
| neloId | `E[A-Z\d]{9}\d` | `E1234848431` |
| transactionId | UUID RFC4122 | `f81d4fae-7dec-11d0-a765-00a0c91e6bf6` |

### Not Yet Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Digital signatures | ❌ | Not required for PoC |
| Certificate validation | ❌ | Mock OAuth only |
| Full EDIFACT mapping | ❌ | REST-only implementation |

## API

### EDI@Energy Compliant Endpoint

```
POST /formula/v0.0.1
Headers:
  transactionId: <UUID>
  creationDateTime: <ISO 8601>
  Authorization: Bearer <token>
```

### Documentation

- **[EDI@Energy Formula Examples](docs/EDI_ENERGY_FORMULA_EXAMPLES.md)** - Comprehensive examples for the formula specification (operations, operands, nesting, validation)
- **[API Examples](docs/API_EXAMPLES.md)** - General API usage (time series, calculations, authentication)

## Project Structure

```
MathformulaAPI/
├── mock_api_server.py      # Flask API server (EDI@Energy compliant)
├── demo_client_edi.py      # Demo client with EDI examples
├── frontend/               # React UI
│   └── src/
│       ├── pages/          # UI pages
│       ├── types/          # TypeScript types
│       └── services/       # API client
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   └── BUSINESS_FLOW.md
├── energy-timeseries-api.yaml  # OpenAPI specification
└── docker-compose.yml      # Container orchestration
```

## Development

### Local Development

```bash
# Backend
pip install -r requirements.txt
python mock_api_server.py

# Frontend
cd frontend
npm install
npm run dev
```

### Docker

```bash
# Build and run all services
docker compose --profile demo up --build

# Rebuild specific service
docker compose build formula-frontend
```

## License

EUPL-1.2 - See [LICENSE](LICENSE) for details.

## References

- [EDI@Energy](https://www.bdew-mako.de/edi-energy) - German energy market data exchange standards
- [BDEW](https://www.bdew.de/) - German Association of Energy and Water Industries
