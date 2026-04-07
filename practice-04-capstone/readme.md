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
        Router["Content-Based Router"]
        Orchestrator["Process Orchestrator"]
    end

    subgraph Services["Business Services"]
        Order["Order Service"]
        Payment["Payment Service"]
        Inventory["Inventory Service"]
        Notification["Notification Service"]
    end

    DLQ["Dead Letter Channel"]

    Client -->|"POST /order"| Router

    Router --> Order
    Orchestrator --> Payment
    Orchestrator --> Inventory
    Orchestrator --> Notification

    Orchestrator -.->|"failure"| DLQ
    Inventory -.->|"release"| Orchestrator
    Payment -.->|"refund"| Orchestrator
```
---

## 2.2 Integration Architecture Diagram
```markdown
```mermaid
sequenceDiagram
    participant C as Client
    participant NR as Node-RED
    participant O as Order Service
    participant P as Payment Service
    participant I as Inventory Service
    participant N as Notification Service
    participant DLQ as Dead Letter Channel

    C->>NR: POST /order

    NR->>O: create order
    O-->>NR: orderId

    NR->>P: authorize payment
    P-->>NR: status

    alt payment success
        NR->>I: reserve inventory
        I-->>NR: status

        alt inventory success
            NR->>N: send notification
            N-->>NR: ok
            NR-->>C: completed
        else inventory failure
            NR->>P: refund
            P-->>NR: refunded
            NR-->>C: compensated
        end
    else payment failure
        NR-->>C: failed
    end

    note over NR,DLQ: refund failure -> DLQ
```
---

## 2.3 Orchestration Flow
```markdown
```mermaid
flowchart TD

    A[Receive Order] --> B[Create Order]
    B --> C{Authorize Payment}

    C -->|Success| D{Reserve Inventory}
    C -->|Fail| F[Return Failed]

    D -->|Success| E[Send Notification]
    D -->|Fail| G[Refund Payment]

    E --> H[Return Completed]
    G --> I[Return Compensated]

    G -->|Fail| DLQ[Dead Letter Channel]
```
---
