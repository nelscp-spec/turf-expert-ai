/**
 * TurfExpert AI - Main Application Controller & UI Renderer
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Application State
  const AppState = {
    programme: [],
    selectedReunion: null,
    selectedCourse: null,
    activeStrategy: 'ALL', // 'ALL', 'SECURITE', 'EQUILIBRE'
    budget: 20,
    analysisResult: null
  };

  // DOM Elements
  const elReunionsList = document.getElementById('reunionsListContainer');
  const elCombinationsGrid = document.getElementById('combinationsGridContainer');
  const elRunnersTableBody = document.getElementById('runnersTableBody');
  const elSynthesisText = document.getElementById('synthesisTextContainer');
  const elInputBudget = document.getElementById('inputBudget');
  const elBtnRecalculateBudget = document.getElementById('btnRecalculateBudget');
  const elSearchInput = document.getElementById('raceSearchInput');
  const elBtnSearch = document.getElementById('btnSearch');
  const elBtnRefresh = document.getElementById('btnRefreshRaces');
  const elTabButtons = document.querySelectorAll('.tab-btn');

  // Modal Elements
  const elModalOverlay = document.getElementById('horseModalOverlay');
  const elModalClose = document.getElementById('btnModalClose');
  const elModalHeader = document.getElementById('modalHorseHeader');
  const elModalBody = document.getElementById('modalHorseBody');

  // Race Header Elements
  const elBannerReunionCode = document.getElementById('bannerReunionCode');
  const elBannerRaceName = document.getElementById('bannerRaceName');
  const elBannerDiscipline = document.getElementById('bannerDiscipline');
  const elBannerRaceTime = document.getElementById('bannerRaceTime');
  const elBannerHippodrome = document.getElementById('bannerHippodrome');
  const elBannerDistance = document.getElementById('bannerDistance');
  const elBannerAllocation = document.getElementById('bannerAllocation');
  const elBannerRunnersCount = document.getElementById('bannerRunnersCount');
  const elBannerDifficulty = document.getElementById('bannerDifficulty');

  // 1. Initialize Application
  async function init() {
    setupEventListeners();
    await loadProgramme();
  }

  // 2. Fetch Programme
  async function loadProgramme() {
    elReunionsList.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Chargement du programme hippique...</div>`;
    
    AppState.programme = await TurfData.getTodayProgramme();
    renderSidebarReunions();

    // Select default first race if available
    if (AppState.programme.length > 0 && AppState.programme[0].courses.length > 0) {
      selectCourse(AppState.programme[0].courses[0]);
    }
  }

  // 3. Render Sidebar Reunions & Races List
  function renderSidebarReunions() {
    if (!AppState.programme || AppState.programme.length === 0) {
      elReunionsList.innerHTML = `<p class="text-muted">Aucune réunion disponible pour aujourd'hui.</p>`;
      return;
    }

    let html = '';
    AppState.programme.forEach(reunion => {
      html += `
        <div class="reunion-block">
          <div class="reunion-header">
            <span>${reunion.hippodrome}</span>
            <span class="reunion-badge">${reunion.id}</span>
          </div>
          <div class="courses-list">
      `;

      reunion.courses.forEach(course => {
        const isActive = (AppState.selectedCourse && AppState.selectedCourse.id === course.id) ? 'active' : '';
        html += `
          <div class="course-item ${isActive}" data-course-id="${course.id}">
            <div class="course-title" title="${course.nom}">C${course.num} - ${course.nom}</div>
            <div class="course-time"><i class="fa-regular fa-clock"></i> ${course.heure}</div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    elReunionsList.innerHTML = html;

    // Attach click handlers to course items
    document.querySelectorAll('.course-item').forEach(item => {
      item.addEventListener('click', () => {
        const courseId = item.getAttribute('data-course-id');
        const foundCourse = findCourseById(courseId);
        if (foundCourse) {
          selectCourse(foundCourse);
        }
      });
    });
  }

  function findCourseById(courseId) {
    for (const r of AppState.programme) {
      for (const c of r.courses) {
        if (c.id === courseId) return c;
      }
    }
    return null;
  }

  // 4. Select and Analyze Course
  function selectCourse(course) {
    AppState.selectedCourse = course;
    renderSidebarReunions(); // update active class

    // Update Banner
    elBannerReunionCode.textContent = `R${course.reunionNum} C${course.num}`;
    elBannerRaceName.textContent = course.nom;
    elBannerDiscipline.textContent = course.discipline;
    elBannerRaceTime.innerHTML = `<i class="fa-regular fa-clock"></i> Départ : ${course.heure}`;
    elBannerHippodrome.textContent = course.hippodrome || "Paris-Vincennes";
    elBannerDistance.textContent = `${course.distance} (${course.piste})`;
    elBannerAllocation.textContent = course.allocation;
    elBannerRunnersCount.textContent = `${course.partantsCount} chevaux`;
    elBannerDifficulty.textContent = course.difficulte || "Moyen (7/10)";

    // Run Specialist Turf Analysis Engine
    AppState.analysisResult = TurfEngine.analyzeRace(course, AppState.budget);

    // Render Dashboard Components
    renderCombinations();
    renderRunnersTable();
    renderSynthesis();
  }

  // 5. Render Betting Combination Cards
  function renderCombinations() {
    if (!AppState.analysisResult) return;

    let tickets = AppState.analysisResult.combinations;

    // Filter by user selected strategy
    if (AppState.activeStrategy === 'SECURITE') {
      tickets = tickets.filter(t => t.strategie === 'SECURITE');
    } else if (AppState.activeStrategy === 'EQUILIBRE') {
      tickets = tickets.filter(t => t.strategie === 'EQUILIBRE');
    }

    if (tickets.length === 0) {
      elCombinationsGrid.innerHTML = `<p class="text-muted">Aucune combinaison correspondant au filtre sélectionné.</p>`;
      return;
    }

    let html = '';
    tickets.forEach(ticket => {
      const cardStyleClass = ticket.strategie.toLowerCase();

      html += `
        <div class="ticket-card ${cardStyleClass}">
          <div>
            <div class="ticket-header">
              <div>
                <h4 class="ticket-type">${ticket.titre}</h4>
                <span class="ticket-formula">${ticket.formule}</span>
              </div>
              <span class="confidence-badge ${ticket.confidenceClass}">
                <i class="fa-solid fa-circle-check"></i> ${ticket.badge}
              </span>
            </div>

            <div class="horses-selection-list">
      `;

      ticket.chevaux.forEach((horse, idx) => {
        let pillClass = 'base';
        if (horse.role.includes('Favori') || horse.role.includes('Sécurité')) pillClass = 'fav';
        if (horse.role.includes('Tocard') || horse.role.includes('Outsider')) pillClass = 'outsider';

        html += `
          <div class="selection-row">
            <div class="horse-info-mini">
              <span class="horse-num-pill ${pillClass}">${horse.num}</span>
              <div>
                <span class="horse-name-mini">${horse.nom}</span>
                <span class="horse-role-tag ${horse.roleClass}">${horse.role}</span>
              </div>
            </div>
            <span class="horse-odds-mini">${horse.cote}</span>
          </div>
        `;
      });

      html += `
            </div>

            <div class="ticket-rationale">
              <i class="fa-solid fa-lightbulb text-amber"></i> ${ticket.rationale}
            </div>
          </div>

          <div class="ticket-footer">
            <div class="stake-amount">
              <span class="stake-label">Mise suggérée :</span>
              <span class="stake-val">${ticket.miseConseillee}</span>
            </div>
            <button class="btn-place-bet" onclick="alert('Ticket prêt ! Vous pouvez valider ce jeu sur votre compte PMU ou point de vente.')">
              <i class="fa-solid fa-check"></i> Préparer le Pari
            </button>
          </div>
        </div>
      `;
    });

    elCombinationsGrid.innerHTML = html;
  }

  // 6. Render Runners Table
  function renderRunnersTable() {
    if (!AppState.analysisResult) return;

    const runners = AppState.analysisResult.runners;
    let html = '';

    runners.forEach(runner => {
      // Fer Badge
      let ferClass = 'fer-f';
      if (runner.fer === 'D4') ferClass = 'fer-d4';
      if (runner.fer === 'DP') ferClass = 'fer-dp';
      if (runner.fer === 'DA') ferClass = 'fer-da';

      // Stars
      const starCount = Math.min(5, Math.max(1, Math.round((runner.presseScore || 5) / 2)));
      const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(starCount);

      html += `
        <tr>
          <td><span class="runner-num-badge">${runner.num}</span></td>
          <td>
            <div class="runner-name-box">
              <span class="runner-name">${runner.nom}</span>
              <span class="runner-sire">${runner.ageSexe || ''} - ${runner.gains || ''}</span>
            </div>
          </td>
          <td><span class="fer-badge ${ferClass}"><i class="fa-solid fa-shoe-prints"></i> ${runner.fer || 'F'}</span></td>
          <td><strong>${runner.jockey}</strong></td>
          <td>${runner.entraineur}</td>
          <td><span class="musique-pill">${runner.musique}</span></td>
          <td><span class="press-stars">${starsHtml}</span> (${runner.presseScore}/10)</td>
          <td><span class="odds-value">${runner.cote}</span></td>
          <td>
            <div class="score-bar-box">
              <div class="score-bar-bg">
                <div class="score-bar-fill" style="width: ${runner.compositeScore}%"></div>
              </div>
              <span class="score-num">${runner.compositeScore}</span>
            </div>
          </td>
          <td>
            <button class="btn-detail" data-runner-num="${runner.num}" title="Fiche détaillée">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </td>
        </tr>
      `;
    });

    elRunnersTableBody.innerHTML = html;

    // Attach click listeners for detail buttons
    document.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const num = parseInt(btn.getAttribute('data-runner-num'));
        const runner = runners.find(r => r.num === num);
        if (runner) openHorseModal(runner);
      });
    });
  }

  // 7. Render Synthesis
  function renderSynthesis() {
    if (!AppState.analysisResult) return;
    elSynthesisText.innerHTML = AppState.analysisResult.synthesisText;
  }

  // 8. Horse Detail Modal Handler
  function openHorseModal(runner) {
    elModalHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="horse-num-pill base" style="width: 38px; height: 38px; font-size: 1.1rem;">${runner.num}</span>
        <div>
          <h3>${runner.nom}</h3>
          <span class="text-muted">${runner.ageSexe || ''} | Gains: ${runner.gains || 'N/A'}</span>
        </div>
      </div>
    `;

    elModalBody.innerHTML = `
      <div class="modal-stat-grid">
        <div class="modal-stat-card">
          <span>Score Algorithmique IA</span>
          <strong>${runner.compositeScore} / 100</strong>
        </div>
        <div class="modal-stat-card">
          <span>Cote PMU Direct</span>
          <strong style="color: var(--primary-amber);">${runner.cote}</strong>
        </div>
        <div class="modal-stat-card">
          <span>Driver / Jockey</span>
          <strong>${runner.jockey}</strong>
        </div>
        <div class="modal-stat-card">
          <span>Entraîneur</span>
          <strong>${runner.entraineur}</strong>
        </div>
      </div>

      <div class="modal-stat-card">
        <span>Musique / Historique de Forme</span>
        <strong style="font-family: var(--font-heading); color: #fff;">${runner.musique}</strong>
      </div>

      <div class="modal-stat-card">
        <span>Avis Spécialiste Equidia & Paris-Turf</span>
        <p style="margin-top: 6px; color: var(--text-main);">${runner.avisExpert || 'Cheval très régulier en pleine possession de ses moyens.'}</p>
      </div>
    `;

    elModalOverlay.classList.add('open');
  }

  // 9. Event Listeners Setup
  function setupEventListeners() {
    // Strategy Tab Buttons
    elTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.activeStrategy = btn.getAttribute('data-strategy');
        renderCombinations();
      });
    });

    // Budget Recalculate Button
    elBtnRecalculateBudget.addEventListener('click', () => {
      const budgetVal = parseInt(elInputBudget.value) || 20;
      AppState.budget = budgetVal;
      if (AppState.selectedCourse) {
        AppState.analysisResult = TurfEngine.analyzeRace(AppState.selectedCourse, AppState.budget);
        renderCombinations();
      }
    });

    // Modal Close
    elModalClose.addEventListener('click', () => {
      elModalOverlay.classList.remove('open');
    });

    elModalOverlay.addEventListener('click', (e) => {
      if (e.target === elModalOverlay) elModalOverlay.classList.remove('open');
    });

    // Refresh Races Button
    elBtnRefresh.addEventListener('click', async () => {
      await loadProgramme();
    });

    // Search Bar Execution
    const performSearch = () => {
      const query = elSearchInput.value.trim().toLowerCase();
      if (!query) return;

      let found = null;
      for (const r of AppState.programme) {
        for (const c of r.courses) {
          if (c.nom.toLowerCase().includes(query) || 
              r.hippodrome.toLowerCase().includes(query) ||
              `r${r.num}c${c.num}`.toLowerCase().includes(query)) {
            found = c;
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        selectCourse(found);
      } else {
        alert(`Aucune course correspondant à "${query}" trouvée dans le programme.`);
      }
    };

    elBtnSearch.addEventListener('click', performSearch);
    elSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Run app
  init();
});
