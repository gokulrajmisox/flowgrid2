import * as THREE from 'three';
import { INTERNSHIP_ROLES, getRoleBySlug } from '../data/careers.js';
import { NeonGlyphsController } from './neonGlyphs.js';
import ProjectTile from './projectTiles/ProjectTile.js';
import RoleDetailView from './roleDetailView.js';

export default class ProjectTiles extends THREE.Group {
  projectTiles = [];
  opportunitiesGlyphs = null;
  homeScene;

  constructor(homeScene, isSoftwareGl = false) {
    super();
    this.homeScene = homeScene;
    this.isSoftwareGl = isSoftwareGl;
    this.roleDetailView = new RoleDetailView({
      onSwitchRole: (role) => {
        if (window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.set('role', role.slug);
          window.history.replaceState({}, '', url);
        }
      },
    });
    this.initBackgroundGlyphs();
    this.initTiles();
  }

  initBackgroundGlyphs = () => {
    const bgStageEl = document.getElementById('opportunities-neon-bg-stage');
    if (!bgStageEl) return;

    this.opportunitiesGlyphs?.destroy();
    this.opportunitiesGlyphs = new NeonGlyphsController(bgStageEl, {
      colors: ['#0016ec', '#7c3aed', '#0ea5e9', '#d351b6', '#4f46e5'],
      cellSize: 22,
      depth: 6,
      tilt: 18,
      turn: 0,
      perspective: 60,
      sway: 0.45,
      speed: 0.16,
      density: 0.12,
      trails: 0.22,
      glow: 0.55,
      scramble: 0.5,
      brightness: 1.1,
      fade: 0.82,
      aberration: 0.35,
      variation: 2,
      opacity: 0.56,
      lightMode: true,
      intro: false,
      mouseInteraction: true,
      burstOnClick: true,
      ignoreInteractiveElements: true,
    });
  };

  handleOpenModal = (role) => {
    this.opportunitiesGlyphs?.setExternalPaused(true);
    this.roleDetailView.renderRole(role);
    if (window.history?.replaceState && role?.slug) {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role.slug);
      window.history.replaceState({}, '', url);
    }
  };

  handleModalShown = () => {
    this.roleDetailView.open();
  };

  handleCloseModal = () => {
    this.roleDetailView.close();
    this.opportunitiesGlyphs?.setExternalPaused(false);
    if (window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url);
    }
  };

  initTiles = () => {
    this.projectTiles.forEach((projectTile) => {
      this.remove(projectTile);
      projectTile.cleanup();
    });
    this.projectTiles = [];

    INTERNSHIP_ROLES.forEach((role) => {
      const thumbEl = document.getElementById(role.id);
      if (!thumbEl) return;

      const projectTile = new ProjectTile(role.id, this.homeScene, {
        role,
        onOpenModal: this.handleOpenModal,
        onModalShown: this.handleModalShown,
        onCloseModal: this.handleCloseModal,
        isSoftwareGl: this.isSoftwareGl,
      });
      projectTile.setThumbnailImage(`/${role.image}`);
      this.add(projectTile);
      this.projectTiles.push(projectTile);
    });

    // Support direct ?role=<slug> deep link opening after tiles initialize
    const requestedSlug = new URLSearchParams(window.location.search).get('role');
    if (requestedSlug) {
      const matchingRole = getRoleBySlug(requestedSlug);
      const matchingTile = this.projectTiles.find((t) => t.role?.id === matchingRole?.id);
      if (matchingTile) {
        Promise.resolve(matchingTile.tileReadyPromise).then(() => {
          window.setTimeout(() => {
            matchingTile.onClick();
          }, 120);
        });
      }
    }
  };

  resize = () => {
    this.projectTiles.forEach((projectTile) => projectTile.resize());
  };

  update(dt, renderer) {
    this.projectTiles.forEach((projectTile) => projectTile.update(dt, renderer));
  }
}
