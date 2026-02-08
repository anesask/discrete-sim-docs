# Introduction

## What is `discrete-sim`?

`discrete-sim` is a TypeScript library for building discrete event simulations using generator functions. Inspired by Python's SimPy, it provides an intuitive way to model systems where state changes occur at specific points in time.

## What is Discrete Event Simulation?

Discrete Event Simulation (DES) is a method of simulating the behavior and performance of real-world processes, facilities, or systems. In DES:

- The system state changes only at discrete points in time (events)
- Events are scheduled and processed in chronological order
- Time can "jump" between events (no need to simulate idle periods)

This makes DES particularly efficient for modeling systems with:
- Queues and waiting lines
- Resource allocation and scheduling
- Process workflows
- Network communications

## Core Concepts

### Processes

Processes are generator functions that describe entity behavior over time:

```typescript
function* customer(id: number, server: Resource) {
  console.log(`Customer ${id} arrives at ${sim.now}`);

  yield server.request();  // Wait for resource
  yield* timeout(5);       // Service for 5 time units
  server.release();

  console.log(`Customer ${id} leaves at ${sim.now}`);
}
```

### Resources

Resources represent limited-capacity entities that processes compete for:

```typescript
const server = new Resource(sim, 2, { name: 'Server' });

// In a process
yield server.request();  // Acquire resource
yield* timeout(10);      // Use it
server.release();        // Release it
```

Resources automatically track utilization, wait times, and queue length.

### Events & Scheduling

Schedule events at specific simulation times:

```typescript
sim.schedule(10, () => console.log('Event at time 10'));
sim.run(100);  // Run until time 100
```

### Statistics

Collect and analyze simulation data:

```typescript
const stats = new Statistics(sim);

stats.recordValue('wait-time', waitTime);
stats.increment('customers-served');

console.log(stats.getAverage('wait-time'));
```

## When to Use `discrete-sim`

Perfect for modeling:

- **Queueing Systems** - Banks, call centers, service operations
- **Manufacturing** - Production lines, inventory management
- **Healthcare** - Patient flow, resource allocation
- **Logistics** - Warehouse operations, delivery networks
- **Research** - Algorithm validation, performance studies

## Next Steps

- **[Installation](./installation)** - Set up `discrete-sim` in your project
- **[Quick Start](./quick-start)** - Build your first simulation
- **[API Reference](/api/)** - Complete API documentation
- **[Examples](/examples/)** - Real-world simulation examples