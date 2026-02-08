<template>
  <div class="mm1-playground-wrapper">
    <!-- Compact Button to Open Modal -->
    <button @click="openModal" class="open-modal-button">
      🎮 Launch Interactive M/M/1 Queue Simulation
    </button>

    <!-- Full-Screen Modal -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>M/M/1 Queue - Interactive Simulation</h2>
            <button @click="closeModal" class="close-button">✕</button>
          </div>

          <div class="modal-body">
            <!-- Controls -->
            <div class="controls">
              <button @click="runSimulation" :disabled="isRunning" class="run-button">
                {{ isRunning ? '⏸ Running...' : '▶ Run Simulation' }}
              </button>
              <button @click="resetSimulation" :disabled="isRunning" class="reset-button">
                🔄 Reset
              </button>
              <div class="speed-control">
                <label>Speed: </label>
                <input
                  type="range"
                  v-model="animationSpeed"
                  min="1"
                  max="50"
                  :disabled="isRunning"
                />
                <span>{{ animationSpeed }}x</span>
              </div>
            </div>

            <!-- Main Content Grid -->
            <div class="main-grid">
              <!-- Left: Visual Simulation -->
              <div class="visual-panel">
                <div class="simulation-scene">
                  <!-- Arrival Zone -->
                  <div class="zone arrival-zone">
                    <div class="zone-label">👥 Arrivals</div>
                    <div v-if="nextArrivalTime !== null" class="next-arrival">
                      Next: {{ nextArrivalTime.toFixed(1) }}s
                    </div>
                  </div>

                  <!-- Queue Zone -->
                  <div class="zone queue-zone">
                    <div class="zone-label">🚶 Queue ({{ queueLength }})</div>
                    <div class="queue-container">
                      <div
                        v-for="(customer, idx) in queueCustomers"
                        :key="customer.id"
                        class="customer-in-queue"
                        :style="{ animationDelay: idx * 0.1 + 's' }"
                      >
                        <div class="customer-avatar">👤</div>
                        <div class="customer-info">
                          <span class="cust-id">#{{ customer.id }}</span>
                          <span class="cust-wait">{{ customer.waitTime.toFixed(1) }}s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Server Zone -->
                  <div class="zone server-zone">
                    <div class="zone-label">🏪 Server</div>
                    <div class="server-box" :class="{ busy: serverBusy, idle: !serverBusy }">
                      <div v-if="servingCustomer" class="serving">
                        <div class="customer-avatar large">👤</div>
                        <div class="serving-info">
                          <div>#{{ servingCustomer.id }}</div>
                          <div class="time-left">{{ servingCustomer.serviceRemaining.toFixed(1) }}s</div>
                        </div>
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            :style="{ width: ((1 - servingCustomer.serviceRemaining / servingCustomer.totalService) * 100) + '%' }"
                          ></div>
                        </div>
                      </div>
                      <div v-else class="idle-state">
                        <div class="server-icon">🏪</div>
                        <div>IDLE</div>
                      </div>
                    </div>
                  </div>

                  <!-- Departure Zone -->
                  <div class="zone departure-zone">
                    <div class="zone-label">✅ Served: {{ customersServed }}</div>
                    <div class="departed-list">
                      <div
                        v-for="customer in recentDepartures"
                        :key="'dep-' + customer.id"
                        class="departed-customer"
                      >
                        👤 #{{ customer.id }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Stats Row -->
                <div class="stats-row">
                  <div class="stat-box">
                    <div class="stat-label">Time</div>
                    <div class="stat-value">{{ currentTime.toFixed(1) }}s</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Served</div>
                    <div class="stat-value">{{ customersServed }}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Avg Wait</div>
                    <div class="stat-value">{{ avgWaitTime.toFixed(2) }}s</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Queue</div>
                    <div class="stat-value">{{ queueLength }}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Utilization</div>
                    <div class="stat-value">{{ (serverUtilization * 100).toFixed(0) }}%</div>
                  </div>
                </div>
              </div>

              <!-- Right: Charts and Log -->
              <div class="data-panel">
                <div class="chart-box">
                  <h4>Queue Length</h4>
                  <v-chart class="chart" :option="queueChartOption" autoresize />
                </div>
                <div class="chart-box">
                  <h4>Utilization</h4>
                  <v-chart class="chart" :option="utilizationChartOption" autoresize />
                </div>
                <div class="log-box">
                  <h4>Event Log</h4>
                  <div class="log-content" ref="logContent">
                    <div v-for="(event, idx) in eventLog" :key="idx" class="log-line" :class="event.type">
                      <span class="log-time">[{{ event.time.toFixed(1) }}]</span>
                      {{ event.message }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, TooltipComponent, GridComponent]);

// Modal state
const isModalOpen = ref(false);

// Simulation state
const isRunning = ref(false);
const animationSpeed = ref(10);
const currentTime = ref(0);
const customersServed = ref(0);
const queueLength = ref(0);
const serverBusy = ref(false);
const serverUtilization = ref(0);
const avgWaitTime = ref(0);
const nextArrivalTime = ref(null);

// Visual state
const queueCustomers = ref([]);
const servingCustomer = ref(null);
const recentDepartures = ref([]);
const eventLog = ref([]);
const logContent = ref(null);

// Chart data
const queueData = ref([]);
const utilizationData = ref([]);
const waitTimes = ref([]);
const timeData = ref([]);

const ARRIVAL_RATE = 0.7;
const SERVICE_RATE = 1.0;
const SIM_DURATION = 50;

function openModal() {
  isModalOpen.value = true;
}

function closeModal() {
  if (!isRunning.value) {
    isModalOpen.value = false;
  }
}

const queueChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: timeData.value },
  yAxis: { type: 'value' },
  series: [{
    data: queueData.value,
    type: 'line',
    smooth: true,
    itemStyle: { color: '#5f9598' },
    areaStyle: { color: 'rgba(95, 149, 152, 0.2)' }
  }],
  grid: { left: 50, right: 20, top: 20, bottom: 30 }
}));

const utilizationChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: timeData.value },
  yAxis: { type: 'value', max: 1 },
  series: [{
    data: utilizationData.value,
    type: 'line',
    smooth: true,
    itemStyle: { color: '#1d546d' },
    areaStyle: { color: 'rgba(29, 84, 109, 0.2)' }
  }],
  grid: { left: 50, right: 20, top: 20, bottom: 30 }
}));

function addEvent(message, type = 'info') {
  eventLog.value.push({ time: currentTime.value, message, type });
  if (eventLog.value.length > 15) eventLog.value.shift();
  nextTick(() => {
    if (logContent.value) logContent.value.scrollTop = logContent.value.scrollHeight;
  });
}

function resetSimulation() {
  isRunning.value = false;
  currentTime.value = 0;
  customersServed.value = 0;
  queueLength.value = 0;
  serverBusy.value = false;
  serverUtilization.value = 0;
  avgWaitTime.value = 0;
  nextArrivalTime.value = null;
  queueCustomers.value = [];
  servingCustomer.value = null;
  recentDepartures.value = [];
  eventLog.value = [];
  queueData.value = [];
  utilizationData.value = [];
  waitTimes.value = [];
  timeData.value = [];
}

async function runSimulation() {
  isRunning.value = true;
  resetSimulation();

  try {
    const { Simulation, Resource, Random, timeout } = await import('discrete-sim');
    const sim = new Simulation();
    const rng = new Random(42);
    const server = new Resource(sim, 1, { name: 'Server' });

    addEvent('Simulation started', 'start');

    const customerData = new Map();

    function* customerProcess(id) {
      const arrivalTime = sim.now;
      const custData = { id, arrivalTime, waitTime: 0 };
      customerData.set(id, custData);

      queueCustomers.value.push(custData);
      queueLength.value = server.queueLength + 1;
      addEvent(`Customer ${id} arrived`, 'arrival');

      yield server.request();

      // Remove from queue
      const idx = queueCustomers.value.findIndex(c => c.id === id);
      if (idx !== -1) queueCustomers.value.splice(idx, 1);
      queueLength.value = server.queueLength;

      const waitTime = sim.now - arrivalTime;
      waitTimes.value.push(waitTime);
      custData.waitTime = waitTime;

      // Start service
      serverBusy.value = true;
      const serviceTime = rng.exponential(1 / SERVICE_RATE);
      servingCustomer.value = { id, serviceRemaining: serviceTime, totalService: serviceTime };
      addEvent(`Customer ${id} started service (waited ${waitTime.toFixed(1)}s)`, 'service');

      yield* timeout(serviceTime);

      server.release();
      serverBusy.value = false;
      servingCustomer.value = null;
      customersServed.value++;

      recentDepartures.value.push({ id });
      if (recentDepartures.value.length > 3) recentDepartures.value.shift();

      addEvent(`Customer ${id} departed`, 'departure');
    }

    function* arrivalProcess() {
      let id = 0;
      while (sim.now < SIM_DURATION) {
        const interarrivalTime = rng.exponential(1 / ARRIVAL_RATE);
        nextArrivalTime.value = sim.now + interarrivalTime;

        sim.process(() => customerProcess(id++));
        yield* timeout(interarrivalTime);
      }
      nextArrivalTime.value = null;
    }

    function* monitorProcess() {
      while (sim.now < SIM_DURATION) {
        timeData.value.push(sim.now.toFixed(1));
        queueData.value.push(server.queueLength);
        utilizationData.value.push(server.inUse / server.capacity);

        queueCustomers.value.forEach(c => {
          c.waitTime = sim.now - c.arrivalTime;
        });

        if (servingCustomer.value) {
          servingCustomer.value.serviceRemaining = Math.max(0, servingCustomer.value.serviceRemaining - 0.1);
        }

        yield* timeout(0.1);
      }
    }

    sim.process(arrivalProcess);
    sim.process(monitorProcess);

    while (sim.now < SIM_DURATION && isRunning.value) {
      sim.run(sim.now + 0.1);
      currentTime.value = sim.now;

      if (waitTimes.value.length > 0) {
        avgWaitTime.value = waitTimes.value.reduce((a, b) => a + b, 0) / waitTimes.value.length;
      }
      serverUtilization.value = sim.statistics.getAverage('Server:utilization') || 0;

      await new Promise(resolve => setTimeout(resolve, 1000 / animationSpeed.value));
    }

    addEvent('Simulation completed', 'end');
  } catch (error) {
    addEvent(`Error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    isRunning.value = false;
  }
}
</script>

<style scoped>
.mm1-playground-wrapper {
  margin: 2rem 0;
}

.open-modal-button {
  width: 100%;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.open-modal-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  background: var(--vp-c-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--vp-c-brand-1);
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
}

.close-button:hover {
  color: var(--vp-c-brand-1);
}

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.run-button,
.reset-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.run-button {
  background: var(--vp-c-brand-1);
  color: white;
}

.run-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-button {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.main-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1rem;
  height: calc(90vh - 150px);
}

.visual-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.simulation-scene {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--vp-c-bg);
  border-radius: 6px;
  border: 2px solid var(--vp-c-divider);
}

.zone-label {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
}

.next-arrival {
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
}

.queue-container {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
}

.customer-in-queue {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.customer-avatar {
  font-size: 1.5rem;
}

.customer-avatar.large {
  font-size: 2.5rem;
}

.customer-info {
  display: flex;
  flex-direction: column;
  font-size: 0.7rem;
}

.cust-id {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.cust-wait {
  color: var(--vp-c-text-2);
}

.server-box {
  width: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  transition: all 0.3s;
}

.server-box.busy {
  background: var(--vp-c-brand-soft);
  border: 2px solid var(--vp-c-brand-1);
}

.server-box.idle {
  background: var(--vp-c-bg-soft);
}

.serving {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}

.serving-info {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
}

.time-left {
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--vp-c-brand-1);
  transition: width 0.1s linear;
}

.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.server-icon {
  font-size: 2rem;
}

.departed-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
}

.departed-customer {
  padding: 0.3rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  opacity: 0.7;
  animation: fadeOut 2s forwards;
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.stat-box {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  text-align: center;
  border: 1px solid var(--vp-c-divider);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.3rem;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.data-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-box,
.log-box {
  background: var(--vp-c-bg-soft);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.chart-box h4,
.log-box h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}

.chart {
  height: 180px;
}

.log-box {
  flex: 1;
}

.log-content {
  background: var(--vp-code-block-bg);
  color: var(--vp-code-block-color);
  padding: 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  height: 200px;
  overflow-y: auto;
}

.log-line {
  margin: 0.2rem 0;
  line-height: 1.4;
}

.log-time {
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.log-line.arrival {
  color: #4ade80;
}

.log-line.service {
  color: #60a5fa;
}

.log-line.departure {
  color: #a78bfa;
}

.log-line.error {
  color: #f87171;
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .simulation-scene {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
