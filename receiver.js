(() => {
  'use strict';
  const NAMESPACE = 'urn:x-cast:com.example.dartscalcpro.scoreboard';
  const root = document.getElementById('players'), template = document.getElementById('player-template');
  const status = document.getElementById('status'), leftLegs = document.getElementById('left-legs'), rightLegs = document.getElementById('right-legs');
  let previous = null, previewState = null;
  const sample = () => ({ type:'scoreboard.update', status:'playing', legs:[2,1], players:[{name:'PUSHKA',elo:1642,remaining:174,average:78.4,dartsLeft:12,lastVisit:60,current:true},{name:'Practice Bot — Grandmaster',isBot:true,remaining:287,average:72.1,dartsLeft:9,lastVisit:45,current:false}] });
  const fmt = (v, fallback='—') => Number.isFinite(Number(v)) ? new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(Number(v)) : fallback;
  const change = (a,b) => a != null && a !== b;
  const animations = new WeakMap();
  function updateRemaining(element, value) {
    const old = animations.get(element);
    if (old && old.target === value) return;
    if (old?.frame != null) cancelAnimationFrame(old.frame);
    const from = old?.displayed;
    const animation = { target:value, displayed:value, frame:null };
    animations.set(element, animation);
    if (typeof value !== 'number' || !Number.isFinite(value) || typeof from !== 'number' || value >= from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent=fmt(value); return;
    }
    animation.displayed=from;
    let start=null;
    function tick(now) {
      if (start===null) start=now;
      const progress=Math.min((now-start)/500,1), eased=1-Math.pow(1-progress,3);
      animation.displayed=Math.round(from+(value-from)*eased);
      element.textContent=fmt(animation.displayed);
      animation.frame=progress<1?requestAnimationFrame(tick):null;
    }
    animation.frame=requestAnimationFrame(tick);
  }
  // Accept both the public receiver format and the snapshot already emitted by
  // CalcURate. The Android snapshot keeps the leg score in player.score.
  function normalise(state) {
    const players = state.players.map(player => ({
      ...player,
      dartsLeft: player.dartsLeft ?? player.darts,
      average: player.average ?? player.avg,
      current: player.current ?? player.isCurrent,
    }));
    const hasLegs = Array.isArray(state.legs);
    return {
      ...state,
      players,
      legs: hasLegs ? state.legs : [
        state.leftLegs ?? players[0]?.score ?? 0,
        state.rightLegs ?? players[1]?.score ?? 0,
      ],
      // CalcURate keeps the winning player's remaining score at 0 until
      // «Продолжить». That is also the reliable waiting-state signal used by
      // existing versions of the Android sender.
      waitingForContinue: state.waitingForContinue ?? (
        /wait|ожидан/i.test(String(state.status ?? '')) ||
        players.some(player => Number(player.remaining) === 0)
      ),
    };
  }
  function render(state) {
    if (!state || !Array.isArray(state.players)) return;
    state = normalise(state);
    const legs = state.legs;
    leftLegs.textContent=fmt(legs[0],'0'); rightLegs.textContent=fmt(legs[1],'0');
    const playing = state.status !== 'waiting' && !state.waitingForContinue;
    status.textContent=playing?'ИДЁТ ИГРА':'ОЖИДАНИЕ ПРОДОЛЖЕНИЯ'; document.body.classList.toggle('is-live',playing);
    const oldPlayers=previous?.players||[];
    while(root.children.length>Math.min(state.players.length,2)) {
      const card=root.lastElementChild, animation=animations.get(card.querySelector('.remaining-value'));
      if(animation?.frame!=null) cancelAnimationFrame(animation.frame);
      card.remove();
    }
    state.players.slice(0,2).forEach((p,i)=>{
      const old=oldPlayers[i]||{}, active=p.current===true||p.isCurrent===true;
      let card=root.children[i];
      if(!card){card=template.content.firstElementChild.cloneNode(true);root.append(card);}
      card.classList.toggle('is-active',active); card.classList.toggle('is-waiting',!active);
      card.querySelector('.player-name').textContent=typeof p.name==='string'&&p.name.trim()?p.name.trim():`ИГРОК ${i+1}`;
      card.querySelector('.elo').textContent=(p.isBot||p.bot)?'':Number.isFinite(Number(p.elo))?`ELO ${fmt(p.elo)}`:'';
      const remaining=card.querySelector('.remaining-value'), currentScore=p.remaining??p.score; updateRemaining(remaining,currentScore);
      card.querySelector('.average').textContent=`AVG ${fmt(p.average??p.avg,'0.0')}`;
      const darts=card.querySelector('.darts-value'), currentDarts=p.dartsLeft??p.darts??3; darts.textContent=`× ${fmt(currentDarts,'3')}`; if(change(old.dartsLeft??old.darts,currentDarts)){darts.classList.remove('is-changing');void darts.offsetWidth;darts.classList.add('is-changing');}
      const visit=card.querySelector('.last-visit'), hasVisit=typeof p.lastVisit==='number'&&Number.isFinite(p.lastVisit);
      visit.hidden=!hasVisit; visit.textContent=hasVisit?fmt(p.lastVisit):'';
    }); previous=structuredClone(state);
  }
  function preview(fn){previewState ||= sample();fn(previewState);render(previewState);return previewState;}
  window.CalcURatePreview=Object.freeze({
    reset:()=>{previewState=sample();render(previewState);return previewState;}, set:s=>{previewState=structuredClone(s);render(previewState);return previewState;}, update:p=>preview(s=>Object.assign(s,p)),
    nextPlayer:()=>preview(s=>s.players.forEach(p=>p.current=!p.current)), throw:(points=20)=>preview(s=>{const p=s.players.find(x=>x.current)||s.players[0], amount=Math.min(p.remaining,Math.max(0,Number(points)||0));p.remaining-=amount;p.lastVisit=amount;p.dartsLeft+=3;}),
    undoDart:(points=20)=>preview(s=>{const p=s.players.find(x=>x.current)||s.players[0];p.remaining+=Number(points);p.dartsLeft=Math.max(0,p.dartsLeft-3);delete p.lastVisit;}), finishLeg:(winner=0)=>preview(s=>{s.legs[Number(winner)||0]++;s.status='waiting';s.waitingForContinue=true;}),
    continue:()=>preview(s=>{s.status='playing';s.waitingForContinue=false;s.players.forEach(p=>{p.remaining=501;p.dartsLeft=0;delete p.lastVisit;});})
  });
  function startReceiver(){if(!window.cast?.framework)return;const context=cast.framework.CastReceiverContext.getInstance();context.addCustomMessageListener(NAMESPACE,e=>{if(e.data?.type==='scoreboard.update')render(e.data);});context.start();}
  window.addEventListener('load',()=>{
    // The real receiver must never show fake match data.  Demo data is opt-in
    // so the same deployed page can be used for local visual checks.
    if (new URLSearchParams(window.location.search).has('preview')) {
      previewState = sample();
      render(previewState);
    }
    startReceiver();
  },{once:true});
})();
