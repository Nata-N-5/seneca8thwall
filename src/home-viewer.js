import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'

const canvas = document.getElementById('goat-viewer')
const openArButton = document.getElementById('open-ar')

openArButton.addEventListener('click', () => {
  window.location.href = './ar.html'
})

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
camera.position.set(0, 1.35, 4.2)

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
})
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.enableZoom = false
controls.target.set(0, 1, 0)

let isDragging = false

controls.addEventListener('start', () => {
  isDragging = true
})

controls.addEventListener('end', () => {
  isDragging = false
})

scene.add(new THREE.AmbientLight(0xffffff, 1.6))

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
keyLight.position.set(3, 5, 4)
scene.add(keyLight)

const fillLight = new THREE.HemisphereLight(0xffffff, 0x2f5a30, 1.4)
scene.add(fillLight)

const clock = new THREE.Clock()
let mixer = null
let goat = null

const fitModel = (object) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)
  const scale = 2.3 / maxSize

  object.scale.setScalar(scale)
  object.position.sub(center.multiplyScalar(scale))
  object.position.y += 1.2
}

const resize = () => {
  const {clientWidth, clientHeight} = canvas

  if (!clientWidth || !clientHeight) {
    return
  }

  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight, false)
}

new ResizeObserver(resize).observe(canvas)

new GLTFLoader().load('./goaat3.glb', (gltf) => {
  goat = gltf.scene
  fitModel(goat)
  scene.add(goat)

  const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase() === 'idle')

  if (idleClip) {
    mixer = new THREE.AnimationMixer(goat)
    mixer.clipAction(idleClip).play()
  }
})

const animate = () => {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  if (mixer) {
    mixer.update(delta)
  }

  if (goat && !isDragging) {
    goat.rotation.y += delta * 0.25
  }

  controls.update()
  renderer.render(scene, camera)
}

resize()
animate()
