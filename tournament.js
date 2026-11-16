(() => {
  'use strict';
  let board, state, page = 0, timer;
  const element = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
  function valid(snapshot) {
    const t = snapshot?.tournament;
    return snapshot?.mode === 'tournament' && typeof t?.id === 'string' && Number.isSafeInteger(t.revision) &&
      typeof t?.name === 'string' && typeof t.stage === 'string' &&
      Array.isArray(t.participants) && t.participants.length >= 2 && t.participants.length <= 256 &&
      t.participants.every(n => typeof n === 'string') && Array.isArray(t.matches) && t.matches.length <= 65536 &&
      t.matches.every(m => typeof m.id === 'string' && Number.isInteger(m.first) && Number.isInteger(m.second) &&
        m.first >= 0 && m.second >= 0 && m.first < t.participants.length && m.second < t.participants.length) &&
      Array.isArray(t.tables) && t.tables.length <= 8 && t.tables.every(table => Array.isArray(table) && table.length <= 256 &&
        table.every(row => Number.isInteger(row.player) && row.player >= 0 && row.player < t.participants.length &&
          ['wins','for','against','difference'].every(key => Number.isFinite(row[key])))) &&
      (t.winner === null || (Number.isInteger(t.winner) && t.winner >= 0 && t.winner < t.participants.length));
  }
  function draw() {
    if (!state || !board) return;
    const t = state.tournament, names = t.participants;
    board.replaceChildren(element('h1', t.name), element('h2', t.winner === null ? t.stage : `Победитель: ${names[t.winner]}`));
    if (typeof t.lastResult === 'string' && t.lastResult) board.append(element('p', `Последний матч: ${t.lastResult}`));
    if (t.currentMatch) {
      const current = t.matches.find(m => m.id === t.currentMatch);
      if (current) board.append(element('p', `Следующий матч: ${names[current.first]} — ${names[current.second]}`));
    }
    const groups = new Map();
    t.matches.forEach(m => {
      const label = m.label || 'Матч';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(m);
    });
    const columns = [...groups.entries()].flatMap(([label, matches]) => {
      const result = [];
      for (let i = 0; i < matches.length; i += 4) result.push([label, matches.slice(i, i + 4)]);
      return result;
    });
    const pages = Math.max(1, Math.ceil(columns.length / 3));
    page %= pages;
    const grid = element('div', ''); grid.className = 'tournament-grid';
    columns.slice(page * 3, page * 3 + 3).forEach(([label, matches]) => {
      const column = element('div', ''); column.className = 'tournament-column';
      column.append(element('h3', label));
      matches.forEach(m => {
        const card = element('div', ''); card.className = 'tournament-match';
        const scores = String(m.score || '—').match(/^(\\d+)\\s*:\\s*(\\d+)/);
        [m.first, m.second].forEach((id, index) => {
          const row = element('div', ''); row.className = 'tournament-player';
          row.append(element('span', names[id]), element('strong', scores ? scores[index + 1] : '—'));
          if (scores && Number(scores[index + 1]) > Number(scores[2 - index])) row.classList.add('winner');
          card.append(row);
        });
        column.append(card);
      });
      grid.append(column);
    });
    board.append(grid, element('small', `Страница ${page + 1} / ${pages}`));
  }
  window.CalcURateTournament = {
    valid,
    render(snapshot) {
      if (snapshot?.mode !== 'tournament') { if (board) board.hidden = true; clearInterval(timer); state = null; return false; }
      if (!valid(snapshot)) return false;
      if (!board) { board = element('section', ''); board.id = 'tournament-board'; document.body.append(board); }
      if (state?.tournament.id !== snapshot.tournament.id) page = 0;
      state = snapshot; board.hidden = false; draw(); clearInterval(timer);
      timer = setInterval(() => { page++; draw(); }, 8000);
      return true;
    }
  };
})();
