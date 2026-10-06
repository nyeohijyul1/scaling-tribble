(() => {
  "use strict";

  // ------------------------------------------------------------
  // 기존 실행이 있다면 제거
  // ------------------------------------------------------------

  if (window.__pageDistort) {
    window.__pageDistort.destroy();
  }

  // ------------------------------------------------------------
  // 상태
  // ------------------------------------------------------------

  const state = {
    enabled: true,

    // 기본 왜곡 강도
    strength: 18,

    // 마우스 영향력
    mouseInfluence: 70,

    // 마우스 위치
    mouseX: 0.5,
    mouseY: 0.5,

    // 마우스가 화면에 있는지
    mouseActive: false,
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
  // SVG 생성
  // ------------------------------------------------------------

  const NS = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(NS, "svg");

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
        x="-15%"
        y="-15%"
        width="130%"
        height="130%"
        color-interpolation-filters="sRGB"
      >

        <feTurbulence
          id="${FILTER_ID}_noise"
          type="fractalNoise"
          baseFrequency="0.018"
          numOctaves="2"
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

    width: "250px",
    boxSizing: "border-box",

    padding: "16px",

    background: "rgba(20, 20, 24, 0.93)",
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

    <!-- 기본 강도 -->

    <label
      style="
        display:flex;
        justify-content:space-between;
        margin-bottom:8px;
      "
    >
      <span>Distortion</span>
      <span id="__distort_value">
        ${state.strength}
      </span>
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

    <!-- 마우스 영향 -->

    <label
      style="
        display:flex;
        justify-content:space-between;
        margin-top:16px;
        margin-bottom:8px;
      "
    >
      <span>Mouse Influence</span>
      <span id="__mouse_value">
        ${state.mouseInfluence}
      </span>
    </label>

    <input
      id="__mouse_range"
      type="range"
      min="0"
      max="100"
      step="1"
      value="${state.mouseInfluence}"
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
      <span>Static</span>
      <span>Mouse</span>
    </div>

    <div
      style="
        height:1px;
        background:rgba(255,255,255,.12);
        margin:14px 0;
      "
    ></div>

    <div
      style="
        display:flex;
        gap:8px;
      "
    >

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

    <div
      style="
        margin-top:10px;
        color:rgba(255,255,255,.38);
        font-size:10px;
        line-height:1.4;
      "
    >
      마우스를 움직이면 왜곡 패턴이 따라옵니다.<br>
      ESC: 패널 숨기기 / 보이기
    </div>
  `;

  const range =
    panel.querySelector("#__distort_range");

  const value =
    panel.querySelector("#__distort_value");

  const mouseRange =
    panel.querySelector("#__mouse_range");

  const mouseValue =
    panel.querySelector("#__mouse_value");

  const toggle =
    panel.querySelector("#__distort_toggle");

  const reset =
    panel.querySelector("#__distort_reset");

  const close =
    panel.querySelector("#__distort_close");

  // ------------------------------------------------------------
  // 왜곡 계산
  // ------------------------------------------------------------

  function updateDistortion() {
    if (!state.enabled || state.strength <= 0) {
      document.body.style.filter =
        original.filter;
      return;
    }

    document.body.style.filter =
      `url("#${FILTER_ID}")`;

    /*
     * 마우스 위치를 이용해서 turbulence의 주파수를 변경합니다.
     *
     * 화면 왼쪽/오른쪽 → X
     * 화면 위/아래       → Y
     *
     * 단순히 하나의 숫자를 변경하는 것이 아니라
     * X/Y 위치에 따라 서로 다른 노이즈 패턴을 만들어냅니다.
     */

    const x = state.mouseX;
    const y = state.mouseY;

    const influence =
      state.mouseInfluence / 100;

    // 중심으로부터 얼마나 떨어져 있는지
    const distanceFromCenter =
      Math.sqrt(
        Math.pow(x - 0.5, 2) +
        Math.pow(y - 0.5, 2)
      );

    /*
     * 마우스가 움직이면 0.008 ~ 0.035 사이에서
     * turbulence 패턴이 변화합니다.
     */
    const frequency =
      0.012 +
      (
        x * 0.012 +
        y * 0.008
      ) * influence;

    noise.setAttribute(
      "baseFrequency",
      frequency.toFixed(5)
    );

    /*
     * 마우스가 중앙에 있을 때보다
     * 화면 가장자리에 있을 때 조금 더 강하게 합니다.
     */
    const edgeStrength =
      state.strength *
      (
        1 +
        distanceFromCenter *
        1.2 *
        influence
      );

    displacement.setAttribute(
      "scale",
      edgeStrength.toFixed(2)
    );

    /*
     * seed를 마우스 위치로 변경합니다.
     *
     * 결과적으로 마우스를 움직일 때
     * 왜곡 패턴 자체가 이동하는 듯한 효과가 납니다.
     */
    const seed =
      Math.floor(
        x * 1000 +
        y * 2000
      );

    noise.setAttribute(
      "seed",
      String(seed)
    );
  }

  // ------------------------------------------------------------
  // 기본 강도
  // ------------------------------------------------------------

  range.addEventListener("input", () => {
    state.strength =
      Number(range.value);

    value.textContent =
      state.strength;

    updateDistortion();
  });

  // ------------------------------------------------------------
  // 마우스 영향력
  // ------------------------------------------------------------

  mouseRange.addEventListener("input", () => {
    state.mouseInfluence =
      Number(mouseRange.value);

    mouseValue.textContent =
      state.mouseInfluence;

    updateDistortion();
  });

  // ------------------------------------------------------------
  // 마우스 위치
  // ------------------------------------------------------------

  function handleMouseMove(event) {
    state.mouseX =
      event.clientX /
      Math.max(window.innerWidth, 1);

    state.mouseY =
      event.clientY /
      Math.max(window.innerHeight, 1);

    state.mouseX =
      Math.max(
        0,
        Math.min(1, state.mouseX)
      );

    state.mouseY =
      Math.max(
        0,
        Math.min(1, state.mouseY)
      );

    state.mouseActive = true;

    updateDistortion();
  }

  document.addEventListener(
    "mousemove",
    handleMouseMove,
    { passive: true }
  );

  // ------------------------------------------------------------
  // ON / OFF
  // ------------------------------------------------------------

  toggle.addEventListener("click", () => {
    state.enabled =
      !state.enabled;

    toggle.textContent =
      state.enabled
        ? "ON"
        : "OFF";

    toggle.style.opacity =
      state.enabled
        ? "1"
        : "0.55";

    updateDistortion();
  });

  // ------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------

  reset.addEventListener("click", () => {
    state.enabled = true;
    state.strength = 18;
    state.mouseInfluence = 70;
    state.mouseX = 0.5;
    state.mouseY = 0.5;

    range.value =
      state.strength;

    mouseRange.value =
      state.mouseInfluence;

    value.textContent =
      state.strength;

    mouseValue.textContent =
      state.mouseInfluence;

    toggle.textContent = "ON";
    toggle.style.opacity = "1";

    noise.setAttribute(
      "seed",
      "17"
    );

    updateDistortion();
  });

  // ------------------------------------------------------------
  // Panel
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

  close.addEventListener(
    "click",
    hidePanel
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        togglePanel();
      }
    }
  );

  // ------------------------------------------------------------
  // 제거
  // ------------------------------------------------------------

  function destroy() {
    document.body.style.filter =
      original.filter;

    document.removeEventListener(
      "mousemove",
      handleMouseMove
    );

    svg.remove();
    panel.remove();

    delete window.__pageDistort;
  }

  // ------------------------------------------------------------
  // 전역 API
  // ------------------------------------------------------------

  window.__pageDistort = {
    state,
    apply: updateDistortion,
    destroy,
    hidePanel,
    showPanel,
    togglePanel,
  };

  updateDistortion();
})();
