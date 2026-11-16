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
    const rows = [];
    if (t.reviewLeg) board.append(element('p', 'Лег завершён · ожидается подтверждение результата'));
    if (t.currentMatch) {
      const current = t.matches.find(m => m.id === t.currentMatch);
      if (current) rows.push(`Сейчас: ${names[current.first]} — ${names[current.second]} · ` + state.players.map(p => `${p.name}: ${p.remaining}`).join(' / '));
    }
    t.tables.forEach((table, i) => {
      rows.push(`Таблица ${i + 1} · победы / счёт / разница`);
      table.forEach(row => rows.push(`${names[row.player]} · ${row.wins} / ${row.for}:${row.against} / ${row.difference}`));
    });
    rows.push('Сетка и результаты');
    t.matches.forEach(m => rows.push(`${m.label || 'Матч'} · ${names[m.first]} — ${names[m.second]} · ${m.score}`));
    if (t.automaticAdvances?.length) rows.push('Проходы без игры: ' + t.automaticAdvances.map(i => names[i]).join(', '));
    const pages = Math.max(1, Math.ceil(rows.length / 10));
    page %= pages;
    rows.slice(page * 10, page * 10 + 10).forEach(row => board.append(element('p', row)));
    board.append(element('small', `Страница ${page + 1} / ${pages}`));
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
