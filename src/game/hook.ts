/**
 * Pendulum endpoint geometry adapted from iamkun/tower_game src/hook.js
 * and src/block.js at c6fa84afe179b661fa71cf7cc8788d0c47ca2875.
 * Copyright (c) 2018 BMQB, Inc. MIT; see vendor/tower-game/LICENSE.
 *
 * Coordinates are relative to the pivot, with positive y pointing down.
 * The caller owns phase integration, speed buffs, and difficulty. Unlike the
 * upstream callback, phase is explicitly in radians, not a speed multiplier.
 */
export function hookPosition(
  phase: number,
  amplitudeDeg: number,
  ropeLength: number,
): { x: number; y: number; angle: number } {
  const angle = Math.sin(phase) * amplitudeDeg * Math.PI / 180;
  return {
    x: Math.sin(angle) * ropeLength,
    y: Math.cos(angle) * ropeLength,
    angle,
  };
}
