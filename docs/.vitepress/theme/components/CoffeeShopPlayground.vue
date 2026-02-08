<template>
  <div class="playground">
    <!-- Simple Controls -->
    <div class="controls">
      <button @click="runSimulation" :disabled="isRunning" class="btn-primary">
        {{ isRunning ? 'Running...' : 'Start' }}
      </button>
      <button @click="resetSimulation" :disabled="isRunning" class="btn-secondary">
        Reset
      </button>
      <div class="speed">
        <label>Speed: {{ speed }}x</label>
        <input type="range" v-model="speed" min="1" max="30" :disabled="isRunning" />
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid">
      <!-- Visual -->
      <div class="visual">
        <div class="scene">
          <div class="zone">
            <strong>Entrance</strong>
            <div v-if="nextArrival" class="info">Next: {{ nextArrival.toFixed(1) }}s</div>
          </div>

          <div class="zone">
            <strong>Queue ({{ queueLength }})</strong>
            <div class="queue">
              <div v-for="c in waitingCustomers.slice(0, 5)" :key="c.id" class="item">
                {{ c.emoji }} #{{ c.id }} <span class="muted">{{ c.waitTime.toFixed(1) }}s</span>
              </div>
              <div v-if="waitingCustomers.length === 0" class="empty">Empty</div>
            </div>
          </div>

          <div class="zone">
            <strong>Barista</strong>
            <div class="barista" :class="{ busy: isBusy }">
              <div v-if="servingCustomer">
                👨‍🍳 {{ servingCustomer.emoji }} #{{ servingCustomer.id }}
                <div class="order">{{ servingCustomer.order }}</div>
                <div class="progress-bar">
                  <div class="bar" :style="{ width: servingCustomer.progress + '%' }"></div>
                </div>
              </div>
              <div v-else class="idle">👨‍🍳 Idle</div>
            </div>
          </div>

          <div class="zone">
            <strong>Served ({{ totalServed }})</strong>
            <div v-for="c in recentServed" :key="c.id" class="served">
              {{ c.emoji }} #{{ c.id }}
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats">
          <div class="stat">
            <div class="label">Time</div>
            <div class="value">{{ currentTime.toFixed(1) }}s</div>
          </div>
          <div class="stat">
            <div class="label">Served</div>
            <div class="value">{{ totalServed }}</div>
          </div>
          <div class="stat">
            <div class="label">Avg Wait</div>
            <div class="value">{{ avgWait.toFixed(1) }}s</div>
          </div>
          <div class="stat">
            <div class="label">Queue</div>
            <div class="value">{{ queueLength }}</div>
          </div>
          <div class="stat">
            <div class="label">Utilization</div>
            <div class="value">{{ (utilization * 100).toFixed(0) }}%</div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts">
        <div class="chart-box">
          <h4>Queue Length</h4>
          <v-chart class="chart" :option="queueChart" />
        </div>
        <div class="chart-box">
          <h4>Utilization</h4>
          <v-chart class="chart" :option="utilChart" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, GridComponent]);

const isRunning = ref(false);
const speed = ref(15);
const currentTime = ref(0);
const totalServed = ref(0);
const queueLength = ref(0);
const avgWait = ref(0);
const utilization = ref(0);
const nextArrival = ref(null);
const isBusy = ref(false);

const waitingCustomers = ref([]);
const servingCustomer = ref(null);
const recentServed = ref([]);

const queueData = ref([]);
const utilData = ref([]);
const timeData = ref([]);
const waitTimes = ref([]);

const EMOJIS = ['🧑', '👨', '👩', '🧔', '👱'];
const ORDERS = ['Espresso', 'Latte', 'Cappuccino'];

function resetSimulation() {
  isRunning.value = false;
  currentTime.value = 0;
  totalServed.value = 0;
  queueLength.value = 0;
  avgWait.value = 0;
  utilization.value = 0;
  nextArrival.value = null;
  isBusy.value = false;
  waitingCustomers.value = [];
  servingCustomer.value = null;
  recentServed.value = [];
  queueData.value = [];
  utilData.value = [];
  timeData.value = [];
  waitTimes.value = [];
}

const queueChart = computed(() => ({
  xAxis: { type: 'category', data: timeData.value },
  yAxis: { type: 'value' },
  series: [{
    data: queueData.value,
    type: 'line',
    smooth: true,
    lineStyle: { color: 'var(--vp-c-brand-1)' },
    areaStyle: { color: 'var(--vp-c-brand-soft)' }
  }],
  grid: { left: 40, right: 10, top: 10, bottom: 30 }
}));

const utilChart = computed(() => ({
  xAxis: { type: 'category', data: timeData.value },
  yAxis: { type: 'value', max: 1 },
  series: [{
    data: utilData.value,
    type: 'line',
    smooth: true,
    lineStyle: { color: 'var(--vp-c-brand-1)' },
    areaStyle: { color: 'var(--vp-c-brand-soft)' }
  }],
  grid: { left: 40, right: 10, top: 10, bottom: 30 }
}));

async function runSimulation() {
  console.log('🚀 Button clicked - starting simulation');
  resetSimulation();
  isRunning.value = true;

  console.log('📦 Importing discrete-sim...');
  const { Simulation, Resource, Random, timeout } = await import('discrete-sim');
  console.log('✅ discrete-sim imported');

  const sim = new Simulation();
  const rng = new Random(123);
  const barista = new Resource(sim, 1, { name: 'Barista' });
  console.log('✅ Simulation objects created');

    function* customerProcess(id) {
      const arrivalTime = sim.now;
      const emoji = EMOJIS[rng.randint(0, EMOJIS.length - 1)];
      const order = ORDERS[rng.randint(0, ORDERS.length - 1)];

      const cust = { id, emoji, order, arrivalTime, waitTime: 0 };
      waitingCustomers.value.push(cust);
      queueLength.value = barista.queueLength + 1;

      yield barista.request();

      const idx = waitingCustomers.value.findIndex(c => c.id === id);
      if (idx !== -1) waitingCustomers.value.splice(idx, 1);
      queueLength.value = barista.queueLength;

      const waitTime = sim.now - arrivalTime;
      waitTimes.value.push(waitTime);

      isBusy.value = true;
      const serviceTime = rng.uniform(2, 5);
      servingCustomer.value = {
        id, emoji, order,
        remaining: serviceTime,
        total: serviceTime,
        progress: 0
      };

      yield* timeout(serviceTime);

      barista.release();
      isBusy.value = false;
      servingCustomer.value = null;
      totalServed.value++;

      recentServed.value.push({ id, emoji });
      if (recentServed.value.length > 3) recentServed.value.shift();
    }

    function* arrivalProcess() {
      let id = 0;
      while (sim.now < 60) {
        const interarrival = rng.exponential(1 / 0.5);
        nextArrival.value = sim.now + interarrival;
        sim.process(() => customerProcess(id++));
        yield* timeout(interarrival);
      }
      nextArrival.value = null;
    }

    function* monitorProcess() {
      while (sim.now < 60) {
        timeData.value.push(sim.now.toFixed(1));
        queueData.value.push(barista.queueLength);
        utilData.value.push(barista.inUse / barista.capacity);

        waitingCustomers.value.forEach(c => {
          c.waitTime = sim.now - c.arrivalTime;
        });

        if (servingCustomer.value) {
          servingCustomer.value.remaining = Math.max(0, servingCustomer.value.remaining - 0.1);
          servingCustomer.value.progress = ((servingCustomer.value.total - servingCustomer.value.remaining) / servingCustomer.value.total) * 100;
        }

        yield* timeout(0.1);
      }
    }

    sim.process(arrivalProcess);
    sim.process(monitorProcess);

    console.log('🎬 Starting animation loop...');

    // Run simulation step by step with visual updates
    let currentStep = 0.1;
    const totalSteps = 60;

    const animateStep = () => {
      if (!isRunning.value || currentStep > totalSteps) {
        console.log('✅ Simulation complete!');
        isRunning.value = false;
        return;
      }

      try {
        sim.run(currentStep);
        currentTime.value = sim.now;

        if (waitTimes.value.length > 0) {
          avgWait.value = waitTimes.value.reduce((a, b) => a + b, 0) / waitTimes.value.length;
        }

        // Get utilization safely
        try {
          const util = sim.statistics.getAverage('Barista:utilization');
          utilization.value = util || 0;
        } catch (e) {
          utilization.value = barista.inUse / barista.capacity;
        }

        // Log every second
        if (Math.abs(currentStep - Math.round(currentStep)) < 0.05) {
          console.log(`⏱️ Time: ${currentStep.toFixed(1)}s, Queue: ${queueLength.value}, Served: ${totalServed.value}`);
        }

        currentStep += 0.1;
        setTimeout(animateStep, 1000 / speed.value);
      } catch (error) {
        console.error('❌ Error in animateStep:', error);
        isRunning.value = false;
      }
    };

    animateStep();
}
</script>

<style scoped>
.playground {
  margin: 2rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn-primary {
  background: var(--vp-c-brand-1);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.speed {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.speed input {
  width: 120px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
}

.scene {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.zone {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  font-size: 0.85rem;
}

.zone strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-1);
}

.info {
  padding: 0.4rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
  text-align: center;
  font-size: 0.75rem;
}

.queue {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 150px;
  overflow-y: auto;
}

.item {
  padding: 0.4rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
  font-size: 0.8rem;
}

.muted {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
}

.empty {
  padding: 1rem;
  text-align: center;
  color: var(--vp-c-text-2);
  font-style: italic;
  font-size: 0.8rem;
}

.barista {
  padding: 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
  text-align: center;
  font-size: 0.85rem;
}

.barista.busy {
  background: var(--vp-c-brand-soft);
}

.order {
  font-size: 0.75rem;
  margin: 0.25rem 0;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--vp-c-divider);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.bar {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.1s;
}

.idle {
  color: var(--vp-c-text-2);
}

.served {
  padding: 0.3rem;
  background: var(--vp-c-bg);
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 0.3rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.stat {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  text-align: center;
}

.label {
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.charts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-box {
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
}

.chart-box h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.chart {
  height: 180px;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .scene {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
