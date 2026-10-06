(() => {
  "use strict";

  // 이미 실행되어 있다면 중복 실행 방지
  if (window.__pageDistort) {
    window.__pageDistort.togglePanel();
    return;
  }

  const state = {
    enabled: true,
    strength: 18,
    frequency: 0.018,
    octaves: 2,
  };

  const original = {
    filter: document.body.style.filter,
  };

  const FILTER_ID =
    "__page_distort_filter_" +
    Math.random().toString(36).slice(2);

  const SVG_ID =
    "__page_distort_svg_" +
    Math.random().toString(36).slice(2);

  // ------------------------------------------------------------
  // SVG filter 생성
  // ------------------------------------------------------------

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  svg.id = SVG_ID;

  Object.assign(svg.style, {
    position: "absolute",
    width: "0",
    height: "0",
    overflow: "hidden",
    pointerEvents: "none",
  });

  svg.setAttribute("aria-hidden", "true");

  svg.innerHTML = `
    <defs>
      <filter
        id="${FILTER_ID}"
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        color-interpolation-filters="sRGB"
      >
        <feTurbulence
          id="${FILTER_ID}_noise"
          type="fractalNoise"
          baseFrequency="${state.frequency}"
          numOctaves="${state.octaves}"
          seed="17"
          result="noise"
        />

        <feDisplacementMap
          id="${FILTER_ID}_displacement"
          in="SourceGraphic"
          in2="noise"
          scale="${state.strength}"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  `;

  document.documentElement.appendChild(svg);

  const noise = svg.querySelector(
    `#${FILTER_ID}_noise`
  );

  const displacement = svg.querySelector(
    `#${FILTER_ID}_displacement`
  );

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  const panel = document.createElement("div");

  panel.id = "__page_distort_panel";

  Object.assign(panel.style, {
    position: "fixed",
    zIndex: "2147483647",
    top: "20px",
    right: "20px",
    width: "230px",
    boxSizing: "border-box",

    padding: "16px",

    background: "rgba(20, 20, 24, 0.92)",
    color: "#fff",

    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",

    boxShadow:
      "0 10px 35px rgba(0,0,0,0.35)",

    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, " +
      "\"Segoe UI\", sans-serif",

    fontSize: "13px",

    backdropFilter: "blur(10px)",

    userSelect: "none",
  });

  // UI 내부에서 body의 CSS filter 영향을 받지 않도록
  // html의 자식으로 직접 넣습니다.
  document.documentElement.appendChild(panel);

  panel.innerHTML = `
    <div
      style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:14px;
      "
    >
      <strong style="font-size:14px;">
        Screen Distortion
      </strong>

      <button
        id="__distort_close"
        title="닫기"
        style="
          border:0;
          background:transparent;
          color:rgba(255,255,255,.65);
          font-size:18px;
          cursor:pointer;
          line-height:1;
          padding:0 2px;
        "
      >×</button>
    </div>

    <label
      style="
        display:flex;
        justify-content:space-between;
        margin-bottom:8px;
      "
    >
      <span>Distortion</span>
      <span id="__distort_value">${state.strength}</span>
    </label>

    <input
      id="__distort_range"
      type="range"
      min="0"
      max="100"
      step="1"
      value="${state.strength}"
      style="
        width:100%;
        margin:0;
        cursor:pointer;
      "
    >

    <div
      style="
        display:flex;
        justify-content:space-between;
        margin-top:5px;
        color:rgba(255,255,255,.4);
        font-size:11px;
      "
    >
      <span>Clear</span>
      <span>Heavy</span>
    </div>

    <div style="
      height:1px;
      background:rgba(255,255,255,.12);
      margin:14px 0;
    "></div>

    <div style="
      display:flex;
      gap:8px;
    ">
      <button
        id="__distort_toggle"
        style="
          flex:1;
          border:0;
          border-radius:8px;
          padding:8px;
          background:#fff;
          color:#111;
          cursor:pointer;
          font-weight:600;
        "
      >ON</button>

      <button
        id="__distort_reset"
        style="
          flex:1;
          border:1px solid rgba(255,255,255,.15);
          border-radius:8px;
          padding:8px;
          background:rgba(255,255,255,.06);
          color:#fff;
          cursor:pointer;
        "
      >Reset</button>
    </div>

    <div style="
      margin-top:10px;
      color:rgba(255,255,255,.38);
      font-size:10px;
      line-height:1.4;
    ">
      ESC: panel 숨기기 / 보이기
    </div>
  `;

  const range = panel.querySelector("#__distort_range");
  const value = panel.querySelector("#__distort_value");
  const toggle = panel.querySelector("#__distort_toggle");
  const reset = panel.querySelector("#__distort_reset");
  const close = panel.querySelector("#__distort_close");

  // ------------------------------------------------------------
  // 적용
  // ------------------------------------------------------------

  function apply() {
    if (!state.enabled || state.strength <= 0) {
      document.body.style.filter = original.filter;
      return;
    }

    document.body.style.filter =
      `url("#${FILTER_ID}")`;

    displacement.setAttribute(
      "scale",
      String(state.strength)
    );

    noise.setAttribute(
      "baseFrequency",
      String(state.frequency)
    );

    noise.setAttribute(
      "numOctaves",
      String(state.octaves)
    );
  }

  // ------------------------------------------------------------
  // Range
  // ------------------------------------------------------------

  range.addEventListener("input", () => {
    state.strength = Number(range.value);
    value.textContent = state.strength;

    apply();
  });

  // ------------------------------------------------------------
  // ON / OFF
  // ------------------------------------------------------------

  toggle.addEventListener("click", () => {
    state.enabled = !state.enabled;

    toggle.textContent = state.enabled
      ? "ON"
      : "OFF";

    toggle.style.opacity =
      state.enabled ? "1" : "0.55";

    apply();
  });

  // ------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------

  reset.addEventListener("click", () => {
    state.strength = 18;
    state.frequency = 0.018;
    state.octaves = 2;
    state.enabled = true;

    range.value = state.strength;
    value.textContent = state.strength;

    toggle.textContent = "ON";
    toggle.style.opacity = "1";

    apply();
  });

  // ------------------------------------------------------------
  // 닫기
  // ------------------------------------------------------------

  function hidePanel() {
    panel.style.display = "none";
  }

  function showPanel() {
    panel.style.display = "block";
  }

  function togglePanel() {
    panel.style.display =
      panel.style.display === "none"
        ? "block"
        : "none";
  }

  close.addEventListener("click", hidePanel);

  // ESC로 패널 숨김/표시
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      togglePanel();
    }
  });

  // ------------------------------------------------------------
  // 정리 함수
  // ------------------------------------------------------------

  function destroy() {
    document.body.style.filter = original.filter;

    svg.remove();
    panel.remove();

    delete window.__pageDistort;
  }

  // ------------------------------------------------------------
  // 전역 API
  // ------------------------------------------------------------

  window.__pageDistort = {
    state,
    apply,
    destroy,
    hidePanel,
    showPanel,
    togglePanel,
  };

  // 최초 적용
  apply();
})();
