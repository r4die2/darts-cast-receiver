(() => {
  "use strict";

  const NAMESPACE = "urn:x-cast:com.example.dartscalcpro.scoreboard";
  const playersRoot = document.getElementById("players");
  const playerTemplate = document.getElementById("player-template");
  const modeElement = document.getElementById("mode");
  const legElement = document.getElementById("leg");
  const statusElement = document.getElementById("status");

  function text(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function score(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
    }
    if (typeof value === "string" && value.trim()) return value.trim();
    return "—";
  }

  function render(state) {
    if (!state || !Array.isArray(state.players)) return;

    const players = state.players.slice(0, 4);
    playersRoot.replaceChildren();
    players.forEach((player, index) => {
      const card = playerTemplate.content.firstElementChild.cloneNode(true);
      const active = player.current === true || player.isCurrent === true;
      card.classList.toggle("is-active", active);
      card.querySelector(".player-name").textContent = text(player.name, `Игрок ${index + 1}`);
      card.querySelector(".score-value").textContent = score(player.score);
      card.querySelector(".remaining-value").textContent = score(player.remaining);
      card.querySelector(".turn-label").textContent = active ? "СЕЙЧАС ХОДИТ" : "";
      playersRoot.append(card);
    });

    modeElement.textContent = text(state.mode, "ДАРТС").toLocaleUpperCase("ru-RU");
    legElement.textContent = state.leg == null ? "" : `ЛЕГ ${state.leg}`;
    statusElement.textContent = text(state.status, "Идёт игра");
    document.body.classList.add("is-live");
  }

  function startReceiver() {
    const context = cast.framework.CastReceiverContext.getInstance();
    context.addCustomMessageListener(NAMESPACE, (event) => {
      const message = event.data;
      if (message && message.type === "scoreboard.update") render(message);
    });
    context.start();
  }

  window.addEventListener("load", startReceiver, { once: true });
})();
