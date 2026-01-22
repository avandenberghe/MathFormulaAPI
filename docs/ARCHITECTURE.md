# Energy Formula API - System Architecture

## Table of Contents

1. [Overview](#overview)
2. [C4 Model Diagrams](#c4-model-diagrams)
   - [C1: System Context Diagram](#c1-system-context-diagram)
   - [C2: Container Diagram](#c2-container-diagram)
3. [Technology Stack](#technology-stack)
4. [Deployment Architecture](#deployment-architecture)
5. [Security Architecture](#security-architecture)
6. [Data Flow](#data-flow)

---

## Overview

The Energy Formula API System enables standardized transmission of calculation formulas between market participants in the energy market as a modern alternative to EDIFACT UTILTS.

**Main Objectives:**
- Transmission of complex formulas as structured JSON data
- Replacement of cumbersome EDIFACT step-by-step transmission
- Bidirectional communication between metering point operators (MSB) and grid operators (NB)
- Transparent formula validation and confirmation

---

## C4 Model Diagrams

### C1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Energy Market                               │
│                                                                      │
│  ┌──────────────┐                                  ┌──────────────┐ │
│  │              │                                  │              │ │
│  │ Metering     │  Transmit formula               │ Grid         │ │
│  │ Point        │─────────────────────────────────▶│ Operator     │ │
│  │ Operator     │                                  │ (NB/TSO)     │ │
│  │ (MSB)        │  Receive confirmation            │              │ │
│  │              │◀─────────────────────────────────│              │ │
│  └──────┬───────┘                                  └───────┬──────┘ │
│         │                                                  │        │
│         │ 1. Create formula                               │        │
│         │ 2. Transmit JSON                                │        │
│         │                                                  │        │
│         │                                                  │ 3. Receive
│         │                                                  │ 4. Validate
│         │                                                  │        │
│         └──────────────────┐         ┌───────────────────┘        │
│                            │         │                             │
│                      ┌─────▼─────────▼──────┐                      │
│                      │                       │                      │
│                      │  Energy Formula API    │                      │
│                      │                       │                      │
│                      │  • Formula Builder    │                      │
│                      │  • REST API           │                      │
│                      │  • Formula Receiver   │                      │
│                      │                       │                      │
│                      └───────────────────────┘                      │
│                                                                      │
│  External Systems:                                                   │
│  ┌─────────────┐           ┌─────────────┐      ┌──────────────┐  │
│  │             │           │             │      │              │  │
│  │ Smart Meter │          │ Billing     │      │ Formula      │  │
│  │ Gateway     │          │ System      │      │ Registry     │  │
│  │ (OBIS)      │          │             │      │ (future)     │  │
│  │             │           │             │      │              │  │
│  └─────────────┘           └─────────────┘      └──────────────┘  │
│       │                          │                      │           │
│       └──────────────────────────┴──────────────────────┘           │
│                                  │                                  │
│                     Future Integration                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Legend:
─────▶  Data flow / API call
```

**Description:**
- **MSB (Metering Point Operator)**: Creates formulas for balancing, sends via API
- **NB (Grid Operator)**: Receives formulas, validates and confirms
- **Energy Formula API**: Central transmission platform
- **External Systems**: Integration for complete workflow (Phase 2)

---

### C2: Container Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Energy Formula API System                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend (Port 3000)                        │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│ │
│  │  │                  │  │                  │  │                  ││ │
│  │  │ Formula Builder  │  │ Formula Receiver │  │    Dashboard     ││ │
│  │  │                  │  │                  │  │                  ││ │
│  │  │  (Sender/MSB)    │  │  (Receiver/NB)   │  │  (Statistics)    ││ │
│  │  │                  │  │                  │  │                  ││ │
│  │  │ • Template Select│  │ • Formula List   │  │ • Health Status  ││ │
│  │  │ • Formula Create │  │ • Validation     │  │ • API Status     ││ │
│  │  │ • Live Preview   │  │ • Confirmation   │  │ • Metrics        ││ │
│  │  │                  │  │                  │  │                  ││ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘│ │
│  │           │                     │                     │          │ │
│  │           └─────────────────────┴─────────────────────┘          │ │
│  │                                 │                                 │ │
│  │  Technology: React 18 + TypeScript + Vite + Tailwind CSS         │ │
│  │  Deployment: Nginx (Docker Container)                            │ │
│  └─────────────────────────────────┬─────────────────────────────────┘ │
│                                    │                                   │
│                        REST API (HTTPS/JSON)                          │
│                      OAuth2 Bearer Token Auth                         │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                         Backend API (Port 8000)                    │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│ │
│  │  │                  │  │                  │  │                  ││ │
│  │  │ Formula API      │  │ Time Series API  │  │ Calculation API  ││ │
│  │  │                  │  │                  │  │                  ││ │
│  │  │ POST /formulas   │  │ POST /timeseries │  │ POST /calculations│ │
│  │  │ GET /formulas    │  │ GET /timeseries  │  │ GET /calculations││ │
│  │  │ GET /formulas/id │  │ GET /timeseries/id│ │                  ││ │
│  │  │                  │  │                  │  │                  ││ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘│ │
│  │           │                     │                     │          │ │
│  │           └─────────────────────┴─────────────────────┘          │ │
│  │                                 │                                 │ │
│  │  ┌──────────────────────────────▼──────────────────────────────┐ │ │
│  │  │                                                              │ │ │
│  │  │                     Formula Engine                           │ │ │
│  │  │                                                              │ │ │
│  │  │  • Wenn_Dann        • Grp_Sum         • Quer_Max            │ │ │
│  │  │  • Anteil_GT/LT     • IMax/IMin       • Quer_Min            │ │ │
│  │  │  • Groesser_Als     • Round           • Conv_RKMG           │ │ │
│  │  │                                                              │ │ │
│  │  │  11 TSO-required calculation functions                      │ │ │
│  │  │                                                              │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                 │                                 │ │
│  │  Technology: Python 3.12 + Flask 3.0                             │ │
│  │  Deployment: Docker Container                                    │ │
│  └─────────────────────────────────┬─────────────────────────────────┘ │
│                                    │                                   │
│  ┌─────────────────────────────────▼─────────────────────────────────┐ │
│  │                      In-Memory Storage                             │ │
│  │                                                                     │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐          │ │
│  │  │   Formulas   │   │ Time Series  │   │ Calculations │          │ │
│  │  │  Dictionary  │   │  Dictionary  │   │  Dictionary  │          │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘          │ │
│  │                                                                     │ │
│  │  Note: Production would use persistent DB (PostgreSQL)            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│  OAuth2 Service    │
│                    │
│  Mock OAuth2 Token │
│  Generation        │
│                    │
│  (In Production:   │
│   Keycloak/Auth0)  │
└────────────────────┘
```

**Container Overview:**

| Container | Technology | Port | Purpose |
|-----------|-------------|------|-------|
| Frontend | React 18 + TypeScript + Nginx | 3000 | Web UI for sender and receiver |
| Backend API | Python 3.12 + Flask 3.0 | 8000 | REST API for formula transmission |
| OAuth2 | Mock (Production: Keycloak) | 8000 | Authentication |
| Storage | In-Memory Dict (Production: PostgreSQL) | - | Data persistence |

**Component Description:**

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| **API Layer** | OAuth2 Middleware | Token validation, authentication |
| | Request Validator | JSON schema validation |
| | Error Handler | Unified error handling |
| **Endpoint Layer** | Formula Endpoints | REST endpoints for formulas |
| | TimeSeries Endpoints | REST endpoints for time series |
| | Calculation Endpoints | REST endpoints for calculations |
| **Service Layer** | Formula Service | Business logic for formula management |
| | TimeSeries Service | Business logic for time series management |
| | Calculation Service | Orchestration of calculations |
| **Business Logic** | Formula Engine | Implementation of 11 calculation functions |
| | Expression Parser | Parsing nested expressions |
| **Data Layer** | Repositories | Abstraction for data access |
| | Storage | In-Memory / PostgreSQL |


**Frontend Components:**

| Layer | Component | Technology | Purpose |
|-------|-----------|-------------|-------|
| **Router** | React Router | React Router 6 | Client-side routing |
| **Pages** | Dashboard | React + Hooks | Overview and statistics |
| | Formula Builder | React + Hooks | Formula creation (MSB) |
| | Formula Receiver | React + Hooks | Formula reception (NB) |
| | Formula List | React + Hooks | Formula management |
| **Components** | FormulaCard | React | Formula display |
| | DetailModal | React | Detail view |
| | ValidationBadge | React | Status display |
| **Services** | API Service | Axios | REST API client |
| | OAuth2 Interceptor | Axios Interceptors | Auto-auth |
| **Data** | Types | TypeScript | Type definitions |
| | Templates | JSON | Preconfigured formulas |

---

## Technology Stack

### Frontend

| Component | Technology | Version | Purpose |
|------------|-------------|---------|-------|
| Framework | React | 18.2.0 | UI Framework |
| Language | TypeScript | 5.3.3 | Type-safe development |
| Build Tool | Vite | 5.0.8 | Dev server & build |
| Styling | Tailwind CSS | 3.3.6 | Utility-first CSS |
| HTTP Client | Axios | 1.6.2 | REST API calls |
| Router | React Router | 6.x | Client-side routing |
| Icons | Lucide React | Latest | Icon library |
| Web Server | Nginx | Alpine | Static file serving |

### Backend

| Component | Technology | Version | Purpose |
|------------|-------------|---------|-------|
| Runtime | Python | 3.12 | Application runtime |
| Framework | Flask | 3.0 | Web framework |
| CORS | Flask-CORS | Latest | Cross-origin support |
| Storage | In-Memory Dict | - | Mock storage (demo) |
| Production DB | PostgreSQL | 15+ | Recommended for production |
| Auth | Mock OAuth2 | - | Token generation |

### Infrastructure

| Component | Technology | Purpose |
|------------|-------------|-------|
| Containerization | Docker | 24.x | Application packaging |
| Orchestration | Docker Compose | V2 | Multi-container management |
| Reverse Proxy | Nginx | Alpine | Frontend web server |
| API Gateway | Nginx Proxy | - | API routing |

---

## Deployment Architecture

### Docker Compose Setup

```yaml
services:
  formula-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=development
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s

  formula-frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      formula-api:
        condition: service_healthy
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
```

### Network Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Host Machine                          │
│                                                            │
│  Port 3000              Port 8000                          │
│      │                     │                               │
│      ▼                     ▼                               │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │                 │  │                 │                │
│  │  Frontend       │  │  Backend API    │                │
│  │  (Nginx:80)     │  │  (Flask:8000)   │                │
│  │                 │  │                 │                │
│  │  React SPA      │  │  REST API       │                │
│  │  + Templates    │  │  + Formula      │                │
│  │                 │  │    Engine       │                │
│  │                 │  │                 │                │
│  └────────┬────────┘  └────────┬────────┘                │
│           │                    │                          │
│           │  /api/* proxy      │                          │
│           └────────────────────┘                          │
│                                                            │
│  Docker Network: formula-network (bridge)                   │
│                                                            │
│  Service Discovery: DNS (formula-api, formula-frontend)       │
│                                                            │
└────────────────────────────────────────────────────────────┘

Browser ──HTTPS──▶ localhost:3000 (Frontend)
                       │
                       │ XHR Requests to /api/*
                       ▼
                   Nginx Proxy Config:
                   location /api/ {
                     proxy_pass http://formula-api:8000/;
                   }
                       │
                       ▼
                   formula-api:8000 (Backend)
```

### Production Deployment (Recommended)

```
┌────────────────────────────────────────────────────────────────┐
│                      Cloud Provider (AWS/Azure/GCP)            │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Load Balancer (HTTPS)                  │ │
│  │                  SSL/TLS Termination                      │ │
│  └───────────────────────┬──────────────────────────────────┘ │
│                          │                                     │
│         ┌────────────────┴────────────────┐                   │
│         ▼                                 ▼                   │
│  ┌─────────────────┐              ┌─────────────────┐        │
│  │  Frontend       │              │  Backend API    │        │
│  │  Kubernetes Pod │              │  Kubernetes Pod │        │
│  │  (3 Replicas)   │              │  (3 Replicas)   │        │
│  └─────────────────┘              └────────┬────────┘        │
│                                             │                 │
│                                             ▼                 │
│                                    ┌─────────────────┐        │
│                                    │  PostgreSQL     │        │
│                                    │  (Managed DB)   │        │
│                                    └─────────────────┘        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Monitoring & Logging                    │ │
│  │  • Prometheus (Metrics)                                  │ │
│  │  • Grafana (Dashboards)                                  │ │
│  │  • ELK Stack (Logs)                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication & Authorization

```
┌──────────────────────────────────────────────────────────────┐
│                   Security Architecture                       │
│                                                               │
│  ┌─────────────┐                                             │
│  │   Browser   │                                             │
│  └──────┬──────┘                                             │
│         │                                                    │
│         │ 1. Initial Request (no token)                     │
│         ▼                                                    │
│  ┌──────────────────┐                                        │
│  │  Frontend API    │                                        │
│  │  Service         │                                        │
│  └──────┬───────────┘                                        │
│         │                                                    │
│         │ 2. Interceptor detects missing token              │
│         ▼                                                    │
│  ┌──────────────────────────────────┐                       │
│  │  OAuth2 Auto-Authentication      │                       │
│  │                                   │                       │
│  │  POST /oauth/token                │                       │
│  │  {                                │                       │
│  │    grant_type: "client_credentials"│                      │
│  │    client_id: "demo-client"       │                       │
│  │    client_secret: "demo-secret"   │                       │
│  │    scope: "formulas.read..."      │                       │
│  │  }                                │                       │
│  └──────┬───────────────────────────┘                       │
│         │                                                    │
│         │ 3. Token Response                                 │
│         ▼                                                    │
│  ┌──────────────────┐                                        │
│  │  Access Token    │                                        │
│  │  (JWT)           │                                        │
│  │                  │                                        │
│  │  Stored in:      │                                        │
│  │  • Memory        │                                        │
│  │  • Axios Header  │                                        │
│  └──────┬───────────┘                                        │
│         │                                                    │
│         │ 4. All subsequent requests                        │
│         ▼                                                    │
│  ┌──────────────────────────────────┐                       │
│  │  Authorization: Bearer {token}   │                       │
│  └──────┬───────────────────────────┘                       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                        │
│  │  Backend API     │                                        │
│  │  validate_token()│                                        │
│  └──────────────────┘                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Security Layers

| Layer | Mechanism | Description |
|-------|-------------|--------------|
| **Transport** | HTTPS/TLS 1.3 | Encrypted communication |
| **Authentication** | OAuth2 Client Credentials | Token-based authentication |
| **Authorization** | Scope-based | Granular permissions |
| **API Security** | Rate Limiting | DDoS protection |
| **Data Validation** | JSON Schema | Input validation |
| **Error Handling** | Masked Errors | No sensitive info in errors |

---

## Data Flow

### Formula Transmission (MSB → NB)

```
┌──────────────┐                                    ┌──────────────┐
│              │                                    │              │
│   MSB User   │                                    │   NB User    │
│              │                                    │              │
└──────┬───────┘                                    └───────┬──────┘
       │                                                    │
       │ 1. Opens Formula Builder                          │
       │    http://localhost:3000/builder                  │
       │                                                    │
       ▼                                                    │
┌─────────────────────────┐                                │
│  Formula Builder Page   │                                │
│                         │                                │
│  • Selects template     │                                │
│  • Fills form           │                                │
│  • Sees live preview    │                                │
│                         │                                │
└────────┬────────────────┘                                │
         │                                                  │
         │ 2. Clicks "Save Formula"                        │
         ▼                                                  │
┌─────────────────────────┐                                │
│  formulaApi.submit()    │                                │
│                         │                                │
│  Wraps formula in:      │                                │
│  {                      │                                │
│    messageId: "MSG-..." │                                │
│    sender: {...}        │                                │
│    formulas: [...]      │                                │
│  }                      │                                │
└────────┬────────────────┘                                │
         │                                                  │
         │ 3. POST /v1/formulas                            │
         │    Authorization: Bearer {token}                │
         ▼                                                  │
┌─────────────────────────┐                                │
│  Backend API            │                                │
│                         │                                │
│  • Validate token       │                                │
│  • Validate JSON schema │                                │
│  • Store in formula_store│                               │
│  • Return acceptance    │                                │
│                         │                                │
└────────┬────────────────┘                                │
         │                                                  │
         │ 4. Response 201 Created                         │
         │    {                                             │
         │      status: "ACCEPTED",                         │
         │      formulaIds: ["FORM-..."]                    │
         │    }                                             │
         ▼                                                  │
┌─────────────────────────┐                                │
│  "Saved!" Message       │                                │
└─────────────────────────┘                                │
                                                            │
                                              5. Opens Formula Receiver
                                                 http://localhost:3000/receiver
                                                            │
                                                            ▼
                                                  ┌─────────────────────────┐
                                                  │ Formula Receiver Page   │
                                                  │                         │
                                                  │ • GET /v1/formulas      │
                                                  │ • Shows all formulas    │
                                                  │ • Validates structure   │
                                                  │ • Checks parameters     │
                                                  │                         │
                                                  └────────┬────────────────┘
                                                           │
                                              6. Clicks on formula          │
                                                           ▼
                                                  ┌─────────────────────────┐
                                                  │ Detail Modal            │
                                                  │                         │
                                                  │ • Shows all parameters  │
                                                  │ • Shows expression      │
                                                  │ • Shows complete JSON   │
                                                  │ • Accept/Reject buttons │
                                                  │                         │
                                                  └─────────────────────────┘
```

### Sequence Diagram: Complete Flow

```
MSB User    Formula Builder    API Service    Backend API    Storage    Formula Receiver    NB User
   │               │               │               │            │              │              │
   │ Open Builder  │               │               │            │              │              │
   ├──────────────▶│               │               │            │              │              │
   │               │               │               │            │              │              │
   │ Select Template│              │               │            │              │              │
   ├──────────────▶│               │               │            │              │              │
   │               │               │               │            │              │              │
   │ Fill Form     │               │               │            │              │              │
   ├──────────────▶│               │               │            │              │              │
   │               │               │               │            │              │              │
   │ Click Save    │               │               │            │              │              │
   ├──────────────▶│               │               │            │              │              │
   │               │ submit()      │               │            │              │              │
   │               ├──────────────▶│               │            │              │              │
   │               │               │ POST /formulas│            │              │              │
   │               │               ├──────────────▶│            │              │              │
   │               │               │               │ store()    │              │              │
   │               │               │               ├───────────▶│              │              │
   │               │               │               │            │              │              │
   │               │               │               │ OK         │              │              │
   │               │               │               │◀───────────┤              │              │
   │               │               │               │            │              │              │
   │               │               │ 201 CREATED   │            │              │              │
   │               │               │◀──────────────┤            │              │              │
   │               │ Success       │               │            │              │              │
   │               │◀──────────────┤               │            │              │              │
   │ "Saved!"      │               │               │            │              │              │
   │◀──────────────┤               │               │            │              │              │
   │               │               │               │            │              │              │
   │               │               │               │            │              │ Open Receiver│
   │               │               │               │            │              │◀─────────────┤
   │               │               │               │            │              │              │
   │               │               │               │            │              │ list()       │
   │               │               │               │            │              ├─────────────▶│
   │               │               │               │            │              │              │
   │               │               │               │ GET /formulas            │              │
   │               │               │               │◀──────────────────────────┤              │
   │               │               │               │            │              │              │
   │               │               │               │ retrieve() │              │              │
   │               │               │               ├───────────▶│              │              │
   │               │               │               │            │              │              │
   │               │               │               │ formulas   │              │              │
   │               │               │               │◀───────────┤              │              │
   │               │               │               │            │              │              │
   │               │               │ 200 OK + formulas         │              │              │
   │               │               │               ├──────────────────────────▶│              │
   │               │               │               │            │              │              │
   │               │               │               │            │              │ Display List │
   │               │               │               │            │              ├─────────────▶│
   │               │               │               │            │              │              │
   │               │               │               │            │              │ View Details │
   │               │               │               │            │              │◀─────────────┤
   │               │               │               │            │              │              │
   │               │               │               │            │              │ See all params│
   │               │               │               │            │              ├─────────────▶│
```

---

## Extensibility

### Future Integrations

```
┌──────────────────────────────────────────────────────────────────┐
│                      Phase 2: Integrations                        │
│                                                                   │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │                │         │                │                  │
│  │ Smart Meter    │────────▶│ Energy Formula │                  │
│  │ Gateway        │  OBIS   │ API            │                  │
│  │                │  Data   │                │                  │
│  └────────────────┘         └────────┬───────┘                  │
│                                      │                           │
│  ┌────────────────┐                  │                           │
│  │                │                  │                           │
│  │ Formula        │◀─────────────────┤                           │
│  │ Registry       │  Formula Export  │                           │
│  │                │                  │                           │
│  └────────────────┘                  │                           │
│                                      │                           │
│  ┌────────────────┐                  │                           │
│  │                │                  │                           │
│  │ Billing System │◀─────────────────┘                           │
│  │ (SAP IS-U)     │  Calculation Results                        │
│  │                │                                              │
│  └────────────────┘                                              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture enables:

✅ **Modern formula transmission** - JSON instead of EDIFACT
✅ **Bidirectional communication** - Sender and receiver UI
✅ **Scalability** - Docker + Kubernetes-ready
✅ **Security** - OAuth2 + HTTPS + Validation
✅ **Extensibility** - Modular, loosely coupled
✅ **Transparency** - Full traceability

**Technology Decisions:**
- React/TypeScript for type-safe frontend
- Python/Flask for flexible backend development
- Docker for consistent deployments
- OAuth2 for standardized authentication
- REST/JSON for modern API integration

**Next Steps:**
1. PostgreSQL integration for production
2. Keycloak for real OAuth2 integration
3. Kubernetes manifests for cloud deployment
4. Monitoring & Observability (Prometheus/Grafana)
5. API Gateway (Kong/Traefik) for extended features
