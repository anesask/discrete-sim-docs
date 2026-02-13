# Resources

Resources represent limited-capacity entities in your simulation that processes compete for. `discrete-sim` provides three types of resources:

- **Resource** - Limited-capacity resources that processes request and release (servers, machines, workers)
- **Buffer** - Resources that store homogeneous quantities (fuel tanks, money, raw materials)
- **Store** - Resources that hold distinct objects (warehouses, parking lots, job queues)

## Resource Types Overview

| Type | Use For | Operations | Example |
|------|---------|------------|---------|
| **Resource** | Capacity-based resources | `request()`, `release()` | Servers, machines, workers |
| **Buffer** | Homogeneous quantities | `put(amount)`, `get(amount)` | Fuel tank, bank account, inventory |
| **Store** | Distinct objects | `put(item)`, `get(filter?)` | Warehouse, parking lot, job queue |

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

## Buffer Resources

Buffers store homogeneous quantities (tokens) like fuel, money, or raw materials. Unlike Resources, which track capacity usage, Buffers track a numerical level.

### Creating Buffers

```typescript
import { Simulation, Buffer } from 'discrete-sim';

const sim = new Simulation();

// Fuel tank: 1000 gallon capacity, starts at 500
const fuelTank = new Buffer(sim, 1000, {
  name: 'Fuel Tank',
  initialLevel: 500
});

// Bank account: $1M limit, starts at $10K
const account = new Buffer(sim, 1000000, {
  name: 'Account',
  initialLevel: 10000
});
```

### Using Buffers

```typescript
// Producer: add tokens to buffer
function* deliverFuel(amount: number) {
  console.log(`Delivering ${amount} gallons`);

  yield fuelTank.put(amount);  // Blocks if insufficient space

  console.log(`Delivered. Tank level: ${fuelTank.level}`);
}

// Consumer: remove tokens from buffer
function* refuelCar() {
  const needed = 15;
  console.log(`Customer needs ${needed} gallons`);

  yield fuelTank.get(needed);  // Blocks if insufficient fuel

  console.log(`Refueled. Tank level: ${fuelTank.level}`);
}
```

### Buffer Properties

- `buffer.capacity` - Maximum capacity
- `buffer.level` - Current quantity of tokens
- `buffer.available` - Space remaining (`capacity - level`)
- `buffer.putQueueLength` - Processes waiting to put
- `buffer.getQueueLength` - Processes waiting to get

### Buffer Example: Gas Station

```typescript
const sim = new Simulation();
const fuelTank = new Buffer(sim, 1000, {
  name: 'Fuel Tank',
  initialLevel: 500
});

// Tanker delivers fuel every 120 time units
function* tankerDelivery() {
  while (true) {
    yield* timeout(120);
    yield fuelTank.put(800);
    console.log(`Delivered. Level: ${fuelTank.level}`);
  }
}

// Customers refuel
function* customer(id: number, amount: number) {
  yield fuelTank.get(amount);
  yield* timeout(5);  // Refueling time
  console.log(`Customer ${id} refueled`);
}

sim.process(() => tankerDelivery());
sim.process(() => customer(1, 15));
sim.process(() => customer(2, 20));

sim.run(200);

console.log(`Average fuel level: ${fuelTank.stats.averageLevel.toFixed(2)}`);
```

## Store Resources

Stores hold distinct JavaScript objects with optional filter-based retrieval. Perfect for warehouses, parking lots, or job queues.

### Creating Stores

```typescript
import { Simulation, Store } from 'discrete-sim';

// Define item type
interface Pallet {
  id: string;
  destination: string;
  weight: number;
}

const sim = new Simulation();
const warehouse = new Store<Pallet>(sim, 100, {
  name: 'Warehouse'
});
```

### Using Stores

```typescript
// Store an item
function* receivePallet(pallet: Pallet) {
  console.log(`Receiving pallet ${pallet.id}`);

  yield warehouse.put(pallet);  // Blocks if store full

  console.log(`Stored pallet ${pallet.id}`);
}

// Retrieve by filter
function* shipToNYC() {
  const request = warehouse.get(p => p.destination === 'NYC');
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`Shipping ${pallet.id} to NYC`);
}

// FIFO retrieval (no filter)
function* shipNext() {
  const request = warehouse.get();  // No filter = FIFO
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`Shipping ${pallet.id}`);
}
```

### Store Properties

- `store.capacity` - Maximum number of items
- `store.size` - Current number of items
- `store.available` - Space remaining
- `store.items` - Read-only view of stored items
- `store.putQueueLength` - Processes waiting to put
- `store.getQueueLength` - Processes waiting to get

### Store Example: Warehouse

```typescript
interface Pallet {
  id: string;
  destination: string;
  weight: number;
}

const warehouse = new Store<Pallet>(sim, 100, { name: 'Warehouse' });

// Receive pallets
function* receiveTruck(pallets: Pallet[]) {
  for (const pallet of pallets) {
    yield warehouse.put(pallet);
    console.log(`Stored ${pallet.id} for ${pallet.destination}`);
    yield* timeout(2);
  }
}

// Ship to specific destination
function* shipTo(destination: string) {
  const request = warehouse.get(p => p.destination === destination);
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`Shipping ${pallet.id} to ${destination}`);
  yield* timeout(5);
}

const pallets: Pallet[] = [
  { id: 'P001', destination: 'NYC', weight: 500 },
  { id: 'P002', destination: 'LAX', weight: 600 },
  { id: 'P003', destination: 'NYC', weight: 450 },
];

sim.process(() => receiveTruck(pallets));
sim.schedule(10, () => sim.process(() => shipTo('NYC')));
sim.schedule(20, () => sim.process(() => shipTo('LAX')));

sim.run(100);

console.log(`Remaining pallets: ${warehouse.size}`);
```

## Choosing the Right Resource Type

Use **Resource** when:
- Modeling fixed-capacity resources (servers, machines, workers)
- Processes need to "use" then "release" the resource
- Focus is on utilization and queuing

Use **Buffer** when:
- Modeling quantities that can be produced/consumed (fuel, money, materials)
- Operations involve amounts, not individual units
- Focus is on inventory levels and flow rates

Use **Store** when:
- Managing distinct, identifiable objects (pallets, vehicles, jobs)
- Need to retrieve specific items by properties
- Focus is on tracking individual entities

## Best Practices

### For All Resource Types

1. **Always name resources** - Enables automatic statistics tracking
2. **Monitor queue lengths** - Detect bottlenecks early
3. **Use appropriate resource type** - Matches your modeling needs

### For Resources

1. **Always release resources** - Forgetting to release causes deadlocks
2. **Request in consistent order** - Prevents deadlocks with multiple resources

### For Buffers

1. **Set realistic capacity** - Based on actual system constraints
2. **Use initial levels** - Start at typical operating levels
3. **Validate amounts** - Don't exceed capacity

### For Stores

1. **Use TypeScript types** - Get type safety for stored items
2. **Check retrievedItem** - Always access after yielding get request
3. **Use filters wisely** - Simple filters are more efficient

## Next Steps

- Learn about [Statistics](./statistics) for deeper analysis
- Explore [Random Numbers](./random) for stochastic behavior
- See [Buffer API](/api/buffer) for complete Buffer reference
- See [Store API](/api/store) for complete Store reference
- See [Examples](/examples/) for complete resource-based simulations
