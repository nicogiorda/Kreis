import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./PixelBlast.css";

type PixelBlastVariant = "square" | "circle" | "triangle" | "diamond";

type PixelBlastProps = {
  variant?: PixelBlastVariant;
  pixelSize?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  antialias?: boolean;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleThickness?: number;
  rippleIntensityScale?: number;
  speed?: number;
  transparent?: boolean;
  edgeFade?: number;
};

const SHAPE_MAP: Record<PixelBlastVariant, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
};

const VERTEX_SHADER = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform float uEdgeFade;
uniform int uShapeType;

out vec4 fragColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.52;
  }

  return value;
}

float bayer4(vec2 p) {
  vec2 a = floor(mod(p, 4.0));
  int x = int(a.x);
  int y = int(a.y);

  int index = 0;
  if (y == 0) {
    if (x == 0) index = 0;
    else if (x == 1) index = 8;
    else if (x == 2) index = 2;
    else index = 10;
  } else if (y == 1) {
    if (x == 0) index = 12;
    else if (x == 1) index = 4;
    else if (x == 2) index = 14;
    else index = 6;
  } else if (y == 2) {
    if (x == 0) index = 3;
    else if (x == 1) index = 11;
    else if (x == 2) index = 1;
    else index = 9;
  } else {
    if (x == 0) index = 15;
    else if (x == 1) index = 7;
    else if (x == 2) index = 13;
    else index = 5;
  }

  return (float(index) + 0.5) / 16.0;
}

float circleMask(vec2 p, float coverage) {
  float radius = sqrt(coverage) * 0.48;
  float distanceFromCenter = length(p - 0.5);
  float feather = max(fwidth(distanceFromCenter), 0.001);
  return 1.0 - smoothstep(radius - feather, radius + feather, distanceFromCenter);
}

float triangleMask(vec2 p, vec2 id, float coverage) {
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  vec2 q = flip ? vec2(1.0 - p.x, p.y) : p;
  float size = sqrt(coverage);
  float edge = q.y - size * (1.0 - abs(q.x * 2.0 - 1.0));
  float feather = max(fwidth(edge), 0.001);
  return 1.0 - smoothstep(-feather, feather, edge);
}

float diamondMask(vec2 p, float coverage) {
  float radius = sqrt(coverage) * 0.68;
  float distanceFromCenter = abs(p.x - 0.5) + abs(p.y - 0.5);
  float feather = max(fwidth(distanceFromCenter), 0.001);
  return 1.0 - smoothstep(radius - feather, radius + feather, distanceFromCenter);
}

void main() {
  float pixelSize = max(uPixelSize, 1.0);
  vec2 centeredCoord = gl_FragCoord.xy - uResolution * 0.5;
  vec2 pixelId = floor(centeredCoord / pixelSize);
  vec2 pixelUv = fract(centeredCoord / pixelSize);
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  vec2 patternUv = pixelId * pixelSize / max(uResolution.y, 1.0);
  patternUv.x *= aspect;
  patternUv *= uScale;

  float drift = uTime * 0.08;
  float textureValue = fbm(patternUv + vec2(drift, -drift * 0.72));
  textureValue += 0.24 * sin(patternUv.x * 2.3 + uTime * 0.7);
  textureValue += 0.2 * cos(patternUv.y * 2.1 - uTime * 0.56);
  textureValue = textureValue * 0.5 + 0.28;

  float dither = bayer4(pixelId) - 0.5;
  float threshold = 0.78 - clamp(uDensity, 0.0, 2.0) * 0.22;
  float randomJitter = (hash12(pixelId) - 0.5) * uPixelJitter;
  float coverage = step(threshold, textureValue + dither * 0.2 + randomJitter);

  float shapeMask = coverage;
  if (uShapeType == 1) {
    shapeMask *= circleMask(pixelUv, coverage);
  } else if (uShapeType == 2) {
    shapeMask *= triangleMask(pixelUv, pixelId, coverage);
  } else if (uShapeType == 3) {
    shapeMask *= diamondMask(pixelUv, coverage);
  }

  if (uEdgeFade > 0.0) {
    vec2 normalized = gl_FragCoord.xy / uResolution;
    float edgeDistance = min(min(normalized.x, normalized.y), min(1.0 - normalized.x, 1.0 - normalized.y));
    shapeMask *= smoothstep(0.0, uEdgeFade, edgeDistance);
  }

  fragColor = vec4(uColor, shapeMask);
}
`;

export default function PixelBlast({
  variant = "square",
  pixelSize = 3,
  color = "#B497CF",
  className,
  style,
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  pixelSizeJitter = 0,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    if (transparent) renderer.setClearAlpha(0);
    else renderer.setClearColor(0xffffff, 1);

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uColor: { value: new THREE.Color(color) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uPixelSize: { value: pixelSize },
      uScale: { value: patternScale },
      uDensity: { value: patternDensity },
      uPixelJitter: { value: pixelSizeJitter },
      uEdgeFade: { value: edgeFade },
      uShapeType: { value: SHAPE_MAP[variant] ?? SHAPE_MAP.square }
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const setSize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
    };
    setSize();

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let animationFrame = 0;

    const animate = () => {
      uniforms.uTime.value = prefersReducedMotion ? 0 : clock.getElapsedTime() * speed;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      scene.remove(plane);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [antialias, color, edgeFade, patternDensity, patternScale, pixelSize, pixelSizeJitter, speed, transparent, variant]);

  return <div ref={containerRef} className={`pixel-blast-container ${className ?? ""}`} style={style} aria-hidden="true" />;
}
