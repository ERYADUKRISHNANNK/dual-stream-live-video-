import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Mesh } from "three";

const PulseOrb: React.FC = () => {
  const ref = useRef<Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.35;
      ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.8) * 0.04);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.8, 64, 64]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#0ff"
        emissiveIntensity={0.9}
        roughness={0.2}
        metalness={0.8}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

interface GlobeSceneProps {
  className?: string;
}

const GlobeScene: React.FC<GlobeSceneProps> = ({ className }) => {
  return (
    <div className={className ?? "h-96 w-full rounded-3xl overflow-hidden bg-[#06030e]"}>
      <Canvas camera={{ position: [0, 0, 7], fov: 40 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <PulseOrb />
        <Stars radius={25} depth={10} count={1500} factor={4} saturation={0} fade speed={1} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default GlobeScene;
