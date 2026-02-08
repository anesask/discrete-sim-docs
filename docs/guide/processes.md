# Processes

Processes are the heart of `discrete-sim`. They represent entities that move through your simulation over time, requesting resources, waiting, and performing actions.

## What are Processes?

A process is implemented as a **generator function** that yields control back to the simulation at specific points. This allows the simulation to pause a process, schedule it to resume later, and interleave execution with other processes.

```typescript
function* customer(id: number, server: Resource) {
  console.log(`Customer ${id} arrives at ${sim.now}`);

  // Request the server resource
  yield server.request();
  console.log(`Customer ${id} starts service at ${sim.now}`);

  // Service time
  yield* timeout(5);

  // Release the server
  server.release();
  console.log(`Customer ${id} leaves at ${sim.now}`);
}
```

## Creating Processes

Use the `sim.process()` method to start a process:

```typescript
import { Simulation } from 'discrete-sim';

const sim = new Simulation();

// Start a single process
sim.process(() => customer(1, server));

// Start multiple processes
for (let i = 0; i < 10; i++) {
  sim.process(() => customer(i, server));
}
```

## Yielding in Processes

Processes use `yield` to pause execution and wait for events:

### `yield timeout(duration)`

Wait for a specific amount of simulation time:

```typescript
function* process() {
  console.log(`Starting at ${sim.now}`);
  yield* timeout(10);
  console.log(`Finished at ${sim.now}`);  // 10 time units later
}
```

### `yield resource.request()`

Wait for a resource to become available:

```typescript
function* process() {
  const token = yield resource.request();
  // Resource acquired, do work
  yield* timeout(5);
  resource.release();
}
```

### `yield waitFor(condition)`

Wait for a custom condition to become true:

```typescript
function* process() {
  yield waitFor(() => sim.now >= 100);
  console.log('Time has reached 100');
}
```

## Generator Delegation with `yield*`

When calling helper generator functions, use `yield*` to delegate:

```typescript
function* serviceTime(duration: number) {
  console.log('Service started');
  yield* timeout(duration);
  console.log('Service completed');
}

function* customer() {
  yield* serviceTime(10);  // Note the yield*
}
```

## Process Lifecycle

1. **Creation** - Process generator is created with `sim.process()`
2. **Scheduling** - Process is scheduled to start at current simulation time
3. **Execution** - Process runs until it hits a `yield` statement
4. **Waiting** - Process is paused while waiting for event/resource/timeout
5. **Resumption** - Process continues when the wait condition is satisfied
6. **Completion** - Process finishes when generator returns

## Example: Multi-Step Process

```typescript
function* manufacturingProcess(item: number) {
  console.log(`Item ${item}: Starting at ${sim.now}`);

  // Stage 1: Assembly
  yield assembly.request();
  console.log(`Item ${item}: Assembling at ${sim.now}`);
  yield* timeout(15);
  assembly.release();

  // Stage 2: Quality Check
  yield qualityCheck.request();
  console.log(`Item ${item}: Quality check at ${sim.now}`);
  yield* timeout(5);
  qualityCheck.release();

  // Stage 3: Packaging
  yield packaging.request();
  console.log(`Item ${item}: Packaging at ${sim.now}`);
  yield* timeout(10);
  packaging.release();

  console.log(`Item ${item}: Complete at ${sim.now}`);
}

const sim = new Simulation();
const assembly = new Resource(sim, 2);
const qualityCheck = new Resource(sim, 1);
const packaging = new Resource(sim, 1);

// Start 5 items
for (let i = 0; i < 5; i++) {
  sim.process(() => manufacturingProcess(i));
}

sim.run();
```

## Common Patterns

### Arrival Process

Generate entities arriving at intervals:

```typescript
function* arrivalProcess() {
  let id = 0;
  while (true) {
    sim.process(() => customer(id++, server));
    yield* timeout(exponential(5));  // Inter-arrival time
  }
}

sim.process(arrivalProcess);
```

### Batch Processing

Handle groups of entities together:

```typescript
function* batchProcess(batchSize: number) {
  const batch: number[] = [];

  for (let i = 0; i < batchSize; i++) {
    batch.push(i);
  }

  yield machine.request();
  console.log(`Processing batch of ${batchSize}`);
  yield* timeout(batchSize * 2);
  machine.release();
}
```

### Parallel Processing

Start multiple processes and continue:

```typescript
function* coordinator() {
  // Start worker processes
  for (let i = 0; i < 3; i++) {
    sim.process(() => worker(i));
  }

  // Coordinator continues its own work
  yield* timeout(50);
  console.log('Coordinator finished');
}
```

## Next Steps

- Learn about [Resources](./resources) for managing shared capacity
- Explore [Statistics](./statistics) for tracking process metrics
- See [Examples](/examples/) for complete simulations
