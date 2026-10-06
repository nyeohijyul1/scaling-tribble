(async () => {
  // ============================================================
  // WebGL / GLSL Page Distortion
  // F12 Console에서 그대로 실행
  // ============================================================

  if (window.__glslPageDistort) {
    window.__glslPageDistort.destroy();
  }

  const W = innerWidth;
  const H = innerHeight;

  // ------------------------------------------------------------
  // 1. 현재 페이지를 SVG foreignObject로 캡처
  // ------------------------------------------------------------

  const clone = document.documentElement.cloneNode(true);

  // 실행 중인 UI / 기존 WebGL 등을 제거
  clone.querySelectorAll(
    'script, iframe, canvas, #__glslDistortUI, #__glslDistortCanvas'
  ).forEach(el => el.remove());

  // computed style 복사
  const originalElements = [
    document.documentElement,
    document.body,
    ...document.querySelectorAll('*')
  ];

  const clonedElements = [
    clone,
    clone.querySelector('body'),
    ...clone.querySelectorAll('*')
  ];

  for (let i = 0; i < Math.min(originalElements.length, clonedElements.length); i++) {
    const src = originalElements[i];
    const dst = clonedElements[i];

    if (!src || !dst) continue;

    try {
      const cs = getComputedStyle(src);

      let css = '';

      for (const prop of cs) {
        css += `${prop}:${cs.getPropertyValue(prop)};`;
      }

      dst.setAttribute('style', css);
    } catch {}
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         xmlns:xlink="http://www.w3.org/1999/xlink"
         width="${W}"
         height="${H}"
         viewBox="0 0 ${W} ${H}">
      <foreignObject width="100%" height="100%">
        ${new XMLSerializer().serializeToString(clone)}
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], {
    type: 'image/svg+xml;charset=utf-8'
  });

  const svgURL = URL.createObjectURL(svgBlob);

  const screenshot = new Image();

  await new Promise((resolve, reject) => {
    screenshot.onload = resolve;
    screenshot.onerror = reject;
    screenshot.src = svgURL;
  });

  URL.revokeObjectURL(svgURL);

  // ------------------------------------------------------------
  // 2. WebGL Canvas
  // ------------------------------------------------------------

  const canvas = document.createElement('canvas');

  canvas.id = '__glslDistortCanvas';

  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;

  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483646',
    pointerEvents: 'none'
  });

  document.documentElement.appendChild(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false
  });

  if (!gl) {
    canvas.remove();
    throw new Error('WebGL을 사용할 수 없습니다.');
  }

  // ------------------------------------------------------------
  // 3. Vertex Shader
  // ------------------------------------------------------------

  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_uv;

    varying vec2 v_uv;

    void main() {
      v_uv = a_uv;

      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // ------------------------------------------------------------
  // 4. Fragment Shader
  //
  // ★ 핵심
  // ★ 여기서 실제 왜곡을 계산합니다.
  // ------------------------------------------------------------

  const fragmentShaderSource = `
    precision highp float;

    uniform sampler2D u_texture;

    uniform vec2 u_mouse;
    uniform float u_radius;
    uniform float u_strength;
    uniform float u_time;
    uniform vec2 u_resolution;

    varying vec2 v_uv;

    void main() {

      // 화면 비율 보정
      vec2 aspect = vec2(
        u_resolution.x / u_resolution.y,
        1.0
      );

      vec2 p = (v_uv - u_mouse) * aspect;

      float dist = length(p);

      // 마우스 주변에서만 작동
      float falloff =
        1.0 - smoothstep(
          0.0,
          u_radius,
          dist
        );

      // 물결
      float wave =
        sin(
          dist * 45.0
          - u_time * 4.0
        );

      // 중심에서 바깥쪽으로 향하는 방향
      vec2 direction =
        dist > 0.0001
        ? normalize(p)
        : vec2(0.0);

      // 실제 UV 이동
      vec2 distortedUV =
        v_uv
        + direction
        * wave
        * falloff
        * u_strength;

      // 화면 밖으로 나가지 않도록
      distortedUV = clamp(
        distortedUV,
        0.0,
        1.0
      );

      gl_FragColor =
        texture2D(
          u_texture,
          distortedUV
        );
    }
  `;

  // ------------------------------------------------------------
  // 5. Shader compile
  // ------------------------------------------------------------

  function compileShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error);
    }

    return shader;
  }

  const vertexShader =
    compileShader(
      gl.VERTEX_SHADER,
      vertexShaderSource
    );

  const fragmentShader =
    compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  gl.useProgram(program);

  // ------------------------------------------------------------
  // 6. Fullscreen Quad
  // ------------------------------------------------------------

  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,

    -1,  1,
     1, -1,
     1,  1
  ]);

  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,

    0, 1,
    1, 0,
    1, 1
  ]);

  function createBuffer(data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      buffer
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      data,
      gl.STATIC_DRAW
    );

    return buffer;
  }

  const positionBuffer = createBuffer(positions);
  const uvBuffer = createBuffer(uvs);

  const positionLocation =
    gl.getAttribLocation(
      program,
      'a_position'
    );

  const uvLocation =
    gl.getAttribLocation(
      program,
      'a_uv'
    );

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    positionBuffer
  );

  gl.enableVertexAttribArray(positionLocation);

  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    uvBuffer
  );

  gl.enableVertexAttribArray(uvLocation);

  gl.vertexAttribPointer(
    uvLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );

  // ------------------------------------------------------------
  // 7. Screenshot → WebGL Texture
  // ------------------------------------------------------------

  const texture = gl.createTexture();

  gl.bindTexture(
    gl.TEXTURE_2D,
    texture
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
  );

  gl.pixelStorei(
    gl.UNPACK_FLIP_Y_WEBGL,
    true
  );

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    screenshot
  );

  // ------------------------------------------------------------
  // 8. Uniforms
  // ------------------------------------------------------------

  const mouseLocation =
    gl.getUniformLocation(
      program,
      'u_mouse'
    );

  const radiusLocation =
    gl.getUniformLocation(
      program,
      'u_radius'
    );

  const strengthLocation =
    gl.getUniformLocation(
      program,
      'u_strength'
    );

  const timeLocation =
    gl.getUniformLocation(
      program,
      'u_time'
    );

  const resolutionLocation =
    gl.getUniformLocation(
      program,
      'u_resolution'
    );

  gl.uniform1i(
    gl.getUniformLocation(
      program,
      'u_texture'
    ),
    0
  );

  gl.uniform2f(
    resolutionLocation,
    W,
    H
  );

  // ------------------------------------------------------------
  // 9. Mouse
  // ------------------------------------------------------------

  let mouseX = 0.5;
  let mouseY = 0.5;

  function onMouseMove(e) {
    mouseX = e.clientX / W;
    mouseY = 1.0 - e.clientY / H;
  }

  window.addEventListener(
    'mousemove',
    onMouseMove
  );

  // ------------------------------------------------------------
  // 10. UI
  // ------------------------------------------------------------

  const ui = document.createElement('div');

  ui.id = '__glslDistortUI';

  Object.assign(ui.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    background: 'rgba(20,20,20,.9)',
    color: '#fff',
    padding: '14px',
    borderRadius: '12px',
    font: '13px system-ui',
    width: '190px',
    boxShadow: '0 8px 30px rgba(0,0,0,.35)'
  });

  ui.innerHTML = `
    <div style="font-weight:700;margin-bottom:10px">
      WebGL / GLSL Distortion
    </div>

    <label>
      Radius
      <input id="glslRadius"
             type="range"
             min="0.05"
             max="0.8"
             step="0.01"
             value="0.25"
             style="width:100%">
    </label>

    <label>
      Strength
      <input id="glslStrength"
             type="range"
             min="0"
             max="0.08"
             step="0.001"
             value="0.025"
             style="width:100%">
    </label>

    <button id="glslToggle"
            style="margin-top:8px;width:100%">
      ON
    </button>

    <button id="glslDestroy"
            style="margin-top:5px;width:100%">
      CLOSE
    </button>
  `;

  document.body.appendChild(ui);

  const radiusInput =
    ui.querySelector('#glslRadius');

  const strengthInput =
    ui.querySelector('#glslStrength');

  const toggleButton =
    ui.querySelector('#glslToggle');

  const destroyButton =
    ui.querySelector('#glslDestroy');

  let enabled = true;

  toggleButton.onclick = () => {
    enabled = !enabled;
    toggleButton.textContent =
      enabled ? 'ON' : 'OFF';
  };

  // ------------------------------------------------------------
  // 11. Render Loop
  // ------------------------------------------------------------

  let animationFrame;

  function render(time) {

    if (enabled) {

      gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
      );

      gl.clear(
        gl.COLOR_BUFFER_BIT
      );

      gl.uniform2f(
        mouseLocation,
        mouseX,
        mouseY
      );

      gl.uniform1f(
        radiusLocation,
        Number(radiusInput.value)
      );

      gl.uniform1f(
        strengthLocation,
        Number(strengthInput.value)
      );

      gl.uniform1f(
        timeLocation,
        time * 0.001
      );

      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }

    animationFrame =
      requestAnimationFrame(render);
  }

  render(0);

  // ------------------------------------------------------------
  // 12. Cleanup
  // ------------------------------------------------------------

  window.__glslPageDistort = {

    destroy() {

      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        'mousemove',
        onMouseMove
      );

      canvas.remove();
      ui.remove();

      delete window.__glslPageDistort;
    }

  };

})();
