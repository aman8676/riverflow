"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import * as React from "react";
import * as THREE from "three";

const SEPARATION = 150;
const AMOUNTX = 40;
const AMOUNTY = 60;

export interface DottedSurfaceProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Base point size in pixels. */
  size?: number;
  /** Opacity of the points material. */
  opacity?: number;
  /** Shrink points with distance from the camera. */
  sizeAttenuation?: boolean;
  /** Fade points toward the horizon using per-vertex colors. */
  vertexColors?: boolean;
}

export function DottedSurface({
  size = 8,
  opacity = 0.8,
  sizeAttenuation = true,
  vertexColors = true,
  className,
  ...props
}: DottedSurfaceProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(theme === "dark" ? 0x000000 : 0xffffff, 0.0008);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      1,
      10000,
    );
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const count = AMOUNTX * AMOUNTY;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = theme === "dark" ? 1 : 0;

    let i = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i * 3] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
        colors[i * 3] = base;
        colors[i * 3 + 1] = base;
        colors[i * 3 + 2] = base;
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      sizeAttenuation,
      vertexColors,
      color: vertexColors ? 0xffffff : base ? 0xffffff : 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let animationId = 0;
    let frame = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttribute = geometry.attributes.position;
      const colorAttribute = geometry.attributes.color;
      const pos = positionAttribute.array as Float32Array;
      const col = colorAttribute.array as Float32Array;

      let index = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const wave =
            Math.sin((ix + frame) * 0.3) * 50 + Math.sin((iy + frame) * 0.5) * 50;
          pos[index * 3 + 1] = wave;

          if (vertexColors) {
            // Bright at the crest, dim in the trough.
            const intensity = (wave + 100) / 200;
            const shade = base === 1 ? 0.35 + intensity * 0.65 : 1 - intensity * 0.75;
            col[index * 3] = shade;
            col[index * 3 + 1] = shade;
            col[index * 3 + 2] = shade;
          }
          index++;
        }
      }

      positionAttribute.needsUpdate = true;
      if (vertexColors) colorAttribute.needsUpdate = true;

      renderer.render(scene, camera);
      frame += 0.1;
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, size, opacity, sizeAttenuation, vertexColors]);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden
      {...props}
    />
  );
}

export default DottedSurface;
