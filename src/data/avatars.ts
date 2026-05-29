/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A rich collection of over 500 high-quality vector drawings of cartoon and anime-style characters
// (including hand-drawn comics, adventurers, modern avatars, and stylized heroic personas).
// We combine 4 of Dicebear's most expressive illustration-based cartoon styles:
// - 'adventurer': Epic adventure and RPG drawing styling
// - 'open-peeps': Hand-drawn artistic comic/doodle character styling
// - 'personas': Modern styled illustrations with unique hairstyles and clothing
// - 'lorelei': Exquisitely polished, charming cartoon expressions
const styles = ['adventurer', 'open-peeps', 'personas', 'lorelei'];

const generatedAvatars: string[] = [];

for (const style of styles) {
  // Generate 130 variations per cartoon style to exceed the minimum of 500 distinct avatars (520 total)
  for (let i = 1; i <= 130; i++) {
    generatedAvatars.push(`https://api.dicebear.com/7.x/${style}/svg?seed=${style}-${i}`);
  }
}

export const ALL_AVATARS = generatedAvatars;

export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=adventurer-1';
