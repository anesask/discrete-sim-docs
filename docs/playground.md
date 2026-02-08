# Interactive Playground

Experience discrete event simulation in real-time with our interactive playground!

## Coffee Shop Queue Simulation

Watch a coffee shop in action - customers arrive, wait in line, get their coffee from the barista, and leave. This is a real-world example of an **M/M/1 queue** system.

<ClientOnly>
  <CoffeeShopPlayground />
</ClientOnly>

## What You're Seeing

This simulation demonstrates the core concepts of discrete event simulation:

### The Model (M/M/1 Queue)
- **First M**: Markovian (random exponential) customer arrivals
- **Second M**: Markovian (random) service times
- **1**: Single server (one barista)

### Key Metrics
- **Queue Length**: How many customers are waiting
- **Wait Time**: How long customers wait before being served
- **Utilization**: Percentage of time the barista is busy
- **Throughput**: Number of customers served over time

### What Makes It Realistic
- Customers arrive at random intervals (not evenly spaced)
- Service times vary (some orders take longer than others)
- Queue builds up during busy periods
- Different types of coffee orders (Espresso, Latte, Cappuccino, etc.)
- Visual representation matches a real coffee shop

## Understanding the Results

After running the simulation, look at:

1. **Average Wait Time**: Lower is better for customer satisfaction
2. **Utilization**:
   - Too high (>90%): Long queues, consider adding another barista
   - Too low (<50%): Barista is often idle, may be overstaffed
3. **Queue Length**: Shows how congestion builds and clears

## Try Different Scenarios

You can modify the simulation by editing the component to test:
- What happens with more customers arriving?
- What if service is faster/slower?
- How does adding a second barista help?

## Learn More

This playground uses the actual [discrete-sim](https://www.npmjs.com/package/discrete-sim) library. Check out the [examples](/examples/) to see the code behind this and other simulations.
