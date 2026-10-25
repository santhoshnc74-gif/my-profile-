// Original 3D Drivable Car with steering wheels, lights, and responsive physics
import * as THREE from 'three';
import { resolveCollision } from './collision';
import { sound } from './audio';

export interface CarControls {
  forward: boolean;
  reverse: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export class CarVehicle {
  public group: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.16, 0);
  public angle: number = -Math.PI / 2; // Facing south toward camera
  public speed: number = 0;
  public steerAngle: number = 0;

  // Body group for suspension pitch and roll
  private bodyGroup: THREE.Group;

  // Front wheel pivots for realistic steering visuals
  private frontLeftPivot: THREE.Group;
  private frontRightPivot: THREE.Group;
  private frontLeftWheelMesh: THREE.Mesh;
  private frontRightWheelMesh: THREE.Mesh;
  private rearLeftWheelMesh: THREE.Mesh;
  private rearRightWheelMesh: THREE.Mesh;

  // Brake lights material to glow bright red when braking
  private brakeLightMaterial: THREE.MeshStandardMaterial;
  private bodyMaterial: THREE.MeshStandardMaterial;

  // Headlight spot/point light
  private headlightGlow: THREE.PointLight;

  // Ground contact shadow
  private shadowMesh: THREE.Mesh;

  // Vehicle dynamics constants
  private readonly ACCELERATION = 14.0;
  private readonly MAX_SPEED = 7.5;
  private readonly MAX_REVERSE = -3.8;
  private readonly BRAKE_POWER = 24.0;
  private readonly FRICTION = 4.8;
  private readonly STEER_SPEED = 5.2;
  private readonly MAX_STEER = 0.52;
  private readonly WHEELBASE = 0.95;

  // Suspension smoothing
  private currentPitch = 0;
  private currentRoll = 0;

  constructor(carColor: string = '#166069') {
    this.group = new THREE.Group();
    this.group.castShadow = true;
    this.group.receiveShadow = true;

    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Body Material - rich satin automotive finish
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(carColor),
      roughness: 0.28,
      metalness: 0.45,
    });

    // Glass / Cabin Material
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#102224'),
      roughness: 0.12,
      metalness: 0.88,
    });

    // Chrome Trim Material
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dbe5e5'),
      roughness: 0.2,
      metalness: 0.85,
    });

    // Tire Material
    const tireMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#202426'),
      roughness: 0.8,
      metalness: 0.1,
    });

    // Wheel Rim Material
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e0ebeb'),
      roughness: 0.25,
      metalness: 0.8,
    });

    // Headlight Material
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8ffff'),
      emissive: new THREE.Color('#8ce4e4'),
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    // Brake Light Material
    this.brakeLightMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ff3b3b'),
      emissive: new THREE.Color('#b31b1b'),
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });

    // 0. Soft Contact Shadow Blob underneath car
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(20, 25, 25, 0.45)');
      grad.addColorStop(0.6, 'rgba(20, 25, 25, 0.2)');
      grad.addColorStop(1, 'rgba(20, 25, 25, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(1.6, 2.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.y = 0.01;
    this.group.add(this.shadowMesh);

    // 1. Lower Chassis Base (Rounded / Contoured)
    const chassisGeo = new THREE.BoxGeometry(0.85, 0.22, 1.45);
    const chassis = new THREE.Mesh(chassisGeo, this.bodyMaterial);
    chassis.position.y = 0.14;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.bodyGroup.add(chassis);

    // Front Hood Slope / Nose Cone
    const noseGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.25, 16);
    noseGeo.rotateZ(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, this.bodyMaterial);
    nose.position.set(0, 0.18, 0.6);
    nose.scale.set(0.4, 0.95, 0.7);
    nose.castShadow = true;
    this.bodyGroup.add(nose);

    // Front Bumper / Splitter
    const bumperGeo = new THREE.BoxGeometry(0.82, 0.08, 0.18);
    const bumper = new THREE.Mesh(bumperGeo, chromeMaterial);
    bumper.position.set(0, 0.08, 0.76);
    bumper.castShadow = true;
    this.bodyGroup.add(bumper);

    // Side Sills
    const sillGeo = new THREE.BoxGeometry(0.04, 0.06, 0.85);
    const leftSill = new THREE.Mesh(sillGeo, chromeMaterial);
    leftSill.position.set(-0.43, 0.08, 0);
    this.bodyGroup.add(leftSill);

    const rightSill = new THREE.Mesh(sillGeo, chromeMaterial);
    rightSill.position.set(0.43, 0.08, 0);
    this.bodyGroup.add(rightSill);

    // 2. Cockpit / Cabin
    const cabinGeo = new THREE.BoxGeometry(0.72, 0.28, 0.8);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.36, -0.05);
    cabin.castShadow = true;
    this.bodyGroup.add(cabin);

    // Cabin Roof Panel (body color)
    const roofGeo = new THREE.BoxGeometry(0.68, 0.04, 0.65);
    const roof = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roof.position.set(0, 0.51, -0.05);
    roof.castShadow = true;
    this.bodyGroup.add(roof);

    // 3. Headlights (front facing +Z)
    const headlightGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
    headlightGeo.rotateX(Math.PI / 2);

    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    leftHeadlight.position.set(-0.28, 0.18, 0.74);
    this.bodyGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
    rightHeadlight.position.set(0.28, 0.18, 0.74);
    this.bodyGroup.add(rightHeadlight);

    // Soft forward light casting from headlights
    this.headlightGlow = new THREE.PointLight('#a2f5f5', 0.9, 3.5);
    this.headlightGlow.position.set(0, 0.2, 0.9);
    this.bodyGroup.add(this.headlightGlow);

    // 4. Tail / Brake Lights (rear facing -Z)
    const tailLightGeo = new THREE.BoxGeometry(0.22, 0.06, 0.04);
    const leftTail = new THREE.Mesh(tailLightGeo, this.brakeLightMaterial);
    leftTail.position.set(-0.28, 0.18, -0.74);
    this.bodyGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailLightGeo, this.brakeLightMaterial);
    rightTail.position.set(0.28, 0.18, -0.74);
    this.bodyGroup.add(rightTail);

    // Rear mini spoiler lip
    const spoilerGeo = new THREE.BoxGeometry(0.78, 0.03, 0.1);
    const spoiler = new THREE.Mesh(spoilerGeo, chromeMaterial);
    spoiler.position.set(0, 0.27, -0.72);
    this.bodyGroup.add(spoiler);

    // Dual Chrome Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12);
    exhaustGeo.rotateX(Math.PI / 2);
    const leftExhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
    leftExhaust.position.set(-0.16, 0.07, -0.76);
    this.bodyGroup.add(leftExhaust);

    const rightExhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
    rightExhaust.position.set(0.16, 0.07, -0.76);
    this.bodyGroup.add(rightExhaust);

    // 5. Wheels Creation Helper with treaded tires and 5-spoke rims
    const createWheel = () => {
      const wheelGroup = new THREE.Group();
      const tireGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 18);
      tireGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMaterial);
      tire.castShadow = true;

      const rimGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.125, 12);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMaterial);

      const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.13, 8);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, chromeMaterial);

      wheelGroup.add(tire);
      wheelGroup.add(rim);
      wheelGroup.add(hub);
      return { group: wheelGroup, mesh: tire };
    };

    // Front Left Wheel & Steering Pivot
    this.frontLeftPivot = new THREE.Group();
    this.frontLeftPivot.position.set(-0.46, 0.12, 0.48);
    const flw = createWheel();
    this.frontLeftWheelMesh = flw.mesh;
    this.frontLeftPivot.add(flw.group);
    this.group.add(this.frontLeftPivot);

    // Front Right Wheel & Steering Pivot
    this.frontRightPivot = new THREE.Group();
    this.frontRightPivot.position.set(0.46, 0.12, 0.48);
    const frw = createWheel();
    this.frontRightWheelMesh = frw.mesh;
    this.frontRightPivot.add(frw.group);
    this.group.add(this.frontRightPivot);

    // Rear Left Wheel
    const rlw = createWheel();
    this.rearLeftWheelMesh = rlw.mesh;
    rlw.group.position.set(-0.46, 0.12, -0.48);
    this.group.add(rlw.group);

    // Rear Right Wheel
    const rrw = createWheel();
    this.rearRightWheelMesh = rrw.mesh;
    rrw.group.position.set(0.46, 0.12, -0.48);
    this.group.add(rrw.group);

    this.reset();
  }

  public setCarColor(hexColor: string) {
    if (/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
      this.bodyMaterial.color.set(hexColor);
    }
  }

  public reset(x: number = 0, z: number = 0) {
    this.position.set(x, 0.08, z);
    this.angle = -Math.PI / 2; // Face south toward camera
    this.speed = 0;
    this.steerAngle = 0;
    this.currentPitch = 0;
    this.currentRoll = 0;
    this.updateTransform();
  }

  public update(dt: number, controls: CarControls): { hit: boolean } {
    // 1. Steering input with smooth interpolation
    if (controls.left) {
      this.steerAngle = Math.min(this.MAX_STEER, this.steerAngle + this.STEER_SPEED * dt);
    } else if (controls.right) {
      this.steerAngle = Math.max(-this.MAX_STEER, this.steerAngle - this.STEER_SPEED * dt);
    } else {
      // Smooth return to center
      if (this.steerAngle > 0) {
        this.steerAngle = Math.max(0, this.steerAngle - this.STEER_SPEED * 1.6 * dt);
      } else if (this.steerAngle < 0) {
        this.steerAngle = Math.min(0, this.steerAngle + this.STEER_SPEED * 1.6 * dt);
      }
    }

    // Apply steering angle to front wheel pivots
    this.frontLeftPivot.rotation.y = this.steerAngle;
    this.frontRightPivot.rotation.y = this.steerAngle;

    // 2. Acceleration and Braking
    const isBraking = controls.brake;
    if (isBraking) {
      this.brakeLightMaterial.emissiveIntensity = 2.2;
      this.brakeLightMaterial.color.set('#ff1a1a');
      sound.playBrake();

      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.BRAKE_POWER * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.BRAKE_POWER * dt);
      }
    } else {
      this.brakeLightMaterial.emissiveIntensity = 0.4;
      this.brakeLightMaterial.color.set('#b31b1b');

      if (controls.forward) {
        this.speed = Math.min(this.MAX_SPEED, this.speed + this.ACCELERATION * dt);
      } else if (controls.reverse) {
        this.speed = Math.max(this.MAX_REVERSE, this.speed - this.ACCELERATION * 0.75 * dt);
      } else {
        // Natural friction coasting
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.FRICTION * dt);
        } else if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + this.FRICTION * dt);
        }
      }
    }

    // Audio update
    sound.updateCar(this.speed / this.MAX_SPEED, controls.forward || controls.reverse);

    // 3. Angular velocity / Turning based on signed speed and steer angle (Kinematic bicycle model)
    // When speed > 0, positive steerAngle turns counterclockwise.
    // When speed < 0 (reverse), steering left swings rear left, so heading turns opposite!
    if (Math.abs(this.speed) > 0.05) {
      const turnRate = (this.speed / this.WHEELBASE) * Math.sin(this.steerAngle);
      this.angle += turnRate * dt;
    }

    // 4. Position update along forward direction vector
    // Heading in world space: X = sin(angle), Z = cos(angle)
    const forwardX = Math.sin(this.angle);
    const forwardZ = Math.cos(this.angle);

    const nextX = this.position.x + forwardX * this.speed * dt;
    const nextZ = this.position.z + forwardZ * this.speed * dt;

    // 5. Collision resolution against walls and obstacles
    const resolved = resolveCollision(nextX, nextZ, 0.52);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    if (resolved.hit) {
      // Soft bounce and dampen speed
      this.speed *= -0.28;
    }

    // 6. Rotate wheel meshes around their axle
    const wheelRoll = (this.speed / 0.16) * dt;
    this.frontLeftWheelMesh.rotation.x += wheelRoll;
    this.frontRightWheelMesh.rotation.x += wheelRoll;
    this.rearLeftWheelMesh.rotation.x += wheelRoll;
    this.rearRightWheelMesh.rotation.x += wheelRoll;

    // 7. Dynamic Suspension Feedback (Pitch on accel/brake, Roll on cornering)
    const targetPitch = -this.speed * 0.008 - (isBraking ? 0.035 : 0);
    const targetRoll = -this.steerAngle * (this.speed / this.MAX_SPEED) * 0.03;

    this.currentPitch += (targetPitch - this.currentPitch) * Math.min(1, dt * 10);
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1, dt * 10);

    this.bodyGroup.rotation.x = this.currentPitch;
    this.bodyGroup.rotation.z = this.currentRoll;

    this.updateTransform();
    return { hit: resolved.hit };
  }

  private updateTransform() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.angle;
  }

  public dispose() {
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  }
}
