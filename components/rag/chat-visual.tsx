"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const vertexShader = `
uniform float uTime;
uniform vec2 uPointer;
varying vec3 vNormal;
varying vec3 vPosition;

float wave(vec3 p) {
  float a = sin(p.x * 2.4 + uTime * 0.8);
  float b = sin(p.y * 3.1 - uTime * 0.6);
  float c = sin(p.z * 2.7 + uTime * 0.45);
  return (a + b + c) / 3.0;
}

void main() {
  vec3 noisePosition = normal + position * 0.35 + vec3(uPointer * 0.45, uTime * 0.22);
  float displacement = wave(noisePosition) * 0.15;
  float jellyPull = dot(normal.xy, uPointer) * 0.12;
  displacement += jellyPull + sin(position.x * 5.0 + position.y * 3.0 + uTime) * 0.035;
  vec3 displaced = position + normal * displacement;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`

const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRim;

void main() {
  vec3 viewDirection = normalize(-vPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDirection), 0.0), 2.2);
  float light = max(dot(normalize(vNormal), normalize(vec3(0.4, 0.7, 1.0))), 0.0);
  vec3 color = mix(uColorA, uColorB, light * 0.8 + fresnel * 0.35);
  color += uRim * fresnel * 0.85;
  gl_FragColor = vec4(color, 0.92);
}
`

export function ChatVisual() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = Math.max(mount.clientWidth, 1)
    const height = Math.max(mount.clientHeight, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.z = 5.4

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uColorA: { value: new THREE.Color(0x10152c) },
      uColorB: { value: new THREE.Color(0x3156a4) },
      uRim: { value: new THREE.Color(0x6ee7d8) },
    }
    const geometry = new THREE.IcosahedronGeometry(1.55, 32)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    const blob = new THREE.Mesh(geometry, material)
    scene.add(blob)

    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(96 * 3)
    for (let i = 0; i < 96; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 2.0 + Math.random() * 1.25
      particlePositions[i * 3] = Math.cos(angle) * radius
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2.8
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x9ee7e1,
      size: 0.025,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    const pointer = new THREE.Vector2()
    const targetRotation = new THREE.Vector2()
    const currentRotation = new THREE.Vector2()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0
    let time = 0

    const handlePointerMove = (event: PointerEvent) => {
      pointer.set(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5)
      targetRotation.set(pointer.y * 0.25, pointer.x * 0.45)
      uniforms.uPointer.value.copy(pointer)
    }
    const handlePointerLeave = () => {
      targetRotation.set(0, 0)
      uniforms.uPointer.value.set(0, 0)
    }
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("blur", handlePointerLeave)

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(mount.clientWidth, 1)
      const nextHeight = Math.max(mount.clientHeight, 1)
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
    })
    resizeObserver.observe(mount)

    const animate = () => {
      time += reducedMotion ? 0.002 : 0.012
      uniforms.uTime.value = time
      currentRotation.lerp(targetRotation, 0.035)
      blob.rotation.x = currentRotation.x + Math.sin(time * 0.35) * 0.04
      blob.rotation.y += reducedMotion ? 0.0003 : 0.002
      particles.rotation.y += reducedMotion ? 0.0002 : 0.001
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("blur", handlePointerLeave)
      geometry.dispose()
      material.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70" />
}
