# Random Numbers

The `Random` class provides a seedable random number generator with common probability distributions. Seeding enables reproducible simulations for testing and validation.

## Creating a Random Generator

```typescript
import { Random } from 'discrete-sim';

// Random seed (non-reproducible)
const rng = new Random();

// Fixed seed (reproducible)
const rng = new Random(12345);
```

## Why Use Seeded Random Numbers?

Seeding your random number generator provides several benefits:

- **Reproducibility** - Run the same simulation multiple times with identical results
- **Debugging** - Isolate and reproduce specific scenarios
- **Testing** - Validate simulation behavior with known inputs
- **Comparison** - Compare different configurations with same random sequence

```typescript
// Same seed = same results
const rng1 = new Random(42);
const rng2 = new Random(42);

console.log(rng1.random());  // 0.7235
console.log(rng2.random());  // 0.7235 (same!)
```

## Uniform Distribution

### `random()`

Generate random numbers between 0 and 1:

```typescript
const value = rng.random();  // 0 ≤ value < 1
```

### `uniform(min, max)`

Generate random numbers in a range:

```typescript
const price = rng.uniform(10, 50);      // 10 ≤ price < 50
const angle = rng.uniform(0, 2 * Math.PI);
```

### `randInt(min, max)`

Generate random integers:

```typescript
const dice = rng.randInt(1, 7);         // 1, 2, 3, 4, 5, or 6
const choice = rng.randInt(0, 10);      // 0 to 9
```

## Exponential Distribution

Common for modeling inter-arrival times and service times:

```typescript
// Mean of 5.0
const interArrivalTime = rng.exponential(5.0);
```

**Use cases:**
- Time between customer arrivals
- Time between equipment failures
- Service time duration
- Lifespan of components

```typescript
function* arrivalProcess(rng: Random) {
  let id = 0;
  while (true) {
    sim.process(() => customer(id++));

    // Next arrival time (exponential)
    const nextArrival = rng.exponential(5);
    yield* timeout(nextArrival);
  }
}
```

## Normal (Gaussian) Distribution

```typescript
// Mean = 100, std dev = 15
const iqScore = rng.normal(100, 15);
```

**Use cases:**
- Human performance variability
- Measurement errors
- Natural phenomena
- Quality control (dimensions, weights)

```typescript
function* manufacturing() {
  // Target: 10cm with 0.1cm variation
  const length = rng.normal(10, 0.1);

  if (length < 9.8 || length > 10.2) {
    stats.increment('defects');
  }
}
```

## Triangular Distribution

Defined by minimum, mode, and maximum:

```typescript
// min=5, mode=10, max=20
const duration = rng.triangular(5, 10, 20);
```

**Use cases:**
- Expert estimates (best, most likely, worst case)
- Project planning (PERT)
- When you don't have enough data for other distributions

```typescript
function* task() {
  // Optimistic: 5, Most likely: 8, Pessimistic: 15
  const duration = rng.triangular(5, 8, 15);
  yield* timeout(duration);
}
```

## Poisson Distribution

Generate random integers following a Poisson distribution. Useful for modeling discrete events in a fixed interval:

```typescript
// Average of 3 events per interval
const count = rng.poisson(3);  // Returns integer: 0, 1, 2, 3, ...
```

**Use cases:**
- Number of arrivals in a time period
- Number of defects in a batch
- Number of calls in an hour
- Number of emails received per day

```typescript
// Batch processing: random number of items per batch
function* processBatches() {
  while (true) {
    const batchSize = rng.poisson(10);  // Average 10 items
    console.log(`Processing batch of ${batchSize} items`);

    for (let i = 0; i < batchSize; i++) {
      yield* timeout(1);  // Process each item
    }

    yield* timeout(5);  // Time between batches
  }
}
```

**Note:** Poisson distribution is discrete (returns integers), unlike exponential which is continuous.

## Discrete Distributions

### `choice(array)`

Select random element from array:

```typescript
const colors = ['red', 'green', 'blue'];
const color = rng.choice(colors);

const priorities = [1, 2, 3, 4, 5];
const priority = rng.choice(priorities);
```

### `sample(array, k)`

Select k random elements without replacement:

```typescript
const deck = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const hand = rng.sample(deck, 5);  // Draw 5 cards
```

## Examples

### Variable Arrival Process

```typescript
import { Simulation, Random, timeout } from 'discrete-sim';

function* customer(id: number, arrivalTime: number) {
  console.log(`Customer ${id} arrives at ${sim.now}`);

  // Service time between 3 and 7 minutes
  const serviceTime = rng.uniform(3, 7);
  yield* timeout(serviceTime);

  console.log(`Customer ${id} leaves after ${serviceTime.toFixed(1)} minutes`);
}

const sim = new Simulation();
const rng = new Random(42);  // Reproducible

function* arrivalProcess() {
  let id = 0;

  while (sim.now < 480) {  // 8 hour day
    const arrivalTime = sim.now;
    sim.process(() => customer(id++, arrivalTime));

    // Exponential inter-arrival time (mean = 5 minutes)
    const nextArrival = rng.exponential(5);
    yield* timeout(nextArrival);
  }
}

sim.process(arrivalProcess);
sim.run(480);
```

### Manufacturing Variability

```typescript
function* machine(rng: Random) {
  while (true) {
    // Normal processing time (mean=10, std=1)
    const processTime = Math.max(0.1, rng.normal(10, 1));
    yield* timeout(processTime);

    stats.increment('produced');

    // 2% chance of breakdown
    if (rng.random() < 0.02) {
      // Triangular repair time
      const repairTime = rng.triangular(10, 20, 60);
      console.log(`Breakdown! Repair time: ${repairTime.toFixed(1)}`);
      yield* timeout(repairTime);
      stats.increment('breakdowns');
    }
  }
}

const sim = new Simulation();
const stats = sim.statistics;
const rng = new Random(123);

for (let i = 0; i < 3; i++) {
  sim.process(() => machine(rng));
}

sim.run(480);

console.log(`Produced: ${stats.getCounter('produced')}`);
console.log(`Breakdowns: ${stats.getCounter('breakdowns')}`);
```

### Task Assignment

```typescript
function* dispatcher(tasks: string[], workers: Resource, rng: Random) {
  for (const task of tasks) {
    // Random task duration
    const duration = rng.triangular(5, 10, 20);

    // Random priority
    const priority = rng.randInt(1, 4);  // 1, 2, or 3

    console.log(`Task: ${task}, Priority: ${priority}, Duration: ${duration.toFixed(1)}`);

    // Assign to worker
    yield workers.request();
    yield* timeout(duration);
    workers.release();
  }
}

const sim = new Simulation();
const rng = new Random(999);
const workers = new Resource(sim, 2);

const tasks = ['Task-A', 'Task-B', 'Task-C', 'Task-D', 'Task-E'];
sim.process(() => dispatcher(tasks, workers, rng));

sim.run();
```

## Choosing the Right Distribution

### Exponential
- **When:** Modeling time between independent events
- **Examples:** Customer arrivals, equipment failures, phone calls

### Normal
- **When:** Natural variation around a mean
- **Examples:** Human performance, measurement errors, quality metrics

### Uniform
- **When:** All values equally likely
- **Examples:** Random delays, random selection, dice rolls

### Triangular
- **When:** Expert estimates with min/mode/max
- **Examples:** Project tasks, uncertain durations, risk analysis

## Best Practices

### Share One Random Instance

```typescript
// Good - one shared generator
const sim = new Simulation();
const rng = new Random(42);

function* process1() {
  yield* timeout(rng.exponential(5));
}

function* process2() {
  yield* timeout(rng.exponential(10));
}
```

### Avoid Math.random()

```typescript
// Bad - not reproducible
const value = Math.random();

// Good - reproducible
const value = rng.random();
```

### Use Meaningful Seeds

```typescript
// For production - random seed
const rng = new Random();

// For testing - fixed seed
const rng = new Random(42);

// For experiments - varied seeds
for (let seed = 0; seed < 30; seed++) {
  const rng = new Random(seed);
  runSimulation(rng);
}
```

### Validate Your Distributions

```typescript
// Collect samples
const samples: number[] = [];
for (let i = 0; i < 1000; i++) {
  samples.push(rng.exponential(5));
}

// Check mean
const mean = samples.reduce((a, b) => a + b) / samples.length;
console.log(`Mean: ${mean.toFixed(2)} (expected ~5.0)`);
```

## Random API Reference

```typescript
class Random {
  constructor(seed?: number)

  // Core
  random(): number                              // [0, 1)
  uniform(min: number, max: number): number     // [min, max)
  randInt(min: number, max: number): number     // [min, max)

  // Continuous distributions
  exponential(mean: number): number
  normal(mean: number, stdDev: number): number
  triangular(min: number, mode: number, max: number): number

  // Discrete
  choice<T>(array: T[]): T
  sample<T>(array: T[], k: number): T[]
}
```

## Next Steps

- Learn about [Error Handling](./errors) for robust simulations
- See [Examples](/examples/) for complete stochastic simulations
- Review [API Reference](/api/random) for detailed method documentation
