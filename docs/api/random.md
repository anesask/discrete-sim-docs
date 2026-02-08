# Random

The `Random` class provides a seedable random number generator with support for common probability distributions. Seeding enables reproducible simulations.

## Constructor

```typescript
new Random(seed?: number)
```

**Parameters:**
- `seed` (optional) - Integer seed for reproducibility

**Example:**

```typescript
import { Random } from 'discrete-sim';

// Random seed (non-reproducible)
const rng = new Random();

// Fixed seed (reproducible)
const rng = new Random(42);

// Same seed = same sequence
const rng1 = new Random(12345);
const rng2 = new Random(12345);
console.log(rng1.random() === rng2.random());  // true
```

## Why Use Seeds?

Seeds provide **reproducibility** - crucial for:

- **Debugging** - Reproduce exact scenarios
- **Testing** - Validate with known inputs
- **Comparison** - Compare configurations with identical randomness
- **Verification** - Ensure simulation correctness

```typescript
// Production - random seed
const rng = new Random();

// Development/Testing - fixed seed
const rng = new Random(42);

// Multiple runs - varied seeds
for (let seed = 0; seed < 30; seed++) {
  const rng = new Random(seed);
  const result = runSimulation(rng);
  results.push(result);
}
```

## Core Methods

### `random()`

```typescript
rng.random(): number
```

Generate uniform random number in [0, 1).

**Returns:** Number between 0 (inclusive) and 1 (exclusive)

**Example:**

```typescript
const value = rng.random();  // 0.0 ≤ value < 1.0

// Random probability
if (rng.random() < 0.3) {
  console.log('30% chance event occurred');
}
```

**Equivalent:** Like `Math.random()` but seedable

## Distribution Methods

### `uniform()`

```typescript
rng.uniform(min: number, max: number): number
```

Generate uniform random number in [min, max).

**Parameters:**
- `min` - Minimum value (inclusive)
- `max` - Maximum value (exclusive)

**Returns:** Number in range [min, max)

**Example:**

```typescript
const serviceTime = rng.uniform(5, 15);     // 5 ≤ time < 15
const price = rng.uniform(10.0, 50.0);      // Random price
const angle = rng.uniform(0, 2 * Math.PI);  // Random angle
```

**Use Cases:**
- Service times with known range
- Random delays
- Uniform sampling

### `randInt()`

```typescript
rng.randInt(min: number, max: number): number
```

Generate random integer in [min, max).

**Parameters:**
- `min` - Minimum value (inclusive)
- `max` - Maximum value (exclusive)

**Returns:** Integer in range [min, max)

**Example:**

```typescript
const dice = rng.randInt(1, 7);        // 1, 2, 3, 4, 5, or 6
const choice = rng.randInt(0, 10);     // 0 to 9
const priority = rng.randInt(1, 4);    // 1, 2, or 3
```

**Use Cases:**
- Dice rolls
- Random selection from numbered items
- Priority levels

### `exponential()`

```typescript
rng.exponential(mean: number): number
```

Generate exponentially distributed random number.

**Parameters:**
- `mean` - Mean of the distribution (must be > 0)

**Returns:** Positive number (exponentially distributed)

**Example:**

```typescript
// Inter-arrival time (mean = 5 minutes)
const interArrival = rng.exponential(5);

// Service time (mean = 3 minutes)
const serviceTime = rng.exponential(3);

// Time until failure (mean = 1000 hours)
const timeToFailure = rng.exponential(1000);
```

**Use Cases:**
- Inter-arrival times (Poisson process)
- Service times
- Time between failures
- Lifetimes of components

**Properties:**
- Mean = `mean`
- Variance = `mean²`
- Memoryless property

### `normal()`

```typescript
rng.normal(mean: number, stdDev: number): number
```

Generate normally (Gaussian) distributed random number.

**Parameters:**
- `mean` - Mean of the distribution
- `stdDev` - Standard deviation (must be > 0)

**Returns:** Number (normally distributed)

**Example:**

```typescript
// IQ scores (mean=100, std=15)
const iq = rng.normal(100, 15);

// Processing time with variation (mean=10, std=2)
const processTime = rng.normal(10, 2);

// Measurement error (mean=0, std=0.1)
const error = rng.normal(0, 0.1);
```

**Use Cases:**
- Human performance metrics
- Measurement errors
- Natural phenomena
- Quality control dimensions

**Properties:**
- Mean = `mean`
- Variance = `stdDev²`
- ~68% within ±1σ, ~95% within ±2σ

**Note:** Can generate negative values. Use `Math.max(0, rng.normal(mean, std))` if needed.

### `triangular()`

```typescript
rng.triangular(min: number, mode: number, max: number): number
```

Generate triangular distributed random number.

**Parameters:**
- `min` - Minimum value
- `mode` - Most likely value (peak)
- `max` - Maximum value

**Returns:** Number between min and max

**Example:**

```typescript
// Task duration: optimistic=5, most likely=10, pessimistic=20
const duration = rng.triangular(5, 10, 20);

// Service time with most common value
const serviceTime = rng.triangular(3, 5, 15);
```

**Use Cases:**
- Expert estimates (PERT)
- Project planning
- When you have min/mode/max but not full distribution
- Limited historical data

**Properties:**
- Mean ≈ (min + mode + max) / 3
- Bounded by [min, max]

## Discrete Methods

### `choice()`

```typescript
rng.choice<T>(array: T[]): T
```

Select random element from array.

**Parameters:**
- `array` - Array to choose from

**Returns:** Random element from array

**Example:**

```typescript
const colors = ['red', 'green', 'blue', 'yellow'];
const color = rng.choice(colors);

const priorities = [1, 2, 3, 4, 5];
const priority = rng.choice(priorities);

// Random customer type
const types = ['regular', 'vip', 'premium'];
const customerType = rng.choice(types);
```

**Use Cases:**
- Random selection from options
- Random customer types
- Random failure modes

**Generic:** Preserves type: `choice<string>()` returns `string`

### `sample()`

```typescript
rng.sample<T>(array: T[], k: number): T[]
```

Select k random elements without replacement.

**Parameters:**
- `array` - Array to sample from
- `k` - Number of elements to select

**Returns:** Array of k random elements (no duplicates)

**Example:**

```typescript
const deck = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const hand = rng.sample(deck, 5);  // Draw 5 cards

// Random subset of tasks
const allTasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const selectedTasks = rng.sample(allTasks, 3);
```

**Use Cases:**
- Card games
- Random sampling without replacement
- Selecting subset of items

**Validation:** Throws error if `k > array.length`

## Examples

### Example: Variable Arrivals

```typescript
import { Simulation, Resource, Random, timeout } from 'discrete-sim';

function* customer(id: number, server: Resource, rng: Random) {
  console.log(`[${sim.now}] Customer ${id} arrived`);

  yield server.request();

  // Service time: 3-7 minutes (uniform)
  const serviceTime = rng.uniform(3, 7);
  yield* timeout(serviceTime);

  server.release();
  console.log(`[${sim.now}] Customer ${id} departed`);
}

function* arrivalProcess(rng: Random) {
  let id = 0;

  while (sim.now < 480) {
    sim.process(() => customer(id++, server, rng));

    // Exponential inter-arrival (mean = 5 minutes)
    const nextArrival = rng.exponential(5);
    yield* timeout(nextArrival);
  }
}

const sim = new Simulation();
const server = new Resource(sim, 2, { name: 'Server' });
const rng = new Random(42);  // Reproducible

sim.process(() => arrivalProcess(rng));
sim.run(480);
```

### Example: Manufacturing with Variation

```typescript
function* machine(id: number, rng: Random) {
  while (sim.now < 480) {
    // Normal processing time (mean=10, std=1)
    const processTime = Math.max(0.5, rng.normal(10, 1));
    yield* timeout(processTime);

    sim.statistics.increment('produced');

    // Random quality (95% pass rate)
    if (rng.random() < 0.95) {
      sim.statistics.increment('quality-pass');
    } else {
      sim.statistics.increment('defects');
    }

    // Random breakdown (2% chance)
    if (rng.random() < 0.02) {
      // Triangular repair time
      const repairTime = rng.triangular(10, 20, 60);
      console.log(`Machine ${id} breakdown: ${repairTime.toFixed(1)} min repair`);
      yield* timeout(repairTime);
      sim.statistics.increment('breakdowns');
    }
  }
}

const sim = new Simulation();
const rng = new Random(123);

for (let i = 0; i < 3; i++) {
  sim.process(() => machine(i, rng));
}

sim.run(480);
```

### Example: Discrete Choices

```typescript
function* customer(id: number, rng: Random) {
  // Random customer type
  const types = ['standard', 'express', 'premium'];
  const customerType = rng.choice(types);

  console.log(`Customer ${id}: ${customerType}`);

  // Service time depends on type
  let serviceTime: number;
  if (customerType === 'express') {
    serviceTime = rng.uniform(2, 4);
  } else if (customerType === 'premium') {
    serviceTime = rng.uniform(5, 10);
  } else {
    serviceTime = rng.uniform(3, 7);
  }

  yield* timeout(serviceTime);
}

const sim = new Simulation();
const rng = new Random(999);

for (let i = 0; i < 20; i++) {
  sim.process(() => customer(i, rng));
}

sim.run();
```

### Example: Random Task Assignment

```typescript
function* taskDispatcher(rng: Random) {
  const allTasks = Array.from({length: 20}, (_, i) => `Task-${i}`);

  // Randomly select 10 tasks
  const selectedTasks = rng.sample(allTasks, 10);

  for (const task of selectedTasks) {
    const duration = rng.triangular(5, 10, 20);
    const priority = rng.randInt(1, 4);

    console.log(`${task}: duration=${duration.toFixed(1)}, priority=${priority}`);

    yield workers.request();
    yield* timeout(duration);
    workers.release();
  }
}

const sim = new Simulation();
const workers = new Resource(sim, 3);
const rng = new Random(555);

sim.process(() => taskDispatcher(rng));
sim.run();
```

## Choosing Distributions

### Exponential
- **When:** Time between independent events
- **Examples:** Customer arrivals, equipment failures, phone calls
- **Parameter:** Mean (average time)

### Normal
- **When:** Natural variation around a mean
- **Examples:** Human performance, measurement errors, quality dimensions
- **Parameters:** Mean and standard deviation

### Uniform
- **When:** All values equally likely in range
- **Examples:** Random delays, dice rolls, initial conditions
- **Parameters:** Min and max

### Triangular
- **When:** Expert estimates with min/mode/max
- **Examples:** Project tasks, uncertain durations, risk analysis
- **Parameters:** Min, mode (most likely), max

## Common Patterns

### Pattern: Shared Random Instance

```typescript
// Good - one shared generator for entire simulation
const sim = new Simulation();
const rng = new Random(42);

function* process1() {
  yield* timeout(rng.exponential(5));
}

function* process2() {
  yield* timeout(rng.exponential(10));
}

sim.process(process1);
sim.process(process2);
```

### Pattern: Independent Random Streams

```typescript
// Separate RNGs for different purposes (advanced)
const arrivalRng = new Random(100);
const serviceRng = new Random(200);

function* arrivalProcess() {
  yield* timeout(arrivalRng.exponential(5));
}

function* serviceProcess() {
  yield* timeout(serviceRng.exponential(3));
}
```

### Pattern: Validation

```typescript
// Collect samples to verify distribution
const samples: number[] = [];
const rng = new Random(42);

for (let i = 0; i < 10000; i++) {
  samples.push(rng.exponential(5));
}

const mean = samples.reduce((a, b) => a + b) / samples.length;
console.log(`Mean: ${mean.toFixed(2)} (expected: 5.00)`);
```

## Best Practices

### 1. Use Seeds for Development

```typescript
// Development - reproducible
const rng = new Random(42);

// Production - truly random
const rng = new Random();
```

### 2. Share One RNG Instance

```typescript
// Good - shared across simulation
const rng = new Random(42);

function* process1() {
  const t = rng.exponential(5);
}

function* process2() {
  const t = rng.exponential(10);
}
```

### 3. Avoid Math.random()

```typescript
// Bad - not reproducible
const value = Math.random();

// Good - reproducible with seed
const value = rng.random();
```

### 4. Validate Negative Values

```typescript
// Normal can generate negatives
const time = rng.normal(10, 2);

// Clamp if needed
const safeTime = Math.max(0.1, time);
```

### 5. Document Distribution Choices

```typescript
// Good - explain why
const interArrival = rng.exponential(5);  // Poisson arrivals, mean 5 min

// Even better
/**
 * Inter-arrival time modeled as exponential (Poisson process)
 * Historical data shows mean = 5 minutes
 */
const interArrival = rng.exponential(5);
```

## Implementation

Uses Linear Congruential Generator (LCG) with:
- Modulus: 2³¹ - 1 (2147483647)
- Multiplier: 48271
- Increment: 0

Good statistical properties for simulation purposes.

## See Also

- [Guide: Random Numbers](/guide/random) - Detailed distribution guidance
- [Simulation API](./simulation) - Using RNG in simulations
- [Guide: Statistics](/guide/statistics) - Validating random distributions
