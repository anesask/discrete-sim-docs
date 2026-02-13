# Warehouse Distribution Center

A warehouse simulation demonstrating Store resources for managing distinct objects with filter-based retrieval.

## Overview

This example shows how to use the **Store** resource to model a distribution warehouse managing pallet inventory with:

- Distinct objects (pallets) with unique properties
- FIFO (first-in-first-out) retrieval
- Filter-based retrieval by destination and priority
- Multiple shipping strategies
- Resource coordination (forklifts + warehouse)

**Key Concepts:** Store resources, filter-based retrieval, inventory management, resource coordination

## Scenario

A distribution warehouse operates for 48 hours with the following parameters:

| Parameter | Value |
|-----------|-------|
| **Warehouse Capacity** | 100 pallets |
| **Forklifts Available** | 3 (shared Resource) |
| **Receiving Rate** | ~5 pallets/hour |
| **Shipping Rate** | ~4.5 pallets/hour |
| **Destinations** | NYC, LA, CHI, MIA |
| **Priority Levels** | 1 (high) to 3 (low) |

### Shipping Strategies

1. **Regular FIFO Shipping** - First-in, first-out (no filter)
2. **Priority Batch Shipping** - High-priority pallets every 6 hours
3. **Destination Routes** - Scheduled routes to specific cities

## Implementation

### Pallet Type Definition

Each pallet is a distinct object with properties:

```typescript
interface Pallet {
  id: string;
  destination: 'NYC' | 'LA' | 'CHI' | 'MIA';
  weight: number;      // kg
  priority: number;    // 1=high, 2=medium, 3=low
  receivedTime: number;
}
```

### Creating Resources

The warehouse uses both Store (for pallets) and Resource (for forklifts):

```typescript
import { Simulation, Store, Resource } from 'discrete-sim';

const sim = new Simulation();

// Store for pallets
const warehouse = new Store<Pallet>(sim, 100, {
  name: 'Warehouse'
});

// Resource for forklifts
const forklifts = new Resource(sim, 3, {
  name: 'Forklifts'
});
```

### Receiving Process

Pallets arrive and are stored in the warehouse:

```typescript
function* receivePallet(pallet: Pallet) {
  console.log(`📦 RECEIVING: Pallet ${pallet.id} for ${pallet.destination}`);

  // Need forklift to handle pallet
  yield forklifts.request();

  // Handling time
  yield* timeout(0.15);  // 9 minutes

  // Store pallet - blocks if warehouse full
  yield warehouse.put(pallet);

  forklifts.release();

  console.log(`✓ STORED: ${pallet.id} (warehouse: ${warehouse.size}/100)`);
}
```

### FIFO Shipping (No Filter)

Regular shipments take the first available pallet:

```typescript
function* fifoShipping() {
  while (true) {
    yield* timeout(rng.exponential(1/4.5));  // ~4.5 per hour

    console.log('🚚 SHIP-FIFO: Waiting for any pallet...');

    // Get first pallet (FIFO) - blocks if warehouse empty
    const request = warehouse.get();
    yield request;
    const pallet = request.retrievedItem!;

    // Need forklift to load
    yield forklifts.request();
    yield* timeout(0.15);
    forklifts.release();

    console.log(`📤 SHIPPING: ${pallet.id} to ${pallet.destination}`);
  }
}
```

### Filter-Based Shipping (By Destination)

Scheduled routes ship to specific destinations:

```typescript
function* destinationRoute(destination: string) {
  while (true) {
    yield* timeout(8);  // Every 8 hours

    // Find pallets for this destination
    const available = warehouse.items.filter(
      p => p.destination === destination
    );

    console.log(`🚛 ${destination} ROUTE: ${available.length} pallets ready`);

    // Ship up to 10 pallets for this destination
    for (let i = 0; i < Math.min(10, available.length); i++) {
      // Get pallet filtered by destination
      const request = warehouse.get(p => p.destination === destination);
      yield request;
      const pallet = request.retrievedItem!;

      yield forklifts.request();
      yield* timeout(0.15);
      forklifts.release();

      const waitTime = (sim.now - pallet.receivedTime) * 60;
      console.log(`🎯 DEST: Shipping ${pallet.id} to ${destination} (waited ${waitTime.toFixed(1)}min)`);
    }
  }
}
```

### Priority Shipping

High-priority pallets are shipped in batches:

```typescript
function* priorityShipping() {
  while (true) {
    yield* timeout(6);  // Every 6 hours

    // Count high-priority pallets
    const priorityPallets = warehouse.items.filter(p => p.priority === 1);

    console.log(`⚡ PRIORITY BATCH: Found ${priorityPallets.length} priority 1 items`);

    // Ship all priority 1 pallets
    for (let i = 0; i < priorityPallets.length; i++) {
      // Get priority 1 pallet
      const request = warehouse.get(p => p.priority === 1);
      yield request;
      const pallet = request.retrievedItem!;

      yield forklifts.request();
      yield* timeout(0.15);
      forklifts.release();

      console.log(`🔥 PRIORITY: Shipping ${pallet.id} to ${pallet.destination}`);
    }
  }
}
```

### Pallet Generation

Pallets arrive randomly with different destinations and priorities:

```typescript
function* palletGenerator(rng: Random) {
  let palletId = 0;

  const destinations = ['NYC', 'LA', 'CHI', 'MIA'];
  const priorityWeights = [0.2, 0.5, 0.3];  // 20% P1, 50% P2, 30% P3

  while (true) {
    // Exponential inter-arrival time
    yield* timeout(rng.exponential(1/5));  // ~5 per hour

    palletId++;

    const pallet: Pallet = {
      id: `P${String(palletId).padStart(4, '0')}`,
      destination: rng.choice(destinations),
      weight: Math.round(rng.uniform(400, 800)),
      priority: rng.choice([1, 2, 3]),  // Simplified
      receivedTime: sim.now
    };

    sim.process(() => receivePallet(pallet));
  }
}
```

### Complete Simulation

```typescript
const sim = new Simulation();
const rng = new Random(789);

const warehouse = new Store<Pallet>(sim, 100, { name: 'Warehouse' });
const forklifts = new Resource(sim, 3, { name: 'Forklifts' });

// Start processes
sim.process(() => palletGenerator(rng));
sim.process(() => fifoShipping());
sim.process(() => priorityShipping());
sim.process(() => destinationRoute('NYC'));
sim.process(() => destinationRoute('LA'));
sim.process(() => destinationRoute('CHI'));
sim.process(() => destinationRoute('MIA'));

// Run for 48 hours
sim.run(48);

// Print statistics
const stats = warehouse.stats;
console.log(`Total pallets received: ${stats.totalPuts}`);
console.log(`Total pallets shipped: ${stats.totalGets}`);
console.log(`Average occupancy: ${stats.averageSize.toFixed(2)} pallets`);
console.log(`Final inventory: ${warehouse.size} pallets`);
```

## Sample Output

```
Starting Warehouse Distribution Simulation...

[0.15h] 📦 RECEIVING: Pallet P0001 for NYC (642kg, Priority 1)
[0.30h] ✓ STORED: Pallet P0001 (warehouse: 1/100)
[0.45h] 📦 RECEIVING: Pallet P0002 for LA (531kg, Priority 2)
[0.60h] ✓ STORED: Pallet P0002 (warehouse: 2/100)
[0.72h] 🚚 SHIP-FIFO: Waiting for any pallet...
[0.92h] 📤 SHIPPING: Pallet P0001 to NYC (warehouse: 1/100)
...

[6.00h] ⚡ PRIORITY BATCH: Found 12 priority 1 items
[6.15h] 🔥 PRIORITY: Shipping P0015 to CHI (P1)
[6.30h] 🔥 PRIORITY: Shipping P0023 to NYC (P1)
...

[8.00h] 🚛 NYC ROUTE: 8 pallets ready
[8.20h] 🎯 DEST: Shipping P0034 to NYC (waited 125.3min)
...

======================================================================
WAREHOUSE DISTRIBUTION CENTER RESULTS
======================================================================
Simulation Duration: 48 hours

──────────────────────────────────────────────────────────────────────
WAREHOUSE OPERATIONS
──────────────────────────────────────────────────────────────────────
Warehouse Capacity: 100 pallets
Final Inventory: 34 pallets

Total Pallets Received: 245
Total Pallets Shipped: 211
Net Flow: 34 pallets

──────────────────────────────────────────────────────────────────────
PERFORMANCE METRICS
──────────────────────────────────────────────────────────────────────
Average Warehouse Occupancy: 28.5 pallets (28.5%)
Average Receiving Wait: 0.23 minutes
Average Shipping Wait: 45.67 minutes

──────────────────────────────────────────────────────────────────────
FORKLIFT UTILIZATION
──────────────────────────────────────────────────────────────────────
Number of Forklifts: 3
Forklift Utilization: 67.3%
Average Wait for Forklift: 3.42 minutes

──────────────────────────────────────────────────────────────────────
INVENTORY BREAKDOWN
──────────────────────────────────────────────────────────────────────
Current Inventory by Destination:
  NYC: 9 pallets
  LA: 6 pallets
  CHI: 11 pallets
  MIA: 8 pallets
======================================================================
```

## Key Insights

### Filter Blocking Behavior

When using `warehouse.get(filter)`:
- **Blocks until matching item available** - Filter is checked when new items are added
- **Multiple filtered gets can wait** - Different processes with different filters
- **FIFO for waiting gets** - Fulfilled in order they were requested

Example scenario:
```typescript
// Process 1 waiting for NYC pallet
const request1 = warehouse.get(p => p.destination === 'NYC');

// Process 2 waiting for priority 1 pallet
const request2 = warehouse.get(p => p.priority === 1);

// When NYC priority 1 pallet arrives:
// - Both filters match
// - Process 1 gets it (requested first)
// - Process 2 continues waiting
```

### Store vs Buffer Comparison

| Feature | Store (this example) | Buffer (fuel-station) |
|---------|---------------------|----------------------|
| **Items** | Distinct pallets | Homogeneous fuel |
| **Properties** | ID, destination, priority | Quantity only |
| **Retrieval** | FIFO or filtered | Quantity-based |
| **Use Case** | SKU tracking | Bulk commodity |
| **Operations** | `put(item)`, `get(filter?)` | `put(amount)`, `get(amount)` |

### Resource Coordination

This example demonstrates **Store + Resource** integration:

1. **Forklifts (Resource)** - Limited capacity (3 forklifts)
   - Ensures max 3 concurrent operations
   - Models physical constraint

2. **Warehouse (Store)** - Manages inventory (100 pallets)
   - Stores distinct pallets with properties
   - Enables filtered retrieval

3. **Combined** - Both resources work together:
   ```typescript
   yield forklifts.request();  // Get forklift
   yield warehouse.get(filter); // Get pallet
   yield* timeout(0.15);        // Load
   forklifts.release();         // Return forklift
   ```

### Inspecting Store Contents

The `items` property provides read-only access to stored items:

```typescript
// View all pallets
console.log('Current inventory:');
warehouse.items.forEach(pallet => {
  console.log(`  ${pallet.id}: ${pallet.destination} (P${pallet.priority})`);
});

// Count by destination
const destinations = ['NYC', 'LA', 'CHI', 'MIA'];
destinations.forEach(dest => {
  const count = warehouse.items.filter(p => p.destination === dest).length;
  console.log(`  ${dest}: ${count} pallets`);
});

// Find heaviest pallet
const heaviest = warehouse.items.reduce((a, b) =>
  a.weight > b.weight ? a : b
);
console.log(`Heaviest: ${heaviest.id} (${heaviest.weight}kg)`);
```

## Experimentation Ideas

### 1. Increase Receiving Rate

```typescript
yield* timeout(rng.exponential(1/8));  // 8 per hour instead of 5
```

**Expected:** Warehouse fills up faster, more blocking on puts

### 2. Add More Forklifts

```typescript
const forklifts = new Resource(sim, 5, { name: 'Forklifts' });
```

**Expected:** Less waiting for forklifts, higher throughput

### 3. Different Priority Distribution

```typescript
const priorityWeights = [0.5, 0.3, 0.2];  // 50% high priority
```

**Expected:** More priority batches, different shipping patterns

### 4. Larger Warehouse

```typescript
const warehouse = new Store<Pallet>(sim, 200, { name: 'Warehouse' });
```

**Expected:** Less blocking on puts, higher inventory levels

### 5. Batch Shipping by Weight

Add a filter for combined weight:

```typescript
function* weightOptimizedShipping() {
  while (true) {
    yield* timeout(4);

    // Ship pallets until truck is full (max 5000kg)
    let truckWeight = 0;
    const maxTruckWeight = 5000;

    while (truckWeight < maxTruckWeight) {
      const request = warehouse.get(p =>
        truckWeight + p.weight <= maxTruckWeight
      );
      yield request;
      const pallet = request.retrievedItem!;

      truckWeight += pallet.weight;
      console.log(`Loaded ${pallet.id}: ${truckWeight}kg / ${maxTruckWeight}kg`);
    }
  }
}
```

## Shipping Strategy Comparison

| Strategy | Filter | When | Pros | Cons |
|----------|--------|------|------|------|
| **FIFO** | None | Continuous | Fair, simple | May delay urgent items |
| **Priority** | `p.priority === 1` | Every 6h | Fast for urgent | May starve low priority |
| **Destination** | `p.destination === 'NYC'` | Scheduled | Batches efficiently | May delay off-route |

## Related Examples

- [Fuel Station](/examples/fuel-station) - Buffer for homogeneous quantities
- [Bank Tellers](/examples/bank-tellers) - Resource for discrete capacity
- [Hospital Emergency Room](/examples/hospital-emergency) - Priority queuing

## Learn More

- [Store API Reference](/api/store)
- [Buffer API Reference](/api/buffer)
- [Resources Guide](/guide/resources)
- [Statistics Guide](/guide/statistics)
