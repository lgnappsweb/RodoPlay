/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameType {
  QUIZ = 'QUIZ',
  HANGMAN = 'HANGMAN',
  WORD_SEARCH = 'WORD_SEARCH',
  WORD_GUESS = 'WORD_GUESS',
  NUMBER_GUESS = 'NUMBER_GUESS',
  MEMORY = 'MEMORY',
  REACTION = 'REACTION',
  SPEED_MATH = 'SPEED_MATH',
  SIGN_MATCH = 'SIGN_MATCH',
  ROUTE_ORDER = 'ROUTE_ORDER',
  PARKING_ESCAPE = 'PARKING_ESCAPE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  QUEENS = 'QUEENS',
  PALAVRAS_500 = 'PALAVRAS_500',
  CONTEXTO = 'CONTEXTO',
  SUDOKU = 'SUDOKU',
  DAMA = 'DAMA'
}

export interface Player {
  uid: string;
  displayName: string;
  email?: string;
  avatar?: string;
  base: string;
  shift: string;
  xp: number;
  level: number;
  totalScore: number;
  gamesPlayed: number;
  lastActive: string;
  apelido?: string;
  turno?: string;
  statusConta?: 'pendente' | 'aprovado' | 'rejeitado' | 'bloqueado';
  aprovado?: boolean;
  
  // Custom multiplayer & statistics fields
  status?: 'online' | 'offline';
  victories?: number;
  defeats?: number;
  favoriteGames?: string[];
  history?: any[];
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  completedGames?: number;
  timedOutGames?: number;
  gameStats?: Record<string, { score: number; completions: number }>;
  themeMode?: 'dark' | 'light';
  themePrimary?: string;
  themeSecondary?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: 'Signs' | 'Safety' | 'Situational' | 'Visual' | 'Logic';
  difficulty?: number;
  image?: string;
  theme?: string;
  themeId?: string;
}

export interface GameResult {
  playerId: string;
  score: number;
  xpGained: number;
  correctAnswers: number;
  totalQuestions: number;
  timestamp: string;
}

export interface GlobalStats {
  totalScore: number;
  playerCount: number;
}

export interface GameNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'points' | 'patrol' | 'invite' | 'invite_declined' | 'invite_accepted' | 'system';
  timestamp: string;
  read: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  extraData?: any;
}
