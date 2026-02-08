# Resources

Resources represent limited-capacity entities in your simulation that processes compete for. Examples include servers, machines, workers, parking spots, or network bandwidth.

## Creating Resources

```typescript
import { Simulation, Resource } from 'discrete-sim';

const sim = new Simulation();
const server = new Resource(sim, 2, { name: 'Server' });
```

**Parameters:**
- `sim` - The simulation instance
- `capacity` - Number of concurrent users (e.g., 2 servers)
- `options` - Optional configuration
  - `name` - Resource name for statistics and debugging

## Using Resources

### Basic Pattern

```typescript
function* customer(id: number, server: Resource) {
  // Request the resource
  yield server.request();

  // Use the resource
  yield* timeout(5);

  // Release the resource
  server.release();
}
```

### Request and Release

**`yield resource.request()`** - Wait for the resource to become available. Returns a token that can be used for tracking.

**`resource.release()`** - Release the resource, making it available for the next waiting process.

```typescript
function* process() {
  const token = yield server.request();
  console.log(`Acquired token ${token}`);

  yield* timeout(10);

  server.release();
  console.log(`Released token ${token}`);
}
```

## Resource Properties

### `resource.capacity`

The total capacity of the resource:

```typescript
console.log(`Server capacity: ${server.capacity}`);
```

### `resource.inUse`

Current number of tokens in use:

```typescript
console.log(`Currently serving: ${server.inUse}`);
```

### `resource.available`

Number of available tokens:

```typescript
console.log(`Available servers: ${server.available}`);
```

### `resource.queueLength`

Number of processes waiting for the resource:

```typescript
console.log(`Waiting in queue: ${server.queueLength}`);
```

## Resource Statistics

Resources automatically track statistics when given a name:

```typescript
const server = new Resource(sim, 2, { name: 'Server' });

// After simulation runs
const stats = sim.statistics;

// Utilization (0-1)
console.log(stats.getAverage('Server:utilization'));

// Average queue length
console.log(stats.getAverage('Server:queue-length'));

// Average wait time
console.log(stats.getAverage('Server:wait-time'));
```

### Built-in Metrics

For a resource named `"Server"`, the following metrics are automatically tracked:

- `Server:utilization` - Fraction of capacity in use (time-weighted)
- `Server:queue-length` - Number of processes waiting (time-weighted)
- `Server:wait-time` - Time processes spend waiting (per request)

## Examples

### Single Server Queue

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';

function* customer(id: number, server: Resource) {
  const arrivalTime = sim.now;
  console.log(`Customer ${id} arrives at ${arrivalTime}`);

  yield server.request();

  const waitTime = sim.now - arrivalTime;
  console.log(`Customer ${id} waited ${waitTime}, starts service at ${sim.now}`);

  yield* timeout(5);

  server.release();
  console.log(`Customer ${id} leaves at ${sim.now}`);
}

const sim = new Simulation();
const server = new Resource(sim, 1, { name: 'Server' });

// Customers arrive at times 0, 2, 4
for (let i = 0; i < 3; i++) {
  sim.schedule(i * 2, () => {
    sim.process(() => customer(i, server));
  });
}

sim.run();

// Check statistics
console.log(`Average utilization: ${sim.statistics.getAverage('Server:utilization')}`);
console.log(`Average queue length: ${sim.statistics.getAverage('Server:queue-length')}`);
console.log(`Average wait time: ${sim.statistics.getAverage('Server:wait-time')}`);
```

### Multi-Resource System

Processes can request multiple resources:

```typescript
function* job(id: number, machine: Resource, operator: Resource) {
  console.log(`Job ${id} waiting for machine and operator`);

  yield machine.request();
  yield operator.request();

  console.log(`Job ${id} processing at ${sim.now}`);
  yield* timeout(10);

  machine.release();
  operator.release();

  console.log(`Job ${id} complete at ${sim.now}`);
}

const sim = new Simulation();
const machine = new Resource(sim, 2, { name: 'Machine' });
const operator = new Resource(sim, 3, { name: 'Operator' });

for (let i = 0; i < 5; i++) {
  sim.process(() => job(i, machine, operator));
}

sim.run();
```

### Priority Queue (Manual Implementation)

Resources use FIFO queuing by default. For priority queuing, manage requests manually:

```typescript
interface PriorityRequest {
  priority: number;
  resolve: () => void;
}

class PriorityResource {
  private queue: PriorityRequest[] = [];
  private inUse = 0;

  constructor(private capacity: number) {}

  request(priority: number): Promise<void> {
    if (this.inUse < this.capacity) {
      this.inUse++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push({ priority, resolve });
      this.queue.sort((a, b) => a.priority - b.priority);
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
```

## Common Patterns

### Resource Pools

Model interchangeable resources:

```typescript
const workers = new Resource(sim, 5, { name: 'Workers' });

function* task(id: number) {
  yield workers.request();
  console.log(`Task ${id} assigned a worker at ${sim.now}`);
  yield* timeout(10);
  workers.release();
}
```

### Shared Resources

Multiple process types sharing a resource:

```typescript
function* normalJob(id: number) {
  yield machine.request();
  yield* timeout(10);
  machine.release();
}

function* urgentJob(id: number) {
  yield machine.request();
  yield* timeout(5);  // Shorter processing time
  machine.release();
}
```

### Resource Monitoring

Track resource state over time:

```typescript
function* monitor(resource: Resource) {
  while (true) {
    console.log(`Time ${sim.now}: ${resource.inUse}/${resource.capacity} in use, ${resource.queueLength} waiting`);
    yield* timeout(10);
  }
}

sim.process(() => monitor(server));
```

## Best Practices

1. **Always release resources** - Forgetting to release causes deadlocks
2. **Name your resources** - Enables automatic statistics tracking
3. **Check queue lengths** - Monitor `resource.queueLength` to detect bottlenecks
4. **Avoid holding multiple resources** - Can cause deadlocks if not careful
5. **Use time-weighted statistics** - Better representation than simple averages

## Next Steps

- Learn about [Statistics](./statistics) for deeper analysis
- Explore [Random Numbers](./random) for stochastic behavior
- See [Examples](/examples/) for complete resource-based simulations
