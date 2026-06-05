/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, RotateCcw, AlertTriangle, CheckCircle, HelpCircle, Sparkles, Grid, Trash2, Check } from 'lucide-react';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';

interface SudokuGameProps {
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

export function SudokuGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: SudokuGameProps) {
  // Setup configuration state
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
  const [setupComplete, setSetupComplete] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  
  // Board states
  const [size, setSize] = useState<number>(4); // 4 for 4x4, 6 for 6x6, 9 for 9x9
  const [subgridW, setSubgridW] = useState<number>(2); // W x H subgrids
  const [subgridH, setSubgridH] = useState<number>(2);
  
  const [solvedGrid, setSolvedGrid] = useState<number[][]>([]);
  const [initialGrid, setInitialGrid] = useState<number[][]>([]);
  const [playerGrid, setPlayerGrid] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  
  // Game metrics
  const [errors, setErrors] = useState(0);
  const maxErrors = 3;
  const [timeLeft, setTimeLeft] = useState(180);
  const [maxTime, setMaxTime] = useState(180);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'failed' | 'summary'>('playing');
  
  const [showVictoryCard, setShowVictoryCard] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Configure sizes and subgrid specs based on difficulty
  useEffect(() => {
    if (difficulty === 'Fácil') {
      setSize(4);
      setSubgridW(2);
      setSubgridH(2);
      setMaxTime(120);
      setTimeLeft(120);
    } else if (difficulty === 'Médio') {
      setSize(6);
      setSubgridW(3);
      setSubgridH(2);
      setMaxTime(180);
      setTimeLeft(180);
    } else {
      setSize(9);
      setSubgridW(3);
      setSubgridH(3);
      setMaxTime(300);
      setTimeLeft(300);
    }
  }, [difficulty]);

  // Backtracking Solver check
  const isValid = (board: number[][], r: number, c: number, val: number, W: number, H: number, N: number): boolean => {
    // Row check
    for (let col = 0; col < N; col++) {
      if (col !== c && board[r][col] === val) return false;
    }
    // Col check
    for (let row = 0; row < N; row++) {
      if (row !== r && board[row][c] === val) return false;
    }
    // Subgrid check
    const br = Math.floor(r / H) * H;
    const bc = Math.floor(c / W) * W;
    for (let row = br; row < br + H; row++) {
      for (let col = bc; col < bc + W; col++) {
        if ((row !== r || col !== c) && board[row][col] === val) return false;
      }
    }
    return true;
  };

  // Backtracking Filler
  const fillBoard = (board: number[][], N: number, W: number, H: number): boolean => {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === 0) {
          const nums = Array.from({ length: N }, (_, i) => i + 1);
          // Shuffle
          for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
          }
          for (const val of nums) {
            if (isValid(board, r, c, val, W, H, N)) {
              board[r][c] = val;
              if (fillBoard(board, N, W, H)) {
                return true;
              }
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  // Generate Sudoku puzzle
  const startNewGame = () => {
    const N = size;
    const W = subgridW;
    const H = subgridH;

    // 1. Create a fully solved grid
    const solved: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    fillBoard(solved, N, W, H);
    
    // 2. Clone solved board to strip out answers based on difficulty
    const initial: number[][] = solved.map(row => [...row]);
    
    // Define numbers of cells to clear
    let cellsToClear = 8; // 4x4 default
    if (N === 4) {
      cellsToClear = difficulty === 'Fácil' ? 7 : difficulty === 'Médio' ? 9 : 11;
    } else if (N === 6) {
      cellsToClear = difficulty === 'Fácil' ? 14 : difficulty === 'Médio' ? 19 : 24;
    } else {
      cellsToClear = difficulty === 'Fácil' ? 35 : difficulty === 'Médio' ? 45 : 55;
    }

    let cleared = 0;
    while (cleared < cellsToClear) {
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      if (initial[r][c] !== 0) {
        initial[r][c] = 0;
        cleared++;
      }
    }

    setSolvedGrid(solved);
    setInitialGrid(initial);
    setPlayerGrid(initial.map(row => [...row]));
    setSelectedCell(null);
    setErrors(0);
    setGameState('playing');
    setShowVictoryCard(false);
  };

  // Trigger game start when setup completes
  useEffect(() => {
    if (setupComplete) {
      startNewGame();
    }
  }, [setupComplete, size, subgridW, subgridH]);

  // Handle Tick Timer - disabled per user request
  useEffect(() => {
    // No timer countdown
  }, []);

  // Insert a digit into the selected cell
  const handleInsertNumber = (num: number) => {
    if (gameState !== 'playing' || !selectedCell) return;
    const { r, c } = selectedCell;

    // Check if original prefilled cell is locked
    if (initialGrid[r][c] !== 0) return;

    // If typing the correct number
    const isCorrect = num === solvedGrid[r][c];
    
    const updated = playerGrid.map((row, ri) => 
      row.map((val, ci) => (ri === r && ci === c ? num : val))
    );
    setPlayerGrid(updated);

    if (num !== 0 && !isCorrect) {
      // Infraction check!
      playGameSfx('incorrect');
      const newErrors = errors + 1;
      setErrors(newErrors);
      if (newErrors >= maxErrors) {
        onComplete(
          0,
          1,
          false,
          null,
          0,
          0,
          'SUDOKU',
          true,
          false
        );
      }
    } else {
      // Check for structural absolute board victory condition
      let isFilledCorrectly = true;
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (updated[row][col] !== solvedGrid[row][col]) {
            isFilledCorrectly = false;
            break;
          }
        }
      }

      if (isFilledCorrectly) {
        handleVictoryAction();
      } else {
        if (num !== 0) {
          playGameSfx('correct');
          triggerGameConfetti();
        }
      }
    }
  };

  const handleVictoryAction = () => {
    setGameState('summary');
    playGameSfx('win');
    triggerGameConfetti();
    
    // Reward settings based on difficulty
    const finalScore = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
    if (onScoreUpdate) onScoreUpdate(finalScore);
  };

  // Wise hint: fill in one missing cell correctly
  const handleGetHint = () => {
    if (gameState !== 'playing') return;

    // Identify empty or incorrect cells
    const potentialCells: { r: number; c: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (initialGrid[r][c] === 0 && playerGrid[r][c] !== solvedGrid[r][c]) {
          potentialCells.push({ r, c });
        }
      }
    }

    if (potentialCells.length === 0) return;

    // Randomize selecting one
    const randomPick = potentialCells[Math.floor(Math.random() * potentialCells.length)];
    const correctVal = solvedGrid[randomPick.r][randomPick.c];

    const updated = playerGrid.map((row, r) => 
      row.map((val, c) => (r === randomPick.r && c === randomPick.c ? correctVal : val))
    );
    setPlayerGrid(updated);
    setSelectedCell(randomPick);

    // Verify if complete now
    let isFilledCorrectly = true;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (updated[row][col] !== solvedGrid[row][col]) {
          isFilledCorrectly = false;
          break;
        }
      }
    }

    if (isFilledCorrectly) {
      handleVictoryAction();
    }
  };

  // Instant solve for debug or fast rescue completion
  const handleRevealSolution = () => {
    if (gameState !== 'playing') return;
    setPlayerGrid(solvedGrid.map(row => [...row]));
    handleVictoryAction();
  };

  // Format countdown ticker e.g. "02:45"
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Setup configuration rendering
  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Header navigation bar */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="sudoku-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Vistoria Tática</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Sudoku</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Grid className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Sudoku Tático</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto">
            Matriz lógica de preenchimento de vias. Distribua os índices operacionais sem redundâncias.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Grau de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['Fácil', 'Médio', 'Difícil'] as const).map(level => {
                const dims = level === 'Fácil' ? 'Grade 4x4' : level === 'Médio' ? 'Grade 6x6' : 'Grade 9x9';
                const reward = level === 'Fácil' ? '+300 XP BP' : level === 'Médio' ? '+450 XP BP' : '+700 XP BP';
                const countDetails = level === 'Fácil' ? 'Números 1 a 4' : level === 'Médio' ? 'Números 1 a 6' : 'Números 1 a 9';
                return (
                  <button
                    id={`btn-sudoku-diff-${level}`}
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
                        {reward} • Preencha com {countDetails} sem conflitos de fila
                      </span>
                    </div>
                    {difficulty === level && (
                      <motion.div 
                        layoutId="active-diff-sudoku"
                        className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            id="start-sudoku-btn"
            onClick={() => setSetupComplete(true)}
            className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/10 active:scale-95 transition-all select-none cursor-pointer"
          >
            INICIAR VISTORIA DE VIA 🚀
          </button>

          <button 
            id="sudoku-back-to-center-btn"
            onClick={onCancel}
            className="w-full h-12 rounded-2xl border-2 border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95 select-none cursor-pointer"
          >
            VOLTAR À CENTRAL DE JOGOS
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'summary') {
    const finalScore = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center pt-10 pb-20 select-none overflow-y-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-xl shadow-yellow-500/10 text-center space-y-6"
        >
          {/* Trophy Header */}
          <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-4xl font-sans">🏆</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter text-yellow-400 font-sans">Sudoku Superado!</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest font-sans">Fluxo operacional ordenado com êxito absoluto!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-left w-full font-sans">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Dificuldade</span>
              <span className="text-xs font-black text-white uppercase italic">{difficulty}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Resultado de Erros</span>
              <span className="text-xs font-black text-yellow-400 font-mono">{errors} / {maxErrors} ⚠️</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl col-span-2 text-center font-sans">
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pontuação de Vistoria</span>
              <span className="text-4xl font-extrabold text-yellow-400 font-mono tracking-tighter">{finalScore} <span className="text-xs uppercase text-slate-500">XP</span></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                onComplete(
                  finalScore,
                  1,
                  false,
                  null,
                  0,
                  0,
                  'SUDOKU',
                  false,
                  true // keepInGameSelection
                );
                
                const nextDiff = difficulty === 'Fácil' ? 'Médio' : (difficulty === 'Médio' ? 'Difícil' : 'Fácil');
                setDifficulty(nextDiff);
                setSetupComplete(false);
                setGameState('playing');
              }}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              PRÓXIMO NÍVEL ⚡
            </Button>

            <Button 
              id="finish-sudoku-btn"
              onClick={() => {
                onComplete(
                  finalScore,
                  1,
                  false,
                  null,
                  0,
                  0,
                  'SUDOKU',
                  false,
                  false
                );
                onCancel();
              }}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              FINALIZAR PARTIDA 🏁
            </Button>

            <Button
              onClick={() => {
                onComplete(
                  finalScore,
                  1,
                  false,
                  null,
                  0,
                  0,
                  'SUDOKU',
                  false,
                  false
                );
                onCancel();
              }}
              variant="outline"
              className="w-full h-12 border-slate-705 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer hover:text-white"
            >
              Voltar à Central de Jogos
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Gameplay rendering
  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6 select-none overflow-y-auto">
      
      {/* Top Navigation Bar */}
      <div className="w-full flex items-center mb-2 max-w-lg">
        <button 
          id="sudoku-game-back-btn"
          onClick={() => {
            const finalScore = gameState === 'victory' ? (difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700) : 0;
            // Salva os pontos acumulados até agora e incrementa a patrulha de forma imediata enviando à central
            onComplete(
              finalScore,
              1,
              false,
              null,
              0,
              0,
              'SUDOKU',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ml-4 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/15">SUDOKU {size}x{size}</span>
            <span className="text-[8px] font-black text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-2 py-0.5 rounded uppercase tracking-wider">{difficulty}</span>
          </div>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1 font-mono">
            VISTORIA TÁTICA OPERACIONAL DE FLUXO
          </p>
        </div>
      </div>

      {/* Stats row bar (Time, Errors permitted) */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-3 font-mono">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-center items-center relative overflow-hidden">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Metodologia</span>
          <span className="text-sm font-black mt-1 text-emerald-400 uppercase tracking-widest leading-none">
            🔍 AUTO-REGENTE
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-center items-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Registro de Infrações</span>
          <span className={`text-xl font-black mt-0.5 ${errors > 1 ? 'text-red-500' : errors > 0 ? 'text-yellow-500' : 'text-emerald-500'}`}>
            ⚠️ {errors}/{maxErrors} ERROS
          </span>
        </div>
      </div>

      {/* Board Containment area */}
      <div className="relative w-full max-w-lg flex flex-col items-center justify-center">
        {playerGrid.length > 0 && (
          <div 
            id="sudoku-grid"
            className="w-full max-w-[430px] aspect-square grid rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-2xl p-1"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {playerGrid.map((row, r) => {
              return row.map((val, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isOriginal = initialGrid[r][c] !== 0;
                const isValCorrect = playerGrid[r][c] === solvedGrid[r][c];
                
                // Styling borders helper based on W x H boxes
                const requiresThickRight = (c + 1) % subgridW === 0 && c !== size - 1;
                const requiresThickBottom = (r + 1) % subgridH === 0 && r !== size - 1;

                let borderClasses = "border border-slate-800/80";
                if (requiresThickRight) borderClasses += " !border-r-[3.5px] !border-r-slate-300 dark:!border-r-slate-300";
                if (requiresThickBottom) borderClasses += " !border-b-[3.5px] !border-b-slate-300 dark:!border-b-slate-300";

                // Cell value background indicator colors
                let cellColorStyle = isOriginal 
                  ? "text-slate-400 font-black bg-slate-950/20" 
                  : (val !== 0 
                     ? (isValCorrect ? "text-indigo-400 font-extrabold bg-indigo-500/10" : "text-rose-400 font-black bg-rose-500/10 animate-shake")
                     : "text-slate-400 bg-slate-900");

                if (isSelected) {
                  cellColorStyle = "bg-yellow-400 text-slate-950 font-black flex animate-pulse";
                }

                // Subtitle/Value sizes
                const textClassSize = size === 9 ? 'text-base' : size === 6 ? 'text-xl' : 'text-2xl';

                return (
                  <button
                    id={`sudoku-cell-${r}-${c}`}
                    key={`${r}_${c}`}
                    onClick={() => {
                      if (gameState === 'playing') {
                        setSelectedCell({ r, c });
                      }
                    }}
                    disabled={gameState !== 'playing'}
                    className={`relative flex items-center justify-center transition-all focus:outline-none select-none h-full w-full ${borderClasses} ${cellColorStyle} cursor-pointer`}
                  >
                    <span className={`${textClassSize} tracking-tighter uppercase font-mono`}>
                      {val !== 0 ? val : ''}
                    </span>
                    {/* Locked identifier visual badge for first numbers */}
                    {isOriginal && (
                      <div className="absolute top-0.5 left-1 text-[5px] text-slate-600 tracking-tighter uppercase font-sans scale-75 select-none font-bold">
                        🔒 FIXO
                      </div>
                    )}
                  </button>
                );
              });
            })}
          </div>
        )}

        {/* Victory Screen Modal overlay within the Active Grid */}
        <AnimatePresence />
      </div>

      {/* Styled Interactive Number Pad Selector */}
      {gameState === 'playing' && (
        <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-center items-center">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 select-none">
            {selectedCell 
              ? `SELECIONAR DIGITO PARA A CÉLULA (${selectedCell.r + 1}, ${selectedCell.c + 1})` 
              : "TOQUE EM UMA CÉLULA DO BANCO PRIMEIRO"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: size }, (_, i) => i + 1).map(num => {
              const occurrences = playerGrid.flat().filter(x => x === num).length;
              const isCompletedNum = occurrences >= size;
              return (
                <button
                  id={`sudoku-numpad-btn-${num}`}
                  key={num}
                  disabled={!selectedCell}
                  onClick={() => handleInsertNumber(num)}
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-xl font-mono text-sm font-black transition-all border shrink-0 ${
                    !selectedCell 
                      ? 'opacity-30 bg-slate-950 border-slate-800 text-slate-600' 
                      : (isCompletedNum 
                         ? 'bg-slate-800 border-slate-700 text-slate-500 line-through' 
                         : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white cursor-pointer active:scale-95')
                  }`}
                >
                  {num}
                </button>
              );
            })}
            
            {/* Erase / Clear Button */}
            <button
              id="sudoku-numpad-clear-btn"
              disabled={!selectedCell}
              onClick={() => handleInsertNumber(0)}
              className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all border shrink-0 ${
                !selectedCell 
                  ? 'opacity-30 bg-slate-950 border-slate-800 text-slate-600' 
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 cursor-pointer active:scale-95'
              }`}
              title="Apagar Número"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Constraints Guidelines / Rule check indicators */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-md">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
          DIRETRIZES DA MISSÃO OPERACIONAL
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] uppercase font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>✅</span>
            <span>Sem duplicações de linha</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>✅</span>
            <span>Sem duplicações de coluna</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>✅</span>
            <span>Regiões WxH exclusivas</span>
          </div>
        </div>
      </div>

      {/* Action buttons footer drawer */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-2 pt-1 font-sans">
        <button
          id="sudoku-reset-btn"
          onClick={startNewGame}
          disabled={gameState !== 'playing'}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-all py-2.5 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase text-slate-400 hover:text-white cursor-pointer active:scale-95"
        >
          <RotateCcw size={14} className="mb-1" />
          Reiniciar
        </button>

        <button
          id="sudoku-hint-btn"
          onClick={handleGetHint}
          disabled={gameState !== 'playing'}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-all py-2.5 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase text-yellow-400 hover:text-yellow-300 cursor-pointer active:scale-95"
        >
          <Sparkles size={14} className="mb-1 animate-bounce" />
          Preencher Célula
        </button>
      </div>

      <div className="w-full flex justify-center mt-4">
        <Button 
          id="abandon-sudoku-btn"
          onClick={() => {
            const finalScore = gameState === 'victory' ? (difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700) : 0;
            // Salva os pontos acumulados até agora e incrementa a patrulha de forma imediata enviando à central
            onComplete(
              finalScore,
              1,
              false,
              null,
              0,
              0,
              'SUDOKU',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

    </div>
  );
}
