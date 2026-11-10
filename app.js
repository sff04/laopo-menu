/* =========================================================
   咱家小灶 · 家庭点菜
   单文件应用逻辑：数据层 / 菜单 / 点菜车 / 心愿单 / 订单 / 推送
   ========================================================= */
(function () {
  'use strict';

  /* 屏蔽托管平台注入的推广角标（页面加载后动态出现的也一并移除） */
  (function () {
    const KILL = '.button-container, .edgeone-button, .close-button, .edgeone-banner';
    const sweep = () => {
      document.querySelectorAll(KILL).forEach((n) => {
        n.style.setProperty('display', 'none', 'important');
        try { n.remove(); } catch (e) { /* ignore */ }
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sweep);
    } else {
      sweep();
    }
    try {
      new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
  })();

  /* ================= 工具 ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const uid = (p) => (p || '') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const money = (n) => '\u00a5' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const byId = (id) => state.menu.find((d) => d.id === id);

  function fmtDateTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
    const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (sameDay) return '今天 ' + t;
    if (yest) return '昨天 ' + t;
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + t;
  }
  function fmtMonthDay(ts) {
    const d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /* ================= 默认数据 ================= */
  const CATS = ['荤菜', '素菜', '汤羹', '主食'];
  const EMOJIS = ['🍖', '🍗', '🥩', '🐟', '🍤', '🥓', '🍅', '🥦', '🥬', '🥔', '🍲', '🍜', '🍚', '🥟', '🍛', '🍝', '🥭', '🍮', '🍨', '🥤', '🍋', '🥛', '☕', '🍰', '🥗', '🌶️', '🧄', '🥚', '🍳', '🧀'];
  const TAGS = ['招牌', '下饭', '清淡', '微辣', '重辣', '快手', '养胃', '新品', '孩子爱吃'];

  const d = (name, emoji, cat, price, desc, tags, spicy) => ({
    id: uid('d'), name, emoji, cat, price, desc: desc || '', tags: tags || [], spicy: spicy || 0,
    img: '', off: false, sold: 0, ratingSum: 0, ratingCnt: 0
  });

  function defaultMenu() {
    return [
      d('红烧肉', '🍖', '荤菜', 42, '小火慢炖两小时，肥而不腻，拌饭一绝', ['招牌', '下饭'], 0),
      d('可乐鸡翅', '🍗', '荤菜', 32, '甜咸口的经典，收汁亮晶晶', ['下饭', '孩子爱吃'], 0),
      d('糖醋排骨', '🥩', '荤菜', 45, '酸甜挂汁，啃骨头也开心', ['招牌'], 0),
      d('宫保鸡丁', '🍤', '荤菜', 32, '花生米脆脆的，微微辣', ['微辣', '下饭'], 1),
      d('清蒸鲈鱼', '🐟', '荤菜', 48, '葱姜蒸八分钟，鲜到掉眉', ['清淡'], 0),
      d('回锅肉', '🥓', '荤菜', 36, '二刀肉配蒜苗，锅气十足', ['重辣', '下饭'], 2),
      d('黑椒牛柳', '🥩', '荤菜', 46, '嫩滑牛柳，黑椒浓香', ['招牌'], 0),
      d('番茄炒蛋', '🍅', '素菜', 18, '多汁番茄配软蛋，永远的国民菜', ['快手', '孩子爱吃'], 0),
      d('蒜蓉西兰花', '🥦', '素菜', 18, '蒜香清爽，解腻担当', ['清淡'], 0),
      d('清炒时蔬', '🥬', '素菜', 16, '当季青菜，大火快炒', ['清淡', '快手'], 0),
      d('干锅花菜', '🥦', '素菜', 24, '干香微辣，越吃越上头', ['微辣'], 1),
      d('醋溜土豆丝', '🥔', '素菜', 14, '酸辣脆爽，切得细细的', ['快手'], 1),
      d('番茄蛋汤', '🍲', '汤羹', 14, '酸甜开胃，一碗下肚暖呼呼', ['清淡', '快手'], 0),
      d('冬瓜排骨汤', '🍲', '汤羹', 26, '清甜不油，喝汤吃肉', ['清淡', '养胃'], 0),
      d('紫菜蛋花汤', '🍜', '汤羹', 12, '三分钟出锅的救急汤', ['快手'], 0),
      d('蛋炒饭', '🍚', '主食', 16, '粒粒分明，锅气十足', ['快手'], 0),
      d('葱油拌面', '🍝', '主食', 16, '熬香的葱油，拌一拌就香', ['快手'], 0),
      d('手工水饺', '🥟', '主食', 22, '猪肉白菜馅，现包现煮', ['招牌'], 0),
      d('扬州炒饭', '🍛', '主食', 20, '虾仁火腿青豆，料很足', [], 0)
    ];
  }

  function defaultState() {
    return {
      version: 1,
      menu: defaultMenu(),
      cart: [],
      orders: [],
      wishes: [],
      settings: {
        shopName: '咱家小灶',
        slogan: '今天想吃点什么呀',
        ownerName: '老公',
        eaterName: '老婆',
        theme: 'warm',
        showPrice: true,
        seenWelcome: false,
        cats: CATS.slice(),
        channels: [],
        autoPush: true
      }
    };
  }

  /* ================= 状态与存储 ================= */
  const STORE_KEY = 'laopo_menu_state_v1';
  let state = defaultState();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      state = Object.assign(defaultState(), s);
      state.settings = Object.assign(defaultState().settings, s.settings || {});
      if (!Array.isArray(state.menu)) state.menu = defaultMenu();
      if (!Array.isArray(state.cart)) state.cart = [];
      if (!Array.isArray(state.orders)) state.orders = [];
      if (!Array.isArray(state.wishes)) state.wishes = [];
      if (!Array.isArray(state.settings.channels)) state.settings.channels = [];
      if (!Array.isArray(state.settings.cats) || !state.settings.cats.length) state.settings.cats = CATS.slice();
      // 旧数据迁移：分类去掉「招牌 / 甜品 / 饮品」，原招牌菜归入荤菜
      const removed = ['招牌', '甜品', '饮品'];
      if (state.settings.cats.some((c) => removed.indexOf(c) > -1)) {
        state.settings.cats = state.settings.cats.filter((c) => removed.indexOf(c) < 0);
        if (!state.settings.cats.length) state.settings.cats = CATS.slice();
        state.menu.forEach((m) => {
          if (m.cat === '招牌') m.cat = state.settings.cats.indexOf('荤菜') > -1 ? '荤菜' : (state.settings.cats[0] || '荤菜');
        });
        save(true);
      }
    } catch (e) {
      console.warn('读取本地数据失败', e);
    }
  }

  let saveTimer = null;
  function save(immediate) {
    const run = () => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        toast('保存失败，浏览器存储可能已满', 'err');
      }
    };
    if (immediate) { clearTimeout(saveTimer); run(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(run, 220);
  }

  /* ================= 提示与弹层 ================= */
  let toastTimer = null;
  function toast(msg, type) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2400);
  }

  const openedSheets = [];
  function openSheet(opts) {
    const host = $('#sheetHost');
    const mask = document.createElement('div');
    mask.className = 'sheet-mask';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    const actions = (opts.actions || []).map((a, i) =>
      '<button class="btn ' + (a.cls || '') + '" data-act="' + i + '">' + esc(a.text) + '</button>'
    ).join('');
    sheet.innerHTML =
      '<div class="sheet-handle"></div>' +
      (opts.title ? '<h3>' + esc(opts.title) + '</h3>' : '') +
      (opts.sub ? '<p class="sheet-sub">' + opts.sub + '</p>' : '') +
      '<div class="sheet-body">' + (opts.body || '') + '</div>' +
      (actions ? '<div class="sheet-actions">' + actions + '</div>' : '');
    host.appendChild(mask);
    host.appendChild(sheet);

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      mask.classList.add('closing');
      sheet.classList.add('closing');
      setTimeout(() => { mask.remove(); sheet.remove(); }, 230);
      const i = openedSheets.indexOf(handle);
      if (i > -1) openedSheets.splice(i, 1);
      if (opts.onClose) opts.onClose();
    }
    const handle = { close, el: sheet, mask };
    openedSheets.push(handle);

    mask.addEventListener('click', close);
    $$('[data-act]', sheet).forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = (opts.actions || [])[Number(btn.dataset.act)];
        if (a && a.onClick) a.onClick(close, sheet);
        else close();
      });
    });
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    if (opts.onMount) setTimeout(() => opts.onMount(sheet, close), 0);
    return handle;
  }

  function confirmDialog(title, text, okText, danger) {
    return new Promise((resolve) => {
      let settled = false;
      const s = openSheet({
        title: title,
        sub: text ? esc(text) : '',
        body: '<div style="height:6px"></div>',
        actions: [
          { text: '算了', cls: '', onClick: (c) => { settled = true; c(); resolve(false); } },
          {
            text: okText || '确定', cls: danger ? 'btn-danger' : 'btn-primary',
            onClick: (c) => { settled = true; c(); resolve(true); }
          }
        ],
        onClose: () => { if (!settled) resolve(false); }
      });
      return s;
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ================= 主题 ================= */
  function compressImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('不是图片')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const scale = Math.min(1, (maxSize || 460) / Math.max(img.width || 1, img.height || 1));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(cv.toDataURL('image/jpeg', quality || 0.72));
          } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('图片解码失败'));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function applyTheme() {
    const t = state.settings.theme === 'dark' ? 'dark' : 'warm';
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    $('#btnTheme').textContent = t === 'dark' ? '☀️' : '🌙';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#15100D' : '#FFF7F0');
  }

  /* ================= 路由 ================= */
  let currentView = 'menu';
  const renderers = {};
  function go(view, opts) {
    if (!renderers[view]) return;
    currentView = view;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view || (view === 'manage' && t.dataset.view === 'me')));
    renderers[view](opts || {});
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    updateFab();
  }

  function updateFab() {
    const n = state.cart.reduce((s, i) => s + i.qty, 0);
    const badge = $('#cartBadge');
    if (badge) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.classList.toggle('hidden', n === 0);
    }
    const fab = $('#cartFab');
    if (!fab) return;
    const showFab = n > 0 && currentView === 'menu';
    fab.classList.toggle('hidden', !showFab);
    if (showFab) {
      $('#fabTxt').textContent = '已选 ' + n + ' 道菜';
      const total = cartTotal();
      $('#fabTotal').textContent = state.settings.showPrice ? money(total) : '去下单';
    }
  }

  function cartTotal() {
    return state.cart.reduce((s, i) => {
      const dish = byId(i.dishId);
      return s + (dish ? dish.price * i.qty : 0);
    }, 0);
  }

  /* ================= 菜单 ================= */
  let activeCat = '全部';
  let searchKw = '';

  function dishCard(dish) {
    const qty = (state.cart.find((i) => i.dishId === dish.id) || {}).qty || 0;
    const rate = dish.ratingCnt ? (dish.ratingSum / dish.ratingCnt) : 0;
    const tags = (dish.tags || []).map((t) =>
      '<span class="chip ' + (t === '招牌' ? 'chip-hot' : t === '新品' ? 'chip-new' : t.indexOf('辣') > -1 ? 'chip-spicy' : '') + '">' + esc(t) + '</span>'
    ).join('');
    const thumb = dish.img
      ? '<img src="' + esc(dish.img) + '" alt="" loading="lazy" onerror="this.remove()">'
      : esc(dish.emoji || '🍽️');
    const priceHtml = state.settings.showPrice ? '<span class="dish-price">' + money(dish.price) + '</span>' : '<span class="dish-price" style="font-size:12px;color:var(--ink-3)">随便点</span>';
    const rateHtml = dish.ratingCnt ? '<span class="dish-rate">★ ' + rate.toFixed(1) + '</span>' : '';
    const ctrl = dish.off
      ? '<span class="chip chip-off">今日售罄</span>'
      : (qty > 0
        ? '<div class="qty-ctrl"><button data-q="-1">−</button><span class="qty-num">' + qty + '</span><button data-q="1">＋</button></div>'
        : '<button class="add-btn" data-q="1" aria-label="加入点菜车">＋</button>');

    return '<div class="dish' + (dish.off ? ' off' : '') + '" data-id="' + dish.id + '">' +
      '<div class="dish-thumb">' + thumb + '</div>' +
      '<div class="dish-main">' +
        '<div class="dish-name"><b>' + esc(dish.name) + '</b>' + (dish.spicy >= 2 ? '🌶️🌶️' : dish.spicy === 1 ? '🌶️' : '') + '</div>' +
        (dish.desc ? '<div class="dish-desc">' + esc(dish.desc) + '</div>' : '') +
        (tags ? '<div class="dish-tags">' + tags + '</div>' : '') +
        '<div class="dish-foot"><div style="display:flex;align-items:center;gap:8px">' + priceHtml + rateHtml + '</div><div class="dish-ctrl">' + ctrl + '</div></div>' +
      '</div>' +
    '</div>';
  }

  renderers.menu = function () {
    // 分类条
    const cats = ['全部'].concat(state.settings.cats.filter((c) => state.menu.some((x) => x.cat === c)));
    state.menu.forEach((x) => { if (x.cat && cats.indexOf(x.cat) === -1) cats.push(x.cat); });
    if (cats.indexOf(activeCat) === -1) activeCat = '全部';
    $('#catBar').innerHTML = cats.map((c) =>
      '<button class="cat-chip' + (c === activeCat ? ' active' : '') + '" data-cat="' + esc(c) + '">' +
      esc(c) + '<span style="opacity:.6;font-size:11px;margin-left:3px">' +
      (c === '全部' ? state.menu.length : state.menu.filter((x) => x.cat === c).length) + '</span></button>'
    ).join('');

    // 列表
    const kw = searchKw.trim().toLowerCase();
    let list = state.menu.filter((x) => activeCat === '全部' || x.cat === activeCat);
    if (kw) {
      list = state.menu.filter((x) => {
        const hay = [x.name, x.desc, x.cat, (x.tags || []).join(' ')].join(' ').toLowerCase();
        return hay.indexOf(kw) > -1;
      });
    }
    // 售罄沉底
    list = list.slice().sort((a, b) => (a.off ? 1 : 0) - (b.off ? 1 : 0));

    $('#menuList').innerHTML = list.map(dishCard).join('');
    $('#menuList').classList.toggle('hidden', list.length === 0);
    $('#menuEmpty').classList.toggle('hidden', list.length > 0);
    if (!list.length) {
      $('#menuEmpty').querySelector('.empty-title').textContent = kw ? '没找到「' + searchKw + '」' : '这里还空空的';
      $('#menuEmpty').querySelector('.empty-sub').textContent = kw ? '换个词试试，或者去菜单管理里加一道' : '去「我的 → 菜单管理」把拿手菜加进来吧';
    }
    // 店名
    $('#shopName').textContent = state.settings.shopName || '咱家小灶';
    $('#shopSlogan').textContent = state.settings.slogan || '今天想吃点什么呀';
    document.title = (state.settings.shopName || '咱家小灶') + ' · 点菜';
    updateFab();
  };

  function bindMenuEvents() {
    // 底部导航
    $$('.tab').forEach((t) => {
      t.addEventListener('click', () => {
        const v = t.dataset.view;
        if (v === currentView) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        go(v);
      });
    });

    $('#catBar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      activeCat = b.dataset.cat;
      renderers.menu();
    });

    let searchTimer = null;
    $('#searchInput').addEventListener('input', (e) => {
      searchKw = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderers.menu(), 160);
    });

    $('#menuList').addEventListener('click', (e) => {
      const qBtn = e.target.closest('[data-q]');
      const card = e.target.closest('.dish');
      if (!card) return;
      const id = card.dataset.id;
      if (qBtn) {
        e.stopPropagation();
        const delta = Number(qBtn.dataset.q);
        changeQty(id, delta);
        renderers.menu();
        return;
      }
      openDishDetail(id);
    });

    $('#btnTheme').addEventListener('click', () => {
      state.settings.theme = state.settings.theme === 'dark' ? 'warm' : 'dark';
      save(true);
      applyTheme();
      toast(state.settings.theme === 'dark' ? '夜间模式，暖光调暗啦' : '回到暖光模式');
    });

    $('#btnLuck').addEventListener('click', openLucky);

    $('#cartFab').addEventListener('click', () => go('cart'));

    window.addEventListener('scroll', () => {
      $('#topbar').classList.toggle('scrolled', window.scrollY > 4);
    }, { passive: true });
  }

  function changeQty(dishId, delta) {
    const dish = byId(dishId);
    if (!dish) return;
    if (dish.off && delta > 0) { toast('这道今天售罄了，明天再来'); return; }
    const item = state.cart.find((i) => i.dishId === dishId);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) state.cart = state.cart.filter((i) => i.dishId !== dishId);
    } else if (delta > 0) {
      state.cart.push({ dishId, qty: delta, note: '' });
    }
    save();
    updateFab();
  }

  function openDishDetail(id) {
    const dish = byId(id);
    if (!dish) return;
    const rate = dish.ratingCnt ? (dish.ratingSum / dish.ratingCnt).toFixed(1) : '';
    const tags = (dish.tags || []).map((t) => '<span class="chip">' + esc(t) + '</span>').join(' ');
    const stars = rate ? '<div style="margin-top:6px;font-size:12.5px;color:var(--ink-3)">' + starHtml(dish.ratingSum / dish.ratingCnt) + ' ' + rate + '（' + dish.ratingCnt + '次评价）</div>' : '';
    openSheet({
      title: (dish.emoji || '🍽️') + ' ' + dish.name,
      sub: (dish.cat ? esc(dish.cat) + ' · ' : '') + (state.settings.showPrice ? money(dish.price) : '心意菜') +
        (dish.sold ? ' · 已点 ' + dish.sold + ' 次' : ''),
      body:
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          (dish.desc ? '<p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">' + esc(dish.desc) + '</p>' : '') +
          (tags ? '<div style="display:flex;gap:6px;flex-wrap:wrap">' + tags + '</div>' : '') +
          stars +
          '<div class="field" style="margin:4px 0 0"><label>' + esc(state.settings.eaterName) + '想说的（可选）</label>' +
            '<input class="input" id="dishNote" placeholder="比如：少放盐 / 多加辣 / 想吃焦一点" maxlength="40"></div>' +
        '</div>',
      actions: dish.off
        ? [{ text: '今天卖完啦，先加心愿单', cls: 'btn-ghost', onClick: (c) => { c(); addWish(dish.name, dish.id); } }]
        : [
          { text: '先放心愿单', cls: '', onClick: (c) => { c(); addWish(dish.name, dish.id); } },
          { text: '加入点菜车', cls: 'btn-primary', onClick: (c, el) => {
            const note = ($('#dishNote', el) || {}).value || '';
            changeQty(dish.id, 1);
            const item = state.cart.find((i) => i.dishId === dish.id);
            if (item && note) item.note = note.trim();
            save();
            c();
            renderers.menu();
            toast('已加入点菜车：' + dish.name, 'ok');
          } }
        ]
    });
  }

  function starHtml(v) {
    const full = Math.round(v);
    let s = '';
    for (let i = 1; i <= 5; i++) s += '<i class="' + (i <= full ? 'on' : '') + '">★</i>';
    return '<span class="stars">' + s + '</span>';
  }

  /* ================= 今天吃啥 ================= */
  function openLucky() {
    const pool = state.menu.filter((m) => !m.off);
    if (pool.length < 3) { toast('菜单太少了，先去加几道菜吧'); return; }

    // 尽量凑齐 荤 / 素 / 汤 三类组合
    function smartPick() {
      const groups = [['荤菜'], ['素菜'], ['汤羹', '主食']];
      const used = {};
      const out = [];
      groups.forEach((g) => {
        const cand = pool.filter((m) => g.indexOf(m.cat) > -1 && !used[m.id]);
        const rest = pool.filter((m) => !used[m.id]);
        const chosen = cand.length ? pick(cand) : (rest.length ? pick(rest) : pick(pool));
        used[chosen.id] = 1;
        out.push(chosen);
      });
      return out;
    }

    let current = smartPick();
    let rolling = false;
    let rootEl = null;

    function roll() {
      if (rolling || !rootEl) return;
      const slot = $('#luckySlot', rootEl);
      if (!slot) return;
      rolling = true;
      const cells = $$('.slot-cell', slot);
      cells.forEach((c) => c.classList.add('rolling'));
      let ticks = 0;
      const timer = setInterval(() => {
        ticks++;
        const cand = smartPick();
        cells.forEach((c, i) => {
          const m = cand[i] || pick(pool);
          c.innerHTML = '<div class="slot-emoji">' + esc(m.emoji || '🍽️') + '</div><div class="slot-name">' + esc(m.name) + '</div>';
        });
        if (ticks > 12) {
          clearInterval(timer);
          current = smartPick();
          cells.forEach((c, i) => {
            const m = current[i];
            c.innerHTML = '<div class="slot-emoji">' + esc(m.emoji || '🍽️') + '</div><div class="slot-name">' + esc(m.name) + '</div>';
            c.classList.remove('rolling');
            c.classList.add('hit');
            setTimeout(() => c.classList.remove('hit'), 500);
          });
          const tip = $('#luckyTip', rootEl);
          if (tip) tip.textContent = pick(['就这么定了，别挑了 😌', '大厨说这个搭配很稳 👨‍🍳', '今日份答案，去下单吧 ✨']);
          rolling = false;
        }
      }, 80);
    }

    const s = openSheet({
      title: '🎲 今天吃啥',
      sub: '选择困难的时候，就交给它吧',
      body:
        '<div class="lucky-box">' +
          '<div class="lucky-slot" id="luckySlot">' +
            current.map((m) => '<div class="slot-cell"><div class="slot-emoji">' + esc(m.emoji || '🍽️') + '</div><div class="slot-name">' + esc(m.name) + '</div></div>').join('') +
          '</div>' +
          '<p class="hint" id="luckyTip">一荤一素一汤，配好了</p>' +
        '</div>',
      actions: [
        { text: '再摇一次', cls: '', onClick: () => roll() },
        { text: '就它们了', cls: 'btn-primary', onClick: (c) => {
          current.forEach((m) => changeQty(m.id, 1));
          save(); c(); renderers.menu();
          toast('已加入 ' + current.length + ' 道菜', 'ok');
          setTimeout(() => go('cart'), 260);
        } }
      ],
      onMount: (el) => {
        rootEl = el;
        // 摇一摇手机也能换
        let lastShake = 0;
        window.addEventListener('devicemotion', function shakes(ev) {
          if (!document.body.contains(el)) { window.removeEventListener('devicemotion', shakes); return; }
          const a = ev.accelerationIncludingGravity;
          if (!a) return;
          const force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
          if (force > 34 && Date.now() - lastShake > 1200) { lastShake = Date.now(); roll(); }
        });
      }
    });
    return s;
  }

  /* ================= 点菜车 ================= */
  let mealChoice = 'now';
  let mealCustom = '';
  let orderNoteDraft = '';

  renderers.cart = function () {
    const body = $('#cartBody');
    if (!state.cart.length) {
      body.innerHTML =
        '<div class="empty"><div class="empty-emoji">🧺</div>' +
        '<p class="empty-title">点菜车还是空的</p>' +
        '<p class="empty-sub">回去看看菜单，或者让骰子帮你决定</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;margin-top:18px">' +
        '<button class="btn btn-ghost" id="emptyLuck">🎲 今天吃啥</button>' +
        '<button class="btn btn-primary" id="emptyGo">去点菜</button></div></div>';
      $('#emptyGo').addEventListener('click', () => go('menu'));
      $('#emptyLuck').addEventListener('click', () => { go('menu'); setTimeout(openLucky, 320); });
      return;
    }

    const rows = state.cart.map((item) => {
      const dish = byId(item.dishId);
      if (!dish) return '';
      const thumb = dish.img ? '<img src="' + esc(dish.img) + '" alt="" onerror="this.remove()">' : esc(dish.emoji || '🍽️');
      return '<div class="cart-item" data-id="' + dish.id + '">' +
        '<div class="cart-thumb">' + thumb + '</div>' +
        '<div class="cart-main"><b>' + esc(dish.name) + '</b>' +
          '<span>' + (state.settings.showPrice ? money(dish.price) + ' × ' + item.qty + ' = ' + money(dish.price * item.qty) : '数量 × ' + item.qty) + '</span>' +
          (item.note ? '<span style="color:var(--primary-d)">' + esc(item.note) + '</span>' : '') +
        '</div>' +
        '<div class="qty-ctrl"><button data-q="-1">−</button><span class="qty-num">' + item.qty + '</span><button data-q="1">＋</button></div>' +
      '</div>';
    }).join('');

    const total = cartTotal();
    body.innerHTML =
      '<div class="sec-title"><h2>点了这些</h2><button class="btn btn-sm" id="clearCart" style="color:var(--red)">清空</button></div>' +
      '<div class="card" style="padding:6px 14px">' + rows +
        '<div class="total-bar"><span class="tb-label">合计 ' + state.cart.reduce((s, i) => s + i.qty, 0) + ' 份</span>' +
        '<span class="tb-num">' + (state.settings.showPrice ? money(total) : '心意无价') + '</span></div>' +
      '</div>' +

      '<div class="sec-title"><h2>什么时候吃</h2></div>' +
      '<div class="card" style="padding:14px">' +
        '<div class="tag-pick" id="mealPick">' +
          ['now', '30', '60', 'custom'].map((k) => {
            const label = k === 'now' ? '现在就做' : k === '30' ? '半小时后' : k === '60' ? '一小时后' : '指定时间';
            return '<button data-meal="' + k + '" class="' + (mealChoice === k ? 'on' : '') + '">' + label + '</button>';
          }).join('') +
        '</div>' +
        (mealChoice === 'custom'
          ? '<div style="margin-top:12px"><input class="input" type="time" id="mealCustom" value="' + esc(mealCustom || '18:30') + '"></div>'
          : '') +
      '</div>' +

      '<div class="sec-title"><h2>想对厨师说</h2><span class="sec-hint">选填</span></div>' +
      '<div class="card" style="padding:14px">' +
        '<textarea class="textarea" id="orderNote" maxlength="200" placeholder="比如：少油少盐 / 今天想吃辣一点 / 米饭多一碗">' + esc(orderNoteDraft) + '</textarea>' +
      '</div>' +

      '<div style="margin:18px 0 8px">' +
        '<button class="btn btn-primary btn-block" id="submitOrder" style="height:52px;font-size:16px">' +
        '提交给' + esc(state.settings.ownerName || '老公') + '</button>' +
        '<p class="hint" style="text-align:center;margin-top:10px">提交后会立刻推送到' + esc(state.settings.ownerName || '老公') + '的手机</p>' +
      '</div>';

    // 事件
    $('#clearCart').addEventListener('click', async () => {
      if (await confirmDialog('清空点菜车？', '已选的菜都会被移除', '清空', true)) {
        state.cart = [];
        save(true);
        renderers.cart();
        updateFab();
      }
    });

    $$('#mealPick [data-meal]').forEach((b) => {
      b.addEventListener('click', () => {
        mealChoice = b.dataset.meal;
        if (mealChoice === 'custom') {
          const inp = $('#mealCustom');
          if (inp) mealCustom = inp.value;
        }
        renderers.cart();
      });
    });
    const mc = $('#mealCustom');
    if (mc) mc.addEventListener('change', () => { mealCustom = mc.value; });

    const noteEl = $('#orderNote');
    noteEl.addEventListener('input', () => { orderNoteDraft = noteEl.value; });

    $('#submitOrder').addEventListener('click', () => submitOrder());
  };

  function mealLabel() {
    if (mealChoice === 'now') return '现在就做';
    if (mealChoice === '30') return '半小时后';
    if (mealChoice === '60') return '一小时后';
    return (mealCustom || '18:30') + ' 吃';
  }

  function nextOrderNo() {
    const now = new Date();
    const dayKey = pad(now.getMonth() + 1) + pad(now.getDate());
    const todayCount = state.orders.filter((o) => {
      const d2 = new Date(o.ts);
      return pad(d2.getMonth() + 1) + pad(d2.getDate()) === dayKey;
    }).length;
    return 'A' + dayKey + '-' + pad(todayCount + 1);
  }

  function submitOrder() {
    if (!state.cart.length) { toast('点菜车是空的哦'); return; }
    const items = state.cart.map((i) => {
      const dish = byId(i.dishId);
      return {
        dishId: i.dishId,
        name: dish ? dish.name : '已下架菜品',
        emoji: dish ? dish.emoji : '🍽️',
        price: dish ? dish.price : 0,
        qty: i.qty,
        note: i.note || ''
      };
    });
    const order = {
      id: uid('o'),
      no: nextOrderNo(),
      items: items,
      total: items.reduce((s, i) => s + i.price * i.qty, 0),
      note: (orderNoteDraft || '').trim(),
      meal: mealLabel(),
      ts: Date.now(),
      from: state.settings.eaterName || '老婆',
      pushResults: []
    };

    const btn = $('#submitOrder');
    btn.disabled = true;
    btn.textContent = '正在送到 ' + (state.settings.ownerName || '老公') + ' 手上…';

    state.orders.unshift(order);
    // 累计销量
    items.forEach((i) => { const dsh = byId(i.dishId); if (dsh) dsh.sold = (dsh.sold || 0) + i.qty; });
    state.cart = [];
    orderNoteDraft = '';
    mealChoice = 'now';
    save(true);

    pushOrder(order).then((results) => {
      order.pushResults = results;
      save();
      showOrderSuccess(order, results);
      updateFab();
    });
  }

  /* ================= 推送 ================= */
  const CHANNEL_TYPES = {
    wecom: { name: '企业微信群机器人', ph: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx', tip: '群设置 → 群机器人 → 添加机器人 → 复制 Webhook 地址' },
    dingtalk: { name: '钉钉群机器人', ph: 'https://oapi.dingtalk.com/robot/send?access_token=xxx', tip: '群设置 → 智能群助手 → 添加机器人 → 自定义 → 复制 Webhook（若开了加签，请填自定义渠道）' },
    feishu: { name: '飞书群机器人', ph: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx', tip: '群设置 → 群机器人 → 添加 → 自定义机器人 → 复制 Webhook 地址' },
    bark: { name: 'Bark（iPhone 推送）', ph: 'https://api.day.app/你的Key', tip: 'App Store 装 Bark，打开后复制推送地址，形如 https://api.day.app/xxxx' },
    serverchan: { name: 'Server酱（微信推送）', ph: 'SCT开头的SendKey', tip: 'sct.ftqq.com 微信扫码登录，复制 SendKey，消息会推到微信服务号' },
    pushplus: { name: 'PushPlus（微信推送）', ph: '32位 token', tip: 'pushplus.plus 微信扫码登录，复制 token，可推公众号消息' },
    custom: { name: '自定义 Webhook', ph: 'https://your-server.com/hook', tip: '会以 POST JSON 发送订单数据，字段：order / text / markdown' }
  };

  function channelReady(ch) {
    if (!ch || !ch.type || !ch.enabled) return false;
    if (ch.type === 'serverchan' || ch.type === 'pushplus') return !!String(ch.url || '').trim();
    return !!String(ch.url || '').trim();
  }

  function buildOrderText(order) {
    const shop = state.settings.shopName || '咱家小灶';
    const lines = [];
    lines.push('🍚 ' + shop + ' · 点菜啦');
    lines.push('');
    lines.push('🕐 ' + fmtDateTime(order.ts) + ' ｜ ' + order.meal);
    lines.push('👩 ' + order.from + '点了 ' + order.items.reduce((s, i) => s + i.qty, 0) + ' 份：');
    lines.push('');
    order.items.forEach((i, idx) => {
      lines.push((idx + 1) + '. ' + i.emoji + ' ' + i.name + ' ×' + i.qty + '  ' + money(i.price * i.qty));
      if (i.note) lines.push('   ↳ ' + i.note);
    });
    lines.push('');
    lines.push('━━━━━━━━━━');
    if (state.settings.showPrice) lines.push('合计：' + money(order.total));
    if (order.note) lines.push('留言：' + order.note);
    lines.push('单号：' + order.no);
    return lines.join('\n');
  }

  function buildOrderMarkdown(order) {
    const shop = state.settings.shopName || '咱家小灶';
    const list = order.items.map((i) =>
      '> ' + i.emoji + ' **' + i.name + '** ×' + i.qty + (state.settings.showPrice ? '　' + money(i.price * i.qty) : '') + (i.note ? '\n> <font color="warning">↳ ' + i.note + '</font>' : '')
    ).join('\n');
    let md = '### 🍚 ' + shop + ' · 点菜啦\n\n';
    md += '**' + order.from + '** 点了 ' + order.items.reduce((s, i) => s + i.qty, 0) + ' 份\n\n';
    md += list + '\n\n';
    if (state.settings.showPrice) md += '**合计：' + money(order.total) + '**\n\n';
    md += '> 时间：' + fmtDateTime(order.ts) + ' ｜ 用餐：' + order.meal + '\n';
    if (order.note) md += '> 留言：' + order.note + '\n';
    md += '> 单号：' + order.no;
    return md;
  }

  async function fetchWithFallback(url, init) {
    try {
      const res = await fetch(url, init);
      return { ok: res.ok, status: res.status, text: await res.text().catch(() => '') };
    } catch (e1) {
      try {
        const plainBody = init && init.body ? init.body : undefined;
        await fetch(url, {
          method: (init && init.method) || 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: plainBody
        });
        return { ok: true, opaque: true };
      } catch (e2) {
        return { ok: false, error: String(e2 && e2.message ? e2.message : e2) };
      }
    }
  }

  async function sendToChannel(ch, order) {
    const text = buildOrderText(order);
    const md = buildOrderMarkdown(order);
    const url = String(ch.url || '').trim();
    if (!url) return { type: ch.type, name: ch.name || CHANNEL_TYPES[ch.type].name, ok: false, msg: '未填写地址' };

    try {
      if (ch.type === 'wecom') {
        const r = await fetchWithFallback(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msgtype: 'markdown', markdown: { content: md.replace(/<font[^>]*>|<\/font>/g, '') } })
        });
        return wrap(ch, r);
      }
      if (ch.type === 'dingtalk') {
        const r = await fetchWithFallback(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msgtype: 'markdown', markdown: { title: '点菜啦', text: md } })
        });
        return wrap(ch, r);
      }
      if (ch.type === 'feishu') {
        const r = await fetchWithFallback(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msg_type: 'text', content: { text: text } })
        });
        return wrap(ch, r);
      }
      if (ch.type === 'bark') {
        const base = url.replace(/\/+$/, '');
        const r = await fetchWithFallback(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '🍚 ' + (state.settings.eaterName || '老婆') + '点菜啦',
            body: text,
            group: state.settings.shopName || '咱家小灶',
            sound: 'bell',
            icon: 'https://api.iconify.design/noto:rice-bowl.svg'
          })
        });
        return wrap(ch, r);
      }
      if (ch.type === 'serverchan') {
        const key = url.replace(/^https?:\/\/sctapi\.ftqq\.com\//, '').replace(/\.send$/, '');
        const form = new URLSearchParams();
        form.set('title', '🍚 ' + (state.settings.eaterName || '老婆') + '点菜啦 · ' + order.no);
        form.set('desp', md);
        const r = await fetchWithFallback('https://sctapi.ftqq.com/' + key + '.send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString()
        });
        return wrap(ch, r);
      }
      if (ch.type === 'pushplus') {
        const r = await fetchWithFallback('https://www.pushplus.plus/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: url,
            title: '🍚 ' + (state.settings.eaterName || '老婆') + '点菜啦 · ' + order.no,
            content: md.replace(/<font[^>]*>|<\/font>/g, ''),
            template: 'markdown'
          })
        });
        return wrap(ch, r);
      }
      // 自定义
      const r = await fetchWithFallback(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, markdown: md, order: order, shop: state.settings.shopName })
      });
      return wrap(ch, r);
    } catch (e) {
      return { type: ch.type, name: ch.name || (CHANNEL_TYPES[ch.type] || {}).name || ch.type, ok: false, msg: String(e && e.message || e) };
    }
  }

  function wrap(ch, r) {
    const name = ch.name || (CHANNEL_TYPES[ch.type] || {}).name || ch.type;
    if (r.ok && !r.opaque) {
      let bad = false;
      try {
        const j = JSON.parse(r.text || '{}');
        if (j.errcode && j.errcode !== 0) bad = true;
        if (j.code && j.code !== 0 && j.code !== 200) bad = true;
      } catch (e) { /* 非 JSON 就当作成功 */ }
      return { type: ch.type, name: name, ok: !bad, msg: bad ? '平台返回错误' : '已发送' };
    }
    if (r.ok && r.opaque) return { type: ch.type, name: name, ok: true, msg: '已发出（无法读取回执）' };
    return { type: ch.type, name: name, ok: false, msg: r.error || ('HTTP ' + r.status) };
  }

  async function pushOrder(order) {
    const chans = (state.settings.channels || []).filter(channelReady);
    if (!chans.length) return [];
    const results = await Promise.all(chans.map((c) => sendToChannel(c, order)));
    return results;
  }

  function showOrderSuccess(order, results) {
    const okCount = results.filter((r) => r.ok).length;
    const pushLine = !results.length
      ? '<span style="color:var(--ink-3)">还没配置推送渠道，先复制订单发给TA吧</span>'
      : okCount > 0
        ? '<span style="color:var(--green)">✅ 已推送到 ' + results.filter((r) => r.ok).map((r) => esc(r.name)).join('、') + '</span>'
        : '<span style="color:var(--red)">⚠️ 推送没成功，可以直接复制订单发给TA</span>';

    openSheet({
      title: '下单成功 🎉',
      sub: '单号 ' + order.no + ' · ' + order.meal,
      body:
        '<div style="text-align:center;padding:6px 0 14px">' +
          '<div style="font-size:52px;line-height:1.2">🍳</div>' +
          '<p style="font-size:14px;font-weight:700;margin-top:6px">已经告诉' + esc(state.settings.ownerName || '老公') + '啦</p>' +
          '<p style="font-size:12.5px;margin-top:8px">' + pushLine + '</p>' +
        '</div>' +
        '<div class="copy-box" id="orderText">' + esc(buildOrderText(order)) + '</div>' +
        (results.length ? '<p class="hint">' + results.map((r) => (r.ok ? '✅ ' : '❌ ') + esc(r.name) + '：' + esc(r.msg)).join('<br>') + '</p>' : ''),
      actions: [
        { text: '复制订单', cls: '', onClick: (c) => {
          copyText(buildOrderText(order)).then((ok) => toast(ok ? '已复制，去微信粘贴给TA吧' : '复制失败，请长按文字手动复制', ok ? 'ok' : 'err'));
        } },
        { text: '查看订单', cls: 'btn-primary', onClick: (c) => { c(); go('orders'); } }
      ]
    });
  }

  /* ================= 心愿单 ================= */
  function addWish(text, dishId) {
    const t = String(text || '').trim();
    if (!t) return;
    if (state.wishes.some((w) => w.text === t && !w.done)) { toast('这个已经在心愿单里啦'); return; }
    state.wishes.unshift({ id: uid('w'), text: t, dishId: dishId || '', done: false, ts: Date.now() });
    save(true);
    toast('已记下：' + t, 'ok');
    if (currentView === 'wish') renderers.wish();
    updateWishBadge();
  }

  function updateWishBadge() {
    const n = state.wishes.filter((w) => !w.done).length;
    const tab = $('.tab[data-view="wish"] .tab-ico');
    if (!tab) return;
    let b = tab.querySelector('.badge');
    if (n > 0) {
      if (!b) { b = document.createElement('i'); b.className = 'badge'; tab.appendChild(b); }
      b.textContent = n > 99 ? '99+' : n;
    } else if (b) b.remove();
  }

  renderers.wish = function () {
    const list = state.wishes;
    const open = list.filter((w) => !w.done);
    const done = list.filter((w) => w.done);

    $('#wishBody').innerHTML =
      '<div class="sec-title" style="margin-top:12px"><h2>想吃清单</h2><span class="sec-hint">' + open.length + ' 个愿望待实现</span></div>' +
      '<div class="card" style="padding:14px">' +
        '<div style="display:flex;gap:10px">' +
          '<input class="input" id="wishInput" placeholder="我想吃……" maxlength="30" style="flex:1">' +
          '<button class="btn btn-primary" id="wishAdd" style="height:44px;padding:0 16px">记下</button>' +
        '</div>' +
        '<p class="hint">写点想吃的，或者点菜单里某道菜的「先放心愿单」</p>' +
      '</div>' +
      (open.length
        ? '<div class="sec-title"><h2>还没吃到</h2></div>' + open.map(wishRow).join('')
        : '<div class="empty"><div class="empty-emoji">💭</div><p class="empty-title">还没有心愿</p><p class="empty-sub">想吃啥写下来，攒着慢慢实现</p></div>') +
      (done.length ? '<div class="sec-title"><h2>已经吃到</h2><span class="sec-hint">' + done.length + ' 个</span></div>' + done.slice(0, 20).map(wishRow).join('') : '');

    $('#wishAdd').addEventListener('click', () => {
      const inp = $('#wishInput');
      addWish(inp.value);
      inp.value = '';
      renderers.wish();
    });
    $('#wishInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { addWish(e.target.value); e.target.value = ''; renderers.wish(); }
    });

    $('#wishBody').onclick = wishClick;
    updateWishBadge();
  };

  function wishRow(w) {
    return '<div class="wish-item" data-id="' + w.id + '">' +
      '<button class="wish-check' + (w.done ? ' done' : '') + '" data-wact="toggle">' + (w.done ? '✓' : '') + '</button>' +
      '<div class="wish-main"><b class="' + (w.done ? 'done' : '') + '">' + esc(w.text) + '</b>' +
        '<p>' + fmtMonthDay(w.ts) + ' 许愿' + (w.done ? ' · 已完成' : '') + '</p></div>' +
      '<button class="wish-del" data-wact="del">🗑</button>' +
    '</div>';
  }

  function wishClick(e) {
    const btn = e.target.closest('[data-wact]');
    if (!btn) return;
    const row = e.target.closest('.wish-item');
    const w = state.wishes.find((x) => x.id === row.dataset.id);
    if (!w) return;
    if (btn.dataset.wact === 'toggle') {
      w.done = !w.done;
      save(true);
      renderers.wish();
      if (w.done) toast('愿望实现啦 🎉', 'ok');
    } else if (btn.dataset.wact === 'del') {
      state.wishes = state.wishes.filter((x) => x.id !== w.id);
      save(true);
      renderers.wish();
    }
  }

  /* ================= 订单 ================= */
  renderers.orders = function () {
    const list = state.orders;
    if (!list.length) {
      $('#ordersBody').innerHTML =
        '<div class="empty"><div class="empty-emoji">🧾</div><p class="empty-title">还没有点过菜</p>' +
        '<p class="empty-sub">下第一单，' + esc(state.settings.ownerName || '老公') + '就会收到通知</p>' +
        '<div style="margin-top:18px"><button class="btn btn-primary" id="goMenu2">去点菜</button></div></div>';
      $('#goMenu2').addEventListener('click', () => go('menu'));
      return;
    }

    // 统计
    const weekAgo = Date.now() - 7 * 864e5;
    const weekOrders = list.filter((o) => o.ts >= weekAgo);
    const dishCount = {};
    list.forEach((o) => o.items.forEach((i) => { dishCount[i.name] = (dishCount[i.name] || 0) + i.qty; }));
    const fav = Object.keys(dishCount).sort((a, b) => dishCount[b] - dishCount[a])[0] || '—';

    $('#ordersBody').innerHTML =
      '<div class="stat-row">' +
        '<div class="stat"><b>' + list.length + '</b><span>累计订单</span></div>' +
        '<div class="stat"><b>' + weekOrders.length + '</b><span>近七天</span></div>' +
        '<div class="stat"><b style="font-size:14px;line-height:26px">' + esc(fav) + '</b><span>最常点</span></div>' +
      '</div>' +
      '<div class="sec-title" style="margin-top:18px"><h2>订单记录</h2><span class="sec-hint">共 ' + list.length + ' 单</span></div>' +
      list.map(orderCard).join('');

    $('#ordersBody').onclick = orderClick;
  };

  function orderCard(o) {
    const pills = o.items.map((i) => '<span class="order-item-pill">' + esc(i.emoji || '') + ' ' + esc(i.name) + ' ×' + i.qty + '</span>').join('');
    const rateDone = o.rated;
    return '<div class="card order-card" data-id="' + o.id + '">' +
      '<div class="order-head"><div><span class="order-no">' + esc(o.no) + '</span>' +
        (rateDone ? ' <span class="chip chip-new" style="margin-left:6px">已评价</span>' : '') +
        '<div class="order-time">' + fmtDateTime(o.ts) + ' · ' + esc(o.meal) + '</div></div>' +
        '<div class="order-money">' + (state.settings.showPrice ? money(o.total) : '') + '</div></div>' +
      '<div class="order-items">' + pills + '</div>' +
      (o.note ? '<div class="order-note">💬 ' + esc(o.note) + '</div>' : '') +
      '<div class="order-foot">' +
        '<span class="order-time">' + o.items.reduce((s, i) => s + i.qty, 0) + ' 份 · ' + esc(o.from || '老婆') + '</span>' +
        '<div class="order-ops">' +
          '<button class="btn btn-sm" data-oact="again">再来一单</button>' +
          (rateDone ? '' : '<button class="btn btn-sm btn-ghost" data-oact="rate">评价</button>') +
          '<button class="btn btn-sm" data-oact="del" style="width:34px;padding:0">🗑</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function orderClick(e) {
    const btn = e.target.closest('[data-oact]');
    if (!btn) return;
    const card = e.target.closest('.order-card');
    const o = state.orders.find((x) => x.id === card.dataset.id);
    if (!o) return;
    const act = btn.dataset.oact;

    if (act === 'again') {
      let added = 0;
      o.items.forEach((i) => {
        if (byId(i.dishId)) { changeQty(i.dishId, i.qty); added += i.qty; }
      });
      save();
      if (added) { toast('已放回点菜车', 'ok'); go('cart'); }
      else toast('这些菜已经不在菜单里了');
    } else if (act === 'rate') {
      openRateSheet(o);
    } else if (act === 'del') {
      confirmDialog('删掉这条记录？', o.no + ' 将不再显示', '删除', true).then((ok) => {
        if (!ok) return;
        state.orders = state.orders.filter((x) => x.id !== o.id);
        save(true);
        renderers.orders();
      });
    }
  }

  function openRateSheet(order) {
    let stars = 5;
    let text = '';
    const s = openSheet({
      title: '给这顿饭打个分',
      sub: order.items.map((i) => i.name).join('、'),
      body:
        '<div style="text-align:center;padding:10px 0 6px">' +
          '<div class="stars pick" id="rateStars" style="font-size:34px;gap:8px">' +
            [1, 2, 3, 4, 5].map((i) => '<i class="on" data-star="' + i + '">★</i>').join('') +
          '</div>' +
          '<p class="hint" id="rateWord" style="margin-top:8px">好吃到舔盘 😋</p>' +
        '</div>' +
        '<div class="field"><label>想说的话</label>' +
          '<textarea class="textarea" id="rateText" maxlength="120" placeholder="今天的菜怎么样？想夸夸还是提意见？"></textarea></div>',
      actions: [
        { text: '跳过', cls: '', onClick: (c) => c() },
        { text: '提交评价', cls: 'btn-primary', onClick: (c, el) => {
          const t = ($('#rateText', el) || {}).value || '';
          order.rated = { stars: stars, text: t.trim(), ts: Date.now() };
          order.items.forEach((i) => {
            const dish = byId(i.dishId);
            if (dish) { dish.ratingSum = (dish.ratingSum || 0) + stars; dish.ratingCnt = (dish.ratingCnt || 0) + 1; }
          });
          save(true);
          c();
          renderers.orders();
          toast('评价收到，谢谢老婆 💕', 'ok');
        } }
      ],
      onMount: (el) => {
        const words = ['', '下次改进 😐', '还行吧 🙂', '不错哦 😊', '很好吃 😋', '好吃到舔盘 🤤'];
        const box = $('#rateStars', el);
        box.addEventListener('click', (ev) => {
          const i = ev.target.closest('[data-star]');
          if (!i) return;
          stars = Number(i.dataset.star);
          $$('[data-star]', box).forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= stars));
          $('#rateWord', el).textContent = words[stars];
        });
      }
    });
    return s;
  }

  /* ================= 我的 ================= */
  renderers.me = function () {
    const s = state.settings;
    const readyChans = (s.channels || []).filter(channelReady);
    const wishOpen = state.wishes.filter((w) => !w.done).length;

    $('#meBody').innerHTML =
      '<div class="card" style="padding:16px;margin-top:12px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<div class="brand-mark" style="width:52px;height:52px;flex-basis:52px;font-size:26px">' + esc((s.shopName || '咱')[0]) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:17px;font-weight:800">' + esc(s.shopName || '咱家小灶') + '</div>' +
            '<div style="font-size:12px;color:var(--ink-3);margin-top:2px">' + esc(s.eaterName || '老婆') + ' 点菜 · ' + esc(s.ownerName || '老公') + ' 掌勺</div>' +
          '</div>' +
          '<button class="btn btn-sm" id="editShop">编辑</button>' +
        '</div>' +
      '</div>' +

      '<div class="stat-row">' +
        '<div class="stat"><b>' + state.menu.length + '</b><span>道菜</span></div>' +
        '<div class="stat"><b>' + state.orders.length + '</b><span>张订单</span></div>' +
        '<div class="stat"><b>' + wishOpen + '</b><span>个心愿</span></div>' +
      '</div>' +

      '<div class="sec-title"><h2>厨房与推送</h2></div>' +
      '<div class="card" style="padding:0 14px">' +
        '<div class="list-row" id="goManage"><span class="lr-ico">🍳</span><div class="lr-main"><div class="lr-title">菜单管理</div><div class="lr-sub">加菜、改价、排序、下架</div></div><span class="lr-value">' + state.menu.length + ' 道 ›</span></div>' +
        '<div class="list-row" id="goPush"><span class="lr-ico">🔔</span><div class="lr-main"><div class="lr-title">推送设置</div><div class="lr-sub">点完菜自动通知你</div></div><span class="lr-value" style="color:' + (readyChans.length ? 'var(--green)' : 'var(--red)') + '">' + (readyChans.length ? readyChans.length + ' 个渠道 ›' : '未配置 ›') + '</span></div>' +
        '<div class="list-row" id="goCats"><span class="lr-ico">🏷</span><div class="lr-main"><div class="lr-title">分类管理</div><div class="lr-sub">调整菜单的分组</div></div><span class="lr-value">' + s.cats.length + ' 个 ›</span></div>' +
      '</div>' +

      '<div class="sec-title"><h2>数据与外观</h2></div>' +
      '<div class="card" style="padding:0 14px">' +
        '<div class="list-row" id="goShare"><span class="lr-ico">📤</span><div class="lr-main"><div class="lr-title">把菜单分享给TA</div><div class="lr-sub">生成链接，对方打开即可同步菜单</div></div><span class="lr-value">›</span></div>' +
        '<div class="list-row" id="goBackup"><span class="lr-ico">💾</span><div class="lr-main"><div class="lr-title">备份与恢复</div><div class="lr-sub">导出文件，换手机也不丢</div></div><span class="lr-value">›</span></div>' +
        '<div class="list-row" id="goPrice"><span class="lr-ico">💰</span><div class="lr-main"><div class="lr-title">显示价格</div><div class="lr-sub">关掉就只谈心不谈钱</div></div><button class="switch' + (s.showPrice ? ' on' : '') + '" id="priceSwitch"></button></div>' +
        '<div class="list-row" id="goTheme"><span class="lr-ico">' + (s.theme === 'dark' ? '🌙' : '☀️') + '</span><div class="lr-main"><div class="lr-title">外观主题</div><div class="lr-sub">' + (s.theme === 'dark' ? '夜间暖光' : '奶油暖光') + '</div></div><span class="lr-value">切换 ›</span></div>' +
        '<div class="list-row" id="clearOrders"><span class="lr-ico">🧹</span><div class="lr-main"><div class="lr-title" style="color:var(--red)">清空订单记录</div><div class="lr-sub">小心，删了找不回来</div></div><span class="lr-value">›</span></div>' +
      '</div>' +

      '<p class="hint" style="text-align:center;margin:22px 0 10px">' + esc(s.shopName || '咱家小灶') + ' · 只为一个人做菜 ❤️<br>数据都存在这台设备上，记得偶尔备份</p>';

    $('#editShop').addEventListener('click', openShopSettings);
    $('#goManage').addEventListener('click', () => go('manage'));
    $('#goPush').addEventListener('click', openPushSettings);
    $('#goCats').addEventListener('click', openCatSettings);
    $('#goShare').addEventListener('click', openShareSheet);
    $('#goBackup').addEventListener('click', openBackupSheet);
    $('#goTheme').addEventListener('click', () => {
      state.settings.theme = state.settings.theme === 'dark' ? 'warm' : 'dark';
      save(true); applyTheme(); renderers.me();
    });
    $('#priceSwitch').addEventListener('click', () => {
      state.settings.showPrice = !state.settings.showPrice;
      save(true);
      renderers.me();
      toast(state.settings.showPrice ? '已显示价格' : '已隐藏价格，只谈心不谈钱');
    });
    $('#clearOrders').addEventListener('click', async () => {
      if (!state.orders.length) { toast('本来就没有订单'); return; }
      if (await confirmDialog('清空所有订单记录？', '共 ' + state.orders.length + ' 条，清空后无法恢复', '清空', true)) {
        state.orders = [];
        save(true);
        renderers.me();
        toast('已清空');
      }
    });
  };

  function openShopSettings() {
    const s = state.settings;
    openSheet({
      title: '小店设置',
      sub: '这些名字会出现在推送消息里',
      body:
        '<div class="field"><label>小店 / 厨房名字</label><input class="input" id="stShop" value="' + esc(s.shopName) + '" maxlength="12" placeholder="咱家小灶"></div>' +
        '<div class="field"><label>首页的一句话</label><input class="input" id="stSlogan" value="' + esc(s.slogan) + '" maxlength="20" placeholder="今天想吃点什么呀"></div>' +
        '<div class="row-2">' +
          '<div class="field"><label>厨师（你）</label><input class="input" id="stOwner" value="' + esc(s.ownerName) + '" maxlength="8" placeholder="老公"></div>' +
          '<div class="field"><label>点菜的人</label><input class="input" id="stEater" value="' + esc(s.eaterName) + '" maxlength="8" placeholder="老婆"></div>' +
        '</div>' +
        '<p class="hint">改完之后，推送消息里会变成「XXX 点菜啦」，按钮会变成「提交给 XXX」</p>',
      actions: [
        { text: '取消', cls: '', onClick: (c) => c() },
        { text: '保存', cls: 'btn-primary', onClick: (c, el) => {
          s.shopName = ($('#stShop', el).value || '').trim() || '咱家小灶';
          s.slogan = ($('#stSlogan', el).value || '').trim() || '今天想吃点什么呀';
          s.ownerName = ($('#stOwner', el).value || '').trim() || '老公';
          s.eaterName = ($('#stEater', el).value || '').trim() || '老婆';
          save(true);
          c();
          renderers.me();
          renderers.menu();
          toast('设置已保存', 'ok');
        } }
      ]
    });
  }

  /* ================= 推送设置 ================= */
  function openPushSettings() {
    const chans = state.settings.channels || [];
    const rows = chans.length
      ? chans.map((ch, idx) => {
          const t = CHANNEL_TYPES[ch.type] || { name: ch.type };
          const ready = channelReady(ch);
          return '<div class="card" style="padding:12px 14px;margin-bottom:10px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:14px;font-weight:800">' + esc(ch.name || t.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px;word-break:break-all">' + esc(t.name) + ' · ' + esc(maskUrl(ch.url)) + '</div>' +
              '</div>' +
              '<button class="switch' + (ch.enabled ? ' on' : '') + '" data-chact="toggle" data-idx="' + idx + '"></button>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:10px">' +
              '<button class="btn btn-sm" data-chact="test" data-idx="' + idx + '" style="flex:1">发送测试</button>' +
              '<button class="btn btn-sm" data-chact="edit" data-idx="' + idx + '" style="flex:1">修改</button>' +
              '<button class="btn btn-sm btn-danger" data-chact="del" data-idx="' + idx + '">删除</button>' +
            '</div>' +
            (ready ? '' : '<p class="hint" style="color:var(--red)">未填写地址，不会生效</p>') +
          '</div>';
        }).join('')
      : '<div class="empty" style="padding:26px 10px"><div class="empty-emoji">🔔</div><p class="empty-title">还没配推送</p><p class="empty-sub">配好后，点完菜你的手机就会响</p></div>';

    const s = openSheet({
      title: '推送设置',
      sub: '点完菜自动推送到你手机 · 可同时配多个渠道',
      body:
        '<div id="chanList">' + rows + '</div>' +
        '<button class="btn btn-primary btn-block" id="addChan" style="margin-top:6px">＋ 添加推送渠道</button>' +
        (chans.filter(channelReady).length ? '<button class="btn btn-block" id="bindLinkBtn" style="margin-top:10px">🔗 生成发给对方的绑定链接</button>' : ''),
      actions: [],
      onMount: (el) => {
        $('#addChan', el).addEventListener('click', () => { s.close(); setTimeout(() => editChannel(null), 240); });
        const bindBtn = $('#bindLinkBtn', el);
        if (bindBtn) bindBtn.addEventListener('click', () => { s.close(); setTimeout(openBindSheet, 240); });
        $$('[data-chact]', el).forEach((btn) => {
          btn.addEventListener('click', async () => {
            const idx = Number(btn.dataset.idx);
            const ch = state.settings.channels[idx];
            if (!ch) return;
            const act = btn.dataset.chact;
            if (act === 'toggle') {
              ch.enabled = !ch.enabled;
              save(true);
              s.close();
              setTimeout(openPushSettings, 240);
            } else if (act === 'del') {
              if (await confirmDialog('删除这个渠道？', ch.name || (CHANNEL_TYPES[ch.type] || {}).name, '删除', true)) {
                state.settings.channels.splice(idx, 1);
                save(true);
                s.close();
                setTimeout(openPushSettings, 240);
              }
            } else if (act === 'edit') {
              s.close();
              setTimeout(() => editChannel(idx), 240);
            } else if (act === 'test') {
              btn.textContent = '发送中…';
              const fake = {
                no: 'TEST', items: [{ name: '测试菜', emoji: '🧪', price: 0, qty: 1, note: '这是一条测试消息' }],
                total: 0, note: '如果你看到这条消息，说明推送配置成功啦', meal: '测试', ts: Date.now(),
                from: state.settings.eaterName || '老婆'
              };
              const r = await sendToChannel(ch, fake);
              btn.textContent = '发送测试';
              toast(r.ok ? '已发送，去看看手机' : '发送失败：' + r.msg, r.ok ? 'ok' : 'err');
            }
          });
        });
      }
    });
    return s;
  }

  function maskUrl(u) {
    const s2 = String(u || '');
    if (!s2) return '未填写';
    if (s2.length <= 18) return s2;
    return s2.slice(0, 12) + '…' + s2.slice(-4);
  }

  function editChannel(idx) {
    const isNew = idx === null || idx === undefined;
    const ch = isNew ? { type: 'feishu', name: '', url: '', enabled: true } : Object.assign({}, state.settings.channels[idx]);
    let type = ch.type;

    const s = openSheet({
      title: isNew ? '添加推送渠道' : '修改推送渠道',
      sub: '选一种方式，填上地址就能用',
      body:
        '<div class="field"><label>推送方式</label><div class="tag-pick" id="typePick">' +
          Object.keys(CHANNEL_TYPES).map((k) =>
            '<button data-type="' + k + '" class="' + (k === type ? 'on' : '') + '">' + esc(CHANNEL_TYPES[k].name) + '</button>'
          ).join('') +
        '</div></div>' +
        '<div class="field"><label>备注名（可选）</label><input class="input" id="chName" value="' + esc(ch.name) + '" maxlength="16" placeholder="比如：我的微信"></div>' +
        '<div class="field"><label id="chUrlLabel">' + esc(CHANNEL_TYPES[type].name) + '地址</label>' +
          '<input class="input" id="chUrl" value="' + esc(ch.url) + '" placeholder="' + esc(CHANNEL_TYPES[type].ph) + '" autocapitalize="off" autocorrect="off" spellcheck="false">' +
          '<p class="hint" id="chTip">' + esc(CHANNEL_TYPES[type].tip) + '</p></div>',
      actions: [
        { text: '取消', cls: '', onClick: (c) => c() },
        { text: '保存', cls: 'btn-primary', onClick: (c, el) => {
          const url = ($('#chUrl', el).value || '').trim();
          const name = ($('#chName', el).value || '').trim();
          if (!url) { toast('地址还没填哦', 'err'); return; }
          const data = { id: ch.id || uid('c'), type: type, name: name || CHANNEL_TYPES[type].name, url: url, enabled: ch.enabled !== false };
          if (isNew) state.settings.channels.push(data);
          else state.settings.channels[idx] = data;
          save(true);
          c();
          setTimeout(openPushSettings, 240);
          toast('渠道已保存', 'ok');
        } }
      ],
      onMount: (el) => {
        $('#typePick', el).addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-type]');
          if (!b) return;
          type = b.dataset.type;
          $$('[data-type]', el).forEach((x) => x.classList.toggle('on', x.dataset.type === type));
          $('#chUrlLabel', el).textContent = CHANNEL_TYPES[type].name + (type === 'serverchan' ? ' SendKey' : type === 'pushplus' ? ' token' : '地址');
          $('#chUrl', el).placeholder = CHANNEL_TYPES[type].ph;
          $('#chTip', el).textContent = CHANNEL_TYPES[type].tip;
          const inp = $('#chUrl', el);
          if (inp.value && (inp.value.indexOf('http') === 0) !== (type !== 'serverchan' && type !== 'pushplus')) inp.value = '';
        });
      }
    });
    return s;
  }

  /* ================= 分类管理 ================= */
  function openCatSettings() {
    const s = openSheet({
      title: '分类管理',
      sub: '菜单页顶部的分组标签',
      body:
        '<div id="catList">' +
          state.settings.cats.map((c, i) => {
            const n = state.menu.filter((m) => m.cat === c).length;
            return '<div class="list-row"><span class="lr-ico">🏷</span>' +
              '<div class="lr-main"><div class="lr-title">' + esc(c) + '</div><div class="lr-sub">' + n + ' 道菜</div></div>' +
              '<button class="btn btn-sm" data-catup="' + i + '">↑</button>' +
              '<button class="btn btn-sm" data-catdown="' + i + '">↓</button>' +
              '<button class="btn btn-sm btn-danger" data-catdel="' + i + '">删</button></div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:14px">' +
          '<input class="input" id="newCat" placeholder="新分类，比如「夜宵」" maxlength="6" style="flex:1">' +
          '<button class="btn btn-primary" id="addCat" style="height:44px;padding:0 16px">添加</button>' +
        '</div>' +
        '<p class="hint">删除分类时，里面的菜会移到第一个分类，不会丢</p>',
      actions: [],
      onMount: (el) => {
        $('#addCat', el).addEventListener('click', () => {
          const v = ($('#newCat', el).value || '').trim();
          if (!v) return;
          if (state.settings.cats.indexOf(v) > -1) { toast('这个分类已经有了'); return; }
          state.settings.cats.push(v);
          save(true);
          s.close();
          setTimeout(openCatSettings, 240);
          renderers.menu();
        });
        $$('[data-catup]', el).forEach((b) => b.addEventListener('click', () => moveCat(Number(b.dataset.catup), -1, s)));
        $$('[data-catdown]', el).forEach((b) => b.addEventListener('click', () => moveCat(Number(b.dataset.catdown), 1, s)));
        $$('[data-catdel]', el).forEach((b) => b.addEventListener('click', async () => {
          const i = Number(b.dataset.catdel);
          const c = state.settings.cats[i];
          const n = state.menu.filter((m) => m.cat === c).length;
          if (!(await confirmDialog('删除分类「' + c + '」？', n ? n + ' 道菜会移到「' + state.settings.cats[0] + '」' : '这个分类是空的', '删除', true))) return;
          state.settings.cats.splice(i, 1);
          if (!state.settings.cats.length) state.settings.cats = ['默认'];
          state.menu.forEach((m) => { if (m.cat === c) m.cat = state.settings.cats[0]; });
          save(true);
          s.close();
          setTimeout(openCatSettings, 240);
          renderers.menu();
        }));
      }
    });
    return s;
  }

  function moveCat(i, dir, handle) {
    const j = i + dir;
    if (j < 0 || j >= state.settings.cats.length) return;
    const arr = state.settings.cats;
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    save(true);
    handle.close();
    setTimeout(openCatSettings, 240);
    renderers.menu();
  }

  /* ================= 菜品管理 ================= */
  renderers.manage = function () {
    const cats = state.settings.cats.slice();
    state.menu.forEach((m) => { if (m.cat && cats.indexOf(m.cat) === -1) cats.push(m.cat); });
    const groups = cats.map((c) => ({ cat: c, list: state.menu.filter((m) => m.cat === c) }))
      .concat([{ cat: '未分类', list: state.menu.filter((m) => !m.cat) }])
      .filter((g) => g.list.length);

    $('#manageBody').innerHTML =
      '<div class="top-line"><button class="back-btn" id="mgBack">‹</button><h2>菜单管理</h2><span class="grow"></span>' +
        '<button class="btn btn-primary btn-sm" id="mgAdd" style="height:36px">＋ 新增</button></div>' +
      (state.menu.length
        ? groups.map((g) =>
            '<div class="sec-title"><h2>' + esc(g.cat) + '</h2><span class="sec-hint">' + g.list.length + ' 道</span></div>' +
            g.list.map((m) => {
              const thumb = m.img ? '<img src="' + esc(m.img) + '" onerror="this.remove()">' : esc(m.emoji || '🍽️');
              const rate = m.ratingCnt ? ' · ★' + (m.ratingSum / m.ratingCnt).toFixed(1) : '';
              return '<div class="mg-item" data-id="' + m.id + '">' +
                '<div class="mg-thumb">' + thumb + '</div>' +
                '<div class="mg-main"><b>' + esc(m.name) + (m.off ? ' <span class="chip chip-off">售罄</span>' : '') + '</b>' +
                  '<span>' + (state.settings.showPrice ? money(m.price) : '无价') + ' · 点过 ' + (m.sold || 0) + ' 次' + rate + '</span></div>' +
                '<div class="mg-ops">' +
                  '<button data-mact="up">↑</button>' +
                  '<button data-mact="down">↓</button>' +
                  '<button data-mact="del">🗑</button>' +
                '</div></div>';
            }).join('')
          ).join('')
        : '<div class="empty"><div class="empty-emoji">🍳</div><p class="empty-title">菜单是空的</p><p class="empty-sub">点右上角新增第一道菜</p></div>');

    $('#mgBack').addEventListener('click', () => go('me'));
    $('#mgAdd').addEventListener('click', () => editDish(null));
    $('#manageBody').onclick = manageClick;
  };

  function manageClick(e) {
    const btn = e.target.closest('[data-mact]');
    const row = e.target.closest('.mg-item');
    if (!row) return;
    const id = row.dataset.id;
    const dish = byId(id);
    if (!dish) return;
    if (!btn) { editDish(state.menu.indexOf(dish)); return; }
    const act = btn.dataset.mact;
    if (act === 'up' || act === 'down') {
      moveDish(id, act === 'up' ? -1 : 1);
      save(true);
      renderers.manage();
      renderers.menu();
    } else if (act === 'del') {
      confirmDialog('删掉「' + dish.name + '」？', '历史订单里还会保留这道菜', '删除', true).then((ok) => {
        if (!ok) return;
        state.menu = state.menu.filter((m) => m.id !== id);
        state.cart = state.cart.filter((i) => i.dishId !== id);
        save(true);
        renderers.manage();
        renderers.menu();
        updateFab();
        toast('已删除');
      });
    }
  }

  function moveDish(id, dir) {
    const dish = byId(id);
    if (!dish) return;
    const sameCat = state.menu.filter((m) => m.cat === dish.cat);
    const i = sameCat.indexOf(dish);
    const j = i + dir;
    if (j < 0 || j >= sameCat.length) return;
    const a = state.menu.indexOf(sameCat[i]);
    const b = state.menu.indexOf(sameCat[j]);
    const t = state.menu[a];
    state.menu[a] = state.menu[b];
    state.menu[b] = t;
  }

  function editDish(idx) {
    const isNew = idx === null || idx === undefined;
    const dish = isNew
      ? { name: '', emoji: '🍽️', cat: state.settings.cats[0] || '荤菜', price: 0, desc: '', tags: [], spicy: 0, img: '', off: false }
      : Object.assign({}, state.menu[idx], { tags: (state.menu[idx].tags || []).slice() });
    let emoji = dish.emoji || '🍽️';
    let tags = dish.tags.slice();
    let spicy = dish.spicy || 0;
    let pickedImg = (dish.img && dish.img.indexOf('data:') === 0) ? dish.img : '';
    const imgUrlValue = (dish.img && dish.img.indexOf('data:') === 0) ? '' : (dish.img || '');

    const catOptions = state.settings.cats.slice();
    if (catOptions.indexOf(dish.cat) === -1) catOptions.push(dish.cat);

    const s = openSheet({
      title: isNew ? '新增一道菜' : '编辑「' + dish.name + '」',
      sub: '改完点保存，菜单页立刻生效',
      body:
        '<div class="row-2">' +
          '<div class="field" style="grid-column:span 2"><label>菜名 *</label>' +
            '<input class="input" id="dName" value="' + esc(dish.name) + '" maxlength="14" placeholder="比如：红烧肉"></div>' +
        '</div>' +
        '<div class="row-2">' +
          '<div class="field"><label>分类</label>' +
            '<input class="input" id="dCat" value="' + esc(dish.cat) + '" list="catOpts" maxlength="6" placeholder="荤菜">' +
            '<datalist id="catOpts">' + catOptions.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist></div>' +
          '<div class="field"><label>价格（元）</label>' +
            '<input class="input" id="dPrice" type="number" inputmode="decimal" min="0" step="0.5" value="' + (dish.price || 0) + '"></div>' +
        '</div>' +
        '<div class="field"><label>图标（点一个，或者自己填）</label>' +
          '<div class="emoji-pick" id="emojiPick">' +
            EMOJIS.map((e) => '<button data-e="' + e + '" class="' + (e === emoji ? 'on' : '') + '">' + e + '</button>').join('') +
          '</div>' +
          '<input class="input" id="dEmoji" value="' + esc(emoji) + '" maxlength="4" style="margin-top:8px;text-align:center;font-size:20px" placeholder="也可填 emoji"></div>' +
        '<div class="field"><label>介绍（可选）</label>' +
          '<textarea class="textarea" id="dDesc" maxlength="60" placeholder="描述一下这道菜，勾人食欲那种">' + esc(dish.desc) + '</textarea></div>' +
        '<div class="field"><label>标签</label>' +
          '<div class="tag-pick" id="tagPick">' +
            TAGS.map((t) => '<button data-t="' + esc(t) + '" class="' + (tags.indexOf(t) > -1 ? 'on' : '') + '">' + esc(t) + '</button>').join('') +
          '</div></div>' +
        '<div class="field"><label>辣度</label>' +
          '<div class="tag-pick" id="spicyPick">' +
            ['不辣', '微辣', '重辣'].map((n, i) => '<button data-s="' + i + '" class="' + (i === spicy ? 'on' : '') + '">' + n + '</button>').join('') +
          '</div></div>' +
        '<div class="field"><label>菜品照片（可选，不填就用图标）</label>' +
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<div id="imgPreview" style="flex:0 0 44px;width:44px;height:44px;border-radius:12px;overflow:hidden;background:var(--bg-2);display:' + (dish.img ? 'block' : 'none') + '">' +
              (dish.img ? '<img src="' + esc(dish.img) + '" style="width:100%;height:100%;object-fit:cover">' : '') +
            '</div>' +
            '<input class="input" id="dImg" value="' + esc(imgUrlValue) + '" placeholder="' + (pickedImg ? '已选好照片' : '选一张照片，或者贴图片链接') + '" autocapitalize="off" spellcheck="false" style="flex:1">' +
            '<button class="btn btn-sm" id="pickImg" style="height:44px;flex:0 0 auto">选图</button>' +
          '</div>' +
          '<input type="file" id="imgFile" accept="image/*" class="hidden">' +
          '<p class="hint">照片会自动压小存在本机，不占太多空间</p></div>' +
        '<div class="switch-row" style="border-top:1px solid var(--line)">' +
          '<div class="sr-main"><div class="sr-title">今天售罄</div><div class="sr-sub">打开后菜单里会显示「今日售罄」，不能下单</div></div>' +
          '<button class="switch' + (dish.off ? ' on' : '') + '" id="dOff"></button>' +
        '</div>',
      actions: [
        { text: '取消', cls: '', onClick: (c) => c() },
        { text: '保存', cls: 'btn-primary', onClick: (c, el) => {
          const name = ($('#dName', el).value || '').trim();
          if (!name) { toast('菜名总得有一个吧', 'err'); return; }
          const cat = ($('#dCat', el).value || '').trim() || (state.settings.cats[0] || '荤菜');
          const price = num($('#dPrice', el).value);
          const urlVal = ($('#dImg', el).value || '').trim();
          const img = pickedImg || urlVal;
          const desc = ($('#dDesc', el).value || '').trim();
          const em = $('#dOff', el).classList.contains('on');
          const payload = { name: name, emoji: emoji || '🍽️', cat: cat, price: price, desc: desc, tags: tags, spicy: spicy, img: img, off: em };
          if (isNew) {
            state.menu.push(Object.assign({ id: uid('d'), sold: 0, ratingSum: 0, ratingCnt: 0 }, payload));
          } else {
            Object.assign(state.menu[idx], payload);
          }
          if (state.settings.cats.indexOf(cat) === -1) state.settings.cats.push(cat);
          save(true);
          c();
          if (currentView === 'manage') renderers.manage();
          renderers.menu();
          toast(isNew ? '已添加「' + name + '」' : '已更新', 'ok');
        } }
      ],
      onMount: (el) => {
        $('#emojiPick', el).addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-e]');
          if (!b) return;
          emoji = b.dataset.e;
          $$('[data-e]', el).forEach((x) => x.classList.toggle('on', x.dataset.e === emoji));
          $('#dEmoji', el).value = emoji;
        });
        $('#dEmoji', el).addEventListener('input', (ev) => {
          emoji = ev.target.value.trim() || '🍽️';
          $$('[data-e]', el).forEach((x) => x.classList.toggle('on', x.dataset.e === emoji));
        });
        $('#tagPick', el).addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-t]');
          if (!b) return;
          const t = b.dataset.t;
          const i = tags.indexOf(t);
          if (i > -1) { tags.splice(i, 1); b.classList.remove('on'); }
          else { tags.push(t); b.classList.add('on'); }
        });
        $('#spicyPick', el).addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-s]');
          if (!b) return;
          spicy = Number(b.dataset.s);
          $$('[data-s]', el).forEach((x) => x.classList.toggle('on', Number(x.dataset.s) === spicy));
        });
        $('#dOff', el).addEventListener('click', (ev) => ev.currentTarget.classList.toggle('on'));

        // 选图并压缩
        $('#pickImg', el).addEventListener('click', () => $('#imgFile', el).click());
        $('#imgFile', el).addEventListener('change', async (ev) => {
          const file = ev.target.files && ev.target.files[0];
          if (!file) return;
          toast('正在处理图片…');
          try {
            const dataUrl = await compressImage(file, 460, 0.72);
            pickedImg = dataUrl;
            const inp = $('#dImg', el);
            inp.value = '';
            inp.placeholder = '已选好照片';
            const box = $('#imgPreview', el);
            box.style.display = 'block';
            box.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover">';
            toast('照片已就绪，记得点保存', 'ok');
          } catch (e) {
            toast('这张图读不出来，换一张试试', 'err');
          }
        });
        $('#dImg', el).addEventListener('input', (ev) => {
          const v = ev.target.value.trim();
          if (v) pickedImg = '';
          const box = $('#imgPreview', el);
          if (!v && !pickedImg) { box.style.display = 'none'; box.innerHTML = ''; return; }
          if (!v) return;
          box.style.display = 'block';
          box.innerHTML = '<img src="' + v + '" style="width:100%;height:100%;object-fit:cover">';
        });
      }
    });
    return s;
  }

  /* ================= 分享 / 备份 ================= */
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64d(str) { return decodeURIComponent(escape(atob(str))); }
  function baseUrl() { return location.href.split('#')[0]; }

  function encodeMenu() {
    const arr = state.menu.map((m) => [
      m.name, m.emoji, m.cat, m.price, m.desc, (m.tags || []).join('|'), m.spicy || 0, m.off ? 1 : 0,
      (m.img && m.img.indexOf('data:') === 0) ? '' : (m.img || '')
    ]);
    return b64e(JSON.stringify({ n: state.settings.shopName, c: state.settings.cats, m: arr }));
  }

  function decodeMenu(code) {
    const obj = JSON.parse(b64d(code));
    if (!obj || !Array.isArray(obj.m)) throw new Error('格式不对');
    const menu = obj.m.map((a) => ({
      id: uid('d'), name: a[0] || '未命名', emoji: a[1] || '🍽️', cat: a[2] || '荤菜',
      price: Number(a[3]) || 0, desc: a[4] || '', tags: a[5] ? String(a[5]).split('|').filter(Boolean) : [],
      spicy: Number(a[6]) || 0, off: !!a[7], img: a[8] || '', sold: 0, ratingSum: 0, ratingCnt: 0
    }));
    return { menu: menu, shopName: obj.n || '', cats: Array.isArray(obj.c) ? obj.c : [] };
  }

  function encodeBind() {
    const chans = (state.settings.channels || []).filter(channelReady).map((c) => ({
      id: c.id, type: c.type, name: c.name, url: c.url, enabled: true
    }));
    return b64e(JSON.stringify({
      n: state.settings.ownerName || '老公',
      e: state.settings.eaterName || '老婆',
      s: state.settings.shopName || '咱家小灶',
      c: chans
    }));
  }

  function openBindSheet() {
    const chans = (state.settings.channels || []).filter(channelReady);
    if (!chans.length) {
      toast('先配好一个推送渠道，才能生成绑定链接', 'err');
      return;
    }
    const link = baseUrl() + '#b=' + encodeBind();
    openSheet({
      title: '把通知绑到你的微信',
      sub: '发给' + (state.settings.eaterName || '老婆') + '，她点开一次就完成绑定',
      body:
        '<div class="copy-box" id="bindLink" style="max-height:120px;overflow:auto">' + esc(link) + '</div>' +
        '<p class="hint" style="margin-top:10px">为什么需要这一步：推送密钥只存在于<b>每台设备自己的浏览器</b>里。' +
        '她打开这个链接后，密钥会写进她的手机，之后她点菜就能直接推到你的微信。<br><br>' +
        '绑定链接里含你的推送密钥，别发到群里，只私下发给她。</p>',
      actions: [
        { text: '复制绑定链接', cls: 'btn-primary', onClick: async (close) => {
            const ok = await copyText(link);
            toast(ok ? '已复制，发给老婆吧' : '复制失败，长按上面的文字手动复制', ok ? 'ok' : 'err');
          } },
        { text: '关闭', cls: '', onClick: (close) => close() }
      ]
    });
  }

  function openShareSheet() {
    const code = encodeMenu();
    const link = baseUrl() + '#m=' + code;
    const hasPhoto = state.menu.some((m) => m.img && m.img.indexOf('data:') === 0);
    openSheet({
      title: '把菜单分享给TA',
      sub: '链接里带着完整菜单，对方打开就能看到一样的菜',
      body:
        '<div class="copy-box" id="shareLink">' + esc(link) + '</div>' +
        '<p class="hint">链接有点长是正常的（里面装了 ' + state.menu.length + ' 道菜）。<br>用微信/短信发给TA，打开后点「导入菜单」就会覆盖本机菜单。' +
          (hasPhoto ? '<br>⚠️ 从相册选的照片不会随链接过去，需要在那台设备上重新选一次。' : '') + '</p>' +
        '<div style="display:flex;gap:10px;margin-top:14px">' +
          '<button class="btn btn-block" id="copyLink2">复制链接</button>' +
          '<button class="btn btn-block btn-ghost" id="nativeShare">系统分享</button>' +
        '</div>',
      actions: [],
      onMount: (el) => {
        $('#copyLink2', el).addEventListener('click', () => {
          copyText(link).then((ok) => toast(ok ? '链接已复制' : '复制失败，长按选中复制', ok ? 'ok' : 'err'));
        });
        $('#nativeShare', el).addEventListener('click', async () => {
          if (navigator.share) {
            try { await navigator.share({ title: (state.settings.shopName || '咱家小灶') + ' 的菜单', text: '这是我家的菜单，想吃什么点给我～', url: link }); }
            catch (e) { /* 用户取消 */ }
          } else {
            copyText(link).then((ok) => toast(ok ? '已复制，粘贴给TA吧' : '复制失败', ok ? 'ok' : 'err'));
          }
        });
      }
    });
  }

  function askImport(payload) {
    openSheet({
      title: '导入这份菜单？',
      sub: payload.shopName ? '「' + esc(payload.shopName) + '」，共 ' + payload.menu.length + ' 道菜' : '共 ' + payload.menu.length + ' 道菜',
      body: '<p class="hint">导入会<b>覆盖</b>当前菜单（订单、心愿单不受影响）。想保留原来的菜，先取消并备份一下。</p>',
      actions: [
        { text: '取消', cls: '', onClick: (c) => c() },
        { text: '导入并覆盖', cls: 'btn-primary', onClick: (c) => {
          state.menu = payload.menu;
          if (payload.cats && payload.cats.length) state.settings.cats = payload.cats;
          save(true);
          c();
          renderers.menu();
          renderers.me();
          toast('菜单已导入，共 ' + payload.menu.length + ' 道菜', 'ok');
        } }
      ]
    });
  }

  function openBackupSheet() {
    openSheet({
      title: '备份与恢复',
      sub: '把数据存成文件，换手机或者清缓存前先导一份',
      body:
        '<div class="list-row" style="border-bottom:1px solid var(--line)"><span class="lr-ico">⬇️</span>' +
          '<div class="lr-main"><div class="lr-title">导出备份文件</div><div class="lr-sub">菜单 + 订单 + 心愿单 + 设置</div></div>' +
          '<button class="btn btn-sm btn-ghost" id="doExport">导出</button></div>' +
        '<div class="list-row"><span class="lr-ico">⬆️</span>' +
          '<div class="lr-main"><div class="lr-title">从文件恢复</div><div class="lr-sub">会覆盖当前全部数据</div></div>' +
          '<button class="btn btn-sm" id="doImport">选择文件</button></div>' +
        '<input type="file" id="fileInput" accept="application/json,.json" class="hidden">' +
        '<p class="hint">数据只存在这台设备的浏览器里。清理浏览器数据会清空，建议每月导一次。</p>',
      actions: [],
      onMount: (el) => {
        $('#doExport', el).addEventListener('click', () => {
          const data = JSON.stringify({ exportedAt: new Date().toISOString(), state: state }, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const now = new Date();
          a.href = url;
          a.download = (state.settings.shopName || 'menu') + '-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          toast('已导出', 'ok');
        });
        $('#doImport', el).addEventListener('click', () => $('#fileInput', el).click());
        $('#fileInput', el).addEventListener('change', (ev) => {
          const file = ev.target.files && ev.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const obj = JSON.parse(String(reader.result));
              const st = obj.state || obj;
              if (!st || !Array.isArray(st.menu)) throw new Error('不是有效的备份文件');
              confirmDialog('恢复这份备份？', '当前菜单、订单、心愿单都会被覆盖', '恢复', true).then((ok) => {
                if (!ok) return;
                state = Object.assign(defaultState(), st);
                state.settings = Object.assign(defaultState().settings, st.settings || {});
                save(true);
                applyTheme();
                renderers.menu();
                renderers.me();
                updateWishBadge();
                updateFab();
                toast('已恢复', 'ok');
              });
            } catch (e) {
              toast('文件读不出来：' + e.message, 'err');
            }
          };
          reader.readAsText(file);
        });
      }
    });
  }

  /* ================= 启动 ================= */
  function bindCartEvents() {
    $('#cartBody').addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]');
      if (!q) return;
      const row = e.target.closest('.cart-item');
      if (!row) return;
      changeQty(row.dataset.id, Number(q.dataset.q));
      renderers.cart();
    });
  }

  function handleShareHash() {
    const h = location.hash || '';
    // #b= 绑定推送渠道（老板把自己的推送密钥一次性写进对方设备）
    if (h.indexOf('#b=') === 0) {
      try {
        const p = JSON.parse(b64d(h.slice(3)));
        const chans = Array.isArray(p.c) ? p.c.filter((c) => c && c.type && c.url) : [];
        if (!chans.length) throw new Error('没有可用渠道');
        state.settings.channels = chans.map((c) => ({
          id: c.id || uid('c'), type: c.type, name: c.name || '', url: c.url, enabled: true
        }));
        if (p.n) state.settings.ownerName = p.n;
        if (p.e) state.settings.eaterName = p.e;
        if (p.s) state.settings.shopName = p.s;
        state.settings.seenWelcome = true;
        save(true);
        history.replaceState(null, '', baseUrl());
        try { renderers.menu(); } catch (e) { /* 忽略 */ }
        setTimeout(() => {
          openSheet({
            title: '绑定成功 ✅',
            sub: '以后点完菜，' + (state.settings.ownerName || '老公') + '的微信会立刻收到',
            body: '<div style="text-align:center;padding:8px 0 16px">' +
                '<div style="font-size:52px">🔔</div>' +
                '<p style="font-size:14px;font-weight:800;margin-top:4px">通知已接到' + esc(state.settings.ownerName || '老公') + '手机上</p>' +
                '<p style="font-size:12.5px;color:var(--ink-3);margin-top:8px">直接开始挑菜吧，不用再设置任何东西</p>' +
              '</div>',
            actions: [{ text: '开始点菜', cls: 'btn-primary', onClick: (c) => c() }]
          });
        }, 500);
        return true;
      } catch (e) {
        console.warn('绑定链接解析失败', e);
        history.replaceState(null, '', baseUrl());
        toast('这个绑定链接用不了，让老板重新生成一个', 'err');
        return false;
      }
    }
    if (h.indexOf('#m=') !== 0) return false;
    try {
      const payload = decodeMenu(h.slice(3));
      history.replaceState(null, '', baseUrl());
      setTimeout(() => askImport(payload), 400);
      return true;
    } catch (e) {
      console.warn('分享链接解析失败', e);
      history.replaceState(null, '', baseUrl());
      return false;
    }
  }

  function initPWA() {
    try {
      const c = document.createElement('canvas');
      c.width = 180; c.height = 180;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 180, 180);
      grd.addColorStop(0, '#FFB86B');
      grd.addColorStop(1, '#FF5F26');
      g.fillStyle = grd;
      g.fillRect(0, 0, 180, 180);
      g.font = '100px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🍚', 90, 96);
      const icon = c.toDataURL('image/png');
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = icon;
      document.head.appendChild(link);

      const manifest = {
        name: (state.settings.shopName || '咱家小灶') + ' · 点菜',
        short_name: '点菜',
        start_url: '.',
        display: 'standalone',
        background_color: '#FFF7F0',
        theme_color: '#FF6B35',
        icons: [{ src: icon, sizes: '180x180', type: 'image/png' }]
      };
      const ml = document.createElement('link');
      ml.rel = 'manifest';
      ml.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
      document.head.appendChild(ml);
    } catch (e) { /* 忽略 */ }
  }

  function init() {
    load();
    applyTheme();
    bindMenuEvents();
    bindCartEvents();
    updateWishBadge();
    go('menu');
    const shared = handleShareHash();
    window.addEventListener('hashchange', () => { handleShareHash(); });
    if (!shared) {
      // 首次使用给个温和提示（只弹一次）
      if (!state.settings.seenWelcome) {
        state.settings.seenWelcome = true;
        save(true);
        setTimeout(() => {
          if (currentView !== 'menu') return;
          openSheet({
            title: '欢迎来到' + (state.settings.shopName || '咱家小灶') + ' 🍚',
            sub: '一个只为你家开的小厨房',
            body:
              '<div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px;line-height:1.7;color:var(--ink-2)">' +
                '<div>① 在 <b>菜单</b> 里挑菜，或者点右上角 🎲 让骰子替你决定</div>' +
                '<div>② 挑好去 <b>点菜车</b> 提交，' + esc(state.settings.ownerName || '老公') + ' 的手机会立刻收到通知</div>' +
                '<div>③ 想加菜、改价，进 <b>我的 → 菜单管理</b>，全部在页面上完成，不用改代码</div>' +
              '</div>',
            actions: [
              { text: '先配推送', cls: '', onClick: (c) => { c(); go('me'); setTimeout(openPushSettings, 320); } },
              { text: '开始点菜', cls: 'btn-primary', onClick: (c) => c() }
            ]
          });
        }, 700);
      }
    }
    initPWA();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const top = openedSheets[openedSheets.length - 1];
        if (top) top.close();
      }
    });
  }

  init();


})();
