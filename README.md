# CalcURate Chromecast receiver

Receiver принимает `scoreboard.update` в `urn:x-cast:com.example.dartscalcpro.scoreboard`.
Текущий `GameActivity` CalcURate уже использует этот канал: после каждого
обновления UI он передаёт `remaining`, число дротиков в леге, средний набор,
счёт по легам, активного игрока, ELO рейтинговых профилей и признак бота.

## Preview и DevTools Console

Откройте `index.html?preview=1` через локальный HTTP-сервер или GitHub Pages.
Без `?preview=1` receiver не показывает фиктивные данные и ждёт сообщение от
Android-приложения. В консоли доступны:

```js
CalcURatePreview.throw(60)       // анимирует очки и дротик
CalcURatePreview.nextPlayer()    // смена активной карточки
CalcURatePreview.finishLeg(0)    // левый игрок выигрывает лег, включается ожидание
CalcURatePreview.continue()      // начинает следующий лег
CalcURatePreview.undoDart(60)
CalcURatePreview.reset()
```

`CalcURatePreview.set(state)` принимает состояние receiver: `legs: [left, right]`, `status: 'playing' | 'waiting'`, а игроки поддерживают `name`, `remaining`/`score`, `average`/`avg`, `dartsLeft`/`darts`, `current`, `elo`, `isBot`.

## Сообщение от Android

Отправляйте в custom Cast namespace `urn:x-cast:com.example.dartscalcpro.scoreboard`
сообщение этого вида после каждого броска, отмены, смены хода, завершения лега
и нажатия «Продолжить»:

```json
{
  "type": "scoreboard.update",
  "status": "playing",
  "legs": [2, 1],
  "players": [
    {"name":"PUSHKA","elo":1642,"remaining":174,"average":78.4,"dartsLeft":2,"current":true},
    {"name":"Practice Bot","isBot":true,"remaining":287,"average":72.1,"dartsLeft":3}
  ]
}
```

Для паузы после выигранного лега передайте `"status":"waiting"`; для бота
не передавайте `elo` (или передайте `isBot:true`). Приёмник также совместим с
текущим снимком CalcURate, где счёт по легам находится в `player.score`, а
число дротиков — в `player.darts`.
