# ✨ NEBULA HANDS — Interactive WebGL Particle System

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.dot.js)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands_AI-orange?style=for-the-badge&logo=google)](https://developers.google.com/mediapipe)
[![WebGL](https://img.shields.io/badge/WebGL-GLSL_Shaders-red?style=for-the-badge&logo=webgl)](https://www.khronos.org/webgl/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> Control an interactive cosmic particle swarm using real-time hand gestures tracked through your webcam. Built with **Three.js**, **Google MediaPipe**, and custom **GLSL signed-distance field (SDF) shaders**.

---

## 🌌 Overview

**Nebula Hands** is a touchless, real-time creative coding web application. By leveraging computer vision and GPU hardware acceleration, users can command thousands of glowing particles in 3D space using natural hand gestures.

- **Open Hand**: Move through space to guide and softly deflect the particle swarm.
- **Pinch**: Create a high-gravity vortex, collapsing all particles into your hand.
- **Release**: Trigger a cosmic explosion, bursting into a vibrant new color spectrum and morphing into procedural shapes (**Orb**, **Heart**, **Flower**, **Saturn**).

---

## ⚡ Key Features

- 🖐️ **Real-Time Hand Landmark Tracking**: Powered by Google MediaPipe Hands (21 3D joint landmarks) with zero latency.
- 🎨 **Procedural GLSL Signed Distance Fields (SDFs)**: Shapes are rendered directly inside custom fragment shaders without external texture images.
- ⚛️ **High-Performance Physics Simulation**: GPU-accelerated simulation of 2,000+ particles with Newtonian attraction, Brownian noise, and kinematic damping.
- 🌈 **Dynamic HSL Color Bursts**: Generates harmonious random hues and luminescent intensity variations on every gesture trigger.
- 🎛️ **Cyberpunk Glassmorphic HUD**: Real-time telemetry displaying Pinch Force, FPS counter, active shape chips, and camera viewfinder.
- 🖱️ **Universal Dual-Input Support**: Seamless fallback to mouse dragging, click-to-implode, touch, and Spacebar controls if webcam is unavailable.
- 📦 **Zero-Build Architecture**: Pure Vanilla HTML5, CSS3, and JavaScript — no bundlers or complex build pipelines required.

---

## 🎮 Gestures & Controls

### 📹 Webcam Gesture Mode

| Gesture | Action | Visual Effect |
| :--- | :--- | :--- |
| **Open Hand (Moving)** | Move hand in front of camera | Particles smoothly drift toward hand position; gentle kinetic repulsion nearby |
| **Pinch (Thumb + Index)** | Bring thumb and index fingertips together | **Gravitational Implosion**: Particles accelerate rapidly toward the focal center |
| **Release Pinch** | Separate thumb and index finger | **Kinetic Burst & Mutation**: Particle explosion with random hue burst & shape switch |

### 🖱️ Mouse & Keyboard Fallback Mode

| Input | Action |
| :--- | :--- |
| **Mouse Move / Touch Drag** | Moves the focal attractor through 3D space |
| **Mouse Click & Hold / Touch & Hold** | Triggers gravitational pinch implosion |
| **Mouse Release / Touch End** | Releases implosion, bursts particles, and cycles shape |
| **Spacebar (Hold & Release)** | Keyboard shortcut to implode and cycle shapes |
| **Shape Chips (Top Right HUD)** | Click any shape button (`Orb`, `Heart`, `Flower`, `Saturn`) to switch instantly |

---

## 🔬 How It Works

```
                   +-----------------------+
                   |   Webcam Video Feed   |
                   +-----------+-----------+
                               |
                               v
               +-------------------------------+
               | Google MediaPipe Hands Model  |
               | (Landmark 8: Index / 4: Thumb)|
               +---------------+---------------+
                               |
            Normalized (0-1) to Three.js Coords (±35, ±25)
                               |
                               v
               +-------------------------------+
               |    Kinetic Physics Engine     |
               | - Distance calculation        |
               | - Lerp motion smoothing       |
               | - Gravitational acceleration  |
               | - Damping (friction: 0.95)    |
               +---------------+---------------+
                               |
                               v
               +-------------------------------+
               |    Custom GPU GLSL Shaders    |
               | - Vertex: Point scale & sway  |
               | - Fragment: Procedural SDFs   |
               |   (Orb / Heart / Flower/ Saturn)
               +---------------+---------------+
                               |
                               v
                     60 FPS WebGL Canvas
```

### 1. Mathematical Shape Rendering (GLSL Shaders)

All particle shapes are mathematically evaluated per-pixel on the GPU using Signed Distance Functions (SDFs):

- **Orb (`uShape = 0`)**: Radial Euclidean distance smoothed with `smoothstep`.
- **Heart (`uShape = 1`)**: Cardioid curve equation $y - \sqrt{|x|} \cdot 0.5$.
- **Flower (`uShape = 2`)**: Polar coordinate modulation $f = |\cos(\theta \cdot \text{petals})| \cdot 0.3 + 0.2$.
- **Saturn (`uShape = 3`)**: Spherical planetary body overlaid with an elliptical planar ring and back-occlusion masking.

---

## 📁 Project Structure

```text
HandGesture/
├── index.html       # Clean semantic HTML5 markup & HUD layout
├── style.css        # Cyberpunk glassmorphic design system & animations
├── script.js        # Three.js 3D scene, GLSL shaders, physics & MediaPipe AI
└── README.md        # Comprehensive documentation & setup guide
```

---

## 🚀 Getting Started

Because modern web browsers require a **secure origin (`localhost` or `HTTPS`)** to access the webcam via `navigator.mediaDevices.getUserMedia()`, run the project through a local server.

### Option 1: Python (Recommended)

Run directly in your terminal from the project folder:

```bash
# Python 3
python -m http.server 8080
```

Then open your browser at:
`http://localhost:8080/`

### Option 2: Node.js (via `npx`)

```bash
npx serve .
```

### Option 3: VS Code Live Server

1. Install the **Live Server** extension in VS Code.
2. Right-click on `index.html` and choose **"Open with Live Server"**.

---

## 🛠️ Configuration & Customization

You can easily adjust simulation parameters in [`script.js`](script.js) inside the `CONFIG` object:

```javascript
const CONFIG = {
    particleCount: 2000,           // Total number of simulated particles
    baseColor: new THREE.Color(0x00ffcc), // Initial neon cyan hue
    interactionRadius: 15.0,       // Gravitational pull reach (units)
    repulsionRadius: 5.0,          // Gentle repulsion bubble (units)
    cameraZ: 20,                   // 3D Perspective camera distance
    shapes: ['Orb', 'Heart', 'Flower', 'Saturn'] // Available procedural shapes
};
```

---

## 💻 Browser Compatibility

| Browser | Supported | Camera Acceleration | WebGL 2.0 |
| :--- | :---: | :---: | :---: |
| **Google Chrome** | ✅ Yes | Hardware Accelerated | ✅ |
| **Microsoft Edge** | ✅ Yes | Hardware Accelerated | ✅ |
| **Mozilla Firefox**| ✅ Yes | Supported | ✅ |
| **Apple Safari**   | ✅ Yes (v14+) | Supported | ✅ |
| **Mobile Chrome / Safari** | ✅ Yes | Touch fallback supported | ✅ |

> **Privacy Note**: All camera processing is performed 100% locally on your machine via WebAssembly and WebGL. No video feed or biometric data is ever sent to any remote server.

---

## 📜 License

This project is licensed under the **MIT License** — you are free to modify, distribute, and use it in your personal and commercial projects.
