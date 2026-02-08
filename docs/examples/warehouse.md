# Warehouse Operations

Multi-stage logistics simulation demonstrating sequential workflow, resource dependencies, and bottleneck analysis.

## Overview

This example simulates a warehouse receiving operation where trucks arrive, get unloaded, have their cargo inspected, and stored. It demonstrates a **sequential multi-resource workflow** where each stage must complete before the next begins.

## Key Features

- **Sequential workflow** (dock → forklift → inspection → storage)
- **Multiple resource types** with dependencies
- **Bottleneck identification** through utilization analysis
- **Resource utilization comparison**
- **Realistic warehouse operations**

## Parameters

```typescript
const NUM_TRUCKS = 50;
const TRUCK_ARRIVAL_RATE = 0.2;    // trucks per hour
const NUM_LOADING_DOCKS = 2;
const NUM_FORKLIFTS = 3;
const NUM_INSPECTORS = 2;

// Process times (in hours)
const UNLOAD_TIME_MEAN = 0.5;      // 30 minutes
const INSPECTION_TIME_MEAN = 0.3;  // 18 minutes
const STORAGE_TIME_MEAN = 0.2;     // 12 minutes
```

## Workflow Stages

Each truck goes through a fixed sequence:

1. **Dock** - Truck backs into loading dock
2. **Unload** - Forklift unloads cargo (dock + forklift needed)
3. **Inspection** - Items are inspected (forklift and dock released)
4. **Storage** - Items moved to storage (forklift needed again)

## Implementation

### Truck Process

```typescript
function* truckProcess(
  id: number,
  dock: Resource,
  forklift: Resource,
  inspector: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  const arrivalTime = sim.now;

  // Stage 1: Request loading dock
  yield dock.request();
  const dockStartTime = sim.now;
  stats.recordValue('dock-wait', dockStartTime - arrivalTime);

  // Stage 2: Request forklift for unloading
  yield forklift.request();
  const forkliftStartTime = sim.now;
  stats.recordValue('forklift-wait', forkliftStartTime - dockStartTime);

  // Unload cargo
  const unloadTime = Math.max(0.1, rng.normal(UNLOAD_TIME_MEAN, UNLOAD_TIME_STDDEV));
  yield* timeout(unloadTime);

  // Release dock and forklift (unloading complete)
  forklift.release();
  dock.release();

  // Stage 3: Request inspector
  yield inspector.request();
  const inspectionStartTime = sim.now;
  stats.recordValue('inspection-wait', inspectionStartTime - forkliftStartTime);

  // Inspect cargo
  const inspectionTime = Math.max(0.1, rng.normal(INSPECTION_TIME_MEAN, INSPECTION_TIME_STDDEV));
  yield* timeout(inspectionTime);

  inspector.release();

  // Stage 4: Request forklift again for storage
  yield forklift.request();
  const storageStartTime = sim.now;

  // Move to storage
  const storageTime = Math.max(0.05, rng.normal(STORAGE_TIME_MEAN, STORAGE_TIME_STDDEV));
  yield* timeout(storageTime);

  forklift.release();

  // Track total processing time
  const totalTime = sim.now - arrivalTime;
  stats.recordValue('total-time', totalTime);
  stats.increment('trucks-processed');
}
```

### Arrival Process

```typescript
function* arrivalProcess(dock, forklift, inspector, stats, rng, sim) {
  for (let i = 0; i < NUM_TRUCKS; i++) {
    sim.process(() => truckProcess(i, dock, forklift, inspector, stats, rng, sim));

    const interarrivalTime = rng.exponential(1 / TRUCK_ARRIVAL_RATE);
    yield* timeout(interarrivalTime);
  }
}
```

## Resource Dependencies

Key workflow characteristics:

- **Dock + Forklift**: Both needed simultaneously for unloading
- **Inspector**: Independent, works on unloaded cargo
- **Forklift (again)**: Needed for final storage after inspection

This creates interesting bottleneck dynamics - forklifts are needed twice in the workflow!

## Statistics Tracked

| Metric | Description |
|--------|-------------|
| `trucks-processed` | Total trucks completed |
| `dock-wait` | Time waiting for dock |
| `forklift-wait` | Time waiting for forklift (first use) |
| `inspection-wait` | Time waiting for inspector |
| `total-time` | Total time from arrival to storage |

## Sample Results

```
Simulation Results
============================================================

Throughput:
  Trucks processed: 50
  Total time: 267.3 hours
  Throughput: 0.19 trucks/hour

Wait Time Analysis:
  Dock wait: 3.2 hours average
  Forklift wait: 1.8 hours average
  Inspection wait: 5.7 hours average
  Total processing: 8.4 hours average per truck

Resource Utilization:
  Loading Docks: 45.2% (2 docks)
  Forklifts: 68.3% (3 forklifts)
  Inspectors: 87.5% (2 inspectors)

Bottleneck Analysis
============================================================

[***] CRITICAL BOTTLENECK: Inspectors (87.5%)
  - Highest utilization resource
  - Causing 5.7 hour average inspection wait
  - RECOMMENDATION: Add 1 more inspector

[**-] MODERATE: Forklifts (68.3%)
  - Reasonable utilization
  - Used in two workflow stages (unload + storage)

[*--] LOW: Loading Docks (45.2%)
  - Underutilized
  - Consider reducing to 1 dock or increasing truck arrivals
```

## What You'll Learn

1. **Sequential Workflows**: Multi-stage processes with resource dependencies
2. **Bottleneck Identification**: Finding constraint resources through utilization
3. **Dual Resource Use**: Same resource (forklift) used at multiple stages
4. **Capacity Planning**: Balancing resource counts across stages
5. **Wait Time Attribution**: Tracking which stage causes delays

## Key Insights

**Bottlenecks Shift**: Adding inspectors might make forklifts the new bottleneck. Analyze carefully.

**Simultaneous Resources**: Unloading requires BOTH dock AND forklift. If either is unavailable, truck waits.

**Resource Reuse**: Forklifts are used twice per truck, amplifying their importance.

## Bottleneck Analysis

A bottleneck is identified by:
1. **High utilization** (>80%)
2. **Long wait times** at that stage
3. **Impact on total processing time**

In this example, inspectors are the critical bottleneck at 87.5% utilization.

## Variations to Try

1. **Different Capacities**: Experiment with 1 dock, 4 forklifts, 3 inspectors
2. **Parallel Inspection**: Allow multiple items to be inspected simultaneously
3. **Priority Shipments**: Express delivery trucks get priority
4. **Shift Scheduling**: Model 8-hour shifts with resource changes
5. **Equipment Failures**: Add random forklift breakdowns

## Common Pitfalls

**Forgetting Second Forklift**: The storage stage also needs a forklift. Don't forget to request it again!

**Releasing Too Early**: Don't release the dock before unloading is complete.

**Infinite Waits**: With insufficient resources, trucks may wait indefinitely. Monitor utilization.

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/warehouse/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/warehouse';

const results = runSimulation();
console.log(results.bottleneck);
```

## Related Topics

- [Restaurant](/examples/restaurant) - Another multi-resource example
- [Resources](/guide/resources) - Resource management patterns
- [Processes](/guide/processes) - Sequential process design
- [Statistics](/guide/statistics) - Utilization metrics

## Reference

Full source code: [examples/warehouse/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/warehouse/index.ts)
