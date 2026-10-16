/**
 * NEBULA HANDS - Interactive WebGL Particle System
 * Powered by Three.js & MediaPipe Hands
 */

// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const CONFIG = {
    particleCount: 2000,
    baseColor: new THREE.Color(0x00ffcc),
    interactionRadius: 15.0,
    repulsionRadius: 5.0,
    cameraZ: 20,
    shapes: ['Orb', 'Heart', 'Flower', 'Saturn']
};

const STATE = {
    handPosition: new THREE.Vector3(0, 0, 0),
    targetHandPosition: new THREE.Vector3(0, 0, 0),
    isPinching: false,
    shapeIndex: 0,
    pinchStrength: 0,
    time: 0,
    handDetected: false,
    lastFrameTime: performance.now(),
    frameCount: 0,
    fps: 60,
    useMouseFallback: false
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const dom = {
    container: document.getElementById('canvas-container'),
    video: document.getElementById('video-input'),
    shapeName: document.getElementById('shape-name'),
    shapeChips: document.querySelectorAll('.shape-chip'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    fpsCounter: document.getElementById('fps-counter'),
    pinchMeter: document.getElementById('pinch-meter'),
    colorDot: document.getElementById('color-dot'),
    camNotice: document.getElementById('cam-notice'),
    closeNoticeBtn: document.getElementById('close-notice')
};

// ==========================================
// 3. THREE.JS INITIALIZATION
// ==========================================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050a, 0.02);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.z = CONFIG.cameraZ;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
dom.container.appendChild(renderer.domElement);

// ==========================================
// 4. CUSTOM GLSL SHADERS
// ==========================================

const particleVertexShader = `
    uniform float uTime;
    uniform float uSize;
    attribute float aScale;
    attribute vec3 aVelocity;
    varying float vScale;

    void main() {
        vScale = aScale;
        vec3 pos = position;
        
        // Gentle organic idle oscillation
        pos.x += sin(uTime * 0.5 + pos.y * 0.5) * 0.2;
        pos.y += cos(uTime * 0.3 + pos.x * 0.5) * 0.2;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const particleFragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform vec3 uColor;
    uniform int uShape; // 0: Orb, 1: Heart, 2: Flower, 3: Saturn
    varying float vScale;

    // Helper: Circle SDF
    float circle(vec2 uv, float r) {
        return 1.0 - smoothstep(r - 0.05, r + 0.05, length(uv));
    }

    // Helper: Heart SDF
    float heart(vec2 uv) {
        uv.y = -uv.y; // Correct orientation
        uv.x *= 0.7;
        uv.y -= sqrt(abs(uv.x)) * 0.5;
        uv.y += 0.1;
        float r = length(uv);
        return 1.0 - smoothstep(0.4, 0.45, r);
    }

    // Helper: Flower SDF with 5 petals
    float flower(vec2 uv, float petals) {
        vec2 st = vec2(atan(uv.y, uv.x), length(uv));
        float f = abs(cos(st.x * petals)) * 0.3 + 0.2;
        return 1.0 - smoothstep(f, f + 0.02, st.y);
    }

    // Helper: Saturn SDF (planet body + celestial ring)
    float saturn(vec2 uv) {
        float body = circle(uv, 0.25);
        
        // Ring logic
        float d = length(vec2(uv.x, uv.y * 2.5));
        float ring = smoothstep(0.35, 0.4, d) * (1.0 - smoothstep(0.55, 0.6, d));
        
        // Occult back of the ring
        if (uv.y > 0.05 && abs(uv.x) < 0.25) {
            ring = 0.0;
        }
        
        return max(body, ring);
    }

    void main() {
        // Center uv from [-0.5, 0.5]
        vec2 uv = gl_PointCoord - 0.5;
        float alpha = 0.0;

        if (uShape == 0) {
            alpha = circle(uv, 0.4);
        } else if (uShape == 1) {
            alpha = heart(uv * 1.5);
        } else if (uShape == 2) {
            alpha = flower(uv, 5.0);
        } else if (uShape == 3) {
            alpha = saturn(uv * 1.2);
        }

        if (alpha < 0.01) discard;

        // Subtle luminescence based on individual particle scale
        vec3 finalColor = uColor + vScale * 0.25;
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// ==========================================
// 5. PARTICLE SYSTEM GENERATION
// ==========================================
const geometry = new THREE.BufferGeometry();
const positions = [];
const scales = [];
const velocities = [];

for (let i = 0; i < CONFIG.particleCount; i++) {
    // Initial cosmic volume distribution
    positions.push((Math.random() - 0.5) * 32);
    positions.push((Math.random() - 0.5) * 32);
    positions.push((Math.random() - 0.5) * 12);

    scales.push(Math.random() * 0.8 + 0.2);

    velocities.push((Math.random() - 0.5) * 0.2);
    velocities.push((Math.random() - 0.5) * 0.2);
    velocities.push((Math.random() - 0.5) * 0.2);
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
geometry.setAttribute('aVelocity', new THREE.Float32BufferAttribute(velocities, 3));

const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: CONFIG.baseColor },
        uSize: { value: 9.0 },
        uShape: { value: 0 }
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// ==========================================
// 6. SHAPE CYCLING & COLOR BURST
// ==========================================
function setShape(index) {
    STATE.shapeIndex = index % CONFIG.shapes.length;
    material.uniforms.uShape.value = STATE.shapeIndex;

    const shapeName = CONFIG.shapes[STATE.shapeIndex];
    if (dom.shapeName) dom.shapeName.innerText = shapeName;

    // Update active UI chips
    dom.shapeChips.forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.shape === shapeName);
    });

    // Random Hue Burst on switch
    const hue = Math.random();
    const newColor = new THREE.Color().setHSL(hue, 1.0, 0.6);
    material.uniforms.uColor.value = newColor;

    // Sync ambient bottom dot
    if (dom.colorDot) {
        const hex = '#' + newColor.getHexString();
        dom.colorDot.style.backgroundColor = hex;
        dom.colorDot.style.boxShadow = `0 0 12px ${hex}`;
    }
}

function cycleShape() {
    setShape(STATE.shapeIndex + 1);
}

// Allow direct clicking on shape chips
dom.shapeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
        const target = chip.dataset.shape;
        const index = CONFIG.shapes.indexOf(target);
        if (index !== -1) setShape(index);
    });
});

// ==========================================
// 7. MEDIAPIPE HAND TRACKING PIPELINE
// ==========================================
function onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        STATE.handDetected = true;
        const landmarks = results.multiHandLandmarks[0];

        // 1. World Coordinate Mapping
        // Landmark 8: Index finger tip | Landmark 4: Thumb tip
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Mirror X for natural camera feedback
        const x = (0.5 - indexTip.x) * 35;
        const y = (0.5 - indexTip.y) * 25;
        STATE.targetHandPosition.set(x, y, 0);

        // 2. Pinch Detection via Euclidean Distance
        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const pinchThreshold = 0.06;

        if (distance < pinchThreshold && !STATE.isPinching) {
            STATE.isPinching = true;
        } else if (distance >= pinchThreshold && STATE.isPinching) {
            STATE.isPinching = false;
            cycleShape();
        }

        // Pinch strength (0 to 1)
        STATE.pinchStrength = Math.max(0, Math.min(1, 1.0 - (distance / 0.15)));

        // Update Status HUD
        if (dom.statusDot) {
            dom.statusDot.className = 'status-dot active' + (STATE.isPinching ? ' pinch' : '');
        }
        if (dom.statusText) {
            dom.statusText.innerText = STATE.isPinching ? 'Pinching' : 'Tracking';
        }
    } else {
        // Hand left the camera frame
        if (STATE.handDetected) {
            STATE.handDetected = false;
            STATE.isPinching = false;
            STATE.pinchStrength = 0;
            if (dom.statusDot) dom.statusDot.className = 'status-dot';
            if (dom.statusText) dom.statusText.innerText = 'Searching';
        }
    }

    // Update Telemetry Meter
    if (dom.pinchMeter) {
        dom.pinchMeter.style.width = `${Math.round(STATE.pinchStrength * 100)}%`;
    }
}

// Initialize MediaPipe Hands
let hands = null;
let cameraUtils = null;

try {
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onHandResults);

    if (dom.video) {
        cameraUtils = new Camera(dom.video, {
            onFrame: async () => {
                if (hands && dom.video.readyState >= 2) {
                    await hands.send({ image: dom.video });
                }
            },
            width: 320,
            height: 240
        });

        cameraUtils.start().catch((err) => {
            console.warn('Webcam permission denied or unavailable, switching to mouse fallback mode.', err);
            enableMouseFallback();
        });
    }
} catch (e) {
    console.warn('MediaPipe initialization fallback:', e);
    enableMouseFallback();
}

// ==========================================
// 8. MOUSE & TOUCH FALLBACK
// ==========================================
function enableMouseFallback() {
    STATE.useMouseFallback = true;
    if (dom.statusText) dom.statusText.innerText = 'Mouse Mode';
    if (dom.statusDot) {
        dom.statusDot.className = 'status-dot active';
        dom.statusDot.style.backgroundColor = '#00d4ff';
    }
    if (dom.camNotice) dom.camNotice.classList.add('visible');
}

if (dom.closeNoticeBtn) {
    dom.closeNoticeBtn.addEventListener('click', () => {
        if (dom.camNotice) dom.camNotice.classList.remove('visible');
    });
}

window.addEventListener('mousemove', (e) => {
    // If no camera active, or user is moving mouse across screen
    const normX = (e.clientX / window.innerWidth - 0.5) * 35;
    const normY = -(e.clientY / window.innerHeight - 0.5) * 25;

    if (!STATE.handDetected) {
        STATE.targetHandPosition.set(normX, normY, 0);
    }
});

window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#ui') || e.target.closest('.webcam-card') || e.target.closest('.cam-notice')) return;
    STATE.isPinching = true;
    STATE.pinchStrength = 1.0;
    if (dom.pinchMeter) dom.pinchMeter.style.width = '100%';
    if (dom.statusDot) dom.statusDot.className = 'status-dot pinch';
    if (dom.statusText) dom.statusText.innerText = 'Pinching';
});

window.addEventListener('mouseup', (e) => {
    if (e.target.closest('#ui') || e.target.closest('.webcam-card') || e.target.closest('.cam-notice')) return;
    if (STATE.isPinching) {
        STATE.isPinching = false;
        STATE.pinchStrength = 0;
        if (dom.pinchMeter) dom.pinchMeter.style.width = '0%';
        if (dom.statusDot) dom.statusDot.className = 'status-dot active';
        if (dom.statusText) dom.statusText.innerText = STATE.handDetected ? 'Tracking' : 'Mouse Mode';
        cycleShape();
    }
});

// Touch event support for mobile / tablets
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const normX = (touch.clientX / window.innerWidth - 0.5) * 35;
        const normY = -(touch.clientY / window.innerHeight - 0.5) * 25;
        STATE.targetHandPosition.set(normX, normY, 0);
    }
}, { passive: true });

window.addEventListener('touchstart', (e) => {
    if (e.target.closest('#ui') || e.target.closest('.webcam-card') || e.target.closest('.cam-notice')) return;
    STATE.isPinching = true;
    STATE.pinchStrength = 1.0;
    if (dom.pinchMeter) dom.pinchMeter.style.width = '100%';
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (e.target.closest('#ui') || e.target.closest('.webcam-card') || e.target.closest('.cam-notice')) return;
    if (STATE.isPinching) {
        STATE.isPinching = false;
        STATE.pinchStrength = 0;
        if (dom.pinchMeter) dom.pinchMeter.style.width = '0%';
        cycleShape();
    }
}, { passive: true });

// Keyboard shortcut (Spacebar to toggle pinch & switch shape)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        STATE.isPinching = true;
        STATE.pinchStrength = 1.0;
        if (dom.pinchMeter) dom.pinchMeter.style.width = '100%';
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        STATE.isPinching = false;
        STATE.pinchStrength = 0;
        if (dom.pinchMeter) dom.pinchMeter.style.width = '0%';
        cycleShape();
    }
});

// ==========================================
// 9. ANIMATION & PHYSICS ENGINE
// ==========================================
const clock = new THREE.Clock();
const posAttribute = geometry.attributes.position;
const velAttribute = geometry.attributes.aVelocity;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    STATE.time += delta;
    material.uniforms.uTime.value = STATE.time;

    // Smooth hand lerp interpolation
    STATE.handPosition.lerp(STATE.targetHandPosition, 0.12);

    // Physics Simulation Loop
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const px = posAttribute.getX(i);
        const py = posAttribute.getY(i);
        const pz = posAttribute.getZ(i);

        let vx = velAttribute.getX(i);
        let vy = velAttribute.getY(i);
        let vz = velAttribute.getZ(i);

        // Vector: Hand to Particle
        const dx = STATE.handPosition.x - px;
        const dy = STATE.handPosition.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (STATE.isPinching) {
            // IMPLOSION: Strong gravitational pull toward hand focal point
            if (dist < CONFIG.interactionRadius) {
                vx += dx * 0.055;
                vy += dy * 0.055;
                vz += (0 - pz) * 0.055; // Pull toward focal z=0 plane
            }
        } else {
            // IDLE / EXPLOSION: Gentle Brownian float & repulsion
            vx += (Math.random() - 0.5) * 0.012;
            vy += (Math.random() - 0.5) * 0.012;

            if (dist < CONFIG.repulsionRadius) {
                // Soft kinetic deflection when waving through particle swarm
                vx -= dx * 0.025;
                vy -= dy * 0.025;
            }
        }

        // Velocity Damping (Frictional deceleration)
        vx *= 0.95;
        vy *= 0.95;
        vz *= 0.95;

        // Apply Position Updates
        posAttribute.setXYZ(i, px + vx, py + vy, pz + vz);
        velAttribute.setXYZ(i, vx, vy, vz);
    }

    posAttribute.needsUpdate = true;
    velAttribute.needsUpdate = true;

    // Cinematic subtle 3D orbital camera sway
    camera.position.x = Math.sin(STATE.time * 0.15) * 2.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // FPS Meter updates once every 30 frames
    STATE.frameCount++;
    const now = performance.now();
    if (now - STATE.lastFrameTime >= 500) {
        STATE.fps = Math.round((STATE.frameCount * 1000) / (now - STATE.lastFrameTime));
        if (dom.fpsCounter) dom.fpsCounter.innerText = `${STATE.fps} FPS`;
        STATE.frameCount = 0;
        STATE.lastFrameTime = now;
    }
}

// ==========================================
// 10. RESPONSIVE RESIZE LISTENER
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Start Animation Loop
animate();
