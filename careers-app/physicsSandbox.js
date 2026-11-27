import RAPIER, { Ray } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { createBevelledPlane, elementToWorldRect, pageToWorldCoords } from './utils/utils.js';

const OBJECT_COUNT = 30;
const DAMPING = 0.6;
const ATTRACTION_FORCE = 3.5;
const MOUSE_FORCE_COEF = 10;
const MOUSE_LIGHT_INTENSITY = 40;
const STENCIL_REF = 1;

export default class PhysicsSandbox extends THREE.Group {
  ballPosition = new THREE.Vector3();
  meshBodyLookup = new Map();
  attractionPos = new THREE.Vector3(0, 0, 0);
  lastMousePos = new THREE.Vector3();
  _tmpDir = new THREE.Vector3();
  _tmpDelta = new THREE.Vector3();

  constructor(camera, isSoftwareGl = false) {
    super();
    this.camera = camera;
    this.isSoftwareGl = isSoftwareGl;
    this.initViewMask();
    this.initBallMaterial();
    this.initPhysics();
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
  }

  initViewMask = () => {
    const divWorldRect = elementToWorldRect('physics-sandbox-div', this.camera);
    const stencilMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.02, 0.02, 0.02),
      depthWrite: false,
      stencilWrite: true,
      stencilRef: STENCIL_REF,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    const width = Math.abs(divWorldRect.width);
    const height = Math.abs(divWorldRect.height);
    const geometry = createBevelledPlane(width, height, 0.1);
    this.physicsMaskMesh = new THREE.Mesh(geometry, stencilMat);
    this.physicsMaskMesh.position.copy(divWorldRect.position);
    this.physicsMaskMesh.renderOrder = 1;
    this.add(this.physicsMaskMesh);

    this.attractionPos.copy(divWorldRect.position);
  };

  initBallMaterial() {
    this.ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xe91e63,
      metalness: 0,
      roughness: 0.22,
      stencilWrite: true,
      stencilRef: STENCIL_REF,
      stencilFunc: THREE.EqualStencilFunc,
    });
  }

  async initPhysics() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.ballGeometry = new THREE.SphereGeometry(0.6, this.isSoftwareGl ? 16 : 24, this.isSoftwareGl ? 12 : 18);

    const count = this.isSoftwareGl ? 20 : OBJECT_COUNT;
    for (let i = 0; i < count; i++) {
      const spawnOffset = this.getRandomPosition(4.5).add(this.attractionPos);
      const ball = this.createBall(0.6, spawnOffset);
      this.add(ball.mesh);
      this.addToWorld(ball.mesh, ball.rigidbody);
    }

    this.mouseBall = this.createBall(0.6, { x: this.attractionPos.x, y: this.attractionPos.y, z: 0 }, true);
    this.mouseBall.mesh.add(new THREE.PointLight(new THREE.Color(1, 1, 1), MOUSE_LIGHT_INTENSITY));
    this.add(this.mouseBall.mesh);
  }

  createBall(ballRadius, ballPosition, isKinematic = false, ballRestitution = 0.3) {
    const { x, y, z } = ballPosition;
    const rigidbodyDesc = isKinematic
      ? RAPIER.RigidBodyDesc.kinematicPositionBased()
      : RAPIER.RigidBodyDesc.dynamic();
    rigidbodyDesc.setTranslation(x, y, z);
    rigidbodyDesc.setLinearDamping(DAMPING);

    const shape = RAPIER.ColliderDesc.ball(ballRadius);
    shape.setMass(ballRadius);
    shape.setRestitution(ballRestitution);

    const rigidbody = this.world.createRigidBody(rigidbodyDesc);
    this.world.createCollider(shape, rigidbody);

    const mesh = new THREE.Mesh(this.ballGeometry, this.ballMaterial);
    mesh.position.set(x, y, z);
    if (!this.isSoftwareGl) {
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }
    mesh.renderOrder = 2;

    return { rigidbody, mesh };
  }

  getRandomPosition(radius) {
    return this.ballPosition.randomDirection().multiplyScalar(radius);
  }

  onMouseMove = (event) => {
    if (!this.world || !this.mouseBall) {
      return;
    }

    const worldCords = pageToWorldCoords(event.clientX, event.clientY, this.camera);
    const { x, y, z } = worldCords;

    this.mouseBall.rigidbody.setTranslation({ x, y, z });
    this.mouseBall.mesh.position.set(x, y, z);

    this._tmpDelta.copy(this.mouseBall.mesh.position).sub(this.lastMousePos);
    this.lastMousePos.copy(this.mouseBall.mesh.position);

    this._tmpDir.copy(this.lastMousePos).sub(this.camera.position).normalize();
    const ray = new Ray(this.camera.position, this._tmpDir);
    const hit = this.world.castRay(ray, 50, true);
    if (hit) {
      this.meshBodyLookup.forEach((rigidbody) => {
        if (rigidbody === hit.collider.parent()) {
          rigidbody.applyImpulseAtPoint(
            this._tmpDelta.clone().multiplyScalar(MOUSE_FORCE_COEF),
            this.lastMousePos,
            true
          );
        }
      });
    }
  };

  addToWorld(mesh, rigidbody) {
    this.meshBodyLookup.set(mesh, rigidbody);
  }

  resize = () => {
    if (this.physicsMaskMesh) {
      this.remove(this.physicsMaskMesh);
      this.physicsMaskMesh.geometry.dispose();
    }
    this.initViewMask();
  };

  update() {
    if (this.world) {
      this.world.step();
    }

    this.meshBodyLookup.forEach((rigidbody, mesh) => {
      this._tmpDir.copy(this.attractionPos).sub(mesh.position).setLength(ATTRACTION_FORCE);
      rigidbody.resetForces(true);
      rigidbody.addForce(this._tmpDir);
      mesh.position.copy(rigidbody.translation());
      mesh.quaternion.copy(rigidbody.rotation());
    });
  }
}
