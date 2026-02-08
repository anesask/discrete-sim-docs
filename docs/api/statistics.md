# Statistics

The `Statistics` class provides comprehensive data collection and analysis for simulations, including counters, value tracking, and time-weighted averages.

## Constructor

```typescript
new Statistics(sim: Simulation)
```

**Parameters:**
- `sim` - Simulation instance (for time-weighted calculations)

**Example:**

```typescript
import { Simulation, Statistics } from 'discrete-sim';

const sim = new Simulation();
const stats = new Statistics(sim);

// Or use the built-in instance
const stats = sim.statistics;
```

## Recording Methods

### `increment()`

```typescript
stats.increment(name: string, amount?: number): void
```

Increment a counter by specified amount (default: 1).

**Parameters:**
- `name` - Counter name
- `amount` - Amount to add (default: 1, can be negative)

**Example:**

```typescript
stats.increment('customers-served');
stats.increment('items-produced', 5);
stats.increment('defects', -1);  // Decrement

console.log(stats.getCounter('customers-served'));  // 1
console.log(stats.getCounter('items-produced'));    // 5
```

**Use For:** Counting discrete events (arrivals, departures, errors, etc.)

### `recordValue()`

```typescript
stats.recordValue(name: string, value: number): void
```

Record a measurement value for statistical analysis.

**Parameters:**
- `name` - Metric name
- `value` - Value to record

**Example:**

```typescript
stats.recordValue('wait-time', 12.5);
stats.recordValue('service-time', 8.3);
stats.recordValue('queue-length', 5);

console.log(stats.getAverage('wait-time'));  // 12.5
console.log(stats.getMin('wait-time'));      // 12.5
console.log(stats.getMax('wait-time'));      // 12.5
```

**Use For:** Measurements that vary (times, lengths, quantities)

### `recordTimeWeighted()`

```typescript
stats.recordTimeWeighted(name: string, value: number): void
```

Record a value to be averaged weighted by duration.

**Parameters:**
- `name` - Metric name
- `value` - Current value of the state variable

**Example:**

```typescript
// System starts empty
stats.recordTimeWeighted('queue-length', 0);

// At time 5, 3 customers arrive
stats.recordTimeWeighted('queue-length', 3);

// At time 10, 2 more customers
stats.recordTimeWeighted('queue-length', 5);

// Time-weighted average accounts for duration
console.log(stats.getTimeWeightedAverage('queue-length'));
```

**Use For:** State variables that change over time (queue lengths, utilization, inventory)

## Retrieval Methods

### `getCounter()`

```typescript
stats.getCounter(name: string): number
```

Get counter value.

**Returns:** Total count (default: 0)

**Example:**

```typescript
stats.increment('arrivals', 10);
console.log(stats.getCounter('arrivals'));  // 10
```

### `getAverage()`

```typescript
stats.getAverage(name: string): number
```

Get arithmetic mean of recorded values.

**Returns:** Average (default: 0)

**Example:**

```typescript
stats.recordValue('wait-time', 10);
stats.recordValue('wait-time', 20);
stats.recordValue('wait-time', 30);

console.log(stats.getAverage('wait-time'));  // 20
```

### `getMin()`

```typescript
stats.getMin(name: string): number
```

Get minimum recorded value.

**Returns:** Minimum (default: Infinity)

**Example:**

```typescript
stats.recordValue('wait-time', 10);
stats.recordValue('wait-time', 5);
stats.recordValue('wait-time', 15);

console.log(stats.getMin('wait-time'));  // 5
```

### `getMax()`

```typescript
stats.getMax(name: string): number
```

Get maximum recorded value.

**Returns:** Maximum (default: -Infinity)

**Example:**

```typescript
stats.recordValue('wait-time', 10);
stats.recordValue('wait-time', 25);
stats.recordValue('wait-time', 15);

console.log(stats.getMax('wait-time'));  // 25
```

### `getStdDev()`

```typescript
stats.getStdDev(name: string): number
```

Get standard deviation of recorded values.

**Returns:** Standard deviation (default: 0)

**Example:**

```typescript
stats.recordValue('process-time', 10);
stats.recordValue('process-time', 12);
stats.recordValue('process-time', 8);

console.log(stats.getStdDev('process-time'));
```

### `getCount()`

```typescript
stats.getCount(name: string): number
```

Get number of recorded values.

**Returns:** Count of observations (default: 0)

**Example:**

```typescript
stats.recordValue('wait-time', 10);
stats.recordValue('wait-time', 20);
stats.recordValue('wait-time', 30);

console.log(stats.getCount('wait-time'));  // 3
```

### `getTimeWeightedAverage()`

```typescript
stats.getTimeWeightedAverage(name: string): number
```

Get time-weighted average of state variable.

**Returns:** Time-weighted average (default: 0)

**Example:**

```typescript
// At time 0: queue has 0 customers
stats.recordTimeWeighted('queue-length', 0);

// At time 5: queue has 3 customers (lasted 5 time units)
stats.recordTimeWeighted('queue-length', 3);

// At time 15: queue has 1 customer (lasted 10 time units)
stats.recordTimeWeighted('queue-length', 1);

// Weighted: (0*5 + 3*10 + 1*5) / 20 = 1.75
console.log(stats.getTimeWeightedAverage('queue-length'));
```

## Utility Methods

### `clear()`

```typescript
stats.clear(): void
```

Clear all recorded statistics.

**Example:**

```typescript
// Warm-up period
sim.run(100);

// Clear warm-up statistics
stats.clear();

// Measurement period
sim.run(400);

// Statistics only reflect time 100-500
console.log(stats.getAverage('wait-time'));
```

### `clearMetric()`

```typescript
stats.clearMetric(name: string): void
```

Clear specific metric.

**Example:**

```typescript
stats.clearMetric('wait-time');

console.log(stats.getCount('wait-time'));  // 0
```

## Examples

### Example: Customer Service Statistics

```typescript
import { Simulation, Resource, Statistics, timeout } from 'discrete-sim';

const sim = new Simulation();
const stats = sim.statistics;
const server = new Resource(sim, 2, { name: 'Server' });

function* customer(id: number) {
  const arrival = sim.now;
  stats.increment('arrivals');

  yield server.request();

  const wait = sim.now - arrival;
  stats.recordValue('wait-time', wait);

  const serviceTime = 5 + Math.random() * 5;
  yield* timeout(serviceTime);
  stats.recordValue('service-time', serviceTime);

  server.release();
  stats.increment('departures');
}

// Generate arrivals
for (let i = 0; i < 100; i++) {
  sim.schedule(i * 2, () => {
    sim.process(() => customer(i));
  });
}

sim.run();

// Report
console.log('=== Simulation Results ===');
console.log(`Customers arrived: ${stats.getCounter('arrivals')}`);
console.log(`Customers served: ${stats.getCounter('departures')}`);
console.log(`Avg wait time: ${stats.getAverage('wait-time').toFixed(2)}`);
console.log(`Max wait time: ${stats.getMax('wait-time').toFixed(2)}`);
console.log(`Avg service time: ${stats.getAverage('service-time').toFixed(2)}`);
console.log(`Server utilization: ${(stats.getAverage('Server:utilization') * 100).toFixed(1)}%`);
```

### Example: Manufacturing Statistics

```typescript
function* machine(id: number, stats: Statistics, rng: Random) {
  let produced = 0;

  while (sim.now < 480) {
    // Processing
    const cycleTime = rng.normal(10, 1);
    yield* timeout(Math.max(0.1, cycleTime));

    produced++;
    stats.increment('units-produced');
    stats.recordValue('cycle-time', cycleTime);

    // Quality check
    if (rng.random() < 0.95) {
      stats.increment('quality-passed');
    } else {
      stats.increment('defects');
    }

    // Random breakdown
    if (rng.random() < 0.02) {
      const downtime = rng.triangular(10, 20, 60);
      stats.recordValue('downtime', downtime);
      stats.increment('breakdowns');

      yield* timeout(downtime);
    }
  }

  console.log(`Machine ${id} produced ${produced} units`);
}

const sim = new Simulation();
const stats = sim.statistics;
const rng = new Random(42);

for (let i = 0; i < 3; i++) {
  sim.process(() => machine(i, stats, rng));
}

sim.run(480);

console.log('\n=== Manufacturing Report ===');
console.log(`Total units: ${stats.getCounter('units-produced')}`);
console.log(`Quality passed: ${stats.getCounter('quality-passed')}`);
console.log(`Defects: ${stats.getCounter('defects')}`);
console.log(`Defect rate: ${(stats.getCounter('defects') / stats.getCounter('units-produced') * 100).toFixed(2)}%`);
console.log(`Avg cycle time: ${stats.getAverage('cycle-time').toFixed(2)}`);
console.log(`Breakdowns: ${stats.getCounter('breakdowns')}`);
console.log(`Avg downtime: ${stats.getAverage('downtime').toFixed(2)}`);
```

### Example: Time-Weighted Statistics

```typescript
function* systemMonitor(resource: Resource, stats: Statistics) {
  while (true) {
    // Record current system state
    stats.recordTimeWeighted('queue-length', resource.queueLength);
    stats.recordTimeWeighted('servers-busy', resource.inUse);
    stats.recordTimeWeighted('utilization', resource.inUse / resource.capacity);

    yield* timeout(1);  // Sample every time unit
  }
}

const sim = new Simulation();
const stats = sim.statistics;
const server = new Resource(sim, 3);

sim.process(() => systemMonitor(server, stats));

// Run simulation with arrivals...
sim.run(100);

console.log('=== Time-Weighted Averages ===');
console.log(`Avg queue length: ${stats.getTimeWeightedAverage('queue-length').toFixed(2)}`);
console.log(`Avg servers busy: ${stats.getTimeWeightedAverage('servers-busy').toFixed(2)}`);
console.log(`Utilization: ${(stats.getTimeWeightedAverage('utilization') * 100).toFixed(1)}%`);
```

### Example: Warm-Up Period

```typescript
const sim = new Simulation();
const stats = sim.statistics;

// Warm-up period - not measured
console.log('=== Warm-up Period ===');
sim.run(100);

console.log('Clearing warm-up statistics...');
stats.clear();

// Measurement period
console.log('=== Measurement Period ===');
sim.run(500);

// Statistics only reflect measurement period (100-500)
console.log(`\nMeasured avg wait time: ${stats.getAverage('wait-time').toFixed(2)}`);
```

## Automatic Resource Statistics

Resources with names automatically track statistics:

```typescript
const server = new Resource(sim, 2, { name: 'Server' });

// Automatic metrics created:
// - Server:utilization (time-weighted)
// - Server:queue-length (time-weighted)
// - Server:wait-time (per request)

sim.run();

console.log(sim.statistics.getAverage('Server:utilization'));
console.log(sim.statistics.getAverage('Server:queue-length'));
console.log(sim.statistics.getAverage('Server:wait-time'));
```

## Common Patterns

### Pattern: Categorical Statistics

```typescript
// Track by category
function* customer(type: 'regular' | 'vip') {
  const arrival = sim.now;

  yield server.request();

  const wait = sim.now - arrival;
  stats.recordValue(`${type}:wait-time`, wait);
  stats.increment(`${type}:count`);

  yield* timeout(5);
  server.release();
}

// Later
console.log(`Regular avg wait: ${stats.getAverage('regular:wait-time')}`);
console.log(`VIP avg wait: ${stats.getAverage('vip:wait-time')}`);
```

### Pattern: Percentile Tracking

```typescript
// Collect all values for percentile calculation
const waitTimes: number[] = [];

function* customer() {
  const arrival = sim.now;
  yield server.request();

  const wait = sim.now - arrival;
  waitTimes.push(wait);
  stats.recordValue('wait-time', wait);

  yield* timeout(5);
  server.release();
}

sim.run();

// Calculate percentiles
waitTimes.sort((a, b) => a - b);
const p50 = waitTimes[Math.floor(waitTimes.length * 0.50)];
const p95 = waitTimes[Math.floor(waitTimes.length * 0.95)];
const p99 = waitTimes[Math.floor(waitTimes.length * 0.99)];

console.log(`Median wait: ${p50}`);
console.log(`95th percentile: ${p95}`);
console.log(`99th percentile: ${p99}`);
```

### Pattern: Conditional Tracking

```typescript
function* customer() {
  const arrival = sim.now;

  yield server.request();

  const wait = sim.now - arrival;
  stats.recordValue('wait-time', wait);

  // Track long waits separately
  if (wait > 20) {
    stats.increment('long-waits');
    stats.recordValue('long-wait-time', wait);
  }

  yield* timeout(5);
  server.release();
}
```

## Best Practices

### 1. Use Descriptive Names

```typescript
// Good
stats.recordValue('customer-wait-time', wait);
stats.increment('orders-completed');

// Avoid
stats.recordValue('time', wait);
stats.increment('count');
```

### 2. Choose Right Method

```typescript
// Counters - discrete events
stats.increment('customers-arrived');

// Values - measurements
stats.recordValue('wait-time', 12.5);

// Time-weighted - state variables
stats.recordTimeWeighted('queue-length', queue.length);
```

### 3. Use Consistent Prefixes

```typescript
// Group related metrics
stats.recordValue('server:wait-time', wait);
stats.recordValue('server:service-time', service);
stats.increment('server:customers');
```

### 4. Record at Right Time

```typescript
function* customer() {
  stats.increment('arrivals');  // On arrival

  const arrival = sim.now;
  yield server.request();

  const wait = sim.now - arrival;
  stats.recordValue('wait-time', wait);  // After waiting

  yield* timeout(5);

  stats.increment('departures');  // On departure
  server.release();
}
```

## See Also

- [Guide: Statistics](/guide/statistics) - Statistical analysis patterns
- [Resource API](./resource) - Automatic resource statistics
- [Simulation API](./simulation) - Accessing sim.statistics
