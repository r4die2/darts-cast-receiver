(() => {
  'use strict';
  const NAMESPACE = 'urn:x-cast:com.example.dartscalcpro.scoreboard';
  const STORAGE_KEY = 'calcUrRate.scoreboard.v1';
  const root = document.getElementById('players'), template = document.getElementById('player-template');
  const legWin = document.getElementById('leg-win'), winnerName = document.getElementById('winner-name');
  const winnerVisit = document.getElementById('winner-visit');
  const eloResults = document.getElementById('elo-results');
  const botLegDetails = document.getElementById('bot-leg-details');
  const status = document.getElementById('status'), leftLegs = document.getElementById('left-legs'), rightLegs = document.getElementById('right-legs');
  let previous = null, previewState = null, previousLegWon = false;
  const legScoreAnimations = [null, null];
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
  function updateLegScore(element, value, index, animate) {
    const target=Number(value), old=legScoreAnimations[index];
    if (!Number.isFinite(target)) { element.textContent='0'; return; }
    if (old?.target===target) return;
    if (old?.frame!=null) cancelAnimationFrame(old.frame);
    const displayed=old?.displayed ?? Number(element.textContent);
    const animation={target,displayed:Number.isFinite(displayed)?displayed:target,frame:null};
    legScoreAnimations[index]=animation;
    if (animate && animation.displayed!==target) {
      element.classList.remove('score-changing');
      void element.offsetWidth;
      element.classList.add('score-changing');
    }
    if (!animate || animation.displayed===target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation.displayed=target;
      element.textContent=fmt(target,'0');
      return;
    }
    const from=animation.displayed;
    let start=null;
    function tick(now) {
      if (start===null) start=now;
      const progress=Math.min((now-start)/850,1), eased=1-Math.pow(1-progress,3);
      animation.displayed=Math.round(from+(target-from)*eased);
      element.textContent=fmt(animation.displayed,'0');
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
  function isValidScoreboard(state) {
    return state && state.type === 'scoreboard.update' &&
      Array.isArray(state.players) && state.players.length > 0 && state.players.length <= 2;
  }
  function restoreSavedState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (isValidScoreboard(state)) render(state, true);
    } catch (_) {
      // Storage may be unavailable on some receiver devices; live casting still works.
    }
  }
  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Storage may be unavailable or full; live casting still works.
    }
  }
  function render(state, restored = false) {
    if (!state || !Array.isArray(state.players)) return;
    state = normalise(state);
    const legs = state.legs;
    const playing = state.status !== 'waiting' && !state.waitingForContinue;
    const winnerIndex = state.waitingForContinue
      ? state.players.findIndex(player => Number(player.remaining ?? player.score) === 0)
      : -1;
    const legWon = winnerIndex >= 0;
    if (legWon && !previousLegWon && !restored) {
      legWin.classList.remove('is-entering');
      void legWin.offsetWidth;
      legWin.classList.add('is-entering');
    } else if (!legWon) {
      legWin.classList.remove('is-entering');
    }
    previousLegWon = legWon;
    const animateLegScore=legWon&&!restored&&previous!==null;
    updateLegScore(leftLegs,legs[0],0,animateLegScore);
    updateLegScore(rightLegs,legs[1],1,animateLegScore);
    root.hidden=legWon;
    legWin.hidden=!legWon;
    if (legWon) {
      const winner=state.players[winnerIndex];
      winnerName.textContent=typeof winner.name==='string'&&winner.name.trim()?winner.name.trim():`ИГРОК ${winnerIndex+1}`;
      const hasVisit=typeof winner.lastVisit==='number'&&Number.isFinite(winner.lastVisit);
      winnerVisit.hidden=!hasVisit;
      winnerVisit.textContent=hasVisit?`ПОБЕДНЫЙ ПОДХОД · ${fmt(winner.lastVisit)} ОЧКОВ`:'';
    }
    const showEloChanges=legWon&&state.ranked===true&&state.players.length===2&&
      state.players.every(player=>!player.isBot&&!player.bot&&typeof player.eloChange==='number'&&Number.isFinite(player.eloChange));
    eloResults.hidden=!showEloChanges;
    if(showEloChanges) {
      state.players.forEach((player,index)=>{
        const delta=player.eloChange;
        const name=document.getElementById(`elo-player-${index}`);
        const change=document.getElementById(`elo-change-${index}`);
        name.textContent=typeof player.name==='string'&&player.name.trim()?player.name.trim():`ИГРОК ${index+1}`;
        change.textContent=`${delta>0?'+':''}${fmt(delta)} ELO`;
        change.classList.toggle('is-positive',delta>=0);
        change.classList.toggle('is-negative',delta<0);
      });
    }
    const botIndex=state.isBotMode===true?state.players.findIndex(player=>player.botLeg&&Array.isArray(player.botLeg.scores)):-1;
    const showBotDetails=legWon&&botIndex>=0;
    botLegDetails.hidden=!showBotDetails;
    if(showBotDetails) {
      const bot=state.players[botIndex], record=bot.botLeg;
      const tournament=document.getElementById('bot-tournament');
      tournament.textContent=record.tournament||'Турнир не указан';
      const stage=document.getElementById('bot-match-stage');
      stage.hidden=!record.stage&&!record.date;
      stage.textContent=[record.stage,record.date].filter(Boolean).join(' · ');
      document.getElementById('bot-average').textContent=fmt(record.average,'0.0');
      document.getElementById('bot-darts').textContent=fmt(record.darts,'—');
      const visits=document.getElementById('bot-visits');
      visits.replaceChildren();
      record.scores.forEach((value,index)=>{
        const visit=document.createElement('span');
        visit.className='bot-visit';
        visit.textContent=`${fmt(value,'0')}${record.busts?.[index]?' · ПЕРЕБОР':''}`;
        visits.append(visit);
      });
    }
    status.textContent=restored?'СОХРАНЁННЫЙ СЧЁТ · ОЖИДАНИЕ ПОДКЛЮЧЕНИЯ':legWon?'ЛЕГ ВЫИГРАН':playing?'ИДЁТ ИГРА':'ОЖИДАНИЕ ПРОДОЛЖЕНИЯ';
    document.body.classList.toggle('is-live',playing&&!restored);
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
    undoDart:(points=20)=>preview(s=>{const p=s.players.find(x=>x.current)||s.players[0];p.remaining+=Number(points);p.dartsLeft=Math.max(0,p.dartsLeft-3);delete p.lastVisit;}), finishLeg:(winner=0)=>preview(s=>{const index=Math.max(0,Math.min(s.players.length-1,Number(winner)||0));s.legs[index]++;s.players[index].remaining=0;s.status='waiting';s.waitingForContinue=true;s.ranked=!s.isBotMode;s.players.forEach((player,i)=>{if(!s.isBotMode){delete player.isBot;delete player.bot;player.name=i===index?'PUSHKA':'Рейтинговый соперник';player.eloChange=i===index?3.5:-3.5;}});}),
    continue:()=>preview(s=>{s.status='playing';s.waitingForContinue=false;s.players.forEach(p=>{p.remaining=501;p.dartsLeft=0;delete p.lastVisit;});})
  });
  function startReceiver(){if(!window.cast?.framework)return;const context=cast.framework.CastReceiverContext.getInstance();context.addCustomMessageListener(NAMESPACE,e=>{if(isValidScoreboard(e.data)){saveState(e.data);render(e.data);}});context.start();}
  window.addEventListener('load',()=>{
    restoreSavedState();
    // The real receiver must never show fake match data.  Demo data is opt-in
    // so the same deployed page can be used for local visual checks.
    if (new URLSearchParams(window.location.search).has('preview')) {
      const previewMode=new URLSearchParams(window.location.search).get('preview');
      if(previewMode==='bot-leg') {
        window.CalcURatePreview.set({
          type:'scoreboard.update',status:'playing',legs:[1,0],isBotMode:true,
          players:[
            {name:'PUSHKA',remaining:2,current:true},
            {name:'Practice Bot — Grandmaster',isBot:true,remaining:220,current:false,
              botLeg:{average:65.35,darts:23,tournament:'Открытый кубок',stage:'Полуфинал',date:'07.11.2026',
                scores:[60,45,0,96,60,100,60,80],
                busts:[false,false,true,false,false,false,false,false]}}
          ]
        });
        window.CalcURatePreview.finishLeg(0);
      } else {
        previewState = sample();
        render(previewState);
      }
      if (previewMode === 'leg-win') {
        window.CalcURatePreview.finishLeg(0);
      }
    }
    startReceiver();
  },{once:true});
})();
