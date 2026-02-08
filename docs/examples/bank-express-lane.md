# Bank Express Lane

Priority-based queue system demonstrating non-preemptive resource allocation with express service.

## Overview

This example simulates a bank with an express lane where customers are served based on priority. Express customers get priority over regular customers when waiting in the queue, but service is **non-preemptive** (ongoing service is never interrupted).

## Key Features

- **Priority-based queuing** (lower priority number = served first)
- **Non-preemptive scheduling** (no interruption of ongoing service)
- **Multiple independent arrival processes** (express and regular)
- **Wait time comparison** by priority level
- **Two customer types** with different service characteristics

## Parameters

```typescript
const SIMULATION_HOURS = 8;
const EXPRESS_ARRIVAL_RATE = 8;    // express customers per hour
const REGULAR_ARRIVAL_RATE = 6;    // regular customers per hour
const NUM_TELLERS = 2;

// Priority levels (lower = higher priority)
const PRIORITY_EXPRESS = 0;
const PRIORITY_REGULAR = 10;

// Service times
const EXPRESS_SERVICE_MEAN = 0.05;   // 3 minutes
const REGULAR_SERVICE_MEAN = 0.15;   // 9 minutes
```

## How Priority Queuing Works

When a teller becomes available:
1. The queue is checked for waiting customers
2. The customer with the **lowest priority number** is served next
3. If priorities are equal, FIFO order is used

**Key insight**: Express customers (priority=0) are always served before regular customers (priority=10) when both are waiting.

## Implementation

### Customer Process

Each customer requests service with their priority level:

```typescript
function* customerProcess(
  id: number,
  customerType: CustomerType,
  tellers: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  const arrivalTime = sim.now;
  const priority = customerType === 'express' ? PRIORITY_EXPRESS : PRIORITY_REGULAR;

  // Request teller with appropriate priority
  yield tellers.request(priority);

  const serviceStartTime = sim.now;
  const waitTime = serviceStartTime - arrivalTime;

  // Track wait time by customer type
  stats.recordValue(`wait-${customerType}-minutes`, waitTime * 60);
  stats.increment(`${customerType}-served`);

  // Service time depends on customer type
  let serviceTime: number;
  if (customerType === 'express') {
    serviceTime = Math.max(0.017, rng.normal(EXPRESS_SERVICE_MEAN, EXPRESS_SERVICE_STDDEV));
  } else {
    serviceTime = Math.max(0.05, rng.normal(REGULAR_SERVICE_MEAN, REGULAR_SERVICE_STDDEV));
  }

  yield* timeout(serviceTime);
  tellers.release();
}
```

### Independent Arrival Processes

Express and regular customers arrive independently:

```typescript
// Express arrivals
function* expressArrivalProcess(tellers, stats, rng, sim, until) {
  let id = 0;
  while (sim.now < until) {
    sim.process(() => customerProcess(id++, 'express', tellers, stats, rng, sim));
    yield* timeout(rng.exponential(1 / EXPRESS_ARRIVAL_RATE));
  }
}

// Regular arrivals
function* regularArrivalProcess(tellers, stats, rng, sim, until) {
  let id = 0;
  while (sim.now < until) {
    sim.process(() => customerProcess(id++, 'regular', tellers, stats, rng, sim));
    yield* timeout(rng.exponential(1 / REGULAR_ARRIVAL_RATE));
  }
}

// Start both processes
sim.process(() => expressArrivalProcess(tellers, stats, rng, sim, SIMULATION_HOURS));
sim.process(() => regularArrivalProcess(tellers, stats, rng, sim, SIMULATION_HOURS));
```

## Statistics Tracked

| Metric | Description |
|--------|-------------|
| `express-served` | Number of express customers served |
| `regular-served` | Number of regular customers served |
| `wait-express-minutes` | Wait time for express customers |
| `wait-regular-minutes` | Wait time for regular customers |
| `total-express-minutes` | Total time in bank (express) |
| `total-regular-minutes` | Total time in bank (regular) |

## Sample Results

```
Simulation Results
============================================================

Service Summary:
  Express customers: 65 (60.7%)
  Regular customers: 42 (39.3%)
  Total throughput: 13.4 customers/hour

Wait Time Analysis:
  Express customers:
    Average wait: 4.2 minutes
    Average total time: 7.5 minutes

  Regular customers:
    Average wait: 12.8 minutes
    Average total time: 22.1 minutes

  Wait time difference: 8.6 minutes (regular waits 3.0x longer)

Teller Utilization:
  Utilization: 82.3%
  Average queue length: 1.87 customers

Performance Assessment
============================================================

Priority System Impact:
  Express customers benefit significantly (4.2 min avg wait)
  Regular customers experience longer waits (12.8 min)

Fairness Analysis:
  Express represents 60.7% of volume but only 3 min service time
  Regular customers wait 3.0x longer despite lower volume
  Consider: Dedicated regular lane if wait time gap grows
```

## What You'll Learn

1. **Priority Queuing**: Using `request(priority)` for non-FIFO scheduling
2. **Non-Preemptive Scheduling**: Priority only matters when resource becomes available
3. **Multiple Arrival Streams**: Running concurrent arrival processes
4. **Priority Starvation**: How high-priority arrivals can delay low-priority customers
5. **Fairness Trade-offs**: Balancing service quality across customer types

## Key Insights

**Priority vs. Preemption**: This example uses **non-preemptive** priority. An express customer arriving during regular service must wait. For preemptive priority, see [Hospital Emergency Room](/examples/hospital-emergency).

**Starvation Risk**: If express arrival rate is too high, regular customers can experience extreme waits. Monitor wait time ratios.

**Service Time Matters**: Even with priority, express customers wait if service times are long. Quick service is essential for express lanes.

## Variations to Try

1. **Three Priority Levels**: Add "VIP" customers with priority=-10
2. **Preemptive Priority**: See hospital-emergency example for preemptive interruption
3. **Priority Inversion**: Give regular customers higher priority during off-peak hours
4. **Hybrid Model**: Some tellers dedicated to regular, others shared
5. **Dynamic Priorities**: Increase priority for customers waiting too long

## Common Pitfalls

**Forgetting Non-Preemptive**: Priority doesn't interrupt ongoing service. Express customers still wait if all tellers are busy.

**Priority Number Confusion**: LOWER numbers = HIGHER priority. `priority=0` beats `priority=10`.

**Independent Processes**: Don't forget to start both arrival processes independently.

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/bank-express-lane/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/bank-express-lane';

const results = runSimulation();
console.log(results.waitTimeRatio);
```

## Related Topics

- [Hospital Emergency Room](/examples/hospital-emergency) - Preemptive priority
- [Bank Tellers](/examples/bank-tellers) - Service differentiation without priority
- [Resources](/guide/resources) - Priority queue documentation
- [Processes](/guide/processes) - Multiple concurrent processes

## Reference

Full source code: [examples/bank-express-lane/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/bank-express-lane/index.ts)
