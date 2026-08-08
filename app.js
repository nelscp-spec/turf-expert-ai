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
  const elRunnersMobileCards = document.getElementById('runnersMobileCardsContainer');
  const elSynthesisText = document.getElementById('synthesisTextContainer');
  const elInputBudget = document.getElementById('inputBudget');
  const elBtnRecalculateBudget = document.getElementById('btnRecalculateBudget');
  const elSearchInput = document.getElementById('raceSearchInput');
  const elBtnSearch = document.getElementById('btnSearch');
  const elBtnRefresh = document.getElementById('btnRefreshRaces');
  const elTabButtons = document.querySelectorAll('.tab-btn');
  const elDatePicker = document.getElementById('datePickerInput');
  const elDropdown = document.getElementById('searchResultsDropdown');

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
    setupDatePicker();
    await loadProgramme();
  }

  // Calendar Navigation Controls
  const btnDatePrev = document.getElementById('btnDatePrev');
  const btnDateToday = document.getElementById('btnDateToday');
  const btnDateNext = document.getElementById('btnDateNext');
  const calendarNavInput = document.getElementById('calendarNavInput');
  const dateTitleText = document.getElementById('dateTitleText');

  let currentDateObj = new Date();

  function formatDateToDDMMYYYY(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${month}${year}`;
  }

  function formatDateToISO(d) {
    return d.toISOString().split('T')[0];
  }

  function formatPrettyDate(d) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const str = d.toLocaleDateString('fr-FR', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function setupDatePicker() {
    if (calendarNavInput) {
      calendarNavInput.value = formatDateToISO(currentDateObj);
      calendarNavInput.addEventListener('change', async (e) => {
        if (e.target.value) {
          const parts = e.target.value.split('-');
          currentDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          updateActiveCalendarBtn(null);
          await loadProgramme(formatDateToDDMMYYYY(currentDateObj));
        }
      });
    }

    if (btnDatePrev) {
      btnDatePrev.addEventListener('click', async () => {
        currentDateObj.setDate(currentDateObj.getDate() - 1);
        if (calendarNavInput) calendarNavInput.value = formatDateToISO(currentDateObj);
        updateActiveCalendarBtn(btnDatePrev);
        await loadProgramme(formatDateToDDMMYYYY(currentDateObj));
      });
    }

    if (btnDateToday) {
      btnDateToday.addEventListener('click', async () => {
        currentDateObj = new Date();
        if (calendarNavInput) calendarNavInput.value = formatDateToISO(currentDateObj);
        updateActiveCalendarBtn(btnDateToday);
        await loadProgramme(formatDateToDDMMYYYY(currentDateObj));
      });
    }

    if (btnDateNext) {
      btnDateNext.addEventListener('click', async () => {
        currentDateObj.setDate(currentDateObj.getDate() + 1);
        if (calendarNavInput) calendarNavInput.value = formatDateToISO(currentDateObj);
        updateActiveCalendarBtn(btnDateNext);
        await loadProgramme(formatDateToDDMMYYYY(currentDateObj));
      });
    }
  }

  function updateActiveCalendarBtn(activeBtn) {
    [btnDatePrev, btnDateToday, btnDateNext].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  // 2. Fetch Programme
  async function loadProgramme(dateStr = null) {
    elReunionsList.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Chargement du programme PMU...</div>`;
    
    let targetDateStr = dateStr || formatDateToDDMMYYYY(currentDateObj);

    try {
      const res = await fetch(`/api/programme?date=${targetDateStr}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          AppState.programme = data;
        } else {
          AppState.programme = await TurfData.getTodayProgramme(targetDateStr);
        }
      } else {
        AppState.programme = await TurfData.getTodayProgramme(targetDateStr);
      }
    } catch (e) {
      console.warn("Direct API proxy unavailable, using client dataset fallback:", e);
      AppState.programme = await TurfData.getTodayProgramme(targetDateStr);
    }

    const totalReunions = AppState.programme.length;
    const totalCourses = AppState.programme.reduce((acc, r) => acc + (r.courses ? r.courses.length : 0), 0);

    if (dateTitleText) {
      dateTitleText.textContent = `Programme du ${formatPrettyDate(currentDateObj)} : ${totalReunions} Réunions & ${totalCourses} Courses PMU`;
    }

    renderSidebarReunions();

    if (AppState.programme.length > 0 && AppState.programme[0].courses.length > 0) {
      selectCourse(AppState.programme[0].courses[0]);
    }
  }

  // 3. Render Sidebar Reunions & Races List
  function renderSidebarReunions() {
    if (!AppState.programme || AppState.programme.length === 0) {
      elReunionsList.innerHTML = `<p class="text-muted">Aucune réunion disponible pour cette date.</p>`;
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

    elReunionsList.querySelectorAll('.course-item').forEach(item => {
      item.addEventListener('click', () => {
        const courseId = item.getAttribute('data-course-id');
        let found = null;
        AppState.programme.forEach(r => {
          r.courses.forEach(c => {
            if (c.id === courseId) found = c;
          });
        });
        if (found) selectCourse(found);
      });
    });
  }

  // 4. Select and Analyze Race
  function selectCourse(course) {
    AppState.selectedCourse = course;

    let foundReunion = null;
    AppState.programme.forEach(r => {
      r.courses.forEach(c => {
        if (c.id === course.id) foundReunion = r;
      });
    });
    AppState.selectedReunion = foundReunion;

    renderSidebarReunions();

    elBannerReunionCode.textContent = course.id;
    elBannerRaceName.textContent = course.nom;
    elBannerDiscipline.textContent = course.discipline;
    elBannerRaceTime.textContent = course.heure;
    elBannerHippodrome.textContent = foundReunion ? foundReunion.hippodrome : 'Hippodrome';
    elBannerDistance.textContent = course.distance;
    elBannerAllocation.textContent = course.allocation;
    elBannerRunnersCount.textContent = `${course.partantsCount} Partants`;
    elBannerDifficulty.textContent = course.difficulte;

    AppState.analysisResult = TurfEngine.analyzeRace(course, AppState.budget);

    renderCombinations();
    renderRunnersTable();
    renderSynthesisText();
  }

  // 5. Render Betting Combinations Cards
  function renderCombinations() {
    if (!AppState.analysisResult || !AppState.analysisResult.tickets) return;

    const tickets = AppState.analysisResult.tickets;
    let filteredTickets = tickets;

    if (AppState.activeStrategy === 'SECURITE') {
      filteredTickets = tickets.filter(t => t.risk === 'Faible' || t.risk === 'Sécurisé');
    } else if (AppState.activeStrategy === 'EQUILIBRE') {
      filteredTickets = tickets.filter(t => t.risk === 'Modéré' || t.risk === 'Faible' || t.risk === 'Optimisé');
    }

    let html = '';
    filteredTickets.forEach(ticket => {
      const riskClass = ticket.risk === 'Faible' || ticket.risk === 'Sécurisé' ? 'green' : (ticket.risk === 'Modéré' || ticket.risk === 'Optimisé' ? 'blue' : 'purple');

      html += `
        <div class="combination-card glass-card">
          <div class="combination-header">
            <div>
              <h3 class="ticket-type-title">${ticket.type}</h3>
              <span class="badge-tag ${riskClass}">${ticket.strategy}</span>
            </div>
            <div class="ticket-stake">${ticket.stake} €</div>
          </div>

          <div class="ticket-numbers-box">
            ${ticket.numbers.map(n => `<span class="number-badge ${n.isFavorite ? 'fav' : ''}">${n.num}</span>`).join('')}
          </div>

          <p class="ticket-description">${ticket.reason}</p>

          <div class="ticket-footer-stats">
            <div class="stat-pill">
              <i class="fa-solid fa-bullseye"></i> Indice de Confiance: <strong>${ticket.confidence}%</strong>
            </div>
            <div class="stat-pill">
              <i class="fa-solid fa-chart-line"></i> Gain Estimé: <strong>${ticket.expectedReturn} €</strong>
            </div>
          </div>
        </div>
      `;
    });

    elCombinationsGrid.innerHTML = html;
  }

  // 6. Render Runners Table & Mobile Cards View
  function renderRunnersTable() {
    if (!AppState.analysisResult || !AppState.analysisResult.scoredRunners) return;

    const runners = AppState.analysisResult.scoredRunners;
    let tableHtml = '';
    let cardsHtml = '';

    runners.forEach(runner => {
      const rankBadge = runner.predictedRank === 1 ? 'rank-1' : (runner.predictedRank === 2 ? 'rank-2' : (runner.predictedRank === 3 ? 'rank-3' : 'rank-other'));
      const ferBadge = runner.fer === 'D4' ? '<span class="fer-badge d4" title="Déferré des 4">D4</span>' : 
                      (runner.fer === 'DP' ? '<span class="fer-badge dp" title="Déferré des postérieurs">DP</span>' : 
                      (runner.fer === 'DA' ? '<span class="fer-badge da" title="Déferré des antérieurs">DA</span>' : '<span class="fer-badge f">F</span>'));

      const favTag = runner.isValueBet ? '<span class="badge-tag green" style="font-size:0.65rem; padding: 2px 6px;">💡 VALUE BET</span>' : '';

      tableHtml += `
        <tr data-runner-num="${runner.num}">
          <td><span class="rank-pill ${rankBadge}">${runner.predictedRank}</span></td>
          <td><span class="horse-num-pill base">${runner.num}</span></td>
          <td>
            <div class="horse-name-cell">
              <strong>${runner.nom}</strong>
              <span class="text-muted" style="font-size:0.75rem;">${runner.ageSexe || ''}</span>
              ${favTag}
            </div>
          </td>
          <td><span class="jockey-name">${runner.jockey}</span></td>
          <td><span class="trainer-name">${runner.entraineur}</span></td>
          <td><span class="musique-code">${runner.musique}</span></td>
          <td>${ferBadge}</td>
          <td><strong style="color: var(--primary-amber); font-weight:700;">${runner.cote}</strong></td>
          <td>
            <div class="score-progress-bar">
              <div class="score-fill" style="width: ${runner.compositeScore}%;"></div>
              <span class="score-value">${runner.compositeScore} / 100</span>
            </div>
          </td>
          <td>
            <button class="btn-action-sm btn-horse-detail" data-runner-num="${runner.num}">
              <i class="fa-solid fa-eye"></i> Analyse
            </button>
          </td>
        </tr>
      `;

      cardsHtml += `
        <div class="runner-mobile-card glass-card">
          <div class="runner-card-header">
            <div class="runner-card-left">
              <span class="rank-pill ${rankBadge}">#${runner.predictedRank}</span>
              <span class="horse-num-pill base">${runner.num}</span>
              <div>
                <h4 class="runner-card-name">${runner.nom} ${favTag}</h4>
                <span class="runner-card-meta">${runner.ageSexe || ''} | ${ferBadge}</span>
              </div>
            </div>
            <div class="runner-card-cote">${runner.cote}</div>
          </div>

          <div class="runner-card-body">
            <div class="runner-card-info">
              <div><i class="fa-solid fa-user-ninja"></i> <strong>Driver:</strong> ${runner.jockey}</div>
              <div><i class="fa-solid fa-user-tie"></i> <strong>Entraîneur:</strong> ${runner.entraineur}</div>
              <div><i class="fa-solid fa-list-ol"></i> <strong>Musique:</strong> ${runner.musique}</div>
            </div>

            <div class="runner-card-score">
              <span>Score Algorithmique IA</span>
              <div class="score-progress-bar">
                <div class="score-fill" style="width: ${runner.compositeScore}%;"></div>
                <span class="score-value">${runner.compositeScore} / 100</span>
              </div>
            </div>
          </div>

          <button class="btn-action-sm btn-horse-detail" data-runner-num="${runner.num}" style="width: 100%; margin-top: 10px; padding: 8px;">
            <i class="fa-solid fa-eye"></i> Voir Fiche Détillée
          </button>
        </div>
      `;
    });

    elRunnersTableBody.innerHTML = tableHtml;
    if (elRunnersMobileCards) elRunnersMobileCards.innerHTML = cardsHtml;

    document.querySelectorAll('.btn-horse-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.getAttribute('data-runner-num'));
        const runner = runners.find(r => r.num === num);
        if (runner) openHorseModal(runner);
      });
    });
  }

  // 7. Render AI Synthesis Text
  function renderSynthesisText() {
    if (!AppState.analysisResult || !AppState.analysisResult.synthesis) return;
    const synth = AppState.analysisResult.synthesis;

    elSynthesisText.innerHTML = `
      <p class="synthesis-paragraph">
        <i class="fa-solid fa-robot text-cyan"></i> <strong>Synthèse Multicritères Spécialiste :</strong> ${synth.summary}
      </p>

      <div class="synthesis-key-points">
        <div class="key-point-card">
          <i class="fa-solid fa-trophy yellow"></i>
          <div>
            <strong>Base Incontournable :</strong>
            <p>${synth.favoriteNote}</p>
          </div>
        </div>

        <div class="key-point-card">
          <i class="fa-solid fa-bolt cyan"></i>
          <div>
            <strong>Outsider Séduisant (Value) :</strong>
            <p>${synth.outsiderNote}</p>
          </div>
        </div>

        <div class="key-point-card">
          <i class="fa-solid fa-eye green"></i>
          <div>
            <strong>Conseil Equidia & Direct PMU :</strong>
            <p>${synth.trendNote}</p>
          </div>
        </div>
      </div>
    `;
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
    elTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elTabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.activeStrategy = btn.getAttribute('data-strategy');
        renderCombinations();
      });
    });

    elBtnRecalculateBudget.addEventListener('click', () => {
      const budgetVal = parseInt(elInputBudget.value) || 20;
      AppState.budget = budgetVal;
      if (AppState.selectedCourse) {
        AppState.analysisResult = TurfEngine.analyzeRace(AppState.selectedCourse, AppState.budget);
        renderCombinations();
      }
    });

    elModalClose.addEventListener('click', () => {
      elModalOverlay.classList.remove('open');
    });

    elModalOverlay.addEventListener('click', (e) => {
      if (e.target === elModalOverlay) elModalOverlay.classList.remove('open');
    });

    elBtnRefresh.addEventListener('click', async () => {
      await loadProgramme();
    });

    // Multi-Field Live Search Logic with Dropdown Autocomplete
    function performSearchQuery(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        if (elDropdown) elDropdown.classList.remove('open');
        return [];
      }

      const matches = [];
      AppState.programme.forEach(reunion => {
        reunion.courses.forEach(course => {
          const code1 = `r${reunion.num}c${course.num}`.toLowerCase();
          const code2 = `r${reunion.num} c${course.num}`.toLowerCase();
          const code3 = `c${course.num}`.toLowerCase();

          let hitType = null;
          let hitDetail = '';

          if (code1.includes(q) || code2.includes(q) || code3 === q) {
            hitType = 'Code';
            hitDetail = `Course R${reunion.num}C${course.num}`;
          } else if (course.nom.toLowerCase().includes(q)) {
            hitType = 'Course';
            hitDetail = course.nom;
          } else if (reunion.hippodrome.toLowerCase().includes(q)) {
            hitType = 'Hippodrome';
            hitDetail = reunion.hippodrome;
          } else if (course.partants) {
            for (const p of course.partants) {
              if (p.nom.toLowerCase().includes(q)) {
                hitType = 'Cheval';
                hitDetail = `${p.nom} (#${p.num})`;
                break;
              } else if (p.jockey.toLowerCase().includes(q)) {
                hitType = 'Driver / Jockey';
                hitDetail = `${p.jockey} (${p.nom})`;
                break;
              } else if (p.entraineur && p.entraineur.toLowerCase().includes(q)) {
                hitType = 'Entraîneur';
                hitDetail = `${p.entraineur}`;
                break;
              }
            }
          }

          if (hitType) {
            matches.push({ reunion, course, hitType, hitDetail });
          }
        });
      });

      return matches;
    }

    function renderSearchResults(matches) {
      if (!elDropdown) return;

      if (matches.length === 0) {
        elDropdown.innerHTML = `<div class="search-result-item" style="cursor:default;"><span class="search-result-title" style="color:var(--text-muted);">Aucune course ou cheval trouvé pour cette recherche.</span></div>`;
        elDropdown.classList.add('open');
        return;
      }

      let html = '';
      matches.slice(0, 10).forEach(item => {
        html += `
          <div class="search-result-item" data-course-id="${item.course.id}">
            <div>
              <div class="search-result-title">R${item.reunion.num}C${item.course.num} - ${item.course.nom}</div>
              <div class="search-result-meta">${item.reunion.hippodrome} | ${item.course.heure} | <strong style="color:var(--primary-cyan);">${item.hitType} : ${item.hitDetail}</strong></div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-dim); font-size:0.8rem;"></i>
          </div>
        `;
      });

      elDropdown.innerHTML = html;
      elDropdown.classList.add('open');

      elDropdown.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
          const cId = el.getAttribute('data-course-id');
          let selected = null;
          AppState.programme.forEach(r => {
            r.courses.forEach(c => { if (c.id === cId) selected = c; });
          });
          if (selected) {
            selectCourse(selected);
            elDropdown.classList.remove('open');
            elSearchInput.value = `R${selected.reunionNum}C${selected.num} - ${selected.nom}`;
          }
        });
      });
    }

    elSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      if (q.trim().length >= 1) {
        const matches = performSearchQuery(q);
        renderSearchResults(matches);
      } else {
        if (elDropdown) elDropdown.classList.remove('open');
      }
    });

    const triggerSearchBtn = () => {
      const q = elSearchInput.value;
      const matches = performSearchQuery(q);
      if (matches.length > 0) {
        selectCourse(matches[0].course);
        if (elDropdown) elDropdown.classList.remove('open');
      } else {
        alert(`Aucun résultat trouvé pour "${q}".`);
      }
    };

    elBtnSearch.addEventListener('click', triggerSearchBtn);
    elSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearchBtn();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box-wrapper') && elDropdown) {
        elDropdown.classList.remove('open');
      }
    });
  }

  // Start Application
  init();
});
