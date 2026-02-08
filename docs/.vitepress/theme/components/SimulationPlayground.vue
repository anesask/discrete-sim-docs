<template>
  <div class="simulation-playground">
    <div class="controls">
      <button @click="runSimulation" :disabled="isRunning" class="run-button">
        {{ isRunning ? 'Running...' : 'Run Simulation' }}
      </button>
      <button @click="resetSimulation" :disabled="isRunning" class="reset-button">
        Reset
      </button>
      <div class="speed-control">
        <label>Speed: </label>
        <input
          type="range"
          v-model="speed"
          min="1"
          max="100"
          :disabled="isRunning"
        />
        <span>{{ speed }}x</span>
      </div>
    </div>

    <div class="stats-display" v-if="stats">
      <div class="stat-item">
        <span class="stat-label">Simulation Time:</span>
        <span class="stat-value">{{ stats.time.toFixed(2) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Customers Served:</span>
        <span class="stat-value">{{ stats.served }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg Wait Time:</span>
        <span class="stat-value">{{ stats.avgWait.toFixed(2) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Utilization:</span>
        <span class="stat-value">{{ (stats.utilization * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="charts-container">
      <div class="chart-wrapper">
        <h3>Queue Length Over Time</h3>
        <v-chart class="chart" :option="queueChartOption" autoresize />
      </div>

      <div class="chart-wrapper">
        <h3>Server Utilization Over Time</h3>
        <v-chart class="chart" :option="utilizationChartOption" autoresize />
      </div>

      <div class="chart-wrapper">
        <h3>Wait Time Distribution</h3>
        <v-chart class="chart" :option="waitTimeChartOption" autoresize />
      </div>
    </div>

    <div class="console-output">
      <h3>Simulation Log</h3>
      <div class="console-content" ref="consoleContent">
        <div v-for="(log, index) in logs" :key="index" class="log-entry">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
]);

const props = defineProps({
  example: {
    type: String,
    required: true
  }
});

const isRunning = ref(false);
const speed = ref(10);
const logs = ref([]);
const consoleContent = ref(null);

// Data for charts
const queueData = ref([]);
const utilizationData = ref([]);
const waitTimes = ref([]);
const timeData = ref([]);

const stats = ref(null);

// Chart options
const queueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: timeData.value,
    name: 'Time'
  },
  yAxis: {
    type: 'value',
    name: 'Queue Length'
  },
  series: [
    {
      data: queueData.value,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#5f9598'
      },
      areaStyle: {
        color: 'rgba(95, 149, 152, 0.3)'
      }
    }
  ],
  grid: {
    left: '10%',
    right: '5%',
    bottom: '15%'
  }
}));

const utilizationChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const value = params[0].value;
      return `Time: ${params[0].axisValue}<br/>Utilization: ${(value * 100).toFixed(1)}%`;
    }
  },
  xAxis: {
    type: 'category',
    data: timeData.value,
    name: 'Time'
  },
  yAxis: {
    type: 'value',
    name: 'Utilization',
    max: 1,
    axisLabel: {
      formatter: (value) => (value * 100).toFixed(0) + '%'
    }
  },
  series: [
    {
      data: utilizationData.value,
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#1d546d'
      },
      areaStyle: {
        color: 'rgba(29, 84, 109, 0.3)'
      }
    }
  ],
  grid: {
    left: '10%',
    right: '5%',
    bottom: '15%'
  }
}));

const waitTimeChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  xAxis: {
    type: 'category',
    data: ['0-5', '5-10', '10-15', '15-20', '20+'],
    name: 'Wait Time (minutes)'
  },
  yAxis: {
    type: 'value',
    name: 'Customers'
  },
  series: [
    {
      data: computeWaitTimeBuckets(),
      type: 'bar',
      itemStyle: {
        color: '#5f9598'
      }
    }
  ],
  grid: {
    left: '10%',
    right: '5%',
    bottom: '15%'
  }
}));

function computeWaitTimeBuckets() {
  const buckets = [0, 0, 0, 0, 0]; // 0-5, 5-10, 10-15, 15-20, 20+

  waitTimes.value.forEach(time => {
    if (time < 5) buckets[0]++;
    else if (time < 10) buckets[1]++;
    else if (time < 15) buckets[2]++;
    else if (time < 20) buckets[3]++;
    else buckets[4]++;
  });

  return buckets;
}

function addLog(message) {
  logs.value.push(message);
  nextTick(() => {
    if (consoleContent.value) {
      consoleContent.value.scrollTop = consoleContent.value.scrollHeight;
    }
  });
}

function resetSimulation() {
  queueData.value = [];
  utilizationData.value = [];
  waitTimes.value = [];
  timeData.value = [];
  logs.value = [];
  stats.value = null;
}

async function runSimulation() {
  isRunning.value = true;
  resetSimulation();

  try {
    // Dynamically import discrete-sim
    const { Simulation, Resource, Random, timeout } = await import('discrete-sim');

    addLog('Starting simulation...');

    const sim = new Simulation();
    const rng = new Random(42);
    const server = new Resource(sim, 2, { name: 'Server' });

    const arrivals = [];

    function* customer(id, server) {
      const arrival = sim.now;
      arrivals.push(arrival);
      addLog(`[${sim.now.toFixed(2)}] Customer ${id} arrived`);

      yield server.request();

      const wait = sim.now - arrival;
      waitTimes.value.push(wait);
      addLog(`[${sim.now.toFixed(2)}] Customer ${id} waited ${wait.toFixed(2)}, starting service`);

      const serviceTime = rng.uniform(3, 7);
      yield* timeout(serviceTime);

      server.release();
      addLog(`[${sim.now.toFixed(2)}] Customer ${id} departed`);
    }

    function* arrivalProcess() {
      let id = 0;
      while (sim.now < 100) {
        sim.process(() => customer(id++, server));
        yield* timeout(rng.exponential(5));
      }
    }

    function* monitor() {
      while (sim.now < 100) {
        timeData.value.push(sim.now.toFixed(1));
        queueData.value.push(server.queueLength);
        utilizationData.value.push(server.inUse / server.capacity);

        yield* timeout(1);
      }
    }

    sim.process(arrivalProcess);
    sim.process(monitor);

    // Run simulation with animation
    const runWithAnimation = async () => {
      let lastTime = 0;
      while (sim.now < 100) {
        sim.run(sim.now + 1);

        if (sim.now > lastTime + 5) {
          await new Promise(resolve => setTimeout(resolve, 100 / speed.value));
          lastTime = sim.now;
        }
      }
    };

    await runWithAnimation();

    // Final statistics
    stats.value = {
      time: sim.now,
      served: waitTimes.value.length,
      avgWait: waitTimes.value.length > 0
        ? waitTimes.value.reduce((a, b) => a + b, 0) / waitTimes.value.length
        : 0,
      utilization: sim.statistics.getAverage('Server:utilization') || 0
    };

    addLog('Simulation complete!');
    addLog(`Total customers served: ${stats.value.served}`);
    addLog(`Average wait time: ${stats.value.avgWait.toFixed(2)} minutes`);
    addLog(`Server utilization: ${(stats.value.utilization * 100).toFixed(1)}%`);

  } catch (error) {
    addLog(`Error: ${error.message}`);
    console.error(error);
  } finally {
    isRunning.value = false;
  }
}
</script>

<style scoped>
.simulation-playground {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.run-button,
.reset-button {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.run-button {
  background-color: var(--vp-c-brand-1);
  color: white;
}

.run-button:hover:not(:disabled) {
  background-color: var(--vp-c-brand-2);
  transform: translateY(-2px);
}

.run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-button {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.reset-button:hover:not(:disabled) {
  background-color: var(--vp-c-bg-soft);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.speed-control label {
  font-weight: 500;
}

.speed-control input[type="range"] {
  width: 150px;
}

.stats-display {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.chart-wrapper {
  background: var(--vp-c-bg);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}

.chart-wrapper h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.chart {
  height: 300px;
  width: 100%;
}

.console-output {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 1rem;
}

.console-output h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.console-content {
  background: var(--vp-code-block-bg);
  color: var(--vp-code-block-color);
  padding: 1rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  margin: 0.25rem 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .speed-control {
    margin-left: 0;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
