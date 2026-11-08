(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storage = (() => {
    const memory = Object.create(null);
    try {
      const probe = '__playpop_storage_probe__';
      window.localStorage.setItem(probe, 'ok');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (error) {
      return {
        getItem: key => Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null,
        setItem: (key, value) => { memory[key] = String(value); },
        removeItem: key => { delete memory[key]; }
      };
    }
  })();
  const home = $('.home-view');
  const screen = $('#game-screen');
  const title = $('#active-title');
  const subtitle = $('#active-subtitle');
  const kicker = $('#active-kicker');
  const score = $('#active-score');
  const toast = $('#toast');
  const gameData = {
    snake: { title: '彩虹贪吃蛇', kicker: 'READY TO GROW', subtitle: '用方向键或下面的按钮移动小蛇' },
    defense: { title: '星星塔防队', kicker: 'DEFEND THE BASE', subtitle: '点击空地建造炮塔，守护彩虹基地' },
    shop: { title: '糖果小店长', kicker: 'MAKE IT SWEET', subtitle: '顾客进店后，听清订单再给他食物' },
    platformer: { title: '跳跳冒险岛', kicker: 'JUMP & RUN', subtitle: '跳过或踩扁怪物，一路前进到彩旗' }
  };
  let activeGame = null;
  let toastTimer, sessionStart = 0, sessionTimer = null, sessionLevel = 0, sessionWon = false;
  const say = (message) => { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); };

  function startSession() { clearInterval(sessionTimer); sessionStart = Date.now(); sessionLevel = 0; sessionWon = false; sessionTimer = setInterval(updateSessionStats, 1000); updateSessionStats(); }
  function stopSession() { clearInterval(sessionTimer); sessionTimer = null; updateSessionStats(); }
  function setSessionLevel(level) { sessionLevel = Math.max(sessionLevel, level); updateSessionStats(); }
  function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  function updateSessionStats() { const seconds = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0; const reward = 20 + sessionLevel * 10 + Math.floor(seconds / 20) * 4; if ($('#game-time')) $('#game-time').textContent = formatTime(seconds); if ($('#game-levels')) $('#game-levels').textContent = sessionLevel; if ($('#session-reward')) $('#session-reward').textContent = sessionWon ? reward : reward; }
  function getCoins() { return Number(storage.getItem('playpop-wallet') || 0); }
  function setCoins(coins) { storage.setItem('playpop-wallet', String(Math.max(0, coins))); updateStore(); }
  function addCoins(amount) { setCoins(getCoins() + amount); }
  function isOwned(item) { return item === 'platformer' ? storage.getItem('playpop-platformer-unlocked') === 'yes' : storage.getItem(`playpop-owned-${item}`) === 'yes'; }
  function getEquippedSkin(type) { return storage.getItem(`playpop-equipped-${type}`) || 'default'; }
  function applySkins() {
    document.documentElement.dataset.snakeSkin = getEquippedSkin('snake');
    document.documentElement.dataset.towerSkin = getEquippedSkin('tower');
    document.documentElement.dataset.shopSkin = getEquippedSkin('shop');
  }
  function equipSkin(item) { storage.setItem(`playpop-equipped-${item.type}`, item.skin); updateStore(); applySkins(); if (activeGame === 'snake') renderSnake(); if (activeGame === 'defense') renderDefense(); if (activeGame === 'shop') renderShop(); say(`已使用「${item.name}」皮肤！`); }
  const storeItems = {
    'snake-skin': { type: 'snake', skin: 'candy', name: '糖果彩虹蛇', cost: 35 },
    'tower-skin': { type: 'tower', skin: 'star', name: '星光炮塔', cost: 50 },
    'shop-skin': { type: 'shop', skin: 'neon', name: '霓虹小店', cost: 65 }
  };
  function updateStore() {
    const coins = getCoins(); if ($('#wallet-top')) $('#wallet-top').textContent = coins; if ($('#wallet-coins')) $('#wallet-coins').textContent = coins; updatePlatformerCard();
    Object.entries(storeItems).forEach(([id, item]) => { const button = $(`[data-store-item="${id}"]`); if (!button) return; const owned = isOwned(id); const equipped = getEquippedSkin(item.type) === item.skin; button.classList.toggle('is-owned', owned); button.classList.toggle('is-equipped', equipped); button.querySelector('.store-item-action b').textContent = equipped ? '使用中' : owned ? '选择使用' : `${item.cost} 🪙`; button.querySelector('.store-item-action small').textContent = equipped ? '已装备' : owned ? '点击换上' : '购买'; });
    const platformerButton = $('[data-store-item="platformer"]'); if (platformerButton) { const unlocked = isOwned('platformer'); platformerButton.classList.toggle('is-owned', unlocked); platformerButton.querySelector('.store-item-action b').textContent = unlocked ? '已解锁' : '80 🪙'; platformerButton.querySelector('.store-item-action small').textContent = unlocked ? '点击开始' : '解锁游戏'; }
  }
  function updatePlatformerCard() { const button = $('#platformer-card-button'); if (!button) return; const unlocked = isOwned('platformer'); const card = button.closest('.game-card'); button.innerHTML = '开始冒险 <span>→</span>'; if (card) { card.hidden = !unlocked; card.classList.toggle('is-unlocked', unlocked); } $('.game-grid')?.classList.toggle('has-platformer', unlocked); const count = $('.game-count'); if (count) count.innerHTML = `${unlocked ? 4 : 3} 个游戏等你来玩 <span>→</span>`; }
  function buyStoreItem(id) { if (id === 'platformer') { if (isOwned(id)) { openGame('platformer'); return; } if (getCoins() < 80) { say('还差一点金币，先去玩游戏赢金币吧！'); return; } setCoins(getCoins() - 80); storage.setItem('playpop-platformer-unlocked', 'yes'); updateStore(); say('跳跳冒险岛已解锁！现在可以开始冒险啦！'); return; } const item = storeItems[id]; if (!item) return; if (isOwned(id)) { equipSkin(item); return; } if (getCoins() < item.cost) { say(`还差一点金币才能买下${item.name}！`); return; } setCoins(getCoins() - item.cost); storage.setItem(`playpop-owned-${id}`, 'yes'); equipSkin(item); }
  $$('.store-item').forEach(button => button.addEventListener('click', () => buyStoreItem(button.dataset.storeItem)));
  updateStore();

  function winSession(level, message) { if (sessionWon) return; sessionWon = true; setSessionLevel(level); const seconds = Math.floor((Date.now() - sessionStart) / 1000); const reward = 20 + level * 10 + Math.floor(seconds / 20) * 4; addCoins(reward); updateStore(); say(`${message} 获得 ${reward} 金币！`); }

  function openGame(game) {
    if (game === 'platformer' && !isOwned('platformer')) { openStore(); say('先在游戏商店解锁“跳跳冒险岛”吧！'); return; }
    activeGame = game;
    const data = gameData[game];
    title.textContent = data.title; kicker.textContent = data.kicker; subtitle.textContent = data.subtitle;
    $$('.game-panel').forEach(panel => { panel.hidden = panel.id !== `${game}-game`; });
    home.style.display = 'none'; screen.classList.add('is-open'); screen.setAttribute('aria-hidden', 'false'); window.scrollTo({ top: 0, behavior: 'smooth' }); startSession(); updateStore();
    if (game === 'snake') initSnake();
    if (game === 'defense') initDefense();
    if (game === 'shop') initShop();
    if (game === 'platformer') initPlatformer();
  }
  function openStore() { stopSnake(); stopDefense(); stopShop(); stopPlatformer(); stopSession(); activeGame = 'store'; home.style.display = 'none'; screen.classList.add('is-open'); screen.setAttribute('aria-hidden', 'false'); $$('.game-panel').forEach(panel => { panel.hidden = true; }); title.textContent = '游戏商店'; kicker.textContent = 'PLAY & EARN'; subtitle.textContent = '用胜利换金币，再选择你喜欢的皮肤'; updateStore(); $('#game-store').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function closeGame() { stopSnake(); stopDefense(); stopShop(); stopPlatformer(); stopSession(); screen.classList.remove('is-open'); screen.setAttribute('aria-hidden', 'true'); home.style.display = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); activeGame = null; }
  $$('.play-card-button').forEach(button => button.addEventListener('click', () => openGame(button.dataset.game)));
  $$('.game-card').forEach(card => card.addEventListener('click', (event) => { if (!event.target.closest('button')) openGame(card.dataset.game); }));
  $$('[data-open-store]').forEach(button => button.addEventListener('click', (event) => { event.preventDefault(); openStore(); }));
  $('#exit-game').addEventListener('click', closeGame);
  $$('.nav-link').forEach(link => link.addEventListener('click', () => { if (!link.hasAttribute('data-open-store') && activeGame) closeGame(); }));

  // Rainbow Snake
  const snakeBoard = $('#snake-board');
  let snake = [], snakeFood = 0, snakeDirection = { x: 1, y: 0 }, queuedDirection = { x: 1, y: 0 }, snakeLoop = null, snakeScore = 0, snakeRunning = false;
  const snakeWidth = 18, snakeHeight = 10;
  const cellIndex = (x, y) => y * snakeWidth + x;
  function initSnake() {
    stopSnake(); snakeRunning = false; snakeScore = 0; score.textContent = '0'; $('#snake-best').textContent = storage.getItem('playpop-snake-best') || '0';
    snake = [{ x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }]; snakeDirection = { x: 1, y: 0 }; queuedDirection = { x: 1, y: 0 }; snakeFood = cellIndex(13, 4); renderSnake(); $('#snake-start').textContent = '开始游戏 →';
  }
  function renderSnake() { snakeBoard.innerHTML = ''; const cells = Array.from({ length: snakeWidth * snakeHeight }, () => { const cell = document.createElement('div'); cell.className = 'snake-cell'; cell.setAttribute('role', 'gridcell'); snakeBoard.appendChild(cell); return cell; }); snake.forEach((part, index) => { cells[cellIndex(part.x, part.y)]?.classList.add('snake', index === 0 ? 'snake-head' : 'snake-body', `skin-${getEquippedSkin('snake')}`); }); cells[snakeFood]?.classList.add('food'); if (cells[snakeFood]) cells[snakeFood].textContent = '✦'; }
  function startSnake() { if (snakeRunning) { stopSnake(); $('#snake-start').textContent = '继续游戏 →'; return; } snakeRunning = true; $('#snake-start').textContent = '暂停游戏 →'; snakeLoop = setInterval(stepSnake, 170); }
  function stopSnake() { clearInterval(snakeLoop); snakeLoop = null; snakeRunning = false; }
  function stepSnake() { snakeDirection = queuedDirection; const head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y }; const hitWall = head.x < 0 || head.x >= snakeWidth || head.y < 0 || head.y >= snakeHeight; const hitSelf = snake.some(part => part.x === head.x && part.y === head.y); if (hitWall || hitSelf) { stopSnake(); $('#snake-start').textContent = '再玩一次 →'; say('哎呀！小蛇撞到了，试试再来一次'); return; } snake.unshift(head); if (cellIndex(head.x, head.y) === snakeFood) { snakeScore += 10; score.textContent = snakeScore; const best = Math.max(snakeScore, Number(storage.getItem('playpop-snake-best') || 0)); storage.setItem('playpop-snake-best', best); $('#snake-best').textContent = best; placeSnakeFood(); say('吃到星星啦！+10'); if (snakeScore >= 100) { stopSnake(); $('#snake-start').textContent = '再玩一局 →'; setSessionLevel(1); winSession(1, '贪吃蛇胜利！'); } } else snake.pop(); renderSnake(); }
  function placeSnakeFood() { const occupied = new Set(snake.map(part => cellIndex(part.x, part.y))); const free = []; for (let i = 0; i < snakeWidth * snakeHeight; i++) if (!occupied.has(i)) free.push(i); snakeFood = free[Math.floor(Math.random() * free.length)]; }
  function setSnakeDirection(direction) { const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' }; const names = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; const current = Object.entries(names).find(([, value]) => value.x === snakeDirection.x && value.y === snakeDirection.y)?.[0]; if (current !== opposites[direction]) queuedDirection = names[direction]; }
  $('#snake-start').addEventListener('click', startSnake);
  $$('.d-pad button[data-dir]').forEach(button => button.addEventListener('click', () => setSnakeDirection(button.dataset.dir)));
  document.addEventListener('keydown', (event) => { if (!activeGame) return; const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (keys[event.key] && activeGame === 'snake') { event.preventDefault(); setSnakeDirection(keys[event.key]); if (!snakeRunning) startSnake(); } if (activeGame === 'platformer') { if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') platformerInput.left = true; if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') platformerInput.right = true; if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === ' ') { event.preventDefault(); platformerInput.jump = true; if (!platformerRunning) startPlatformer(); } } if (event.key === 'Escape') closeGame(); });
  document.addEventListener('keyup', (event) => { if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') platformerInput.left = false; if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') platformerInput.right = false; });

  // Star defense: towers, moving monsters, projectiles, and visible health bars.
  const defenseBoard = $('#defense-board');
  let defenseEnergy = 90, defenseWave = 0, defenseTimer = null, defenseActive = false, defenseBuildMode = false, defenseTowers = [], defenseEnemies = [], defenseBullets = [], defenseSpawned = 0, defenseTotal = 0, defenseSpawnClock = 0, defenseBaseHealth = 100;
  const defensePath = [{ x: -8, y: 58 }, { x: 20, y: 58 }, { x: 20, y: 25 }, { x: 54, y: 25 }, { x: 54, y: 72 }, { x: 80, y: 72 }, { x: 80, y: 46 }, { x: 108, y: 46 }];
  const defenseBuildSpots = [{ x: 11, y: 83 }, { x: 35, y: 46 }, { x: 37, y: 83 }, { x: 67, y: 43 }, { x: 66, y: 84 }, { x: 91, y: 27 }, { x: 92, y: 78 }];
  function initDefense() { stopDefense(); defenseEnergy = 90; defenseWave = 0; defenseActive = false; defenseBuildMode = false; defenseTowers = []; defenseEnemies = []; defenseBullets = []; defenseBaseHealth = 100; score.textContent = '0'; $('#defense-energy').textContent = defenseEnergy; $('#defense-base-health').textContent = defenseBaseHealth; $('#defense-start').textContent = '开始第 1 波 →'; updateDefenseBuildButton(); renderDefense(); }
  function defensePoint(progress) { const max = defensePath.length - 1; const safe = Math.max(0, Math.min(max - .001, progress)); const index = Math.floor(safe); const t = safe - index; const start = defensePath[index]; const end = defensePath[index + 1]; return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }; }
  function defenseDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function defenseTowerMarkup(tower) { return `<div class="tower-unit skin-${getEquippedSkin('tower')}" style="left:${tower.x}%;top:${tower.y}%"><span class="tower-glow"></span><span class="tower-body"><i class="tower-roof"></i><i class="tower-barrel"></i></span></div>`; }
  function defenseMonsterMarkup(enemy) { const point = defensePoint(enemy.progress); return `<div class="monster-unit monster-${enemy.kind}" style="left:${point.x}%;top:${point.y}%"><span class="monster-hp"><i style="width:${Math.max(0, enemy.hp / enemy.maxHp * 100)}%"></i></span><span class="monster-body"><i class="monster-eye eye-one"></i><i class="monster-eye eye-two"></i><b class="monster-mouth"></b></span></div>`; }
  function renderDefense() { if (!defenseBoard) return; const road = '<div class="defense-route"><i class="road-segment road-h-one"></i><i class="road-segment road-v-one"></i><i class="road-segment road-h-two"></i><i class="road-segment road-v-two"></i><i class="road-segment road-h-three"></i><i class="road-segment road-v-three"></i><i class="road-segment road-h-four"></i></div><div class="defense-base"><span>★</span><b>基地</b></div>'; const occupied = defenseTowers.map(tower => `${tower.x},${tower.y}`); const spots = defenseBuildSpots.map((spot, index) => { const used = occupied.includes(`${spot.x},${spot.y}`); return used ? '' : `<button class="defense-build-spot ${defenseBuildMode ? 'is-ready' : ''}" style="left:${spot.x}%;top:${spot.y}%" data-spot="${index}" type="button">+</button>`; }).join(''); const towers = defenseTowers.map(defenseTowerMarkup).join(''); const monsters = defenseEnemies.map(defenseMonsterMarkup).join(''); const bullets = defenseBullets.map(bullet => { const point = bullet.target ? defensePoint(bullet.target.progress) : { x: bullet.x, y: bullet.y }; const x = bullet.x + (point.x - bullet.x) * bullet.progress; const y = bullet.y + (point.y - bullet.y) * bullet.progress; return `<i class="defense-bullet" style="left:${x}%;top:${y}%"></i>`; }).join(''); defenseBoard.innerHTML = `${road}${spots}${towers}${monsters}${bullets}`; $$('.defense-build-spot').forEach(spot => spot.addEventListener('click', () => buildTower(Number(spot.dataset.spot)))); }
  function updateDefenseBuildButton() { const button = $('#defense-build-mode'); if (!button) return; button.classList.toggle('is-active', defenseBuildMode); button.innerHTML = defenseBuildMode ? '✕ 取消建造 <span>请选择空位</span>' : '🔨 建造炮塔 <span>30 ⚡</span>'; }
  function buildTower(index) { if (!defenseBuildMode) { say('请先点击右侧“建造炮塔”按钮！'); return; } if (defenseEnergy < 30) { say('彩虹能量不够啦！'); return; } const spot = defenseBuildSpots[index]; if (!spot || defenseTowers.some(tower => tower.x === spot.x && tower.y === spot.y)) return; defenseEnergy -= 30; defenseTowers.push({ x: spot.x, y: spot.y, cooldown: .1 }); defenseBuildMode = false; $('#defense-energy').textContent = defenseEnergy; updateDefenseBuildButton(); renderDefense(); say('炮塔建好了！它会自动瞄准怪物。'); }
  function spawnDefenseEnemy() { const kind = defenseSpawned % 3 === 0 ? 'blob' : defenseSpawned % 3 === 1 ? 'horn' : 'spike'; const maxHp = 85 + defenseWave * 18; defenseEnemies.push({ id: `enemy-${Date.now()}-${defenseSpawned}`, progress: 0, hp: maxHp, maxHp, speed: .28 + defenseWave * .025, kind }); defenseSpawned += 1; }
  function fireDefense(tower, target) { defenseBullets.push({ x: tower.x, y: tower.y, progress: 0, target, damage: 24 + defenseWave * 2 }); tower.cooldown = .82; }
  function finishDefenseWave() { stopDefense(); defenseActive = false; defenseEnergy = Math.min(120, defenseEnergy + 24); $('#defense-energy').textContent = defenseEnergy; if (defenseWave >= 3) { $('#defense-start').textContent = '守护成功！'; setSessionLevel(3); winSession(3, '塔防胜利！'); } else { $('#defense-start').textContent = `开始第 ${defenseWave + 1} 波 →`; setSessionLevel(defenseWave); say(`第 ${defenseWave} 波守住了！+24 能量`); } renderDefense(); }
  function updateDefense() { const dt = .08; if (defenseSpawned < defenseTotal) { defenseSpawnClock += dt; if (defenseSpawnClock >= .72) { defenseSpawnClock = 0; spawnDefenseEnemy(); } } defenseEnemies.forEach(enemy => { enemy.progress += enemy.speed * dt; if (enemy.progress >= defensePath.length - 1) { enemy.reachedBase = true; defenseBaseHealth = Math.max(0, defenseBaseHealth - 20); $('#defense-base-health').textContent = defenseBaseHealth; } }); defenseEnemies = defenseEnemies.filter(enemy => !enemy.reachedBase); defenseTowers.forEach(tower => { tower.cooldown -= dt; if (tower.cooldown <= 0) { const candidates = defenseEnemies.map(enemy => ({ enemy, point: defensePoint(enemy.progress) })).filter(item => defenseDistance(tower, item.point) < 31).sort((a, b) => b.enemy.progress - a.enemy.progress); if (candidates[0]) fireDefense(tower, candidates[0].enemy); } }); defenseBullets.forEach(bullet => { bullet.progress += dt / .28; }); const landed = defenseBullets.filter(bullet => bullet.progress >= 1); landed.forEach(bullet => { if (bullet.target && defenseEnemies.includes(bullet.target)) { bullet.target.hp -= bullet.damage; if (bullet.target.hp <= 0) { defenseEnemies = defenseEnemies.filter(enemy => enemy !== bullet.target); score.textContent = Number(score.textContent || 0) + 10; } } }); defenseBullets = defenseBullets.filter(bullet => bullet.progress < 1); renderDefense(); if (defenseBaseHealth <= 0) { stopDefense(); defenseActive = false; $('#defense-start').textContent = '基地被突破，再来一次'; say('怪物突破基地了！再建几座炮塔试试吧！'); return; } if (defenseSpawned >= defenseTotal && defenseEnemies.length === 0 && defenseBullets.length === 0) finishDefenseWave(); }
  function startDefense() { if (defenseActive) return; if (defenseWave >= 3) { say('你已经守护成功啦！'); return; } defenseActive = true; defenseWave += 1; defenseSpawned = 0; defenseTotal = 4 + defenseWave * 2; defenseSpawnClock = .5; defenseEnemies = []; defenseBullets = []; setSessionLevel(defenseWave - 1); $('#defense-start').textContent = `第 ${defenseWave} 波进行中…`; defenseTimer = setInterval(updateDefense, 80); }
  function stopDefense() { clearInterval(defenseTimer); defenseTimer = null; defenseActive = false; }
  $('#defense-start').addEventListener('click', startDefense);
  $('#defense-build-mode').addEventListener('click', () => { if (defenseEnergy < 30 && !defenseBuildMode) { say('彩虹能量不够啦！'); return; } defenseBuildMode = !defenseBuildMode; updateDefenseBuildButton(); renderDefense(); if (defenseBuildMode) say('请点击地图上高亮的空位建造炮塔'); });

  // Candy shop: customers walk in, speak their order, then wait for the matching food.
  const foodCatalog = { lollipop: { label: '棒棒糖', icon: '🍭' }, donut: { label: '甜甜圈', icon: '🍩' }, cupcake: { label: '纸杯蛋糕', icon: '🧁' } };
  let shopCoins = 0, shopFame = 1, shopLevel = 1, shopServed = 0, shopLoop = null, shopCustomer = null, shopNextCustomer = 0;
  function initShop() { stopShop(); shopCoins = 0; shopFame = 1; shopLevel = 1; shopServed = 0; shopCustomer = null; shopNextCustomer = Date.now() + 350; score.textContent = '0'; $('#shop-coins').textContent = '0'; $('#shop-fame').textContent = '1'; $('#shop-order-label').textContent = '正在等客人走进来…'; $('#shop-upgrade').disabled = false; $('#shop-upgrade').innerHTML = '升级店铺 <span>20 🪙</span>'; shopLoop = setInterval(updateShop, 100); renderShop(); }
  function stopShop() { clearInterval(shopLoop); shopLoop = null; shopCustomer = null; }
  function spawnShopCustomer() { const ids = Object.keys(foodCatalog); const id = ids[Math.floor(Math.random() * ids.length)]; shopCustomer = { x: 111, state: 'arriving', order: id }; renderShop(); }
  function renderShop() { const scene = $('.shop-scene'); const customer = $('#shop-customer'); const bubble = $('#shop-order-bubble'); if (!scene || !customer || !bubble) return; scene.classList.toggle('skin-neon', getEquippedSkin('shop') === 'neon'); if (!shopCustomer) { customer.hidden = true; bubble.className = 'shop-order-bubble'; bubble.textContent = ''; $('#shop-order-label').textContent = '正在等下一位客人…'; return; } customer.hidden = false; customer.style.left = `${shopCustomer.x}%`; customer.className = `shop-customer ${shopCustomer.state}`; const order = foodCatalog[shopCustomer.order]; if (shopCustomer.state === 'arriving') { bubble.className = 'shop-order-bubble is-visible arriving-bubble'; bubble.textContent = '欢迎光临！'; $('#shop-order-label').textContent = '顾客正在走进店里…'; } else if (shopCustomer.state === 'waiting') { bubble.className = 'shop-order-bubble is-visible'; bubble.textContent = `我想吃 ${order.icon} ${order.label}`; $('#shop-order-label').textContent = `“我想吃 ${order.icon} ${order.label}”`; } else { bubble.className = 'shop-order-bubble is-visible goodbye-bubble'; bubble.textContent = '谢谢你！'; $('#shop-order-label').textContent = '订单完成！下一位客人马上来'; } $$('.food-button').forEach(button => { button.classList.toggle('order-match', shopCustomer.state === 'waiting' && button.dataset.food === shopCustomer.order); }); }
  function updateShop() { if (!shopCustomer) { if (Date.now() >= shopNextCustomer) spawnShopCustomer(); return; } if (shopCustomer.state === 'arriving') { shopCustomer.x -= 3.3; if (shopCustomer.x <= 58) { shopCustomer.x = 58; shopCustomer.state = 'waiting'; say(`顾客说：我想吃${foodCatalog[shopCustomer.order].label}！`); } } else if (shopCustomer.state === 'leaving') { shopCustomer.x += 4; if (shopCustomer.x >= 111) { shopCustomer = null; shopNextCustomer = Date.now() + 650; } } renderShop(); }
  function serveFood(foodId) { if (!shopCustomer) { say('店里还没有客人，等他走进来吧！'); return; } if (shopCustomer.state !== 'waiting') { say('等顾客站好，再把食物交给他！'); return; } const order = foodCatalog[shopCustomer.order]; if (foodId !== shopCustomer.order) { say(`这位顾客想吃的是${order.label}，不是这个哦！`); return; } const earned = 8 + shopLevel * 2; shopCoins += earned; shopFame += 1; shopServed += 1; score.textContent = shopCoins; $('#shop-coins').textContent = shopCoins; $('#shop-fame').textContent = shopFame; shopCustomer.state = 'leaving'; setSessionLevel(Math.min(3, Math.ceil(shopServed / 2))); say(`订单完成！+${earned} 金币`); if (shopServed >= 5) winSession(3, '小店营业成功！'); }
  $$('.food-button').forEach(button => button.addEventListener('click', () => serveFood(button.dataset.food)));
  $('#shop-upgrade').addEventListener('click', () => { if (shopLevel > 1) return; if (shopCoins < 20) { say('还差一点小店金币，再服务几位客人吧！'); return; } shopCoins -= 20; shopLevel = 2; shopFame += 3; $('#shop-coins').textContent = shopCoins; $('#shop-fame').textContent = shopFame; $('#shop-upgrade').disabled = true; $('#shop-upgrade').innerHTML = '店铺已升级！ ✦'; $('.shop-scene').classList.add('shop-level-up'); say('升级成功！你的店铺更闪亮了！'); });

  // Jump & run platformer.
  const platformerCanvas = $('#platformer-canvas');
  const platformerContext = platformerCanvas?.getContext('2d');
  let platformerFrame = null, platformerRunning = false, platformerLast = 0, platformerState = null;
  const platformerInput = { left: false, right: false, jump: false };
  const platformerPlatforms = [{ x: 0, y: 380, w: 470, h: 60 }, { x: 570, y: 325, w: 220, h: 25 }, { x: 875, y: 380, w: 330, h: 60 }, { x: 1285, y: 305, w: 220, h: 25 }, { x: 1575, y: 360, w: 270, h: 80 }, { x: 1930, y: 315, w: 350, h: 125 }];
  function newPlatformerState() { return { worldWidth: 2280, camera: 0, player: { x: 80, y: 300, w: 34, h: 56, vx: 0, vy: 0, onGround: false, prevY: 300 }, enemies: [{ x: 330, y: 345, w: 36, h: 35, min: 300, max: 430, vx: 35, alive: true }, { x: 700, y: 290, w: 34, h: 35, min: 590, max: 750, vx: 30, alive: true }, { x: 1010, y: 345, w: 38, h: 35, min: 900, max: 1130, vx: 42, alive: true }, { x: 1360, y: 270, w: 36, h: 35, min: 1300, max: 1450, vx: 32, alive: true }, { x: 1690, y: 325, w: 42, h: 35, min: 1600, max: 1790, vx: 40, alive: true }, { x: 2040, y: 280, w: 38, h: 35, min: 1970, max: 2150, vx: 45, alive: true }] }; }
  function initPlatformer() { stopPlatformer(); platformerState = newPlatformerState(); score.textContent = '0'; $('#platformer-progress').textContent = '0%'; $('#platformer-start').textContent = '开始冒险 →'; drawPlatformer(); }
  function startPlatformer() { if (platformerRunning) return; if (sessionWon) { startSession(); initPlatformer(); } platformerRunning = true; platformerLast = performance.now(); $('#platformer-start').textContent = '冒险中…'; platformerFrame = requestAnimationFrame(platformerLoop); }
  function stopPlatformer() { cancelAnimationFrame(platformerFrame); platformerFrame = null; platformerRunning = false; }
  function platformerOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function resetPlatformerPlayer() { platformerState.player.x = Math.max(80, platformerState.player.x - 220); platformerState.player.y = 180; platformerState.player.vx = 0; platformerState.player.vy = 0; say('碰到怪物了！再跳高一点试试！'); }
  function updatePlatformer(dt) { const state = platformerState; const player = state.player; const oldBottom = player.y + player.h; player.prevY = player.y; player.vx = platformerInput.left ? -260 : platformerInput.right ? 260 : player.vx * .78; if (platformerInput.jump && player.onGround) { player.vy = -680; player.onGround = false; } platformerInput.jump = false; player.vy += 1700 * dt; player.x += player.vx * dt; player.y += player.vy * dt; player.x = Math.max(0, Math.min(state.worldWidth - player.w, player.x)); player.onGround = false; platformerPlatforms.forEach(platform => { if (player.vy >= 0 && oldBottom <= platform.y + 8 && player.y + player.h >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) { player.y = platform.y - player.h; player.vy = 0; player.onGround = true; } }); if (player.y > 520) resetPlatformerPlayer(); state.enemies.forEach(enemy => { if (!enemy.alive) return; enemy.x += enemy.vx * dt; if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.vx *= -1; const enemyRect = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }; if (platformerOverlap(player, enemyRect)) { if (player.vy > 0 && oldBottom <= enemy.y + 16) { enemy.alive = false; player.vy = -520; score.textContent = Number(score.textContent || 0) + 25; say('踩扁怪物！+25'); } else resetPlatformerPlayer(); } }); state.camera = Math.max(0, Math.min(state.worldWidth - platformerCanvas.width, player.x - 300)); const progress = Math.min(100, Math.floor(player.x / (state.worldWidth - 110) * 100)); $('#platformer-progress').textContent = `${progress}%`; if (player.x >= state.worldWidth - 120) { stopPlatformer(); $('#platformer-start').textContent = '再玩一关 →'; setSessionLevel(1); winSession(1, '跳跳冒险岛通关！'); } }
  function drawPlatformer() { if (!platformerContext || !platformerState) return; const ctx = platformerContext; const state = platformerState; ctx.clearRect(0, 0, platformerCanvas.width, platformerCanvas.height); const sky = ctx.createLinearGradient(0, 0, 0, platformerCanvas.height); sky.addColorStop(0, '#9de6ff'); sky.addColorStop(1, '#fff1ba'); ctx.fillStyle = sky; ctx.fillRect(0, 0, platformerCanvas.width, platformerCanvas.height); ctx.save(); ctx.translate(-state.camera, 0); ctx.fillStyle = '#ffffffaa'; [[150,70,70],[490,125,54],[1120,80,74],[1740,95,64]].forEach(([x,y,r]) => { ctx.beginPath(); ctx.arc(x,y,r*.45,0,Math.PI*2); ctx.arc(x+r*.45,y+8,r*.55,0,Math.PI*2); ctx.arc(x+r,y,r*.4,0,Math.PI*2); ctx.fill(); }); ctx.fillStyle = '#78c98b'; ctx.beginPath(); ctx.moveTo(0, 330); for (let x = 0; x < state.worldWidth; x += 120) ctx.quadraticCurveTo(x + 60, 255 + (x % 3) * 22, x + 120, 330); ctx.lineTo(state.worldWidth, 440); ctx.lineTo(0, 440); ctx.fill(); platformerPlatforms.forEach(platform => { ctx.fillStyle = '#9a604d'; ctx.fillRect(platform.x, platform.y, platform.w, platform.h); ctx.fillStyle = '#5fd18b'; ctx.fillRect(platform.x, platform.y, platform.w, 13); ctx.fillStyle = '#3caa73'; for (let x = platform.x + 8; x < platform.x + platform.w; x += 26) ctx.fillRect(x, platform.y + 15, 7, 9); }); const goalX = state.worldWidth - 105; ctx.fillStyle = '#fff'; ctx.fillRect(goalX, 170, 6, 145); ctx.fillStyle = '#ff6f62'; ctx.beginPath(); ctx.moveTo(goalX + 6, 175); ctx.lineTo(goalX + 78, 198); ctx.lineTo(goalX + 6, 222); ctx.fill(); state.enemies.forEach(enemy => { if (!enemy.alive) return; ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.fillStyle = enemy.vx > 0 ? '#885ce9' : '#ff7b72'; ctx.beginPath(); ctx.moveTo(0, 32); ctx.quadraticCurveTo(2, 0, enemy.w / 2, 4); ctx.quadraticCurveTo(enemy.w - 2, 0, enemy.w, 32); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#29345e'; ctx.beginPath(); ctx.arc(11, 14, 3, 0, Math.PI * 2); ctx.arc(enemy.w - 11, 14, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }); const p = state.player; ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = '#ff6f62'; ctx.fillRect(4, 0, 27, 13); ctx.fillStyle = '#29345e'; ctx.fillRect(7, 15, 24, 23); ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(18, 17, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6ed7f4'; ctx.fillRect(5, 31, 27, 20); ctx.fillStyle = '#29345e'; ctx.fillRect(2, 49, 11, 7); ctx.fillRect(23, 49, 11, 7); ctx.fillStyle = '#29345e'; ctx.fillRect(13, 14, 3, 4); ctx.fillRect(24, 14, 3, 4); ctx.restore(); ctx.restore(); }
  function platformerLoop(now) { if (!platformerRunning) return; const dt = Math.min(.04, (now - platformerLast) / 1000); platformerLast = now; updatePlatformer(dt); drawPlatformer(); if (platformerRunning) platformerFrame = requestAnimationFrame(platformerLoop); }
  $('#platformer-start').addEventListener('click', startPlatformer);
  $$('.platformer-controls button').forEach(button => { const dir = button.dataset.platformerDir; const down = (event) => { event.preventDefault(); if (dir === 'left') platformerInput.left = true; if (dir === 'right') platformerInput.right = true; if (dir === 'jump') platformerInput.jump = true; }; const up = (event) => { event.preventDefault(); if (dir === 'left') platformerInput.left = false; if (dir === 'right') platformerInput.right = false; }; button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointerleave', up); });

  function previewRoundRect(ctx, x, y, width, height, radius) { const r = Math.min(radius, width / 2, height / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath(); }
  function previewLabel(ctx, text, x, y, color = '#29345e') { ctx.font = '700 13px Baloo 2, Arial Rounded MT Bold, sans-serif'; ctx.fillStyle = color; ctx.fillText(text, x, y); }
  function drawPreviewHud(ctx, label, color) { previewRoundRect(ctx, 15, 12, 145, 29, 12); ctx.fillStyle = '#ffffffdd'; ctx.fill(); ctx.strokeStyle = '#29345e'; ctx.lineWidth = 2; ctx.stroke(); previewLabel(ctx, label, 27, 31, color); }
  function drawPreviewSnake(ctx, time) { ctx.fillStyle = '#d9f7f2'; ctx.fillRect(0, 0, 480, 250); ctx.strokeStyle = '#b5eadf'; ctx.lineWidth = 1; for (let x = 0; x < 480; x += 27) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 250); ctx.stroke(); } for (let y = 0; y < 250; y += 27) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(480, y); ctx.stroke(); } drawPreviewHud(ctx, 'SCORE 038', '#2db29b'); const phase = (time % 4) / 4; const travel = phase < .76 ? phase / .76 : 1 - (phase - .76) / .24; const headX = 70 + travel * 282; const headY = 146 + Math.sin(time * 4) * 23; const skin = getEquippedSkin('snake') === 'candy'; for (let index = 5; index >= 0; index -= 1) { const x = headX - index * 21; const y = headY + Math.sin(time * 4 - index * .55) * 5 + index * 2; ctx.beginPath(); ctx.arc(x, y, index === 0 ? 17 : 12, 0, Math.PI * 2); ctx.fillStyle = index === 0 ? '#ff8a57' : skin ? ['#ff6f62', '#ffd759', '#53d6b4'][index % 3] : '#ff6f62'; ctx.fill(); ctx.strokeStyle = '#29345e'; ctx.lineWidth = 2; ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(headX - 7, headY - 5, 4, 0, Math.PI * 2); ctx.arc(headX + 7, headY - 5, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#29345e'; ctx.beginPath(); ctx.arc(headX - 6, headY - 4, 2, 0, Math.PI * 2); ctx.arc(headX + 8, headY - 4, 2, 0, Math.PI * 2); ctx.fill(); const starX = 385, starY = 93 + Math.sin(time * 3) * 6; ctx.save(); ctx.translate(starX, starY); ctx.rotate(time * .8); ctx.fillStyle = '#ffd759'; ctx.strokeStyle = '#29345e'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 10; i += 1) { const radius = i % 2 ? 8 : 18; const angle = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); previewLabel(ctx, '吃星星 +10', 20, 232); }
  function drawMiniTower(ctx, x, y, skin) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#ffdb65'; ctx.beginPath(); ctx.ellipse(0, 27, 27, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = skin ? '#ff8ac0' : '#7557f3'; previewRoundRect(ctx, -18, -5, 36, 35, 9); ctx.fill(); ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = skin ? '#ffd759' : '#ff6f62'; ctx.beginPath(); ctx.moveTo(-21, -5); ctx.lineTo(0, -28); ctx.lineTo(21, -5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd759'; previewRoundRect(ctx, 11, 2, 25, 9, 4); ctx.fill(); ctx.stroke(); ctx.restore(); }
  function drawMiniMonster(ctx, x, y, color, hp) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, 20); ctx.quadraticCurveTo(-17, -13, 0, -15); ctx.quadraticCurveTo(17, -13, 19, 20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, -2, 5, 0, Math.PI * 2); ctx.arc(7, -2, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#29345e'; ctx.beginPath(); ctx.arc(-6, -1, 2, 0, Math.PI * 2); ctx.arc(8, -1, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; previewRoundRect(ctx, -24, -32, 48, 8, 4); ctx.fill(); ctx.fillStyle = '#5fdb7c'; previewRoundRect(ctx, -22, -30, 44 * hp, 4, 2); ctx.fill(); ctx.restore(); }
  function drawPreviewDefense(ctx, time) { const sky = ctx.createLinearGradient(0, 0, 0, 250); sky.addColorStop(0, '#9fe5f6'); sky.addColorStop(.42, '#9fe5f6'); sky.addColorStop(.42, '#9bdba2'); sky.addColorStop(1, '#75c88d'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, 250); drawPreviewHud(ctx, 'WAVE 2  ·  BASE 100%', '#7557f3'); ctx.fillStyle = '#d89165'; ctx.strokeStyle = '#f9db9a'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, 156); ctx.lineTo(105, 156); ctx.lineTo(105, 68); ctx.lineTo(270, 68); ctx.lineTo(270, 191); ctx.lineTo(390, 191); ctx.lineTo(390, 123); ctx.lineTo(510, 123); ctx.stroke(); ctx.strokeStyle = '#fff1c2'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]); drawMiniTower(ctx, 115, 176, getEquippedSkin('tower') === 'star'); drawMiniTower(ctx, 312, 111, getEquippedSkin('tower') === 'star'); const progress = (time % 4.4) / 4.4; const monsterX = 22 + progress * 410; const monsterY = monsterX < 105 ? 156 : monsterX < 270 ? 68 : monsterX < 390 ? 191 : 123; drawMiniMonster(ctx, monsterX, monsterY - 17, '#ff7b72', .72); drawMiniMonster(ctx, monsterX - 82, monsterY - 17, '#53d6b4', .42); const bulletX = 132 + ((time % .8) / .8) * 92; ctx.fillStyle = '#ffe05e'; ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bulletX, 133, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff0a9'; ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; previewRoundRect(ctx, 420, 71, 45, 75, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff6f62'; ctx.font = '24px sans-serif'; ctx.fillText('★', 430, 115); previewLabel(ctx, '炮弹命中 · 怪物血量下降', 18, 232); }
  function drawPreviewShop(ctx, time) { ctx.fillStyle = '#ffc979'; ctx.fillRect(0, 0, 480, 250); ctx.fillStyle = '#8b70d9'; ctx.fillRect(0, 0, 480, 75); drawPreviewHud(ctx, 'ORDER  ·  甜甜圈', '#c48b00'); ctx.fillStyle = '#ffd759'; ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; previewRoundRect(ctx, 180, 26, 120, 42, 9); ctx.fill(); ctx.stroke(); previewLabel(ctx, '糖果小店', 206, 52); ctx.fillStyle = '#9d6b55'; ctx.fillRect(65, 118, 245, 14); ctx.fillRect(65, 195, 245, 14); ctx.font = '33px sans-serif'; ctx.fillText('🍭', 95, 112); ctx.fillText('🍩', 170, 112); ctx.fillText('🧁', 242, 112); const customerX = 435 - Math.min(150, (time % 4) * 48); ctx.fillStyle = '#6ed7f4'; previewRoundRect(ctx, customerX, 129, 35, 62, 10); ctx.fill(); ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(customerX + 17, 115, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#704b55'; ctx.fillRect(customerX + 3, 94, 28, 9); ctx.fillStyle = '#fff'; previewRoundRect(ctx, customerX - 90, 76, 85, 31, 10); ctx.fill(); ctx.stroke(); previewLabel(ctx, '我想吃 🍩', customerX - 81, 97); ctx.fillStyle = '#9bded3'; ctx.fillRect(366, 93, 70, 117); ctx.strokeStyle = '#29345e'; ctx.strokeRect(366, 93, 70, 117); previewLabel(ctx, '点击食物', 20, 232); }
  function drawPreviewPlatformer(ctx, time) { const sky = ctx.createLinearGradient(0, 0, 0, 250); sky.addColorStop(0, '#9de6ff'); sky.addColorStop(1, '#fff1ba'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, 250); drawPreviewHud(ctx, 'LEVEL 1  ·  48%', '#7557f3'); ctx.fillStyle = '#78c98b'; ctx.beginPath(); ctx.moveTo(0, 160); ctx.quadraticCurveTo(110, 95, 220, 160); ctx.quadraticCurveTo(350, 85, 480, 160); ctx.lineTo(480, 250); ctx.lineTo(0, 250); ctx.fill(); const platforms = [[0, 201, 210, 49], [255, 168, 82, 16], [366, 201, 150, 49]]; platforms.forEach(([x, y, width, height]) => { ctx.fillStyle = '#9a604d'; ctx.fillRect(x, y, width, height); ctx.fillStyle = '#5fd18b'; ctx.fillRect(x, y, width, 8); }); const jump = Math.abs(Math.sin(time * 2.2)) * 42; const heroX = 128 + (time % 3) * 18; ctx.fillStyle = '#6ed7f4'; previewRoundRect(ctx, heroX, 140 - jump, 28, 43, 9); ctx.fill(); ctx.strokeStyle = '#29345e'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(heroX + 14, 132 - jump, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff6f62'; ctx.fillRect(heroX + 2, 112 - jump, 25, 8); const monsterX = 316 + Math.sin(time * 2) * 16; drawMiniMonster(ctx, monsterX, 183, '#885ce9', 1); ctx.fillStyle = '#fff'; ctx.fillRect(427, 93, 5, 108); ctx.fillStyle = '#ff6f62'; ctx.beginPath(); ctx.moveTo(432, 96); ctx.lineTo(469, 108); ctx.lineTo(432, 121); ctx.fill(); previewLabel(ctx, '跳过怪物 · 到达彩旗通关', 18, 232); }
  function initGamePreviews() { const previews = $$('.preview-canvas'); if (!previews.length) return; const contexts = previews.map(canvas => ({ type: canvas.dataset.preview, ctx: canvas.getContext('2d') })); const animate = (timestamp) => { const seconds = timestamp / 1000; contexts.forEach(({ type, ctx }) => { if (!ctx) return; ctx.clearRect(0, 0, 480, 250); if (type === 'snake') drawPreviewSnake(ctx, seconds); if (type === 'defense') drawPreviewDefense(ctx, seconds); if (type === 'shop') drawPreviewShop(ctx, seconds); if (type === 'platformer') drawPreviewPlatformer(ctx, seconds); }); requestAnimationFrame(animate); }; requestAnimationFrame(animate); }
  function initLivePreviews() { const snakePreview = $('#home-snake-preview'); const defensePreview = $('#home-defense-preview'); const shopPreview = $('#home-shop-preview'); if (!snakePreview || !defensePreview || !shopPreview) return; const snakeWidth = 16, snakeHeight = 8, snakeCells = []; snakePreview.innerHTML = ''; for (let i = 0; i < snakeWidth * snakeHeight; i += 1) { const cell = document.createElement('span'); cell.className = 'snake-cell'; snakePreview.appendChild(cell); snakeCells.push(cell); } shopPreview.innerHTML = '<div class="shop-night"></div><div class="shop-sign">糖果<br><small>小店</small></div><div class="shop-shelf shelf-a"></div><div class="shop-shelf shelf-b"></div><button class="shop-product product-a" type="button">🍭</button><button class="shop-product product-b" type="button">🍩</button><button class="shop-product product-c" type="button">🧁</button><div class="shop-door"></div><div class="shop-order-bubble is-visible">我想吃 🍩</div><div class="shop-customer waiting"><span class="customer-hair"></span><span class="customer-face"><i></i><i></i><b></b></span><span class="customer-shirt"></span><span class="customer-leg customer-leg-a"></span><span class="customer-leg customer-leg-b"></span></div>'; const shopCustomerPreview = shopPreview.querySelector('.shop-customer'); const shopBubblePreview = shopPreview.querySelector('.shop-order-bubble'); const route = [{ x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 }, { x: 11, y: 5 }, { x: 12, y: 5 }, { x: 12, y: 4 }, { x: 12, y: 3 }, { x: 11, y: 3 }, { x: 10, y: 3 }, { x: 9, y: 3 }, { x: 8, y: 3 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 3, y: 6 }]; const tick = (timestamp) => { const time = timestamp / 1000; const headIndex = Math.floor(time * 5) % route.length; snakeCells.forEach(cell => { cell.className = 'snake-cell'; cell.textContent = ''; }); for (let segment = 5; segment >= 0; segment -= 1) { const point = route[(headIndex - segment + route.length * 2) % route.length]; const cell = snakeCells[point.y * snakeWidth + point.x]; if (cell) cell.classList.add('snake', segment === 0 ? 'snake-head' : 'snake-body', `skin-${getEquippedSkin('snake')}`); } const food = snakeCells[3 * snakeWidth + 12]; if (food) { food.classList.add('food'); food.textContent = '✦'; } const enemyA = { progress: (time * .22) % (defensePath.length - 1), kind: 'blob', hp: 74, maxHp: 100 }; const enemyB = { progress: Math.max(0, ((time * .22) - .9) % (defensePath.length - 1)), kind: 'horn', hp: 43, maxHp: 100 }; const towerMarkup = defenseTowerMarkup({ x: 28, y: 78 }) + defenseTowerMarkup({ x: 70, y: 42 }); const a = defensePoint(enemyA.progress), bulletPoint = { x: 28 + ((a.x - 28) * ((time % .55) / .55)), y: 78 + ((a.y - 78) * ((time % .55) / .55)) }; defensePreview.innerHTML = `<div class="defense-route"><i class="road-segment road-h-one"></i><i class="road-segment road-v-one"></i><i class="road-segment road-h-two"></i><i class="road-segment road-v-two"></i><i class="road-segment road-h-three"></i><i class="road-segment road-v-three"></i><i class="road-segment road-h-four"></i></div><div class="defense-base"><span>★</span><b>基地</b></div>${towerMarkup}${defenseMonsterMarkup(enemyA)}${defenseMonsterMarkup(enemyB)}<i class="defense-bullet" style="left:${bulletPoint.x}%;top:${bulletPoint.y}%"></i>`; const shopX = 61 + Math.sin(time * 1.2) * 2; if (shopCustomerPreview) { shopCustomerPreview.style.left = `${shopX}%`; shopCustomerPreview.style.right = 'auto'; } if (shopBubblePreview) shopBubblePreview.style.left = '29%'; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }

  function initAnimatedPreviews() {
    const snakePreview = $('#home-snake-preview');
    const defensePreview = $('#home-defense-preview');
    const shopPreview = $('#home-shop-preview');
    if (!snakePreview || !defensePreview || !shopPreview) return;

    const snakeWidth = 16;
    const snakeHeight = 8;
    const snakeCells = [];
    snakePreview.innerHTML = '';
    for (let i = 0; i < snakeWidth * snakeHeight; i += 1) {
      const cell = document.createElement('span');
      cell.className = 'snake-cell';
      cell.style.transition = 'transform .18s ease, opacity .18s ease';
      snakePreview.appendChild(cell);
      snakeCells.push(cell);
    }
    const snakeRoute = [
      { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
      { x: 10, y: 5 }, { x: 11, y: 5 }, { x: 12, y: 5 }, { x: 12, y: 4 },
      { x: 12, y: 3 }, { x: 11, y: 3 }, { x: 10, y: 3 }, { x: 9, y: 3 },
      { x: 8, y: 3 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 5, y: 6 },
      { x: 4, y: 6 }, { x: 3, y: 6 }
    ];
    const foodCell = snakeCells[2 * snakeWidth + 14];
    if (foodCell) {
      foodCell.classList.add('food');
      foodCell.textContent = '✦';
    }

    const defenseEnemyA = { progress: 0, kind: 'blob', hp: 74, maxHp: 100 };
    const defenseEnemyB = { progress: 0, kind: 'horn', hp: 43, maxHp: 100 };
    defensePreview.innerHTML = `<div class="defense-route"><i class="road-segment road-h-one"></i><i class="road-segment road-v-one"></i><i class="road-segment road-h-two"></i><i class="road-segment road-v-two"></i><i class="road-segment road-h-three"></i><i class="road-segment road-v-three"></i><i class="road-segment road-h-four"></i></div><div class="defense-base"><span>★</span><b>基地</b></div>${defenseTowerMarkup({ x: 28, y: 78 })}${defenseTowerMarkup({ x: 70, y: 42 })}${defenseMonsterMarkup(defenseEnemyA)}${defenseMonsterMarkup(defenseEnemyB)}<i class="defense-bullet preview-bullet"></i>`;
    const defenseMonsters = defensePreview.querySelectorAll('.monster-unit');
    const defenseBullet = defensePreview.querySelector('.preview-bullet');

    shopPreview.innerHTML = '<div class="shop-night"></div><div class="shop-sign">糖果<br><small>小店</small></div><div class="shop-shelf shelf-a"></div><div class="shop-shelf shelf-b"></div><button class="shop-product product-a" type="button">🍭</button><button class="shop-product product-b" type="button">🍩</button><button class="shop-product product-c" type="button">🧁</button><div class="shop-door"></div><div class="shop-order-bubble is-visible">我想吃 🍩</div><div class="shop-customer waiting"><span class="customer-hair"></span><span class="customer-face"><i></i><i></i><b></b></span><span class="customer-shirt"></span><span class="customer-leg customer-leg-a"></span><span class="customer-leg customer-leg-b"></span></div>';
    const shopCustomerPreview = shopPreview.querySelector('.shop-customer');
    const shopBubblePreview = shopPreview.querySelector('.shop-order-bubble');

    const setDefenseEnemy = (element, enemy) => {
      if (!element) return;
      const point = defensePoint(enemy.progress);
      element.style.left = `${point.x}%`;
      element.style.top = `${point.y}%`;
      const hp = element.querySelector('.monster-hp i');
      if (hp) hp.style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
    };

    const tick = (timestamp) => {
      const time = timestamp / 1000;
      const headIndex = Math.floor(time * 5) % snakeRoute.length;
      snakeCells.forEach(cell => {
        cell.classList.remove('snake', 'snake-head', 'snake-body', 'skin-default', 'skin-candy');
        cell.style.transform = '';
      });
      for (let segment = 5; segment >= 0; segment -= 1) {
        const point = snakeRoute[(headIndex - segment + snakeRoute.length * 2) % snakeRoute.length];
        const cell = snakeCells[point.y * snakeWidth + point.x];
        if (!cell) continue;
        cell.classList.add('snake', segment === 0 ? 'snake-head' : 'snake-body', `skin-${getEquippedSkin('snake')}`);
        cell.style.transform = `scale(${segment === 0 ? 1.08 : .92})`;
      }
      if (foodCell) foodCell.style.transform = `translateY(${Math.sin(time * 4) * 3}px) rotate(${time * 80}deg)`;

      defenseEnemyA.progress = (time * .22) % (defensePath.length - 1);
      defenseEnemyB.progress = Math.max(0, ((time * .22) - .9) % (defensePath.length - 1));
      defenseEnemyA.hp = 58 + (Math.sin(time * 1.1) + 1) * 10;
      defenseEnemyB.hp = 24 + (Math.sin(time * 1.1 + 1.4) + 1) * 10;
      setDefenseEnemy(defenseMonsters[0], defenseEnemyA);
      setDefenseEnemy(defenseMonsters[1], defenseEnemyB);
      const target = defensePoint(defenseEnemyA.progress);
      const bulletProgress = (time % .65) / .65;
      if (defenseBullet) {
        defenseBullet.style.left = `${28 + (target.x - 28) * bulletProgress}%`;
        defenseBullet.style.top = `${78 + (target.y - 78) * bulletProgress}%`;
      }

      if (shopCustomerPreview) {
        const cycle = (time % 6) / 6;
        const shopX = cycle < .35 ? 95 - cycle / .35 * 34 : cycle < .76 ? 61 : 61 + (cycle - .76) / .24 * 34;
        shopCustomerPreview.style.left = `${shopX}%`;
        shopCustomerPreview.style.right = 'auto';
      }
      if (shopBubblePreview) shopBubblePreview.style.left = '29%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  applySkins();
  initGamePreviews();
  initAnimatedPreviews();
})();
