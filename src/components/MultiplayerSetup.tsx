/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player } from '../types';

interface MultiplayerSetupProps {
  currentPlayerId: string;
  onModeChange: (mode: '1p' | '2p', partner: Player | null) => void;
  selectedPartner: Player | null;
  activeMode: '1p' | '2p';
}

export function MultiplayerSetup({
  currentPlayerId,
  onModeChange,
  selectedPartner,
  activeMode,
}: MultiplayerSetupProps) {
  // Return null to completely remove the setup and trigger UI from the first page of the games
  return null;
}

interface MultiplayerGameplayBarProps {
  player1: { displayName: string; avatar?: string; level?: number };
  player2: { displayName: string; avatar?: string; level?: number } | null;
  activePlayer: 'p1' | 'p2';
  onToggleTurn?: () => void;
  p1Score?: number;
  p2Score?: number;
}

export function MultiplayerGameplayBar({
  player1,
  player2,
  activePlayer,
  onToggleTurn,
  p1Score = 0,
  p2Score = 0,
}: MultiplayerGameplayBarProps) {
  // Return null to completely hide any gameplay indicator/turn bar
  return null;
}
