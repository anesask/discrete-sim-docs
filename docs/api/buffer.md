# Buffer

The `Buffer` class represents a resource that stores homogeneous quantities (tokens). Unlike `Store` which holds distinct objects, `Buffer` tracks a numerical quantity of identical tokens. Perfect for modeling fuel tanks, money, raw materials, bandwidth, inventory levels, etc.

## Constructor

```typescript
new Buffer(sim: Simulation, capacity: number, options?: BufferOptions)
```

**Parameters:**
- `sim` - Simulation instance
- `capacity` - Maximum capacity of the buffer (must be > 0)
- `options` - Optional configuration object
  - `name` - Buffer name for statistics and debugging
  - `initialLevel` - Starting quantity in buffer (default: 0)

**Example:**

```typescript
import { Simulation, Buffer } from 'discrete-sim';

const sim = new Simulation();

// Empty fuel tank with 1000 gallon capacity
const fuelTank = new Buffer(sim, 1000, {
  name: 'Fuel Tank',
  initialLevel: 0
});

// Bank account starting with $10,000
const account = new Buffer(sim, 1000000, {
  name: 'Account',
  initialLevel: 10000
});
```

**Validation:**
- `capacity` must be > 0 and finite
- `initialLevel` must be >= 0 and <= capacity
- Throws `ValidationError` for invalid parameters

## Properties

### `capacity`

```typescript
buffer.capacity: number
```

Maximum capacity of the buffer.

**Example:**

```typescript
const tank = new Buffer(sim, 1000);
console.log(tank.capacity);  // 1000
```

**Read-only** - Cannot be changed after creation.

### `level`

```typescript
buffer.level: number
```

Current quantity of tokens in the buffer.

**Example:**

```typescript
console.log(`Tank has ${fuelTank.level} gallons`);
```

**Range:** 0 to `capacity`

### `available`

```typescript
buffer.available: number
```

Available space remaining in the buffer.

**Example:**

```typescript
if (tank.available >= 100) {
  console.log('Room for 100 more gallons');
}
```

**Relation:** `available = capacity - level`

### `putQueueLength`

```typescript
buffer.putQueueLength: number
```

Number of processes waiting to put tokens into the buffer.

**Example:**

```typescript
console.log(`${tank.putQueueLength} trucks waiting to deliver`);
```

### `getQueueLength`

```typescript
buffer.getQueueLength: number
```

Number of processes waiting to get tokens from the buffer.

**Example:**

```typescript
console.log(`${tank.getQueueLength} customers waiting for fuel`);
```

### `name`

```typescript
buffer.name: string
```

Name of the buffer (for statistics and debugging).

### `stats`

```typescript
buffer.stats: BufferStatistics
```

Comprehensive statistics for this buffer.

**Returns:**
```typescript
interface BufferStatistics {
  totalPuts: number;           // Total put operations
  totalGets: number;           // Total get operations
  totalAmountPut: number;      // Total tokens added
  totalAmountGot: number;      // Total tokens removed
  averagePutWaitTime: number;  // Average time waiting to put
  averageGetWaitTime: number;  // Average time waiting to get
  averageLevel: number;        // Time-weighted average level
  averagePutQueueLength: number;
  averageGetQueueLength: number;
}
```

**Example:**

```typescript
const stats = fuelTank.stats;
console.log(`Average fuel level: ${stats.averageLevel.toFixed(2)} gallons`);
console.log(`Total fuel delivered: ${stats.totalAmountPut} gallons`);
console.log(`Total fuel sold: ${stats.totalAmountGot} gallons`);
```

## Methods

### `put()`

```typescript
yield buffer.put(amount: number): void
```

Request to put tokens into the buffer. Waits if insufficient space.

**Parameters:**
- `amount` - Quantity of tokens to add (must be > 0 and <= capacity)

**Returns:** Token to yield in generator function

**Example:**

```typescript
function* deliverFuel(amount: number) {
  console.log(`Delivering ${amount} gallons`);

  yield fuelTank.put(amount);

  console.log(`Delivery complete at ${sim.now}`);
}
```

**Behavior:**
- If space available: Tokens added immediately, process continues
- If insufficient space: Process queued until space becomes available
- Must use `yield` (not `yield*`) when putting
- Throws error if amount > capacity

**Queue Discipline:** FIFO (First-In-First-Out)

### `get()`

```typescript
yield buffer.get(amount: number): void
```

Request to get tokens from the buffer. Waits if insufficient tokens.

**Parameters:**
- `amount` - Quantity of tokens to remove (must be > 0)

**Returns:** Token to yield in generator function

**Example:**

```typescript
function* refuelCar() {
  console.log('Refueling car');

  yield fuelTank.get(15);  // Get 15 gallons

  console.log(`Refueling complete at ${sim.now}`);
}
```

**Behavior:**
- If tokens available: Tokens removed immediately, process continues
- If insufficient tokens: Process queued until tokens become available
- Must use `yield` (not `yield*`) when getting

**Queue Discipline:** FIFO (First-In-First-Out)

## Examples

### Example: Gas Station Fuel Tank

```typescript
import { Simulation, Buffer, timeout } from 'discrete-sim';

const sim = new Simulation();
const fuelTank = new Buffer(sim, 1000, {
  name: 'Fuel Tank',
  initialLevel: 500  // Start half full
});

// Customer refueling
function* customer(id: number, amount: number) {
  console.log(`[${sim.now}] Customer ${id} arrives, needs ${amount} gallons`);

  // Get fuel from tank
  yield fuelTank.get(amount);

  console.log(`[${sim.now}] Customer ${id} refueling...`);
  yield* timeout(5);  // Refueling time

  console.log(`[${sim.now}] Customer ${id} done`);
}

// Tanker delivery
function* tankerDelivery(amount: number) {
  while (true) {
    yield* timeout(120);  // Delivery every 120 time units

    console.log(`[${sim.now}] Tanker delivering ${amount} gallons`);
    yield fuelTank.put(amount);

    console.log(`[${sim.now}] Delivery complete. Tank level: ${fuelTank.level}`);
  }
}

// Start simulation
sim.process(() => tankerDelivery(800));

// Customers arrive
sim.process(() => customer(1, 15));
sim.process(() => customer(2, 20));
sim.schedule(10, () => sim.process(() => customer(3, 25)));

sim.run(200);

// Statistics
const stats = fuelTank.stats;
console.log(`\nFuel Tank Statistics:`);
console.log(`Average level: ${stats.averageLevel.toFixed(2)} gallons`);
console.log(`Total delivered: ${stats.totalAmountPut} gallons`);
console.log(`Total sold: ${stats.totalAmountGot} gallons`);
console.log(`Average customer wait: ${stats.averageGetWaitTime.toFixed(2)}`);
```

### Example: Bank Account

```typescript
function* deposit(amount: number) {
  console.log(`[${sim.now}] Depositing $${amount}`);
  yield account.put(amount);
  console.log(`[${sim.now}] Deposit complete. Balance: $${account.level}`);
}

function* withdrawal(amount: number) {
  console.log(`[${sim.now}] Withdrawing $${amount}`);

  // Check if funds available (optional)
  if (account.level < amount) {
    console.log(`[${sim.now}] Waiting for funds...`);
  }

  yield account.get(amount);
  console.log(`[${sim.now}] Withdrawal complete. Balance: $${account.level}`);
}

const account = new Buffer(sim, 1000000, {
  name: 'Account',
  initialLevel: 1000
});

sim.process(() => withdrawal(500));
sim.process(() => withdrawal(600));  // Must wait for deposit
sim.schedule(10, () => sim.process(() => deposit(500)));

sim.run();
```

### Example: Production Inventory

```typescript
function* producer(rng: Random) {
  while (sim.now < 480) {  // 8 hour shift
    // Produce items
    const batchSize = 50;
    yield* timeout(rng.exponential(20));

    console.log(`[${sim.now}] Produced ${batchSize} units`);
    yield inventory.put(batchSize);
  }
}

function* consumer(id: number, rng: Random) {
  while (sim.now < 480) {
    yield* timeout(rng.exponential(30));

    const needed = 20;
    console.log(`[${sim.now}] Consumer ${id} needs ${needed} units`);

    yield inventory.get(needed);
    console.log(`[${sim.now}] Consumer ${id} got ${needed} units`);
  }
}

const inventory = new Buffer(sim, 500, {
  name: 'Inventory',
  initialLevel: 100
});

const rng = new Random(42);

sim.process(() => producer(rng));
sim.process(() => consumer(1, rng));
sim.process(() => consumer(2, rng));

sim.run(480);

console.log(`Final inventory: ${inventory.level} units`);
console.log(`Average inventory: ${inventory.stats.averageLevel.toFixed(2)} units`);
```

## Common Patterns

### Pattern: Bounded Production-Consumption

```typescript
// Producer
function* produce(rate: number) {
  while (true) {
    yield* timeout(1 / rate);

    const amount = 10;
    yield buffer.put(amount);  // Blocks if buffer full
  }
}

// Consumer
function* consume(rate: number) {
  while (true) {
    yield* timeout(1 / rate);

    const amount = 10;
    yield buffer.get(amount);  // Blocks if buffer empty
  }
}
```

### Pattern: Check Before Request

```typescript
function* smartConsumer(needed: number) {
  // Check current level
  if (buffer.level < needed) {
    console.log(`Waiting for ${needed - buffer.level} more units`);
  }

  yield buffer.get(needed);
}
```

### Pattern: Coordinated Buffer and Resource

```typescript
function* fillTruck(truck: Resource, fuel: Buffer) {
  yield truck.request();  // Get truck
  yield fuel.get(100);    // Get fuel

  yield* timeout(10);     // Fill truck

  truck.release();
  // Fuel is consumed, not returned
}
```

## Best Practices

### 1. Set Appropriate Capacity

```typescript
// Good - realistic capacity
const tank = new Buffer(sim, 1000, { name: 'Tank' });

// Avoid - infinite capacity (use large number instead)
const unlimited = new Buffer(sim, Number.MAX_SAFE_INTEGER);
```

### 2. Use Initial Levels for Steady State

```typescript
// Start with typical operating level
const inventory = new Buffer(sim, 1000, {
  name: 'Inventory',
  initialLevel: 500  // Half full
});
```

### 3. Monitor Queue Lengths

```typescript
function* monitor() {
  while (true) {
    if (buffer.putQueueLength > 5) {
      console.log('Warning: Many producers waiting');
    }
    if (buffer.getQueueLength > 5) {
      console.log('Warning: Many consumers waiting');
    }
    yield* timeout(10);
  }
}
```

### 4. Track Statistics

```typescript
// Always name buffers for statistics
const tank = new Buffer(sim, 1000, { name: 'Fuel Tank' });

// After simulation
const stats = tank.stats;
console.log(`Utilization: ${(stats.averageLevel / tank.capacity * 100).toFixed(1)}%`);
```

## Differences from Store

| Feature | Buffer | Store |
|---------|--------|-------|
| Contents | Homogeneous tokens (numbers) | Distinct objects |
| Operations | `put(amount)`, `get(amount)` | `put(item)`, `get(filter?)` |
| Retrieval | By quantity | FIFO or filtered |
| Use Cases | Fuel, money, materials | Parts, vehicles, jobs |
| Level Tracking | Numeric level | Item count |

## See Also

- [Store API](./store) - Managing distinct objects
- [Resource API](./resource) - Capacity-based resources
- [Guide: Resources](/guide/resources) - Resource patterns and examples
- [Statistics API](./statistics) - Understanding buffer statistics
