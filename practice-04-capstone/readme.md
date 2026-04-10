# Capstone: Orchestrated EAI System

## 1. Architecture Decision

**Chosen Approach: Option A (Node-RED as Entry Point)**
I chose this approach because it follows the **Pure Orchestrator** pattern. By making Node-RED the entry point, the business logic is completely decoupled from the individual microservices. This makes the system more flexible: we can change the order of steps or scale individual components without ever touching the code of the `Order Service`.

---

## 2. Architecture Diagrams

### 2.1 System Context Diagram

```mermaid
graph TD
    Client[Customer/Client] -- "POST /order (JSON/XML)" --> NR[Node-RED Orchestrator]
    
    subgraph "Internal Services"
        NR -- "HTTP/REST" --> OS[Order Service]
        NR -- "HTTP/REST" --> PS[Payment Service]
        NR -- "HTTP/REST" --> IS[Inventory Service]
        NR -- "HTTP/REST" --> NS[Notification Service]
    end

    NR -- "AMQP" --> RMQ[(RabbitMQ DLQ)]
```
---

## 2.2 Integration Architecture Diagram

```mermaid
graph TD
    subgraph Client_Layer [External Layer]
        User((User/Client))
        CURL[Terminal / cURL]
    end

    subgraph Entry_Layer [Security & API Gateway Layer]
        NR_HTTP[Node-RED HTTP In: /order]
        NR_Admin[Node-RED Admin API: /reset]
    end

    subgraph Orchestration_Layer [Enterprise Integration Layer - Node-RED]
        direction TB
        Logic[Saga Orchestrator Logic]
        Router{Content-Based Router}
        Trans[Message Translator]
        Error[Error Handler / Catch]
    end

    subgraph Service_Layer [Microservices Layer - Docker Containers]
        OS[Order Service :3001]
        PS[Payment Service :3002]
        IS[Inventory Service :3003]
        NS[Notification Service :3004]
    end

    subgraph Messaging_Layer [Reliability & Messaging Layer]
        MQ[(RabbitMQ Message Broker)]
        DLQ[Dead Letter Queue: payment.dlq]
    end

    User --> NR_HTTP
    CURL --> NR_HTTP
    CURL --> NR_Admin
    NR_HTTP --> Logic
    NR_Admin --> OS & PS & IS
    Logic --> Router
    Router --> Trans
    Trans -- "REST API" --> OS
    Trans -- "REST API" --> PS
    Trans -- "REST API" --> IS
    Trans -- "REST API" --> NS
    Error -- "AMQP" --> MQ
    MQ --> DLQ

    style Entry_Layer fill:#ffd54f,stroke:#fbc02d,stroke-width:2px,color:#000
    style Orchestration_Layer fill:#81c784,stroke:#388e3c,stroke-width:2px,color:#000
    style Service_Layer fill:#64b5f6,stroke:#1976d2,stroke-width:2px,color:#000
    style Messaging_Layer fill:#ba68c8,stroke:#7b1fa2,stroke-width:2px,color:#000
    style Client_Layer fill:#eceff1,stroke:#90a4ae,stroke-dasharray: 5 5,color:#000

    linkStyle default stroke:#ffffff,stroke-width:2px
```
---

## 2.3 Orchestration Flow

```mermaid
flowchart TD
    
    classDef startEnd fill:#a04070,stroke:#333,stroke-width:2px,color:#fff;
    classDef process fill:#4488cc,stroke:#333,stroke-width:1px,color:#fff;
    classDef decision fill:#2277bb,stroke:#333,stroke-width:1px,color:#fff;

    Start((Start)):::startEnd --> Receive[Customer Places Order]:::process
    Receive --> CreateOrder[Order Service: Create Record]:::process
    
    
    CreateOrder --> PayCheck{Payment Authorized?}:::decision
    
    PayCheck -- No --> SetFail[Status: FAILED]:::process
    
    PayCheck -- Yes --> InvCheck{Inventory Reserved?}:::decision

    
    InvCheck -- Yes --> Notify[Notification Service: Send Email]:::process
    Notify --> SetComplete[Status: COMPLETED]:::process
    
   
    InvCheck -- No --> Refund[Payment Service: REFUND]:::process
    Refund --> SetComp[Status: COMPENSATED]:::process

   
    SetFail --> End((End)):::startEnd
    SetComplete --> End
    SetComp --> End

    subgraph Legend [Process Flow]
        direction LR
        L1[Success Path] --- L2[Failure Path] --- L3[Compensation Path]
    end
```
---
## 3. Pattern Mapping Table

| Pattern | Category | Problem It Solves | Where Applied | Why Chosen |
| :--- | :--- | :--- | :--- | :--- |
| **Content-Based Router** | Routing & Flow | Handling different order formats (Standard vs Express). | Node-RED `switch` node at process start. | Allows the system to process multiple input types in one flow. |
| **Correlation Identifier** | Coordination | Tracking a single transaction across distributed services. | `msg.correlationId` passed in every request. | Essential for linking payments to refunds and log tracing. |
| **Message Translator** | Transformation | Incompatible API schemas between independent services. | Node-RED `change` nodes before HTTP calls. | Enables loose coupling so services stay independent. |
| **Saga (Orchestration)** | Coordination | Maintaining consistency without a shared Database. | Node-RED flow logic and compensation paths. | Ensures reliable rollbacks (Refunds) if a step fails. |

---

## 4. Failure Analysis

I successfully implemented and tested the two mandatory failure scenarios to ensure system reliability:

### Scenario 1: Payment Rejection
* **Setup**: `PAYMENT_FAIL_MODE` set to `always` in `docker-compose.yml`.
* **System Reaction**: The Payment Service returns a **402 Payment Required** status. Node-RED detects this via a `switch` node and immediately halts the orchestration.
* **Final State**: API returns `status: failed`. The Inventory service is **never called**.

### Scenario 2: Inventory Unavailable (Compensation)
* **Setup**: `PAYMENT_FAIL_MODE` set to `never`, `INVENTORY_FAIL_MODE` set to `always`.
* **System Reaction**: Payment succeeds, but Inventory returns **503 Service Unavailable**.
* **Compensation**: Node-RED catches the 503 error and triggers a **Compensating Transaction** (`POST /payment/refund`).
* **Final State**: API returns `status: compensated`.

---

## 5. AI Usage & Debugging Log

I used **Gemini AI** as an adaptive collaborator to design, debug, and refine this integration system. 

### Key Technical Challenges Solved:

1. **HTTP Status Code Logic**: 
   Refactored services to use explicit non-200 statuses (402/503) so Node-RED could trigger error paths.
2. **Strict Data Typing**: 
   Fixed a bug in the `switch` node by ensuring `msg.statusCode` is treated as a **Number (#)**, not a String.
3. **Persistent Trace State**: 
   Used **JSONata** `$append()` to maintain a full execution history, even during compensation steps.
