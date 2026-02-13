# Store

The `Store` class represents a resource that holds distinct JavaScript objects. Unlike `Buffer` which tracks homogeneous quantities, `Store` manages a collection of individual items with optional filter-based retrieval. Perfect for modeling warehouses, parking lots, job queues, or any system managing distinct entities.

## Constructor

```typescript
new Store<T>(sim: Simulation, capacity: number, options?: StoreOptions)
```

**Type Parameters:**
- `T` - The type of items stored (can be any JavaScript object)

**Parameters:**
- `sim` - Simulation instance
- `capacity` - Maximum number of items the store can hold (must be > 0)
- `options` - Optional configuration object
  - `name` - Store name for statistics and debugging

**Example:**

```typescript
import { Simulation, Store } from 'discrete-sim';

const sim = new Simulation();

// Warehouse storing pallets
interface Pallet {
  id: string;
  destination: string;
  weight: number;
}

const warehouse = new Store<Pallet>(sim, 100, {
  name: 'Warehouse'
});

// Parking lot storing cars
interface Car {
  licensePlate: string;
  arrivalTime: number;
}

const parkingLot = new Store<Car>(sim, 50, {
  name: 'Parking Lot'
});
```

**Validation:**
- `capacity` must be > 0 and finite
- Throws `ValidationError` for invalid capacity

## Properties

### `capacity`

```typescript
store.capacity: number
```

Maximum number of items the store can hold.

**Example:**

```typescript
const warehouse = new Store(sim, 100);
console.log(warehouse.capacity);  // 100
```

**Read-only** - Cannot be changed after creation.

### `size`

```typescript
store.size: number
```

Current number of items in the store.

**Example:**

```typescript
console.log(`${warehouse.size}/${warehouse.capacity} spaces used`);
```

**Range:** 0 to `capacity`

### `available`

```typescript
store.available: number
```

Available space in the store.

**Example:**

```typescript
if (warehouse.available > 0) {
  console.log('Space available for new items');
}
```

**Relation:** `available = capacity - size`

### `items`

```typescript
store.items: ReadonlyArray<T>
```

Read-only view of items currently in the store.

**Example:**

```typescript
console.log(`Items in warehouse:`);
warehouse.items.forEach(item => {
  console.log(`  - ${item.id}: ${item.destination}`);
});
```

**Note:** Returns a shallow copy. Modifying the items themselves will affect the store.

### `putQueueLength`

```typescript
store.putQueueLength: number
```

Number of processes waiting to put items into the store.

**Example:**

```typescript
console.log(`${warehouse.putQueueLength} trucks waiting to unload`);
```

### `getQueueLength`

```typescript
store.getQueueLength: number
```

Number of processes waiting to get items from the store.

**Example:**

```typescript
console.log(`${warehouse.getQueueLength} trucks waiting to load`);
```

### `name`

```typescript
store.name: string
```

Name of the store (for statistics and debugging).

### `stats`

```typescript
store.stats: StoreStatistics
```

Comprehensive statistics for this store.

**Returns:**
```typescript
interface StoreStatistics {
  totalPuts: number;           // Total put operations
  totalGets: number;           // Total get operations
  averagePutWaitTime: number;  // Average time waiting to put
  averageGetWaitTime: number;  // Average time waiting to get
  averageSize: number;         // Time-weighted average size
  averagePutQueueLength: number;
  averageGetQueueLength: number;
}
```

**Example:**

```typescript
const stats = warehouse.stats;
console.log(`Average occupancy: ${stats.averageSize.toFixed(2)} pallets`);
console.log(`Total items stored: ${stats.totalPuts}`);
console.log(`Total items retrieved: ${stats.totalGets}`);
```

## Methods

### `put()`

```typescript
yield store.put(item: T): void
```

Request to put an item into the store. Waits if store is full.

**Parameters:**
- `item` - Object to store (cannot be null or undefined)

**Returns:** Token to yield in generator function

**Example:**

```typescript
function* receivePallet(pallet: Pallet) {
  console.log(`Receiving pallet ${pallet.id}`);

  yield warehouse.put(pallet);

  console.log(`Pallet ${pallet.id} stored at ${sim.now}`);
}
```

**Behavior:**
- If space available: Item stored immediately, process continues
- If store full: Process queued until space becomes available
- Must use `yield` (not `yield*`) when putting
- Throws error if item is null or undefined

**Queue Discipline:** FIFO (First-In-First-Out)

### `get()`

```typescript
yield store.get(filter?: (item: T) => boolean): StoreGetRequest<T>
```

Request to get an item from the store. Waits if no matching item available.

**Parameters:**
- `filter` - Optional predicate function to select specific items. If omitted, returns first item (FIFO).

**Returns:** `StoreGetRequest` token to yield. After yielding, access the retrieved item via `request.retrievedItem`.

**Example:**

```typescript
// FIFO retrieval (no filter)
function* shipNext() {
  const request = warehouse.get();
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`Shipping pallet ${pallet.id}`);
}

// Filtered retrieval
function* shipToNYC() {
  const request = warehouse.get(p => p.destination === 'NYC');
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`Shipping pallet ${pallet.id} to NYC`);
}
```

**Behavior:**
- If matching item available: Item retrieved immediately, process continues
- If no match: Process queued until matching item becomes available
- Must use `yield` (not `yield*`) when getting
- Filter function is called on each item until a match is found

**Queue Discipline:** FIFO for queued get requests. Filter-based requests are fulfilled as matching items become available.

## Examples

### Example: Warehouse with Pallets

```typescript
import { Simulation, Store, timeout } from 'discrete-sim';

interface Pallet {
  id: string;
  destination: string;
  weight: number;
}

const sim = new Simulation();
const warehouse = new Store<Pallet>(sim, 100, { name: 'Warehouse' });

// Receiving pallets
function* receiveTruck(pallets: Pallet[]) {
  console.log(`[${sim.now}] Truck arriving with ${pallets.length} pallets`);

  for (const pallet of pallets) {
    yield warehouse.put(pallet);
    console.log(`[${sim.now}] Stored pallet ${pallet.id} for ${pallet.destination}`);
    yield* timeout(2);  // Unloading time
  }

  console.log(`[${sim.now}] Truck unloaded`);
}

// Shipping to specific destination
function* shipTo(destination: string) {
  console.log(`[${sim.now}] Looking for pallet to ${destination}`);

  const request = warehouse.get(p => p.destination === destination);
  yield request;
  const pallet = request.retrievedItem!;

  console.log(`[${sim.now}] Found pallet ${pallet.id}, loading truck`);
  yield* timeout(5);  // Loading time

  console.log(`[${sim.now}] Shipped pallet ${pallet.id} to ${destination}`);
}

// Receive some pallets
const incomingPallets: Pallet[] = [
  { id: 'P001', destination: 'NYC', weight: 500 },
  { id: 'P002', destination: 'LAX', weight: 600 },
  { id: 'P003', destination: 'NYC', weight: 450 },
];

sim.process(() => receiveTruck(incomingPallets));

// Ship pallets
sim.schedule(10, () => sim.process(() => shipTo('NYC')));
sim.schedule(20, () => sim.process(() => shipTo('LAX')));

sim.run(100);

// Statistics
const stats = warehouse.stats;
console.log(`\nWarehouse Statistics:`);
console.log(`Average occupancy: ${stats.averageSize.toFixed(2)} pallets`);
console.log(`Total received: ${stats.totalPuts} pallets`);
console.log(`Total shipped: ${stats.totalGets} pallets`);
console.log(`Remaining: ${warehouse.size} pallets`);
```

### Example: Parking Lot

```typescript
interface Car {
  licensePlate: string;
  arrivalTime: number;
  owner: string;
}

const parkingLot = new Store<Car>(sim, 50, { name: 'Parking' });

function* parkCar(car: Car) {
  car.arrivalTime = sim.now;
  console.log(`[${sim.now}] ${car.owner} parking ${car.licensePlate}`);

  yield parkingLot.put(car);

  console.log(`[${sim.now}] Car parked. ${parkingLot.available} spots left`);
}

function* retrieveCar(licensePlate: string) {
  console.log(`[${sim.now}] Looking for car ${licensePlate}`);

  const request = parkingLot.get(c => c.licensePlate === licensePlate);
  yield request;
  const car = request.retrievedItem!;

  const parkedTime = sim.now - car.arrivalTime;
  console.log(`[${sim.now}] Found car. Parked for ${parkedTime} minutes`);
}

// Cars arriving
sim.process(() => parkCar({ licensePlate: 'ABC123', owner: 'Alice', arrivalTime: 0 }));
sim.process(() => parkCar({ licensePlate: 'XYZ789', owner: 'Bob', arrivalTime: 0 }));

// Cars leaving
sim.schedule(60, () => sim.process(() => retrieveCar('ABC123')));
sim.schedule(90, () => sim.process(() => retrieveCar('XYZ789')));

sim.run(120);
```

### Example: Job Queue with Priorities

```typescript
interface Job {
  id: string;
  priority: number;
  data: string;
}

const jobQueue = new Store<Job>(sim, 100, { name: 'Jobs' });

function* submitJob(job: Job) {
  console.log(`[${sim.now}] Submitting job ${job.id} (priority ${job.priority})`);
  yield jobQueue.put(job);
}

function* processHighPriorityJobs() {
  while (true) {
    // Get highest priority job (priority 1)
    const request = jobQueue.get(j => j.priority === 1);
    yield request;
    const job = request.retrievedItem!;

    console.log(`[${sim.now}] Processing high-priority job ${job.id}`);
    yield* timeout(10);
  }
}

function* processNormalJobs() {
  while (true) {
    // Get normal priority jobs
    const request = jobQueue.get(j => j.priority === 2);
    yield request;
    const job = request.retrievedItem!;

    console.log(`[${sim.now}] Processing normal job ${job.id}`);
    yield* timeout(15);
  }
}

// Submit jobs
sim.process(() => submitJob({ id: 'J1', priority: 2, data: 'Normal' }));
sim.process(() => submitJob({ id: 'J2', priority: 1, data: 'Urgent' }));
sim.process(() => submitJob({ id: 'J3', priority: 2, data: 'Normal' }));

// Start workers
sim.process(() => processHighPriorityJobs());
sim.process(() => processNormalJobs());

sim.run(100);
```

## Common Patterns

### Pattern: FIFO Queue

```typescript
// Put items
function* addItem(item: T) {
  yield store.put(item);
}

// Get items in order
function* processNext() {
  const request = store.get();  // No filter = FIFO
  yield request;
  const item = request.retrievedItem!;

  // Process item
}
```

### Pattern: Filter by Property

```typescript
// Get specific item
function* getByDestination(dest: string) {
  const request = store.get(item => item.destination === dest);
  yield request;
  const item = request.retrievedItem!;
}

// Get by multiple criteria
function* getHeavyToNYC() {
  const request = store.get(p =>
    p.destination === 'NYC' && p.weight > 500
  );
  yield request;
  const pallet = request.retrievedItem!;
}
```

### Pattern: Inspect Items Before Getting

```typescript
function* selectBest() {
  // Check available items
  console.log('Available items:');
  store.items.forEach(item => {
    console.log(`  ${item.id}: ${item.priority}`);
  });

  // Get highest priority
  const maxPriority = Math.max(...store.items.map(i => i.priority));
  const request = store.get(item => item.priority === maxPriority);
  yield request;
  const best = request.retrievedItem!;
}
```

### Pattern: Coordinated Store and Resource

```typescript
function* loadTruck(truck: Resource, warehouse: Store<Pallet>) {
  yield truck.request();  // Get truck

  const request = warehouse.get();  // Get pallet
  yield request;
  const pallet = request.retrievedItem!;

  yield* timeout(10);  // Loading time

  truck.release();

  // Drive away with pallet
  console.log(`Truck loaded with ${pallet.id}`);
}
```

## Best Practices

### 1. Use TypeScript Types

```typescript
// Good - type safety
interface Part {
  id: string;
  type: string;
}

const store = new Store<Part>(sim, 100);

// Avoid - no type checking
const store = new Store(sim, 100);  // Store<any>
```

### 2. Always Check retrievedItem

```typescript
// Good - safe access
const request = store.get(filter);
yield request;
const item = request.retrievedItem!;

// Or with null check
if (request.retrievedItem) {
  const item = request.retrievedItem;
}
```

### 3. Use Filters for Complex Queries

```typescript
// Good - flexible filtering
const request = store.get(item =>
  item.priority > 5 &&
  item.deadline < sim.now + 100 &&
  item.status === 'ready'
);
```

### 4. Monitor Store State

```typescript
function* monitor() {
  while (true) {
    console.log(`Store: ${store.size}/${store.capacity} items`);
    console.log(`  Put queue: ${store.putQueueLength}`);
    console.log(`  Get queue: ${store.getQueueLength}`);

    if (store.size === 0 && store.getQueueLength > 0) {
      console.log('Warning: Stockout condition!');
    }

    yield* timeout(10);
  }
}
```

### 5. Name Stores for Statistics

```typescript
// Always provide a name
const warehouse = new Store<Pallet>(sim, 100, {
  name: 'Warehouse'
});

// After simulation
console.log(`Utilization: ${(warehouse.stats.averageSize / warehouse.capacity * 100).toFixed(1)}%`);
```

## Differences from Buffer

| Feature | Store | Buffer |
|---------|-------|--------|
| Contents | Distinct objects | Homogeneous tokens (numbers) |
| Operations | `put(item)`, `get(filter?)` | `put(amount)`, `get(amount)` |
| Retrieval | FIFO or filtered | By quantity |
| Use Cases | Parts, vehicles, jobs | Fuel, money, materials |
| Item Tracking | Individual objects | Numeric level |
| Filter Support | Yes | No |

## Performance Considerations

### Filter Efficiency

```typescript
// Efficient - simple property check
const request = store.get(item => item.id === targetId);

// Less efficient - complex computation
const request = store.get(item =>
  expensiveCalculation(item) > threshold
);
```

### Large Stores

```typescript
// For very large stores, consider:
// 1. Using simple filters
// 2. Monitoring getQueue length
// 3. Indexing items externally if needed

const largeStore = new Store<Item>(sim, 10000, {
  name: 'Large Store'
});
```

## See Also

- [Buffer API](./buffer) - Managing homogeneous quantities
- [Resource API](./resource) - Capacity-based resources
- [Guide: Resources](/guide/resources) - Resource patterns and examples
- [Statistics API](./statistics) - Understanding store statistics
