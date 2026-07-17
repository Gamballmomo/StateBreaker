const STRINGS = {
  en: {
    documentTitle: "Uncle Wang's Milk Tea · BUG50 Lab",
    eyebrow: "STATEBREAKER LOCAL LAB / 01",
    title: "Uncle Wang's Milk Tea",
    subtitle: "One coupon that should work once — and two hands that don't care.",
    ticketKicker: "TODAY ONLY · DEV PROMISE",
    ticketCopy: "¥50 off everything (min spend ¥0)",
    ruleLabel: "Usage rule",
    ruleValue: "Once only (in theory)",
    noTable: "no table yet",
    consoleTitle: "Cart state",
    liveBadge: "single-process lab",
    metricDiscount: "Discount total",
    metricSuccess: "Successful redeems",
    metricTimes: " ×",
    metricCoupon: "Coupon",
    couponUnused: "unused",
    couponUsed: "used",
    btnReset: "Open a new table",
    btnHonest: "Honest redeem once",
    btnRace: "Double-speed attack",
    statusBoot: "Wiping tables for Uncle Wang…",
    timelineTitle: "Server event receipt",
    timelineHint:
      "Real evidence is how much discount changed — not how many HTTP 200s you got.",
    eventsEmpty: "The receipt printer is still silent.",
    statusOpening: "Opening a new table and sweeping leftover wool…",
    statusOpened: "New table ready. BUG50 looks very confident.",
    statusOpenFail: "Failed to open table: ",
    statusHonest: "Queueing an honest redeem…",
    statusHonestOk: "Redeemed: ¥50 off. Uncle Wang is fine with this.",
    statusHonestFail: "Redeem rejected: ",
    statusRacing: "Both hands reach the register at once…",
    statusRaceBroken:
      "State broken: one coupon redeemed twice — discount is ¥100.",
    statusRacePartial: "This round succeeded ",
    statusRacePartialTail: " time(s). Open a new table and retry.",
    eventMessages: {
      "run.created": "New table opened. BUG50 pretends it can only be used once.",
      "coupon.checked": "Check passed: still looks unused right now.",
      "coupon.committed": "Write finished: discount +¥50.",
      "coupon.rejected": "Check failed: coupon already used. Uncle Wang caught it.",
    },
  },
  zh: {
    documentTitle: "老王奶茶铺 · BUG50 实验台",
    eyebrow: "STATEBREAKER LOCAL LAB / 01",
    title: "老王奶茶铺",
    subtitle: "一张只许用一次的券，和两只不讲武德的手。",
    ticketKicker: "今日限定 · 程序员发誓",
    ticketCopy: "满 0 元减 50 元",
    ruleLabel: "使用规则",
    ruleValue: "仅限一次（理论上）",
    noTable: "尚未开桌",
    consoleTitle: "购物车状态",
    liveBadge: "单进程实验中",
    metricDiscount: "累计优惠",
    metricSuccess: "成功兑换",
    metricTimes: " 次",
    metricCoupon: "券状态",
    couponUnused: "未使用",
    couponUsed: "已使用",
    btnReset: "开一张新桌",
    btnHonest: "老实兑换一次",
    btnRace: "发动双倍手速",
    statusBoot: "正在给老王擦桌子……",
    timelineTitle: "服务器事件小票",
    timelineHint: "真正的证据是优惠变成多少，不是收到了几个 HTTP 200。",
    eventsEmpty: "小票打印机还没收到消息。",
    statusOpening: "正在开新桌，顺便把上一桌的羊毛扫掉……",
    statusOpened: "新桌已开。BUG50 看起来非常自信。",
    statusOpenFail: "开桌失败：",
    statusHonest: "老实排队兑换中……",
    statusHonestOk: "兑换成功：老王给你减了 50 元。",
    statusHonestFail: "兑换被拒：",
    statusRacing: "两只手同时伸向收银台……",
    statusRaceBroken: "状态已打破：一张券成功兑换两次，优惠变成 100 元。",
    statusRacePartial: "本轮成功 ",
    statusRacePartialTail: " 次；请开新桌后再试。",
    eventMessages: {
      "run.created": "新桌已开，BUG50 正在假装自己只能用一次。",
      "coupon.checked": "检查通过：此刻看起来还没用过。",
      "coupon.committed": "写入完成：优惠再加 50 元。",
      "coupon.rejected": "检查失败：券已经用过，老王这次反应过来了。",
    },
  },
};

const ui = {
  runId: document.querySelector("#run-id"),
  discount: document.querySelector("#discount"),
  successCount: document.querySelector("#success-count"),
  couponState: document.querySelector("#coupon-state"),
  status: document.querySelector("#status-line"),
  events: document.querySelector("#events"),
  reset: document.querySelector("#reset-button"),
  single: document.querySelector("#single-button"),
  race: document.querySelector("#race-button"),
  langEn: document.querySelector("#lang-en"),
  langZh: document.querySelector("#lang-zh"),
};

let currentRunId = null;
let busy = false;
let lang = localStorage.getItem("statebreaker-lab-lang") || "en";
let lastEvents = [];

function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}

function eventMessage(kind, fallback) {
  const map = (STRINGS[lang] && STRINGS[lang].eventMessages) || {};
  return map[kind] || fallback || kind;
}

function applyStaticI18n() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("documentTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key || key === "coupon-state") return;
    // Don't overwrite dynamic run-id / coupon-state while a run is active
    if (node.id === "run-id" && currentRunId) return;
    if (node.id === "coupon-state") return;
    if (node.id === "status-line" && currentRunId) return;
    node.textContent = t(key);
  });
  ui.langEn.classList.toggle("active", lang === "en");
  ui.langZh.classList.toggle("active", lang === "zh");
  if (!currentRunId) {
    ui.runId.textContent = t("noTable");
    ui.couponState.textContent = t("couponUnused");
    ui.status.textContent = t("statusBoot");
  }
}

function setLang(next) {
  lang = next === "zh" ? "zh" : "en";
  localStorage.setItem("statebreaker-lab-lang", lang);
  applyStaticI18n();
  if (currentRunId) {
    // re-render dynamic bits
    ui.couponState.textContent =
      ui.couponState.dataset.used === "1" ? t("couponUsed") : t("couponUnused");
    renderEvents(lastEvents);
  }
}

function setBusy(next) {
  busy = next;
  [ui.reset, ui.single, ui.race].forEach((button) => {
    button.disabled = next;
  });
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.detail || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function renderState(state) {
  ui.runId.textContent = state.run_id;
  ui.discount.textContent = String(state.discount_yuan);
  ui.successCount.textContent = String(state.successful_redemptions);
  const used = Boolean(state.coupon_used);
  ui.couponState.dataset.used = used ? "1" : "0";
  ui.couponState.textContent = used ? t("couponUsed") : t("couponUnused");
  ui.couponState.style.color = state.discount_yuan > 50 ? "#ff8e76" : "#e7e143";
}

function renderEvents(events) {
  lastEvents = events || [];
  ui.events.replaceChildren();
  if (!lastEvents.length) {
    const empty = document.createElement("li");
    empty.className = "event empty";
    empty.textContent = t("eventsEmpty");
    ui.events.append(empty);
    return;
  }
  lastEvents.forEach((event) => {
    const item = document.createElement("li");
    item.className = "event";

    const sequence = document.createElement("span");
    sequence.className = "event-seq";
    sequence.textContent = String(event.sequence).padStart(2, "0");

    const kind = document.createElement("span");
    const shortKind = event.kind.replace("coupon.", "");
    kind.className = `event-kind ${shortKind === "committed" ? "commit" : "check"}`;
    kind.textContent = event.kind;

    const message = document.createElement("span");
    message.className = "event-message";
    message.textContent = eventMessage(event.kind, event.message);

    const state = document.createElement("span");
    state.className = "event-state";
    state.textContent = `¥${event.snapshot.discount_yuan} / ${event.request_id.slice(0, 6)}`;

    item.append(sequence, kind, message, state);
    ui.events.append(item);
  });
}

async function refresh() {
  if (!currentRunId) return;
  const [state, timeline] = await Promise.all([
    requestJson(`/api/runs/${currentRunId}/state`),
    requestJson(`/api/runs/${currentRunId}/events`),
  ]);
  renderState(state);
  renderEvents(timeline.events);
}

async function resetRun() {
  setBusy(true);
  ui.status.textContent = t("statusOpening");
  try {
    const state = await requestJson("/api/runs", { method: "POST", body: "{}" });
    currentRunId = state.run_id;
    renderState(state);
    await refresh();
    ui.status.textContent = t("statusOpened");
  } catch (error) {
    ui.status.textContent = t("statusOpenFail") + error.message;
  } finally {
    setBusy(false);
  }
}

async function sendRedeem(label) {
  const requestId = `${label}-${crypto.randomUUID()}`;
  return requestJson(`/api/runs/${currentRunId}/redeem`, {
    method: "POST",
    headers: { "X-Request-ID": requestId },
    body: JSON.stringify({ coupon_code: "BUG50" }),
  });
}

async function redeemOnce() {
  if (!currentRunId || busy) return;
  setBusy(true);
  ui.status.textContent = t("statusHonest");
  try {
    await sendRedeem("honest");
    ui.status.textContent = t("statusHonestOk");
  } catch (error) {
    ui.status.textContent = t("statusHonestFail") + error.message;
  } finally {
    await refresh();
    setBusy(false);
  }
}

async function triggerRace() {
  if (!currentRunId || busy) return;
  setBusy(true);
  ui.status.textContent = t("statusRacing");
  const results = await Promise.allSettled([sendRedeem("left"), sendRedeem("right")]);
  const succeeded = results.filter((result) => result.status === "fulfilled").length;
  await refresh();
  ui.status.textContent =
    succeeded === 2
      ? t("statusRaceBroken")
      : `${t("statusRacePartial")}${succeeded}${t("statusRacePartialTail")}`;
  setBusy(false);
}

ui.reset.addEventListener("click", resetRun);
ui.single.addEventListener("click", redeemOnce);
ui.race.addEventListener("click", triggerRace);
ui.langEn.addEventListener("click", () => setLang("en"));
ui.langZh.addEventListener("click", () => setLang("zh"));

applyStaticI18n();
resetRun();
