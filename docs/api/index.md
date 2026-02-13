# API Reference

Complete API documentation for `discrete-sim` - a discrete event simulation library using generator functions.

## Core Exports

```typescript
import {
  // Core classes
  Simulation,
  Process,
  Statistics,
  Random,

  // Resource types
  Resource,
  Buffer,
  Store,

  // Helper functions
  timeout,
  waitFor,

  // Errors
  ValidationError,
  ConditionTimeoutError
} from 'discrete-sim';
```

## Quick Reference

### Core Classes

- **[Simulation](./simulation)** - Main simulation engine managing event scheduling and execution
- **[Process](./process)** - Process wrapper created by `sim.process()`
- **[Statistics](./statistics)** - Data collection and analysis
- **[Random](./random)** - Seedable random number generator

### Resource Classes

- **[Resource](./resource)** - Limited-capacity resource with FIFO queuing (servers, machines, workers)
- **[Buffer](./buffer)** - Storage for homogeneous quantities (fuel, money, raw materials)
- **[Store](./store)** - Storage for distinct objects with filter-based retrieval (pallets, vehicles, jobs)

### Helper Functions

- **`timeout(duration: number)`** - Generator that yields for specified time
- **`waitFor(condition: () => boolean)`** - Generator that waits for condition

### Errors

- **`ValidationError`** - Thrown for invalid parameters or configurations

## Architecture Overview

`discrete-sim` uses **generator functions** to model processes. This provides intuitive control flow while enabling the simulation to pause and resume processes.

### Process-Based Simulation

```typescript
function* customer(id: number, server: Resource) {
  console.log(`Customer ${id} arrives at ${sim.now}`);

  // Wait for resource
  yield server.request();

  // Use resource
  yield* timeout(5);

  // Release resource
  server.release();

  console.log(`Customer ${id} leaves at ${sim.now}`);
}

const sim = new Simulation();
const server = new Resource(sim, 1);

sim.process(() => customer(1, server));
sim.run();
```

### Key Concepts

**Generators** - Process functions use `function*` syntax and `yield` to pause execution

**`yield` vs `yield*`**:
- `yield expression` - Wait for single event (e.g., `yield resource.request()`)
- `yield* generator` - Delegate to another generator (e.g., `yield* timeout(5)`)

**Event Scheduling** - Events are scheduled on a priority queue and processed in chronological order

**Resources** - Limited-capacity entities that processes request, use, and release

**Statistics** - Automatic tracking for resources, manual tracking for custom metrics

## API Structure

### Simulation Class

The main simulation controller:

```typescript
const sim = new Simulation();

sim.now                    // Current simulation time
sim.statistics             // Statistics instance
sim.process(generator)     // Start a process
sim.schedule(time, fn)     // Schedule event
sim.run(until?)           // Run simulation
```

See [Simulation API](./simulation) for details.

### Process Class

Wrapper for running generator functions:

```typescript
const process = sim.process(() => customer(1, server));

process.isAlive()         // Check if still running
process.cancel()          // Terminate process
```

See [Process API](./process) for details.

### Resource Classes

**Resource** - Capacity-based resource:

```typescript
const server = new Resource(sim, capacity, options?);

yield server.request()    // Acquire resource (waits if needed)
server.release()          // Release resource
server.capacity           // Total capacity
server.inUse              // Currently in use
server.available          // Available tokens
server.queueLength        // Waiting processes
```

See [Resource API](./resource) for details.

**Buffer** - Homogeneous quantity storage:

```typescript
const fuelTank = new Buffer(sim, capacity, options?);

yield fuelTank.put(amount)    // Add tokens (waits if full)
yield fuelTank.get(amount)    // Remove tokens (waits if empty)
fuelTank.level                // Current quantity
fuelTank.available            // Space remaining
fuelTank.putQueueLength       // Waiting to put
fuelTank.getQueueLength       // Waiting to get
```

See [Buffer API](./buffer) for details.

**Store** - Distinct object storage:

```typescript
const warehouse = new Store<T>(sim, capacity, options?);

yield warehouse.put(item)            // Store item (waits if full)
const req = warehouse.get(filter?)   // Get item (waits if no match)
yield req;
const item = req.retrievedItem!;     // Retrieved item

warehouse.size                // Current number of items
warehouse.items               // Read-only array of items
warehouse.putQueueLength      // Waiting to put
warehouse.getQueueLength      // Waiting to get
```

See [Store API](./store) for details.

### Statistics Class

Data collection and analysis:

```typescript
const stats = new Statistics(sim);
// Or use: sim.statistics

stats.increment('counter', amount?)
stats.recordValue('metric', value)
stats.recordTimeWeighted('state', value)

stats.getCounter('counter')
stats.getAverage('metric')
stats.getTimeWeightedAverage('state')
```

See [Statistics API](./statistics) for details.

### Random Class

Seedable random number generator:

```typescript
const rng = new Random(seed?);

rng.random()                              // [0, 1)
rng.uniform(min, max)                     // [min, max)
rng.randInt(min, max)                     // [min, max) integers
rng.exponential(mean)                     // Exponential
rng.normal(mean, stdDev)                  // Normal/Gaussian
rng.triangular(min, mode?, max)           // Triangular
rng.poisson(lambda)                       // Poisson (discrete)
rng.choice(array)                         // Random element
rng.sample(array, k)                      // k random elements
```

See [Random API](./random) for details.

## Helper Functions

### timeout()

Wait for specified simulation time:

```typescript
function* timeout(duration: number): Generator<any, void, any>
```

**Usage:**

```typescript
function* process() {
  console.log('Starting');
  yield* timeout(10);
  console.log('10 time units later');
}
```

**Important:** Use `yield*` (with asterisk) to delegate to the generator.

### waitFor()

Wait until condition becomes true:

```typescript
function* waitFor(condition: () => boolean): Generator<any, void, any>
```

**Usage:**

```typescript
function* process() {
  yield waitFor(() => sim.now >= 100);
  console.log('Time reached 100');
}
```

## Error Types

### ValidationError

Thrown when invalid parameters are provided:

```typescript
import { ValidationError } from 'discrete-sim';

try {
  const resource = new Resource(sim, -1);  // Invalid capacity
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

**Common validation errors:**
- Negative or zero capacity for resources
- Negative time values
- Invalid random distribution parameters
- Null or undefined items in Store

### ConditionTimeoutError

Thrown when `waitFor` exceeds maximum iterations:

```typescript
import { waitFor, ConditionTimeoutError } from 'discrete-sim';

function* process() {
  try {
    yield* waitFor(
      sim,
      () => resource.available > 0,
      { maxIterations: 100 }
    );
  } catch (error) {
    if (error instanceof ConditionTimeoutError) {
      console.log('Timeout waiting for resource');
    }
  }
}
```

## TypeScript Support

`discrete-sim` is written in TypeScript with full type definitions included.

### Type Definitions

```typescript
// Simulation options
interface SimulationOptions {
  // No options currently supported
}

// Resource options
interface ResourceOptions {
  name?: string;  // Name for automatic statistics tracking
}

// Process generator type
type ProcessGenerator = () => Generator<any, void, any>;
```

### Generic Types

```typescript
// Random.choice is generic
const colors: string[] = ['red', 'green', 'blue'];
const color: string = rng.choice(colors);

// Random.sample is generic
const hand: string[] = rng.sample(deck, 5);
```

## Examples

### Complete Simulation

```typescript
import { Simulation, Resource, Random, timeout } from 'discrete-sim';

function* customer(id: number, server: Resource, rng: Random) {
  const arrival = sim.now;
  console.log(`[${sim.now}] Customer ${id} arrived`);

  yield server.request();

  const wait = sim.now - arrival;
  console.log(`[${sim.now}] Customer ${id} waited ${wait}`);

  yield* timeout(rng.exponential(5));

  server.release();
  console.log(`[${sim.now}] Customer ${id} departed`);
}

function* arrivalProcess(rng: Random) {
  for (let i = 0; i < 10; i++) {
    sim.process(() => customer(i, server, rng));
    yield* timeout(rng.exponential(2));
  }
}

const sim = new Simulation();
const server = new Resource(sim, 2, { name: 'Server' });
const rng = new Random(42);

sim.process(() => arrivalProcess(rng));
sim.run();

// Statistics
console.log(`Utilization: ${sim.statistics.getAverage('Server:utilization')}`);
console.log(`Wait time: ${sim.statistics.getAverage('Server:wait-time')}`);
```

## Next Steps

### Core API
- **[Simulation](./simulation)** - Detailed simulation API
- **[Process](./process)** - Process management
- **[Statistics](./statistics)** - Data collection and advanced statistics
- **[Random](./random)** - Random number generation

### Resources
- **[Resource](./resource)** - Capacity-based resources
- **[Buffer](./buffer)** - Homogeneous quantity storage
- **[Store](./store)** - Distinct object storage

### Guides & Examples
- **[Guide](/guide/)** - Usage tutorials and patterns
- **[Advanced Features](/guide/advanced)** - Event tracing, warm-up periods
- **[Examples](/examples/)** - Complete simulation examples
