# Statistics

The `Statistics` class provides comprehensive data collection and analysis for your simulations. It tracks counters, time-weighted averages, and timeseries data.

## Creating Statistics

```typescript
import { Simulation, Statistics } from 'discrete-sim';

const sim = new Simulation();
const stats = new Statistics(sim);
```

The simulation instance automatically includes a statistics object:

```typescript
const sim = new Simulation();
// Use sim.statistics directly
sim.statistics.increment('customers-served');
```

## Recording Data

### Counters

Track discrete events:

```typescript
stats.increment('customers-served');
stats.increment('defects-found', 3);  // Increment by 3
```

Get counter values:

```typescript
const total = stats.getCounter('customers-served');
console.log(`Total customers served: ${total}`);
```

### Values

Record measurements at specific times:

```typescript
stats.recordValue('wait-time', 12.5);
stats.recordValue('queue-length', 5);
```

Calculate statistics:

```typescript
// Average
const avgWait = stats.getAverage('wait-time');

// Min/Max
const minWait = stats.getMin('wait-time');
const maxWait = stats.getMax('wait-time');

// Standard deviation
const stdWait = stats.getStdDev('wait-time');

// Total count of recorded values
const count = stats.getCount('wait-time');
```

### Advanced Statistics

For deeper analysis, enable sample tracking to access percentiles, histograms, and more:

```typescript
// Enable sample tracking for a metric
stats.enableSampleTracking('wait-time');

// Record samples (same as recordValue)
stats.recordSample('wait-time', 12.5);
stats.recordSample('wait-time', 8.3);
stats.recordSample('wait-time', 15.2);

// Percentiles (for SLA tracking)
const p50 = stats.getPercentile('wait-time', 50);   // Median
const p95 = stats.getPercentile('wait-time', 95);   // 95th percentile
const p99 = stats.getPercentile('wait-time', 99);   // 99th percentile

// Histogram distribution
const histogram = stats.getHistogram('wait-time', 10);  // 10 bins
histogram.forEach(bin => {
  console.log(`${bin.min}-${bin.max}: ${bin.count} samples`);
});

// Variance and standard deviation
const variance = stats.getVariance('wait-time');
const stdDev = stats.getStdDev('wait-time');

// Sample statistics
const sampleMean = stats.getSampleMean('wait-time');
const sampleCount = stats.getSampleCount('wait-time');
```

### Time-Weighted Averages

For metrics that change over time and should be weighted by duration:

```typescript
stats.recordTimeWeighted('queue-length', 3);  // Queue has 3 customers
// ... time passes ...
stats.recordTimeWeighted('queue-length', 5);  // Now has 5 customers
```

Get time-weighted average:

```typescript
const avgQueueLength = stats.getTimeWeightedAverage('queue-length');
```

## Automatic Resource Statistics

Resources automatically track statistics when given a name:

```typescript
const server = new Resource(sim, 2, { name: 'Server' });

// After simulation
console.log(sim.statistics.getAverage('Server:utilization'));  // 0-1
console.log(sim.statistics.getAverage('Server:queue-length'));
console.log(sim.statistics.getAverage('Server:wait-time'));
```

## Examples

### Customer Service Metrics

```typescript
import { Simulation, Resource, Statistics, timeout } from 'discrete-sim';

function* customer(id: number, server: Resource, stats: Statistics) {
  const arrivalTime = sim.now;
  stats.increment('arrivals');

  yield server.request();

  const waitTime = sim.now - arrivalTime;
  stats.recordValue('wait-time', waitTime);

  const serviceTime = 5 + Math.random() * 5;
  yield* timeout(serviceTime);
  stats.recordValue('service-time', serviceTime);

  server.release();
  stats.increment('departures');
}

const sim = new Simulation();
const stats = new Statistics(sim);
const server = new Resource(sim, 2, { name: 'Server' });

// Generate customers
for (let i = 0; i < 100; i++) {
  sim.schedule(i * 2, () => {
    sim.process(() => customer(i, server, stats));
  });
}

sim.run();

// Print summary
console.log('=== Simulation Results ===');
console.log(`Customers served: ${stats.getCounter('departures')}`);
console.log(`Average wait time: ${stats.getAverage('wait-time').toFixed(2)}`);
console.log(`Max wait time: ${stats.getMax('wait-time').toFixed(2)}`);
console.log(`Average service time: ${stats.getAverage('service-time').toFixed(2)}`);
console.log(`Server utilization: ${(stats.getAverage('Server:utilization') * 100).toFixed(1)}%`);
```

### Manufacturing Throughput

```typescript
function* machine(id: number, stats: Statistics) {
  let produced = 0;

  while (sim.now < 480) {  // 8 hour shift
    // Processing time
    const processTime = 10 + Math.random() * 5;
    yield* timeout(processTime);

    produced++;
    stats.increment('units-produced');
    stats.recordValue('cycle-time', processTime);

    // Random breakdown (5% chance)
    if (Math.random() < 0.05) {
      console.log(`Machine ${id} breakdown at ${sim.now}`);
      stats.increment('breakdowns');
      yield* timeout(30);  // Repair time
    }
  }

  console.log(`Machine ${id} produced ${produced} units`);
}

const sim = new Simulation();
const stats = new Statistics(sim);

// 3 machines
for (let i = 0; i < 3; i++) {
  sim.process(() => machine(i, stats));
}

sim.run(480);

console.log(`Total production: ${stats.getCounter('units-produced')}`);
console.log(`Average cycle time: ${stats.getAverage('cycle-time').toFixed(2)}`);
console.log(`Total breakdowns: ${stats.getCounter('breakdowns')}`);
```

### System Monitoring

```typescript
function* monitor(resource: Resource, stats: Statistics) {
  while (true) {
    // Record current state
    stats.recordTimeWeighted('system-in-use', resource.inUse);
    stats.recordTimeWeighted('system-queue', resource.queueLength);

    yield* timeout(1);  // Sample every time unit
  }
}

const sim = new Simulation();
const stats = new Statistics(sim);
const server = new Resource(sim, 3);

sim.process(() => monitor(server, stats));

// Run simulation with arrivals...

console.log(`Average in use: ${stats.getTimeWeightedAverage('system-in-use').toFixed(2)}`);
console.log(`Average queue: ${stats.getTimeWeightedAverage('system-queue').toFixed(2)}`);
```

### Warm-up Periods

Exclude initial transient behavior from statistics to get accurate steady-state results:

```typescript
const sim = new Simulation();
const stats = sim.statistics;

// Set warm-up period (exclude first 100 time units)
stats.setWarmupPeriod(100);

// Check if in warm-up
if (stats.isInWarmup()) {
  console.log('Still in warm-up period');
}

// Statistics automatically exclude warm-up period
sim.run(500);

const avgWait = stats.getAverage('wait-time');  // Only counts after time 100
```

### SLA Tracking Example

```typescript
function* customer(id: number, server: Resource, stats: Statistics) {
  stats.enableSampleTracking('wait-time');

  const arrivalTime = sim.now;
  yield server.request();

  const waitTime = sim.now - arrivalTime;
  stats.recordSample('wait-time', waitTime);

  yield* timeout(5);
  server.release();
}

// After simulation
const p95 = stats.getPercentile('wait-time', 95);
const p99 = stats.getPercentile('wait-time', 99);

console.log(`95% of customers waited less than ${p95.toFixed(2)} minutes`);
console.log(`99% of customers waited less than ${p99.toFixed(2)} minutes`);

// Check SLA: 95% of customers should wait < 10 minutes
if (p95 < 10) {
  console.log('✓ SLA met');
} else {
  console.log('✗ SLA violated');
}
```

### Histogram Distribution Example

```typescript
stats.enableSampleTracking('service-time');

// After simulation with many samples
const histogram = stats.getHistogram('service-time', 10);

console.log('\nService Time Distribution:');
histogram.forEach(bin => {
  const bar = '█'.repeat(Math.round(bin.count / 10));
  console.log(`${bin.min.toFixed(1)}-${bin.max.toFixed(1)}: ${bar} (${bin.count})`);
});
```

## Best Practices

### Use Descriptive Names

```typescript
// Good
stats.recordValue('customer-wait-time', waitTime);
stats.increment('orders-completed');

// Avoid
stats.recordValue('time', waitTime);
stats.increment('count');
```

### Record at the Right Time

```typescript
function* customer(server: Resource, stats: Statistics) {
  const arrivalTime = sim.now;

  yield server.request();

  // Record wait time AFTER waiting
  const waitTime = sim.now - arrivalTime;
  stats.recordValue('wait-time', waitTime);

  yield* timeout(5);

  // Record service completion AFTER service
  stats.increment('customers-served');

  server.release();
}
```

### Use Time-Weighted for State Variables

For metrics representing system state over time:

```typescript
// Good - state changes
stats.recordTimeWeighted('queue-length', queue.length);
stats.recordTimeWeighted('utilization', resource.inUse / resource.capacity);

// Use regular recordValue for measurements
stats.recordValue('wait-time', waitTime);
stats.recordValue('processing-time', processingTime);
```

### Organize Statistics by Category

```typescript
// Use consistent prefixes
stats.recordValue('customer:wait-time', waitTime);
stats.recordValue('customer:service-time', serviceTime);
stats.recordValue('machine:cycle-time', cycleTime);
stats.recordValue('machine:downtime', downtime);
```

## Statistics API Reference

### Recording Methods

```typescript
// Counters
stats.increment(name: string, amount?: number): void
stats.getCounter(name: string): number

// Values
stats.recordValue(name: string, value: number): void
stats.getAverage(name: string): number
stats.getMin(name: string): number
stats.getMax(name: string): number
stats.getStdDev(name: string): number
stats.getCount(name: string): number

// Time-weighted
stats.recordTimeWeighted(name: string, value: number): void
stats.getTimeWeightedAverage(name: string): number
```

### Advanced Statistics Methods

```typescript
// Sample tracking
stats.enableSampleTracking(name: string): void
stats.recordSample(name: string, value: number): void

// Percentiles
stats.getPercentile(name: string, percentile: number): number

// Histogram
stats.getHistogram(name: string, bins: number): HistogramBin[]

interface HistogramBin {
  min: number;
  max: number;
  count: number;
  frequency: number;  // 0-1
}

// Variance
stats.getVariance(name: string): number

// Sample statistics
stats.getSampleMean(name: string): number
stats.getSampleCount(name: string): number
```

### Warm-up Period Methods

```typescript
// Set warm-up period end time
stats.setWarmupPeriod(endTime: number): void

// Get current warm-up period
stats.getWarmupPeriod(): number

// Check if still in warm-up
stats.isInWarmup(): boolean
```

### Clearing Statistics

```typescript
// Clear all statistics
stats.clear();

// Clear specific metric
stats.clearMetric('wait-time');
```

### Export Methods

```typescript
// Export to JSON
const json = stats.toJSON();

// Export to CSV
const csv = stats.toCSV();
```

## Common Metrics

### Queueing Systems
- `wait-time` - Time spent waiting in queue
- `service-time` - Time spent being served
- `system-time` - Total time in system (wait + service)
- `queue-length` - Number waiting (time-weighted)
- `utilization` - Fraction of capacity used (time-weighted)

### Manufacturing
- `cycle-time` - Time to produce one unit
- `throughput` - Units produced per time period
- `work-in-progress` - Items being processed (time-weighted)
- `machine-uptime` - Fraction of time operational
- `defect-rate` - Defects per unit produced

### Healthcare
- `patient-wait-time` - Time until treatment starts
- `length-of-stay` - Total time in facility
- `bed-occupancy` - Fraction of beds occupied (time-weighted)
- `staff-utilization` - Staff busy time fraction

## Next Steps

- Learn about [Random Numbers](./random) for stochastic simulations
- Explore [Error Handling](./errors) for robust simulations
- See [Examples](/examples/) for complete statistical analysis
