// Shadowverse Battle Analyzer - Main Logic (with Seasons & Card Rotation Support)

// Storage Keys
const STORAGE_SEASONS_KEY = 'sv_analyzer_seasons_v2';
const STORAGE_CURRENT_SEASON_KEY = 'sv_analyzer_current_season_v2';
const STORAGE_DECKS_KEY = 'sv_analyzer_decks_v2';
const STORAGE_MATCHES_KEY = 'sv_analyzer_matches_v2';
const STORAGE_LAST_DECK_KEY = 'sv_analyzer_last_deck_v2';

// SV Classes Definition
const SV_CLASSES = [
  { id: 'エルフ', name: 'エルフ', en: 'Forest', colorClass: 'badge-forest', icon: 'tree-pine' },
  { id: 'ロイヤル', name: 'ロイヤル', en: 'Sword', colorClass: 'badge-sword', icon: 'shield' },
  { id: 'ウィッチ', name: 'ウィッチ', en: 'Rune', colorClass: 'badge-rune', icon: 'sparkles' },
  { id: 'ドラゴン', name: 'ドラゴン', en: 'Dragon', colorClass: 'badge-dragon', icon: 'flame' },
  { id: 'ネクロマンサー', name: 'ネクロ', en: 'Shadow', colorClass: 'badge-shadow', icon: 'skull' },
  { id: 'ヴァンパイア', name: 'ヴァンプ', en: 'Blood', colorClass: 'badge-blood', icon: 'droplet' },
  { id: 'ビショップ', name: 'ビショップ', en: 'Haven', colorClass: 'badge-haven', icon: 'sun' },
  { id: 'ネメシス', name: 'ネメシス', en: 'Portal', colorClass: 'badge-portal', icon: 'orbit' },
  { id: 'ナイトメア', name: 'ナイトメア', en: 'Nightmare', colorClass: 'badge-nightmare', icon: 'moon' }
];

// Initial Default Seasons
const DEFAULT_SEASONS = [
  { id: 'season-current', name: '現環境 (Season 1 / 最新弾)', createdAt: Date.now() - 3600000 * 24 * 30 }
];

// Default Decks
const DEFAULT_MY_DECKS = [
  { id: 'deck-1', name: '進化ロイヤル', class: 'ロイヤル', status: 'active', notes: 'カゲミツ・オクトー軸。新弾でも現役', createdAt: Date.now() - 3600000 * 24 * 10 },
  { id: 'deck-2', name: '秘術ウィッチ', class: 'ウィッチ', status: 'active', notes: 'ノーマン・パメラ軸', createdAt: Date.now() - 3600000 * 24 * 5 },
  { id: 'deck-3', name: 'マガキエルフ', class: 'エルフ', status: 'active', notes: 'バウンス打点管理', createdAt: Date.now() - 3600000 * 24 * 3 },
  { id: 'deck-4', name: '旧・結晶ビショップ', class: 'ビショップ', status: 'archived', notes: '【スタン落ち】スカルフェイン落ちのため保管庫へ', createdAt: Date.now() - 3600000 * 24 * 40 }
];

// App State
let seasons = [];
let currentSeasonId = '';
let myDecks = [];
let matches = [];
let selectedTurn = '先攻';
let selectedResult = 'WIN';
let selectedOppClass = 'ロイヤル';
let deckTabFilter = 'active'; // 'active' or 'archived'
let shareChartInstance = null;
let winrateChartInstance = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupClassSelector();
  setupTurnAndResultButtons();
  setupFormHandlers();
  setupTabNavigation();
  setupSeasonManagement();
  setupFiltersAndSearch();
  setupDataManagement();
  setupQuickMemoTags();

  renderAll();
  lucide.createIcons();
});

// Load and Migrate Data
function loadData() {
  // 1. Seasons
  const savedSeasons = localStorage.getItem(STORAGE_SEASONS_KEY);
  if (savedSeasons) {
    try {
      seasons = JSON.parse(savedSeasons);
    } catch (e) {
      seasons = [...DEFAULT_SEASONS];
    }
  } else {
    seasons = [...DEFAULT_SEASONS];
    saveSeasons();
  }

  // Current Season
  currentSeasonId = localStorage.getItem(STORAGE_CURRENT_SEASON_KEY);
  if (!currentSeasonId || !seasons.some(s => s.id === currentSeasonId)) {
    currentSeasonId = seasons[0].id;
    localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);
  }

  // 2. Decks (handle legacy format migration)
  const savedDecks = localStorage.getItem(STORAGE_DECKS_KEY) || localStorage.getItem('sv_analyzer_decks_v1');
  if (savedDecks) {
    try {
      myDecks = JSON.parse(savedDecks).map(d => ({
        status: 'active',
        notes: '',
        ...d
      }));
    } catch (e) {
      myDecks = [...DEFAULT_MY_DECKS];
    }
  } else {
    myDecks = [...DEFAULT_MY_DECKS];
    saveDecks();
  }

  // 3. Matches
  const savedMatches = localStorage.getItem(STORAGE_MATCHES_KEY) || localStorage.getItem('sv_analyzer_matches_v1');
  if (savedMatches) {
    try {
      matches = JSON.parse(savedMatches).map(m => ({
        seasonId: currentSeasonId,
        ...m
      }));
    } catch (e) {
      matches = [];
    }
  }
}

function saveSeasons() {
  localStorage.setItem(STORAGE_SEASONS_KEY, JSON.stringify(seasons));
}

function saveDecks() {
  localStorage.setItem(STORAGE_DECKS_KEY, JSON.stringify(myDecks));
}

function saveMatches() {
  localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches));
}

// Season Management Setup
function setupSeasonManagement() {
  const globalSelect = document.getElementById('global-season-select');
  const analyticsSeasonFilter = document.getElementById('analytics-season-filter');
  const historySeasonFilter = document.getElementById('history-filter-season');

  // Change active global season
  globalSelect.addEventListener('change', () => {
    currentSeasonId = globalSelect.value;
    localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);
    
    // Also sync analytics season filter if it was tracking current
    analyticsSeasonFilter.value = currentSeasonId;
    
    renderAll();
    lucide.createIcons();
  });

  // Analytics season filter change
  analyticsSeasonFilter.addEventListener('change', () => {
    renderAnalytics();
  });

  // History season filter change
  historySeasonFilter.addEventListener('change', () => {
    renderHistory();
  });

  // Modal: New Season
  const newSeasonModal = document.getElementById('new-season-modal');
  const btnOpenNewSeason = document.getElementById('btn-open-new-season');
  const btnCloseNewSeasonModal = document.getElementById('btn-close-new-season-modal');
  const btnCancelNewSeason = document.getElementById('btn-cancel-new-season');
  const btnConfirmNewSeason = document.getElementById('btn-confirm-new-season');

  btnOpenNewSeason.addEventListener('click', () => {
    openNewSeasonModal();
  });

  btnCloseNewSeasonModal.addEventListener('click', () => {
    newSeasonModal.classList.add('hidden');
  });

  btnCancelNewSeason.addEventListener('click', () => {
    newSeasonModal.classList.add('hidden');
  });

  btnConfirmNewSeason.addEventListener('click', () => {
    handleCreateNewSeason();
  });
}

function openNewSeasonModal() {
  const modal = document.getElementById('new-season-modal');
  const nameInput = document.getElementById('new-season-name-input');
  nameInput.value = '';

  // Render active decks checkbox list for transition
  const container = document.getElementById('season-transition-decks-list');
  container.innerHTML = '';

  const activeDecks = myDecks.filter(d => d.status === 'active');
  if (activeDecks.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 py-1">現在現役のデッキがありません。</p>';
  } else {
    activeDecks.forEach(deck => {
      const row = document.createElement('label');
      row.className = 'flex items-center justify-between p-2 rounded-lg bg-[#141b27] hover:bg-[#1b2434] cursor-pointer text-xs border border-[#26334a]';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <input type="checkbox" class="deck-transition-checkbox rounded text-cyan-500 focus:ring-cyan-500" value="${deck.id}" checked>
          <span class="px-1.5 py-0.5 rounded text-[10px] border ${getClassBadge(deck.class)}">${deck.class}</span>
          <span class="font-semibold text-gray-200">${escapeHtml(deck.name)}</span>
        </div>
        <span class="text-[10px] text-emerald-400 font-medium">新環境でも続投</span>
      `;

      const chk = row.querySelector('input');
      chk.addEventListener('change', () => {
        const badge = row.querySelector('span:last-child');
        if (chk.checked) {
          badge.className = 'text-[10px] text-emerald-400 font-medium';
          badge.textContent = '新環境でも続投';
        } else {
          badge.className = 'text-[10px] text-amber-400 font-medium';
          badge.textContent = 'スタン落ち保管庫へ';
        }
      });

      container.appendChild(row);
    });
  }

  modal.classList.remove('hidden');
  nameInput.focus();
}

function handleCreateNewSeason() {
  const nameInput = document.getElementById('new-season-name-input');
  const name = nameInput.value.trim();
  if (!name) {
    alert('新シーズン・環境名を入力してください（例: 第34弾 新パック環境）');
    nameInput.focus();
    return;
  }

  const newSeasonId = 'season-' + Date.now();
  const newSeason = {
    id: newSeasonId,
    name: name,
    createdAt: Date.now()
  };

  seasons.unshift(newSeason);
  currentSeasonId = newSeasonId;
  saveSeasons();
  localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);

  // Process deck transitions (active vs archived)
  const checkboxes = document.querySelectorAll('.deck-transition-checkbox');
  const keptDeckIds = new Set();
  checkboxes.forEach(cb => {
    if (cb.checked) {
      keptDeckIds.add(cb.value);
    }
  });

  // Archive decks not kept
  checkboxes.forEach(cb => {
    if (!cb.checked) {
      const d = myDecks.find(deck => deck.id === cb.value);
      if (d) {
        d.status = 'archived';
        if (!d.notes.includes('スタン落ち')) {
          d.notes = (d.notes ? d.notes + ' ' : '') + `【${name}にてスタン落ち・保管庫へ】`;
        }
      }
    }
  });
  saveDecks();

  document.getElementById('new-season-modal').classList.add('hidden');
  renderAll();
  lucide.createIcons();

  alert(`新シーズン「${name}」を開始しました！\n使えなくなったデッキは「スタン落ち・保管庫」に整理されました。`);
}

// Render Season Selectors across the app
function renderSeasonSelectors() {
  const globalSelect = document.getElementById('global-season-select');
  const analyticsSeasonFilter = document.getElementById('analytics-season-filter');
  const historySeasonFilter = document.getElementById('history-filter-season');
  const badge = document.getElementById('record-current-season-badge');

  const currentSeason = seasons.find(s => s.id === currentSeasonId) || seasons[0];
  if (badge && currentSeason) {
    badge.textContent = currentSeason.name;
  }

  // 1. Header Global Season Select
  globalSelect.innerHTML = '';
  seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (s.id === currentSeasonId) opt.selected = true;
    globalSelect.appendChild(opt);
  });

  // 2. Analytics Season Filter
  const prevAnalyticsVal = analyticsSeasonFilter.value || currentSeasonId;
  analyticsSeasonFilter.innerHTML = `
    <option value="${currentSeasonId}">現シーズン (${currentSeason ? currentSeason.name : ''}) のみ</option>
    <option value="ALL">全シーズン総合 (通算データ)</option>
  `;
  seasons.forEach(s => {
    if (s.id !== currentSeasonId) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `過去: ${s.name}`;
      analyticsSeasonFilter.appendChild(opt);
    }
  });
  if (Array.from(analyticsSeasonFilter.options).some(o => o.value === prevAnalyticsVal)) {
    analyticsSeasonFilter.value = prevAnalyticsVal;
  }

  // 3. History Season Filter
  const prevHistoryVal = historySeasonFilter.value || 'ALL';
  historySeasonFilter.innerHTML = '<option value="ALL">全シーズン</option>';
  seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.id === currentSeasonId ? `現: ${s.name}` : s.name;
    historySeasonFilter.appendChild(opt);
  });
  if (Array.from(historySeasonFilter.options).some(o => o.value === prevHistoryVal)) {
    historySeasonFilter.value = prevHistoryVal;
  }
}

// Setup Class Selector Grid
function setupClassSelector() {
  const container = document.getElementById('opponent-class-selector');
  container.innerHTML = '';

  SV_CLASSES.forEach(cls => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `class-btn py-2 px-1 rounded-xl border border-[#2b3548] bg-[#141b28] flex flex-col items-center gap-1 text-[11px] font-semibold text-gray-300 hover:border-cyan-400 ${cls.id === selectedOppClass ? 'active' : ''}`;
    btn.dataset.classId = cls.id;
    btn.innerHTML = `
      <i data-lucide="${cls.icon}" class="w-4 h-4"></i>
      <span>${cls.name}</span>
    `;

    btn.addEventListener('click', () => {
      document.querySelectorAll('#opponent-class-selector .class-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedOppClass = cls.id;
      updateOpponentDeckSuggestions();
    });

    container.appendChild(btn);
  });
}

// Update Opponent Deck Suggestions (Prioritizing CURRENT SEASON)
function updateOpponentDeckSuggestions() {
  const container = document.getElementById('opp-deck-suggestions');
  container.innerHTML = '';

  // Current Season matches first
  const currentSeasonMatches = matches.filter(m => m.seasonId === currentSeasonId && m.oppClass === selectedOppClass);
  const currentSeasonCounts = {};
  currentSeasonMatches.forEach(m => {
    if (m.oppDeckName) currentSeasonCounts[m.oppDeckName] = (currentSeasonCounts[m.oppDeckName] || 0) + 1;
  });

  // All time matches
  const allMatches = matches.filter(m => m.oppClass === selectedOppClass);
  const allCounts = {};
  allMatches.forEach(m => {
    if (m.oppDeckName) allCounts[m.oppDeckName] = (allCounts[m.oppDeckName] || 0) + 1;
  });

  const defaults = {
    'エルフ': ['マガキエルフ', 'カステルエルフ', 'テンポエルフ', 'リノエルフ'],
    'ロイヤル': ['進化ロイヤル', '連携ロイヤル', '財宝ロイヤル', '指揮官ロイヤル'],
    'ウィッチ': ['秘術ウィッチ', 'スペルウィッチ', 'マナリアウィッチ', 'チェスウィッチ'],
    'ドラゴン': ['ランプドラゴン', 'バフドラゴン', '武装ドラゴン', 'ディスカードドラゴン'],
    'ネクロマンサー': ['ラストワードネクロ', 'ゴーストネクロ', '葬送ネクロ', '進化ネクロ'],
    'ヴァンパイア': ['狂乱ヴァンパイア', '復讐ヴァンパイア', '進化ヴァンパイア', 'ハンドレスヴァンパイア'],
    'ビショップ': ['結晶ビショップ', 'エルヴィーラビショップ', '守護ビショップ', '消滅ビショップ'],
    'ネメシス': ['機械ネメシス', 'アーティファクトネメシス', '進化ネメシス', '人形ネメシス'],
    'ナイトメア': ['アグロナイトメア', 'ミッドレンジナイトメア', 'コントロールナイトメア']
  };

  const sortedCurrent = Object.keys(currentSeasonCounts).sort((a, b) => currentSeasonCounts[b] - currentSeasonCounts[a]);
  const sortedAll = Object.keys(allCounts).sort((a, b) => allCounts[b] - allCounts[a]);
  const defaultList = defaults[selectedOppClass] || [];

  const combined = Array.from(new Set([...sortedCurrent, ...sortedAll, ...defaultList])).slice(0, 8);

  if (combined.length === 0) {
    container.innerHTML = '<span class="text-xs text-gray-500 italic">候補なし（直接入力してください）</span>';
    return;
  }

  combined.forEach(deckName => {
    const isCurrentHot = currentSeasonCounts[deckName] > 0;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `px-2.5 py-1 rounded-lg border text-xs transition flex items-center gap-1 ${
      isCurrentHot 
        ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200 hover:border-cyan-400' 
        : 'bg-[#20293a] border-[#2e3b52] text-gray-300 hover:bg-[#28354c]'
    }`;
    chip.innerHTML = `
      ${isCurrentHot ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>' : ''}
      <span>${escapeHtml(deckName)}</span>
    `;
    
    chip.addEventListener('click', () => {
      const input = document.getElementById('opp-deck-input');
      input.value = deckName;
      input.focus();
    });

    container.appendChild(chip);
  });
}

// Setup Turn & Result Buttons
function setupTurnAndResultButtons() {
  const turnFirst = document.getElementById('btn-turn-first');
  const turnSecond = document.getElementById('btn-turn-second');

  function updateTurnUI() {
    if (selectedTurn === '先攻') {
      turnFirst.className = 'turn-btn py-2.5 px-3 rounded-xl border border-amber-500/60 bg-amber-950/40 text-amber-300 text-sm font-bold flex items-center justify-center gap-2 transition';
      turnSecond.className = 'turn-btn py-2.5 px-3 rounded-xl border border-[#2e3a52] bg-[#1a2233] text-gray-400 text-sm font-bold flex items-center justify-center gap-2 transition';
    } else {
      turnFirst.className = 'turn-btn py-2.5 px-3 rounded-xl border border-[#2e3a52] bg-[#1a2233] text-gray-400 text-sm font-bold flex items-center justify-center gap-2 transition';
      turnSecond.className = 'turn-btn py-2.5 px-3 rounded-xl border border-indigo-500/60 bg-indigo-950/40 text-indigo-300 text-sm font-bold flex items-center justify-center gap-2 transition';
    }
  }

  turnFirst.addEventListener('click', () => { selectedTurn = '先攻'; updateTurnUI(); });
  turnSecond.addEventListener('click', () => { selectedTurn = '後攻'; updateTurnUI(); });
  updateTurnUI();

  const winBtn = document.getElementById('btn-result-win');
  const loseBtn = document.getElementById('btn-result-lose');

  function updateResultUI() {
    if (selectedResult === 'WIN') {
      winBtn.className = 'result-btn py-2.5 px-3 rounded-xl border border-emerald-500 bg-emerald-950/60 text-emerald-300 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition';
      loseBtn.className = 'result-btn py-2.5 px-3 rounded-xl border border-[#2e3a52] bg-[#1a2233] text-gray-400 text-sm font-extrabold flex items-center justify-center gap-2 transition';
    } else {
      winBtn.className = 'result-btn py-2.5 px-3 rounded-xl border border-[#2e3a52] bg-[#1a2233] text-gray-400 text-sm font-extrabold flex items-center justify-center gap-2 transition';
      loseBtn.className = 'result-btn py-2.5 px-3 rounded-xl border border-rose-500 bg-rose-950/60 text-rose-300 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition';
    }
  }

  winBtn.addEventListener('click', () => { selectedResult = 'WIN'; updateResultUI(); });
  loseBtn.addEventListener('click', () => { selectedResult = 'LOSE'; updateResultUI(); });
  updateResultUI();
}

// Quick Memo Tags
function setupQuickMemoTags() {
  document.querySelectorAll('.quick-memo-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const memoField = document.getElementById('match-memo');
      const text = tag.textContent.trim();
      if (memoField.value) {
        memoField.value += ` 【${text}】`;
      } else {
        memoField.value = `【${text}】 `;
      }
      memoField.focus();
    });
  });
}

// Form Handlers
function setupFormHandlers() {
  // Record Match Form
  const form = document.getElementById('record-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const deckSelect = document.getElementById('my-deck-select');
    const myDeckId = deckSelect.value;
    const oppDeckInput = document.getElementById('opp-deck-input');
    const oppDeckName = oppDeckInput.value.trim() || `${selectedOppClass}不明`;
    const memo = document.getElementById('match-memo').value.trim();

    if (!myDeckId) {
      alert('自分の現役デッキを選択してください。デッキがない場合は「新規デッキ登録」から作成してください。');
      return;
    }

    const currentMyDeck = myDecks.find(d => d.id === myDeckId);
    const myDeckName = currentMyDeck ? currentMyDeck.name : '不明なデッキ';

    const newMatch = {
      id: 'match-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      seasonId: currentSeasonId,
      date: new Date().toISOString(),
      myDeckId: myDeckId,
      myDeckName: myDeckName,
      oppClass: selectedOppClass,
      oppDeckName: oppDeckName,
      turn: selectedTurn,
      result: selectedResult,
      memo: memo,
      createdAt: Date.now()
    };

    matches.unshift(newMatch);
    saveMatches();
    localStorage.setItem(STORAGE_LAST_DECK_KEY, myDeckId);

    // Reset inputs
    oppDeckInput.value = '';
    document.getElementById('match-memo').value = '';

    renderAll();
    lucide.createIcons();

    // Visual feedback
    const submitBtn = document.getElementById('btn-submit-match');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> 保存完了！`;
    submitBtn.classList.replace('from-cyan-600', 'from-emerald-600');
    lucide.createIcons();
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.classList.replace('from-emerald-600', 'from-cyan-600');
      lucide.createIcons();
    }, 1200);
  });

  // Deck Manage Form
  const deckForm = document.getElementById('deck-manage-form');
  deckForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-deck-name');
    const classSelect = document.getElementById('new-deck-class');
    const notesInput = document.getElementById('new-deck-notes');
    const name = nameInput.value.trim();
    const cls = classSelect.value;
    const notes = notesInput.value.trim();

    if (!name) return;

    const newDeck = {
      id: 'deck-' + Date.now(),
      name: name,
      class: cls,
      status: 'active',
      notes: notes,
      createdAt: Date.now()
    };

    myDecks.unshift(newDeck);
    saveDecks();
    localStorage.setItem(STORAGE_LAST_DECK_KEY, newDeck.id);

    nameInput.value = '';
    notesInput.value = '';

    renderAll();
    lucide.createIcons();
    alert(`現役デッキ「${name}」を登録しました！`);
  });

  // Deck Active / Archived Tab switchers
  const btnActiveDecks = document.getElementById('deck-filter-active');
  const btnArchivedDecks = document.getElementById('deck-filter-archived');

  btnActiveDecks.addEventListener('click', () => {
    deckTabFilter = 'active';
    btnActiveDecks.className = 'px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold transition flex items-center gap-1.5';
    btnArchivedDecks.className = 'px-3 py-1.5 rounded-lg text-gray-400 hover:text-white font-medium transition flex items-center gap-1.5';
    renderDecksList();
    lucide.createIcons();
  });

  btnArchivedDecks.addEventListener('click', () => {
    deckTabFilter = 'archived';
    btnArchivedDecks.className = 'px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold transition flex items-center gap-1.5';
    btnActiveDecks.className = 'px-3 py-1.5 rounded-lg text-gray-400 hover:text-white font-medium transition flex items-center gap-1.5';
    renderDecksList();
    lucide.createIcons();
  });

  // Quick Add deck from record tab
  document.getElementById('btn-quick-add-my-deck').addEventListener('click', () => {
    switchTab('tab-decks');
    document.getElementById('new-deck-name').focus();
  });
}

// Render All Components
function renderAll() {
  renderSeasonSelectors();
  renderMyDeckSelectors();
  renderDecksList();
  renderCurrentDeckSummary();
  renderRecentMemos();
  renderAnalytics();
  renderHistory();
  updateHeaderStats();
  updateOpponentDeckSuggestions();
}

// Render My Deck Selectors (ONLY ACTIVE DECKS in record form!)
function renderMyDeckSelectors() {
  const select = document.getElementById('my-deck-select');
  const chipsContainer = document.getElementById('my-deck-chips');
  const filterSelect = document.getElementById('analytics-deck-filter');
  const historyFilterSelect = document.getElementById('history-filter-deck');

  const activeDecks = myDecks.filter(d => d.status === 'active');
  const lastDeckId = localStorage.getItem(STORAGE_LAST_DECK_KEY) || (activeDecks[0]?.id || '');

  // Select in Record Form (Only Active!)
  select.innerHTML = '<option value="">-- デッキを選択してください --</option>';
  chipsContainer.innerHTML = '';

  if (activeDecks.length === 0) {
    chipsContainer.innerHTML = '<span class="text-xs text-amber-400 italic">現役デッキがありません。「デッキ管理」から登録してください</span>';
  }

  activeDecks.forEach(deck => {
    const opt = document.createElement('option');
    opt.value = deck.id;
    opt.textContent = `[${deck.class}] ${deck.name}`;
    if (deck.id === lastDeckId) opt.selected = true;
    select.appendChild(opt);

    // Quick Chips
    const chip = document.createElement('button');
    chip.type = 'button';
    const isSelected = deck.id === (select.value || lastDeckId);
    chip.className = `px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
      isSelected 
        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-sm shadow-cyan-500/20' 
        : 'border-[#2d384e] bg-[#1a2233] text-gray-300 hover:border-gray-400'
    }`;
    chip.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full ${getClassDotColor(deck.class)}"></span>
      <span>${escapeHtml(deck.name)}</span>
    `;
    chip.addEventListener('click', () => {
      select.value = deck.id;
      localStorage.setItem(STORAGE_LAST_DECK_KEY, deck.id);
      renderMyDeckSelectors();
      renderCurrentDeckSummary();
    });
    chipsContainer.appendChild(chip);
  });

  // Analytics & History deck dropdowns include ALL decks (with tag for archived)
  const prevFilterVal = filterSelect.value || 'ALL';
  filterSelect.innerHTML = '<option value="ALL">全デッキ総合</option>';
  historyFilterSelect.innerHTML = '<option value="ALL">全自デッキ</option>';

  myDecks.forEach(deck => {
    const isArchived = deck.status === 'archived';
    const label = `[${deck.class}] ${deck.name}${isArchived ? ' (スタン落ち保管)' : ''}`;

    const optFilter = document.createElement('option');
    optFilter.value = deck.id;
    optFilter.textContent = label;
    filterSelect.appendChild(optFilter);

    const optHistory = document.createElement('option');
    optHistory.value = deck.id;
    optHistory.textContent = label;
    historyFilterSelect.appendChild(optHistory);
  });

  if (Array.from(filterSelect.options).some(o => o.value === prevFilterVal)) {
    filterSelect.value = prevFilterVal;
  }

  select.onchange = () => {
    localStorage.setItem(STORAGE_LAST_DECK_KEY, select.value);
    renderMyDeckSelectors();
    renderCurrentDeckSummary();
  };
}

function getClassDotColor(clsName) {
  switch (clsName) {
    case 'エルフ': return 'bg-emerald-400';
    case 'ロイヤル': return 'bg-amber-400';
    case 'ウィッチ': return 'bg-sky-400';
    case 'ドラゴン': return 'bg-orange-400';
    case 'ネクロマンサー': return 'bg-purple-400';
    case 'ヴァンパイア': return 'bg-rose-400';
    case 'ビショップ': return 'bg-yellow-200';
    case 'ネメシス': return 'bg-teal-400';
    case 'ナイトメア': return 'bg-fuchsia-400';
    default: return 'bg-gray-400';
  }
}

// Render Current Deck Summary Card (for active season)
function renderCurrentDeckSummary() {
  const container = document.getElementById('current-deck-summary');
  const select = document.getElementById('my-deck-select');
  const selectedDeckId = select.value;

  if (!selectedDeckId) {
    container.innerHTML = '<p class="text-gray-400 text-sm">自デッキを選択してください</p>';
    return;
  }

  const deck = myDecks.find(d => d.id === selectedDeckId);
  if (!deck) return;

  // Deck matches in current season
  const currentSeason = seasons.find(s => s.id === currentSeasonId);
  const deckMatches = matches.filter(m => m.myDeckId === selectedDeckId && m.seasonId === currentSeasonId);
  const total = deckMatches.length;
  const wins = deckMatches.filter(m => m.result === 'WIN').length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const firstTurnMatches = deckMatches.filter(m => m.turn === '先攻');
  const firstWins = firstTurnMatches.filter(m => m.result === 'WIN').length;
  const firstRate = firstTurnMatches.length > 0 ? Math.round((firstWins / firstTurnMatches.length) * 100) : 0;

  const secondTurnMatches = deckMatches.filter(m => m.turn === '後攻');
  const secondWins = secondTurnMatches.filter(m => m.result === 'WIN').length;
  const secondRate = secondTurnMatches.length > 0 ? Math.round((secondWins / secondTurnMatches.length) * 100) : 0;

  // Total all-time matches for reference
  const allTimeMatches = matches.filter(m => m.myDeckId === selectedDeckId);

  container.innerHTML = `
    <div class="text-left space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-base font-bold text-white">${escapeHtml(deck.name)}</span>
          <div class="text-[10px] text-cyan-400 font-semibold mt-0.5">※ ${currentSeason ? currentSeason.name : '今期'}の戦績</div>
        </div>
        <span class="px-2 py-0.5 rounded text-xs border ${getClassBadge(deck.class)}">${deck.class}</span>
      </div>

      ${deck.notes ? `
        <div class="text-xs text-gray-300 bg-[#161e2c] p-2 rounded-lg border border-[#233044] leading-relaxed">
          <span class="text-[10px] text-cyan-400 font-bold block mb-0.5">デッキメモ / スタン落ち対策:</span>
          ${escapeHtml(deck.notes)}
        </div>
      ` : ''}

      <div class="grid grid-cols-3 gap-2 text-center bg-[#182030] p-2.5 rounded-xl border border-[#2b3548]">
        <div>
          <div class="text-[10px] text-gray-400">今期対戦数</div>
          <div class="text-base font-bold text-white">${total} <span class="text-xs font-normal">戦</span></div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400">勝 - 敗</div>
          <div class="text-base font-bold text-emerald-400">${wins}<span class="text-xs text-gray-400 font-normal">W </span><span class="text-rose-400">${losses}</span><span class="text-xs text-gray-400 font-normal">L</span></div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400">勝率</div>
          <div class="text-base font-bold text-cyan-400">${winRate}%</div>
        </div>
      </div>

      <div class="flex justify-between text-xs text-gray-300 pt-1 px-1">
        <span>先攻勝率: <strong class="text-amber-400">${firstRate}%</strong> (${firstWins}/${firstTurnMatches.length})</span>
        <span>後攻勝率: <strong class="text-indigo-400">${secondRate}%</strong> (${secondWins}/${secondTurnMatches.length})</span>
      </div>

      <div class="text-[11px] text-gray-500 pt-1 border-t border-[#1f2838] flex justify-between">
        <span>通算（全期間）: ${allTimeMatches.length}戦</span>
        <span>通算勝率: ${allTimeMatches.length > 0 ? Math.round((allTimeMatches.filter(m => m.result === 'WIN').length / allTimeMatches.length) * 100) : 0}%</span>
      </div>
    </div>
  `;
}

// Render Recent Memos
function renderRecentMemos() {
  const container = document.getElementById('recent-memos-list');
  const memoMatches = matches.filter(m => m.memo && m.memo.trim().length > 0).slice(0, 5);

  if (memoMatches.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-500 italic py-2 text-center">対戦メモはまだ記録されていません</p>';
    return;
  }

  container.innerHTML = '';
  memoMatches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'p-3 bg-[#182030] rounded-xl border border-[#263147] text-xs space-y-1.5';
    const isWin = m.result === 'WIN';
    const matchSeason = seasons.find(s => s.id === m.seasonId);

    item.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold ${isWin ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}">
            ${m.result}
          </span>
          <span class="text-gray-300 font-medium">${escapeHtml(m.myDeckName)} vs [${m.oppClass}] ${escapeHtml(m.oppDeckName)}</span>
          ${matchSeason ? `<span class="text-[9px] px-1 py-0.2 rounded bg-[#101724] text-gray-400 border border-[#263246]">${escapeHtml(matchSeason.name)}</span>` : ''}
        </div>
        <span class="text-[10px] text-gray-500">${formatRelativeDate(m.createdAt)}</span>
      </div>
      <p class="text-gray-200 bg-[#111723] p-2 rounded-lg border border-[#20293d] whitespace-pre-wrap">${escapeHtml(m.memo)}</p>
    `;
    container.appendChild(item);
  });
}

// Render Analytics Tab (Matchups & Stats filtered by Season & Deck)
function renderAnalytics() {
  const filterSeasonVal = document.getElementById('analytics-season-filter').value;
  const filterDeckId = document.getElementById('analytics-deck-filter').value;

  // Filter matches by Season
  let targetMatches = matches;
  if (filterSeasonVal !== 'ALL') {
    targetMatches = targetMatches.filter(m => m.seasonId === filterSeasonVal);
  }

  // Filter matches by Deck
  if (filterDeckId !== 'ALL') {
    targetMatches = targetMatches.filter(m => m.myDeckId === filterDeckId);
  }

  const total = targetMatches.length;
  const wins = targetMatches.filter(m => m.result === 'WIN').length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const firstTurn = targetMatches.filter(m => m.turn === '先攻');
  const firstWins = firstTurn.filter(m => m.result === 'WIN').length;
  const firstRate = firstTurn.length > 0 ? Math.round((firstWins / firstTurn.length) * 100) : 0;

  const secondTurn = targetMatches.filter(m => m.turn === '後攻');
  const secondWins = secondTurn.filter(m => m.result === 'WIN').length;
  const secondRate = secondTurn.length > 0 ? Math.round((secondWins / secondTurn.length) * 100) : 0;

  // Update Metric Cards
  document.getElementById('metric-total-matches').textContent = total;
  document.getElementById('metric-wins').textContent = wins;
  document.getElementById('metric-losses').textContent = losses;
  document.getElementById('metric-win-rate').textContent = `${winRate}%`;
  document.getElementById('metric-first-turn-winrate').textContent = `${firstRate}% (${firstWins}/${firstTurn.length})`;
  document.getElementById('metric-second-turn-winrate').textContent = `${secondRate}% (${secondWins}/${secondTurn.length})`;

  // Calculate Matchups by Opponent Deck
  const matchups = {};
  targetMatches.forEach(m => {
    const key = `${m.oppClass}___${m.oppDeckName}`;
    if (!matchups[key]) {
      matchups[key] = {
        oppClass: m.oppClass,
        oppDeckName: m.oppDeckName,
        total: 0,
        wins: 0,
        losses: 0,
        firstTotal: 0,
        firstWins: 0,
        secondTotal: 0,
        secondWins: 0
      };
    }
    const mu = matchups[key];
    mu.total += 1;
    if (m.result === 'WIN') mu.wins += 1;
    else mu.losses += 1;

    if (m.turn === '先攻') {
      mu.firstTotal += 1;
      if (m.result === 'WIN') mu.firstWins += 1;
    } else {
      mu.secondTotal += 1;
      if (m.result === 'WIN') mu.secondWins += 1;
    }
  });

  const matchupList = Object.values(matchups).sort((a, b) => b.total - a.total);
  const tbody = document.getElementById('matchup-table-body');
  const emptyMsg = document.getElementById('matchup-empty-msg');
  tbody.innerHTML = '';

  if (matchupList.length === 0) {
    emptyMsg.classList.remove('hidden');
  } else {
    emptyMsg.classList.add('hidden');
    matchupList.forEach(mu => {
      const rate = Math.round((mu.wins / mu.total) * 100);
      const fRate = mu.firstTotal > 0 ? Math.round((mu.firstWins / mu.firstTotal) * 100) : '-';
      const sRate = mu.secondTotal > 0 ? Math.round((mu.secondWins / mu.secondTotal) * 100) : '-';

      let rateColor = 'text-gray-300';
      let barColor = 'bg-cyan-500';
      if (rate >= 60) {
        rateColor = 'text-emerald-400 font-bold';
        barColor = 'bg-emerald-500';
      } else if (rate < 40) {
        rateColor = 'text-rose-400 font-bold';
        barColor = 'bg-rose-500';
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#182030]/60 transition';
      tr.innerHTML = `
        <td class="py-3 px-4 font-semibold text-white">${escapeHtml(mu.oppDeckName)}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-xs border ${getClassBadge(mu.oppClass)}">${mu.oppClass}</span>
        </td>
        <td class="py-3 px-3 text-center font-bold text-gray-200">${mu.total}</td>
        <td class="py-3 px-3 text-center">
          <span class="text-emerald-400 font-bold">${mu.wins}</span> - <span class="text-rose-400 font-bold">${mu.losses}</span>
        </td>
        <td class="py-3 px-3 text-center ${rateColor} text-base">${rate}%</td>
        <td class="py-3 px-3 text-center text-xs text-amber-300">${fRate === '-' ? '-' : fRate + '%'} <span class="text-[10px] text-gray-500">(${mu.firstWins}/${mu.firstTotal})</span></td>
        <td class="py-3 px-3 text-center text-xs text-indigo-300">${sRate === '-' ? '-' : sRate + '%'} <span class="text-[10px] text-gray-500">(${mu.secondWins}/${mu.secondTotal})</span></td>
        <td class="py-3 px-4 w-36">
          <div class="w-full bg-[#20293d] rounded-full h-2.5 overflow-hidden">
            <div class="${barColor} h-2.5 rounded-full" style="width: ${rate}%"></div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Charts
  renderAnalyticsCharts(targetMatches, matchupList);
}

// Chart.js Rendering
function renderAnalyticsCharts(targetMatches, matchupList) {
  // 1. Opponent Class Share Doughnut Chart
  const classCounts = {};
  targetMatches.forEach(m => {
    classCounts[m.oppClass] = (classCounts[m.oppClass] || 0) + 1;
  });

  const classLabels = Object.keys(classCounts);
  const classData = Object.values(classCounts);

  const ctxShare = document.getElementById('classShareChart').getContext('2d');
  if (shareChartInstance) shareChartInstance.destroy();

  shareChartInstance = new Chart(ctxShare, {
    type: 'doughnut',
    data: {
      labels: classLabels.length > 0 ? classLabels : ['データなし'],
      datasets: [{
        data: classData.length > 0 ? classData : [1],
        backgroundColor: classLabels.length > 0 ? classLabels.map(c => getClassColorHex(c)) : ['#30363d'],
        borderWidth: 1,
        borderColor: '#131926'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#9ca3af', font: { size: 11 } }
        }
      }
    }
  });

  // 2. Top Matchups Winrate Bar Chart
  const topMatchups = matchupList.slice(0, 6);
  const muLabels = topMatchups.map(m => m.oppDeckName);
  const muWinrates = topMatchups.map(m => Math.round((m.wins / m.total) * 100));

  const ctxBar = document.getElementById('deckWinrateChart').getContext('2d');
  if (winrateChartInstance) winrateChartInstance.destroy();

  winrateChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: muLabels.length > 0 ? muLabels : ['データなし'],
      datasets: [{
        label: '勝率 (%)',
        data: muWinrates.length > 0 ? muWinrates : [0],
        backgroundColor: muWinrates.map(w => w >= 60 ? '#10b981' : w < 40 ? '#ef4444' : '#0284c7'),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#9ca3af', callback: v => v + '%' },
          grid: { color: '#232c3f' }
        },
        x: {
          ticks: { color: '#9ca3af', font: { size: 10 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function getClassColorHex(clsName) {
  switch (clsName) {
    case 'エルフ': return '#22c55e';
    case 'ロイヤル': return '#eab308';
    case 'ウィッチ': return '#38bdf8';
    case 'ドラゴン': return '#f97316';
    case 'ネクロマンサー': return '#a855f7';
    case 'ヴァンパイア': return '#f43f5e';
    case 'ビショップ': return '#fef08a';
    case 'ネメシス': return '#14b8a6';
    case 'ナイトメア': return '#9333ea';
    default: return '#6b7280';
  }
}

// Render History Matches List
function renderHistory() {
  const container = document.getElementById('history-list-container');
  const emptyMsg = document.getElementById('history-empty-msg');
  const searchQuery = document.getElementById('history-search').value.toLowerCase().trim();
  const filterSeason = document.getElementById('history-filter-season').value;
  const filterResult = document.getElementById('history-filter-result').value;
  const filterDeck = document.getElementById('history-filter-deck').value;

  const filtered = matches.filter(m => {
    if (filterSeason !== 'ALL' && m.seasonId !== filterSeason) return false;
    if (filterResult !== 'ALL' && m.result !== filterResult) return false;
    if (filterDeck !== 'ALL' && m.myDeckId !== filterDeck) return false;
    if (searchQuery) {
      const matchText = `${m.myDeckName} ${m.oppClass} ${m.oppDeckName} ${m.memo || ''}`.toLowerCase();
      if (!matchText.includes(searchQuery)) return false;
    }
    return true;
  });

  document.getElementById('history-count-badge').textContent = matches.length;
  container.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  filtered.forEach(m => {
    const card = document.createElement('div');
    const isWin = m.result === 'WIN';
    const matchSeason = seasons.find(s => s.id === m.seasonId);
    card.className = `match-card bg-[#131926] border ${isWin ? 'border-emerald-900/40 hover:border-emerald-700/60' : 'border-rose-900/40 hover:border-rose-700/60'} rounded-2xl p-4 shadow-md space-y-3`;

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#20293d]">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${isWin ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' : 'bg-rose-950/80 text-rose-400 border border-rose-700/60'}">
            ${m.result}
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-bold ${m.turn === '先攻' ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40' : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/40'}">
            ${m.turn}
          </span>
          ${matchSeason ? `<span class="px-2 py-0.5 rounded text-[10px] bg-[#162130] text-cyan-300 border border-[#2a384e]">${escapeHtml(matchSeason.name)}</span>` : ''}
          <span class="text-xs text-gray-400">${formatRelativeDate(m.createdAt)}</span>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-edit-memo text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-[#1a2334] border border-[#2d3a52] flex items-center gap-1" data-id="${m.id}">
            <i data-lucide="edit-2" class="w-3 h-3"></i> 編集
          </button>
          <button class="btn-delete-match text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-[#1a2334] border border-[#2d3a52] flex items-center gap-1" data-id="${m.id}">
            <i data-lucide="trash-2" class="w-3 h-3"></i> 削除
          </button>
        </div>
      </div>

      <!-- Matchup Display -->
      <div class="flex flex-wrap items-center gap-3 text-sm font-semibold">
        <div class="flex items-center gap-1.5 text-cyan-300 bg-[#192233] px-3 py-1.5 rounded-xl border border-[#2b3850]">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>${escapeHtml(m.myDeckName)}</span>
        </div>
        <span class="text-xs text-gray-500 font-bold uppercase tracking-widest">VS</span>
        <div class="flex items-center gap-2 text-rose-300 bg-[#192233] px-3 py-1.5 rounded-xl border border-[#2b3850]">
          <span class="px-1.5 py-0.5 rounded text-[11px] border ${getClassBadge(m.oppClass)}">${m.oppClass}</span>
          <span>${escapeHtml(m.oppDeckName)}</span>
        </div>
      </div>

      <!-- Analysis / Reflection Memo -->
      ${m.memo ? `
        <div class="bg-[#0e131d] border border-[#232d40] rounded-xl p-3 text-xs text-gray-200">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i data-lucide="message-square" class="w-3 h-3 text-cyan-400"></i>
            対戦分析・反省
          </div>
          <p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.memo)}</p>
        </div>
      ` : `
        <div class="text-[11px] text-gray-500 italic">メモなし</div>
      `}
    `;

    container.appendChild(card);
  });

  // Action listeners
  container.querySelectorAll('.btn-edit-memo').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.id));
  });

  lucide.createIcons();
}

// Render Decks List in Tab 4 (Active vs Archived)
function renderDecksList() {
  const container = document.getElementById('deck-list-table');
  container.innerHTML = '';

  const activeCount = myDecks.filter(d => d.status === 'active').length;
  const archivedCount = myDecks.filter(d => d.status === 'archived').length;
  document.getElementById('count-active-decks').textContent = activeCount;
  document.getElementById('count-archived-decks').textContent = archivedCount;

  const targetDecks = myDecks.filter(d => (deckTabFilter === 'active' ? d.status === 'active' : d.status === 'archived'));

  if (targetDecks.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-gray-500 text-xs">
        ${deckTabFilter === 'active' 
          ? '現役のデッキがありません。左のフォームから新規デッキを登録してください。' 
          : 'スタン落ち・保管庫に入っているデッキはありません。'}
      </div>
    `;
    return;
  }

  targetDecks.forEach(deck => {
    const isArchived = deck.status === 'archived';
    const deckMatches = matches.filter(m => m.myDeckId === deck.id);
    const total = deckMatches.length;
    const wins = deckMatches.filter(m => m.result === 'WIN').length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const row = document.createElement('div');
    row.className = `p-4 bg-[#182030] rounded-xl border ${isArchived ? 'border-[#2d2a3d] opacity-85' : 'border-[#283449] hover:border-[#384762]'} transition space-y-2.5`;
    
    row.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <span class="px-2 py-0.5 rounded text-xs border ${getClassBadge(deck.class)}">${deck.class}</span>
          <div>
            <div class="font-bold text-sm text-white flex items-center gap-2">
              <span>${escapeHtml(deck.name)}</span>
              ${isArchived ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800">スタン落ち保管</span>' : ''}
            </div>
            <div class="text-[11px] text-gray-400 mt-0.5">
              通算戦績: ${total}戦 ${wins}勝 ${total - wins}敗 (勝率: <span class="text-cyan-400 font-semibold">${winRate}%</span>)
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 text-xs">
          <!-- Toggle Status: Archive or Restore -->
          <button class="btn-toggle-status px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
            isArchived 
              ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70' 
              : 'border-amber-700/60 bg-amber-950/40 text-amber-300 hover:bg-amber-950/70'
          }" data-id="${deck.id}">
            <i data-lucide="${isArchived ? 'rotate-ccw' : 'archive'}" class="w-3.5 h-3.5"></i>
            <span>${isArchived ? '現役に復活' : 'スタン落ち・保管庫へ'}</span>
          </button>

          <!-- Duplicate Deck for New Season -->
          <button class="btn-duplicate-deck p-1.5 rounded-lg bg-[#222c3f] hover:bg-[#2c3952] text-gray-300 border border-[#344460] transition" data-id="${deck.id}" title="このデッキを複製して新シーズン版を作る">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Delete Deck -->
          <button class="btn-delete-deck p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 transition" data-id="${deck.id}" title="デッキを削除">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <!-- Notes / Card rotation details -->
      ${deck.notes ? `
        <div class="text-xs text-gray-300 bg-[#121722] p-2 rounded-lg border border-[#232b3d] flex items-start gap-1.5">
          <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0"></i>
          <span class="whitespace-pre-wrap">${escapeHtml(deck.notes)}</span>
        </div>
      ` : ''}
    `;

    container.appendChild(row);
  });

  // Attach listeners
  container.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = myDecks.find(d => d.id === id);
      if (!target) return;

      if (target.status === 'active') {
        target.status = 'archived';
        if (!target.notes.includes('スタン落ち')) {
          target.notes = (target.notes ? target.notes + ' ' : '') + '【スタン落ち・保管庫へ移動】';
        }
      } else {
        target.status = 'active';
      }

      saveDecks();
      renderAll();
      lucide.createIcons();
    });
  });

  container.querySelectorAll('.btn-duplicate-deck').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = myDecks.find(d => d.id === id);
      if (!target) return;

      const newName = prompt('新シーズン用のデッキ名を入力してください:', `${target.name} (新環境版)`);
      if (!newName) return;

      const newDeck = {
        id: 'deck-' + Date.now(),
        name: newName.trim(),
        class: target.class,
        status: 'active',
        notes: `※「${target.name}」をベースに新環境調整`,
        createdAt: Date.now()
      };

      myDecks.unshift(newDeck);
      saveDecks();
      localStorage.setItem(STORAGE_LAST_DECK_KEY, newDeck.id);
      renderAll();
      lucide.createIcons();
      alert(`「${newName}」を現役デッキとして作成しました！`);
    });
  });

  container.querySelectorAll('.btn-delete-deck').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('このデッキを削除してもよろしいですか？（過去の対戦履歴データは保持されます）')) {
        myDecks = myDecks.filter(d => d.id !== id);
        saveDecks();
        renderAll();
        lucide.createIcons();
      }
    });
  });
}

// Edit Modal Handling
function openEditModal(matchId) {
  const match = matches.find(m => m.id === matchId);
  if (!match) return;

  const modal = document.getElementById('edit-modal');
  document.getElementById('edit-match-id').value = match.id;
  document.getElementById('edit-match-memo').value = match.memo || '';

  const winBtn = document.getElementById('edit-result-win');
  const loseBtn = document.getElementById('edit-result-lose');
  let currentResult = match.result;

  function updateModalResultUI() {
    if (currentResult === 'WIN') {
      winBtn.className = 'py-2 rounded-lg border border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold text-sm';
      loseBtn.className = 'py-2 rounded-lg border border-[#2e3a52] bg-[#1a2233] text-gray-400 font-bold text-sm';
    } else {
      winBtn.className = 'py-2 rounded-lg border border-[#2e3a52] bg-[#1a2233] text-gray-400 font-bold text-sm';
      loseBtn.className = 'py-2 rounded-lg border border-rose-500 bg-rose-950/60 text-rose-300 font-bold text-sm';
    }
  }

  winBtn.onclick = () => { currentResult = 'WIN'; updateModalResultUI(); };
  loseBtn.onclick = () => { currentResult = 'LOSE'; updateModalResultUI(); };
  updateModalResultUI();

  document.getElementById('btn-save-edit').onclick = () => {
    match.result = currentResult;
    match.memo = document.getElementById('edit-match-memo').value.trim();
    saveMatches();
    modal.classList.add('hidden');
    renderAll();
    lucide.createIcons();
  };

  document.getElementById('btn-cancel-edit').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-close-edit-modal').onclick = () => modal.classList.add('hidden');

  modal.classList.remove('hidden');
}

function deleteMatch(matchId) {
  if (confirm('この対戦ログを削除してもよろしいですか？')) {
    matches = matches.filter(m => m.id !== matchId);
    saveMatches();
    renderAll();
    lucide.createIcons();
  }
}

// Navigation Tabs
function setupTabNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  document.querySelectorAll('.nav-switch').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.target);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    if (isActive) {
      t.className = 'nav-tab active flex items-center gap-2 pb-3 px-1 border-b-2 border-cyan-400 text-cyan-400 font-semibold whitespace-nowrap';
    } else {
      t.className = 'nav-tab flex items-center gap-2 pb-3 px-1 border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition font-medium whitespace-nowrap';
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === tabId) {
      content.classList.remove('hidden');
      content.classList.add('block');
    } else {
      content.classList.add('hidden');
      content.classList.remove('block');
    }
  });

  if (tabId === 'tab-analytics') {
    renderAnalytics();
  }

  lucide.createIcons();
}

// Filters & Search Setup
function setupFiltersAndSearch() {
  document.getElementById('history-search').addEventListener('input', renderHistory);
  document.getElementById('history-filter-result').addEventListener('change', renderHistory);
  document.getElementById('history-filter-deck').addEventListener('change', renderHistory);

  document.getElementById('analytics-deck-filter').addEventListener('change', () => {
    renderAnalytics();
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('すべての対戦履歴とデッキデータを消去しますか？\n（事前に「保存」ボタンからバックアップを保存しておくことを推奨します）')) {
      matches = [];
      saveMatches();
      renderAll();
      lucide.createIcons();
    }
  });
}

// Export / Import JSON & Samples
function setupDataManagement() {
  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      seasons: seasons,
      currentSeasonId: currentSeasonId,
      decks: myDecks,
      matches: matches
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadowverse_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  const fileInput = document.getElementById('import-file-input');
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.seasons && Array.isArray(imported.seasons)) {
          seasons = imported.seasons;
          saveSeasons();
        }
        if (imported.currentSeasonId) {
          currentSeasonId = imported.currentSeasonId;
          localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);
        }
        if (imported.matches && Array.isArray(imported.matches)) {
          matches = imported.matches;
          saveMatches();
        }
        if (imported.decks && Array.isArray(imported.decks)) {
          myDecks = imported.decks;
          saveDecks();
        }
        alert('バックアップデータを正常に復元しました！');
        renderAll();
        lucide.createIcons();
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Sample Data Generator for testing
  document.getElementById('btn-add-sample').addEventListener('click', () => {
    addSampleData();
  });
}

function addSampleData() {
  const sampleSeasons = [
    { id: 'season-current', name: '第33弾 Resurgent Legends (現環境)', createdAt: Date.now() - 3600000 * 24 * 30 },
    { id: 'season-prev', name: '第32弾 Heroes of Rivenbrandt (前環境)', createdAt: Date.now() - 3600000 * 24 * 90 }
  ];

  const sampleDecks = [
    { id: 'deck-1', name: '進化ロイヤル', class: 'ロイヤル', status: 'active', notes: 'カゲミツ・オクトー軸。今期も続投中', createdAt: Date.now() - 3600000 * 24 * 20 },
    { id: 'deck-2', name: '秘術ウィッチ', class: 'ウィッチ', status: 'active', notes: '新カードノーマン採用で打点強化', createdAt: Date.now() - 3600000 * 24 * 15 },
    { id: 'deck-3', name: '旧・結晶ビショップ', class: 'ビショップ', status: 'archived', notes: '【スタン落ち】スカルフェイン落ちのため保管庫へ移動', createdAt: Date.now() - 3600000 * 24 * 80 }
  ];

  const sampleMatches = [
    // Current Season matches
    {
      id: 'sample-1',
      seasonId: 'season-current',
      date: new Date(Date.now() - 3600000 * 18).toISOString(),
      myDeckId: 'deck-1',
      myDeckName: '進化ロイヤル',
      oppClass: 'ウィッチ',
      oppDeckName: '秘術ウィッチ',
      turn: '先攻',
      result: 'WIN',
      memo: '新環境の秘術対面。カゲミツの突進で盤面維持し、7Tリーサル取れた。',
      createdAt: Date.now() - 3600000 * 18
    },
    {
      id: 'sample-2',
      seasonId: 'season-current',
      date: new Date(Date.now() - 3600000 * 12).toISOString(),
      myDeckId: 'deck-1',
      myDeckName: '進化ロイヤル',
      oppClass: 'ウィッチ',
      oppDeckName: '秘術ウィッチ',
      turn: '後攻',
      result: 'LOSE',
      memo: '【マリガン事故】後攻で2コス引けず。相手のノーマン守護を抜けなかった。',
      createdAt: Date.now() - 3600000 * 12
    },
    {
      id: 'sample-3',
      seasonId: 'season-current',
      date: new Date(Date.now() - 3600000 * 8).toISOString(),
      myDeckId: 'deck-1',
      myDeckName: '進化ロイヤル',
      oppClass: 'ドラゴン',
      oppDeckName: 'ランプドラゴン',
      turn: '先攻',
      result: 'WIN',
      memo: 'ブースト前に顔を削り切った。新カードの採用が功を奏した。',
      createdAt: Date.now() - 3600000 * 8
    },
    {
      id: 'sample-4',
      seasonId: 'season-current',
      date: new Date(Date.now() - 3600000 * 4).toISOString(),
      myDeckId: 'deck-2',
      myDeckName: '秘術ウィッチ',
      oppClass: 'ロイヤル',
      oppDeckName: '進化ロイヤル',
      turn: '先攻',
      result: 'WIN',
      memo: '【理想ムーブ】土の印が綺麗に回り完勝。',
      createdAt: Date.now() - 3600000 * 4
    },
    // Previous Season matches
    {
      id: 'sample-prev-1',
      seasonId: 'season-prev',
      date: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
      myDeckId: 'deck-3',
      myDeckName: '旧・結晶ビショップ',
      oppClass: 'ウィッチ',
      oppDeckName: '秘術ウィッチ',
      turn: '先攻',
      result: 'WIN',
      memo: '前環境のスカルフェイン展開で圧勝。',
      createdAt: Date.now() - 3600000 * 24 * 45
    }
  ];

  seasons = sampleSeasons;
  currentSeasonId = 'season-current';
  myDecks = sampleDecks;
  matches = sampleMatches;

  saveSeasons();
  saveDecks();
  saveMatches();
  localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);

  renderAll();
  lucide.createIcons();
  alert('シーズン対応のサンプルデータ（現環境＋前環境＋スタン落ちデッキ）を投入しました！\nヘッダーのシーズン切り替えやデッキ管理タブを確認してみてください。');
}

// Helpers
function updateHeaderStats() {
  const currentSeason = seasons.find(s => s.id === currentSeasonId);
  const currentMatches = matches.filter(m => m.seasonId === currentSeasonId);
  const total = currentMatches.length;
  const wins = currentMatches.filter(m => m.result === 'WIN').length;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

  document.getElementById('header-total-matches').textContent = `${total} 戦 (今期)`;
  document.getElementById('header-win-rate').textContent = `${rate}%`;
}

function getClassBadge(clsName) {
  switch (clsName) {
    case 'エルフ': return 'badge-forest';
    case 'ロイヤル': return 'badge-sword';
    case 'ウィッチ': return 'badge-rune';
    case 'ドラゴン': return 'badge-dragon';
    case 'ネクロマンサー': return 'badge-shadow';
    case 'ヴァンパイア': return 'badge-blood';
    case 'ビショップ': return 'badge-haven';
    case 'ネメシス': return 'badge-portal';
    case 'ナイトメア': return 'badge-nightmare';
    default: return 'bg-gray-800 text-gray-300 border-gray-700';
  }
}

function formatRelativeDate(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(timestamp).toLocaleDateString('ja-JP');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
