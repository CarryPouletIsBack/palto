import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

// Composant pour charger le modèle OBJ
const HumanBodyModelOBJ = ({ modelPath }: { modelPath: string }) => {
  const [obj, setObj] = useState<THREE.Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const meshRef = useRef<THREE.Group>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const loader = new OBJLoader()
    loader.load(
      modelPath,
      (object) => {
        // Calculer la bounding box pour centrer
        const box = new THREE.Box3().setFromObject(object)
        const center = box.getCenter(new THREE.Vector3())
        
        // Convertir le modèle en nuage de points SANS appliquer de scale
        const points: THREE.Vector3[] = []
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry
            const position = geometry.attributes.position
            const matrix = child.matrixWorld
            
            if (position) {
              for (let i = 0; i < position.count; i++) {
                const vertex = new THREE.Vector3()
                vertex.fromBufferAttribute(position, i)
                vertex.applyMatrix4(matrix)
                // Centrer les points (soustraire le centre)
                vertex.sub(center)
                points.push(vertex)
              }
            }
          }
        })
        
        // Créer une géométrie de points avec la taille originale
        const pointsGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(points.length * 3)
        points.forEach((point, i) => {
          positions[i * 3] = point.x
          positions[i * 3 + 1] = point.y
          positions[i * 3 + 2] = point.z
        })
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        
        // Créer un groupe avec les points
        const pointsGroup = new THREE.Group()
        const pointsMaterial = new THREE.PointsMaterial({
          color: '#ffffff',
          size: 0.02,
          transparent: true,
          opacity: 0.8,
          sizeAttenuation: true
        })
        const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial)
        pointsGroup.add(pointsMesh)
        
        setObj(pointsGroup)
        setLoading(false)
      },
      () => {
        // Progress callback (non utilisé)
      },
      (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load model'
        setError(errorMessage)
        setLoading(false)
      }
    )
  }, [modelPath])

  if (loading) {
    return (
      <group position={[0, 1.5, 0]}>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.5, 0.6, 0.25]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[-0.35, 1.0, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0.35, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[-0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
      </group>
    )
  }

  if (error) {
    // Afficher un modèle de base même en cas d'erreur
    return (
      <group position={[0, 1.5, 0]}>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.5, 0.6, 0.25]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
        <mesh position={[-0.35, 1.0, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
        <mesh position={[0.35, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
        <mesh position={[-0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
        <mesh position={[0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#f1582a" opacity={0.5} transparent />
        </mesh>
      </group>
    )
  }

  if (!obj) {
    // Afficher un modèle de base si aucun modèle n'est chargé
    return (
      <group position={[0, 1.5, 0]}>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.5, 0.6, 0.25]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[-0.35, 1.0, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0.35, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[-0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
        <mesh position={[0.15, 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={meshRef} position={[0, 1.5, 0]}>
      <primitive 
        object={obj} 
      />
    </group>
  )
}

// Composant principal - charge uniquement le FinalBaseMesh
const HumanBodyModel = ({ modelPath }: { modelPath: string }) => {
  return <HumanBodyModelOBJ modelPath={modelPath} />
}

const HumanBody3D = () => {
  // Chemin vers le FinalBaseMesh.obj
  const modelPath = '/models/FinalBaseMesh.obj'

  return (
    <div className="human-body-3d-container">
      <Canvas
        camera={{ position: [0, 0, 22], fov: 65 }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#f1582a" />
          </mesh>
        }>
          <HumanBodyModel modelPath={modelPath} />
        </Suspense>
        {/* Éclairage */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f1582a" />
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
          autoRotate
          autoRotateSpeed={1}
        />
      </Canvas>
    </div>
  )
}

export default HumanBody3D

