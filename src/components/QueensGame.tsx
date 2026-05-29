/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Crown, ArrowLeft, RotateCcw, AlertTriangle, CheckCircle, HelpCircle, Shuffle, Sparkles, Users } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface QueensGameProps {
  onComplete: (
    score: number, 
    roundsPlayed?: number,
    isMultiplayer?: boolean,
    partner?: any,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean,
    keepInGameSelection?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

const REGION_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose/Red
  '#eab308', // Amber/Yellow
  '#a855f7', // Purple
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
];

interface BoardData {
  size: number;
  colors: number[][];
  solution: { r: number; c: number }[];
}

export function QueensGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: QueensGameProps) {
  const [size, setSize] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
  const [setupComplete, setSetupComplete] = useState(false);
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  
  // Cell states: null = empty, 'X' = blocked, 'Q' = queen
  const [grid, setGrid] = useState<(null | 'X' | 'Q')[][]>([]);
  const [violatedCells, setViolatedCells] = useState<Set<string>>(new Set());
  
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [maxTime, setMaxTime] = useState(90);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'failed'>('playing');
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  
  // Checklists
  const [rowStatus, setRowStatus] = useState<boolean>(true);
  const [colStatus, setColStatus] = useState<boolean>(true);
  const [colorStatus, setColorStatus] = useState<boolean>(true);
  const [adjStatus, setAdjStatus] = useState<boolean>(true);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Sound/Vibe effects
  const [showVictoryCard, setShowVictoryCard] = useState(false);

  // Generate procedure
  const generateProceduralPuzzle = (n: number): BoardData => {
    let queens: { r: number; c: number }[] = [];
    
    // Backtracker to place N queens without row, col, or adjacency constraints
    function solve(row: number): boolean {
      if (row === n) return true;
      
      const cols = Array.from({ length: n }, (_, i) => i);
      // Randomize column scan order
      for (let i = cols.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cols[i], cols[j]] = [cols[j], cols[i]];
      }
      
      for (const col of cols) {
        let isOk = true;
        for (const q of queens) {
          if (q.c === col) { isOk = false; break; }
          if (Math.abs(q.r - row) <= 1 && Math.abs(q.c - col) <= 1) { isOk = false; break; }
        }
        
        if (isOk) {
          queens.push({ r: row, c: col });
          if (solve(row + 1)) return true;
          queens.pop();
        }
      }
      return false;
    }

    solve(0);

    // Build contiguous colored regions starting from these Solution seeds
    const gridColors = Array.from({ length: n }, () => Array(n).fill(-1));
    const queue: { r: number; c: number; color: number }[] = [];
    
    for (let i = 0; i < n; i++) {
      const q = queens[i];
      gridColors[q.r][q.c] = i;
      queue.push({ r: q.r, c: q.c, color: i });
    }

    while (queue.length > 0) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      const curr = queue[randomIndex];
      queue.splice(randomIndex, 1);

      const neighbors = [
        { r: curr.r - 1, c: curr.c },
        { r: curr.r + 1, c: curr.c },
        { r: curr.r, c: curr.c - 1 },
        { r: curr.r, c: curr.c + 1 },
      ];

      const validNeighbors = neighbors.filter(nb => 
        nb.r >= 0 && nb.r < n && nb.c >= 0 && nb.c < n && gridColors[nb.r][nb.c] === -1
      );

      if (validNeighbors.length > 0) {
        const chosen = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        gridColors[chosen.r][chosen.c] = curr.color;
        
        // Push current tile back for remaining neighbors (if any) and push new tile to spread
        queue.push(curr);
        queue.push({ r: chosen.r, c: chosen.c, color: curr.color });
      }
    }

    return {
      size: n,
      colors: gridColors,
      solution: queens
    };
  };

  const startNewGame = () => {
    const boardSize = difficulty === 'Fácil' ? 5 : difficulty === 'Médio' ? 7 : 9;
    setSize(boardSize);
    
    const puzzle = generateProceduralPuzzle(boardSize);
    setBoardData(puzzle);
    
    // Set empty grid
    setGrid(Array.from({ length: boardSize }, () => Array(boardSize).fill(null)));
    setViolatedCells(new Set());
    
    const timeLimit = difficulty === 'Fácil' ? 90 : difficulty === 'Médio' ? 150 : 210;
    setTimeLeft(timeLimit);
    setMaxTime(timeLimit);
    
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setMoves(0);
    setGameState('playing');
    setShowVictoryCard(false);
  };

  useEffect(() => {
    if (setupComplete) {
      startNewGame();
    }
  }, [setupComplete, difficulty]);

  // Timer loop - disabled per user request
  useEffect(() => {
    // No timer countdown
  }, []);

  // Run Constraint Checks whenever Grid or Queens change
  useEffect(() => {
    if (!boardData) return;
    
    const size = boardData.size;
    const colors = boardData.colors;
    const queens: { r: number; c: number }[] = [];
    
    // Grab coordinates of current queens
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r]?.[c] === 'Q') {
          queens.push({ r, c });
        }
      }
    }

    const violations = new Set<string>();

    let duplicateRow = false;
    let duplicateCol = false;
    let duplicateColor = false;
    let duplicateAdjacency = false;

    // Check each pair of queens for conflicts
    for (let i = 0; i < queens.length; i++) {
      const q1 = queens[i];
      for (let j = i + 1; j < queens.length; j++) {
        const q2 = queens[j];
        
        // Row conflict
        if (q1.r === q2.r) {
          violations.add(`${q1.r}_${q1.c}`);
          violations.add(`${q2.r}_${q2.c}`);
          duplicateRow = true;
        }
        
        // Col conflict
        if (q1.c === q2.c) {
          violations.add(`${q1.r}_${q1.c}`);
          violations.add(`${q2.r}_${q2.c}`);
          duplicateCol = true;
        }
        
        // Color region conflict
        if (colors[q1.r][q1.c] === colors[q2.r][q2.c]) {
          violations.add(`${q1.r}_${q1.c}`);
          violations.add(`${q2.r}_${q2.c}`);
          duplicateColor = true;
        }

        // Touch constraint (adjacent and diagonal touching)
        if (Math.abs(q1.r - q2.r) <= 1 && Math.abs(q1.c - q2.c) <= 1) {
          violations.add(`${q1.r}_${q1.c}`);
          violations.add(`${q2.r}_${q2.c}`);
          duplicateAdjacency = true;
        }
      }
    }

    setViolatedCells(violations);

    // Checklist statuses
    setRowStatus(!duplicateRow);
    setColStatus(!duplicateCol);
    setColorStatus(!duplicateColor);
    setAdjStatus(!duplicateAdjacency);

    // Win condition check:
    // We must have exactly N placed queens, and exactly 0 violations!
    if (queens.length === size && violations.size === 0) {
      // Calculate final score
      const basePoints = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
      const speedBonus = 0;
      const finalAward = basePoints + speedBonus;
      
      setGameState('playing'); // We bypass local overlays and show the system-wide completion modal directly!

      if (multiplayerMode === '2p') {
        let p1Award = p1Score;
        let p2Award = p2Score;
        // The player who makes the winning move gets the final speed bonus + portion of base
        if (activePlayerTurn === 'p1') {
          p1Award += finalAward;
          setP1Score(p1Award);
        } else {
          p2Award += finalAward;
          setP2Score(p2Award);
        }
        
        // Computa os pontos imediatamente em background para salvar o estado
        onComplete(
          p1Award,
          1,
          true,
          selectedPartner,
          p1Award,
          p2Award,
          'QUEENS',
          false,
          false
        );
      } else {
        const singleScore = score + finalAward;
        setScore(singleScore);
        if (onScoreUpdate) onScoreUpdate(finalAward);
        
        // Computa os pontos imediatamente em background para salvar o estado
        onComplete(
          singleScore,
          1,
          false,
          null,
          0,
          0,
          'QUEENS',
          false,
          false
        );
      }
    }

  }, [grid, boardData]);

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing' || !boardData) return;

    setMoves(prev => prev + 1);
    
    // Cycle cell status: Empty (null) -> Obstacle (X) -> Queen (Q) -> Empty (null)
    const current = grid[r][c];
    let nextValue: null | 'X' | 'Q' = null;
    
    if (current === null) {
      nextValue = 'X';
    } else if (current === 'X') {
      nextValue = 'Q';
    } else {
      nextValue = null;
    }

    const nextGrid = grid.map((row, curR) => 
      row.map((cell, curC) => {
        if (curR === r && curC === c) return nextValue;
        return cell;
      })
    );

    setGrid(nextGrid);

    // Switch turns in local 2-Player mode after actual queen placements/clears
    if (multiplayerMode === '2p' && nextValue !== 'X') {
      setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
    }
  };

  // Provide a smart hint
  const handleGetHint = () => {
    if (gameState !== 'playing' || !boardData) return;
    
    const size = boardData.size;
    const sol = boardData.solution;
    
    // Look for any cell that has a conflict or has a misplaced queen
    // Let's find a cell in sol that does NOT have a queen yet, and place it!
    // But first, clear any invalid queens to avoid confusing conflicts.
    const isSolutionInGrid = sol.every(q => grid[q.r][q.c] === 'Q');
    if (isSolutionInGrid) return; // already solved or nearly solved

    // Find the first solution coordinate that doesn't have a Queen in the current state
    const unplacedSol = sol.find(sq => grid[sq.r][sq.c] !== 'Q');
    if (unplacedSol) {
      const nextGrid = grid.map((row, r) => 
        row.map((cell, c) => {
          if (r === unplacedSol.r && c === unplacedSol.c) return 'Q';
          // Clear any conflicting queen in the same row/col to help the user
          if ((r === unplacedSol.r || c === unplacedSol.c) && cell === 'Q') return null;
          return cell;
        })
      );
      setGrid(nextGrid);
    }
  };

  // Reveal the full procedurally generated solution
  const handleRevealSolution = () => {
    if (gameState !== 'playing' || !boardData) return;
    
    const size = boardData.size;
    const sol = boardData.solution;
    
    const solGrid = Array.from({ length: size }, () => Array(size).fill(null) as (null | 'X' | 'Q')[]);
    for (const q of sol) {
      solGrid[q.r][q.c] = 'Q';
    }
    
    setGrid(solGrid);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setGameState('playing');
    
    // Computa 0 pontos imediatamente e mantém em jogo
    onComplete(
      0, // Revealed solution awards 0 XP to keep leaderboard fair
      1,
      multiplayerMode === '2p',
      selectedPartner,
      0,
      0,
      'QUEENS',
      false,
      false
    );
  };

  const getCellBorders = (r: number, c: number) => {
    if (!boardData) return '';
    const colors = boardData.colors;
    const currentThemeColor = colors[r][c];

    const upDiff = r === 0 || colors[r - 1][c] !== currentThemeColor;
    const downDiff = r === size - 1 || colors[r + 1][c] !== currentThemeColor;
    const leftDiff = c === 0 || colors[r][c - 1] !== currentThemeColor;
    const rightDiff = c === size - 1 || colors[r][c + 1] !== currentThemeColor;

    // Apply thick high contrast borders for region edges and thinner muted ones domestically.
    let classes = '';
    
    // Top border
    if (upDiff) {
      classes += ' border-t-[3.5px] border-t-slate-100 dark:border-t-slate-100 ';
    } else {
      classes += ' border-t-[0.5px] border-t-slate-900/10 dark:border-t-white/10 ';
    }

    // Bottom border
    if (downDiff) {
      classes += ' border-b-[3.5px] border-b-slate-100 dark:border-b-slate-100 ';
    } else {
      classes += ' border-b-[0.5px] border-b-slate-900/10 dark:border-b-white/10 ';
    }

    // Left border
    if (leftDiff) {
      classes += ' border-l-[3.5px] border-l-slate-100 dark:border-l-slate-100 ';
    } else {
      classes += ' border-l-[0.5px] border-l-slate-900/10 dark:border-l-white/10 ';
    }

    // Right border
    if (rightDiff) {
      classes += ' border-r-[3.5px] border-r-slate-100 dark:border-r-slate-100 ';
    } else {
      classes += ' border-r-[0.5px] border-r-slate-900/10 dark:border-r-white/10 ';
    }

    return classes;
  };

  // Count active queens placed
  const getQueensCount = () => {
    let count = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r]?.[c] === 'Q') count++;
      }
    }
    return count;
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Bar for Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="queens-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Queens</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Queens</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Crown className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha Queens</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto">
            Seu raciocínio em xeque! Posicione as rainhas sem toques ou conflitos de regimento.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['Fácil', 'Médio', 'Difícil'] as const).map(level => {
                const dims = level === 'Fácil' ? '5x5' : level === 'Médio' ? '7x7' : '9x9';
                const reward = level === 'Fácil' ? '+300 XP BP' : level === 'Médio' ? '+450 XP BP' : '+700 XP BP';
                return (
                  <button
                    id={`btn-queens-diff-${level}`}
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`relative flex items-center p-4 rounded-xl border-2 transition-all group ${
                      difficulty === level 
                        ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-black uppercase text-sm italic">{level} ({dims})</span>
                      <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                        {reward} • Exige {level === 'Fácil' ? '5' : level === 'Médio' ? '7' : '9'} Rainhas em regiões distintas
                      </span>
                    </div>
                    {difficulty === level && (
                      <motion.div 
                        layoutId="active-diff-queens"
                        className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                      />
                    )}
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
            id="start-queens-btn"
            onClick={() => setSetupComplete(true)}
            className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
          </Button>

          <Button 
            id="queens-back-to-center-btn"
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

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6">
      
      {/* Top Header Navigation */}
      <div className="w-full flex items-center mb-2 max-w-lg">
        <button 
          id="queens-back-btn"
          onClick={() => setSetupComplete(false)}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Queens</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">Dificuldade: {difficulty.toUpperCase()} | {size} x {size}</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-lg mb-2">
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

      {/* Info Status Panel */}
      <div className="w-full flex justify-between items-center max-w-lg">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Queens Score</p>
          <p className="text-xl font-black text-yellow-400">PTS: {multiplayerMode === '2p' ? p1Score + p2Score : score}</p>
        </div>

        {/* Difficulty display */}
        <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-1.5 min-w-[70px]">
          <p className="text-[7px] font-black uppercase text-slate-500 tracking-wider">Grau</p>
          <p className="text-sm font-black text-white transition-colors leading-none mt-0.5 uppercase">
            {difficulty}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ações</p>
          <p className="text-xl font-black text-white">{moves}</p>
        </div>
      </div>

      {/* Visual Timer Bar - Hidden per user request */}

      {/* Main Board Area */}
      <div className="relative w-full max-w-lg aspect-square flex items-center justify-center select-none pt-2">
        {boardData && (
          <div 
            id="queens-grid"
            className="w-full h-full max-w-[430px] max-h-[430px] grid rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-2xl p-0.5"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: size }).map((_, r) => {
              return Array.from({ length: size }).map((__, c) => {
                const cellVal = grid[r]?.[c] || null;
                const areaIndex = boardData.colors[r]?.[c] ?? 0;
                const hexColor = REGION_COLORS[areaIndex % REGION_COLORS.length];
                const bordersClass = getCellBorders(r, c);
                const isViolated = violatedCells.has(`${r}_${c}`);

                return (
                  <button
                    id={`cell-${r}-${c}`}
                    key={`${r}_${c}`}
                    onClick={() => handleCellClick(r, c)}
                    disabled={gameState !== 'playing'}
                    className={`relative flex items-center justify-center transition-all focus:outline-none select-none h-full w-full ${bordersClass}`}
                    style={{
                      // Transparent color fill
                      backgroundColor: hexColor + '35', // Alpha 35 (approx 14% opacity for elegant hue)
                    }}
                  >
                    {/* Highlight region bounds using the solid colored glow on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity"
                      style={{ backgroundColor: hexColor }}
                    />

                    {/* Cell Inner indicators */}
                    <AnimatePresence mode="popLayout">
                      {cellVal === 'X' && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-slate-500/80"
                        />
                      )}

                      {cellVal === 'Q' && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ 
                            scale: 1, 
                            rotate: 0,
                            y: isViolated ? [0, -4, 0, -4, 0] : 0,
                          }}
                          transition={{
                            y: isViolated ? { repeat: Infinity, duration: 0.6 } : undefined
                          }}
                          exit={{ scale: 0, rotate: 45 }}
                          className={`relative flex items-center justify-center w-5/6 h-5/6 rounded-2xl ${
                            isViolated 
                              ? 'bg-rose-600 border-2 border-rose-400 shadow-lg shadow-rose-600/30 text-white' 
                              : 'bg-yellow-400 border border-yellow-300 shadow-md shadow-yellow-400/20 text-slate-950'
                          }`}
                        >
                          <Crown className="w-4 h-4 md:w-5 md:h-5 text-current fill-current shrink-0" />
                          {isViolated && (
                            <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-red-600 text-white px-1 rounded-full animate-bounce">
                              ⚠️
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              });
            })}
          </div>
        )}
      </div>

      {/* Constraints Guidelines / Rule Checking */}
      <div className="w-full max-w-lg bg-slate-905 border border-slate-805/40 rounded-3xl p-5 space-y-3 shadow-md">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 select-none">
          DIRETRIZES DA MISSÃO ({getQueensCount()} / {size} RAINHAS)
        </h4>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[13px] ">{rowStatus ? '✅' : '❌'}</span>
            <span className={`font-semibold tracking-tight ${rowStatus ? 'text-slate-400' : 'text-rose-400'}`}>1 Rainha por Linha</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px]">{colStatus ? '✅' : '❌'}</span>
            <span className={`font-semibold tracking-tight ${colStatus ? 'text-slate-400' : 'text-rose-400'}`}>1 Rainha por Coluna</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px]">{colorStatus ? '✅' : '❌'}</span>
            <span className={`font-semibold tracking-tight ${colorStatus ? 'text-slate-400' : 'text-rose-400'}`}>1 Rainha por Cor (Zonas)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px]">{adjStatus ? '✅' : '❌'}</span>
            <span className={`font-semibold tracking-tight ${adjStatus ? 'text-slate-400' : 'text-rose-400'}`}>Sem Contato Adjacente</span>
          </div>
        </div>
      </div>

      {/* Action panel */}
      <div className="w-full max-w-lg grid grid-cols-3 gap-2 pt-1 font-sans">
        <button
          id="queens-reset-btn"
          onClick={startNewGame}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors py-2.5 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase text-slate-400 hover:text-white"
        >
          <RotateCcw size={14} className="mb-1" />
          Reiniciar
        </button>

        <button
          id="queens-new-btn"
          onClick={startNewGame}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors py-2.5 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase text-slate-400 hover:text-white"
        >
          <Shuffle size={14} className="mb-1" />
          Gerar Outro
        </button>

        <button
          id="queens-hint-btn"
          onClick={handleGetHint}
          disabled={gameState !== 'playing'}
          className="bg-slate-900 border border-slate-800 hover:border-slate-750 transition-colors disabled:opacity-40 py-2.5 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase text-yellow-400 hover:text-yellow-300"
        >
          <Sparkles size={14} className="mb-1" />
          Dica Sábia
        </button>
      </div>

      <div className="w-full flex justify-center mt-4">
        <Button 
          onClick={() => {
            // Salva os pontos acumulados até agora e incrementa a patrulha de forma imediata enviando à central
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'QUEENS',
              false,
              false
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* Victory and Timeout overlays at top-level container to avoid grid restrictions & transparency */}
      <AnimatePresence />

    </div>
  );
}
