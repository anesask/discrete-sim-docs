# Restaurant

Multi-resource restaurant simulation with variable group sizes, table management, and customer satisfaction tracking.

## Overview

This example simulates a restaurant where customer groups arrive, wait for tables, get served, eat their meals, and leave. It demonstrates how to coordinate multiple resource types (tables and servers) in a multi-stage service process.

## Key Features

- **Variable group sizes** (1-6 people)
- **Multiple resource types** (tables + servers)
- **Multi-stage service** (seating → ordering → eating → payment)
- **Customer satisfaction metrics** based on wait times
- **Realistic service times** with variability

## Parameters

```typescript
const SIMULATION_HOURS = 8;              // 8-hour dinner service
const CUSTOMER_GROUP_ARRIVAL_RATE = 5;   // groups per hour
const NUM_TABLES = 10;
const NUM_SERVERS = 4;

// Timing (in hours)
const ORDER_TIME_MEAN = 0.1;      // 6 minutes to take order
const MEAL_TIME_MEAN = 0.75;      // 45 minutes to eat
const CLEANUP_TIME = 0.083;       // 5 minutes cleanup
```

## Group Size Distribution

Customers arrive in groups with realistic size distribution:

```typescript
function generateGroupSize(rng: Random): number {
  const rand = rng.uniform(0, 1);
  if (rand < 0.3) return 1;              // 30% singles
  if (rand < 0.6) return 2;              // 30% couples
  if (rand < 0.85) return rng.randint(3, 4);  // 25% small groups
  return rng.randint(5, 6);              // 15% large groups
}
```

## Implementation

### Customer Group Process

Each group goes through multiple stages, acquiring and releasing resources:

```typescript
function* customerGroupProcess(
  id: number,
  groupSize: number,
  tables: Resource,
  servers: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  const arrivalTime = sim.now;

  // 1. Wait for table
  yield tables.request();
  const seatedTime = sim.now;
  const waitTime = seatedTime - arrivalTime;

  stats.recordValue('wait-time-minutes', waitTime * 60);
  stats.increment('groups-seated');
  stats.increment('customers-seated', groupSize);

  // 2. Request server for taking order
  yield servers.request();
  const orderTime = rng.exponential(ORDER_TIME_MEAN);
  yield* timeout(orderTime);
  servers.release();  // Server freed after taking order

  // 3. Eating (table still occupied, no server needed)
  const mealTime = Math.max(0.25, rng.normal(MEAL_TIME_MEAN, MEAL_TIME_STDDEV));
  yield* timeout(mealTime);

  // 4. Request server for payment
  yield servers.request();
  const paymentTime = rng.exponential(ORDER_TIME_MEAN / 2);
  yield* timeout(paymentTime);
  servers.release();

  // 5. Cleanup and release table
  yield* timeout(CLEANUP_TIME);
  tables.release();

  // Track total dining time
  const totalTime = sim.now - arrivalTime;
  stats.recordValue('total-time-minutes', totalTime * 60);
}
```

### Arrival Process

```typescript
function* arrivalProcess(tables, servers, stats, rng, sim, until) {
  let groupId = 0;

  while (sim.now < until) {
    const groupSize = generateGroupSize(rng);
    sim.process(() => customerGroupProcess(groupId++, groupSize, tables, servers, stats, rng, sim));

    const interarrivalTime = rng.exponential(1 / CUSTOMER_GROUP_ARRIVAL_RATE);
    yield* timeout(interarrivalTime);
  }
}
```

## Resource Coordination

This example demonstrates **sequential resource use**:

1. **Table** - Acquired at seating, held throughout meal, released after cleanup
2. **Server** - Acquired briefly for order → released → acquired again for payment

Key insight: Servers are only needed during order/payment, not during the meal itself. This allows servers to help multiple tables concurrently.

## Statistics Tracked

| Metric | Description |
|--------|-------------|
| `groups-seated` | Number of groups served |
| `customers-seated` | Total individual customers |
| `wait-time-minutes` | Wait time before being seated |
| `wait-solo` | Wait times for solo diners |
| `wait-couple` | Wait times for couples |
| `wait-group` | Wait times for larger groups |
| `total-time-minutes` | Total dining experience time |

## Sample Results

```
Simulation Results
============================================================

Service Summary:
  Groups served: 38
  Total customers: 94
  Average group size: 2.5
  Throughput: 4.8 groups/hour

Wait Time Performance:
  Overall average: 8.2 minutes
  Solo diners: 5.1 minutes
  Couples: 7.3 minutes
  Groups (3+): 12.4 minutes

Time in Restaurant:
  Average total time: 68.5 minutes
  (Wait + Order + Meal + Payment + Cleanup)

Resource Utilization:
  Tables: 71.2%
  Servers: 54.3%

Customer Satisfaction:
  Satisfied (wait ≤ 15 min): 32 groups (84.2%)
  Unhappy (wait > 15 min): 6 groups (15.8%)
```

## What You'll Learn

1. **Multiple Resource Types**: Coordinating tables and servers
2. **Sequential Resource Use**: Request → release → request again
3. **Variable Group Sizes**: Modeling different party sizes
4. **Multi-Stage Processes**: Breaking service into distinct phases
5. **Satisfaction Metrics**: Tracking customer experience

## Key Insights

**Resource Overlap**: Tables are held long-term, servers are used briefly. This asymmetry is common in service systems.

**Large Groups Wait Longer**: Larger groups naturally wait longer since table turnover is slower.

**Server Utilization**: Servers are typically less utilized than tables because they're only needed during order/payment.

## Variations to Try

1. **Table Sizes**: Model specific table capacities (2-top, 4-top, 6-top)
2. **Peak Hours**: Vary arrival rate throughout the day
3. **Reservations**: Add priority for reserved tables
4. **Takeout Orders**: Model to-go orders that only need servers
5. **Server Sections**: Assign servers to specific table zones

## Common Pitfalls

**Forgetting to Release**: Always release resources in reverse order of constraints. Table must be released last.

**Server Contention**: Too few servers causes bottlenecks even with available tables.

**Cleanup Time**: Don't forget table cleanup time between parties.

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/restaurant/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/restaurant';

const results = runSimulation();
console.log(results.satisfaction);
```

## Related Topics

- [Warehouse Operations](/examples/warehouse) - Another multi-stage, multi-resource example
- [Resources](/guide/resources) - Resource management patterns
- [Processes](/guide/processes) - Multi-stage process design
- [Statistics](/guide/statistics) - Collecting metrics

## Reference

Full source code: [examples/restaurant/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/restaurant/index.ts)
