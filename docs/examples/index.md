# Examples

Complete, runnable examples demonstrating different simulation scenarios and techniques from the `discrete-sim` package.

## All Examples

### 1. [M/M/1 Queue](./mm1-queue)
**Classic single-server queue with theoretical validation**

- Exponential inter-arrival and service times
- Statistics validation against M/M/1 formulas
- Reproducible results with seeded RNG
- **Complexity:** Beginner

### 2. [Bank Tellers](./bank-tellers)
**Multi-server bank with transaction types and SLA tracking**

- Multiple servers handling different transaction types (quick vs. complex)
- SLA compliance tracking (10-minute target)
- Performance assessment and staffing recommendations
- **Complexity:** Intermediate

### 3. [Bank Express Lane](./bank-express-lane)
**Priority queue system with express service**

- Priority-based queuing (express=0, regular=10)
- Non-preemptive resource allocation
- Multiple independent arrival processes
- Wait time comparison by priority
- **Complexity:** Intermediate

### 4. [Restaurant](./restaurant)
**Restaurant with tables and servers**

- Variable group sizes (1-6 people)
- Multiple resource types (tables + servers)
- Multi-stage service (order, eat, payment)
- Customer satisfaction metrics
- **Complexity:** Intermediate

### 5. [Warehouse Operations](./warehouse)
**Multi-stage logistics with bottleneck analysis**

- Sequential workflow (dock → forklift → inspection → storage)
- Multiple resource types with dependencies
- Bottleneck identification
- Resource utilization comparison
- **Complexity:** Advanced

### 6. [Hospital Emergency Room](./hospital-emergency)
**Emergency department with preemptive triage**

- Preemptive resource allocation (critical patients interrupt lower-priority)
- Process interruption and recovery handling
- Multi-level priority system (critical/urgent/standard)
- `PreemptionError` exception handling
- **Complexity:** Advanced

---

## Quick Example

Here's a simple queue system to get started:

```typescript
import { Simulation, Resource, Random, timeout } from 'discrete-sim';

// Setup
const sim = new Simulation();
const rng = new Random(42);
const server = new Resource(sim, 1, { name: 'Server' });

// Customer process
function* customer(id: number) {
  console.log(`[${sim.now}] Customer ${id} arrived`);

  yield server.request();
  console.log(`[${sim.now}] Customer ${id} being served`);

  yield* timeout(rng.exponential(3));

  server.release();
  console.log(`[${sim.now}] Customer ${id} departed`);
}

// Generate arrivals
function* arrivalProcess() {
  for (let i = 0; i < 10; i++) {
    sim.process(() => customer(i));
    yield* timeout(rng.exponential(2));
  }
}

// Run
sim.process(arrivalProcess);
sim.run();

// Results
console.log(`Utilization: ${sim.statistics.getAverage('Server:utilization')}`);
```

---

## By Feature

### Priority Queuing
- **Non-preemptive:** [Bank Express Lane](./bank-express-lane) - Express customers served first when queued
- **Preemptive:** [Hospital Emergency](./hospital-emergency) - Critical patients interrupt lower-priority treatment

### Multiple Resources
- **Parallel:** [Restaurant](./restaurant) - Tables + servers used simultaneously
- **Sequential:** [Warehouse](./warehouse) - Docks → forklifts → inspectors in sequence

### Statistics & Analysis
- **Theoretical Validation:** [M/M/1 Queue](./mm1-queue) - Compare to queueing theory formulas
- **SLA Tracking:** [Bank Tellers](./bank-tellers) - Measure compliance with service targets
- **Bottleneck Detection:** [Warehouse](./warehouse) - Identify resource constraints

### Process Patterns
- **Simple:** [M/M/1 Queue](./mm1-queue) - Single arrival process, single server
- **Multi-type:** [Bank Tellers](./bank-tellers) - Quick vs. complex transactions
- **Multi-stage:** [Warehouse](./warehouse) - Products move through multiple stations
- **Error Handling:** [Hospital Emergency](./hospital-emergency) - Handle preemption interrupts

---

## By Use Case

### Financial Services
- [Bank Tellers](./bank-tellers) - Teller window operations
- [Bank Express Lane](./bank-express-lane) - Express service lanes

### Operations
- [Restaurant](./restaurant) - Table and server management
- [Warehouse](./warehouse) - Receiving and processing workflow

### Healthcare
- [Hospital Emergency](./hospital-emergency) - ER triage and treatment

### Learning
- [M/M/1 Queue](./mm1-queue) - Fundamental queueing theory concepts

---

## Running Examples

All examples are in the `discrete-sim` repository:

```bash
# Clone the repository
git clone https://github.com/anesask/discrete-sim
cd discrete-sim

# Install dependencies
npm install

# Run any example
npx tsx examples/mm1-queue/index.ts
npx tsx examples/bank-tellers/index.ts
npx tsx examples/bank-express-lane/index.ts
npx tsx examples/restaurant/index.ts
npx tsx examples/warehouse/index.ts
npx tsx examples/hospital-emergency/index.ts
```

Or import in your own code:

```typescript
import { runSimulation } from 'discrete-sim/examples/mm1-queue';

const results = runSimulation();
console.log(results);
```

---

## Key Concepts

Each example demonstrates different aspects of discrete event simulation:

| Concept | Examples |
|---------|----------|
| Basic Queuing | M/M/1 Queue |
| Multi-server Systems | Bank Tellers, Restaurant |
| Priority Queues | Bank Express Lane, Hospital ER |
| Resource Contention | Warehouse, Restaurant |
| Process Stages | Warehouse, Restaurant |
| Statistical Validation | M/M/1 Queue |
| Performance Metrics | All examples |
| Capacity Planning | Bank Tellers, Hospital ER |

---

## Next Steps

- **[Quick Start Guide](/guide/quick-start)** - Build your first simulation
- **[API Reference](/api/)** - Complete documentation
- **[Guide: Processes](/guide/processes)** - Learn process patterns
- **[Guide: Resources](/guide/resources)** - Master resource management
