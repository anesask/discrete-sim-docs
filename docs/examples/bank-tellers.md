# Bank Tellers

Multi-server bank simulation with different transaction types, SLA tracking, and staffing recommendations.

## Overview

This example simulates a bank branch with multiple teller windows serving customers with different transaction types. It demonstrates how to model service differentiation, track SLA compliance, and analyze staffing levels.

## Key Features

- **Multi-server system** (M/M/c queue with 3 tellers)
- **Service type differentiation** (quick vs. complex transactions)
- **SLA compliance tracking** (10-minute target)
- **Performance assessment** and staffing recommendations
- **Realistic service times** using normal distributions

## Parameters

```typescript
const SIMULATION_HOURS = 6;           // 6-hour banking day
const CUSTOMER_ARRIVAL_RATE = 12;     // customers per hour
const NUM_TELLERS = 3;
const SLA_WAIT_TIME_MINUTES = 10;     // Target: serve within 10 minutes

// Service times (hours)
const QUICK_SERVICE_MEAN = 0.05;      // 3 minutes
const COMPLEX_SERVICE_MEAN = 0.167;   // 10 minutes
```

## Transaction Types

Customers have one of two transaction types:
- **Quick** (70%): Deposits, withdrawals - ~3 minutes service time
- **Complex** (30%): Loans, account opening - ~10 minutes service time

```typescript
function generateTransactionType(rng: Random): TransactionType {
  return rng.uniform(0, 1) < 0.7 ? 'quick' : 'complex';
}
```

## Implementation

### Customer Process

Each customer:
1. Arrives and joins the queue
2. Waits for an available teller
3. Gets served (time depends on transaction type)
4. Leaves the bank

```typescript
function* customerProcess(
  id: number,
  transactionType: TransactionType,
  tellers: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  const arrivalTime = sim.now;

  // Wait for teller
  yield tellers.request();
  const serviceStartTime = sim.now;
  const waitTime = serviceStartTime - arrivalTime;

  // Track wait time and SLA compliance
  stats.recordValue('wait-time-minutes', waitTime * 60);
  const withinSLA = waitTime * 60 <= SLA_WAIT_TIME_MINUTES;
  if (withinSLA) {
    stats.increment('sla-met');
  } else {
    stats.increment('sla-missed');
  }

  // Service time depends on transaction type
  let serviceTime: number;
  if (transactionType === 'quick') {
    serviceTime = Math.max(0.017, rng.normal(QUICK_SERVICE_MEAN, QUICK_SERVICE_STDDEV));
  } else {
    serviceTime = Math.max(0.05, rng.normal(COMPLEX_SERVICE_MEAN, COMPLEX_SERVICE_STDDEV));
  }

  yield* timeout(serviceTime);
  tellers.release();
}
```

### Arrival Process

Customers arrive following a Poisson process (exponential inter-arrival times):

```typescript
function* arrivalProcess(
  tellers: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation,
  until: number
) {
  let customerId = 0;

  while (sim.now < until) {
    const transactionType = generateTransactionType(rng);
    sim.process(() => customerProcess(customerId++, transactionType, tellers, stats, rng, sim));

    const interarrivalTime = rng.exponential(1 / CUSTOMER_ARRIVAL_RATE);
    yield* timeout(interarrivalTime);
  }
}
```

## Statistics Tracked

The simulation collects comprehensive metrics:

| Metric | Description |
|--------|-------------|
| `customers-served` | Total number of customers |
| `quick-transactions` | Count of quick transactions |
| `complex-transactions` | Count of complex transactions |
| `wait-time-minutes` | Wait time for each customer |
| `sla-met` | Customers served within SLA |
| `sla-missed` | Customers exceeding SLA |
| `sla-violation` | How much SLA was exceeded (when missed) |
| `total-time-minutes` | Total time in bank (wait + service) |

## Sample Results

```
Simulation Results
============================================================

Service Summary:
  Total customers served: 73
  Quick transactions: 52 (71.2%)
  Complex transactions: 21 (28.8%)
  Throughput: 12.2 customers/hour

Wait Time Performance:
  Average wait time: 8.3 minutes
  Quick transactions: 7.1 minutes
  Complex transactions: 11.4 minutes

SLA Compliance:
  Target: 10 minutes or less
  Met SLA: 54 customers (74.0%)
  Missed SLA: 19 customers (26.0%)
  Average SLA violation: 4.2 minutes over target

Teller Utilization:
  Utilization: 78.5%
  Average queue length: 2.14 customers
  Total wait time: 0.14 hours per customer

Performance Assessment
============================================================

SLA Compliance Grade:
  [**---] Poor (<80%)

Staffing Recommendations:
  [WARNING] UNDERSTAFFED:
     - Average wait exceeds SLA (8.3 min > 10 min)
     - Consider adding 1 more teller(s)

Service Mix Analysis:
  [OK] Balanced service mix
```

## What You'll Learn

1. **Multi-Server Systems**: Managing multiple servers with a single shared queue
2. **Service Differentiation**: Modeling different transaction types with different service times
3. **SLA Tracking**: Monitoring compliance with service level agreements
4. **Normal Distributions**: Using `rng.normal()` for realistic service times with variability
5. **Performance Analysis**: Assessing staffing levels and making recommendations

## Key Insights

**SLA vs. Utilization**: High teller utilization (>85%) often leads to SLA violations. There's a trade-off between efficiency and service quality.

**Service Mix Impact**: A high proportion of complex transactions significantly increases wait times. Consider specialized windows.

**Warm-up Period**: Initial statistics may be skewed. Consider running longer simulations or discarding early observations.

## Variations to Try

1. **Dedicated Windows**: Create separate resources for quick vs. complex transactions
2. **Express Lane**: Add priority for quick transactions
3. **Peak Hours**: Vary arrival rate throughout the day
4. **Appointment System**: Reserve some capacity for scheduled customers
5. **Dynamic Staffing**: Adjust number of tellers based on queue length

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/bank-tellers/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/bank-tellers';

const results = runSimulation();
console.log(results.sla.complianceRate);
```

## Related Topics

- [M/M/1 Queue](/examples/mm1-queue) - Single-server fundamentals
- [Bank Express Lane](/examples/bank-express-lane) - Priority queuing
- [Statistics](/guide/statistics) - Collecting metrics
- [Random Numbers](/guide/random) - Using distributions

## Reference

Full source code: [examples/bank-tellers/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/bank-tellers/index.ts)
