# Formula Registry - Complete Business Flow

## Overview

The Formula Registry acts as the **central intermediary** for formula transmission in the energy market. It's operated by TSOs (Transmission System Operators) to facilitate communication between all market participants.

---

## Complete Business Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           The Business Flow                             │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: MSB Creates Formula
┌──────────────────────────┐
│  MSB                     │
│  (Company A)             │
│                          │
│  Engineer creates        │
│  formula for BESS        │
│  metering concept        │
│                          │
│  Decides: Need to send   │
│  this to 50Hertz for     │
│  billing                 │
└────────────┬─────────────┘
             │
             │ 1. Opens their own system
             │    OR Formula Registry web portal
             │
             ▼
┌──────────────────────────┐
│  MSB's Formula Builder   │
│  (or Hub Portal)         │
│                          │
│  • Selects template      │
│  • Fills in parameters   │
│  • Maps metering points  │
│  • Validates locally     │
└────────────┬─────────────┘
             │
             │ 2. Submit to Formula Registry
             │    POST /v1/formulas
             │    Authorization: Bearer {MSB_TOKEN}
             ▼

╔═══════════════════════════════════════════════════════════════╗
║                      Formula Registry                                 ║
║                  (Your System / POC)                          ║
║                                                                ║
║  Step 3: Hub Receives Formula                                 ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  API Endpoint: POST /v1/formulas                         │ ║
║  │                                                           │ ║
║  │  • Validates OAuth2 token                                │ ║
║  │  • Checks MSB is authorized                              │ ║
║  │  • Validates JSON schema                                 │ ║
║  │  • Checks completeness                                   │ ║
║  │                                                           │ ║
║  │  If valid: HTTP 201 Created                              │ ║
║  │  If invalid: HTTP 400 Bad Request + errors               │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 4: Hub Stores Formula                                   ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Formula Registry (Database)                             │ ║
║  │                                                           │ ║
║  │  Stores:                                                  │ ║
║  │  • Complete formula JSON                                 │ ║
║  │  • Submission timestamp                                  │ ║
║  │  • Sender (MSB) identity                                 │ ║
║  │  • Target recipient(s)                                   │ ║
║  │  • Status: PENDING_VALIDATION                            │ ║
║  │  • Unique formula ID                                     │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 5: Hub Determines Recipients                            ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Routing Engine                                          │ ║
║  │                                                           │ ║
║  │  Based on:                                                │ ║
║  │  • Metering point IDs                                    │ ║
║  │  • Market location                                       │ ║
║  │  • Network area                                          │ ║
║  │  • Formula category                                      │ ║
║  │                                                           │ ║
║  │  Determines: Must be sent to 50Hertz (ÜNB)              │ ║
║  │              and Netzbetreiber XYZ (NB)                  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 6: Hub Validates (Business Rules)                       ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Validation Engine                                       │ ║
║  │                                                           │ ║
║  │  Checks:                                                  │ ║
║  │  • OBIS codes are valid                                  │ ║
║  │  • Formula category matches use case                     │ ║
║  │  • MSB is authorized for these metering points           │ ║
║  │  • Output resolution is acceptable                       │ ║
║  │  • All TSO-specific rules met                            │ ║
║  │                                                           │ ║
║  │  Result: VALIDATED ✓                                     │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 7: Hub Notifies Recipients                              ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Notification Service                                    │ ║
║  │                                                           │ ║
║  │  Sends to 50Hertz:                                       │ ║
║  │  • Webhook: POST https://50hertz.de/api/formula-received │ ║
║  │  • Email: formula-team@50hertz.de                        │ ║
║  │  • SMS: (if urgent)                                      │ ║
║  │                                                           │ ║
║  │  Sends to Netzbetreiber XYZ:                             │ ║
║  │  • Webhook notification                                  │ ║
║  │  • Dashboard alert                                       │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 8: Hub Updates Status                                   ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Status: DELIVERED                                       │ ║
║  │  Delivered to:                                           │ ║
║  │  • 50Hertz: ✓ (2025-12-03 14:35:22)                     │ ║
║  │  • NB XYZ: ✓ (2025-12-03 14:35:24)                      │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
             │                                    │
             │ 7. Webhook notification            │ 7. Webhook notification
             ▼                                    ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│  50Hertz (ÜNB)          │          │  Netzbetreiber XYZ (NB) │
│                         │          │                         │
│  Step 9: NB Receives    │          │  Step 9: NB Receives    │
│  Formula                │          │  Formula                │
│                         │          │                         │
│  • Webhook triggers     │          │  • Webhook triggers     │
│  • System fetches       │          │  • System fetches       │
│    formula from Hub:    │          │    formula from Hub:    │
│    GET /v1/formulas/ID  │          │    GET /v1/formulas/ID  │
│                         │          │                         │
│  • Validates locally    │          │  • Validates locally    │
│  • Imports to billing   │          │  • Imports to billing   │
│    system               │          │    system               │
│                         │          │                         │
│  Step 10: Confirms      │          │  Step 10: Confirms      │
│  Receipt                │          │  Receipt                │
│                         │          │                         │
│  POST /v1/formulas/     │          │  POST /v1/formulas/     │
│       {ID}/confirm      │          │       {ID}/confirm      │
│  {                      │          │  {                      │
│    status: "ACCEPTED",  │          │    status: "ACCEPTED",  │
│    confirmedBy:         │          │    confirmedBy:         │
│      "50Hertz"          │          │      "NB XYZ"           │
│  }                      │          │  }                      │
└───────────┬─────────────┘          └───────────┬─────────────┘
            │                                    │
            │ 8. Confirmation                    │ 8. Confirmation
            │    back to Hub                     │    back to Hub
            ▼                                    ▼
╔═══════════════════════════════════════════════════════════════╗
║                      Formula Registry                                 ║
║                                                                ║
║  Step 11: Hub Records Confirmations                           ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Delivery Status Updated                                 │ ║
║  │                                                           │ ║
║  │  Formula ID: FORM-BESS-001                               │ ║
║  │  Status: CONFIRMED_BY_ALL                                │ ║
║  │  • 50Hertz: ACCEPTED (2025-12-03 14:40:15)              │ ║
║  │  • NB XYZ: ACCEPTED (2025-12-03 14:42:03)               │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  Step 12: Hub Notifies Sender (MSB)                           ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  Notification to MSB                                     │ ║
║  │                                                           │ ║
║  │  Email: "Your formula FORM-BESS-001 has been             │ ║
║  │         accepted by all recipients"                      │ ║
║  │                                                           │ ║
║  │  Webhook to MSB system                                   │ ║
║  └─────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝
             │
             │ 9. Confirmation notification
             ▼
┌──────────────────────────┐
│  MSB (Company A)         │
│                          │
│  Step 13: MSB Informed   │
│                          │
│  • Receives confirmation │
│  • Updates internal      │
│    status                │
│  • Formula is now active │
│    for billing           │
└──────────────────────────┘
```

---

## Parallel Process: NB/Hub Operator Queries

While the above flow is happening, Hub operators and NBs can query the Hub:

```
╔═══════════════════════════════════════════════════════════════╗
║                      Formula Registry                                 ║
║                   (Always Available)                          ║
╚═══════════════════════════════════════════════════════════════╝
             ▲                                    ▲
             │ GET /v1/formulas                   │ GET /v1/formulas
             │ (Query all formulas)               │ ?sender=MSB-X
             │                                    │
┌────────────┴───────────┐          ┌────────────┴──────────────┐
│  Hub Operator          │          │  NB System                │
│  (50Hertz employee)    │          │  (Automated query)        │
│                        │          │                           │
│  • Opens Hub web UI    │          │  • Daily sync job         │
│  • Views all formulas  │          │  • Fetches new formulas   │
│  • Filters by status   │          │  • Updates local database │
│  • Validates manually  │          │                           │
│  • Generates reports   │          │                           │
└────────────────────────┘          └───────────────────────────┘
```

---

## Key Business Roles & Responsibilities

### 1. MSB (Metering Point Operator)

**Responsibilities:**
- Create formulas for their metering concepts
- Submit formulas to Formula Registry
- Ensure formula correctness
- Respond to validation errors
- Track delivery status

**Interactions with Hub:**
- `POST /v1/formulas` - Submit formula
- `GET /v1/formulas/{id}` - Check status
- `PUT /v1/formulas/{id}` - Update formula
- Receives notifications on acceptance/rejection

### 2. Formula Registry (Operated by 4 TSOs)

**Responsibilities:**
- Receive formulas from all MSBs
- Validate against TSO standards
- Store in central registry
- Route to correct recipients
- Track delivery and confirmations
- Provide audit trail
- Generate reports and statistics
- Ensure data integrity and security

**Provides:**
- REST API for all market participants
- Web UI for Hub operators
- Web portal for MSBs (optional)
- Query interface for NBs
- Notification service
- Audit logging

### 3. NB (Grid Operator) / TSO

**Responsibilities:**
- Receive formula notifications
- Fetch formulas from Hub
- Validate locally
- Confirm receipt
- Import to billing systems
- Use formulas for calculations

**Interactions with Hub:**
- Receives webhooks on new formulas
- `GET /v1/formulas/{id}` - Fetch formula
- `POST /v1/formulas/{id}/confirm` - Confirm receipt
- `GET /v1/formulas?recipient=ME` - Query my formulas

### 4. Hub Operators (TSO Employees)

**Responsibilities:**
- Monitor Hub operations
- Validate formulas manually (if needed)
- Resolve issues
- Generate reports
- Maintain Hub infrastructure

**Uses:**
- Hub web UI (your demo)
- `GET /v1/formulas` - View all formulas
- `GET /v1/audit-log` - View activity
- `GET /v1/statistics` - Generate reports

---

## Timeline Example

### Real-World Scenario

**Date: 2025-12-03**

| Time | Event | Actor | Action |
|------|-------|-------|--------|
| 10:00 | Formula Created | MSB | Engineer creates BESS formula |
| 10:15 | Submitted to Hub | MSB | POST /v1/formulas |
| 10:15 | Validation | Hub | Automatic validation passes |
| 10:16 | Stored | Hub | Saved to registry |
| 10:16 | Routing | Hub | Determines recipients |
| 10:16 | Notification | Hub | Webhooks to 50Hertz, NB XYZ |
| 10:17 | Received | 50Hertz | System fetches formula |
| 10:18 | Received | NB XYZ | System fetches formula |
| 10:20 | Validated | 50Hertz | Local validation passes |
| 10:22 | Validated | NB XYZ | Local validation passes |
| 10:23 | Confirmed | 50Hertz | POST /formulas/{id}/confirm |
| 10:25 | Confirmed | NB XYZ | POST /formulas/{id}/confirm |
| 10:26 | All Confirmed | Hub | Status updated |
| 10:26 | MSB Notified | Hub | Email/webhook to MSB |
| 10:30 | MSB Informed | MSB | Formula now active |

**Total Time: 30 minutes** (vs. days/weeks with EDIFACT)

---

## Error Scenarios

### Scenario 1: Invalid Formula

```
MSB submits formula
    ↓
Hub validates
    ↓
ERROR: Missing required parameter
    ↓
HTTP 400 Bad Request
{
  "error": "VALIDATION_ERROR",
  "details": "Parameter 'grenze' is required for Anteil_Groesser_Als"
}
    ↓
MSB fixes and resubmits
```

### Scenario 2: NB Rejects Formula

```
MSB submits → Hub validates → Hub notifies NB
    ↓
NB reviews formula
    ↓
NB finds issue (e.g., wrong OBIS code)
    ↓
POST /formulas/{id}/confirm
{
  "status": "REJECTED",
  "reason": "OBIS code mismatch",
  "details": "Expected 1-1:1.29.0, got 1-1:2.29.0"
}
    ↓
Hub notifies MSB
    ↓
MSB corrects and resubmits
```

### Scenario 3: Hub Operator Manual Review

```
MSB submits → Hub automatic validation passes
    ↓
BUT: Formula is unusual (new pattern)
    ↓
Hub flags for manual review
    ↓
Status: PENDING_MANUAL_REVIEW
    ↓
Hub operator reviews in web UI
    ↓
Operator: APPROVED
    ↓
Hub continues with routing
```

---

## Data Flow Details

### Formula Submission (MSB → Hub)

```http
POST /v1/formulas HTTP/1.1
Host: api.formula-registry.example
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "messageId": "MSG-MSB-A-20251203-001",
  "messageDate": "2025-12-03T10:15:00Z",
  "sender": {
    "id": "DE0299900000001",
    "role": "MSB",
    "name": "Messstellenbetreiber A GmbH"
  },
  "targetRecipients": [
    {
      "id": "DE0250HERTZ",
      "role": "UENB",
      "name": "50Hertz Transmission GmbH"
    },
    {
      "id": "DE02NB-XYZ",
      "role": "NB",
      "name": "Netzbetreiber XYZ"
    }
  ],
  "formulas": [{
    "formulaId": "FORM-BESS-BATT1-20251203",
    "name": "W+Batt1 oEV",
    "description": "Battery charging without self-consumption",
    "category": "SELF_CONSUMPTION",
    "expression": {
      "function": "Wenn_Dann",
      "parameters": [...]
    },
    "inputMeteringPoints": [...],
    "inputTimeSeries": [...],
    "outputUnit": "KWH",
    "outputResolution": "PT15M",
    "outputObisCode": "1-1:1.29.0",
    "metadata": {
      "marketLocationId": "10550000000001",
      "facilityType": "BATTERY",
      "billingRelevant": true,
      "networkUsageRelevant": true
    }
  }]
}
```

**Hub Response:**

```http
HTTP/1.1 201 Created
Location: /v1/formulas/FORM-BESS-BATT1-20251203
Content-Type: application/json

{
  "messageId": "MSG-MSB-A-20251203-001",
  "acceptanceTime": "2025-12-03T10:15:05Z",
  "status": "ACCEPTED",
  "formulaIds": ["FORM-BESS-BATT1-20251203"],
  "validationResults": [{
    "formulaId": "FORM-BESS-BATT1-20251203",
    "valid": true,
    "checks": [
      {"check": "schema", "passed": true},
      {"check": "obis_codes", "passed": true},
      {"check": "parameters", "passed": true},
      {"check": "category", "passed": true}
    ]
  }],
  "deliveryStatus": {
    "status": "PENDING_DELIVERY",
    "recipients": [
      {"id": "DE0250HERTZ", "status": "NOTIFYING"},
      {"id": "DE02NB-XYZ", "status": "NOTIFYING"}
    ]
  },
  "trackingUrl": "https://api.formula-registry.example/v1/formulas/FORM-BESS-BATT1-20251203/status"
}
```

### Formula Query (NB → Hub)

```http
GET /v1/formulas?recipient=DE0250HERTZ&status=VALIDATED HTTP/1.1
Host: api.formula-registry.example
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

HTTP/1.1 200 OK
Content-Type: application/json

{
  "formulas": [
    {
      "formulaId": "FORM-BESS-BATT1-20251203",
      "name": "W+Batt1 oEV",
      "sender": {"id": "DE0299900000001", "name": "MSB A GmbH"},
      "receivedAt": "2025-12-03T10:15:05Z",
      "status": "VALIDATED",
      "deliveryStatus": "DELIVERED",
      "confirmationRequired": true,
      "confirmedByMe": false,
      "links": {
        "self": "/v1/formulas/FORM-BESS-BATT1-20251203",
        "confirm": "/v1/formulas/FORM-BESS-BATT1-20251203/confirm"
      }
    },
    ...
  ],
  "totalCount": 15,
  "page": 1,
  "pageSize": 20
}
```

---

## Hub Operator Dashboard Workflow

### What Hub Operators See (Your Demo's Receiver Interface)

```
╔═══════════════════════════════════════════════════════════════╗
║              Formula Registry - Operations Dashboard                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  Statistics:                                                   ║
║  • Total Formulas: 1,247                                      ║
║  • Pending Validation: 5                                      ║
║  • Awaiting Confirmation: 12                                  ║
║  • Active: 1,230                                              ║
║                                                                ║
║  Recent Submissions:                                           ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ FORM-BESS-BATT1  ✓ VALIDATED    MSB A → 50Hertz, NB XYZ │║
║  │ 10:15 today      12 parameters  Self-Consumption         │║
║  │ [View Details] [Approve] [Reject]                         │║
║  └──────────────────────────────────────────────────────────┘║
║                                                                ║
║  Alerts:                                                       ║
║  ⚠ 5 formulas pending manual review                          ║
║  ⚠ 2 formulas rejected by recipients                         ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Summary: The Complete Business Flow

### In One Sentence

**The Formula Registry receives formulas from MSBs, validates them, stores them in a central registry, routes them to the correct recipients (NBs/ÜNBs), tracks confirmations, and provides a query interface for all market participants.**

### Key Value of the Hub

1. **Central Authority** - Single source of truth for all formulas
2. **Validation** - Ensures quality before distribution
3. **Routing** - Knows who needs what
4. **Tracking** - Full audit trail
5. **Availability** - 24/7 access for queries
6. **Security** - OAuth2, role-based access
7. **Modernization** - REST API instead of EDIFACT

### Your Demo Shows

✅ **Formula Submission** - How MSBs submit to Hub (Builder page)
✅ **Hub Validation** - Automatic validation (Backend API)
✅ **Hub Registry** - Central storage (Database)
✅ **Hub Operations** - How operators validate (Receiver page)
✅ **Query Interface** - How participants query (List page)

**This IS the Formula Registry** - the central platform that makes the entire market work!
