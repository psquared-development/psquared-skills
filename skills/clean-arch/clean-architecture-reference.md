# Clean Architecture — Complete Reference

> Based on "Clean Architecture: A Craftsman's Guide to Software Structure and Design" by Robert C. Martin (2017)

---

## Table of Contents

1. [The Core Idea](#1-the-core-idea)
2. [The Dependency Rule](#2-the-dependency-rule)
3. [The Four Layers](#3-the-four-layers)
4. [SOLID Principles at Architecture Scale](#4-solid-principles-at-architecture-scale)
5. [Dependency Inversion — The Mechanical Key](#5-dependency-inversion--the-mechanical-key)
6. [Component Cohesion Principles](#6-component-cohesion-principles)
7. [Component Coupling Principles](#7-component-coupling-principles)
8. [Screaming Architecture](#8-screaming-architecture)
9. [Boundaries and the Plugin Architecture](#9-boundaries-and-the-plugin-architecture)
10. [Policy, Level, and Business Rules](#10-policy-level-and-business-rules)
11. [The Main Component](#11-the-main-component)
12. [Services Are Not Architecture](#12-services-are-not-architecture)
13. [The Test Boundary](#13-the-test-boundary)
14. [Common Anti-Patterns](#14-common-anti-patterns)
15. [Related Architectures](#15-related-architectures-hexagonal-onion-bce)
16. [Practical Application Checklist](#16-practical-application-checklist)

---

## 1. The Core Idea

Clean Architecture is about **separation of concerns through dependency management**. The fundamental goal: **business rules should be independent of frameworks, UI, databases, and external agencies.**

A well-architected system allows you to:
- Defer technology decisions (database, framework, UI) as long as possible
- Test business rules without any external system running
- Swap any external component without touching business logic
- Understand the system's purpose from its structure alone

Martin synthesizes decades of architectural thinking — Hexagonal Architecture (Cockburn, 2005), Onion Architecture (Palermo, 2008), DCI, and BCE — into a unified model with concrete principles and metrics.

---

## 2. The Dependency Rule

> **"Source code dependencies can only point inwards."**

This is the single overriding rule. The architecture is visualized as concentric circles. Each circle represents a different area of the software:

```
┌─────────────────────────────────────────────────┐
│  Frameworks & Drivers (Web, DB, UI, Devices)    │
│  ┌─────────────────────────────────────────┐    │
│  │  Interface Adapters (Controllers,       │    │
│  │  Presenters, Gateways)                  │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  Use Cases (Application          │    │    │
│  │  │  Business Rules)                 │    │    │
│  │  │  ┌─────────────────────────┐     │    │    │
│  │  │  │  Entities (Enterprise   │     │    │    │
│  │  │  │  Business Rules)        │     │    │    │
│  │  │  └─────────────────────────┘     │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Rules:**
- Nothing in an inner circle can know **anything** about an outer circle
- No name (function, class, variable) declared in an outer circle may be mentioned by inner circle code
- Data formats used in outer circles must not be used by inner circles
- As you move inward: abstraction increases, policy level increases, stability increases
- As you move outward: concreteness increases, mechanism detail increases, volatility increases

**Crossing boundaries outward:** When control flow needs to go from inner to outer (e.g., a use case calling a repository), use the Dependency Inversion Principle. The inner circle defines an interface; the outer circle implements it. Source code dependencies still point inward.

**Data crossing boundaries:** Always in the form most convenient for the **inner** circle — simple data structures, DTOs, plain arguments. Never pass database rows, ORM entities, or framework objects inward.

---

## 3. The Four Layers

Martin's canonical model uses four layers, but he explicitly states you may have more. The rule is always the same.

### 3.1 Entities (Innermost)

**What they are:** Enterprise-wide business rules. The most general, high-level rules that would exist regardless of which application uses them.

**Characteristics:**
- Least likely to change when something external changes
- Not affected by page navigation, security schemes, or operational concerns
- Can be objects with methods, or sets of data structures and functions
- In a single-application system, these are the core business objects
- Contain **critical business rules** — rules the business would use even without software

**Example:**
```
Loan entity:
- principle: number
- rate: number
- period: number
- makePayment(amount): void
- calculateInterest(): number
```

These rules exist whether or not there's a computer system.

### 3.2 Use Cases

**What they are:** Application-specific business rules. They orchestrate the flow of data to and from entities and direct entities to use their rules to achieve a specific goal.

**Characteristics:**
- Each use case represents a single action (e.g., "CreateOrder", "TransferFunds")
- Changes to application operation affect this layer
- Changes to externalities (DB, UI) should NOT affect this layer
- Use cases know about entities; entities do NOT know about use cases
- Contain **application business rules** — rules that exist only because of automation

**Example:**
```
CreateLoan use case:
- Accepts: borrower info, loan terms
- Validates: credit check (calls entity rules)
- Orchestrates: creates Loan entity, persists via repository interface
- Returns: loan confirmation DTO
```

**Key distinction from entities:** If you changed the application (e.g., from web to CLI), use cases might change but entities should not. If you changed the business (e.g., new loan rules), entities change but the use case orchestration pattern remains.

### 3.3 Interface Adapters

**What they are:** Translators between the use case/entity world and the external world.

**Contains:**
- **Controllers** — Convert external input (HTTP, CLI, events) into use case input format
- **Presenters** — Convert use case output into display format
- **Gateways/Repositories** — Convert between entity format and persistence format
- **Mappers** — Any data conversion between layers

**Key rule:** No SQL, no HTTP details, no framework specifics should leak inward past this layer. All framework-specific data transformation happens here.

**MVC lives here:** The Model-View-Controller pattern of a GUI is an interface adapter concern. The controller receives input, the presenter formats output, but the actual business processing happens one layer deeper.

### 3.4 Frameworks & Drivers (Outermost)

**What they are:** The concrete details — web framework, database engine, UI toolkit, external services.

**Characteristics:**
- You write very little code here — mostly glue/configuration
- This is where "the details" go
- The web is a detail. The database is a detail. The UI framework is a detail
- These components are the most volatile and most likely to change
- Kept on the outside where they can do the least harm

---

## 4. SOLID Principles at Architecture Scale

Martin shows how SOLID principles, originally for classes/modules, scale to architectural components.

### 4.1 Single Responsibility Principle (SRP)

> "A module should be responsible to one, and only one, actor."

An actor = a group of stakeholders requesting the same kind of change.

**At architecture scale:** Separate code that serves different actors to prevent:
- **Accidental coupling:** Changing code for actor A inadvertently breaks actor B's functionality
- **Merge conflicts:** Different teams changing the same component for different reasons

**Example:** Payroll calculation (CFO actor) and time reporting (COO actor) should be in separate components even if they use the same Employee data.

### 4.2 Open-Closed Principle (OCP)

> "Software should be open for extension, closed for modification."

**At architecture scale:**
1. Separate components by reason for change (SRP at component level)
2. Arrange dependencies so arrows point toward components you want to protect
3. High-level business rules get more protection than low-level views
4. When control flow contradicts desired dependency direction, use DIP

**The protection hierarchy:** Entities (most protected) → Use Cases → Interface Adapters → Frameworks (least protected). A change in the database should not propagate to business rules.

### 4.3 Liskov Substitution Principle (LSP)

> Subtypes must be substitutable for their base types.

**At architecture scale:** Applies to interfaces, REST APIs, and any contract boundary. Violations manifest as type-checking in callers:
```typescript
// LSP violation at architectural level
if (service.name === 'acme') {
  // Special handling because acme doesn't follow the contract
}
```
**Fix:** Configuration data, not conditional branching. All implementations must honor the contract.

### 4.4 Interface Segregation Principle (ISP)

> "Don't depend on things you don't need."

**At architecture scale:** Don't depend on modules, libraries, or frameworks that carry baggage beyond what you use. Unnecessary transitive dependencies:
- Force recompilation in statically typed languages
- Create deployment coupling
- Increase attack surface
- Create upgrade friction

### 4.5 Dependency Inversion Principle (DIP)

> "Depend on abstractions, not concretions."

**The most architecturally significant principle.** Three practices:
1. Don't refer to volatile concrete classes — use abstract factories
2. Don't inherit from volatile concrete classes — prefer composition
3. Don't override concrete functions — inherit only abstract methods

**Exception:** Non-volatile concretions (standard library classes) need not be abstracted.

---

## 5. Dependency Inversion — The Mechanical Key

DIP is the mechanical technique that makes the entire Dependency Rule work.

**The problem:** Control flow often goes outward (use case → repository → database), but we need source dependencies to point inward.

**The solution:**

```
┌──────────────────────────────────────┐
│ Use Case Layer                       │
│                                      │
│  UseCase ──uses──→ «interface»       │
│                    Repository        │
│                        ▲             │
└────────────────────────│─────────────┘
                         │ implements
┌────────────────────────│─────────────┐
│ Interface Adapter Layer│             │
│                        │             │
│               RepositoryImpl         │
│                    │                 │
└────────────────────│─────────────────┘
                     │ calls
┌────────────────────│─────────────────┐
│ Framework Layer    ▼                 │
│              Database                │
└──────────────────────────────────────┘
```

- The **interface** lives in the inner circle (Use Case layer)
- The **implementation** lives in the outer circle (Interface Adapter layer)
- Source code dependencies point inward (both layers depend on the interface)
- Runtime control flow goes outward (use case → impl → database)
- **Source dependencies oppose control flow** — this is the key insight

Martin calls this "taking advantage of dynamic polymorphism to create source code dependencies that oppose the flow of control."

---

## 6. Component Cohesion Principles

These govern which classes should be grouped into components.

### 6.1 REP — Reuse/Release Equivalence Principle

> "The granule of reuse is the granule of release."

Classes grouped into a component must be **releasable together**. They share version numbers and release tracking. If classes can't be meaningfully reused together, they shouldn't be in the same component.

### 6.2 CCP — Common Closure Principle

> "Gather into components those classes that change for the same reasons and at the same times."

This is **SRP for components**. A single change should affect a single component. Minimizes the number of components that must be revalidated and redeployed after a change.

### 6.3 CRP — Common Reuse Principle

> "Don't force users of a component to depend on things they don't need."

This is **ISP for components**. If component B uses component A but only needs 1 of its 4 services, the other 3 are dead weight creating unnecessary coupling. Classes not tightly bound should not share a component.

### The Tension Triangle

```
        REP
       /    \
      /      \
    CCP ──── CRP
```

- **REP + CCP** are inclusive — they make components larger
- **CRP** is exclusive — it makes components smaller
- The architect balances these based on project phase
- **Early development:** Favor CCP (develop-ability > reusability)
- **Mature project:** Shift toward REP + CRP (reusability matters more)

---

## 7. Component Coupling Principles

These govern relationships between components.

### 7.1 ADP — Acyclic Dependencies Principle

> "Allow no cycles in the component dependency graph."

Cycles cause:
- Unit tests become nearly impossible to isolate
- Build order becomes indeterminate
- Components lose independent releasability
- "Morning-after syndrome" — your code breaks because someone changed a transitive dependency

**Breaking cycles:**
1. **Dependency Inversion:** Introduce an interface to reverse dependency direction
2. **Extract New Component:** Create an intermediate component both can reference

### 7.2 SDP — Stable Dependencies Principle

> "Depend in the direction of stability."

**Stability** = difficulty of change (not frequency). A component is stable when many others depend on it.

**Instability metric:**
```
I = Fan-out / (Fan-in + Fan-out)

Fan-in:  incoming dependencies (others → this)
Fan-out: outgoing dependencies (this → others)

I = 0: maximally stable (everything depends on me)
I = 1: maximally unstable (I depend on everything)
```

**Rule:** I must decrease along the dependency chain. Depend on things more stable than yourself.

### 7.3 SAP — Stable Abstractions Principle

> "A component should be as abstract as it is stable."

Stable components should be abstract (interfaces, abstract classes) so they can be extended without modification. Unstable components should be concrete so they're easy to change.

**Abstractness metric:**
```
A = abstract classes & interfaces / total classes

A = 0: fully concrete
A = 1: fully abstract
```

### The Main Sequence and Zones

Plotting components on an I-A graph:

```
A (abstractness)
1.0 ┌───────────────────────┐
    │ Zone of              ╱│
    │ Uselessness         ╱ │
    │                    ╱  │
    │          Main     ╱   │
    │         Sequence ╱    │
    │                 ╱     │
    │                ╱      │
    │               ╱       │
    │              ╱        │
    │             ╱  Zone   │
    │            ╱   of     │
0.0 │           ╱    Pain   │
    └───────────────────────┘
   0.0                    1.0
                I (instability)
```

- **Zone of Pain** (I≈0, A≈0): Stable but concrete. Many depend on it, but it can't be extended. E.g., database schemas, concrete utility libs.
- **Zone of Uselessness** (I≈1, A≈1): Abstract but nobody uses it. Dead interfaces, orphaned abstractions.
- **Main Sequence** (A + I ≈ 1): The ideal line. Stable things are abstract; unstable things are concrete.
- **Distance metric:** `D = |A + I - 1|` — 0 is ideal.

---

## 8. Screaming Architecture

> Your software's top-level structure should scream its **business purpose**, not its **technical framework**.

**Martin's analogy:** When you approach a building, its architecture tells you if it's a library, a school, or an office — without a sign. Software should work the same way.

**Framework-centric (bad):**
```
controllers/
services/
repositories/
models/
utils/
```
This tells you it's MVC. It says nothing about the domain.

**Domain-centric (good):**
```
orders/
  CreateOrder.ts
  OrderRepository.ts
  Order.ts
inventory/
  CheckStock.ts
  InventoryItem.ts
customers/
  RegisterCustomer.ts
  Customer.ts
```
This immediately communicates: this system handles orders, inventory, and customers.

**Deeper principle:** If your project structure is dictated by the framework, the framework IS the architecture — and you're coupled to it. Screaming Architecture keeps business logic portable across technology stacks.

---

## 9. Boundaries and the Plugin Architecture

### What is a Boundary?

A boundary is a line drawn between software elements that **separates** them and **restricts** those on one side from knowing about those on the other.

> "Software architecture is the art of drawing lines called boundaries."

### Purpose

Boundaries separate **stable business rules** from **volatile technical details**. They enable:
- Deferring technology decisions
- Swapping implementations
- Testing in isolation
- Independent deployment

### Plugin Architecture

Clean Architecture treats everything outside core business rules as a **plugin**:

```
                    ┌─────────────┐
                    │   Web UI    │
                    │  (plugin)   │
                    └──────┬──────┘
                           │
┌─────────────┐    ┌───────▼──────┐    ┌─────────────┐
│  Database   │◄───│   Business   │───►│  External   │
│  (plugin)   │    │    Rules     │    │   Service   │
└─────────────┘    │   (core)     │    │  (plugin)   │
                   └───────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    CLI      │
                    │  (plugin)   │
                    └─────────────┘
```

- The database is a plugin
- The web framework is a plugin
- The UI is a plugin
- The delivery mechanism is a plugin
- **All arrows point toward the core**

### Cost of Boundaries

Martin is pragmatic:
- Boundaries have a cost (interfaces, abstractions, additional components)
- Don't create boundaries speculatively
- Watch for where dependencies are forming
- **Premature boundaries** add complexity
- **Missing boundaries** create coupling expensive to fix later
- Balance these risks with a "watchful eye"

### Partial Boundaries

Full boundaries (separate components, separate deployables) are expensive. Cheaper alternatives:
- **Strategy pattern** — interface + implementation within a single component
- **Facade pattern** — simplified interface over complex subsystem
- **Interface separation** — defining the interface even if both sides are in one component

These can be upgraded to full boundaries later if needed.

---

## 10. Policy, Level, and Business Rules

### Policy

Software systems are statements of policy — they describe the rules by which inputs are transformed to outputs. A complex system is decomposed into smaller policy statements grouped by the ways they change.

### Level

**Level** = the distance from inputs and outputs.
- **High-level policies:** Furthest from I/O, most abstract, most stable
- **Low-level policies:** Closest to I/O, most concrete, most volatile

Dependencies should point from low-level to high-level. A well-architected system's dependency graph forms a directed acyclic graph from I/O toward core policies.

### Business Rules

**Critical Business Rules:** Rules the business uses whether or not there's a computer. These are the entities.
- Example: A bank charges interest on loans at rate X

**Application Business Rules:** Rules that exist only because of the automation. These are the use cases.
- Example: The loan application must validate credit score before approval

**Key distinction:** Critical business rules don't change when you change the application. Application business rules change when you change the application but not the business.

---

## 11. The Main Component

The **Main** component is the ultimate detail — the dirtiest, lowest-level component. It is the entry point of the system.

**Responsibilities:**
- Creates all factories, strategies, and global facilities
- Passes control to the high-level abstract portions of the system
- This is where Dependency Injection happens
- This is where the concrete implementations are wired to their interfaces

**Key insight:** Main is a plugin to the application. You can have different Main components for different configurations (dev, test, production) without changing any business logic.

```
Main (the dirty wiring):
  - creates DatabaseRepositoryImpl
  - creates WebController
  - creates OpenAIService (concrete)
  - wires them to interfaces
  - starts the application
```

---

## 12. Services Are Not Architecture

Martin explicitly warns: **microservices and service-oriented architecture are not inherently "clean."**

- Services are a deployment strategy, not an architecture
- A monolith with clean internal boundaries is better than microservices with no internal structure
- Service boundaries can still violate the dependency rule
- Decoupled deployment ≠ decoupled architecture
- A network boundary between services doesn't automatically create good architecture

**The real architecture** is in the dependency structure within and between services, not in the network topology.

---

## 13. The Test Boundary

Tests are part of the system. They sit in the outermost circle (or just outside it).

**Key points:**
- Tests depend on the system; the system does not depend on tests
- Tests follow the dependency rule — they know about inner circles but not vice versa
- Tests can bypass the UI/API layer and test use cases directly
- Fragile tests (tightly coupled to implementation) are a design problem, not a testing problem
- A well-architected system makes testing easy because business rules are independent of frameworks

**Testing API:** Consider creating a specific testing API that provides a superset of the system's interactors. This API decouples tests from the application's structure, making tests less fragile.

---

## 14. Common Anti-Patterns

Clean Architecture was designed to counter these pervasive problems:

### 14.1 Framework Coupling
Building the entire system around a framework's conventions. The framework dictates the architecture. **Fix:** Framework is an outer-circle detail that implements inner-circle interfaces.

### 14.2 Database-Driven Design
Designing from the database schema outward. Entity structure mirrors tables. **Fix:** Entities represent business concepts; the database is a storage mechanism in the outermost circle.

### 14.3 Business Logic in Controllers
Placing business rules in HTTP controllers, event handlers, or UI code. **Fix:** Controllers are thin adapters that call use cases.

### 14.4 God Classes / Fat Controllers
Single classes handling routing, validation, business logic, data access, and formatting. **Fix:** Separate concerns across layers.

### 14.5 Dependency Rule Violations
Inner layers importing outer layer classes. **Fix:** Strict dependency direction enforcement; use interfaces for outward calls.

### 14.6 Cyclic Dependencies
Components depending on each other in cycles. **Fix:** ADP — use DIP or extract new components to break cycles.

### 14.7 Passing Framework Objects Across Boundaries
Sending database rows, HTTP requests, or ORM entities through use cases. **Fix:** Map to simple DTOs at boundaries.

### 14.8 Primitive Obsession in Domain Models
Using primitives instead of rich domain objects. **Fix:** Value objects, proper domain modeling.

### 14.9 ORM Annotations on Domain Entities
Coupling innermost layer to persistence concerns. **Fix:** Entities are pure; persistence mapping lives in the adapter layer.

### 14.10 Big Ball of Mud
No intentional architecture — everything depends on everything. **Fix:** Clean Architecture provides the principled structure.

---

## 15. Related Architectures: Hexagonal, Onion, BCE

Martin explicitly positions Clean Architecture as a synthesis of prior work.

### Hexagonal Architecture (Ports & Adapters) — Cockburn, 2005
- Application core surrounded by **ports** (interfaces) and **adapters** (implementations)
- No concentric circles — hexagonal shape emphasizes all external interactions are equivalent
- No inherent "top" or "bottom"
- Core defines the interfaces; external systems adapt to them

### Onion Architecture — Palermo, 2008
- Concentric circles with domain model at center
- Explicit inner layers: Domain Model → Domain Services → Application Services
- Infrastructure and UI on outside
- Dependencies point inward

### What They Share
- DIP-based: dependencies flow outside → inside
- Isolate business logic from infrastructure
- Independently testable systems
- Database, UI, frameworks are peripheral details

### Where Clean Architecture Adds Value
| Aspect | Hexagonal | Onion | Clean |
|--------|-----------|-------|-------|
| Internal layering | Not prescribed | 3 inner layers | Entities + Use Cases |
| Component principles | None | None | REP, CCP, CRP, ADP, SDP, SAP |
| Metrics | None | None | I, A, D metrics |
| SOLID connection | Implicit | Implicit | Explicit per-principle analysis |
| Screaming Architecture | Not discussed | Not discussed | Explicit concept |

In practice, they are largely interchangeable in intent. Clean Architecture's unique contribution is the comprehensive set of principles and metrics wrapped around the shared core idea.

---

## 16. Practical Application Checklist

### Dependency Rule Compliance
- [ ] Do source code dependencies only point inward?
- [ ] Are entities free of framework imports?
- [ ] Do use cases define their own interfaces for external needs?
- [ ] Do adapters translate between use case format and external format?
- [ ] Is data crossing boundaries in simple DTO form?

### Layer Responsibilities
- [ ] Entities: only enterprise business rules, no application logic
- [ ] Use cases: orchestration only, no persistence or UI knowledge
- [ ] Adapters: translation only, no business decisions
- [ ] Frameworks: glue code only, no business logic

### Component Health
- [ ] No cycles in the dependency graph (ADP)
- [ ] Dependencies flow toward stability (SDP)
- [ ] Stable components are abstract (SAP)
- [ ] Components grouped by change reason (CCP)
- [ ] Components don't force unnecessary dependencies (CRP)

### Architecture Smells
- [ ] No god files (>500 lines with mixed concerns)
- [ ] No business logic in route handlers or controllers
- [ ] No direct database calls bypassing the service layer
- [ ] No framework-specific objects crossing boundaries
- [ ] No circular dependencies between modules
- [ ] Top-level structure communicates domain, not framework (Screaming)

### Boundary Checklist
- [ ] Each external system (DB, API, messaging) accessed through an interface
- [ ] Interfaces defined in the inner layer, implemented in the outer
- [ ] Can swap any external system without touching business logic
- [ ] Can test business rules without running any external system

---

*This document serves as the reference for the `/clean-arch` skill, which applies these principles to the AgentHub/InboxMate codebase.*
