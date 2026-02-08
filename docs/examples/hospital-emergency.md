# Hospital Emergency Room

Advanced preemptive priority simulation demonstrating process interruption, PreemptionError handling, and critical care triage.

## Overview

This example simulates an emergency department where critical patients can **preempt** (interrupt) lower-priority patients who are currently being treated. This is the most advanced resource allocation pattern in discrete-sim.

## Key Features

- **Preemptive resource allocation** (critical patients interrupt lower-priority treatment)
- **Process interruption and recovery** (PreemptionError exception handling)
- **Multi-level priority system** (critical/urgent/standard)
- **Preemption statistics** tracking
- **Realistic emergency triage protocol**

## Parameters

```typescript
const SIMULATION_HOURS = 12;            // 12-hour shift
const CRITICAL_ARRIVAL_RATE = 2;        // critical patients per hour
const URGENT_ARRIVAL_RATE = 4;          // urgent patients per hour
const STANDARD_ARRIVAL_RATE = 6;        // standard patients per hour
const NUM_BEDS = 3;                     // Emergency beds

// Priority levels (triage system)
const PRIORITY_CRITICAL = 0;            // Life-threatening
const PRIORITY_URGENT = 5;              // Serious but stable
const PRIORITY_STANDARD = 10;           // Non-life-threatening

// Treatment times
const CRITICAL_TREATMENT_MEAN = 0.5;    // 30 minutes
const URGENT_TREATMENT_MEAN = 0.33;     // 20 minutes
const STANDARD_TREATMENT_MEAN = 0.25;   // 15 minutes
```

## Triage System

Patients are classified by severity:

| Severity | Priority | Can Preempt? | Can Be Preempted? |
|----------|----------|--------------|-------------------|
| Critical | 0 | Urgent, Standard | No |
| Urgent | 5 | Standard | By Critical |
| Standard | 10 | No | By Critical, Urgent |

**Lower priority number = higher priority**

## Preemptive Scheduling

When a **critical patient** arrives and all beds are occupied:
1. The **lowest-priority patient** currently in treatment is identified
2. That patient's treatment is **interrupted** (PreemptionError is raised)
3. The interrupted patient returns to the waiting queue
4. The critical patient takes the freed bed
5. The interrupted patient resumes treatment when a bed becomes available

## Implementation

### Patient Process with Preemption Handling

```typescript
function* patientProcess(
  id: number,
  severity: SeverityLevel,
  beds: Resource,
  stats: Statistics,
  rng: Random,
  sim: Simulation
) {
  const arrivalTime = sim.now;
  const priority = getPriority(severity);
  let treatmentCompleted = false;
  let timeRemaining = getTreatmentTime(severity, rng);
  let preemptionCount = 0;

  while (!treatmentCompleted) {
    // Request bed with priority (preemptive=true for critical)
    const preemptive = severity === 'critical';
    yield beds.request(priority, preemptive);

    const treatmentStartTime = sim.now;

    try {
      // Attempt treatment
      yield* timeout(timeRemaining);

      // Treatment completed successfully
      treatmentCompleted = true;
      stats.increment(`${severity}-completed`);

      if (preemptionCount > 0) {
        stats.increment('resumed-and-completed');
      }

    } catch (error) {
      // Patient was preempted!
      if (error instanceof PreemptionError) {
        beds.release();  // Release bed (already taken by higher priority)

        const timeInTreatment = sim.now - treatmentStartTime;
        timeRemaining -= timeInTreatment;  // Update remaining time

        preemptionCount++;
        stats.increment(`${severity}-preempted`);
        stats.recordValue('preemption-time-lost', timeInTreatment);

        // Patient goes back to waiting queue
        // Loop continues to request bed again
      } else {
        throw error;  // Re-throw if not PreemptionError
      }
    }
  }

  // Release bed when treatment complete
  beds.release();

  // Track total time in ED
  const totalTime = sim.now - arrivalTime;
  stats.recordValue(`${severity}-total-time`, totalTime);
}
```

### Multiple Arrival Processes

Each severity level has its own arrival process:

```typescript
// Critical arrivals
function* criticalArrivalProcess(beds, stats, rng, sim, until) {
  let id = 0;
  while (sim.now < until) {
    sim.process(() => patientProcess(id++, 'critical', beds, stats, rng, sim));
    yield* timeout(rng.exponential(1 / CRITICAL_ARRIVAL_RATE));
  }
}

// Urgent arrivals
function* urgentArrivalProcess(beds, stats, rng, sim, until) {
  let id = 0;
  while (sim.now < until) {
    sim.process(() => patientProcess(id++, 'urgent', beds, stats, rng, sim));
    yield* timeout(rng.exponential(1 / URGENT_ARRIVAL_RATE));
  }
}

// Standard arrivals (similar pattern)

// Start all three processes
sim.process(() => criticalArrivalProcess(beds, stats, rng, sim, SIMULATION_HOURS));
sim.process(() => urgentArrivalProcess(beds, stats, rng, sim, SIMULATION_HOURS));
sim.process(() => standardArrivalProcess(beds, stats, rng, sim, SIMULATION_HOURS));
```

## Statistics Tracked

| Metric | Description |
|--------|-------------|
| `critical-completed` | Critical patients treated |
| `urgent-completed` | Urgent patients treated |
| `standard-completed` | Standard patients treated |
| `critical-preempted` | Times critical was preempted (should be 0) |
| `urgent-preempted` | Times urgent was preempted |
| `standard-preempted` | Times standard was preempted |
| `preemption-time-lost` | Treatment time lost due to interruption |
| `resumed-and-completed` | Patients who were interrupted but later finished |

## Sample Results

```
Simulation Results
============================================================

Patient Summary:
  Critical: 22 patients (18.5%)
  Urgent: 45 patients (37.8%)
  Standard: 52 patients (43.7%)
  Total: 119 patients

Preemption Statistics:
  Critical preemptions: 0 (never preempted)
  Urgent preemptions: 8 (17.8% of urgent)
  Standard preemptions: 34 (65.4% of standard)
  Total preemption events: 42

  Patients resumed and completed: 38 (90.5%)
  Average time lost per preemption: 0.12 hours (7.2 min)

Average Time in ED:
  Critical: 0.52 hours (31.2 min) [includes wait + treatment]
  Urgent: 1.23 hours (73.8 min)
  Standard: 2.45 hours (147 min)

Bed Utilization: 78.3%

Performance Assessment
============================================================

Critical Care Excellence:
  [OK] Critical patients never preempted
  [OK] Average critical time: 31.2 min (target: <45 min)

Preemption Impact:
  [WARNING] 65.4% of standard patients were preempted
  [INFO] Standard patients wait 2.45 hours average
  Consider: Add 1 bed to reduce standard patient delays
```

## What You'll Learn

1. **Preemptive Scheduling**: Using `request(priority, preemptive=true)`
2. **Exception Handling**: Catching and handling `PreemptionError`
3. **Process Recovery**: Resuming interrupted processes with remaining time
4. **Multi-Level Priorities**: Coordinating three priority levels
5. **Critical Care Modeling**: Realistic emergency department triage

## Key Insights

**Preemption vs. Priority**:
- **Priority queuing** (Bank Express Lane): High priority served first when resource becomes available
- **Preemptive scheduling** (Hospital ER): High priority can interrupt ongoing low-priority service

**Tracking Remaining Time**: When preempted, calculate remaining treatment time and resume from that point.

**Preemption Overhead**: Each preemption adds delay. Too many preemptions indicate understaffing.

## Preemption Algorithm

When `request(priority, preemptive=true)` is called:

1. If resource available → grant immediately
2. If resource full and `preemptive=true`:
   - Find lowest-priority user currently holding resource
   - If requester priority < holder priority:
     - Interrupt holder (raise `PreemptionError` in their process)
     - Grant resource to requester

## Variations to Try

1. **Four Priority Levels**: Add "Resuscitation" priority above critical
2. **Time-Based Priority Boost**: Increase priority for patients waiting too long
3. **Resource Pools**: Different bed types (trauma vs. general)
4. **Partial Preemption**: Allow finishing within X minutes before preemption
5. **Staffing Levels**: Model nurse/doctor availability separately from beds

## Common Pitfalls

**Forgetting to Release**: Must call `beds.release()` inside the `catch` block when preempted.

**Not Tracking Remaining Time**: If you don't update `timeRemaining`, patient restarts from beginning.

**Infinite Loops**: Without the `treatmentCompleted` flag, process loops forever.

**Wrong Priority Direction**: Remember: LOWER number = HIGHER priority.

## Running the Example

From the discrete-sim repository:

```bash
npx tsx examples/hospital-emergency/index.ts
```

Or import in your code:

```typescript
import { runSimulation } from 'discrete-sim/examples/hospital-emergency';

const results = runSimulation();
console.log(results.preemptions);
```

## Related Topics

- [Bank Express Lane](/examples/bank-express-lane) - Non-preemptive priority
- [Resources](/guide/resources) - Preemptive resource documentation
- [Error Handling](/guide/errors) - PreemptionError details
- [Processes](/guide/processes) - Process interruption and recovery

## Reference

Full source code: [examples/hospital-emergency/index.ts](https://github.com/anesask/discrete-sim/blob/main/examples/hospital-emergency/index.ts)
