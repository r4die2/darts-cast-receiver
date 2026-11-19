(() => {
  'use strict';
  const sectors = [20,19,18,17,16,15,25];
  let board;
  const make = (tag, cls, text) => {
    const element = document.createElement(tag);
    element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const count = value => Math.max(0, Math.trunc(Number(value) || 0));
  function marks(value) {
    const n = Math.min(3, count(value));
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox','0 0 72 72');
    icon.setAttribute('class', `cricket-mark marks-${n}`);
    icon.setAttribute('aria-label', `${n} из 3 отметок`);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    // Same proportions as CricketHitView: slash/cross at .31 and circle at .47 of the mark size.
    path.setAttribute('d', n === 0 ? '' : `M16.16 55.84L55.84 16.16${n >= 2 ? 'M16.16 16.16L55.84 55.84' : ''}${n === 3 ? 'M66.08 36A30.08 30.08 0 1 1 5.92 36A30.08 30.08 0 1 1 66.08 36' : ''}`);
    icon.append(path);
    return icon;
  }
  function init() {
    board = make('section','cricket-board');
    board.id = 'cricket-board';
    board.setAttribute('aria-label','Табло крикета');
    const heading = make('header','cricket-heading');
    heading.append(make('span','cricket-mode','КРИКЕТ'),make('span','cricket-rules'));
    const players = make('div','cricket-players');
    for (let i = 0; i < 2; i++) {
      const player = make('article','cricket-player');
      player.append(make('h1','cricket-name'),make('div','cricket-turn'),make('div','cricket-points'),make('div','cricket-darts'));
      players.append(player);
    }
    const grid = make('div','cricket-grid');
    sectors.forEach(sector => {
      const row = make('div','cricket-row');
      row.setAttribute('data-sector', String(sector));
      for (let i = 0; i < 2; i++) {
        const side = make('div',`cricket-side cricket-side-${i}`);
        side.append(make('span','cricket-hit-count'),make('span','cricket-symbol'));
        row.append(side);
      }
      const label = make('div','cricket-sector',sector === 25 ? undefined : String(sector));
      if (sector === 25) {
        label.setAttribute('aria-label','Bull, сектор 25');
        const dot = make('span','cricket-bull-dot');
        dot.setAttribute('aria-hidden','true');
        label.append(dot);
      }
      row.append(label);
      grid.append(row);
    });
    board.append(heading, players, grid, make('div','cricket-result'));
    document.querySelector('.scoreboard').insertBefore(board, document.querySelector('.footer'));
  }
  function render(state) {
    const active = state?.mode === 'cricket';
    document.body.classList.toggle('is-cricket', active);
    if (!active) { if (board) board.hidden = true; return false; }
    if (!board) init();
    board.hidden = false;
    const points = state.usePoints === true;
    board.classList.toggle('without-points', !points);
    board.querySelector('.cricket-rules').textContent = points ? 'С НАБОРОМ ОЧКОВ' : 'БЕЗ ОЧКОВ';
    const winner = state.waitingForContinue === true && (state.winnerIndex === 0 || state.winnerIndex === 1) ? state.winnerIndex : null;
    const resuming = board.classList.contains('has-winner') && winner === null;
    board.classList.toggle('has-winner', winner !== null);
    if (resuming) {
      const grid = board.querySelector('.cricket-grid');
      grid.classList.remove('is-resuming');
      void grid.offsetWidth;
      grid.classList.add('is-resuming');
    }
    const cards = board.querySelectorAll('.cricket-player');
    state.players.forEach((player, index) => {
      const card = cards[index];
      const name = typeof player.name === 'string' && player.name.trim() ? player.name.trim() : `Игрок ${index + 1}`;
      card.classList.toggle('is-active', player.current === true && winner === null);
      card.querySelector('.cricket-name').textContent = name;
      card.querySelector('.cricket-turn').textContent = winner === index ? 'ПОБЕДИТЕЛЬ ЛЕГА' : player.current === true && winner === null ? 'СЕЙЧАС БРОСАЕТ' : ' ';
      card.querySelector('.cricket-points').textContent = `${count(player.points)} ОЧКОВ`;
      card.querySelector('.cricket-points').hidden = !points;
      card.querySelector('.cricket-darts').textContent = `МЕТКИ · ${count(player.darts)}`;
    });
    const rows = board.querySelectorAll('.cricket-row');
    sectors.forEach((sector, index) => {
      const sourceIndex = Array.isArray(state.sectors) ? state.sectors.indexOf(sector) : index;
      const values = state.players.map(player => Math.min(3, count(player.marks?.[sourceIndex])));
      const row = rows[index];
      row.classList.toggle('is-closed',values.every(n => n === 3));
      row.querySelector('.cricket-sector').classList.toggle('is-opened',values.some(n => n === 3));
      state.players.forEach((player, side) => {
        const cell = row.querySelector(`.cricket-side-${side}`);
        cell.classList.toggle('can-score',points && values[side] === 3 && values[1-side] < 3);
        cell.querySelector('.cricket-symbol').replaceChildren(marks(values[side]));
        const hits = count(player.sectorHits?.[sourceIndex] ?? values[side]);
        cell.classList.toggle('has-hits',hits > 0);
        cell.querySelector('.cricket-hit-count').textContent = String(hits);
      });
    });
    const result = board.querySelector('.cricket-result');
    result.hidden = winner === null;
    result.replaceChildren();
    if (winner !== null) {
      const player = state.players[winner];
      const name = typeof player.name === 'string' && player.name.trim() ? player.name.trim() : `Игрок ${winner + 1}`;
      result.append(make('div', 'cricket-win-title', 'ПОБЕДИТЕЛЬ ЛЕГА'),
        make('div', 'cricket-win-name', name),
        make('div', 'cricket-win-score', `${count(state.legs?.[0])} : ${count(state.legs?.[1])}`),
        make('div', 'cricket-win-wait', 'ОЖИДАНИЕ ПРОДОЛЖЕНИЯ НА ТЕЛЕФОНЕ'));
    }
    return true;
  }
  const sample = (usePoints = true) => ({
    type:'scoreboard.update',version:1,mode:'cricket',usePoints,sectors,
    status:'playing',waitingForContinue:false,winnerIndex:null,legs:[2,1],
    players:[
      {name:'PUSHKA',points:usePoints?120:0,darts:21,current:true,marks:[3,3,3,2,1,0,3],sectorHits:usePoints?[6,3,4,2,1,0,3]:[3,3,3,2,1,0,3]},
      {name:'DONETSK',points:usePoints?85:0,darts:18,current:false,marks:[3,1,3,0,2,3,1],sectorHits:usePoints?[3,1,5,0,2,4,1]:[3,1,3,0,2,3,1]}
    ]
  });
  window.CalcURateCricket = Object.freeze({render,sample});
})();
