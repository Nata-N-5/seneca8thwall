// Define an 8th Wall XR Camera Pipeline Module that adds a model to a threejs scene on startup.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import goatModel from './assets/goaat3.glb?url'

export const initScenePipelineModule = () => {
  const clock = new THREE.Clock()
  const minGoatScale = 0.25
  const maxGoatScale = 4
  let goatMixer = null
  let goatModelObject = null
  let idleAction = null
  let waveAction = null
  let waveButton = null
  let pinchStartDistance = 0
  let pinchStartScale = 1

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY

    return Math.hypot(dx, dy)
  }

  const setGoatScale = (scale) => {
    if (!goatModelObject) {
      return
    }

    const nextScale = THREE.MathUtils.clamp(scale, minGoatScale, maxGoatScale)
    goatModelObject.scale.setScalar(nextScale)
  }

  const playIdle = () => {
    if (!idleAction) {
      return
    }

    idleAction.reset()
    idleAction.fadeIn(0.2)
    idleAction.play()
  }

  const playWave = () => {
    if (!idleAction || !waveAction) {
      return
    }

    if (waveButton) {
      waveButton.disabled = true
    }

    idleAction.fadeOut(0.15)
    waveAction.reset()
    waveAction.setLoop(THREE.LoopOnce, 1)
    waveAction.clampWhenFinished = false
    waveAction.fadeIn(0.15)
    waveAction.play()
  }

  // Populates the goat model into an XR scene and sets the initial camera position.
  const initXrScene = ({scene, camera, renderer}) => {
    // Enable shadows in the renderer.
    renderer.shadowMap.enabled = true
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // Add some light to the scene.
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
    scene.add(ambientLight)

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.2)
    scene.add(hemisphereLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
    directionalLight.position.set(5, 10, 7)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const loader = new GLTFLoader()
    loader.load(goatModel, (gltf) => {
      const goat = gltf.scene
      goatModelObject = goat

      goat.position.set(0, 0, 0)
      goat.scale.setScalar(1)
      goat.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = false

          if (child.material) {
            child.material.side = THREE.DoubleSide
          }
        }
      })

      if (gltf.animations.length) {
        goatMixer = new THREE.AnimationMixer(goat)
        const clipsByName = Object.fromEntries(
          gltf.animations.map((clip) => [clip.name.toLowerCase(), clip])
        )
        const idleClip = clipsByName.idle
        const waveClip = clipsByName.wave || clipsByName.saludar

        if (idleClip) {
          idleAction = goatMixer.clipAction(idleClip)
          playIdle()
        }

        if (waveClip) {
          waveAction = goatMixer.clipAction(waveClip)
          waveAction.enabled = true

          goatMixer.addEventListener('finished', (event) => {
            if (event.action !== waveAction) {
              return
            }

            waveAction.fadeOut(0.1)
            playIdle()

            if (waveButton) {
              waveButton.disabled = false
            }
          })

          if (waveButton) {
            waveButton.disabled = false
          }
        }
      }

      scene.add(goat)
    })

    // Add a plane that can receive shadows.
    const planeGeometry = new THREE.PlaneGeometry(2000, 2000)
    planeGeometry.rotateX(-Math.PI / 2)

    const planeMaterial = new THREE.ShadowMaterial()
    planeMaterial.opacity = 0.67

    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.receiveShadow = true
    scene.add(plane)

    // Set the initial camera position relative to the scene we just laid out. This must be at a
    // height greater than y=0.
    camera.position.set(0, 2, 2)
  }

  // Return a camera pipeline module that adds scene elements on start.
  return {
    // Camera pipeline modules need a name. It can be whatever you want but must be unique within
    // your app.
    name: 'threejsinitscene',
    onUpdate: () => {
      if (goatMixer) {
        goatMixer.update(clock.getDelta())
      }
    },

    // onStart is called once when the camera feed begins. In this case, we need to wait for the
    // XR8.Threejs scene to be ready before we can access it to add content. It was created in
    // XR8.Threejs.pipelineModule()'s onStart method.
    onStart: ({canvas}) => {
      const {scene, camera, renderer} = XR8.Threejs.xrScene()  // Get the 3js scene from XR8.Threejs
      waveButton = document.getElementById('wave-button')

      if (waveButton) {
        waveButton.addEventListener('click', playWave)
      }

      initXrScene({scene, camera, renderer})  // Add objects set the starting camera position.

      // Scale the goat with a two-finger pinch.
      canvas.addEventListener(
        'touchstart',
        (event) => {
          if (event.touches.length === 2 && goatModelObject) {
            pinchStartDistance = getTouchDistance(event.touches)
            pinchStartScale = goatModelObject.scale.x
          }
        },
        true
      )

      canvas.addEventListener(
        'touchmove',
        (event) => {
          event.preventDefault()

          if (event.touches.length === 2 && goatModelObject && pinchStartDistance > 0) {
            const currentDistance = getTouchDistance(event.touches)
            setGoatScale(pinchStartScale * (currentDistance / pinchStartDistance))
          }
        },
        {passive: false}
      )

      canvas.addEventListener('touchend', () => {
        pinchStartDistance = 0
      })

      // Sync the xr controller's 6DoF position and camera paremeters with our scene.
      XR8.XrController.updateCameraProjectionMatrix(
        {origin: camera.position, facing: camera.quaternion}
      )

      // Recenter content when the canvas is tapped.
      canvas.addEventListener(
        'touchstart', (e) => {
          e.touches.length === 1 && XR8.XrController.recenter()
        }, true
      )
    },
  }
}
