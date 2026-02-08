# Quick Start

This guide will help you build your first discrete event simulation in just a few minutes.

## Your First Simulation

Let's create a simple coffee shop simulation where customers arrive, wait in line, get served, and leave.

### Step 1: Install and Import

```bash
npm install discrete-sim
```

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';
```

### Step 2: Create the Simulation

```typescript
const sim = new Simulation();
const barista = new Resource(sim, 1, { name: 'Barista' });
```

### Step 3: Define Customer Process

Processes are generator functions that describe customer behavior:

```typescript
function* customer(id: number, barista: Resource) {
  const arrivalTime = sim.now;
  console.log(`[${sim.now}] Customer ${id} arrived`);

  // Request the barista
  yield barista.request();

  const waitTime = sim.now - arrivalTime;
  console.log(`[${sim.now}] Customer ${id} starts service (waited ${waitTime})`);

  // Service time (2-5 minutes)
  const serviceTime = 2 + Math.random() * 3;
  yield* timeout(serviceTime);

  // Release the barista
  barista.release();
  console.log(`[${sim.now}] Customer ${id} left`);
}
```

### Step 4: Generate Arrivals

```typescript
function* arrivalProcess() {
  for (let i = 1; i <= 10; i++) {
    // Start a customer process
    sim.process(() => customer(i, barista));

    // Wait 1-3 minutes until next arrival
    const interArrivalTime = 1 + Math.random() * 2;
    yield* timeout(interArrivalTime);
  }
}
```

### Step 5: Run the Simulation

```typescript
// Start the arrival process
sim.process(arrivalProcess);

// Run simulation
sim.run();

// Display statistics
console.log('\n=== Statistics ===');
console.log(`Simulation time: ${sim.now.toFixed(2)} minutes`);
console.log(`Barista utilization: ${(sim.statistics.getAverage('Barista:utilization') * 100).toFixed(1)}%`);
console.log(`Average wait time: ${sim.statistics.getAverage('Barista:wait-time').toFixed(2)} minutes`);
```

## Complete Example

Here's the complete coffee shop simulation:

```typescript
import { Simulation, Resource, Random, timeout } from 'discrete-sim';

// Create simulation
const sim = new Simulation();
const rng = new Random(42);  // Seeded for reproducibility
const barista = new Resource(sim, 1, { name: 'Barista' });

// Customer process
function* customer(id: number, barista: Resource) {
  const arrivalTime = sim.now;
  console.log(`[${sim.now.toFixed(2)}] Customer ${id} arrived`);

  // Request barista
  yield barista.request();

  const waitTime = sim.now - arrivalTime;
  console.log(`[${sim.now.toFixed(2)}] Customer ${id} being served (waited ${waitTime.toFixed(2)} min)`);

  // Service time
  const serviceTime = rng.uniform(2, 5);
  yield* timeout(serviceTime);

  // Release barista
  barista.release();
  console.log(`[${sim.now.toFixed(2)}] Customer ${id} left`);
}

// Arrival process
function* arrivalProcess() {
  for (let i = 1; i <= 20; i++) {
    sim.process(() => customer(i, barista));

    // Inter-arrival time (exponential distribution)
    const interArrival = rng.exponential(2);
    yield* timeout(interArrival);
  }
}

// Run simulation
sim.process(arrivalProcess);
sim.run();

// Results
console.log('\n========== RESULTS ==========');
console.log(`Simulation ended at: ${sim.now.toFixed(2)} minutes`);
console.log(`Average wait time: ${sim.statistics.getAverage('Barista:wait-time').toFixed(2)} minutes`);
console.log(`Barista utilization: ${(sim.statistics.getAverage('Barista:utilization') * 100).toFixed(1)}%`);
console.log(`Average queue length: ${sim.statistics.getAverage('Barista:queue-length').toFixed(2)}`);
```

## Using Random Distributions

`discrete-sim` includes support for various probability distributions:

```typescript
import { Random } from 'discrete-sim';

const rng = new Random(42);  // Seeded for reproducibility

// Exponential distribution (inter-arrival times)
const interArrival = rng.exponential(3);  // mean = 3

// Normal distribution (processing times with variation)
const processTime = rng.normal(10, 2);  // mean = 10, std = 2

// Uniform distribution (random range)
const serviceTime = rng.uniform(5, 15);  // min = 5, max = 15

// Triangular distribution (expert estimates)
const time = rng.triangular(1, 3, 10);  // min = 1, mode = 3, max = 10

// Random integer (dice roll)
const dice = rng.randInt(1, 7);  // 1-6

// Random choice
const priority = rng.choice(['high', 'medium', 'low']);
```

Use the random generator in your processes:

```typescript
function* customer(id: number, barista: Resource, rng: Random) {
  yield barista.request();

  // Random service time
  const serviceTime = rng.exponential(3);
  yield* timeout(serviceTime);

  barista.release();
}
```

## Multiple Resources

Let's extend our coffee shop with a cashier and barista:

```typescript
const sim = new Simulation();
const rng = new Random();
const cashier = new Resource(sim, 1, { name: 'Cashier' });
const barista = new Resource(sim, 2, { name: 'Barista' });  // 2 baristas

function* customer(id: number) {
  console.log(`[${sim.now.toFixed(2)}] Customer ${id} ordering`);

  // First, order at cash register
  yield cashier.request();
  yield* timeout(rng.uniform(0.5, 1.5));
  cashier.release();

  // Then, wait for coffee
  yield barista.request();
  yield* timeout(rng.uniform(2, 5));
  barista.release();

  console.log(`[${sim.now.toFixed(2)}] Customer ${id} received coffee`);
}

function* arrivalProcess() {
  let id = 1;
  while (sim.now < 480) {  // 8 hour day
    sim.process(() => customer(id++));
    yield* timeout(rng.exponential(2));
  }
}

sim.process(arrivalProcess);
sim.run(480);

// Check statistics for both resources
console.log(`Cashier utilization: ${(sim.statistics.getAverage('Cashier:utilization') * 100).toFixed(1)}%`);
console.log(`Barista utilization: ${(sim.statistics.getAverage('Barista:utilization') * 100).toFixed(1)}%`);
```

## Collecting Custom Statistics

Track additional metrics using the Statistics class:

```typescript
import { Simulation, Resource, Statistics, timeout } from 'discrete-sim';

const sim = new Simulation();
const stats = sim.statistics;
const server = new Resource(sim, 2);

function* customer(id: number) {
  const arrivalTime = sim.now;
  stats.increment('arrivals');

  yield server.request();

  const waitTime = sim.now - arrivalTime;
  stats.recordValue('custom-wait-time', waitTime);

  // Flag long waits
  if (waitTime > 10) {
    stats.increment('long-waits');
  }

  yield* timeout(5);

  server.release();
  stats.increment('departures');
}

// Generate customers
for (let i = 0; i < 50; i++) {
  sim.schedule(i * 2, () => {
    sim.process(() => customer(i));
  });
}

sim.run();

// Custom statistics
console.log(`Total arrivals: ${stats.getCounter('arrivals')}`);
console.log(`Total departures: ${stats.getCounter('departures')}`);
console.log(`Average wait: ${stats.getAverage('custom-wait-time').toFixed(2)}`);
console.log(`Max wait: ${stats.getMax('custom-wait-time').toFixed(2)}`);
console.log(`Long waits (>10): ${stats.getCounter('long-waits')}`);
```

## Common Patterns

### Pattern 1: Time-Varying Arrival Rates

Model systems with busy and quiet periods:

```typescript
function* timeVaryingArrivals(rng: Random) {
  let id = 1;

  while (sim.now < 480) {  // 8 hours
    const hour = Math.floor(sim.now / 60);

    // Higher rate during lunch hours (11am-1pm)
    const meanInterArrival = (hour >= 11 && hour <= 13) ? 0.5 : 2.0;

    sim.process(() => customer(id++));
    yield* timeout(rng.exponential(meanInterArrival));
  }
}

sim.process(() => timeVaryingArrivals(rng));
sim.run(480);
```

### Pattern 2: Batch Arrivals

Model groups arriving together:

```typescript
function* batchArrivalProcess(rng: Random) {
  let id = 1;

  while (sim.now < 480) {
    // Random batch size (1-4 customers)
    const batchSize = rng.randInt(1, 5);

    console.log(`[${sim.now}] Batch of ${batchSize} customers arrived`);

    // Start all customers in the batch
    for (let i = 0; i < batchSize; i++) {
      sim.process(() => customer(id++));
    }

    // Wait for next batch
    yield* timeout(rng.exponential(5));
  }
}
```

### Pattern 3: Resource Failures

Model systems with breakdowns and repairs:

```typescript
function* machineFailureProcess(machine: Resource, rng: Random) {
  while (true) {
    // Machine works for a while
    yield* timeout(rng.exponential(100));

    // Breakdown
    const downtime = rng.uniform(10, 30);
    console.log(`[${sim.now}] Machine breakdown for ${downtime.toFixed(1)} minutes`);

    stats.increment('breakdowns');

    // Temporarily reduce capacity
    const originalCapacity = machine.capacity;
    // Note: discrete-sim doesn't support dynamic capacity changes
    // This is for illustration; handle with separate resources in practice

    yield* timeout(downtime);

    console.log(`[${sim.now}] Machine repaired`);
  }
}
```

### Pattern 4: Multi-Step Processes

Model complex workflows:

```typescript
function* manufacturingProcess(item: number, rng: Random) {
  console.log(`[${sim.now}] Item ${item} starting`);

  // Stage 1: Assembly
  yield assembly.request();
  yield* timeout(rng.triangular(10, 15, 25));
  assembly.release();

  // Stage 2: Quality Check
  yield qualityCheck.request();
  yield* timeout(rng.uniform(3, 7));

  // Random defect (5% chance)
  if (rng.random() < 0.05) {
    stats.increment('defects');
    qualityCheck.release();
    return;  // Item rejected
  }

  qualityCheck.release();

  // Stage 3: Packaging
  yield packaging.request();
  yield* timeout(rng.uniform(5, 10));
  packaging.release();

  stats.increment('completed');
  console.log(`[${sim.now}] Item ${item} completed`);
}
```

## Next Steps

Congratulations! You've built your first discrete event simulation. To learn more:

- **[Processes](./processes)** - Deep dive into generator-based processes
- **[Resources](./resources)** - Learn about resource management and queuing
- **[Statistics](./statistics)** - Track and analyze simulation data
- **[Random Numbers](./random)** - Use probability distributions effectively
- **[API Reference](/api/)** - Complete API documentation
- **[Examples](/examples/)** - More complex simulation examples
