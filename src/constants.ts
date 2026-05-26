/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const BASE_OPTIONS = [
  ...Array.from({ length: 9 }, (_, i) => `Base ${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 9 }, (_, i) => `Praça ${String(i + 1).padStart(2, '0')}`)
];

export const SHIFT_OPTIONS = [
  'Turno A - Diurno',
  'Turno A - Noturno',
  'Turno B - Diurno',
  'Turno B - Noturno',
  'Turno A',
  'Turno B',
  'Turno C',
  'Turno D'
];
