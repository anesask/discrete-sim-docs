# Simulation

The `Simulation` class is the main engine that manages time, events, and process execution.

## Constructor

```typescript
new Simulation()
```

Creates a new simulation instance.

**Example:**

```typescript
import { Simulation } from 'discrete-sim';

const sim = new Simulation();
```

## Properties

### `now`

```typescript
sim.now: number
```

Current simulation time. Starts at 0 and advances as events are processed.

**Example:**

```typescript
console.log(`Current time: ${sim.now}`);

sim.schedule(10, () => {
  console.log(`Time is now: ${sim.now}`);  // 10
});

sim.run();
```

**Read-only** - Do not modify directly. Time advances automatically during simulation.

### `statistics`

```typescript
sim.statistics: Statistics
```

Built-in statistics instance for collecting data.

**Example:**

```typescript
sim.statistics.increment('customers-served');
sim.statistics.recordValue('wait-time', 12.5);

console.log(sim.statistics.getCounter('customers-served'));
```

See [Statistics API](./statistics) for complete documentation.

## Methods

### `process()`

```typescript
sim.process(generator: () => Generator): Process
```

Start a new process from a generator function.

**Parameters:**
- `generator` - Function that returns a generator (process logic)

**Returns:** `Process` instance

**Example:**

```typescript
function* customer(id: number) {
  console.log(`Customer ${id} arrives at ${sim.now}`);
  yield* timeout(5);
  console.log(`Customer ${id} leaves at ${sim.now}`);
}

const process = sim.process(() => customer(1));
```

**Important:** Pass a function that returns the generator, not the generator itself:

```typescript
// Correct
sim.process(() => customer(1));

// Wrong - don't call the generator directly
sim.process(customer(1));  // Error!
```

### `schedule()`

```typescript
sim.schedule(time: number, callback: () => void): void
```

Schedule a callback to execute at a specific simulation time.

**Parameters:**
- `time` - Absolute simulation time to execute callback
- `callback` - Function to execute

**Example:**

```typescript
sim.schedule(10, () => {
  console.log('Event at time 10');
});

sim.schedule(20, () => {
  console.log('Event at time 20');
});

sim.run();
```

**Validation:**
- `time` must be >= current simulation time (`sim.now`)
- Throws `ValidationError` if time is in the past

### `run()`

```typescript
sim.run(until?: number): void
```

Run the simulation until completion or specified time.

**Parameters:**
- `until` (optional) - Stop simulation at this time

**Example:**

```typescript
// Run until no more events
sim.run();

// Run for 100 time units
sim.run(100);

// Run for 8 hour work day (480 minutes)
sim.run(480);
```

**Behavior:**
- Without `until`: Runs until event queue is empty
- With `until`: Stops at specified time (may leave events unprocessed)
- Events are processed in chronological order
- If multiple events have same time, they're processed in scheduling order

## Complete Example

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';

// Create simulation
const sim = new Simulation();
const server = new Resource(sim, 2, { name: 'Server' });

// Define customer process
function* customer(id: number) {
  const arrival = sim.now;
  console.log(`[${sim.now}] Customer ${id} arrived`);

  yield server.request();
  const wait = sim.now - arrival;
  console.log(`[${sim.now}] Customer ${id} waited ${wait.toFixed(2)}`);

  yield* timeout(5);

  server.release();
  console.log(`[${sim.now}] Customer ${id} departed`);
}

// Schedule arrivals
for (let i = 0; i < 5; i++) {
  sim.schedule(i * 3, () => {
    sim.process(() => customer(i));
  });
}

// Run simulation
sim.run();

// Print statistics
console.log('\n=== Statistics ===');
console.log(`Simulation ended at time: ${sim.now}`);
console.log(`Server utilization: ${(sim.statistics.getAverage('Server:utilization') * 100).toFixed(1)}%`);
console.log(`Average wait time: ${sim.statistics.getAverage('Server:wait-time').toFixed(2)}`);
```

## Pattern: Arrival Process

Use a generator to model continuous arrivals:

```typescript
import { Random } from 'discrete-sim';

function* arrivalProcess(rng: Random) {
  let id = 0;

  while (sim.now < 480) {  // 8 hours
    // Start new customer
    sim.process(() => customer(id++));

    // Wait for next arrival
    const interArrival = rng.exponential(5);
    yield* timeout(interArrival);
  }

  console.log('Arrivals stopped');
}

const rng = new Random(42);
sim.process(() => arrivalProcess(rng));
sim.run(480);
```

## Pattern: Scheduled Events

Schedule discrete events at specific times:

```typescript
// Morning rush: 8am-9am
for (let t = 0; t < 60; t += 2) {
  sim.schedule(t, () => {
    sim.process(() => customer(customerId++));
  });
}

// Lunch rush: 12pm-1pm (240-300 minutes)
for (let t = 240; t < 300; t += 3) {
  sim.schedule(t, () => {
    sim.process(() => customer(customerId++));
  });
}

sim.run(480);  // 8 hour day
```

## Pattern: Monitoring

Periodically check system state:

```typescript
function* monitor() {
  while (sim.now < 480) {
    console.log(
      `[${sim.now}] Server: ${server.inUse}/${server.capacity} in use, ` +
      `${server.queueLength} waiting`
    );

    yield* timeout(30);  // Check every 30 minutes
  }
}

sim.process(monitor);
sim.run(480);
```

## Pattern: Warm-Up Period

Exclude initial transient period from statistics:

```typescript
function* simulation() {
  // Warm-up period (not measured)
  yield* timeout(100);

  // Clear statistics after warm-up
  sim.statistics.clear();
  console.log('Statistics cleared - measurement period starting');

  // Continue simulation
  yield* timeout(400);

  console.log('Measurement period complete');
}

sim.process(simulation);
sim.run(500);

// Statistics only include time 100-500
console.log(sim.statistics.getAverage('Server:utilization'));
```

## Implementation Details

### Event Queue

- Uses binary heap priority queue for O(log n) operations
- Events ordered by time (earliest first)
- Same-time events maintain scheduling order (FIFO)

### Time Management

- Time advances discretely (no continuous time)
- Time only changes when processing events
- `sim.now` reflects time of current event being processed

### Process Execution

- Processes run until they `yield` or complete
- Yielding pauses process and schedules resumption
- Multiple processes can be active concurrently
- Execution is deterministic (given same random seed)

## Best Practices

### 1. Use One Simulation Instance

```typescript
// Good - single simulation
const sim = new Simulation();

function* process1() { /* ... */ }
function* process2() { /* ... */ }

sim.process(process1);
sim.process(process2);
```

### 2. Don't Modify sim.now

```typescript
// Bad - don't modify time directly
sim.now = 100;  // Error!

// Good - use schedule or timeout
sim.schedule(100, callback);
yield* timeout(100);
```

### 3. Check sim.now for Time-Based Logic

```typescript
function* businessHours() {
  while (sim.now < 480) {  // 8 hours
    const hour = Math.floor(sim.now / 60);

    if (hour >= 12 && hour < 13) {
      // Lunch hour logic
    }

    yield* timeout(1);
  }
}
```

### 4. Use schedule() for Discrete Events

```typescript
// Good - discrete scheduled events
sim.schedule(10, () => console.log('Shift change'));
sim.schedule(60, () => console.log('Break time'));

// Better for continuous - use process with timeout
function* continuousMonitoring() {
  while (true) {
    checkSystem();
    yield* timeout(5);
  }
}
```

## See Also

- [Process API](./process) - Managing running processes
- [Resource API](./resource) - Resource management
- [Statistics API](./statistics) - Data collection
- [Guide: Processes](/guide/processes) - Process patterns and examples
