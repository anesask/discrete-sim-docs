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

<p style="margin: 20px 0;">
  <a href="https://www.npmjs.com/package/discrete-sim"><img src="https://img.shields.io/npm/v/discrete-sim?color=blue&label=version" alt="npm version" style="display: inline-block; margin: 4px;"></a>
  <a href="https://www.npmjs.com/package/discrete-sim"><img src="https://img.shields.io/npm/dm/discrete-sim" alt="npm downloads" style="display: inline-block; margin: 4px;"></a>
  <a href="https://github.com/anesask/discrete-sim/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/discrete-sim" alt="license" style="display: inline-block; margin: 4px;"></a>
  <a href="https://github.com/anesask/discrete-sim"><img src="https://img.shields.io/github/stars/anesask/discrete-sim?style=social" alt="GitHub stars" style="display: inline-block; margin: 4px;"></a>
  <a href="https://www.npmjs.com/package/discrete-sim"><img src="https://img.shields.io/badge/TypeScript-5.3+-blue" alt="TypeScript" style="display: inline-block; margin: 4px;"></a>
  <a href="https://www.npmjs.com/package/discrete-sim"><img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies" style="display: inline-block; margin: 4px;"></a>
</p>

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
- **Resource Management** - Built-in support for shared resources (Resources, Buffers, Stores) with FIFO queuing and automatic statistics tracking
- **Buffer Resources** - Model homogeneous quantities like fuel, money, or raw materials with put/get operations
- **Store Resources** - Manage collections of distinct objects with FIFO or filter-based retrieval
- **Advanced Statistics** - Time-weighted averages, percentiles (P50, P95, P99), histograms, standard deviation, and comprehensive metrics
- **Warm-up Periods** - Exclude initial transient behavior from statistical analysis for accurate steady-state results
- **Event Tracing** - Detailed event execution logging for debugging and analysis
- **Rich Random Distributions** - Exponential, normal, uniform, triangular, Poisson, and more with seedable RNG
- **Reproducible Results** - Seedable random number generator for consistent experiments and validation
- **TypeScript Native** - Full type safety and excellent IDE support for robust simulation development
- **Zero Dependencies** - Lightweight and fast with no external dependencies
- **Performance Optimized** - O(log n) priority queuing, cached statistics, and efficient algorithms

## Why `discrete-sim`?

Discrete event simulation is a powerful technique for modeling complex systems where state changes occur at discrete points in time. Whether you're modeling:

- **Queueing Systems** - Banks, call centers, service desks
- **Manufacturing** - Production lines, supply chains
- **Healthcare** - Hospital operations, patient flow
- **Logistics** - Warehouses, transportation networks
- **Computer Networks** - Data packet routing, server farms

`discrete-sim` provides the tools you need to build accurate, efficient simulations.