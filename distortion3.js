(() => {
  "use strict";

  // ============================================================
  // 기존 버전 제거
  // ============================================================

  if (window.__pageDistort) {
    window.__pageDistort.destroy();
  }

  // ============================================================
  // 상태
  // ============================================================

  const state = {
    enabled: true,

    // 전체 기본 왜곡
    strength: 8,

    // 마우스 주변 왜곡
    mouseStrength: 70,

    // 왜곡 반경 (% of screen)
    radius: 22,

    // 마우스가 움직이지 않을 때도 약간의 왜곡
    ambient: 0,

    mouseX: innerWidth / 2,
    mouseY: innerHeight / 2,

    mouseActive: false,
  };

  const originalFilter = document.body.style.filter;

  // ============================================================
  // ID
  // ============================================================

  const id = Math.random()
    .toString(36)
    .slice(2);

  const FILTER_ID =
    `__distort_filter_${id}`;

  const SVG_ID =
    `__distort_svg_${id}`;

  // ============================================================
  // SVG filter
  // ============================================================

  const NS =
    "http://www.w3.org/2000/svg";

  const svg =
    document.createElementNS(NS, "svg");

  svg.id = SVG_ID;

  Object.assign(svg.style, {
    position: "absolute",
    width: "0",
    height: "0",
    overflow: "hidden",
    pointerEvents: "none",
  });

  svg.setAttribute(
    "aria-hidden",
    "true"
  );

  svg.innerHTML = `
    <defs>

      <filter
        id="${FILTER_ID}"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        color-interpolation-filters="sRGB"
      >

        <feImage
          id="${FILTER_ID}_image"
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          result="mouseMap"
        />

        <feDisplacementMap
          id="${FILTER_ID}_displacement"
          in="SourceGraphic"
          in2="mouseMap"
          scale="70"
          xChannelSelector="R"
          yChannelSelector="G"
        />

      </filter>

    </defs>
  `;

  document.documentElement.appendChild(svg);

  const displacement =
    svg.querySelector(
      `#${FILTER_ID}_displacement`
    );

  const image =
    svg.querySelector(
      `#${FILTER_ID}_image`
    );

  // ============================================================
  // Displacement map 생성
  //
  // R = X 방향 displacement
  // G = Y 방향 displacement
  //
  // 128 = 변화 없음
  // 255 = +
  //   0 = -
  // ============================================================

  const mapCanvas =
    document.createElement("canvas");

  // 너무 큰 displacement map은 불필요하게 무거우므로
  // 512 x 512 정도로 제한
  mapCanvas.width = 512;
  mapCanvas.height = 512;

  const mapCtx =
    mapCanvas.getContext("2d");

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function generateDisplacementMap() {
    const width =
      mapCanvas.width;

    const height =
      mapCanvas.height;

    const imageData =
      mapCtx.createImageData(
        width,
        height
      );

    const data =
      imageData.data;

    // 실제 화면 좌표를 0~1로
    const mx =
      state.mouseX /
      Math.max(innerWidth, 1);

    const my =
      state.mouseY /
      Math.max(innerHeight, 1);

    /*
     * radius는 화면의 대각선을 기준으로 계산합니다.
     *
     * 예:
     *
     * radius = 20
     *
     *        약한 왜곡
     *       ╱────────╲
     *      ╱          ╲
     *     │    🖱️      │
     *      ╲          ╱
     *       ╲────────╱
     *
     */

    const radius =
      state.radius / 100;

    const strength =
      state.mouseStrength / 100;

    const ambient =
      state.ambient / 100;

    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const ux =
          x / (width - 1);

        const uy =
          y / (height - 1);

        // 화면 비율 보정
        const dx =
          (ux - mx) *
          (innerWidth / innerHeight);

        const dy =
          uy - my;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );

        /*
         * 0 = 중심
         * 1 = radius 바깥
         */
        const normalized =
          clamp(
            distance / radius,
            0,
            1
          );

        /*
         * smoothstep
         *
         * 중심에서 부드럽게 강해졌다가
         * radius 바깥에서는 0
         */
        const falloff =
          1 -
          (
            normalized *
            normalized *
            (
              3 -
              2 * normalized
            )
          );

        /*
         * 마우스에서 바깥쪽으로 밀어내는 힘.
         *
         * distance가 너무 작으면 방향이
         * 불안정해지므로 그대로 사용하지 않습니다.
         */
        const safeDistance =
          Math.max(
            distance,
            0.0001
          );

        const dirX =
          dx / safeDistance;

        const dirY =
          dy / safeDistance;

        /*
         * 중심 근처에서는 약하고,
         * 약간 떨어진 곳에서 가장 강하게
         * 휘도록 합니다.
         */
        const ring =
          Math.sin(
            normalized *
            Math.PI
          );

        const amount =
          falloff *
          ring *
          strength;

        /*
         * displacement map의 RGB 값.
         *
         * 128 = 0
         * 128 + amount = +
         * 128 - amount = -
         */

        let red =
          128 +
          dirX *
          amount *
          110;

        let green =
          128 +
          dirY *
          amount *
          110;

        /*
         * 아주 약한 전체 왜곡
         */
        red +=
          Math.sin(
            ux * 12 +
            uy * 8
          ) *
          ambient *
          8;

        green +=
          Math.cos(
            ux * 9 +
            uy * 13
          ) *
          ambient *
          8;

        const index =
          (y * width + x) * 4;

        data[index] =
          clamp(red, 0, 255);

        data[index + 1] =
          clamp(green, 0, 255);

        data[index + 2] =
          128;

        data[index + 3] =
          255;
      }
    }

    mapCtx.putImageData(
      imageData,
      0,
      0
    );

    /*
     * Canvas를 data URL로 변환하여
     * SVG feImage의 입력으로 사용합니다.
     */
    image.setAttribute(
      "href",
      mapCanvas.toDataURL(
        "image/png"
      )
    );
  }

  // ============================================================
  // 적용
  // ============================================================

  function apply() {
    if (
      !state.enabled ||
      (
        state.strength <= 0 &&
        state.mouseStrength <= 0
      )
    ) {
      document.body.style.filter =
        originalFilter;

      return;
    }

    document.body.style.filter =
      `url("#${FILTER_ID}")`;

    /*
     * SVG displacement scale은
     * 기본 왜곡의 크기입니다.
     */
    displacement.setAttribute(
      "scale",
      String(
        Math.max(
          1,
          state.strength
        )
      )
    );

    generateDisplacementMap();
  }

  // ============================================================
  // UI
  // ============================================================

  const panel =
    document.createElement("div");

  panel.id =
    "__page_distort_panel";

  Object.assign(panel.style, {
    position: "fixed",

    top: "20px",
    right: "20px",

    width: "270px",

    boxSizing: "border-box",

    padding: "16px",

    zIndex: "2147483647",

    background:
      "rgba(18, 18, 22, .94)",

    color: "#fff",

    border:
      "1px solid rgba(255,255,255,.16)",

    borderRadius: "15px",

    boxShadow:
      "0 12px 40px rgba(0,0,0,.4)",

    backdropFilter:
      "blur(12px)",

    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, " +
      "\"Segoe UI\", sans-serif",

    fontSize: "13px",

    userSelect: "none",
  });

  document.documentElement.appendChild(
    panel
  );

  panel.innerHTML = `

    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:16px;
    ">
      <strong style="
        font-size:14px;
      ">
        Screen Distortion
      </strong>

      <button
        id="__distort_close"
        style="
          border:0;
          background:none;
          color:rgba(255,255,255,.65);
          font-size:19px;
          cursor:pointer;
          padding:0 2px;
        "
      >×</button>
    </div>


    <!-- Mouse strength -->

    <label style="
      display:flex;
      justify-content:space-between;
      margin-bottom:7px;
    ">
      <span>
        Mouse Distortion
      </span>

      <span id="__mouse_strength_value">
        ${state.mouseStrength}
      </span>
    </label>

    <input
      id="__mouse_strength"
      type="range"
      min="0"
      max="100"
      value="${state.mouseStrength}"
      style="
        width:100%;
        cursor:pointer;
      "
    >

    <div style="
      display:flex;
      justify-content:space-between;
      color:rgba(255,255,255,.4);
      font-size:10px;
      margin-top:4px;
    ">
      <span>None</span>
      <span>Strong</span>
    </div>


    <!-- Radius -->

    <label style="
      display:flex;
      justify-content:space-between;
      margin-top:16px;
      margin-bottom:7px;
    ">
      <span>
        Distortion Radius
      </span>

      <span id="__radius_value">
        ${state.radius}
      </span>
    </label>

    <input
      id="__radius"
      type="range"
      min="5"
      max="60"
      value="${state.radius}"
      style="
        width:100%;
        cursor:pointer;
      "
    >

    <div style="
      display:flex;
      justify-content:space-between;
      color:rgba(255,255,255,.4);
      font-size:10px;
      margin-top:4px;
    ">
      <span>Small</span>
      <span>Wide</span>
    </div>


    <!-- Overall -->

    <label style="
      display:flex;
      justify-content:space-between;
      margin-top:16px;
      margin-bottom:7px;
    ">
      <span>
        Overall Distortion
      </span>

      <span id="__overall_value">
        ${state.strength}
      </span>
    </label>

    <input
      id="__overall"
      type="range"
      min="0"
      max="30"
      value="${state.strength}"
      style="
        width:100%;
        cursor:pointer;
      "
    >


    <div style="
      height:1px;
      background:rgba(255,255,255,.12);
      margin:15px 0;
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
          padding:9px;
          background:#fff;
          color:#111;
          cursor:pointer;
          font-weight:600;
        "
      >
        ON
      </button>

      <button
        id="__distort_reset"
        style="
          flex:1;
          border:1px solid rgba(255,255,255,.15);
          border-radius:8px;
          padding:9px;
          background:rgba(255,255,255,.06);
          color:#fff;
          cursor:pointer;
        "
      >
        Reset
      </button>

    </div>


    <div style="
      margin-top:11px;
      color:rgba(255,255,255,.4);
      font-size:10px;
      line-height:1.45;
    ">
      🖱️ 마우스 주변만 강하게 왜곡됩니다.<br>
      마우스를 읽고 싶은 부분으로 이동해 보세요.<br>
      ESC: 패널 숨기기 / 표시
    </div>

  `;

  const mouseStrength =
    panel.querySelector(
      "#__mouse_strength"
    );

  const mouseStrengthValue =
    panel.querySelector(
      "#__mouse_strength_value"
    );

  const radius =
    panel.querySelector(
      "#__radius"
    );

  const radiusValue =
    panel.querySelector(
      "#__radius_value"
    );

  const overall =
    panel.querySelector(
      "#__overall"
    );

  const overallValue =
    panel.querySelector(
      "#__overall_value"
    );

  const toggle =
    panel.querySelector(
      "#__distort_toggle"
    );

  const reset =
    panel.querySelector(
      "#__distort_reset"
    );

  const close =
    panel.querySelector(
      "#__distort_close"
    );

  // ============================================================
  // UI 이벤트
  // ============================================================

  mouseStrength.addEventListener(
    "input",
    () => {
      state.mouseStrength =
        Number(
          mouseStrength.value
        );

      mouseStrengthValue.textContent =
        state.mouseStrength;

      apply();
    }
  );

  radius.addEventListener(
    "input",
    () => {
      state.radius =
        Number(
          radius.value
        );

      radiusValue.textContent =
        state.radius;

      apply();
    }
  );

  overall.addEventListener(
    "input",
    () => {
      state.strength =
        Number(
          overall.value
        );

      overallValue.textContent =
        state.strength;

      apply();
    }
  );

  // ============================================================
  // 마우스
  // ============================================================

  let mouseTimer = null;

  function handleMouseMove(event) {
    state.mouseX =
      event.clientX;

    state.mouseY =
      event.clientY;

    state.mouseActive = true;

    /*
     * 마우스를 움직일 때마다
     * PNG를 만드는 것은 다소 무거울 수 있으므로
     * 최대 약 30fps 정도로 제한합니다.
     */
    if (mouseTimer !== null) {
      return;
    }

    mouseTimer =
      requestAnimationFrame(() => {
        mouseTimer = null;

        if (state.enabled) {
          apply();
        }
      });
  }

  document.addEventListener(
    "mousemove",
    handleMouseMove,
    {
      passive: true
    }
  );

  // ============================================================
  // ON/OFF
  // ============================================================

  toggle.addEventListener(
    "click",
    () => {
      state.enabled =
        !state.enabled;

      toggle.textContent =
        state.enabled
          ? "ON"
          : "OFF";

      toggle.style.opacity =
        state.enabled
          ? "1"
          : ".55";

      apply();
    }
  );

  // ============================================================
  // Reset
  // ============================================================

  reset.addEventListener(
    "click",
    () => {
      state.enabled = true;
      state.strength = 8;
      state.mouseStrength = 70;
      state.radius = 22;
      state.ambient = 0;

      mouseStrength.value =
        state.mouseStrength;

      radius.value =
        state.radius;

      overall.value =
        state.strength;

      mouseStrengthValue.textContent =
        state.mouseStrength;

      radiusValue.textContent =
        state.radius;

      overallValue.textContent =
        state.strength;

      toggle.textContent = "ON";
      toggle.style.opacity = "1";

      apply();
    }
  );

  // ============================================================
  // Panel 표시
  // ============================================================

  function hidePanel() {
    panel.style.display =
      "none";
  }

  function showPanel() {
    panel.style.display =
      "block";
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
      if (
        event.key === "Escape"
      ) {
        togglePanel();
      }
    }
  );

  // ============================================================
  // 제거
  // ============================================================

  function destroy() {
    document.body.style.filter =
      originalFilter;

    document.removeEventListener(
      "mousemove",
      handleMouseMove
    );

    if (mouseTimer !== null) {
      cancelAnimationFrame(
        mouseTimer
      );
    }

    svg.remove();
    panel.remove();

    delete window.__pageDistort;
  }

  // ============================================================
  // 전역 API
  // ============================================================

  window.__pageDistort = {
    state,
    apply,
    destroy,
    hidePanel,
    showPanel,
    togglePanel,
  };

  // ============================================================
  // 시작
  // ============================================================

  apply();
})();
