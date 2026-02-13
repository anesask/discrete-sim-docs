# Fuel Station

A gas station simulation demonstrating Buffer resources for managing homogeneous quantities like fuel inventory.

## Overview

This example shows how to use the **Buffer** resource to model a fuel station where:

- Trucks arrive randomly to refuel (consumers)
- Tankers deliver fuel periodically (producers)
- The fuel tank has limited capacity and can run low
- Queue management handles waiting when fuel is unavailable

**Key Concepts:** Buffer resources, producer-consumer pattern, inventory management, queue blocking

## Scenario

A gas station operates for 24 hours with the following parameters:

| Parameter | Value |
|-----------|-------|
| **Fuel Tank Capacity** | 10,000 gallons |
| **Initial Fuel Level** | 5,000 gallons (50% full) |
| **Truck Arrival Rate** | ~8 per hour (Poisson arrivals) |
| **Fuel per Truck** | 50-150 gallons (uniform distribution) |
| **Refueling Time** | 6 minutes per truck |
| **Tanker Deliveries** | Every 6 hours |
| **Delivery Amount** | 5,000 gallons per tanker |
| **Delivery Time** | 30 minutes |

## Implementation

### Creating the Buffer

The fuel tank is modeled as a Buffer with capacity and initial level:

```typescript
import { Simulation, Buffer } from 'discrete-sim';

const sim = new Simulation();

const fuelTank = new Buffer(sim, 10000, {
  name: 'Fuel Tank',
  initialLevel: 5000  // Start half full
});
```

### Truck Process (Consumer)

Trucks get fuel from the buffer. If insufficient fuel is available, they wait in queue:

```typescript
function* truck(id: number, fuelTank: Buffer, rng: Random) {
  const fuelNeeded = Math.round(rng.uniform(50, 150));

  console.log(`Truck ${id} needs ${fuelNeeded} gallons`);

  // Get fuel - blocks if insufficient fuel
  yield fuelTank.get(fuelNeeded);

  console.log(`Truck ${id} refueling (tank now: ${fuelTank.level})`);

  // Refueling time
  yield* timeout(0.1);  // 6 minutes

  console.log(`Truck ${id} departs`);
}
```

### Tanker Process (Producer)

Tankers put fuel into the buffer. If insufficient space, they wait:

```typescript
function* tanker(deliveryNumber: number, fuelTank: Buffer) {
  const deliveryAmount = 5000;

  console.log(`Tanker ${deliveryNumber} arrives`);

  // Filling time
  yield* timeout(0.5);  // 30 minutes

  // Deliver fuel - blocks if insufficient space
  yield fuelTank.put(deliveryAmount);

  console.log(`Delivered ${deliveryAmount} gallons. Tank: ${fuelTank.level}`);
}
```

### Truck Arrival Generator

Trucks arrive following a Poisson process:

```typescript
function* truckGenerator(fuelTank: Buffer, rng: Random) {
  let truckCount = 0;

  while (true) {
    // Exponential inter-arrival time
    const interArrivalTime = rng.exponential(1/8);  // 8 per hour
    yield* timeout(interArrivalTime);

    truckCount++;
    sim.process(() => truck(truckCount, fuelTank, rng));
  }
}
```

### Tanker Delivery Scheduler

Tankers arrive on a fixed schedule:

```typescript
function* tankerScheduler(fuelTank: Buffer) {
  let deliveryCount = 0;

  while (true) {
    yield* timeout(6);  // Every 6 hours

    deliveryCount++;
    sim.process(() => tanker(deliveryCount, fuelTank));
  }
}
```

### Complete Simulation

```typescript
const sim = new Simulation();
const rng = new Random(456);

const fuelTank = new Buffer(sim, 10000, {
  name: 'Fuel Tank',
  initialLevel: 5000
});

// Start processes
sim.process(() => truckGenerator(fuelTank, rng));
sim.process(() => tankerScheduler(fuelTank));

// Run for 24 hours
sim.run(24);

// Print statistics
const stats = fuelTank.stats;
console.log(`Average fuel level: ${stats.averageLevel.toFixed(2)} gallons`);
console.log(`Total trucks served: ${stats.totalGets}`);
console.log(`Total fuel dispensed: ${stats.totalAmountGot} gallons`);
console.log(`Average truck wait: ${stats.averageGetWaitTime.toFixed(2)} hours`);
```

## Sample Output

```
Starting Fuel Station Simulation...

[0.00h] Truck 1 arrives, needs 89 gallons (tank level: 5000)
[0.00h] Truck 1 starts refueling 89 gallons (tank now: 4911)
[0.10h] Truck 1 departs (refueled 89 gallons)
[0.12h] Truck 2 arrives, needs 127 gallons (tank level: 4911)
[0.12h] Truck 2 starts refueling 127 gallons (tank now: 4784)
...
[5.87h] ⚠️  WARNING: Fuel tank running low (876 gallons remaining)
[6.00h] 🚛 TANKER 1 arrives with 5000 gallons (tank: 2347/10000)
[6.50h] 🚛 TANKER 1 delivered 5000 gallons (tank now: 7347/10000)
...

======================================================================
FUEL STATION SIMULATION RESULTS
======================================================================
Simulation Duration: 24 hours

Fuel Tank Capacity: 10000 gallons
Initial Fuel Level: 5000 gallons
Final Fuel Level: 3456 gallons

──────────────────────────────────────────────────────────────────────
OPERATIONS SUMMARY
──────────────────────────────────────────────────────────────────────
Total Trucks Served: 187
Total Fuel Dispensed: 16544 gallons
Average Fuel per Truck: 88.5 gallons

Total Tanker Deliveries: 4
Total Fuel Delivered: 20000 gallons

──────────────────────────────────────────────────────────────────────
QUEUE PERFORMANCE
──────────────────────────────────────────────────────────────────────
Average Truck Wait Time: 1.23 minutes
Average Truck Queue Length: 0.16

Average Tanker Wait Time: 0.00 minutes
Average Tanker Queue Length: 0.00

──────────────────────────────────────────────────────────────────────
INVENTORY METRICS
──────────────────────────────────────────────────────────────────────
Average Fuel Level: 5234 gallons (52.3% capacity)
Inventory Turnover: 3.16x
Net Fuel Flow: +3456 gallons
======================================================================
```

## Key Insights

### Blocking Behavior

**Trucks block** when `fuelTank.level < fuelNeeded`:
- Truck joins the get queue
- Waits until tanker delivery provides enough fuel
- First-in-first-out (FIFO) order

**Tankers block** when `fuelTank.available < deliveryAmount`:
- Tanker joins the put queue
- Waits until trucks consume enough fuel to make space
- FIFO order

### Low Fuel Warnings

The simulation can monitor fuel levels and warn before stockouts:

```typescript
if (fuelTank.level < 1000) {
  console.log(`⚠️  WARNING: Fuel tank running low (${fuelTank.level} gallons)`);
}
```

### Buffer Statistics

The Buffer automatically tracks comprehensive statistics:

```typescript
const stats = fuelTank.stats;

// Operations
stats.totalPuts;         // Number of tanker deliveries
stats.totalGets;         // Number of trucks served
stats.totalAmountPut;    // Total fuel delivered
stats.totalAmountGot;    // Total fuel dispensed

// Wait times
stats.averagePutWaitTime;  // Average tanker wait
stats.averageGetWaitTime;  // Average truck wait

// Queue lengths (time-weighted)
stats.averagePutQueueLength;
stats.averageGetQueueLength;

// Inventory level (time-weighted)
stats.averageLevel;  // Average fuel in tank
```

## Experimentation Ideas

Try modifying the simulation to explore different scenarios:

### 1. Increase Demand

```typescript
const TRUCK_ARRIVAL_RATE = 12;  // 12 per hour instead of 8
```

**Expected:** More stockouts, longer wait times, lower average fuel level

### 2. Reduce Supply

```typescript
const TANKER_DELIVERY_INTERVAL = 8;  // Every 8 hours instead of 6
```

**Expected:** Increased risk of running out of fuel

### 3. Smaller Tank

```typescript
const TANK_CAPACITY = 5000;  // Half the original size
```

**Expected:** More frequent blocking for both trucks and tankers

### 4. Variable Deliveries

```typescript
const deliveryAmount = rng.uniform(3000, 7000);
yield fuelTank.put(deliveryAmount);
```

**Expected:** Stochastic inventory levels, more variability

### 5. Multiple Fuel Grades

Create separate buffers for different fuel types:

```typescript
const regularFuel = new Buffer(sim, 5000, { name: 'Regular' });
const premiumFuel = new Buffer(sim, 3000, { name: 'Premium' });
const dieselFuel = new Buffer(sim, 2000, { name: 'Diesel' });
```

## Buffer vs Resource

This example uses **Buffer** instead of **Resource** because:

| Aspect | Buffer | Resource |
|--------|--------|----------|
| Models | Quantities (fuel gallons) | Capacity units (servers) |
| Operations | `put(amount)`, `get(amount)` | `request()`, `release()` |
| State | Numeric level | In use / available |
| Example | Fuel, money, materials | Workers, machines, desks |

## Related Examples

- [Warehouse Store](/examples/warehouse-store) - Store resource for distinct items
- [Bank Tellers](/examples/bank-tellers) - Resource for discrete capacity
- [M/M/1 Queue](/examples/mm1-queue) - Basic queuing validation

## Learn More

- [Buffer API Reference](/api/buffer)
- [Resources Guide](/guide/resources)
- [Statistics Guide](/guide/statistics)
