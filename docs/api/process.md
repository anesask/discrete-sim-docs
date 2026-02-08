# Process

The `Process` class represents a running generator function in the simulation. Processes are created by `sim.process()` and manage the execution lifecycle of generator-based entities.

## Creating Processes

Processes are created using `sim.process()`:

```typescript
import { Simulation, timeout } from 'discrete-sim';

const sim = new Simulation();

function* customer(id: number) {
  console.log(`Customer ${id} starting`);
  yield* timeout(10);
  console.log(`Customer ${id} finished`);
}

const process = sim.process(() => customer(1));
```

## Methods

### `isAlive()`

```typescript
process.isAlive(): boolean
```

Check if the process is still running.

**Returns:** `true` if process is active, `false` if completed or cancelled

**Example:**

```typescript
function* longProcess() {
  for (let i = 0; i < 10; i++) {
    console.log(`Step ${i}`);
    yield* timeout(5);
  }
}

const process = sim.process(longProcess);

console.log(process.isAlive());  // true

sim.run(30);
console.log(process.isAlive());  // true (only 6 steps complete)

sim.run();
console.log(process.isAlive());  // false (all steps complete)
```

### `cancel()`

```typescript
process.cancel(): void
```

Terminate the process immediately.

**Example:**

```typescript
function* infiniteProcess() {
  while (true) {
    console.log(`Running at ${sim.now}`);
    yield* timeout(10);
  }
}

const process = sim.process(infiniteProcess);

// Cancel after some time
sim.schedule(50, () => {
  console.log('Cancelling process');
  process.cancel();
});

sim.run();
// Process only runs until time 50
```

**Use Cases:**
- Emergency shutdowns
- Customer abandonment
- Machine failures
- Timeout implementations

## Process Lifecycle

1. **Created** - `sim.process()` creates Process and schedules first execution
2. **Running** - Process executes until it yields
3. **Waiting** - Process paused, waiting for event/timeout/condition
4. **Resumed** - Wait complete, process continues execution
5. **Completed** - Generator returns (naturally finishes)
6. **Cancelled** - Terminated via `cancel()` call

```typescript
function* processLifecycle() {
  console.log('1. Created and started');

  console.log('2. Running');
  yield* timeout(5);

  console.log('4. Resumed after wait');
  yield* timeout(5);

  console.log('5. Completed');
}

const proc = sim.process(processLifecycle);
sim.run();
```

## Examples

### Example: Process Cancellation

```typescript
function* customerWithTimeout(id: number, server: Resource) {
  const process = sim.currentProcess();  // Get own process reference
  const maxWait = 20;

  const arrivalTime = sim.now;
  console.log(`[${sim.now}] Customer ${id} arrived`);

  // Schedule cancellation if wait too long
  sim.schedule(sim.now + maxWait, () => {
    if (process.isAlive() && server.queueLength > 0) {
      console.log(`[${sim.now}] Customer ${id} gave up (waited too long)`);
      process.cancel();
    }
  });

  yield server.request();
  console.log(`[${sim.now}] Customer ${id} got server (waited ${sim.now - arrivalTime})`);

  yield* timeout(5);

  server.release();
  console.log(`[${sim.now}] Customer ${id} finished`);
}
```

### Example: Process Monitoring

```typescript
function* monitor() {
  const processes: Process[] = [];

  // Start multiple processes
  for (let i = 0; i < 5; i++) {
    const proc = sim.process(() => worker(i));
    processes.push(proc);
  }

  // Check status periodically
  while (processes.some(p => p.isAlive())) {
    const active = processes.filter(p => p.isAlive()).length;
    console.log(`[${sim.now}] Active processes: ${active}`);
    yield* timeout(10);
  }

  console.log('All processes complete');
}

function* worker(id: number) {
  console.log(`Worker ${id} starting`);
  yield* timeout(Math.random() * 50);
  console.log(`Worker ${id} finished`);
}

sim.process(monitor);
sim.run();
```

### Example: Coordinated Shutdown

```typescript
function* coordinator() {
  const workers: Process[] = [];

  // Start workers
  for (let i = 0; i < 3; i++) {
    workers.push(sim.process(() => continuousWorker(i)));
  }

  // Run for work period
  yield* timeout(480);

  // Shutdown all workers
  console.log('Shutting down all workers');
  workers.forEach(w => w.cancel());

  console.log('Shutdown complete');
}

function* continuousWorker(id: number) {
  while (true) {
    console.log(`Worker ${id} processing at ${sim.now}`);
    yield* timeout(10);
  }
}

sim.process(coordinator);
sim.run();
```

### Example: Conditional Process Control

```typescript
function* adaptiveProcess() {
  const proc = sim.process(() => backgroundTask());

  while (sim.now < 100) {
    // Check system load
    if (server.queueLength > 10) {
      // High load - cancel background task
      if (proc.isAlive()) {
        console.log('High load - cancelling background task');
        proc.cancel();
      }
    } else if (!proc.isAlive()) {
      // Low load - restart background task
      console.log('Low load - restarting background task');
      proc = sim.process(() => backgroundTask());
    }

    yield* timeout(5);
  }
}

function* backgroundTask() {
  console.log('Background task started');
  while (true) {
    console.log('Background processing...');
    yield* timeout(10);
  }
}
```

## Process vs Generator

### Generator Function (Definition)

```typescript
// This is a generator function - the definition
function* customer(id: number) {
  yield* timeout(10);
}
```

### Process (Instance)

```typescript
// This creates a Process instance - the running execution
const process = sim.process(() => customer(1));
```

**Key Differences:**
- Generator function is the **template/definition**
- Process is the **running instance**
- One generator function can create many processes
- Each process has independent state and execution

```typescript
function* customer(id: number) {
  console.log(`Customer ${id} at ${sim.now}`);
  yield* timeout(5);
}

// Create 3 separate processes from same generator
const proc1 = sim.process(() => customer(1));
const proc2 = sim.process(() => customer(2));
const proc3 = sim.process(() => customer(3));

// All run independently
```

## Common Patterns

### Pattern: Self-Cancelling Process

```typescript
function* selfCancellingProcess(maxTime: number) {
  const startTime = sim.now;

  while (sim.now - startTime < maxTime) {
    console.log(`Working at ${sim.now}`);
    yield* timeout(5);
  }

  console.log('Time limit reached, stopping');
  // Process naturally completes (no explicit cancel needed)
}

sim.process(() => selfCancellingProcess(50));
sim.run();
```

### Pattern: Process Pool

```typescript
class ProcessPool {
  private processes: Process[] = [];

  start(count: number, generator: () => Generator) {
    for (let i = 0; i < count; i++) {
      this.processes.push(sim.process(generator));
    }
  }

  cancelAll() {
    this.processes.forEach(p => p.cancel());
    this.processes = [];
  }

  activeCount(): number {
    return this.processes.filter(p => p.isAlive()).length;
  }
}

// Usage
const pool = new ProcessPool();
pool.start(5, () => worker());

sim.schedule(100, () => {
  console.log(`Active: ${pool.activeCount()}`);
  pool.cancelAll();
});
```

### Pattern: Timeout Wrapper

```typescript
function* withTimeout<T>(
  generator: Generator<any, T, any>,
  maxTime: number
): Generator<any, T | null, any> {
  const startTime = sim.now;
  const proc = sim.process(() => generator);

  // Wait for completion or timeout
  while (proc.isAlive() && sim.now - startTime < maxTime) {
    yield* timeout(1);
  }

  if (proc.isAlive()) {
    console.log('Process timed out');
    proc.cancel();
    return null;
  }

  return; // Process completed normally
}

// Usage
function* longOperation() {
  yield* timeout(100);
  return 42;
}

const result = yield* withTimeout(longOperation(), 50);
if (result === null) {
  console.log('Operation timed out');
}
```

## Implementation Notes

### Process States

Internally, a process can be in one of these states:

- **SCHEDULED** - Waiting to start or resume
- **RUNNING** - Currently executing
- **SUSPENDED** - Waiting for event/timeout/condition
- **COMPLETED** - Finished execution
- **CANCELLED** - Terminated early

### Process Identity

Each process has a unique identity:

```typescript
const proc1 = sim.process(() => customer(1));
const proc2 = sim.process(() => customer(1));

console.log(proc1 === proc2);  // false - different process instances
```

### Memory Management

Completed or cancelled processes are automatically cleaned up. No manual cleanup needed:

```typescript
for (let i = 0; i < 1000; i++) {
  sim.process(() => customer(i));
}

sim.run();
// All 1000 processes cleaned up automatically
```

## Best Practices

### 1. Don't Store Generator References

```typescript
// Bad
const gen = customer(1);  // Generator object
sim.process(() => gen);  // Wrong!

// Good
sim.process(() => customer(1));  // Creates new generator
```

### 2. Use isAlive() Before Cancel

```typescript
// Good - check first
if (process.isAlive()) {
  process.cancel();
}

// Also fine - cancel() is safe on dead processes
process.cancel();  // No-op if already dead
```

### 3. Store Process References When Needed

```typescript
// Good - store if you need to cancel later
const processesToCancel: Process[] = [];

for (let i = 0; i < 10; i++) {
  processesToCancel.push(sim.process(() => worker(i)));
}

// Can cancel all later
sim.schedule(100, () => {
  processesToCancel.forEach(p => p.cancel());
});
```

## See Also

- [Simulation API](./simulation) - Creating and managing processes
- [Guide: Processes](/guide/processes) - Process patterns and best practices
- [Guide: Resources](/guide/resources) - Processes waiting for resources
