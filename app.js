// Shadowverse Battle Analyzer - Main Logic
// Features: Seasons, Card Rotation, Deck Insights, Opponent Deck Management, Matchup Memos Drilldown

// Storage Keys
const STORAGE_SEASONS_KEY = 'sv_analyzer_seasons_v2';
const STORAGE_CURRENT_SEASON_KEY = 'sv_analyzer_current_season_v2';
const STORAGE_DECKS_KEY = 'sv_analyzer_decks_v2';
const STORAGE_MATCHES_KEY = 'sv_analyzer_matches_v2';
const STORAGE_LAST_DECK_KEY = 'sv_analyzer_last_deck_v2';
const STORAGE_DELETED_OPP_DECKS_KEY = 'sv_analyzer_deleted_opp_decks_v2';
const STORAGE_CUSTOM_OPP_DECKS_KEY = 'sv_analyzer_custom_opp_decks_v2';

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
  { id: 'season-current', name: '第33弾 Resurgent Legends (現環境)', createdAt: Date.now() - 3600000 * 24 * 30 },
  { id: 'season-prev', name: '第32弾 Heroes of Rivenbrandt (前環境)', createdAt: Date.now() - 3600000 * 24 * 90 }
];

// Default Decks with Insights Structure
const DEFAULT_MY_DECKS = [
  { 
    id: 'deck-1', 
    name: '進化ロイヤル', 
    class: 'ロイヤル', 
    status: 'active', 
    notes: 'カゲミツ・オクトー軸。今期も続投中', 
    insights: {
      plan: '【序盤】2Tフォロワーから連携を稼ぐ。\n【中盤】5T目カゲミツ進化で盤面を制圧し、進化回数を稼ぐ。\n【リーサル】7〜8T目にオクトーと疾走フォロワーで一気に20点削り切る。',
      mulligan: '【共通】2コスフォロワー最優先確保\n【先攻】テンポ重視で1・2・3の動きをキープ\n【後攻】除去札・進化時多面処理できるフォロワーを単キープ',
      cards: '【採用調整】\n・低コスト除去スペル: 2枚→3枚 (アグロ対面への回答)\n・重いフィニッシャー: 3枚→2枚 (手札事故防止)',
      review: '先攻時の安定感は非常に高いが、後攻でアグロ相手に押し切られる試合があった。序盤の受け札をもう少し厚くするか要検討。'
    },
    createdAt: Date.now() - 3600000 * 24 * 20 
  },
  { 
    id: 'deck-2', 
    name: '秘術ウィッチ', 
    class: 'ウィッチ', 
    status: 'active', 
    notes: '新カードノーマン採用で打点強化', 
    insights: {
      plan: '土のスタック管理とノーマンの守護で中盤を耐え、終盤に紅蓮の魔術等でバースト。',
      mulligan: '土の印供給札を最優先キープ。後攻は除去札もセット。',
      cards: 'ノーマン3枚必須。盤面除去札の枚数を微調整中。',
      review: 'スタック切れを起こさないプレイングが最重要。'
    },
    createdAt: Date.now() - 3600000 * 24 * 15 
  },
  { 
    id: 'deck-3', 
    name: '旧・結晶ビショップ', 
    class: 'ビショップ', 
    status: 'archived', 
    notes: '【スタン落ち】スカルフェイン落ちのため保管庫へ移動', 
    insights: {
      plan: '結晶5回達成でスカルフェイン早期着地',
      mulligan: 'スカルフェイン全力マリガン',
      cards: 'スタン落ちのため現行ローテでは使用不可',
      review: '前環境最強の一角だったがキーカードがスタン落ちしたため保管庫へ移行。'
    },
    createdAt: Date.now() - 3600000 * 24 * 80 
  }
];

// App State
let seasons = [];
let currentSeasonId = '';
let myDecks = [];
let matches = [];
let deletedOppDecks = [];
let customOppDecks = [];
let selectedTurn = '先攻';
let selectedResult = 'WIN';
let selectedOppClass = 'ロイヤル';
let deckTabFilter = 'active'; // 'active' or 'archived'
let deckSubtab = 'my-decks';  // 'my-decks' or 'opp-decks'
let oppDeckManageClassFilter = 'ALL';
let shareChartInstance = null;
let winrateChartInstance = null;

// State for Matchup Notes Drilldown Modal
let currentMuMatches = [];
let currentMuFilter = 'ALL';
let currentMuOppClass = '';
let currentMuOppDeckName = '';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupClassSelector();
  setupTurnAndResultButtons();
  setupFormHandlers();
  setupTabNavigation();
  setupSeasonManagement();
  setupDeckNotesManagement();
  setupOppDeckManagement();
  setupMatchupModal();
  setupFiltersAndSearch();
  setupDataManagement();
  setupQuickMemoTags();

  renderAll();
  lucide.createIcons();
});

// Load and Migrate Data
function loadData() {
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

  currentSeasonId = localStorage.getItem(STORAGE_CURRENT_SEASON_KEY);
  if (!currentSeasonId || !seasons.some(s => s.id === currentSeasonId)) {
    currentSeasonId = seasons[0].id;
    localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);
  }

  const savedDecks = localStorage.getItem(STORAGE_DECKS_KEY) || localStorage.getItem('sv_analyzer_decks_v1');
  if (savedDecks) {
    try {
      myDecks = JSON.parse(savedDecks).map(d => ({
        status: 'active',
        notes: '',
        insights: { plan: '', mulligan: '', cards: '', review: '' },
        ...d,
        insights: {
          plan: d.insights?.plan || '',
          mulligan: d.insights?.mulligan || '',
          cards: d.insights?.cards || '',
          review: d.insights?.review || ''
        }
      }));
    } catch (e) {
      myDecks = [...DEFAULT_MY_DECKS];
    }
  } else {
    myDecks = [...DEFAULT_MY_DECKS];
    saveDecks();
  }

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

  const savedDeletedOppDecks = localStorage.getItem(STORAGE_DELETED_OPP_DECKS_KEY);
  if (savedDeletedOppDecks) {
    try {
      deletedOppDecks = JSON.parse(savedDeletedOppDecks);
    } catch (e) {
      deletedOppDecks = [];
    }
  }

  const savedCustomOppDecks = localStorage.getItem(STORAGE_CUSTOM_OPP_DECKS_KEY);
  if (savedCustomOppDecks) {
    try {
      customOppDecks = JSON.parse(savedCustomOppDecks);
    } catch (e) {
      customOppDecks = [];
    }
  }
}

function saveSeasons() { localStorage.setItem(STORAGE_SEASONS_KEY, JSON.stringify(seasons)); }
function saveDecks() { localStorage.setItem(STORAGE_DECKS_KEY, JSON.stringify(myDecks)); }
function saveMatches() { localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(matches)); }
function saveDeletedOppDecks() { localStorage.setItem(STORAGE_DELETED_OPP_DECKS_KEY, JSON.stringify(deletedOppDecks)); }
function saveCustomOppDecks() { localStorage.setItem(STORAGE_CUSTOM_OPP_DECKS_KEY, JSON.stringify(customOppDecks)); }

// Season Management Setup
function setupSeasonManagement() {
  const globalSelect = document.getElementById('global-season-select');
  const analyticsSeasonFilter = document.getElementById('analytics-season-filter');
  const historySeasonFilter = document.getElementById('history-filter-season');

  globalSelect.addEventListener('change', () => {
    currentSeasonId = globalSelect.value;
    localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);
    analyticsSeasonFilter.value = currentSeasonId;
    renderAll();
    lucide.createIcons();
  });

  analyticsSeasonFilter.addEventListener('change', () => renderAnalytics());
  historySeasonFilter.addEventListener('change', () => renderHistory());

  const newSeasonModal = document.getElementById('new-season-modal');
  const btnOpenNewSeason = document.getElementById('btn-open-new-season');
  const btnCloseNewSeasonModal = document.getElementById('btn-close-new-season-modal');
  const btnCancelNewSeason = document.getElementById('btn-cancel-new-season');
  const btnConfirmNewSeason = document.getElementById('btn-confirm-new-season');

  btnOpenNewSeason.addEventListener('click', openNewSeasonModal);
  btnCloseNewSeasonModal.addEventListener('click', () => newSeasonModal.classList.add('hidden'));
  btnCancelNewSeason.addEventListener('click', () => newSeasonModal.classList.add('hidden'));
  btnConfirmNewSeason.addEventListener('click', handleCreateNewSeason);
}

function openNewSeasonModal() {
  const modal = document.getElementById('new-season-modal');
  const nameInput = document.getElementById('new-season-name-input');
  nameInput.value = '';

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
  const newSeason = { id: newSeasonId, name: name, createdAt: Date.now() };

  seasons.unshift(newSeason);
  currentSeasonId = newSeasonId;
  saveSeasons();
  localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);

  const checkboxes = document.querySelectorAll('.deck-transition-checkbox');
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

// Deck Notes (Insights) Management Setup
function setupDeckNotesManagement() {
  const modal = document.getElementById('deck-notes-modal');
  const btnClose = document.getElementById('btn-close-deck-notes-modal');
  const btnCancel = document.getElementById('btn-cancel-deck-notes');
  const btnSave = document.getElementById('btn-save-deck-notes');

  btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

  btnSave.addEventListener('click', () => {
    const deckId = document.getElementById('deck-notes-deck-id').value;
    const deck = myDecks.find(d => d.id === deckId);
    if (!deck) return;

    if (!deck.insights) deck.insights = {};

    deck.insights.plan = document.getElementById('deck-note-plan').value.trim();
    deck.insights.mulligan = document.getElementById('deck-note-mulligan').value.trim();
    deck.insights.cards = document.getElementById('deck-note-cards').value.trim();
    deck.insights.review = document.getElementById('deck-note-review').value.trim();

    saveDecks();
    modal.classList.add('hidden');
    renderCurrentDeckSummary();
    renderDecksList();
    lucide.createIcons();

    alert(`「${deck.name}」の考察ノートを保存しました！`);
  });

  document.querySelectorAll('.deck-note-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.deck-note-tab').forEach(t => {
        t.className = 'deck-note-tab pb-2 px-1 border-b-2 border-transparent text-gray-400 hover:text-white font-medium';
      });
      tab.className = 'deck-note-tab active pb-2 px-1 border-b-2 border-cyan-400 text-cyan-400 font-bold';

      const target = tab.dataset.target;
      const sections = ['plan', 'mulligan', 'cards', 'review'];
      
      if (target === 'dnote-all') {
        sections.forEach(s => document.getElementById(`section-dnote-${s}`).classList.remove('hidden'));
      } else {
        sections.forEach(s => {
          const el = document.getElementById(`section-dnote-${s}`);
          if (`dnote-${s}` === target) el.classList.remove('hidden');
          else el.classList.add('hidden');
        });
      }
    });
  });

  document.querySelectorAll('.quick-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fieldId = btn.dataset.field;
      const tpl = btn.dataset.tpl.replace(/\\n/g, '\n');
      const textarea = document.getElementById(fieldId);
      if (textarea.value) textarea.value += '\n\n' + tpl;
      else textarea.value = tpl;
      textarea.focus();
    });
  });
}

function openDeckNotesModal(deckId) {
  const deck = myDecks.find(d => d.id === deckId);
  if (!deck) return;

  const modal = document.getElementById('deck-notes-modal');
  document.getElementById('deck-notes-deck-id').value = deck.id;
  document.getElementById('modal-deck-name').textContent = deck.name;
  
  const classBadge = document.getElementById('modal-deck-class');
  classBadge.textContent = deck.class;
  classBadge.className = `px-2 py-0.5 rounded text-xs border ${getClassBadge(deck.class)}`;

  const insights = deck.insights || {};
  document.getElementById('deck-note-plan').value = insights.plan || '';
  document.getElementById('deck-note-mulligan').value = insights.mulligan || '';
  document.getElementById('deck-note-cards').value = insights.cards || '';
  document.getElementById('deck-note-review').value = insights.review || '';

  document.querySelectorAll('.deck-note-tab').forEach((t, idx) => {
    if (idx === 0) t.className = 'deck-note-tab active pb-2 px-1 border-b-2 border-cyan-400 text-cyan-400 font-bold';
    else t.className = 'deck-note-tab pb-2 px-1 border-b-2 border-transparent text-gray-400 hover:text-white font-medium';
  });
  ['plan', 'mulligan', 'cards', 'review'].forEach(s => {
    document.getElementById(`section-dnote-${s}`).classList.remove('hidden');
  });

  modal.classList.remove('hidden');
  lucide.createIcons();
}

// Opponent Deck Management Setup
function setupOppDeckManagement() {
  const subtabMyDecks = document.getElementById('subtab-my-decks');
  const subtabOppDecks = document.getElementById('subtab-opp-decks');
  const subviewMyDecks = document.getElementById('subview-my-decks');
  const subviewOppDecks = document.getElementById('subview-opp-decks');

  subtabMyDecks.addEventListener('click', () => {
    deckSubtab = 'my-decks';
    subtabMyDecks.className = 'px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition';
    subtabOppDecks.className = 'px-4 py-2 rounded-xl bg-[#182030] hover:bg-[#20293d] border border-[#2b3548] text-gray-300 font-medium text-xs flex items-center gap-2 transition';
    subviewMyDecks.classList.remove('hidden');
    subviewOppDecks.classList.add('hidden');
  });

  subtabOppDecks.addEventListener('click', () => {
    deckSubtab = 'opp-decks';
    subtabOppDecks.className = 'px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition';
    subtabMyDecks.className = 'px-4 py-2 rounded-xl bg-[#182030] hover:bg-[#20293d] border border-[#2b3548] text-gray-300 font-medium text-xs flex items-center gap-2 transition';
    subviewMyDecks.classList.add('hidden');
    subviewOppDecks.classList.remove('hidden');
    renderOppDecksManagement();
  });

  document.getElementById('btn-quick-manage-opp-decks').addEventListener('click', () => {
    switchTab('tab-decks');
    subtabOppDecks.click();
    document.getElementById('opp-deck-manage-class-filter').value = selectedOppClass;
    oppDeckManageClassFilter = selectedOppClass;
    renderOppDecksManagement();
  });

  const addClassSelect = document.getElementById('add-opp-deck-class');
  const filterSelect = document.getElementById('opp-deck-manage-class-filter');
  addClassSelect.innerHTML = '';
  filterSelect.innerHTML = '<option value="ALL">全クラス</option>';

  SV_CLASSES.forEach(cls => {
    const opt1 = document.createElement('option');
    opt1.value = cls.id;
    opt1.textContent = `${cls.name} (${cls.en})`;
    addClassSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = cls.id;
    opt2.textContent = cls.name;
    filterSelect.appendChild(opt2);
  });

  filterSelect.addEventListener('change', () => {
    oppDeckManageClassFilter = filterSelect.value;
    renderOppDecksManagement();
  });

  document.getElementById('btn-add-opp-deck').addEventListener('click', () => {
    const cls = addClassSelect.value;
    const nameInput = document.getElementById('add-opp-deck-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const key = `${cls}___${name}`;
    deletedOppDecks = deletedOppDecks.filter(k => k !== key);
    saveDeletedOppDecks();

    if (!customOppDecks.some(d => d.class === cls && d.name === name)) {
      customOppDecks.unshift({ class: cls, name: name });
      saveCustomOppDecks();
    }

    nameInput.value = '';
    renderAll();
    lucide.createIcons();
    alert(`相手デッキ「[${cls}] ${name}」を候補に追加しました！`);
  });
}

function renderOppDecksManagement() {
  const container = document.getElementById('opp-decks-manage-grid');
  const emptyMsg = document.getElementById('opp-decks-empty-msg');
  container.innerHTML = '';

  const oppDeckMap = {};

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

  Object.entries(defaults).forEach(([cls, list]) => {
    list.forEach(name => {
      const key = `${cls}___${name}`;
      if (!deletedOppDecks.includes(key)) {
        oppDeckMap[key] = { class: cls, name: name, count: 0 };
      }
    });
  });

  customOppDecks.forEach(d => {
    const key = `${d.class}___${d.name}`;
    if (!deletedOppDecks.includes(key)) {
      oppDeckMap[key] = { class: d.class, name: d.name, count: 0 };
    }
  });

  matches.forEach(m => {
    if (m.oppClass && m.oppDeckName) {
      const key = `${m.oppClass}___${m.oppDeckName}`;
      if (!deletedOppDecks.includes(key)) {
        if (!oppDeckMap[key]) oppDeckMap[key] = { class: m.oppClass, name: m.oppDeckName, count: 0 };
        oppDeckMap[key].count += 1;
      }
    }
  });

  let list = Object.values(oppDeckMap);
  if (oppDeckManageClassFilter !== 'ALL') {
    list = list.filter(d => d.class === oppDeckManageClassFilter);
  }

  list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));

  if (list.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-[#182030] rounded-xl border border-[#273449] hover:border-[#384863] transition flex items-center justify-between gap-2';
    
    card.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="px-2 py-0.5 rounded text-[11px] border flex-shrink-0 ${getClassBadge(d.class)}">${d.class}</span>
        <div class="min-w-0">
          <div class="font-bold text-xs text-white truncate" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
          <div class="text-[10px] text-gray-400">対戦ログ: <strong class="text-cyan-400">${d.count}</strong> 件</div>
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0">
        <button type="button" class="btn-rename-opp-deck p-1.5 rounded-lg bg-[#222c3f] hover:bg-[#2c3952] text-gray-300 border border-[#344460] transition" data-class="${d.class}" data-name="${escapeHtml(d.name)}" title="名前を変更（過去ログ一括更新）">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
        <button type="button" class="btn-delete-opp-deck p-1.5 rounded-lg bg-[#222c3f] hover:bg-rose-950/70 text-gray-400 hover:text-rose-400 border border-[#344460] hover:border-rose-800 transition" data-class="${d.class}" data-name="${escapeHtml(d.name)}" title="この相手デッキを削除">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  container.querySelectorAll('.btn-rename-opp-deck').forEach(btn => {
    btn.addEventListener('click', () => handleRenameOpponentDeck(btn.dataset.class, btn.dataset.name));
  });

  container.querySelectorAll('.btn-delete-opp-deck').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteOpponentDeck(btn.dataset.class, btn.dataset.name));
  });

  lucide.createIcons();
}

function handleRenameOpponentDeck(className, oldName) {
  const newName = prompt(`相手デッキ「[${className}] ${oldName}」の新しい名前を入力してください:\n（過去の対戦ログも一括で修正されます）`, oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

  const trimmed = newName.trim();
  let affectedMatches = 0;

  matches.forEach(m => {
    if (m.oppClass === className && m.oppDeckName === oldName) {
      m.oppDeckName = trimmed;
      affectedMatches++;
    }
  });

  customOppDecks.forEach(d => {
    if (d.class === className && d.name === oldName) d.name = trimmed;
  });

  const newKey = `${className}___${trimmed}`;
  deletedOppDecks = deletedOppDecks.filter(k => k !== newKey);

  saveMatches();
  saveCustomOppDecks();
  saveDeletedOppDecks();

  renderAll();
  lucide.createIcons();
  alert(`「${oldName}」を「${trimmed}」に変更しました！（過去ログ${affectedMatches}件を更新）`);
}

function confirmDeleteOpponentDeck(className, deckName) {
  const matchCount = matches.filter(m => m.oppClass === className && m.oppDeckName === deckName).length;
  const key = `${className}___${deckName}`;

  if (matchCount > 0) {
    const choice = confirm(
      `相手デッキ「[${className}] ${deckName}」を削除しますか？\n\n` +
      `※ 過去の対戦ログが ${matchCount} 件あります。\n` +
      `【OK】: 相手デッキ名を候補から削除します。（過去の対戦記録は残し、相手デッキ名を「${className}不明」に変更します）\n` +
      `【キャンセル】: 削除を取り消します。`
    );

    if (!choice) return;

    matches.forEach(m => {
      if (m.oppClass === className && m.oppDeckName === deckName) {
        m.oppDeckName = `${className}不明`;
      }
    });
    saveMatches();
  } else {
    if (!confirm(`相手デッキ「[${className}] ${deckName}」を候補から削除しますか？`)) {
      return;
    }
  }

  if (!deletedOppDecks.includes(key)) {
    deletedOppDecks.push(key);
    saveDeletedOppDecks();
  }

  customOppDecks = customOppDecks.filter(d => !(d.class === className && d.name === deckName));
  saveCustomOppDecks();

  renderAll();
  lucide.createIcons();
}

// Matchup Drilldown Notes Modal Setup
function setupMatchupModal() {
  const modal = document.getElementById('matchup-notes-modal');
  const btnClose = document.getElementById('btn-close-matchup-modal');
  const btnDone = document.getElementById('btn-done-matchup-modal');

  btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  btnDone.addEventListener('click', () => modal.classList.add('hidden'));

  document.querySelectorAll('.mu-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mu-filter-btn').forEach(b => {
        b.className = 'mu-filter-btn px-3 py-1.5 rounded-lg bg-[#182030] text-gray-300 hover:text-white font-medium border border-[#29354a] transition whitespace-nowrap';
      });
      btn.className = 'mu-filter-btn active px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold transition whitespace-nowrap';

      currentMuFilter = btn.dataset.filter;
      renderMatchupModalList();
    });
  });
}

function openMatchupNotesModal(oppClass, oppDeckName) {
  const modal = document.getElementById('matchup-notes-modal');
  const filterSeasonVal = document.getElementById('analytics-season-filter').value;
  const filterDeckId = document.getElementById('analytics-deck-filter').value;

  currentMuOppClass = oppClass;
  currentMuOppDeckName = oppDeckName;

  let list = matches.filter(m => m.oppClass === oppClass && m.oppDeckName === oppDeckName);
  if (filterSeasonVal !== 'ALL') list = list.filter(m => m.seasonId === filterSeasonVal);
  if (filterDeckId !== 'ALL') list = list.filter(m => m.myDeckId === filterDeckId);

  currentMuMatches = list;

  const currentDeck = myDecks.find(d => d.id === filterDeckId);
  const myDeckName = filterDeckId === 'ALL' ? '全自デッキ総合' : (currentDeck?.name || '自デッキ');
  document.getElementById('mu-modal-my-deck').textContent = myDeckName;
  document.getElementById('mu-modal-opp-deck').textContent = oppDeckName;

  const oppBadge = document.getElementById('mu-modal-opp-badge');
  oppBadge.textContent = oppClass;
  oppBadge.className = `px-2 py-0.5 rounded text-xs border ${getClassBadge(oppClass)}`;

  const total = list.length;
  const wins = list.filter(m => m.result === 'WIN').length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const firstTurn = list.filter(m => m.turn === '先攻');
  const firstWins = firstTurn.filter(m => m.result === 'WIN').length;
  const firstRate = firstTurn.length > 0 ? Math.round((firstWins / firstTurn.length) * 100) : 0;

  const secondTurn = list.filter(m => m.turn === '後攻');
  const secondWins = secondTurn.filter(m => m.result === 'WIN').length;
  const secondRate = secondTurn.length > 0 ? Math.round((secondWins / secondTurn.length) * 100) : 0;

  document.getElementById('mu-modal-stats-summary').innerHTML = `
    <span>通算: <strong class="text-white">${total}</strong> 戦 (<strong class="text-emerald-400 font-bold">${wins}</strong>W - <strong class="text-rose-400 font-bold">${losses}</strong>L)</span>
    <span class="text-gray-500">|</span>
    <span>勝率: <strong class="text-cyan-400 font-bold">${winRate}%</strong></span>
    <span class="text-gray-500">|</span>
    <span>先攻: <strong class="text-amber-400 font-bold">${firstRate}%</strong> (${firstWins}/${firstTurn.length})</span>
    <span class="text-gray-500">|</span>
    <span>後攻: <strong class="text-indigo-400 font-bold">${secondRate}%</strong> (${secondWins}/${secondTurn.length})</span>
  `;

  document.getElementById('mu-count-all').textContent = total;
  document.getElementById('mu-count-lose').textContent = losses;
  document.getElementById('mu-count-win').textContent = wins;
  document.getElementById('mu-count-first').textContent = firstTurn.length;
  document.getElementById('mu-count-second').textContent = secondTurn.length;

  currentMuFilter = 'ALL';
  document.querySelectorAll('.mu-filter-btn').forEach((b, idx) => {
    if (idx === 0) b.className = 'mu-filter-btn active px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold transition whitespace-nowrap';
    else b.className = 'mu-filter-btn px-3 py-1.5 rounded-lg bg-[#182030] text-gray-300 hover:text-white font-medium border border-[#29354a] transition whitespace-nowrap';
  });

  renderMatchupModalList();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function renderMatchupModalList() {
  const container = document.getElementById('mu-matches-list');
  const emptyMsg = document.getElementById('mu-matches-empty-msg');
  container.innerHTML = '';

  let filtered = currentMuMatches;
  if (currentMuFilter === 'LOSE') filtered = filtered.filter(m => m.result === 'LOSE');
  else if (currentMuFilter === 'WIN') filtered = filtered.filter(m => m.result === 'WIN');
  else if (currentMuFilter === 'FIRST') filtered = filtered.filter(m => m.turn === '先攻');
  else if (currentMuFilter === 'SECOND') filtered = filtered.filter(m => m.turn === '後攻');

  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  filtered.forEach(m => {
    const isWin = m.result === 'WIN';
    const card = document.createElement('div');
    card.className = `p-3.5 bg-[#182030] rounded-xl border ${isWin ? 'border-emerald-900/50 hover:border-emerald-700/60' : 'border-rose-900/50 hover:border-rose-700/60'} space-y-2.5 transition`;

    card.innerHTML = `
      <div class="flex items-center justify-between text-xs pb-1.5 border-b border-[#243144]">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded text-xs font-black ${isWin ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700' : 'bg-rose-950/90 text-rose-400 border border-rose-700'}">
            ${m.result}
          </span>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${m.turn === '先攻' ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40' : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/40'}">
            ${m.turn}
          </span>
          <span class="text-gray-300 font-medium">使用自デッキ: <strong class="text-cyan-300">${escapeHtml(m.myDeckName)}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-gray-500">${formatRelativeDate(m.createdAt)}</span>
          <button type="button" class="btn-edit-memo-from-mu p-1 text-cyan-400 hover:text-cyan-200 rounded hover:bg-[#202c40] transition" data-id="${m.id}" title="メモを編集">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      ${m.memo ? `
        <div class="bg-[#101622] p-2.5 rounded-lg border border-[#222d3e] text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i data-lucide="message-square" class="w-3 h-3 text-cyan-400"></i>
            対戦メモ・分析・反省
          </div>
          ${escapeHtml(m.memo)}
        </div>
      ` : `
        <div class="flex items-center justify-between bg-[#101622] p-2.5 rounded-lg border border-[#222d3e] text-xs text-gray-500 italic">
          <span>対戦メモはまだ記録されていません</span>
          <button type="button" class="btn-edit-memo-from-mu text-[11px] text-cyan-400 hover:underline not-italic font-medium flex items-center gap-1" data-id="${m.id}">
            <i data-lucide="edit-3" class="w-3 h-3"></i>
            メモを追記する
          </button>
        </div>
      `}
    `;

    container.appendChild(card);
  });

  container.querySelectorAll('.btn-edit-memo-from-mu').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditModal(btn.dataset.id, () => {
        // Re-sync modal list after edit
        openMatchupNotesModal(currentMuOppClass, currentMuOppDeckName);
      });
    });
  });

  lucide.createIcons();
}

// Render Season Selectors
function renderSeasonSelectors() {
  const globalSelect = document.getElementById('global-season-select');
  const analyticsSeasonFilter = document.getElementById('analytics-season-filter');
  const historySeasonFilter = document.getElementById('history-filter-season');
  const badge = document.getElementById('record-current-season-badge');

  const currentSeason = seasons.find(s => s.id === currentSeasonId) || seasons[0];
  if (badge && currentSeason) badge.textContent = currentSeason.name;

  globalSelect.innerHTML = '';
  seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    if (s.id === currentSeasonId) opt.selected = true;
    globalSelect.appendChild(opt);
  });

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

// Update Opponent Deck Suggestions
function updateOpponentDeckSuggestions() {
  const container = document.getElementById('opp-deck-suggestions');
  container.innerHTML = '';

  const currentSeasonMatches = matches.filter(m => m.seasonId === currentSeasonId && m.oppClass === selectedOppClass);
  const currentSeasonCounts = {};
  currentSeasonMatches.forEach(m => {
    if (m.oppDeckName) currentSeasonCounts[m.oppDeckName] = (currentSeasonCounts[m.oppDeckName] || 0) + 1;
  });

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

  const customForClass = customOppDecks.filter(d => d.class === selectedOppClass).map(d => d.name);
  const sortedCurrent = Object.keys(currentSeasonCounts).sort((a, b) => currentSeasonCounts[b] - currentSeasonCounts[a]);
  const sortedAll = Object.keys(allCounts).sort((a, b) => allCounts[b] - allCounts[a]);
  const defaultList = defaults[selectedOppClass] || [];

  const rawCombined = Array.from(new Set([...customForClass, ...sortedCurrent, ...sortedAll, ...defaultList]));
  const combined = rawCombined
    .filter(name => !deletedOppDecks.includes(`${selectedOppClass}___${name}`))
    .slice(0, 9);

  if (combined.length === 0) {
    container.innerHTML = '<span class="text-xs text-gray-500 italic">候補なし（直接入力または「相手デッキ一覧・整理」から追加できます）</span>';
    return;
  }

  combined.forEach(deckName => {
    const isCurrentHot = (currentSeasonCounts[deckName] || 0) > 0;
    
    const chipWrapper = document.createElement('div');
    chipWrapper.className = `group inline-flex items-center rounded-lg border text-xs transition ${
      isCurrentHot 
        ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-200 hover:border-cyan-400' 
        : 'bg-[#20293a] border-[#2e3b52] text-gray-300 hover:bg-[#28354c] hover:border-gray-500'
    }`;

    const btnSelect = document.createElement('button');
    btnSelect.type = 'button';
    btnSelect.className = 'px-2.5 py-1 text-left flex items-center gap-1.5 focus:outline-none';
    btnSelect.innerHTML = `
      ${isCurrentHot ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>' : ''}
      <span class="truncate">${escapeHtml(deckName)}</span>
    `;
    btnSelect.addEventListener('click', () => {
      const input = document.getElementById('opp-deck-input');
      input.value = deckName;
      input.focus();
    });

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'px-1.5 py-1 text-gray-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-r-lg transition border-l border-white/5';
    btnDelete.title = `「${deckName}」を候補から削除`;
    btnDelete.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteOpponentDeck(selectedOppClass, deckName);
    });

    chipWrapper.appendChild(btnSelect);
    chipWrapper.appendChild(btnDelete);
    container.appendChild(chipWrapper);
  });

  lucide.createIcons();
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
      if (memoField.value) memoField.value += ` 【${text}】`;
      else memoField.value = `【${text}】 `;
      memoField.focus();
    });
  });
}

// Form Handlers
function setupFormHandlers() {
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

    const key = `${selectedOppClass}___${oppDeckName}`;
    if (deletedOppDecks.includes(key)) {
      deletedOppDecks = deletedOppDecks.filter(k => k !== key);
      saveDeletedOppDecks();
    }

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

    oppDeckInput.value = '';
    document.getElementById('match-memo').value = '';

    renderAll();
    lucide.createIcons();

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
      insights: { plan: '', mulligan: '', cards: '', review: '' },
      createdAt: Date.now()
    };

    myDecks.unshift(newDeck);
    saveDecks();
    localStorage.setItem(STORAGE_LAST_DECK_KEY, newDeck.id);

    nameInput.value = '';
    notesInput.value = '';

    renderAll();
    lucide.createIcons();
    alert(`現役デッキ「${name}」を登録しました！\n詳細な考察・マリガン基準は「考察ノート」から記入できます。`);
  });

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

  document.getElementById('btn-quick-add-my-deck').addEventListener('click', () => {
    switchTab('tab-decks');
    document.getElementById('subtab-my-decks').click();
    document.getElementById('new-deck-name').focus();
  });
}

// Render All Components
function renderAll() {
  renderSeasonSelectors();
  renderMyDeckSelectors();
  renderDecksList();
  renderOppDecksManagement();
  renderCurrentDeckSummary();
  renderRecentMemos();
  renderAnalytics();
  renderHistory();
  updateHeaderStats();
  updateOpponentDeckSuggestions();
}

// Render My Deck Selectors
function renderMyDeckSelectors() {
  const select = document.getElementById('my-deck-select');
  const chipsContainer = document.getElementById('my-deck-chips');
  const filterSelect = document.getElementById('analytics-deck-filter');
  const historyFilterSelect = document.getElementById('history-filter-deck');

  const activeDecks = myDecks.filter(d => d.status === 'active');
  const lastDeckId = localStorage.getItem(STORAGE_LAST_DECK_KEY) || (activeDecks[0]?.id || '');

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

// Render Current Deck Summary Card
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

  const allTimeMatches = matches.filter(m => m.myDeckId === selectedDeckId);
  const insights = deck.insights || {};
  const hasInsights = !!(insights.plan || insights.mulligan || insights.cards || insights.review);

  container.innerHTML = `
    <div class="text-left space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-base font-bold text-white">${escapeHtml(deck.name)}</span>
          <div class="text-[10px] text-cyan-400 font-semibold mt-0.5">※ ${currentSeason ? currentSeason.name : '今期'}の戦績</div>
        </div>
        <span class="px-2 py-0.5 rounded text-xs border ${getClassBadge(deck.class)}">${deck.class}</span>
      </div>

      <button type="button" class="btn-open-deck-notes w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 hover:from-cyan-900/60 hover:to-indigo-900/60 border border-cyan-700/50 text-cyan-300 text-xs font-bold flex items-center justify-between transition shadow-sm" data-id="${deck.id}">
        <span class="flex items-center gap-1.5">
          <i data-lucide="book-open" class="w-4 h-4 text-cyan-400"></i>
          <span>デッキ考察ノートを見る・書く</span>
        </span>
        <span class="text-[10px] text-gray-400 flex items-center gap-1">
          ${hasInsights ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 記入済' : '未記入'}
          <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </span>
      </button>

      ${insights.mulligan ? `
        <div class="bg-[#121824] p-2.5 rounded-xl border border-[#243144] text-xs space-y-1">
          <div class="text-[10px] font-bold text-amber-300 flex items-center gap-1">
            <i data-lucide="layers" class="w-3 h-3"></i>
            マリガン基準（抜粋）
          </div>
          <p class="text-gray-300 whitespace-pre-wrap text-[11px] max-h-20 overflow-y-auto leading-relaxed">${escapeHtml(insights.mulligan)}</p>
        </div>
      ` : insights.plan ? `
        <div class="bg-[#121824] p-2.5 rounded-xl border border-[#243144] text-xs space-y-1">
          <div class="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
            <i data-lucide="target" class="w-3 h-3"></i>
            基本立ち回り（抜粋）
          </div>
          <p class="text-gray-300 whitespace-pre-wrap text-[11px] max-h-20 overflow-y-auto leading-relaxed">${escapeHtml(insights.plan)}</p>
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

  container.querySelectorAll('.btn-open-deck-notes').forEach(btn => {
    btn.addEventListener('click', () => openDeckNotesModal(btn.dataset.id));
  });

  lucide.createIcons();
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

// Render Analytics Tab (Click on opponent deck name opens past memos drilldown!)
function renderAnalytics() {
  const filterSeasonVal = document.getElementById('analytics-season-filter').value;
  const filterDeckId = document.getElementById('analytics-deck-filter').value;

  let targetMatches = matches;
  if (filterSeasonVal !== 'ALL') targetMatches = targetMatches.filter(m => m.seasonId === filterSeasonVal);
  if (filterDeckId !== 'ALL') targetMatches = targetMatches.filter(m => m.myDeckId === filterDeckId);

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
        secondWins: 0,
        memoCount: 0
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

    if (m.memo && m.memo.trim().length > 0) {
      mu.memoCount += 1;
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
      tr.className = 'hover:bg-[#182030]/80 transition group';
      
      tr.innerHTML = `
        <td class="py-3 px-4">
          <button type="button" class="btn-open-matchup-memos text-left font-bold text-cyan-300 hover:text-cyan-100 flex items-center gap-2 group-hover:translate-x-0.5 transition" data-opp-class="${escapeHtml(mu.oppClass)}" data-opp-deck="${escapeHtml(mu.oppDeckName)}" title="クリックしてこの対面の過去メモ・反省を見る">
            <span class="hover:underline">${escapeHtml(mu.oppDeckName)}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full ${mu.memoCount > 0 ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-bold' : 'bg-gray-800 text-gray-500 font-normal'} flex items-center gap-1" title="過去の対戦メモ (${mu.memoCount}件)">
              <i data-lucide="message-square" class="w-3 h-3 ${mu.memoCount > 0 ? 'text-cyan-400' : 'text-gray-500'}"></i>
              <span>${mu.memoCount}</span>
            </span>
          </button>
        </td>
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

  // Attach event listener for clicking opponent deck name
  tbody.querySelectorAll('.btn-open-matchup-memos').forEach(btn => {
    btn.addEventListener('click', () => {
      openMatchupNotesModal(btn.dataset.oppClass, btn.dataset.oppDeck);
    });
  });

  renderAnalyticsCharts(targetMatches, matchupList);
  lucide.createIcons();
}

// Chart.js Rendering
function renderAnalyticsCharts(targetMatches, matchupList) {
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

  container.querySelectorAll('.btn-edit-memo').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.id));
  });

  lucide.createIcons();
}

// Render Decks List in Tab 4
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

    const insights = deck.insights || {};
    const hasInsights = !!(insights.plan || insights.mulligan || insights.cards || insights.review);

    const row = document.createElement('div');
    row.className = `p-4 bg-[#182030] rounded-xl border ${isArchived ? 'border-[#2d2a3d] opacity-85' : 'border-[#283449] hover:border-[#384762]'} transition space-y-3`;
    
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

        <div class="flex items-center gap-2 text-xs flex-wrap">
          <button class="btn-open-deck-notes px-2.5 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 font-bold flex items-center gap-1.5 transition" data-id="${deck.id}">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
            <span>考察ノート ${hasInsights ? '★' : ''}</span>
          </button>

          <button class="btn-toggle-status px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
            isArchived 
              ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70' 
              : 'border-amber-700/60 bg-amber-950/40 text-amber-300 hover:bg-amber-950/70'
          }" data-id="${deck.id}">
            <i data-lucide="${isArchived ? 'rotate-ccw' : 'archive'}" class="w-3.5 h-3.5"></i>
            <span>${isArchived ? '現役に復活' : 'スタン落ちへ'}</span>
          </button>

          <button class="btn-duplicate-deck p-1.5 rounded-lg bg-[#222c3f] hover:bg-[#2c3952] text-gray-300 border border-[#344460] transition" data-id="${deck.id}" title="このデッキを複製して新シーズン版を作る">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          </button>

          <button class="btn-delete-deck p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 transition" data-id="${deck.id}" title="デッキを削除">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      ${hasInsights ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
          ${insights.plan ? `
            <div class="bg-[#121824] p-2 rounded-lg border border-[#212c3f] space-y-0.5">
              <span class="text-[10px] font-bold text-cyan-400 flex items-center gap-1">🎯 立ち回り方針</span>
              <p class="text-gray-300 text-[11px] whitespace-pre-wrap line-clamp-2">${escapeHtml(insights.plan)}</p>
            </div>
          ` : ''}
          ${insights.mulligan ? `
            <div class="bg-[#121824] p-2 rounded-lg border border-[#212c3f] space-y-0.5">
              <span class="text-[10px] font-bold text-amber-400 flex items-center gap-1">🃏 マリガン基準</span>
              <p class="text-gray-300 text-[11px] whitespace-pre-wrap line-clamp-2">${escapeHtml(insights.mulligan)}</p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${deck.notes ? `
        <div class="text-xs text-gray-400 bg-[#121722] p-2 rounded-lg border border-[#232b3d] flex items-start gap-1.5">
          <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0"></i>
          <span class="whitespace-pre-wrap">${escapeHtml(deck.notes)}</span>
        </div>
      ` : ''}
    `;

    container.appendChild(row);
  });

  container.querySelectorAll('.btn-open-deck-notes').forEach(btn => {
    btn.addEventListener('click', () => openDeckNotesModal(btn.dataset.id));
  });

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
        insights: JSON.parse(JSON.stringify(target.insights || { plan: '', mulligan: '', cards: '', review: '' })),
        createdAt: Date.now()
      };

      myDecks.unshift(newDeck);
      saveDecks();
      localStorage.setItem(STORAGE_LAST_DECK_KEY, newDeck.id);
      renderAll();
      lucide.createIcons();
      alert(`「${newName}」を現役デッキとして作成しました！\n考察ノートも引き継がれています。`);
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

  lucide.createIcons();
}

// Edit Modal Handling
function openEditModal(matchId, callback) {
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
    if (callback) callback();
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
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll('.nav-switch').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.target));
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    if (isActive) t.className = 'nav-tab active flex items-center gap-2 pb-3 px-1 border-b-2 border-cyan-400 text-cyan-400 font-semibold whitespace-nowrap';
    else t.className = 'nav-tab flex items-center gap-2 pb-3 px-1 border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition font-medium whitespace-nowrap';
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

  if (tabId === 'tab-analytics') renderAnalytics();

  lucide.createIcons();
}

// Filters & Search Setup
function setupFiltersAndSearch() {
  document.getElementById('history-search').addEventListener('input', renderHistory);
  document.getElementById('history-filter-result').addEventListener('change', renderHistory);
  document.getElementById('history-filter-deck').addEventListener('change', renderHistory);
  document.getElementById('analytics-deck-filter').addEventListener('change', () => renderAnalytics());

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('すべての対戦履歴とデッキデータを消去しますか？\n（事前に「保存」ボタンからバックアップを保存しておくことを推奨します）')) {
      matches = [];
      deletedOppDecks = [];
      customOppDecks = [];
      saveMatches();
      saveDeletedOppDecks();
      saveCustomOppDecks();
      renderAll();
      lucide.createIcons();
    }
  });
}

// Export / Import JSON & Samples
function setupDataManagement() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = {
      version: '2.3',
      exportedAt: new Date().toISOString(),
      seasons: seasons,
      currentSeasonId: currentSeasonId,
      decks: myDecks,
      matches: matches,
      deletedOppDecks: deletedOppDecks,
      customOppDecks: customOppDecks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadowverse_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const fileInput = document.getElementById('import-file-input');
  document.getElementById('btn-import-trigger').addEventListener('click', () => fileInput.click());

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
        if (imported.deletedOppDecks && Array.isArray(imported.deletedOppDecks)) {
          deletedOppDecks = imported.deletedOppDecks;
          saveDeletedOppDecks();
        }
        if (imported.customOppDecks && Array.isArray(imported.customOppDecks)) {
          customOppDecks = imported.customOppDecks;
          saveCustomOppDecks();
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

  document.getElementById('btn-add-sample').addEventListener('click', () => addSampleData());
}

function addSampleData() {
  const sampleSeasons = [
    { id: 'season-current', name: '第33弾 Resurgent Legends (現環境)', createdAt: Date.now() - 3600000 * 24 * 30 },
    { id: 'season-prev', name: '第32弾 Heroes of Rivenbrandt (前環境)', createdAt: Date.now() - 3600000 * 24 * 90 }
  ];

  const sampleDecks = [
    { 
      id: 'deck-1', 
      name: '進化ロイヤル', 
      class: 'ロイヤル', 
      status: 'active', 
      notes: 'カゲミツ・オクトー軸。今期も続投中', 
      insights: {
        plan: '【序盤】2Tフォロワーから連携を稼ぐ。\n【中盤】5T目カゲミツ進化で盤面を制圧し、進化回数を稼ぐ。\n【リーサル】7〜8T目にオクトーと疾走フォロワーで一気に20点削り切る。',
        mulligan: '【共通】2コスフォロワー最優先確保\n【先攻】テンポ重視で1・2・3の動きをキープ\n【後攻】除去札・進化時多面処理できるフォロワーを単キープ',
        cards: '【採用調整】\n・低コスト除去スペル: 2枚→3枚 (アグロ対面への回答)\n・重いフィニッシャー: 3枚→2枚 (手札事故防止)',
        review: '先攻時の安定感は非常に高いが、後攻でアグロ相手に押し切られる試合があった。序盤の受け札をもう少し厚くするか要検討。'
      },
      createdAt: Date.now() - 3600000 * 24 * 20 
    },
    { 
      id: 'deck-2', 
      name: '秘術ウィッチ', 
      class: 'ウィッチ', 
      status: 'active', 
      notes: '新カードノーマン採用で打点強化', 
      insights: {
        plan: '土のスタック管理とノーマンの守護で中盤を耐え、終盤に紅蓮の魔術等でバースト。',
        mulligan: '土の印供給札を最優先キープ。後攻は除去札もセット。',
        cards: 'ノーマン3枚必須。盤面除去札の枚数を微調整中。',
        review: 'スタック切れを起こさないプレイングが最重要。'
      },
      createdAt: Date.now() - 3600000 * 24 * 15 
    },
    { 
      id: 'deck-3', 
      name: '旧・結晶ビショップ', 
      class: 'ビショップ', 
      status: 'archived', 
      notes: '【スタン落ち】スカルフェイン落ちのため保管庫へ移動', 
      insights: {
        plan: '結晶5回達成でスカルフェイン早期着地',
        mulligan: 'スカルフェイン全力マリガン',
        cards: 'スタン落ちのため現行ローテでは使用不可',
        review: '前環境最強の一角だったがキーカードがスタン落ちしたため保管庫へ移行。'
      },
      createdAt: Date.now() - 3600000 * 24 * 80 
    }
  ];

  const sampleMatches = [
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
      memo: 'カゲミツ進化で盤面を制圧し、相手の土の印の消化が遅れた隙に7Tオクトーから押し切り成功。',
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
      memo: '【マリガン事故】後攻で2コス引けず。7Tノーマンの守護裏を処理できずに紅蓮＋パメラでリーサル取られた。守護突破の札を構えておくべきだった。',
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
      memo: 'PPブーストされる前に低コストを横展開して顔面を削り切った。新カードの採用が功を奏した。',
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
      memo: '【理想ムーブ】土の印が途切れず綺麗に回り完勝。ノーマンの守護が刺さった。',
      createdAt: Date.now() - 3600000 * 4
    },
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
  deletedOppDecks = [];
  customOppDecks = [];

  saveSeasons();
  saveDecks();
  saveMatches();
  saveDeletedOppDecks();
  saveCustomOppDecks();
  localStorage.setItem(STORAGE_CURRENT_SEASON_KEY, currentSeasonId);

  renderAll();
  lucide.createIcons();
  alert('サンプルデータを投入しました！\n「デッキ相性＆勝率分析」タブの表からデッキ名をクリックしてみてください。');
}

// Helpers
function updateHeaderStats() {
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
