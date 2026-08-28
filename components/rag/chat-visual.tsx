"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform vec2 uMouse;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying float vNoise;

  // Ashima 3D simplex noise (webgl-noise)
  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p){
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      total += snoise(p) * amp;
      p *= 2.02;
      amp *= 0.5;
    }
    return total;
  }

  vec3 displace(vec3 pos, vec3 nrm){
    float n = fbm(pos * 1.6 + vec3(0.0, 0.0, uTime * 0.35));
    float mouseBoost = 1.0 + length(uMouse) * 0.6;
    return pos + nrm * n * uAmplitude * mouseBoost;
  }

  void main(){
    vec3 displaced = displace(position, normal);

    vec3 tangent = normalize(abs(normal.y) < 0.99 ? cross(normal, vec3(0.0,1.0,0.0)) : cross(normal, vec3(1.0,0.0,0.0)));
    vec3 bitangent = normalize(cross(normal, tangent));
    float eps = 0.02;
    vec3 dispTangent = displace(position + tangent * eps, normal);
    vec3 dispBitangent = displace(position + bitangent * eps, normal);
    vec3 newNormal = normalize(cross(dispTangent - displaced, dispBitangent - displaced));

    vNormal = normalize(normalMatrix * newNormal);
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPos = -mvPosition.xyz;
    vNoise = fbm(position * 1.6 + vec3(0.0, 0.0, uTime * 0.35));

    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying float vNoise;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorRim;

  void main(){
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPos);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);

    vec3 base = mix(uColorA, uColorB, clamp(vNoise * 0.5 + 0.5, 0.0, 1.0));

    vec3 lightDir = normalize(vec3(0.5, 0.6, 0.9));
    float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 24.0);

    vec3 color = base + uColorRim * fresnel * 1.4 + vec3(1.0) * spec * 0.8;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function ChatVisual() {
  const mountRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = Math.max(mount.clientWidth, 1)
    const height = Math.max(mount.clientHeight, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(0, 0, 5.6)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.domElement.style.filter =
      "drop-shadow(0 0 45px rgba(193,77,255,0.45)) drop-shadow(0 0 90px rgba(122,60,255,0.25))"
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const geometry = new THREE.IcosahedronGeometry(1.6, 48)
    const uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: 0.22 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color(0x1c0e30) },
      uColorB: { value: new THREE.Color(0x5a1f8a) },
      uColorRim: { value: new THREE.Color(0xd77bff) },
    }
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    })
    const blob = new THREE.Mesh(geometry, material)
    group.add(blob)

    const glintGeometry = new THREE.BufferGeometry()
    const glintCount = 160
    const positions = new Float32Array(glintCount * 3)
    for (let i = 0; i < glintCount; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 2.0 + Math.random() * 1.1
      const height2 = (Math.random() - 0.5) * 2.2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height2
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    glintGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const glintMaterial = new THREE.PointsMaterial({
      color: 0xf3d8ff,
      size: 0.022,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    })
    const glints = new THREE.Points(glintGeometry, glintMaterial)
    group.add(glints)

    let frame = 0
    let autoAngle = 0
    const targetRot = { x: 0, y: 0 }
    const currentRot = { x: 0, y: 0 }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const handlePointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      const ny = (event.clientY - rect.top) / rect.height - 0.5
      pointerRef.current = { x: nx, y: ny }
      targetRot.y = nx * 0.9
      targetRot.x = ny * 0.6
      uniforms.uMouse.value.set(nx, ny)
    }

    const handlePointerLeave = () => {
      targetRot.x = 0
      targetRot.y = 0
      pointerRef.current = { x: 0, y: 0 }
      uniforms.uMouse.value.set(0, 0)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("blur", handlePointerLeave)

    const timer = new THREE.Timer()

    const animate = () => {
      timer.update()
      const dt = reducedMotion ? 0.002 : timer.getDelta()
      uniforms.uTime.value += dt
      autoAngle += reducedMotion ? 0.0003 : 0.0018

      currentRot.x += (targetRot.x - currentRot.x) * 0.04
      currentRot.y += (targetRot.y - currentRot.y) * 0.04

      group.rotation.x = currentRot.x + Math.sin(autoAngle * 0.6) * 0.06
      group.rotation.y = autoAngle + currentRot.y

      glints.rotation.y += reducedMotion ? 0.0002 : 0.0012

      camera.position.x += (pointerRef.current.x * 0.5 - camera.position.x) * 0.03
      camera.position.y += (-pointerRef.current.y * 0.35 - camera.position.y) * 0.03
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.max(mount.clientWidth, 1)
      const nextHeight = Math.max(mount.clientHeight, 1)
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
    })
    resizeObserver.observe(mount)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("blur", handlePointerLeave)
      geometry.dispose()
      material.dispose()
      glintGeometry.dispose()
      glintMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
}
