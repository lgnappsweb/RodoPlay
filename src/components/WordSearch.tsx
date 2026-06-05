/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Search, Trophy, CheckCircle2, RotateCcw, Save, LogOut } from 'lucide-react';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface WordSearchProps {
  onComplete: (
    score: number, 
    roundsPlayed?: number,
    isMultiplayer?: boolean,
    partner?: any,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean,
    keepInGameSelection?: boolean,
    isAbandoned?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

import { WORD_SEARCH_THEMES } from '../data/wordSearchThemes';

const DIRECTIONS = [
  { r: 0, c: 1 },   // Horizontal Right
  { r: 0, c: -1 },  // Horizontal Left
  { r: 1, c: 0 },   // Vertical Down
  { r: -1, c: 0 },  // Vertical Up
  { r: 1, c: 1 },   // Diagonal Down-Right
  { r: 1, c: -1 },  // Diagonal Down-Left
  { r: -1, c: 1 },  // Diagonal Up-Right
  { r: -1, c: -1 }, // Diagonal Up-Left
];

function isPluralOrDuplicate(w1: string, w2: string): boolean {
  const u1 = w1.toUpperCase();
  const u2 = w2.toUpperCase();
  if (u1 === u2) return true;

  const getSingularCandidate = (w: string) => {
    if (w.endsWith('AIS')) return w.substring(0, w.length - 3) + 'AL';
    if (w.endsWith('EIS')) return w.substring(0, w.length - 3) + 'EL';
    if (w.endsWith('OIS')) return w.substring(0, w.length - 3) + 'OL';
    if (w.endsWith('NS')) return w.substring(0, w.length - 2) + 'M';
    if (w.endsWith('ES')) {
      const stem = w.substring(0, w.length - 2);
      if (stem.endsWith('R') || stem.endsWith('S') || stem.endsWith('Z')) return stem;
    }
    if (w.endsWith('S')) {
      return w.substring(0, w.length - 1);
    }
    return w;
  };

  const s1 = getSingularCandidate(u1);
  const s2 = getSingularCandidate(u2);
  
  if (s1 === s2 || s1 === u2 || s2 === u1) return true;
  
  if (u1.startsWith(u2) && (u1.slice(u2.length) === 'S' || u1.slice(u2.length) === 'ES')) return true;
  if (u2.startsWith(u1) && (u2.slice(u1.length) === 'S' || u2.slice(u1.length) === 'ES')) return true;
  
  return false;
}

function areWordsSimilar(w1: string, w2: string): boolean {
  const u1 = w1.toUpperCase();
  const u2 = w2.toUpperCase();
  
  if (isPluralOrDuplicate(u1, u2)) return true;
  
  // If one of them contains the other (e.g. "CARRO" vs "CARROCERIA", or "VIA" vs "RODOVIA")
  if (u1.length >= 3 && u2.length >= 3) {
    if (u1.includes(u2) || u2.includes(u1)) return true;
  }
  
  // If they share a common starting prefix of >= 4 characters
  const minLen = Math.min(u1.length, u2.length);
  if (minLen >= 4) {
    if (u1.substring(0, 4) === u2.substring(0, 4)) return true;
  }
  
  // If they share a common ending suffix of >= 4 characters
  if (u1.length >= 4 && u2.length >= 4) {
    if (u1.substring(u1.length - 4) === u2.substring(u2.length - 4)) return true;
  }

  // Edit distance (Levenshtein) - if difference is <= 2
  const len1 = u1.length;
  const len2 = u2.length;
  if (Math.abs(len1 - len2) <= 2) {
    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    for (let i = 1; i <= len1; i++) {
       for (let j = 1; j <= len2; j++) {
          if (u1[i - 1] === u2[j - 1]) {
             matrix[i][j] = matrix[i - 1][j - 1];
          } else {
             matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j] + 1      // deletion
             );
          }
       }
    }
    const distance = matrix[len1][len2];
    if (distance <= 2) return true;
  }

  return false;
}

export function WordSearch({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: WordSearchProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<{r: number, c: number, word: string}[]>([]);
  const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gridSize, setGridSize] = useState(10);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('VEICULOS');
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Dragging / swiping logic states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{r: number, c: number} | null>(null);

  // Progressive game loop (10 rounds per gameplay)
  const [round, setRound] = useState(1);
  const [showRoundCompleteModal, setShowRoundCompleteModal] = useState(false);
  const [showPointsPage, setShowPointsPage] = useState(false);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // High-contrast, beautiful palette to assign a distinct color to each target word
  const getWordColorClasses = (word: string) => {
    const uWord = word.toUpperCase();
    const index = targetWords.indexOf(uWord);
    const colorStyles = [
      {
        bg: 'bg-purple-500/30 hover:bg-purple-500/40 text-purple-200',
        text: 'text-purple-300',
        border: 'border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
        targetBg: 'bg-purple-950/50 text-purple-300 border-purple-500/50'
      },
      {
        bg: 'bg-teal-500/30 hover:bg-teal-500/40 text-teal-200',
        text: 'text-teal-300',
        border: 'border-teal-400/60 shadow-[0_0_10px_rgba(20,184,166,0.15)]',
        targetBg: 'bg-teal-950/50 text-teal-300 border-teal-500/50'
      },
      {
        bg: 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-200',
        text: 'text-rose-300',
        border: 'border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
        targetBg: 'bg-rose-950/50 text-rose-300 border-rose-500/50'
      },
      {
        bg: 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-200',
        text: 'text-amber-300',
        border: 'border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
        targetBg: 'bg-amber-950/50 text-amber-300 border-amber-400/50'
      },
      {
        bg: 'bg-sky-500/30 hover:bg-sky-500/40 text-sky-205',
        text: 'text-sky-305',
        border: 'border-sky-400/60 shadow-[0_0_10px_rgba(14,165,233,0.15)]',
        targetBg: 'bg-sky-955/50 text-sky-305 border-sky-500/50'
      },
      {
        bg: 'bg-lime-500/30 hover:bg-lime-500/40 text-lime-200',
        text: 'text-lime-300',
        border: 'border-lime-400/60 shadow-[0_0_10px_rgba(132,204,22,0.15)]',
        targetBg: 'bg-lime-950/50 text-lime-300 border-lime-500/50'
      },
      {
        bg: 'bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-200',
        text: 'text-indigo-300',
        border: 'border-indigo-400/60 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
        targetBg: 'bg-indigo-950/50 text-indigo-300 border-indigo-500/50'
      },
      {
        bg: 'bg-pink-500/30 hover:bg-pink-500/40 text-pink-200',
        text: 'text-pink-300',
        border: 'border-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.15)]',
        targetBg: 'bg-pink-950/50 text-pink-300 border-pink-500/50'
      },
      {
        bg: 'bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200',
        text: 'text-emerald-300',
        border: 'border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
        targetBg: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50'
      },
      {
        bg: 'bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-200',
        text: 'text-cyan-300',
        border: 'border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
        targetBg: 'bg-cyan-950/50 text-cyan-300 border-cyan-500/50'
      }
    ];

    if (index === -1) return colorStyles[0];
    return colorStyles[index % colorStyles.length];
  };

  useEffect(() => {
    generateGrid();
  }, [level, difficulty, selectedThemeId, round]);

  const generateGrid = () => {
    let baseSize = 10;
    let wordCount = 8;
    if (difficulty === 'easy') {
      baseSize = 9;
    } else if (difficulty === 'medium') {
      baseSize = 11;
    } else if (difficulty === 'hard') {
      baseSize = 13;
    }
    const size = Math.min(baseSize + Math.floor(level / 2), 14);
    setGridSize(size);

    // Escolhe palavras aleatórias do tema selecionado
    const theme = WORD_SEARCH_THEMES.find(t => t.id === selectedThemeId) || WORD_SEARCH_THEMES[0];
    const wordsPool = theme.words;
    
    // We filter words to ensure their length is <= size
    const filteredWords = wordsPool.filter(w => w.length >= 3 && w.length <= size);

    let successfullyPlacedWords: string[] = [];
    let finalGrid: string[][] = [];
    let retries = 0;

    while (retries < 30 && successfullyPlacedWords.length < wordCount && filteredWords.length > 0) {
      successfullyPlacedWords = [];
      const tempGrid = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => '')
      );

      // Shuffle available words to try a fresh selection
      const shuffledAvailable = [...filteredWords].sort(() => Math.random() - 0.5);

      for (const word of shuffledAvailable) {
        if (successfullyPlacedWords.length === wordCount) break;

        // Skip duplicates or very similar words
        let isDup = false;
        for (const existing of successfullyPlacedWords) {
          if (areWordsSimilar(word, existing)) {
            isDup = true;
            break;
          }
        }
        if (isDup) continue;

        // Try to place the word
        let placed = false;
        const shufDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

        for (const dir of shufDirs) {
          if (placed) break;

          // Try random start points
          for (let posAttempt = 0; posAttempt < 40; posAttempt++) {
            const startR = Math.floor(Math.random() * size);
            const startC = Math.floor(Math.random() * size);

            // Check if fits
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
              const r = startR + dir.r * i;
              const c = startC + dir.c * i;
              if (r < 0 || r >= size || c < 0 || c >= size || (tempGrid[r][c] !== '' && tempGrid[r][c] !== word[i])) {
                canPlace = false;
                break;
              }
            }

            if (canPlace) {
              for (let i = 0; i < word.length; i++) {
                tempGrid[startR + dir.r * i][startC + dir.c * i] = word[i];
              }
              placed = true;
              successfullyPlacedWords.push(word);
              break;
            }
          }
        }
      }

      if (successfullyPlacedWords.length === wordCount) {
        finalGrid = tempGrid;
        break;
      } else {
        // Safe keeping of the best layout so far in case we run out of retries
        if (successfullyPlacedWords.length > finalGrid.length) {
          finalGrid = tempGrid;
        }
      }
      retries++;
    }

    // Fallback if no grid generated
    if (finalGrid.length === 0) {
      finalGrid = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => '')
      );
    }

    // If successfullyPlacedWords didn't reach wordCount, synchronize target words
    const finalPlacedWords = successfullyPlacedWords.length > 0 ? successfullyPlacedWords : ['PATRULHA', 'OPERACAO', 'URGENTE'];
    setTargetWords(finalPlacedWords);

    // Fill remaining empty cells with random uppercase characters
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (finalGrid[r][c] === '') {
          finalGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGrid(finalGrid);
    setFoundWords([]);
    setFoundCells([]);
    setSelectedCells([]);
  };

  const startDrag = (r: number, c: number) => {
    if (foundWords.length === targetWords.length) return;
    setIsDragging(true);
    setDragStartCell({ r, c });
    setSelectedCells([{ r, c }]);
  };

  const updateDrag = (currR: number, currC: number) => {
    if (!isDragging || !dragStartCell) return;
    if (foundWords.length === targetWords.length) return;

    // Skip redundant updates
    const lastCell = selectedCells[selectedCells.length - 1];
    if (lastCell && lastCell.r === currR && lastCell.c === currC && selectedCells.length > 1) {
      return;
    }

    const dr = currR - dragStartCell.r;
    const dc = currC - dragStartCell.c;

    let isValidLine = false;
    let stepR = 0;
    let stepC = 0;

    // Check collinearity for 8-directional straight line selection
    if (dr === 0 && dc !== 0) {
      isValidLine = true;
      stepR = 0;
      stepC = Math.sign(dc);
    } else if (dc === 0 && dr !== 0) {
      isValidLine = true;
      stepR = Math.sign(dr);
      stepC = 0;
    } else if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
      isValidLine = true;
      stepR = Math.sign(dr);
      stepC = Math.sign(dc);
    }

    if (isValidLine) {
      const path = [];
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      for (let i = 0; i <= steps; i++) {
        path.push({
          r: dragStartCell.r + i * stepR,
          c: dragStartCell.c + i * stepC
        });
      }
      setSelectedCells(path);
    } else if (dr === 0 && dc === 0) {
      setSelectedCells([dragStartCell]);
    }
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStartCell(null);

    if (selectedCells.length > 1) {
      const selectedString = selectedCells.map(cell => grid[cell.r]?.[cell.c]).join('');
      const revSelectedString = [...selectedString].reverse().join('');
      const matchedWord = targetWords.find(w => (w === selectedString || w === revSelectedString) && !foundWords.includes(w));

      if (matchedWord) {
        const nextFoundWords = [...foundWords, matchedWord];
        setFoundWords(nextFoundWords);
        setFoundCells(prev => [...prev, ...selectedCells.map(cell => ({ ...cell, word: matchedWord }))]);
        setSelectedCells([]);
        const points = 100 + matchedWord.length * 10;
        
        let finalScore = score;
        let finalP1 = p1Score;
        let finalP2 = p2Score;
        if (multiplayerMode === '2p') {
          if (activePlayerTurn === 'p1') {
            finalP1 = p1Score + points;
            setP1Score(finalP1);
          } else {
            finalP2 = p2Score + points;
            setP2Score(finalP2);
          }
          setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
        } else {
          finalScore = score + points;
          setScore(finalScore);
        }
        if (onScoreUpdate) onScoreUpdate(points);

        const isWon = nextFoundWords.length === targetWords.length && targetWords.length > 0;
        if (isWon) {
          playGameSfx('win');
        } else {
          playGameSfx('match');
        }
        triggerGameConfetti();

        if (isWon) {
          if (round < 10) {
            setShowRoundCompleteModal(true);
          } else {
            setShowPointsPage(true);
          }
        }
      } else {
        setSelectedCells([]);
      }
    } else if (selectedCells.length === 1) {
      // It was a single cell click release, handle click selection
      handleCellClick(selectedCells[0].r, selectedCells[0].c);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || foundWords.length === targetWords.length) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    if (touch) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const cellElement = element.closest('[data-cell="true"]');
        if (cellElement) {
          const r = parseInt(cellElement.getAttribute('data-row') || '-1', 10);
          const c = parseInt(cellElement.getAttribute('data-col') || '-1', 10);
          if (r !== -1 && c !== -1) {
            updateDrag(r, c);
          }
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (foundWords.length === targetWords.length) return;

    const alreadySelected = selectedCells.some(cell => cell.r === r && cell.c === c);
    let nextSelected = [];
    
    if (alreadySelected) {
      nextSelected = selectedCells.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      nextSelected = [...selectedCells, {r, c}];
    }
    
    setSelectedCells(nextSelected);

    const selectedString = nextSelected.map(cell => grid[cell.r]?.[cell.c] || '').join('');
    const revSelectedString = [...selectedString].reverse().join('');
    
    const matchedWord = targetWords.find(w => (w === selectedString || w === revSelectedString) && !foundWords.includes(w));

    if (matchedWord) {
      const nextFoundWords = [...foundWords, matchedWord];
      setFoundWords(nextFoundWords);
      setFoundCells(prev => [...prev, ...nextSelected.map(cell => ({ ...cell, word: matchedWord }))]);
      setSelectedCells([]);
      const points = 100 + matchedWord.length * 10;
      let finalScore = score;
      let finalP1 = p1Score;
      let finalP2 = p2Score;
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          finalP1 = p1Score + points;
          setP1Score(finalP1);
        } else {
          finalP2 = p2Score + points;
          setP2Score(finalP2);
        }
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      } else {
        finalScore = score + points;
        setScore(finalScore);
      }
      if (onScoreUpdate) onScoreUpdate(points);

      const isWon = nextFoundWords.length === targetWords.length && targetWords.length > 0;
      if (isWon) {
        playGameSfx('win');
      } else {
        playGameSfx('match');
      }
      triggerGameConfetti();

      if (isWon) {
        if (round < 10) {
          setShowRoundCompleteModal(true);
        } else {
          setShowPointsPage(true);
        }
      }
    }
  };

  const getDifficulty = () => {
    if (difficulty === 'easy') return 'Fácil';
    if (difficulty === 'medium') return 'Médio';
    return 'Difícil';
  };

  const isLevelComplete = foundWords.length === targetWords.length && targetWords.length > 0;

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Header Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col font-sans">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Busca</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Caça-Palavras</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Search className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Busca</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Encontre as palavras ocultas no caça-palavras</p>
        </div>

        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`relative flex items-center p-4 rounded-2xl border-2 transition-all group ${
                    difficulty === level 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">{level === 'easy' ? 'Fácil' : level === 'medium' ? 'Médio' : 'Difícil'}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {level === 'easy' ? 'Grelha Menor (9x9 | 8 Alvos)' : level === 'medium' ? 'Grelha Normal (11x11 | 8 Alvos)' : 'Grelha Ampla (13x13 | 8 Alvos)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-wordsearch"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SELETOR DE TEMA ESTILO CONTEXTO */}
          <div id="wordsearch-theme-container" className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Tema de Patrulha Ocular</p>
            <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {WORD_SEARCH_THEMES.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                const parts = theme.name.split(' ');
                const emoji = parts[parts.length - 1];
                const cleanName = parts.slice(0, -1).join(' ');

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-800 border-yellow-400 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/25'
                    }`}
                  >
                    <span className="text-2xl select-none shrink-0" role="img" aria-label={cleanName}>
                      {emoji}
                    </span>
                    <div className="min-w-0">
                      <p className={isSelected ? 'text-[11.5px] font-black uppercase text-yellow-400' : 'text-[11.5px] font-extrabold uppercase text-slate-300'}>
                        {cleanName}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <MultiplayerSetup
            currentPlayerId={currentPlayerId || ''}
            activeMode={multiplayerMode}
            onModeChange={(mode, partner) => {
              setMultiplayerMode(mode);
              setSelectedPartner(partner);
            }}
            selectedPartner={selectedPartner}
          />

          <Button 
            disabled={multiplayerMode === '2p' && !selectedPartner}
            onClick={() => {
              setScore(0);
              setP1Score(0);
              setP2Score(0);
              setActivePlayerTurn('p1');
              setLevel(1);
              setSetupComplete(true);
            }} 
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
          </Button>

          <Button 
            onClick={onCancel}
            variant="outline"
            className="w-full h-12 rounded-2xl border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95"
          >
            VOLTAR À CENTRAL DE JOGOS
          </Button>
        </div>
      </div>
    );
  }

  if (showPointsPage) {
    const totalMatchPoints = multiplayerMode === '2p' ? p1Score + p2Score : score;
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center pt-10 pb-20 select-none overflow-y-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-xl shadow-yellow-500/10 text-center space-y-6"
        >
          {/* Trophy Header */}
          <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter text-yellow-400">Patrulha Concluída!</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Parabéns! Você finalizou 10 rodadas completas.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-left w-full">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Dificuldade</span>
              <span className="text-xs font-black text-white uppercase italic">{getDifficulty()}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Rodadas Jogadas</span>
              <span className="text-xs font-black text-yellow-400 font-mono">10 / 10 🎯</span>
            </div>

            {multiplayerMode === '2p' ? (
              <div className="bg-slate-955 p-3.5 rounded-2xl border border-indigo-500/30 col-span-2 space-y-2">
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Resultado da Dupla (Versus)</p>
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1">Você (P1): <span className="text-white font-black font-mono">{p1Score} pts</span></span>
                  {p1Score > p2Score && <span className="text-[9px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">Vencedor</span>}
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1">{selectedPartner?.displayName || 'P2'}: <span className="text-white font-black font-mono">{p2Score} pts</span></span>
                  {p2Score > p1Score && <span className="text-[9px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded uppercase">Vencedor</span>}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl col-span-2 text-center">
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pontuação Total Acumulada</span>
                <span className="text-4xl font-extrabold text-yellow-400 font-mono tracking-tighter">{score} <span className="text-xs uppercase text-slate-500">pts</span></span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10, // 10 rounds total Completed
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'WORD_SEARCH',
                  false,
                  false // keepInGameSelection = false -> so it opens the final homologation screen
                );
                onCancel();
              }}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              FINALIZAR PARTIDA 🏁
            </Button>

            <Button
              onClick={() => {
                // First save the current 10-rounds points cleanly in the background
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10, // 10 rounds total completed
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'WORD_SEARCH',
                  false,
                  true // keepInGameSelection = true -> silent background save
                );

                // Then reset points state and increment level to generate fresh 10 rounds of the next level
                setScore(0);
                setP1Score(0);
                setP2Score(0);
                setRound(1);
                setLevel(prev => prev + 1);
                setShowPointsPage(false);
                setShowRoundCompleteModal(false);
                
                // Cycle/advance difficulty
                let nextDiff: 'easy' | 'medium' | 'hard' = 'easy';
                if (difficulty === 'easy') nextDiff = 'medium';
                else if (difficulty === 'medium') nextDiff = 'hard';
                else if (difficulty === 'hard') nextDiff = 'easy';
                setDifficulty(nextDiff);
              }}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              PRÓXIMO NÍVEL ⚡
            </Button>

            <Button
              onClick={() => {
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10,
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'WORD_SEARCH',
                  false,
                  false
                );
                onCancel();
              }}
              variant="outline"
              className="w-full h-12 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer"
            >
              Voltar à Central de Jogos
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6 relative">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-6">
        <button 
          id="ws-back-button"
          onClick={() => {
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              round,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'WORD_SEARCH',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Busca</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {getDifficulty().toUpperCase()} | RODADA {round} de 10</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm mb-6">
          <MultiplayerGameplayBar
            player1={{ displayName: 'Você' }}
            player2={selectedPartner}
            activePlayer={activePlayerTurn}
            onToggleTurn={() => setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1')}
            p1Score={p1Score}
            p2Score={p2Score}
          />
        </div>
      )}

      <div className="w-full flex justify-between items-center mb-6">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Caça-Palavras</p>
          <p className="text-xl font-black text-yellow-400">Score: {multiplayerMode === '2p' ? p1Score + p2Score : score}</p>
        </div>
      </div>

      <div className="text-center mb-6">
         <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">CAÇA-PALAVRAS</h2>
         {(() => {
           const currentTheme = WORD_SEARCH_THEMES.find(t => t.id === selectedThemeId);
           if (currentTheme) {
             const parts = currentTheme.name.split(' ');
             const emoji = parts[parts.length - 1];
             const cleanName = parts.slice(0, -1).join(' ');
             return (
               <div className="w-full flex justify-center mt-3">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800/80 text-slate-300">
                   <span className="text-base select-none">{emoji}</span>
                   <span className="text-[10px] font-black uppercase tracking-wider">TEMA: <span className="text-yellow-400 font-black">{cleanName.toUpperCase()}</span></span>
                 </div>
               </div>
             );
           }
           return null;
         })()}
         <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Localize os termos técnicos do trecho</p>
      </div>

      <div 
        className="grid gap-1 bg-slate-900 p-2 rounded-2xl border-2 border-slate-800 mb-8 select-none touch-none"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        onTouchMove={handleTouchMove}
        onTouchEnd={endDrag}
        onMouseLeave={endDrag}
        onMouseUp={endDrag}
      >
        {grid.map((row, r) => row.map((char, c) => {
          const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
          const foundCell = foundCells.find(cell => cell.r === r && cell.c === c);
          const isFound = !!foundCell;
          const colorObj = foundCell ? getWordColorClasses(foundCell.word) : null;

          return (
            <button
              id={`ws-cell-${r}-${c}`}
              key={`${r}-${c}`}
              data-cell="true"
              data-row={r}
              data-col={c}
              onMouseDown={(e) => { e.preventDefault(); startDrag(r, c); }}
              onMouseEnter={() => updateDrag(r, c)}
              onMouseUp={endDrag}
              onTouchStart={(e) => { e.preventDefault(); startDrag(r, c); }}
              onTouchEnd={endDrag}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-xs md:text-sm font-black flex items-center justify-center transition-all relative ${
                isSelected 
                  ? 'bg-yellow-400 text-slate-900 z-10 scale-105' 
                  : isFound && colorObj
                    ? `${colorObj.bg} ${colorObj.text}`
                    : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {char}
              {isFound && colorObj && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute inset-0 border-2 ${colorObj.border} rounded-lg pointer-events-none`}
                />
              )}
            </button>
          );
        }))}
      </div>

      <div className="w-full max-w-sm bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Encontrar ({targetWords.length} alvos):</p>
        <div className="grid grid-cols-4 gap-2">
          {targetWords.map((word, idx) => {
            const isFound = foundWords.includes(word);
            const colorObj = getWordColorClasses(word);
            return (
              <div 
                id={`ws-target-${idx}`}
                key={word} 
                className={`px-1 py-2.5 rounded-xl text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-tighter sm:tracking-tight transition-all shadow-sm text-center flex items-center justify-center truncate ${
                  isFound 
                    ? `${colorObj.targetBg} line-through scale-95 opacity-80 border` 
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {word}
              </div>
            );
          })}
        </div>
      </div>

      {/* Command Actions Bar */}
      <div className="w-full flex justify-center mt-8">
        <Button 
          id="ws-abandon-btn"
          onClick={() => {
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              round,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'WORD_SEARCH',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* Round completion Modal Overlay */}
      <AnimatePresence>
        {showRoundCompleteModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl shadow-yellow-500/20"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase italic">Rodada {round} Concluída!</h3>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Todos os alvos foram localizados com sucesso!</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 font-sans">Sua pontuação acumulada</span>
                <span className="text-2xl font-black text-yellow-400 font-mono">{multiplayerMode === '2p' ? p1Score + p2Score : score} <span className="text-xs text-slate-500">PTS</span></span>
              </div>

              <Button
                onClick={() => {
                  setRound(prev => prev + 1);
                  setShowRoundCompleteModal(false);
                }}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                Próxima Rodada ({round + 1}/10) ⚡
              </Button>

              <Button
                onClick={() => {
                  onComplete(
                    multiplayerMode === '2p' ? p1Score : score,
                    round,
                    multiplayerMode === '2p',
                    selectedPartner,
                    p1Score,
                    p2Score,
                    'WORD_SEARCH',
                    false,
                    false
                  );
                  onCancel();
                }}
                className="w-full h-12 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                FINALIZAR PARTIDA 🏁
              </Button>

              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full h-12 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer hover:text-white"
              >
                Voltar à Central de Jogos
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
