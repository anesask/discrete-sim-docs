# Advanced Features

This guide covers advanced simulation features for debugging, analysis, and optimization.

## Event Tracing

Event tracing provides detailed logging of event execution for debugging and analysis. Track the exact order of events, their timing, and priority handling.

### Enabling Event Tracing

```typescript
import { Simulation } from 'discrete-sim';

const sim = new Simulation();

// Enable event tracing
sim.enableEventTrace();

// Run simulation
sim.run(100);

// Get trace
const trace = sim.getEventTrace();

trace.forEach(entry => {
  console.log(`Event ${entry.eventId} at time ${entry.time} (priority ${entry.priority})`);
});
```

### Event Trace Structure

Each trace entry contains:

```typescript
interface EventTraceEntry {
  eventId: number;      // Unique event identifier
  time: number;         // Simulation time when executed
  priority: number;     // Event priority (lower = higher priority)
  executionOrder: number; // Order in which event was executed
}
```

### Example: Debugging Event Order

```typescript
const sim = new Simulation();
sim.enableEventTrace();

// Schedule events with different priorities
sim.schedule(10, () => console.log('Event A'), 0);
sim.schedule(10, () => console.log('Event B'), 1);
sim.schedule(10, () => console.log('Event C'), 0);

sim.run();

// Analyze execution order
const trace = sim.getEventTrace();
trace.forEach(entry => {
  console.log(`Order ${entry.executionOrder}: Event ${entry.eventId} at t=${entry.time} p=${entry.priority}`);
});

// Output:
// Order 1: Event 1 at t=10 p=0  (Event A - priority 0)
// Order 2: Event 3 at t=10 p=0  (Event C - priority 0, same priority as A)
// Order 3: Event 2 at t=10 p=1  (Event B - priority 1, lower priority)
```

### Clearing Event Trace

```typescript
// Clear trace to save memory
sim.clearEventTrace();

// Disable tracing
sim.disableEventTrace();
```

### Use Cases

**1. Debugging Race Conditions**

```typescript
sim.enableEventTrace();

function* process1() {
  console.log('P1 start');
  yield* timeout(0);  // Zero-delay event
  console.log('P1 end');
}

function* process2() {
  console.log('P2 start');
  yield* timeout(0);  // Zero-delay event
  console.log('P2 end');
}

sim.process(() => process1());
sim.process(() => process2());
sim.run();

// Check trace to see exact execution order
```

**2. Performance Analysis**

```typescript
sim.enableEventTrace();
sim.run(1000);

const trace = sim.getEventTrace();
console.log(`Total events executed: ${trace.length}`);

// Events per time unit
const eventsPerTime = trace.reduce((acc, entry) => {
  acc[Math.floor(entry.time)] = (acc[Math.floor(entry.time)] || 0) + 1;
  return acc;
}, {});

console.log('Events per time unit:', eventsPerTime);
```

**3. Priority Queue Verification**

```typescript
sim.enableEventTrace();

// Schedule events with priorities
for (let i = 0; i < 10; i++) {
  const priority = Math.floor(Math.random() * 5);
  sim.schedule(50, () => {}, priority);
}

sim.run();

// Verify priority ordering
const trace = sim.getEventTrace();
const timeSlice = trace.filter(e => e.time === 50);

console.log('Events at t=50:');
timeSlice.forEach(e => {
  console.log(`  Event ${e.eventId}: priority ${e.priority}`);
});
```

## Warm-up Periods

Warm-up periods exclude initial transient behavior from statistics, providing accurate steady-state analysis.

### Why Use Warm-up Periods?

Many simulations start in an unrealistic state:
- Empty queues in a busy system
- Full inventory in a stockout scenario
- Idle servers that are normally busy

The warm-up period allows the simulation to reach steady state before collecting statistics.

### Setting Warm-up Period

```typescript
import { Simulation } from 'discrete-sim';

const sim = new Simulation();
const stats = sim.statistics;

// Exclude first 100 time units from statistics
stats.setWarmupPeriod(100);

// Run simulation
sim.run(1000);

// Statistics only include time 100-1000
const avgWait = stats.getAverage('wait-time');
```

### Checking Warm-up Status

```typescript
// Get warm-up end time
const warmupEnd = stats.getWarmupPeriod();
console.log(`Warm-up ends at ${warmupEnd}`);

// Check if still in warm-up
if (stats.isInWarmup()) {
  console.log(`Still in warm-up (now: ${sim.now}, warmup: ${warmupEnd})`);
}
```

### Example: Queue System with Warm-up

```typescript
function* customer(id: number, server: Resource) {
  const arrivalTime = sim.now;

  yield server.request();

  const waitTime = sim.now - arrivalTime;

  // This will be excluded if arrival was during warm-up
  stats.recordValue('wait-time', waitTime);

  yield* timeout(5);
  server.release();
}

const sim = new Simulation();
const stats = sim.statistics;
const server = new Resource(sim, 2, { name: 'Server' });

// Set warm-up period
stats.setWarmupPeriod(100);

// Generate arrivals
function* arrivalProcess(rng: Random) {
  let id = 0;
  while (sim.now < 1000) {
    sim.process(() => customer(id++, server));
    yield* timeout(rng.exponential(3));
  }
}

const rng = new Random(42);
sim.process(() => arrivalProcess(rng));

sim.run(1000);

// Statistics from time 100-1000 only
console.log(`Average wait time (steady state): ${stats.getAverage('wait-time').toFixed(2)}`);
console.log(`Server utilization (steady state): ${stats.getAverage('Server:utilization').toFixed(3)}`);
```

### How Warm-up Affects Statistics

| Statistic Type | Warm-up Behavior |
|---------------|------------------|
| **Counters** | All increments counted (no warm-up) |
| **Values** | Samples during warm-up excluded |
| **Time-weighted** | Only time after warm-up counted |
| **Resource stats** | Only time after warm-up counted |

### Determining Warm-up Length

Use visual analysis or statistical methods:

```typescript
// Method 1: Visual inspection
const sim = new Simulation();
const stats = sim.statistics;

function* monitor() {
  while (sim.now < 500) {
    console.log(`t=${sim.now.toFixed(0)}: queue=${server.queueLength}, util=${(server.inUse/server.capacity).toFixed(2)}`);
    yield* timeout(10);
  }
}

sim.process(() => monitor());
sim.run(500);

// Look for point where metrics stabilize
// Then set warm-up period to that point
stats.setWarmupPeriod(150);
```

```typescript
// Method 2: Multiple replications
const warmupLengths = [0, 50, 100, 150, 200];
const results = [];

for (const warmup of warmupLengths) {
  const sim = new Simulation();
  sim.statistics.setWarmupPeriod(warmup);

  // Run simulation
  runSimulation(sim);

  results.push({
    warmup,
    avgWait: sim.statistics.getAverage('wait-time')
  });
}

// Choose warmup where results stabilize
console.log('Warmup analysis:');
results.forEach(r => {
  console.log(`  Warmup ${r.warmup}: avg wait = ${r.avgWait.toFixed(2)}`);
});
```

## Configurable Condition Waiting

The `waitFor` helper supports customizable polling for condition-based waiting.

### Basic Usage

```typescript
import { waitFor } from 'discrete-sim';

function* process() {
  // Wait for condition to be true
  yield* waitFor(sim, () => resource.available > 0);

  // Condition is now true
  console.log('Resource is available!');
}
```

### Configurable Polling

```typescript
import { waitFor, ConditionTimeoutError } from 'discrete-sim';

function* process() {
  try {
    // Check every 2 time units, max 50 iterations
    yield* waitFor(
      sim,
      () => inventory.level > 100,
      {
        interval: 2,           // Check every 2 time units
        maxIterations: 50      // Timeout after 50 checks (100 time units)
      }
    );

    console.log('Inventory restocked!');
  } catch (error) {
    if (error instanceof ConditionTimeoutError) {
      console.log('Timeout waiting for inventory');
    }
  }
}
```

### Options

```typescript
interface WaitForOptions {
  interval?: number;       // Polling interval (default: 1)
  maxIterations?: number;  // Max polls before timeout (default: Infinity)
}
```

### Use Cases

**1. Wait for Resource Availability**

```typescript
function* process() {
  // Wait for at least 2 servers available
  yield* waitFor(sim, () => server.available >= 2);

  // Grab both servers
  yield server.request();
  yield server.request();

  // Use servers
  yield* timeout(10);

  server.release();
  server.release();
}
```

**2. Wait for Inventory Threshold**

```typescript
function* restockingProcess(inventory: Buffer) {
  while (true) {
    // Wait for low inventory
    yield* waitFor(
      sim,
      () => inventory.level < 1000,
      { interval: 1, maxIterations: 1000 }
    );

    console.log(`Restocking (level: ${inventory.level})`);

    // Restock
    yield inventory.put(5000);
  }
}
```

**3. Coordinated Conditions**

```typescript
function* coordinatedProcess() {
  // Wait for multiple conditions
  yield* waitFor(sim, () =>
    machineA.available > 0 &&
    machineB.available > 0 &&
    inventory.level >= 50
  );

  // All conditions met
  console.log('Starting coordinated operation');
}
```

## Process Cleanup on Reset

When resetting a simulation, all active processes are automatically interrupted and cleaned up.

### Reset Behavior

```typescript
const sim = new Simulation();

function* longRunningProcess() {
  try {
    while (true) {
      yield* timeout(10);
      console.log(`Still running at ${sim.now}`);
    }
  } catch (error) {
    console.log('Process interrupted during reset');
    // Cleanup code here
  }
}

sim.process(() => longRunningProcess());

// Run for a while
sim.run(50);

// Reset interrupts all processes
sim.reset();

// Processes are automatically cleaned up
console.log('Simulation reset, all processes stopped');
```

### Graceful Cleanup

```typescript
function* processWithCleanup(resource: Resource) {
  try {
    yield resource.request();

    // Do work
    yield* timeout(10);

    resource.release();
  } catch (error) {
    // Always cleanup, even on interruption
    if (resource.inUse > 0) {
      resource.release();
    }
    console.log('Cleaned up resources before exit');
  }
}
```

## Best Practices

### Event Tracing

1. **Enable only when debugging** - Tracing adds memory overhead
2. **Clear trace periodically** - For long simulations
3. **Use for verification** - Confirm priority queuing works correctly

### Warm-up Periods

1. **Always use for steady-state analysis** - Critical for accurate results
2. **Determine length empirically** - Run pilot simulations
3. **Document your choice** - Explain warm-up period selection
4. **Multiple replications** - Verify results with different warm-up lengths

### Condition Waiting

1. **Set reasonable timeouts** - Prevent infinite loops
2. **Use appropriate intervals** - Balance responsiveness vs overhead
3. **Handle timeout errors** - Always catch `ConditionTimeoutError`

### Process Cleanup

1. **Always use try-catch** - Handle interruptions gracefully
2. **Release resources in finally** - Ensure cleanup
3. **Test reset behavior** - Verify processes clean up correctly

## Related Topics

- [Statistics Guide](/guide/statistics) - Warm-up periods and metrics
- [Processes Guide](/guide/processes) - Process lifecycle
- [Error Handling](/guide/errors) - Exception handling

## See Also

- [Simulation API](/api/simulation) - Event tracing methods
- [Statistics API](/api/statistics) - Warm-up period methods
