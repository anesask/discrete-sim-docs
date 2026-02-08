# Installation

## Prerequisites

Before installing Discrete-Sim, ensure you have:

- **Node.js** version 16.0 or higher
- **npm** or **yarn** package manager
- **TypeScript** 5.0+ (recommended for type safety)

## Package Installation

### Using npm

```bash
npm install discrete-sim
```

### Using yarn

```bash
yarn add discrete-sim
```

### Using pnpm

```bash
pnpm add discrete-sim
```

## Import Methods

### ES Modules (Recommended)

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';
```

### CommonJS

```javascript
const { Simulation, Resource, timeout } = require('discrete-sim');
```

## TypeScript Support

Discrete-Sim is written in TypeScript and includes type definitions out of the box. No additional `@types` package is needed.

```typescript
import { Simulation, Resource, timeout } from 'discrete-sim';

const sim: Simulation = new Simulation();
const server: Resource = new Resource(sim, 1);
```

### TypeScript Configuration

For optimal TypeScript support, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "module": "ESNext"
  }
}
```

## Development Setup

If you want to contribute or modify Discrete-Sim:

### 1. Clone the repository

```bash
git clone https://github.com/anesask/discrete-sim.git
cd discrete-sim
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the library

```bash
npm run build
```

### 4. Run tests

```bash
npm test
```

### 5. Link for local development

```bash
npm link

# In your project
npm link discrete-sim
```

## Bundler Configuration

### Webpack

No special configuration needed. Discrete-Sim works out of the box with Webpack 5.

```javascript
// webpack.config.js
module.exports = {
  // Your configuration
};
```

### Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // Discrete-Sim works without any special config
});
```

### Rollup

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/main.js',
  plugins: [
    resolve(),
    commonjs()
  ],
  // Your configuration
};
```

## Verifying Installation

After installation, verify everything is working:

```typescript
import { Simulation } from 'discrete-sim';

const sim = new Simulation();
console.log('Simulation created:', sim);
console.log('Current time:', sim.now); // Should output: 0
```

## Package Structure

After installation, the package structure includes:

```
node_modules/discrete-sim/
├── dist/
│   ├── index.js         # CommonJS build
│   ├── index.mjs        # ES modules build
│   └── index.d.ts       # TypeScript definitions
├── package.json
├── README.md
└── LICENSE
```

## Environment Support

Discrete-Sim is designed for Node.js environments:

- Node.js 16+ (required)
- TypeScript 5.0+ (recommended)
- Works with any Node.js-compatible environment (Electron, etc.)

## Next Steps

Now that you have Discrete-Sim installed, proceed to:

- [Quick Start](./quick-start) - Build your first simulation
- [Core Concepts](./processes) - Understand the fundamental concepts
- [API Reference](/api/) - Explore the complete API