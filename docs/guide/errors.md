# Error Handling

Proper error handling ensures your simulations fail gracefully and provide useful debugging information when issues arise.

## Common Errors

### ValidationError

`discrete-sim` throws `ValidationError` for invalid inputs:

```typescript
import { Simulation, Resource, ValidationError } from 'discrete-sim';

try {
  // Invalid capacity (must be >= 1)
  const resource = new Resource(sim, 0);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

### Common Validation Errors

**Invalid resource capacity:**
```typescript
// Error: capacity must be >= 1
const resource = new Resource(sim, 0);
const resource = new Resource(sim, -5);
```

**Negative time:**
```typescript
// Error: time cannot be negative
sim.schedule(-10, callback);
yield* timeout(-5);
```

**Invalid random parameters:**
```typescript
// Error: mean must be positive
rng.exponential(-1);

// Error: invalid range
rng.uniform(10, 5);  // min > max
```

## Error Handling Patterns

### Try-Catch in Process

```typescript
function* process() {
  try {
    yield server.request();
    yield* timeout(5);
    server.release();
  } catch (error) {
    console.error('Process failed:', error);
    stats.increment('process-errors');
  }
}
```

### Validation Before Simulation

```typescript
function validateConfig(config: SimConfig): void {
  if (config.numServers < 1) {
    throw new ValidationError('numServers must be at least 1');
  }

  if (config.arrivalRate <= 0) {
    throw new ValidationError('arrivalRate must be positive');
  }

  if (config.serviceTime <= 0) {
    throw new ValidationError('serviceTime must be positive');
  }
}

try {
  validateConfig(config);
  runSimulation(config);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

### Safe Resource Access

```typescript
function* safeProcess(server: Resource | null) {
  if (!server) {
    console.error('Server resource not available');
    return;
  }

  try {
    yield server.request();
    yield* timeout(5);
    server.release();
  } catch (error) {
    console.error('Failed to use resource:', error);
  }
}
```

## Debugging Techniques

### Process Logging

Add logging to track process execution:

```typescript
function* customer(id: number, server: Resource) {
  console.log(`[${sim.now}] Customer ${id}: Arrived`);

  yield server.request();
  console.log(`[${sim.now}] Customer ${id}: Got server`);

  yield* timeout(5);
  console.log(`[${sim.now}] Customer ${id}: Service complete`);

  server.release();
  console.log(`[${sim.now}] Customer ${id}: Released server`);
}
```

### Resource Monitoring

Track resource state over time:

```typescript
function* resourceMonitor(name: string, resource: Resource) {
  while (true) {
    console.log(
      `[${sim.now}] ${name}: ` +
      `${resource.inUse}/${resource.capacity} in use, ` +
      `${resource.queueLength} waiting`
    );

    yield* timeout(10);
  }
}

sim.process(() => resourceMonitor('Server', server));
```

### Statistics Tracking

Use statistics to identify issues:

```typescript
function* customer(id: number, server: Resource, stats: Statistics) {
  const arrivalTime = sim.now;

  yield server.request();

  const waitTime = sim.now - arrivalTime;
  stats.recordValue('wait-time', waitTime);

  // Flag long waits
  if (waitTime > 50) {
    console.warn(`Customer ${id} waited ${waitTime.toFixed(1)} time units!`);
    stats.increment('long-waits');
  }

  yield* timeout(5);
  server.release();
}
```

## Common Issues

### Forgetting to Release Resources

**Problem:**
```typescript
function* process() {
  yield server.request();
  yield* timeout(5);
  // Forgot to release!
}
```

**Symptom:** Resources never become available, queue grows indefinitely

**Solution:**
```typescript
function* process() {
  yield server.request();

  try {
    yield* timeout(5);
  } finally {
    server.release();  // Always release
  }
}
```

### Incorrect yield vs yield*

**Problem:**
```typescript
function* process() {
  yield timeout(5);  // Wrong! Missing *
}
```

**Symptom:** Process doesn't wait, continues immediately

**Solution:**
```typescript
function* process() {
  yield* timeout(5);  // Correct - delegates to generator
}
```

### Modifying Shared State

**Problem:**
```typescript
let counter = 0;

function* process() {
  counter++;  // Race condition!
  yield* timeout(5);
  counter--;
}
```

**Symptom:** Unpredictable behavior, incorrect counts

**Solution:** Use Statistics for tracking:
```typescript
function* process() {
  stats.increment('active-processes');
  yield* timeout(5);
  stats.increment('active-processes', -1);
}
```

### Non-Deterministic Behavior

**Problem:**
```typescript
function* process() {
  const delay = Math.random() * 10;  // Not reproducible
  yield* timeout(delay);
}
```

**Solution:** Use seeded Random:
```typescript
const rng = new Random(42);

function* process() {
  const delay = rng.uniform(0, 10);  // Reproducible
  yield* timeout(delay);
}
```

## Testing Your Simulation

### Unit Test Example

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';
import { describe, it, expect } from 'vitest';

describe('Customer Service Simulation', () => {
  it('should process customers in order', () => {
    const sim = new Simulation();
    const server = new Resource(sim, 1, { name: 'Server' });
    const processed: number[] = [];

    function* customer(id: number) {
      yield server.request();
      processed.push(id);
      yield* timeout(5);
      server.release();
    }

    // Start 3 customers at time 0
    for (let i = 0; i < 3; i++) {
      sim.process(() => customer(i));
    }

    sim.run();

    // FIFO order
    expect(processed).toEqual([0, 1, 2]);
  });

  it('should track wait times correctly', () => {
    const sim = new Simulation();
    const server = new Resource(sim, 1, { name: 'Server' });

    function* customer(id: number) {
      const arrival = sim.now;
      yield server.request();
      const wait = sim.now - arrival;
      sim.statistics.recordValue('wait-time', wait);
      yield* timeout(10);
      server.release();
    }

    // Staggered arrivals
    sim.schedule(0, () => sim.process(() => customer(0)));
    sim.schedule(5, () => sim.process(() => customer(1)));

    sim.run();

    expect(sim.statistics.getAverage('wait-time')).toBe(5);
  });

  it('should handle resource capacity correctly', () => {
    const sim = new Simulation();
    const server = new Resource(sim, 2);  // Capacity 2

    expect(server.capacity).toBe(2);
    expect(server.available).toBe(2);
    expect(server.inUse).toBe(0);

    function* process() {
      yield server.request();
      expect(server.inUse).toBeGreaterThan(0);
      server.release();
    }

    sim.process(process);
    sim.run();

    expect(server.inUse).toBe(0);
    expect(server.available).toBe(2);
  });
});
```

### Integration Test

```typescript
describe('Full Simulation', () => {
  it('should produce expected results with fixed seed', () => {
    const results = runSimulation({
      seed: 42,
      numCustomers: 100,
      numServers: 2,
      arrivalRate: 5,
      serviceRate: 3
    });

    // With fixed seed, results are deterministic
    expect(results.avgWaitTime).toBeCloseTo(12.5, 1);
    expect(results.maxQueueLength).toBe(8);
    expect(results.utilization).toBeCloseTo(0.83, 2);
  });
});
```

## Best Practices

### 1. Validate Inputs Early

```typescript
function runSimulation(config: SimConfig) {
  // Validate before starting
  if (config.numServers < 1) {
    throw new ValidationError('Invalid number of servers');
  }

  const sim = new Simulation();
  // ... rest of simulation
}
```

### 2. Use Try-Finally for Cleanup

```typescript
function* process() {
  yield resource.request();

  try {
    yield* timeout(5);
  } finally {
    resource.release();  // Always executes
  }
}
```

### 3. Add Assertions

```typescript
function* process() {
  yield server.request();

  // Verify state
  console.assert(server.inUse > 0, 'Server should be in use');
  console.assert(server.inUse <= server.capacity, 'Server over capacity!');

  yield* timeout(5);
  server.release();
}
```

### 4. Use Descriptive Error Messages

```typescript
if (waitTime > threshold) {
  throw new Error(
    `Wait time exceeded threshold: ${waitTime} > ${threshold} ` +
    `at simulation time ${sim.now}`
  );
}
```

### 5. Log Key Events

```typescript
function* customer(id: number) {
  const arrival = sim.now;
  console.log(`T=${sim.now}: Customer ${id} arrived`);

  yield server.request();
  console.log(`T=${sim.now}: Customer ${id} started service (waited ${sim.now - arrival})`);

  yield* timeout(5);
  server.release();
  console.log(`T=${sim.now}: Customer ${id} completed`);
}
```

## ValidationError API

```typescript
import { ValidationError } from 'discrete-sim';

try {
  // Some operation
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

## Next Steps

- Review [Examples](/examples/) for complete, robust simulations
- See [API Reference](/api/) for detailed method documentation
- Learn about [Testing](https://vitest.dev/) with Vitest or Jest
