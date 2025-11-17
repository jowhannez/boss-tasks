<script setup>
import { onMounted, watch } from 'vue';

const baseURL = useRuntimeConfig().app.baseURL

// --- Local Storage Keys ---
const LS_KEYS = {
  MIN_AMOUNT: 'bossGenMinAmount',
  MAX_AMOUNT: 'bossGenMaxAmount',
  CATEGORIES: 'bossGenEnabledCategories',
  CURRENT_TASK: 'bossGenCurrentTask',
  HISTORY: 'bossGenTaskHistory', 
}

const { data: bosses } = await useAsyncData('bosses', () =>
  import('./data/bosses.json').then(m => m.default || m)
)

// --- State Definition ---
const DEFAULT_CATEGORIES = [
  "World bosses", "Wilderness bosses", "Instanced bosses",
  "The Forgotten Four", "Slayer bosses", "Minigame bosses",
  "Skilling bosses", "Raids"
];

const minAmount = useState('minAmount', () => 3);
const maxAmount = useState('maxAmount', () => 50);
const currentTask = useState('currentTask', () => null)
const enabledCategories = useState('enabledCategories', () => DEFAULT_CATEGORIES);
const taskHistory = useState('taskHistory', () => []); // New state for history

// --- Helper Functions ---

function generateTask() {
  if (minAmount.value > maxAmount.value) {
    alert("Minimum amount cannot be greater than maximum amount!");
    minAmount.value = maxAmount.value;
    return;
  }

  const filteredBosses = bosses.value.filter(category =>
    enabledCategories.value.includes(category.category)
  )

  if (filteredBosses.length === 0) {
    currentTask.value = null;
    alert("Please select at least one boss category!");
    return;
  }

  const allBosses = filteredBosses.flatMap(category => category.bosses)
  if (allBosses.length === 0) {
    currentTask.value = null;
    alert("The selected categories contain no bosses!");
    return;
  }

  const randomBoss = allBosses[Math.floor(Math.random() * allBosses.length)]
  const max = randomBoss.max ?? maxAmount.value;
  const effectiveMax = Math.min(max, maxAmount.value);
  const min = minAmount.value > effectiveMax ? effectiveMax : minAmount.value;

  if (Number(randomBoss.id) === Number(currentTask.value?.boss.id)) {
    return generateTask();
  }

  currentTask.value = {
    boss: randomBoss,
    amount: min + Math.floor(Math.random() * (effectiveMax - min + 1))
  }
}

function skipTask() {
  if (confirm("Are you sure you want to skip the current task and generate a new one?")) {
    currentTask.value = null; // Clears the current task
    generateTask(); // Generates a new one
  }
}

function completeTask() {
  if (!currentTask.value) return;

  // 1. Add current task to history with completion date
  taskHistory.value.unshift([currentTask.value.boss.id, currentTask.value.amount, Date.now()]); // Add to the start of the array

  // 2. Generate a new task
  generateTask();
}

// --- Local Storage Persistence Functions ---

function loadState() {
  if (typeof localStorage === 'undefined') return;

  // Load Config
  const savedMin = localStorage.getItem(LS_KEYS.MIN_AMOUNT);
  if (savedMin !== null) minAmount.value = Number(savedMin);

  const savedMax = localStorage.getItem(LS_KEYS.MAX_AMOUNT);
  if (savedMax !== null) maxAmount.value = Number(savedMax);

  const savedCategories = localStorage.getItem(LS_KEYS.CATEGORIES);
  if (savedCategories) {
    try {
      enabledCategories.value = JSON.parse(savedCategories);
    } catch (e) {
      enabledCategories.value = DEFAULT_CATEGORIES;
    }
  }

  // Load Current Task
  const savedTask = localStorage.getItem(LS_KEYS.CURRENT_TASK);
  if (savedTask) {
    try {
      currentTask.value = JSON.parse(savedTask);
    } catch (e) {
      currentTask.value = null;
    }
  }

  // Load History (NEW)
  const savedHistory = localStorage.getItem(LS_KEYS.HISTORY);
  if (savedHistory) {
    try {
      taskHistory.value = JSON.parse(savedHistory);
    } catch (e) {
      taskHistory.value = [];
    }
  }
}

function setupWatchers() {
  if (typeof localStorage === 'undefined') return;

  // Watch Config
  watch(minAmount, (newValue) => {
    localStorage.setItem(LS_KEYS.MIN_AMOUNT, String(newValue));
  });

  watch(maxAmount, (newValue) => {
    localStorage.setItem(LS_KEYS.MAX_AMOUNT, String(newValue));
  });

  watch(enabledCategories, (newValue) => {
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(newValue));
  }, { deep: true });

  // Watch Current Task
  watch(currentTask, (newValue) => {
    if (newValue) {
      localStorage.setItem(LS_KEYS.CURRENT_TASK, JSON.stringify(newValue));
    } else {
      localStorage.removeItem(LS_KEYS.CURRENT_TASK);
    }
  }, { deep: true });

  // Watch History (NEW)
  watch(taskHistory, (newValue) => {
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(newValue));
  }, { deep: true });
}

function clearHistory() {
  if (confirm("Are you sure you want to clear the completed task history? This action cannot be undone.")) {
    taskHistory.value = [];
    localStorage.removeItem(LS_KEYS.HISTORY);
  }
}

// --- Lifecycle Hook ---
onMounted(() => {
  loadState();
  setupWatchers();
})

// Function to format ISO date to readable string
function formatCompletionDate(timestamp) {
  // It handles both ISO string and UNIX millisecond number automatically
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function totalCompletedTasks(bossId) {
  return taskHistory.value.filter(task => task[0] === bossId).length;
}
</script>

<template>
  <div class="generator-container">
    <div class="main-content">
      <div class="task-output">
        <h1 class="main-title">Boss Task Generator</h1>

        <div v-if="currentTask" class="task-card">
          <h2 class="task-title">Your Next Challenge:</h2>
          <div class="boss-info">
            <img :src="baseURL + currentTask.boss.image" :alt="currentTask.boss.name" class="boss-image" />
            <h3 class="boss-name-amount"><em>{{ currentTask.amount }}x</em> {{ currentTask.boss.name }}</h3>
            <div v-if="totalCompletedTasks(currentTask.boss.id) > 0" class="completion-count">
              <p>✅ You have completed this task <strong>{{ totalCompletedTasks(currentTask.boss.id) }}</strong> time<span v-if="totalCompletedTasks(currentTask.boss.id) > 1">s</span>!</p>
            </div>
          </div>
        </div>

        <div v-else class="task-placeholder">
          <p>Click <strong>"Generate Task"</strong> to begin your next assignment!</p>
        </div>

        <div class="action-buttons-group">
          <button v-if="!currentTask" @click="generateTask" class="generate-btn">
            Generate New Task
          </button>
          
          <template v-else>
            <button @click="skipTask" class="action-btn skip-btn">
              Skip
            </button>
            <button @click="completeTask" class="action-btn complete-btn">
              Complete & Generate New
            </button>
          </template>
        </div>
      </div>

      <div class="controls-panel">
        <h2 class="panel-title">⚙️ Settings</h2>

        <div class="form-group amount-group">
          <label for="minAmount">Minimum Kills:</label>
          <input type="number" id="minAmount" v-model.number="minAmount" min="1" />
        </div>

        <div class="form-group amount-group">
          <label for="maxAmount">Maximum Kills:</label>
          <input type="number" id="maxAmount" v-model.number="maxAmount" :min="minAmount" />
        </div>

        <fieldset class="category-fieldset">
          <legend class="fieldset-legend">Enabled Categories:</legend>
          <div class="category-list">
            <div v-for="category in bosses" :key="category.category" class="category-item">
              <input
                type="checkbox"
                :id="category.category"
                :value="category.category"
                v-model="enabledCategories"
                class="category-checkbox"
              />
              <label :for="category.category" class="category-label">{{ category.category }}</label>
            </div>
          </div>
        </fieldset>
        <button @click="clearHistory" class="clear-history-btn">Clear history</button>
      </div>
    </div>

    <div v-if="taskHistory.length" class="history-section">
      <h2 class="history-title">📜 Completed Task History ({{ taskHistory.length }} total)</h2>
      <ul class="history-list">
        <li v-for="task in taskHistory"  class="history-item">
          <span class="history-amount">{{ task[1] }}x</span>
          <span class="history-boss">{{ bosses.find(category => category.bosses.some(boss => boss.id === task[0])).bosses.find(boss => boss.id === task[0]).name }}</span>
          <span class="history-date">({{ formatCompletionDate(task[2]) }})</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
/* --- Color Variables for Theme (Parchment/Tan) --- */
:root {
  --bg-primary: #bea684; /* Background */
  --bg-secondary: #d0bba0; /* Panel color */
  --text-dark: #3e2723; /* Dark brown text */
  --accent-red: #c62828; /* Deep red action */
  --accent-dark: #5d4037; /* Darker brown borders/shadows */
  --result-bg: #8d6e63; /* Result card */
  --result-text: #fff8e1; /* Result text */
  --complete-green: #388e3c; /* New: Green for Complete button */
  --skip-blue: #1976d2; /* New: Blue for Skip button */
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
}

/* --- Global Styling and Layout --- */
.generator-container {
  background-color: var(--bg-primary);
  color: var(--text-dark);
  font-family: 'Roboto', sans-serif;
  padding: 40px 20px;
  min-height: 100vh;
}

.main-content {
  display: flex;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto 40px auto; /* Added margin-bottom */
  align-items: flex-start;
}

/* --- Titles and Panels --- */
.main-title {
  text-align: center;
  color: var(--accent-dark);
  margin-bottom: 30px;
  border-bottom: 2px solid var(--accent-dark);
  padding-bottom: 10px;
}

.task-output {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-secondary);
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  border: 2px solid var(--accent-dark);
}

.task-card {
  text-align: center;
  padding: 20px;
  background-color: var(--result-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  margin-bottom: 20px;
  width: 100%;
}

.task-title {
  color: var(--result-text);
}

.boss-name-amount {
  color: var(--result-text);
  font-size: 2.5em;
}

.boss-name-amount em {
  color: white;
  font-style: normal;
}

.completion-count p {
  margin: 0;
}

.boss-image {
  max-width: 200px;
  height: 300px !important;
  border-radius: 5px;
  padding: 5px;
  object-fit: contain;
}

/* --- Action Button Groups (UPDATED) --- */
.action-buttons-group {
  display: flex;
  gap: 15px;
  justify-content: center;
  width: 100%;
}

/* Base button style (for all primary actions) */
.generate-btn, .action-btn {
  padding: 15px 25px;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.1s ease;
  text-transform: uppercase;
}

/* Primary Generate Button (when no task is active) */
.generate-btn {
  background-color: var(--accent-red);
  box-shadow: 0 4px var(--accent-dark);
}
.generate-btn:hover { background-color: #a71e1e; }
.generate-btn:active { box-shadow: 0 1px var(--accent-dark); transform: translateY(3px); }

/* Complete Button */
.complete-btn {
  background-color: var(--complete-green);
  flex-grow: 1;
  box-shadow: 0 4px #2e6030;
}
.complete-btn:hover { background-color: #2e6030; }
.complete-btn:active { box-shadow: 0 1px #2e6030; transform: translateY(3px); }

/* Skip Button */
.skip-btn {
  background-color: var(--skip-blue);
  box-shadow: 0 4px #104e8b;
}
.skip-btn:hover { background-color: #104e8b; }
.skip-btn:active { box-shadow: 0 1px #104e8b; transform: translateY(3px); }

/* --- Controls Panel (Right/Bottom) --- */
.controls-panel {
  flex: 1;
  background-color: var(--bg-secondary);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid var(--accent-dark);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-group label {
  font-weight: bold;
}

.form-group input[type="number"] {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--accent-dark);
  border-radius: 4px;
  background-color: white;
  color: var(--text-dark);
  text-align: center;
}

/* --- Category Fieldset --- */
.category-fieldset {
  border: 1px solid var(--accent-dark);
  padding: 10px;
  border-radius: 5px;
  margin-top: 20px;
}

.fieldset-legend {
  color: var(--accent-dark);
  padding: 0 10px;
  font-weight: bold;
}

.category-list {
  display: flex;
  flex-direction: column;
}

.category-item {
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.category-label {
  cursor: pointer;
  transition: color 0.2s;
}

.category-item:hover .category-label {
  color: var(--text-dark); /* Highlight on hover */
}

.category-checkbox {
  accent-color: var(--text-dark);
}

.clear-history-btn {
  margin-top: 20px;
  padding: 10px 15px;
  background-color: var(--accent-red);
  color: white;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

/* --- Responsive adjustments --- */
@media (max-width: 900px) {
  .main-content {
    flex-direction: column;
    align-items: stretch;
  }
}

/* --- Task History Section (NEW STYLES) --- */
.history-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #d0bba0; /* Lighter background for history */
  border-radius: 10px;
  border: 2px solid var(--accent-dark);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.history-title {
  color: var(--accent-dark);
  border-bottom: 2px solid var(--accent-dark);
  padding-bottom: 10px;
  margin-bottom: 20px;
  text-align: center;
}

.history-list {
  list-style: none;
  padding: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--accent-dark);
  font-size: 1.1em;
}

.history-item:last-child {
  border-bottom: none;
}

.history-amount {
  font-weight: bold;
  color: var(--accent-red);
}

.history-boss {
  flex-grow: 1;
  padding-left: 15px;
}

.history-date {
  font-size: 0.9em;
  color: var(--accent-dark);
}

/* --- Responsive adjustments --- */
@media (max-width: 900px) {
  .main-content {
    flex-direction: column;
    align-items: stretch;
  }
  .action-buttons-group {
    flex-direction: column;
  }
}
</style>