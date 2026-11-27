import test from 'node:test';
import assert from 'node:assert/strict';
import { INTERNSHIP_ROLES } from '../data/careers.js';
import {
  normalizeAntigravityOptions,
  resolveRoleAntigravityPreset,
} from './antigravity.js';

test('Every internship role has a valid Antigravity preset and adaptive software-GL budget', () => {
  INTERNSHIP_ROLES.forEach((role) => {
    const hw = resolveRoleAntigravityPreset(role.visualType, false);
    const sw = resolveRoleAntigravityPreset(role.visualType, true);

    assert.ok(Array.isArray(hw.colors) && hw.colors.length === 3);
    assert.ok(hw.count > sw.count);
    assert.equal(sw.maxDevicePixelRatio, 1);

    const normalized = normalizeAntigravityOptions(hw);
    assert.ok(normalized.shape >= 0 && normalized.shape <= 3);
    assert.ok(normalized.colorMode >= 0 && normalized.colorMode <= 2);
    assert.ok(normalized.opacity > 0 && normalized.opacity <= 1);
  });
});
