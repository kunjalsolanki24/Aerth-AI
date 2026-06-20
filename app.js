/* ==========================================================================
   AERTH AI CORE APPLICATION CONTROLLER
   ========================================================================== */

// Global Application State Store
const state = {
  user: {
    name: "Alex Rivera",
    level: 1,
    xp: 140,
    coins: 350,
    streak: 5,
    avatar: "AR"
  },
  onboarding: {
    transport: "car_gas",
    transportVal: 100, // miles/week
    diet: "meat_heavy",
    energy: 120, // $/mo
    energy_source: "standard",
    shopping: "high",
    waste: "low_recycle",
    water: 10 // minutes/shower
  },
  calculated: {
    baselineCO2e: 14.5, // metric tons/year
    currentCO2e: 14.5,
    simulatedSavings: 0.0,
    climateScore: 45 // 0-100 score (lower emissions = higher score)
  },
  simulation: {
    transportMitigation: 0, // 0 to 100 percentage reduction
    dietaryOptimization: 0,
    energySolar: 0,
    waterTrim: 0
  },
  logs: [
    { id: 1, category: "transport", amount: 15, unit: "miles", co2e: -6.1, desc: "Commuted via electric light rail", date: "2026-06-19" },
    { id: 2, category: "food", amount: 1, unit: "meal", co2e: -2.2, desc: "Had plant-based organic lunch", date: "2026-06-20" },
    { id: 3, category: "waste", amount: 1, unit: "sort", co2e: -1.5, desc: "Composted organic food scraps", date: "2026-06-20" }
  ],
  challenges: [
    { id: "ch-1", title: "Commuter Shift", desc: "Log 3 public transit commutes this week.", category: "transport", xpReward: 120, target: 3.0, progress: 1.0, status: "active" },
    { id: "ch-2", title: "Green Energy Leap", desc: "Simulate zero-grid dependency using Solar plan.", category: "energy", xpReward: 200, target: 1.0, progress: 0.0, status: "joinable" },
    { id: "ch-3", title: "Meatless Streak", desc: "Opt for vegetarian meals 5 days in a row.", category: "food", xpReward: 150, target: 5.0, progress: 0.0, status: "joinable" }
  ],
  rewards: [
    { id: "rw-1", title: "15% Bio-clothing discount", company: "EcoThread", cost: 150, code: "THREA-GREEN-15", claimed: false },
    { id: "rw-2", title: "Free smart shower timer", company: "WaterSustain", cost: 300, code: "WATER-WISE-TIME", claimed: false },
    { id: "rw-3", title: "Offset 1 ton CO2 in Amazon", company: "Wren Forest", cost: 500, code: "WREN-AMAZON-TON", claimed: false }
  ],
  admin: {
    coefficients: {
      gasVehicle: 0.411,    // kg CO2 per mile
      evVehicle: 0.08,     // kg CO2 per mile
      transitVehicle: 0.05, // kg CO2 per mile
      meatHeavy: 3.3,       // tons CO2 per year
      flexitarian: 1.9,
      vegetarian: 1.4,
      vegan: 0.9,
      energyStandard: 0.0006, // tons CO2 per kWh
      energyGreen: 0.00005
    },
    auditLogs: [
      { admin: "System Boot", action: "Initialized Carbon calculations framework", time: "2026-06-20 18:43:16" }
    ]
  },
  analyticsEvents: []
};

/* ==========================================================================
   UTILITY HELPER: GLOBAL TOASTS
   ========================================================================== */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast-alert ${type}`;
  toast.innerHTML = `
    <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4M12 16h.01"/>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  // Slide in with GSAP
  gsap.fromTo(toast, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
  
  // Auto remove
  setTimeout(() => {
    gsap.to(toast, { opacity: 0, y: -20, duration: 0.3, onComplete: () => toast.remove() });
  }, 4000);
}

// Log analytical events
function trackEvent(name, props = {}) {
  const ev = { event_name: name, properties: props, time: new Date().toISOString() };
  state.analyticsEvents.push(ev);
  
  // Push custom notification if it is high impact
  if (name === "challenge_completed") {
    showToast(`Achievement unlocked: ${props.title}! +${props.xp} XP`, "success");
  }
}

/* ==========================================================================
   1. ROUTER & PANEL NAVIGATOR
   ========================================================================== */
const appRouter = {
  navigate(targetView) {
    trackEvent("navigate_view", { view: targetView });
    
    // Manage section displays
    const landing = document.getElementById("landingView");
    const onboard = document.getElementById("onboardView");
    const dash = document.getElementById("appDashboardView");
    const process = document.getElementById("aiProcessingView");
    
    // Hide all first
    landing.style.display = "none";
    onboard.style.display = "none";
    dash.style.display = "none";
    process.style.display = "none";
    
    if (targetView === "landing") {
      landing.style.display = "flex";
      app3DEarth.resume();
    } else if (targetView === "login" || targetView === "dashboard") {
      dash.style.display = "flex";
      app3DEarth.pause();
      // Render logs, twin updates
      appLogs.renderTable();
      appTwinSimulator.runSimulation();
      appChallenges.render();
      appRewards.render();
      
      // Auto initialize Three.js twin
      setTimeout(() => {
        app3DTwin.init();
      }, 200);
      showToast(`Welcome back, ${state.user.name}!`, "success");
    }
  },

  startOnboarding() {
    trackEvent("onboarding_started");
    document.getElementById("landingView").style.display = "none";
    document.getElementById("onboardView").style.display = "flex";
    appOnboarding.setStep(1);
  },

  showSystemSpecs() {
    showToast("Specs: Three.js WebGL Core, GSAP animation controller, client local persistence.", "info");
  },

  switchPanel(panelName) {
    trackEvent("switch_dashboard_tab", { tab: panelName });
    
    // Turn off active nav states
    const items = document.querySelectorAll(".nav-item");
    items.forEach(el => el.classList.remove("active"));
    
    // Hide all view-panels
    const panels = document.querySelectorAll(".view-section");
    panels.forEach(el => el.classList.remove("active"));
    
    // Set target state active
    const targetItem = document.getElementById("nav" + panelName.charAt(0).toUpperCase() + panelName.slice(1));
    const targetPanel = document.getElementById("view" + panelName.charAt(0).toUpperCase() + panelName.slice(1));
    
    if (targetItem) targetItem.classList.add("active");
    if (targetPanel) targetPanel.classList.add("active");
    
    // Trigger animations inside panels if needed
    if (panelName === "twin") {
      setTimeout(() => app3DTwin.resize(), 100);
    }
  }
};

/* ==========================================================================
   2. ONBOARDING ASSESSMENT QUIZ CONTROLLER
   ========================================================================== */
const appOnboarding = {
  currentStep: 1,
  totalSteps: 6,

  setStep(step) {
    this.currentStep = step;
    
    // Render progress headers
    const progressTitle = document.getElementById("onboardProgressTitle");
    const progressPercent = document.getElementById("onboardProgressPercent");
    const progressBar = document.getElementById("onboardProgressBar");
    
    const categories = ["Transport", "Dietary Profile", "Utility Energy Mix", "Shopping Habits", "Waste Control", "Water Consumption"];
    progressTitle.innerText = `Step ${step} of ${this.totalSteps}: ${categories[step - 1]}`;
    
    const pct = Math.round((step / this.totalSteps) * 100);
    progressPercent.innerText = `${pct}%`;
    progressBar.style.width = `${pct}%`;
    
    // Toggle card visibility
    const stepCards = document.querySelectorAll(".quiz-step");
    stepCards.forEach(card => {
      card.classList.remove("active");
      if (parseInt(card.getAttribute("data-step")) === step) {
        card.classList.add("active");
      }
    });

    // Control buttons state
    document.getElementById("onboardPrevBtn").disabled = (step === 1);
    
    if (step === this.totalSteps) {
      document.getElementById("onboardNextBtn").innerText = "Generate Carbon Twin";
      document.getElementById("onboardNextBtn").className = "btn btn-accent";
    } else {
      document.getElementById("onboardNextBtn").innerText = "Next Step";
      document.getElementById("onboardNextBtn").className = "btn btn-primary";
    }
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.setStep(this.currentStep + 1);
    } else {
      this.completeAssessment();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.setStep(this.currentStep - 1);
    }
  },

  setOption(stepNum, categoryKey, optionVal, numericBaseline) {
    // Select clicked card visual element
    const currentStepDiv = document.querySelector(`.quiz-step[data-step="${stepNum}"]`);
    const options = currentStepDiv.querySelectorAll(".option-card");
    options.forEach(opt => opt.classList.remove("selected"));
    
    // Add selected class to event target
    event.currentTarget.classList.add("selected");
    
    // Save to state onboarding configs
    state.onboarding[categoryKey] = optionVal;
    trackEvent("onboard_option_change", { category: categoryKey, value: optionVal });
  },

  updateSlider(category) {
    const slider = document.getElementById(category + "Slider");
    const valText = document.getElementById(category + "Val");
    
    if (category === "transport") {
      state.onboarding.transportVal = parseInt(slider.value);
      valText.innerText = `${slider.value} miles`;
    } else if (category === "energy") {
      state.onboarding.energy = parseInt(slider.value);
      valText.innerText = `$${slider.value}/mo`;
    } else if (category === "water") {
      state.onboarding.water = parseInt(slider.value);
      valText.innerText = `${slider.value} minutes`;
    }
  },

  completeAssessment() {
    trackEvent("assessment_submitted");
    
    // Perform carbon baseline calculations
    appCarbonCalculator.runInitialAssessment();
    
    // Launch AI Loader Telemetry sequence
    document.getElementById("onboardView").style.display = "none";
    document.getElementById("aiProcessingView").style.display = "flex";
    
    // Play telemetry message timeline in terminal container
    const telemetryTexts = [
      "Contacting carbon analytics node...",
      "Analyzing travel index scope 1 factors...",
      "Translating residential utility grid mix...",
      "Compiling diet parameters with agricultural models...",
      "Synthesizing baseline twin polyhedral mesh...",
      "Finalizing digital model twin parameters..."
    ];
    
    let currentLine = 0;
    const terminal = document.getElementById("loadingTelemetry");
    
    const interval = setInterval(() => {
      if (currentLine < telemetryTexts.length) {
        terminal.innerText = telemetryTexts[currentLine];
        currentLine++;
      } else {
        clearInterval(interval);
        appRouter.navigate("dashboard");
      }
    }, 850);
  }
};

/* ==========================================================================
   3. CARBON TELEMETRY MATHEMATICAL CALCULATIONS
   ========================================================================== */
const appCarbonCalculator = {
  runInitialAssessment() {
    const ob = state.onboarding;
    const coef = state.admin.coefficients;
    
    // 1. Calculate Transport Emissions
    let transCoef = coef.gasVehicle;
    if (ob.transport === "car_hybrid_ev") transCoef = coef.evVehicle;
    if (ob.transport === "transit") transCoef = coef.transitVehicle;
    if (ob.transport === "active") transCoef = 0.0;
    
    const transportEmissions = (ob.transportVal * 52 * transCoef) / 1000; // Tons CO2/year
    
    // 2. Diet Emissions
    let dietEmissions = coef.meatHeavy;
    if (ob.diet === "flexitarian") dietEmissions = coef.flexitarian;
    if (ob.diet === "vegetarian") dietEmissions = coef.vegetarian;
    if (ob.diet === "vegan") dietEmissions = coef.vegan;
    
    // 3. Residential energy emissions
    const yearlyKWh = (ob.energy * 10) * 12; // Approximation of kWh from bills
    const gridCoef = ob.energy_source === "green" ? coef.energyGreen : coef.energyStandard;
    const energyEmissions = yearlyKWh * gridCoef;
    
    // 4. Shopping, waste and water parameters
    let shopEmissions = 1.8;
    if (ob.shopping === "medium") shopEmissions = 1.0;
    if (ob.shopping === "minimal") shopEmissions = 0.5;
    if (ob.shopping === "secondhand") shopEmissions = 0.1;
    
    let wasteEmissions = 1.2;
    if (ob.waste === "average_recycle") wasteEmissions = 0.6;
    if (ob.waste === "compost_full") wasteEmissions = 0.1;
    
    const waterEmissions = (ob.water * 365 * 0.15) / 1000; // tons/year
    
    // Sum complete baseline
    const totalBaseline = transportEmissions + dietEmissions + energyEmissions + shopEmissions + wasteEmissions + waterEmissions;
    
    state.calculated.baselineCO2e = parseFloat(totalBaseline.toFixed(1));
    state.calculated.currentCO2e = state.calculated.baselineCO2e;
    
    // Recalculate Climate Score
    this.updateClimateScore();
  },

  updateClimateScore() {
    // Standard target is 4.0 metric tons/year per global parameters.
    // Lower score is better. Climate Score badge scales 0-100 (where 100 is best)
    const base = state.calculated.currentCO2e;
    let score = Math.round(100 - (base * 5));
    if (score > 100) score = 100;
    if (score < 0) score = 0;
    
    state.calculated.climateScore = score;
    
    // Update dashboard visual values
    document.getElementById("dashboardBaselineText").innerText = state.calculated.baselineCO2e;
    document.getElementById("climateScoreBadge").innerText = score;
    
    // Update badge visual coloring
    const badge = document.getElementById("climateScoreBadge");
    const statusDot = document.getElementById("twinStatusDot");
    const statusText = document.getElementById("twinStatusText");
    
    if (score >= 75) {
      badge.style.color = "var(--accent-emerald)";
      statusDot.className = "twin-status-dot";
      statusText.innerText = "Optimized Twin state";
    } else if (score >= 45) {
      badge.style.color = "var(--accent-amber)";
      statusDot.className = "twin-status-dot warn";
      statusText.innerText = "Moderate emissions load";
    } else {
      badge.style.color = "var(--accent-rose)";
      statusDot.className = "twin-status-dot danger";
      statusText.innerText = "Critical emission spikes detected";
    }
  }
};

/* ==========================================================================
   4. CARBON TWIN SIMULATOR CONTROLLER
   ========================================================================== */
const appTwinSimulator = {
  runSimulation() {
    // Read range slider percentages (0 - 100)
    const transPct = parseInt(document.getElementById("simSliderTransport").value);
    const dietPct = parseInt(document.getElementById("simSliderDiet").value);
    const energyPct = parseInt(document.getElementById("simSliderEnergy").value);
    const waterPct = parseInt(document.getElementById("simSliderWater").value);
    
    // Approximate maximum potential savings per category
    const maxTransSavings = state.calculated.baselineCO2e * 0.3; // max 30% reduction from transit
    const maxDietSavings = state.calculated.baselineCO2e * 0.2;
    const maxEnergySavings = state.calculated.baselineCO2e * 0.25;
    const maxWaterSavings = state.calculated.baselineCO2e * 0.05;
    
    const transSaved = maxTransSavings * (transPct / 100);
    const dietSaved = maxDietSavings * (dietPct / 100);
    const energySaved = maxEnergySavings * (energyPct / 100);
    const waterSaved = maxWaterSavings * (waterPct / 100);
    
    const totalSaved = transSaved + dietSaved + energySaved + waterSaved;
    state.calculated.simulatedSavings = parseFloat(totalSaved.toFixed(1));
    state.calculated.currentCO2e = parseFloat((state.calculated.baselineCO2e - totalSaved).toFixed(1));
    
    // Update simulation label overlays
    document.getElementById("simValTransport").innerText = `-${transSaved.toFixed(1)} Tons`;
    document.getElementById("simValDiet").innerText = `-${dietSaved.toFixed(1)} Tons`;
    document.getElementById("simValEnergy").innerText = `-${energySaved.toFixed(1)} Tons`;
    document.getElementById("simValWater").innerText = `-${waterSaved.toFixed(1)} Tons`;
    
    document.getElementById("dashboardSimText").innerText = state.calculated.simulatedSavings;
    
    // Refresh calculations score
    appCarbonCalculator.updateClimateScore();
    
    // Trigger geometric morphing on 3D Carbon Twin polyhedron
    app3DTwin.morphMesh(state.calculated.climateScore);
  },

  applySimulation() {
    trackEvent("simulation_applied", { savings: state.calculated.simulatedSavings });
    
    // Award coins and experience points for establishing target plan
    state.user.xp += 100;
    state.user.coins += 50;
    
    // Update visual badge telemetry
    document.getElementById("profileLevelText").innerText = `XP: ${state.user.xp} • Lvl ${Math.floor(state.user.xp/200) + 1}`;
    document.getElementById("dashboardCoinsText").innerText = state.user.coins;
    
    showToast("Habit goals updated. +100 XP awarded!", "success");
    
    // Check if challenge parameters are fulfilled
    const energySliderVal = parseInt(document.getElementById("simSliderEnergy").value);
    if (energySliderVal >= 90) {
      this.completeChallenge("ch-2");
    }
  },

  completeChallenge(challengeId) {
    const ch = state.challenges.find(c => c.id === challengeId);
    if (ch && ch.status !== "completed") {
      ch.progress = ch.target;
      ch.status = "completed";
      state.user.xp += ch.xpReward;
      state.user.coins += 100;
      
      document.getElementById("profileLevelText").innerText = `XP: ${state.user.xp} • Lvl ${Math.floor(state.user.xp/200) + 1}`;
      document.getElementById("dashboardCoinsText").innerText = state.user.coins;
      
      trackEvent("challenge_completed", { title: ch.title, xp: ch.xpReward });
      appChallenges.render();
    }
  },

  resetSimulation() {
    document.getElementById("simSliderTransport").value = 0;
    document.getElementById("simSliderDiet").value = 0;
    document.getElementById("simSliderEnergy").value = 0;
    document.getElementById("simSliderWater").value = 0;
    
    this.runSimulation();
    showToast("Simulation constraints reset to baseline.", "info");
  }
};

/* ==========================================================================
   5. TELEMETRY DAILY LOGS CONTROLLER
   ========================================================================== */
const appLogs = {
  currentCategory: "transport",

  setLogCategory(cat) {
    this.currentCategory = cat;
    
    // Reset tab visuals
    const btns = document.querySelectorAll(".quick-log-tab-btn");
    btns.forEach(btn => btn.classList.remove("active"));
    
    // Set active
    const activeBtn = document.getElementById("logTab" + cat.charAt(0).toUpperCase() + cat.slice(1));
    if (activeBtn) activeBtn.classList.add("active");
    
    // Swap form group input configurations
    const group = document.getElementById("dynamicLogInputGroup");
    const label = document.getElementById("logInputLabel");
    const input = document.getElementById("logInputAmount");
    
    if (cat === "transport") {
      label.innerText = "Miles Commuted";
      input.placeholder = "e.g. 15";
    } else if (cat === "food") {
      label.innerText = "Vegan meals eaten";
      input.placeholder = "e.g. 2";
    } else if (cat === "energy") {
      label.innerText = "Power reduction (kWh)";
      input.placeholder = "e.g. 5";
    } else if (cat === "shopping") {
      label.innerText = "Spending avoided ($)";
      input.placeholder = "e.g. 50";
    } else if (cat === "waste") {
      label.innerText = "Sortings & Recycles";
      input.placeholder = "e.g. 3";
    } else if (cat === "water") {
      label.innerText = "Shower Minutes Reduced";
      input.placeholder = "e.g. 8";
    }
  },

  handleSubmit(ev) {
    ev.preventDefault();
    
    const amt = parseFloat(document.getElementById("logInputAmount").value);
    const desc = document.getElementById("logInputDesc").value;
    
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a positive numeric value.", "info");
      return;
    }
    
    // Deduct standard footprint factor
    let savedCO2 = 0.0;
    if (this.currentCategory === "transport") {
      savedCO2 = amt * 0.25; // 0.25 kg saved per mile
    } else if (this.currentCategory === "food") {
      savedCO2 = amt * 2.2;
    } else {
      savedCO2 = amt * 1.1;
    }
    
    // Format saved to one decimal place
    savedCO2 = parseFloat(savedCO2.toFixed(1));
    
    // Construct log object
    const newLog = {
      id: Date.now(),
      category: this.currentCategory,
      amount: amt,
      unit: this.currentCategory === "transport" ? "miles" : "units",
      co2e: -savedCO2,
      desc: desc,
      date: new Date().toISOString().split('T')[0]
    };
    
    // Push into logs array
    state.logs.unshift(newLog);
    
    // Increment achievements streak & user XP metrics
    state.user.xp += 30;
    state.user.coins += 15;
    state.user.streak += 1;
    
    // Update elements
    document.getElementById("streakCountText").innerText = state.user.streak;
    document.getElementById("profileLevelText").innerText = `XP: ${state.user.xp} • Lvl ${Math.floor(state.user.xp/200) + 1}`;
    document.getElementById("dashboardCoinsText").innerText = state.user.coins;
    
    // Refresh ledger UI
    this.renderTable();
    
    // Reset forms
    document.getElementById("dailyLogForm").reset();
    
    trackEvent("log_entry_added", { category: this.currentCategory, co2e: -savedCO2 });
    showToast("Habit recorded successfully! +30 XP +15 Coins", "success");
    
    // If transport logging is completed, check Challenge 1 status
    if (this.currentCategory === "transport") {
      const ch = state.challenges.find(c => c.id === "ch-1");
      if (ch && ch.status === "active") {
        ch.progress += 1.0;
        if (ch.progress >= ch.target) {
          appTwinSimulator.completeChallenge("ch-1");
        } else {
          appChallenges.render();
        }
      }
    }
  },

  renderTable() {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    state.logs.forEach(log => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><span class="logs-category-badge badge-${log.category}">${log.category}</span></td>
        <td>${log.amount} ${log.unit}</td>
        <td style="color: var(--accent-emerald); font-weight: 600;">${log.co2e} kg CO2e</td>
        <td>${log.date}</td>
      `;
      tbody.appendChild(row);
    });
  }
};

/* ==========================================================================
   6. CHALLENGES & LEADERBOARDS COMPONENT
   ========================================================================== */
const appChallenges = {
  render() {
    const list = document.getElementById("challengesListContainer");
    if (!list) return;
    
    list.innerHTML = "";
    state.challenges.forEach(ch => {
      const card = document.createElement("div");
      card.className = "challenge-card";
      
      let progressHTML = "";
      let actionBtn = "";
      
      if (ch.status === "active") {
        const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
        progressHTML = `
          <div style="width: 120px; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; margin-top: 4px; overflow:hidden;">
            <div style="width: ${pct}%; background: var(--accent-emerald); height: 100%; border-radius: 3px;"></div>
          </div>
          <span style="font-size:0.75rem; color: var(--text-secondary);">${ch.progress}/${ch.target} logged</span>
        `;
        actionBtn = `<button class="btn btn-secondary" disabled>Active</button>`;
      } else if (ch.status === "completed") {
        progressHTML = `<span style="color: var(--accent-emerald); font-size:0.85rem; font-weight: 600;">✓ Completed Campaign</span>`;
        actionBtn = `<button class="btn btn-secondary" style="border-color: var(--accent-emerald); color: var(--accent-emerald);" disabled>Claimed</button>`;
      } else {
        progressHTML = `<span style="font-size:0.85rem; color: var(--text-muted);">Join to track progress</span>`;
        actionBtn = `<button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="appChallenges.joinChallenge('${ch.id}')">Join</button>`;
      }
      
      card.innerHTML = `
        <div class="challenge-details">
          <span class="challenge-points">${ch.xpReward} XP Reward</span>
          <span class="challenge-title">${ch.title}</span>
          <span class="challenge-desc">${ch.desc}</span>
          ${progressHTML}
        </div>
        ${actionBtn}
      `;
      list.appendChild(card);
    });

    // Populate Leaderboard list
    const lb = document.getElementById("leaderboardContainer");
    if (lb) {
      const locations = [
        { rank: 1, name: "Seattle Collective", score: 92, status: "top1" },
        { rank: 2, name: "San Francisco Green", score: 86, status: "top2" },
        { rank: 3, name: "Berlin Zero Club", score: 81, status: "top3" },
        { rank: 4, name: "Austin Power-Eco", score: 74, status: "" },
        { rank: 5, name: "New York SmartGrid", score: 68, status: "" }
      ];
      
      lb.innerHTML = "";
      locations.forEach(loc => {
        const item = document.createElement("div");
        item.className = "leaderboard-item";
        item.innerHTML = `
          <div class="leaderboard-user">
            <span class="leaderboard-rank leaderboard-rank-${loc.status}">${loc.rank}</span>
            <span style="font-weight: 600;">${loc.name}</span>
          </div>
          <span style="font-weight: 700; color: var(--accent-emerald);">${loc.score} pts</span>
        `;
        lb.appendChild(item);
      });
    }
  },

  joinChallenge(id) {
    const ch = state.challenges.find(c => c.id === id);
    if (ch) {
      ch.status = "active";
      ch.progress = 0.0;
      trackEvent("challenge_joined", { title: ch.title });
      showToast(`Joined challenge: ${ch.title}. Start logging actions to earn rewards!`, "info");
      this.render();
    }
  }
};

/* ==========================================================================
   7. GREEN REWARDS MARKETPLACE
   ========================================================================== */
const appRewards = {
  render() {
    const grid = document.getElementById("rewardsStoreContainer");
    if (!grid) return;
    
    grid.innerHTML = "";
    state.rewards.forEach(rw => {
      const card = document.createElement("div");
      card.className = "glass-panel reward-item-card";
      
      let actionBtn = "";
      if (rw.claimed) {
        actionBtn = `
          <div style="background: rgba(16, 185, 129, 0.05); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px dashed var(--accent-emerald); text-align: center;">
            <span style="font-size:0.75rem; color: var(--text-secondary); display:block;">COUPON CODE</span>
            <code style="font-weight: 700; color: var(--accent-emerald); font-size: 0.95rem;">${rw.code}</code>
          </div>
        `;
      } else {
        const disabled = state.user.coins < rw.cost ? "disabled" : "";
        actionBtn = `
          <button class="btn btn-accent" style="width: 100%;" onclick="appRewards.claimReward('${rw.id}')" ${disabled}>
            Claim coupon (${rw.cost} Coins)
          </button>
        `;
      }
      
      card.innerHTML = `
        <span class="reward-value-tag">${rw.cost} Coins</span>
        <div class="reward-info-block">
          <span class="reward-company">${rw.company}</span>
          <h4 class="reward-title">${rw.title}</h4>
        </div>
        ${actionBtn}
      `;
      grid.appendChild(card);
    });
  },

  claimReward(id) {
    const rw = state.rewards.find(r => r.id === id);
    if (rw && state.user.coins >= rw.cost && !rw.claimed) {
      state.user.coins -= rw.cost;
      rw.claimed = true;
      
      // Update displays
      document.getElementById("dashboardCoinsText").innerText = state.user.coins;
      this.render();
      
      trackEvent("reward_claimed", { title: rw.title, cost: rw.cost });
      showToast(`Redeemed successfully! Coupon code: ${rw.code}`, "success");
    }
  }
};

/* ==========================================================================
   8. CLIMATE REPORTS & CHART FILTERING
   ========================================================================== */
const appReports = {
  filterReport(type) {
    trackEvent("report_filter_changed", { type });
    showToast(`Filtering report view by: ${type}`, "info");
    
    // Simulate minor change to column rendering values
    const chartBars = document.querySelectorAll(".chart-bar-fill");
    chartBars.forEach((bar, i) => {
      const randHeight = Math.floor(Math.random() * 40) + 40; // 40-80% height range
      bar.style.height = `${randHeight}%`;
      const valText = bar.previousElementSibling;
      if (valText) {
        valText.innerText = `${(randHeight * 0.15).toFixed(1)}t`;
      }
    });
  }
};



/* ==========================================================================
   10. THREE.JS 3D EXPERIENCES (LANDING EARTH & CARBON TWIN)
   ========================================================================== */
let earthRenderer, earthScene, earthCamera, earthSphere, earthParticles;
let twinRenderer, twinScene, twinCamera, twinMesh;

const app3DEarth = {
  isPaused: false,

  init() {
    const canvas = document.getElementById("landingEarthCanvas");
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene setup
    earthScene = new THREE.Scene();
    
    // Camera
    earthCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    earthCamera.position.z = 2.8;
    
    // Renderer
    earthRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    earthRenderer.setSize(width, height);
    earthRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    earthScene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0x0ea5e9, 1.5);
    dirLight.position.set(5, 3, 5);
    earthScene.add(dirLight);
    
    const accentLight = new THREE.DirectionalLight(0x10b981, 1.0);
    accentLight.position.set(-5, -3, -5);
    earthScene.add(accentLight);
    
    // Create Earth sphere geometry (wireframe grid to fit high-tech climate aesthetics)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x111e17,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    earthSphere = new THREE.Mesh(geometry, material);
    earthScene.add(earthSphere);
    
    // Add outer atmosphere glow ring using thin sphere
    const glowGeo = new THREE.SphereGeometry(1.05, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    earthSphere.add(glowSphere);
    
    // Add carbon particle streams (flowing nodes)
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Random points on sphere shell
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.0 + Math.random() * 0.05; // slightly above surface
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      velocities.push(new THREE.Vector3(x, y, z).multiplyScalar(0.002));
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x0ea5e9,
      size: 0.015,
      transparent: true,
      opacity: 0.75
    });
    
    earthParticles = new THREE.Points(particleGeometry, particleMaterial);
    earthSphere.add(earthParticles);
    
    // Drag rotation triggers
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };
      
      earthSphere.rotation.y += deltaMove.x * 0.005;
      earthSphere.rotation.x += deltaMove.y * 0.005;
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    // Render loop
    const animate = () => {
      if (this.isPaused) return;
      requestAnimationFrame(animate);
      
      // Auto rotate
      earthSphere.rotation.y += 0.0015;
      earthSphere.rotation.x += 0.0005;
      
      earthRenderer.render(earthScene, earthCamera);
    };
    
    animate();
    
    // Handle viewport resizing
    window.addEventListener('resize', () => {
      if (!earthRenderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      earthCamera.aspect = w / h;
      earthCamera.updateProjectionMatrix();
      earthRenderer.setSize(w, h);
    });
  },

  pause() { this.isPaused = true; },
  resume() { this.isPaused = false; this.init(); }
};

const app3DTwin = {
  init() {
    const canvas = document.getElementById("twin3DCanvas");
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    twinScene = new THREE.Scene();
    
    // Camera
    twinCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    twinCamera.position.z = 2.5;
    
    // Renderer
    twinRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    twinRenderer.setSize(width, height);
    twinRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    twinScene.add(ambient);
    
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 4, 3);
    twinScene.add(dir);
    
    // Polyhedron representing the Carbon Twin
    // We create a customizable geometry whose vertices we can morph based on environmental parameters
    const geometry = new THREE.IcosahedronGeometry(0.8, 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    
    twinMesh = new THREE.Mesh(geometry, material);
    twinScene.add(twinMesh);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Speed up rotation based on carbon density
      const speed = 0.005 + (100 - state.calculated.climateScore) * 0.0003;
      twinMesh.rotation.y += speed;
      twinMesh.rotation.x += speed * 0.4;
      
      twinRenderer.render(twinScene, twinCamera);
    };
    
    animate();
    
    // Trigger initial mesh configuration
    this.morphMesh(state.calculated.climateScore);
  },

  morphMesh(score) {
    if (!twinMesh) return;
    
    // Update color based on score (100 = full emerald green, 0 = pure crimson red)
    const color = new THREE.Color();
    if (score >= 75) {
      color.setHex(0x10b981); // Emerald
    } else if (score >= 45) {
      color.setHex(0xf59e0b); // Amber
    } else {
      color.setHex(0xf43f5e); // Rose
    }
    
    gsap.to(twinMesh.material.color, {
      r: color.r,
      g: color.g,
      b: color.b,
      duration: 0.5
    });
    
    // Morph vertices to make it "spiky" if the score is bad (emissions are high)
    // Score ranges 0-100. Lower score = spikier geometry.
    const spikiness = Math.max(0, (100 - score) * 0.0035);
    
    const positionAttribute = twinMesh.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Store baseline values if not present
    if (!this.baselinePositions) {
      this.baselinePositions = [];
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        this.baselinePositions.push(vertex.clone());
      }
    }
    
    // Distort vertices along their normals
    for (let i = 0; i < positionAttribute.count; i++) {
      const original = this.baselinePositions[i];
      const normal = original.clone().normalize();
      
      // Calculate spikiness factor using index frequency offsets
      const factor = 1.0 + Math.sin(i * 1.5) * spikiness;
      vertex.copy(original).multiplyScalar(factor);
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    positionAttribute.needsUpdate = true;
  },

  resize() {
    if (!twinRenderer) return;
    const canvas = document.getElementById("twin3DCanvas");
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    twinCamera.aspect = w / h;
    twinCamera.updateProjectionMatrix();
    twinRenderer.setSize(w, h);
  }
};

/* ==========================================================================
   INITIALIZATION TRIGGER ON DOCUMENT LOAD
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // 1. Set sidebar details
  document.getElementById("profileName").innerText = state.user.name;
  document.getElementById("sidebarAvatar").innerText = state.user.avatar;
  document.getElementById("streakCountText").innerText = state.user.streak;
  document.getElementById("profileLevelText").innerText = `XP: ${state.user.xp} • Lvl ${Math.floor(state.user.xp/200) + 1}`;
  document.getElementById("dashboardCoinsText").innerText = state.user.coins;
  
  // 2. Initialize 3D Earth Hero visualizer
  app3DEarth.init();
  
  // 3. Set standard quick log tab settings
  appLogs.setLogCategory("transport");
  
  // 4. Assign visual slider interactions
  document.getElementById("transportSlider").value = state.onboarding.transportVal;
  document.getElementById("energySlider").value = state.onboarding.energy;
  document.getElementById("waterSlider").value = state.onboarding.water;
  
  // 5. Expose submodules globally to let HTML calls resolve
  window.appRouter = appRouter;
  window.appOnboarding = appOnboarding;
  window.appTwinSimulator = appTwinSimulator;
  window.appLogs = appLogs;
  window.appReports = appReports;
  
  // Track platform boot audit trace
  trackEvent("platform_initialized");
});
