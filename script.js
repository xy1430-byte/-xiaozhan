(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
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
    shop: { title: '糖果小店长', kicker: 'MAKE IT SWEET', subtitle: '卖出糖果、升级店铺，成为人气店长' }
  };
  let activeGame = null;
  let toastTimer;
  const say = (message) => { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200); };

  function openGame(game) {
    activeGame = game;
    const data = gameData[game];
    title.textContent = data.title; kicker.textContent = data.kicker; subtitle.textContent = data.subtitle;
    $$('.game-panel').forEach(panel => { panel.hidden = panel.id !== `${game}-game`; });
    home.style.display = 'none'; screen.classList.add('is-open'); screen.setAttribute('aria-hidden', 'false'); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (game === 'snake') initSnake();
    if (game === 'defense') initDefense();
    if (game === 'shop') initShop();
  }
  function closeGame() { stopSnake(); stopDefense(); screen.classList.remove('is-open'); screen.setAttribute('aria-hidden', 'true'); home.style.display = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); activeGame = null; }
  $$('.play-card-button').forEach(button => button.addEventListener('click', () => openGame(button.dataset.game)));
  $$('.game-card').forEach(card => card.addEventListener('click', (event) => { if (!event.target.closest('button')) openGame(card.dataset.game); }));
  $('#exit-game').addEventListener('click', closeGame);
  $$('.nav-link').forEach(link => link.addEventListener('click', () => { if (activeGame) closeGame(); }));

  // Rainbow Snake
  const snakeBoard = $('#snake-board');
  let snake = [], snakeFood = 0, snakeDirection = { x: 1, y: 0 }, queuedDirection = { x: 1, y: 0 }, snakeLoop = null, snakeScore = 0, snakeRunning = false;
  const snakeWidth = 18, snakeHeight = 10;
  const cellIndex = (x, y) => y * snakeWidth + x;
  function initSnake() {
    stopSnake(); snakeRunning = false; snakeScore = 0; score.textContent = '0'; $('#snake-best').textContent = localStorage.getItem('playpop-snake-best') || '0';
    snake = [{ x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }]; snakeDirection = { x: 1, y: 0 }; queuedDirection = { x: 1, y: 0 }; snakeFood = cellIndex(13, 4); renderSnake(); $('#snake-start').textContent = '开始游戏 →';
  }
  function renderSnake() { snakeBoard.innerHTML = ''; const cells = Array.from({ length: snakeWidth * snakeHeight }, () => { const cell = document.createElement('div'); cell.className = 'snake-cell'; cell.setAttribute('role', 'gridcell'); snakeBoard.appendChild(cell); return cell; }); snake.forEach((part, index) => cells[cellIndex(part.x, part.y)]?.classList.add('snake', index === 0 ? 'snake-head' : 'snake-body')); cells[snakeFood]?.classList.add('food'); if (cells[snakeFood]) cells[snakeFood].textContent = '✦'; }
  function startSnake() { if (snakeRunning) { stopSnake(); $('#snake-start').textContent = '继续游戏 →'; return; } snakeRunning = true; $('#snake-start').textContent = '暂停游戏 →'; snakeLoop = setInterval(stepSnake, 170); }
  function stopSnake() { clearInterval(snakeLoop); snakeLoop = null; snakeRunning = false; }
  function stepSnake() { snakeDirection = queuedDirection; const head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y }; const hitWall = head.x < 0 || head.x >= snakeWidth || head.y < 0 || head.y >= snakeHeight; const hitSelf = snake.some(part => part.x === head.x && part.y === head.y); if (hitWall || hitSelf) { stopSnake(); $('#snake-start').textContent = '再玩一次 →'; say('哎呀！小蛇撞到了，试试再来一次'); return; } snake.unshift(head); if (cellIndex(head.x, head.y) === snakeFood) { snakeScore += 10; score.textContent = snakeScore; const best = Math.max(snakeScore, Number(localStorage.getItem('playpop-snake-best') || 0)); localStorage.setItem('playpop-snake-best', best); $('#snake-best').textContent = best; placeSnakeFood(); say('吃到星星啦！+10'); } else snake.pop(); renderSnake(); }
  function placeSnakeFood() { const occupied = new Set(snake.map(part => cellIndex(part.x, part.y))); const free = []; for (let i = 0; i < snakeWidth * snakeHeight; i++) if (!occupied.has(i)) free.push(i); snakeFood = free[Math.floor(Math.random() * free.length)]; }
  function setSnakeDirection(direction) { const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' }; const names = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; const current = Object.entries(names).find(([, value]) => value.x === snakeDirection.x && value.y === snakeDirection.y)?.[0]; if (current !== opposites[direction]) queuedDirection = names[direction]; }
  $('#snake-start').addEventListener('click', startSnake);
  $$('.d-pad button').forEach(button => button.addEventListener('click', () => setSnakeDirection(button.dataset.dir)));
  document.addEventListener('keydown', (event) => { if (!activeGame) return; const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (keys[event.key] && activeGame === 'snake') { event.preventDefault(); setSnakeDirection(keys[event.key]); if (!snakeRunning) startSnake(); } if (event.key === 'Escape') closeGame(); });

  // Star defense
  const defenseBoard = $('#defense-board');
  let defenseEnergy = 90, defenseWave = 0, defenseTimer = null, defenseActive = false, defenseTowers = [], defenseEnemies = [];
  const pathTiles = new Set([5, 6, 7, 15, 23, 31, 30, 29, 28, 36, 44, 45, 46, 47, 39]);
  function initDefense() { stopDefense(); defenseEnergy = 90; defenseWave = 0; defenseActive = false; defenseTowers = []; defenseEnemies = []; score.textContent = '0'; $('#defense-energy').textContent = defenseEnergy; $('#defense-start').textContent = '开始第 1 波 →'; renderDefense(); }
  function renderDefense() { defenseBoard.innerHTML = ''; for (let i = 0; i < 40; i++) { const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'defense-tile'; if (pathTiles.has(i)) tile.classList.add('path-tile'); if (i === 39) { tile.classList.add('base-tile'); tile.textContent = '★'; } if (defenseTowers.includes(i)) { tile.classList.add('tower-tile'); tile.textContent = '▲'; } if (defenseEnemies.includes(i)) { tile.classList.add('enemy-tile'); tile.textContent = '●'; } tile.addEventListener('click', () => buildTower(i)); defenseBoard.appendChild(tile); } }
  function buildTower(index) { if (pathTiles.has(index) || index === 39 || defenseTowers.includes(index) || defenseEnemies.includes(index)) { if (pathTiles.has(index)) say('这里是怪物通道，换个空地吧！'); return; } if (defenseEnergy < 30) { say('彩虹能量不够啦！'); return; } defenseEnergy -= 30; defenseTowers.push(index); $('#defense-energy').textContent = defenseEnergy; renderDefense(); say('炮塔建好了！'); }
  function startDefense() { if (defenseActive) return; if (defenseWave >= 3) { say('你已经守护成功啦！'); return; } defenseActive = true; defenseWave += 1; $('#defense-start').textContent = `第 ${defenseWave} 波进行中…`; let count = 0; defenseEnemies = []; renderDefense(); defenseTimer = setInterval(() => { const enemyPosition = [5, 6, 7, 15, 23, 31, 30, 29, 28, 36, 44, 45, 46, 47, 39][Math.min(count, 14)]; defenseEnemies.push(enemyPosition); count++; if (defenseEnemies.length > 5) defenseEnemies.shift(); score.textContent = defenseWave * 10 + count; renderDefense(); if (count >= 8) { stopDefense(); defenseActive = false; defenseEnergy = Math.min(120, defenseEnergy + 20); $('#defense-energy').textContent = defenseEnergy; $('#defense-start').textContent = defenseWave >= 3 ? '守护成功！' : `开始第 ${defenseWave + 1} 波 →`; say(defenseWave >= 3 ? '太棒啦！彩虹基地安全了！' : `第 ${defenseWave} 波守住了！+20 能量`); } }, 550); }
  function stopDefense() { clearInterval(defenseTimer); defenseTimer = null; defenseActive = false; }
  $('#defense-start').addEventListener('click', startDefense);

  // Candy shop
  let shopCoins = 0, shopFame = 1, shopLevel = 1;
  function initShop() { shopCoins = 0; shopFame = 1; shopLevel = 1; score.textContent = '0'; $('#shop-coins').textContent = '0'; $('#shop-fame').textContent = '1'; $('#shop-upgrade').disabled = false; $('#shop-upgrade').innerHTML = '升级店铺 <span>20 🪙</span>'; }
  $('#shop-sell').addEventListener('click', () => { const earned = 5 + shopLevel; shopCoins += earned; shopFame += 1; score.textContent = shopCoins; $('#shop-coins').textContent = shopCoins; $('#shop-fame').textContent = shopFame; say(`卖出一份甜甜糖果！+${earned} 金币`); if (shopCoins >= 20 && shopLevel === 1) $('#shop-upgrade').classList.add('ready'); });
  $('#shop-upgrade').addEventListener('click', () => { if (shopLevel > 1) return; if (shopCoins < 20) { say('还差一点金币，再卖几份糖果吧！'); return; } shopCoins -= 20; shopLevel = 2; shopFame += 3; $('#shop-coins').textContent = shopCoins; $('#shop-fame').textContent = shopFame; $('#shop-upgrade').disabled = true; $('#shop-upgrade').innerHTML = '店铺已升级！ ✦'; $('.shop-scene').style.filter = 'saturate(1.18)'; say('升级成功！你的店铺更闪亮了！'); });

  // A tiny bit of persistent delight for the lobby badge.
  const totalStars = Number(localStorage.getItem('playpop-stars') || 0);
  $('#total-stars').textContent = totalStars;
})();
