---
layout: home

hero:
  name: discrete-sim
  text: Analyze complex systems through discrete event simulation.
  tagline: Built with TypeScript generators inspired by SimPy.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: GitHub
      link: https://github.com/anesask/discrete-sim

---

## Installation

::: code-group

```bash [npm]
npm install discrete-sim
```

```bash [yarn]
yarn add discrete-sim
```

```bash [pnpm]
pnpm add discrete-sim
```

```bash [bun]
bun add discrete-sim
```

:::

**Requirements:** Node.js 16+, TypeScript 5.0+ (recommended)

## Quick Example

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';

// Define a simple customer process
function* customer(id: number, server: Resource) {
  console.log(`Customer ${id} arrives at ${sim.now}`);

  // Request the server
  yield server.request();
  console.log(`Customer ${id} starts service at ${sim.now}`);

  // Service time
  yield* timeout(5);

  // Release the server
  server.release();
  console.log(`Customer ${id} leaves at ${sim.now}`);
}

// Create simulation
const sim = new Simulation();
const server = new Resource(sim, 1, { name: 'Server' });

// Start 3 customer processes
for (let i = 0; i < 3; i++) {
  sim.process(() => customer(i, server));
}

// Run simulation
sim.run();
```

## Features

- **Process-Based Modeling** - Use generator functions to describe processes naturally with intuitive yield syntax
- **Resource Management** - Built-in support for shared resources with FIFO queuing and automatic statistics tracking
- **Comprehensive Statistics** - Time-weighted averages, counters, and timeseries tracking for in-depth analysis
- **Reproducible Results** - Seedable random number generator for consistent experiments and validation
- **TypeScript Native** - Full type safety and excellent IDE support for robust simulation development
- **Zero Dependencies** - Lightweight and fast with no external dependencies

## Why `discrete-sim`?

Discrete event simulation is a powerful technique for modeling complex systems where state changes occur at discrete points in time. Whether you're modeling:

- **Queueing Systems** - Banks, call centers, service desks
- **Manufacturing** - Production lines, supply chains
- **Healthcare** - Hospital operations, patient flow
- **Logistics** - Warehouses, transportation networks
- **Computer Networks** - Data packet routing, server farms

`discrete-sim` provides the tools you need to build accurate, efficient simulations.