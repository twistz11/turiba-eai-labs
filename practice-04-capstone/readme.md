# Capstone: Orchestrated EAI System

## 1. Architecture Decision

**Chosen Approach: Option A (Node-RED as Entry Point)**
I chose this approach because it follows the **Pure Orchestrator** pattern. By making Node-RED the entry point, the business logic is completely decoupled from the individual microservices. This makes the system more flexible: we can change the order of steps or scale individual components without ever touching the code of the `Order Service`.

---

## 2. Architecture Diagrams

### 2.1 System Context Diagram
```mermaid
graph TD
    Client["Client (Web / Mobile / B2B)"]

    subgraph IntegrationLayer["Integration Layer (Node-RED)"]
        Router["Content-Based Router (Routes by orderType)"]
        Orchestrator["Process Orchestrator (Controls flow & compensation)"]
    end

    subgraph Services["Business Services"]
        Order["Order Service (POST /orders)"]
        Payment["Payment Service (POST /payment/authorize / refund)"]
        Inventory["Inventory Service (POST /inventory/reserve / release)"]
        Notification["Notification Service (POST /notification/send)"]
    end

    DLQ["Dead Letter Channel (In-memory DLQ)"]

    Client -->|"HTTP POST /order"| IntegrationLayer
    Router -->|"HTTP JSON/XML"| Order
    Orchestrator -->|"HTTP POST"| Payment
    Orchestrator -->|"HTTP POST"| Inventory
    Orchestrator -->|"HTTP POST"| Notification

    Orchestrator -.->|"on failure"| DLQ
    Inventory -.->|"compensation: release"| Orchestrator
    Payment -.->|"compensation: refund"| Orchestrator

### 2.2 Integration Architecture Diagram
sequenceDiagram
    participant C as Client
    participant NR as Node-RED
    participant O as Order Service
    participant P as Payment Service
    participant I as Inventory Service
    participant N as Notification Service
    participant DLQ as Dead Letter Channel

    C->>NR: POST /order (correlationId)

    NR->>O: POST /orders
    O-->>NR: { orderId }

    NR->>P: POST /payment/authorize
    P-->>NR: { status }

    alt Payment success
        NR->>I: POST /inventory/reserve
        I-->>NR: { status }

        alt Inventory success
            NR->>N: POST /notification/send
            N-->>NR: { status }
            NR-->>C: status completed
        else Inventory failure
            NR->>P: POST /payment/refund
            P-->>NR: refunded
            NR-->>C: status compensated
        end

    else Payment failure
        NR-->>C: status failed
    end

    note over NR,DLQ: If refund fails, lands in DLQ
### 2.3 Orchestration Flow
flowchart TD
    A[Receive Order] --> B[Create Order Record]
    B --> C{Authorize Payment}

    C -->|Success| D{Reserve Inventory}
    C -->|Fail| F[Return Failed Status]

    D -->|Success| E[Send Notification]
    D -->|Fail| G[Compensate: Refund Payment]

    E --> H[Return Completed Status]
    G --> I[Return Compensated Status]

    G --> |Fail| DLQ[Dead Letter Channel]
---
