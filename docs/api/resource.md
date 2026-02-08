# Resource

The `Resource` class represents a limited-capacity resource that processes compete for. Resources automatically manage queuing, statistics tracking, and FIFO scheduling.

## Constructor

```typescript
new Resource(sim: Simulation, capacity: number, options?: ResourceOptions)
```

**Parameters:**
- `sim` - Simulation instance
- `capacity` - Total resource capacity (must be >= 1)
- `options` - Optional configuration object
  - `name` - Resource name for automatic statistics tracking

**Example:**

```typescript
import { Simulation, Resource } from 'discrete-sim';

const sim = new Simulation();

// Anonymous resource (no statistics)
const server = new Resource(sim, 2);

// Named resource (automatic statistics)
const teller = new Resource(sim, 3, { name: 'Teller' });
```

**Validation:**
- `capacity` must be >= 1
- Throws `ValidationError` for invalid capacity

## Properties

### `capacity`

```typescript
resource.capacity: number
```

Total resource capacity.

**Example:**

```typescript
const server = new Resource(sim, 3);
console.log(server.capacity);  // 3
```

**Read-only** - Cannot be changed after creation.

### `inUse`

```typescript
resource.inUse: number
```

Number of resource tokens currently in use.

**Example:**

```typescript
console.log(`${server.inUse}/${server.capacity} servers busy`);
```

**Range:** 0 to `capacity`

### `available`

```typescript
resource.available: number
```

Number of resource tokens available for immediate use.

**Example:**

```typescript
if (server.available > 0) {
  console.log('Server available immediately');
}
```

**Relation:** `available = capacity - inUse`

### `queueLength`

```typescript
resource.queueLength: number
```

Number of processes waiting for the resource.

**Example:**

```typescript
console.log(`${server.queueLength} customers waiting`);
```

## Methods

### `request()`

```typescript
yield resource.request(): ResourceToken
```

Request the resource. Waits if resource is not available.

**Returns:** Resource token (for tracking purposes)

**Example:**

```typescript
function* customer(server: Resource) {
  console.log('Requesting server');

  const token = yield server.request();
  console.log(`Got server (token ${token})`);

  yield* timeout(5);

  server.release();
}
```

**Behavior:**
- If available: Resource acquired immediately, process continues
- If unavailable: Process added to FIFO queue, paused until resource available
- Must use `yield` (not `yield*`) when requesting

**Queue Discipline:** FIFO (First-In-First-Out)

### `release()`

```typescript
resource.release(): void
```

Release the resource, making it available for the next waiting process.

**Example:**

```typescript
function* process() {
  yield server.request();
  // Use the resource
  yield* timeout(10);
  server.release();
}
```

**Behavior:**
- Decrements `inUse` count
- If queue not empty: Next process acquires resource immediately
- If queue empty: Increments `available` count

**Important:** Always release resources! Forgetting causes deadlocks.

## Automatic Statistics

Resources with `name` property automatically track statistics:

```typescript
const server = new Resource(sim, 2, { name: 'Server' });

// After simulation
const stats = sim.statistics;

// Utilization (0-1, time-weighted)
const util = stats.getAverage('Server:utilization');

// Queue length (time-weighted average)
const avgQueue = stats.getAverage('Server:queue-length');

// Wait time (average per request)
const avgWait = stats.getAverage('Server:wait-time');
```

### Tracked Metrics

For a resource named `"Server"`:

| Metric | Type | Description |
|--------|------|-------------|
| `Server:utilization` | Time-weighted | Fraction of capacity in use (0-1) |
| `Server:queue-length` | Time-weighted | Number of processes waiting |
| `Server:wait-time` | Value | Time each process spent waiting |

## Examples

### Example: Basic Usage

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';

const sim = new Simulation();
const server = new Resource(sim, 1, { name: 'Server' });

function* customer(id: number) {
  const arrival = sim.now;
  console.log(`[${arrival}] Customer ${id} arrived`);

  yield server.request();

  const wait = sim.now - arrival;
  console.log(`[${sim.now}] Customer ${id} waited ${wait}, starting service`);

  yield* timeout(5);

  server.release();
  console.log(`[${sim.now}] Customer ${id} departed`);
}

// Start 3 customers at once
for (let i = 0; i < 3; i++) {
  sim.process(() => customer(i));
}

sim.run();

// Statistics
console.log(`Utilization: ${(sim.statistics.getAverage('Server:utilization') * 100).toFixed(1)}%`);
console.log(`Avg wait: ${sim.statistics.getAverage('Server:wait-time').toFixed(2)}`);
```

### Example: Multiple Resources

```typescript
function* job(id: number, machine: Resource, operator: Resource) {
  console.log(`Job ${id} waiting for machine and operator`);

  // Acquire both resources
  yield machine.request();
  console.log(`Job ${id} got machine`);

  yield operator.request();
  console.log(`Job ${id} got operator - starting work`);

  // Do the work
  yield* timeout(10);

  // Release both
  operator.release();
  machine.release();

  console.log(`Job ${id} complete`);
}

const machine = new Resource(sim, 2, { name: 'Machine' });
const operator = new Resource(sim, 3, { name: 'Operator' });

for (let i = 0; i < 5; i++) {
  sim.process(() => job(i, machine, operator));
}

sim.run();
```

**Warning:** Requesting multiple resources can cause deadlock if not careful. Request in consistent order.

### Example: Resource Monitoring

```typescript
function* monitor(resource: Resource, name: string) {
  console.log(`\n=== ${name} Monitor ===`);

  while (sim.now < 100) {
    console.log(
      `[${sim.now.toFixed(1)}] ` +
      `In use: ${resource.inUse}/${resource.capacity}, ` +
      `Available: ${resource.available}, ` +
      `Queue: ${resource.queueLength}`
    );

    yield* timeout(10);
  }
}

const server = new Resource(sim, 2);
sim.process(() => monitor(server, 'Server'));

// Start customers
function* arrivalProcess(rng: Random) {
  let id = 0;
  while (sim.now < 100) {
    sim.process(() => customer(id++));
    yield* timeout(rng.exponential(3));
  }
}

sim.process(() => arrivalProcess(new Random()));
sim.run(100);
```

### Example: Conditional Resource Usage

```typescript
function* customer(id: number, server: Resource) {
  console.log(`Customer ${id} arrived, queue length: ${server.queueLength}`);

  // Balk if queue too long
  if (server.queueLength >= 5) {
    console.log(`Customer ${id} left (queue too long)`);
    stats.increment('balks');
    return;
  }

  const arrival = sim.now;

  yield server.request();

  const wait = sim.now - arrival;

  // Renege if waited too long
  if (wait > 10) {
    console.log(`Customer ${id} left (waited too long)`);
    server.release();  // Must still release!
    stats.increment('reneges');
    return;
  }

  yield* timeout(5);
  server.release();

  stats.increment('completed');
  console.log(`Customer ${id} completed`);
}
```

### Example: Priority Resources (Manual)

Resources use FIFO by default. For priority handling, implement manually:

```typescript
class PriorityResource {
  private queue: Array<{priority: number, resolve: () => void}> = [];
  private inUse = 0;

  constructor(private capacity: number) {}

  request(priority: number = 0): Promise<void> {
    if (this.inUse < this.capacity) {
      this.inUse++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push({ priority, resolve });
      this.queue.sort((a, b) => a.priority - b.priority);  // Lower = higher priority
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next.resolve();
    } else {
      this.inUse--;
    }
  }
}

// Usage
function* vipCustomer(id: number, server: PriorityResource) {
  yield server.request(0);  // High priority
  yield* timeout(5);
  server.release();
}

function* regularCustomer(id: number, server: PriorityResource) {
  yield server.request(1);  // Low priority
  yield* timeout(5);
  server.release();
}
```

## Common Patterns

### Pattern: Try-Release in Finally

Always release resources, even on errors:

```typescript
function* process(server: Resource) {
  yield server.request();

  try {
    yield* timeout(5);

    // Possible error here
    if (Math.random() < 0.1) {
      throw new Error('Process failed');
    }
  } finally {
    server.release();  // Always executes
  }
}
```

### Pattern: Resource Pools

Model interchangeable resources:

```typescript
// 5 identical workers
const workers = new Resource(sim, 5, { name: 'Workers' });

function* task(id: number) {
  console.log(`Task ${id} waiting for worker`);

  yield workers.request();
  console.log(`Task ${id} assigned to worker`);

  yield* timeout(10);

  workers.release();
  console.log(`Task ${id} complete`);
}
```

### Pattern: Check Availability

Check resource state before requesting:

```typescript
function* customer(id: number, server: Resource) {
  console.log(`Queue length: ${server.queueLength}`);

  if (server.queueLength > 10) {
    console.log(`Customer ${id} balked`);
    return;
  }

  yield server.request();
  yield* timeout(5);
  server.release();
}
```

### Pattern: Temporary Capacity Changes

Model resource failures/repairs:

```typescript
function* machineFailureProcess(rng: Random) {
  while (true) {
    // Work period
    yield* timeout(rng.exponential(100));

    // Breakdown
    console.log(`Machine failed at ${sim.now}`);
    // Note: discrete-sim doesn't support dynamic capacity
    // Model with separate on/off resource or process coordination

    yield* timeout(rng.uniform(10, 30));
    console.log(`Machine repaired at ${sim.now}`);
  }
}
```

## Best Practices

### 1. Always Release Resources

```typescript
// Good - guaranteed release
function* process(resource: Resource) {
  yield resource.request();
  try {
    yield* timeout(5);
  } finally {
    resource.release();
  }
}

// Bad - resource may not be released
function* process(resource: Resource) {
  yield resource.request();
  yield* timeout(5);
  // Forgot release!
}
```

### 2. Name Resources for Statistics

```typescript
// Good - automatic statistics
const server = new Resource(sim, 2, { name: 'Server' });

// Miss out on automatic tracking
const server = new Resource(sim, 2);
```

### 3. Request in Consistent Order

```typescript
// Good - always request in same order (prevents deadlock)
function* process1() {
  yield resourceA.request();
  yield resourceB.request();
  // work
  resourceB.release();
  resourceA.release();
}

function* process2() {
  yield resourceA.request();  // Same order
  yield resourceB.request();
  // work
  resourceB.release();
  resourceA.release();
}
```

### 4. Monitor Queue Lengths

```typescript
function* customer(server: Resource) {
  if (server.queueLength > 20) {
    stats.increment('balks');
    return;  // Don't join long queues
  }

  yield server.request();
  // ...
}
```

## See Also

- [Simulation API](./simulation) - Creating and running simulations
- [Statistics API](./statistics) - Understanding resource statistics
- [Guide: Resources](/guide/resources) - Detailed resource patterns
- [Guide: Processes](/guide/processes) - Process coordination
