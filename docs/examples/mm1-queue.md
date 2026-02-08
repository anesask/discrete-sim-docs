# M/M/1 Queue

Classic single-server queue simulation with theoretical validation against queueing theory formulas.

## Overview

The **M/M/1 queue** is a fundamental model in queueing theory where:
- **M** (first): Markovian (exponential) arrival process
- **M** (second): Markovian (exponential) service times
- **1**: Single server

This example demonstrates how to validate simulation results against well-known theoretical formulas.

## Key Features

- Exponential inter-arrival and service times
- Statistics collection and analysis
- Theoretical validation against M/M/1 formulas
- Reproducible results with seeded RNG
- Large sample size (10,000 customers) for accuracy

## Parameters

```typescript
const ARRIVAL_RATE = 0.7;  // customers per time unit (λ)
const SERVICE_RATE = 1.0;  // customers per time unit (μ)
const NUM_CUSTOMERS = 10000;
const RANDOM_SEED = 42;
```

## Theoretical Formulas

For an M/M/1 queue with utilization ρ = λ/μ:

| Metric | Formula | Value |
|--------|---------|-------|
| Utilization | ρ = λ/μ | 0.700 |
| Avg Wait Time | E[W] = ρ/(μ-λ) | 2.333 |
| Avg Queue Length | E[Q] = ρ²/(1-ρ) | 1.633 |
| Avg System Time | E[T] = 1/(μ-λ) | 3.333 |

## Implementation

### Customer Process

Each customer follows this process:
1. Request the server (may wait in queue)
2. Get served (exponential service time)
3. Release the server

```typescript
function* customerProcess(
  id: number,
  server: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  // Request server (may have to wait in queue)
  yield server.request();

  // Track customer served
  stats.increment('customers-served');

  // Service time (exponential distribution)
  const serviceTime = rng.exponential(1 / SERVICE_RATE);
  yield* timeout(serviceTime);

  // Release server
  server.release();
}
```

### Arrival Process

Generates customers with exponential inter-arrival times:

```typescript
function* arrivalProcess(
  server: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    // Create and start customer process
    sim.process(() => customerProcess(i, server, stats, rng, sim));

    // Wait for next arrival (exponential inter-arrival time)
    const interarrivalTime = rng.exponential(1 / ARRIVAL_RATE);
    yield* timeout(interarrivalTime);
  }
}
```

### Main Simulation

```typescript
const sim = new Simulation();
const server = new Resource(sim, 1, { name: 'Server' });
const stats = new Statistics(sim);
const rng = new Random(RANDOM_SEED);

// Start arrival process
sim.process(() => arrivalProcess(server, stats, rng, sim));

// Run simulation
sim.run();
```

## Results

The simulation validates results against theoretical formulas:

```
Simulation Results vs. Theory
============================================================

Server Utilization:
  Theoretical: 0.7000
  Simulated:   0.6998
  Error:       0.0002

Average Wait Time in Queue:
  Theoretical: 2.3333
  Simulated:   2.3245
  Error:       0.0088

Average Queue Length:
  Theoretical: 1.6333
  Simulated:   1.6289
  Error:       0.0044

Average Time in System:
  Theoretical: 3.3333
  Simulated:   3.3245
  Error:       0.0088

[PASS] VALIDATION PASSED: All metrics within 10% of theory
```

## What You'll Learn

1. **Exponential Distributions**: Using `rng.exponential()` for realistic inter-arrival and service times
2. **Resource Management**: Single-server queue with automatic FIFO ordering
3. **Statistics Collection**: Tracking metrics during simulation
4. **Validation**: Comparing simulation results to theoretical predictions
5. **Reproducibility**: Using seeded random numbers for consistent results

## Common Pitfalls

**Insufficient Sample Size**: Small sample sizes can lead to large errors. This example uses 10,000 customers for accuracy.

**Incorrect Distribution Parameters**: `exponential(rate)` takes the rate parameter (1/mean), not the mean itself.

**Transient vs. Steady-State**: Results include warm-up period. For steady-state analysis, consider discarding initial customers.

## Variations to Try

1. **Different Utilizations**: Change arrival/service rates to see behavior at different loads
2. **Multi-Server**: Change `Resource(sim, 1)` to `Resource(sim, c)` for M/M/c queue
3. **Priority Customers**: Add priority levels with different arrival rates
4. **Service Time Distributions**: Try uniform, normal, or other distributions

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/mm1-queue/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/mm1-queue';

const results = runSimulation();
console.log(results.validation);
```

## Related Topics

- [Random Number Generation](/guide/random) - Understanding distributions
- [Resources](/guide/resources) - Resource management patterns
- [Statistics](/guide/statistics) - Collecting and analyzing metrics
- [Bank Tellers](/examples/bank-tellers) - Multi-server example (M/M/c)

## Reference

Full source code: [examples/mm1-queue/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/mm1-queue/index.ts)
