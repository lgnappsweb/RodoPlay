/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';
import { 
  Car, 
  ArrowLeftRight, 
  ArrowUpDown, 
  RotateCcw, 
  Play, 
  Trophy, 
  ChevronRight, 
  AlertTriangle, 
  Info,
  ChevronLeft,
  Settings,
  X,
  Gauge,
  Maximize2
} from 'lucide-react';

interface Vehicle {
  id: string;
  row: number;
  col: number;
  size: number;
  orientation: 'H' | 'V'; // H = horizontal, V = vertical
  color: string;
  isTarget: boolean;
}

interface ParkingEscapeProps {
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
  onScoreUpdate: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

export function ParkingEscape({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: ParkingEscapeProps) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const [gameState, setGameState] = useState<'selection' | 'playing' | 'won' | 'lost'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  
  // Custom configurations
  const [gridSize, setGridSize] = useState<6 | 7 | 8>(6);
  const [targetSize, setTargetSize] = useState<2 | 3 | 4>(2);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  
  // Grid/Exit config
  const exitRow = Math.floor(gridSize / 2);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Set default dimensions when difficulty changes, but let the user override
  useEffect(() => {
    if (difficulty === 'easy') {
      setGridSize(6);
      setTargetSize(2);
      setTimeLeft(120);
    } else if (difficulty === 'medium') {
      setGridSize(7);
      setTargetSize(3);
      setTimeLeft(90);
    } else if (difficulty === 'hard') {
      setGridSize(8);
      setTargetSize(4);
      setTimeLeft(60);
    }
  }, [difficulty]);

  const getDifficultyTime = (diff: 'easy' | 'medium' | 'hard') => {
    return diff === 'easy' ? 120 : diff === 'medium' ? 90 : 60;
  };

  // Helper to generate a random background color for other vehicles
  const getRandomVehicleColor = () => {
    const colors = [
      'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-slate-600/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-slate-300',
      'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-850 border-blue-500/80 shadow-[0_4px_12px_rgba(29,78,216,0.3)] text-blue-100',
      'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-850 border-emerald-550/80 shadow-[0_4px_12px_rgba(4,120,87,0.3)] text-emerald-100',
      'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 border-amber-400/80 shadow-[0_4px_12px_rgba(217,119,6,0.3)] text-amber-100',
      'bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-850 border-violet-500/80 shadow-[0_4px_12px_rgba(109,40,217,0.3)] text-purple-100',
      'bg-gradient-to-br from-cyan-600 via-cyan-700 to-sky-850 border-cyan-550/80 shadow-[0_4px_12px_rgba(14,116,144,0.3)] text-cyan-100',
      'bg-gradient-to-br from-rose-750 via-rose-800 to-red-950 border-rose-500/80 shadow-[0_4px_12px_rgba(190,24,74,0.3)] text-rose-100',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Puzzle Board Generator Logic
  const generateLevel = (gSize: number, tSize: number) => {
    const newVehicles: Vehicle[] = [];
    
    // 1. Place the target vehicle horizontally on the exitRow
    // Position it on the left-ish side so it has blocks to traverse
    const targetCol = 0;
    const target: Vehicle = {
      id: 'target',
      row: exitRow,
      col: targetCol,
      size: tSize,
      orientation: 'H',
      color: 'bg-gradient-to-r from-red-600 via-rose-500 to-red-700 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)] text-white font-black',
      isTarget: true,
    };
    newVehicles.push(target);

    // Grid tracker to prevent overlaps
    const occupied = Array.from({ length: gSize }, () => Array(gSize).fill(false));
    
    // Mark target vehicle as occupied
    for (let i = 0; i < tSize; i++) {
      occupied[exitRow][targetCol + i] = true;
    }

    // 2. Intentionally place vertical blockers to cross the exitRow
    // We place them in columns to the right of the target vehicle's initial tail
    const minCol = targetCol + tSize;
    const maxCol = gSize - 1;

    let blockerIdCounter = 1;

    // Add 2 to 4 vertical blocker vehicles crossing the exitRow
    const numBlockers = gSize === 6 ? 2 : gSize === 7 ? 3 : 4;
    for (let col = minCol; col < maxCol; col += 2) {
      if (newVehicles.length >= numBlockers + 1) break;
      
      // Vertical vehicle crossing exitRow
      const vSize = Math.random() > 0.4 ? 3 : 2;
      // Calculate row so it crosses exitRow
      // For size 2: row starts at exitRow - 1, or exitRow
      // For size 3: row starts at exitRow - 2, exitRow - 1, or exitRow
      const minStartRow = Math.max(0, exitRow - vSize + 1);
      const maxStartRow = Math.min(gSize - vSize, exitRow);
      const startRow = Math.floor(Math.random() * (maxStartRow - minStartRow + 1)) + minStartRow;

      // Validate overlap
      let canPlace = true;
      for (let r = startRow; r < startRow + vSize; r++) {
        if (occupied[r]?.[col]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        const vehicle: Vehicle = {
          id: `blocker-${blockerIdCounter++}`,
          row: startRow,
          col: col,
          size: vSize,
          orientation: 'V',
          color: getRandomVehicleColor(),
          isTarget: false,
        };
        newVehicles.push(vehicle);
        for (let r = startRow; r < startRow + vSize; r++) {
          occupied[r][col] = true;
        }
      }
    }

    // 3. Fill other random empty areas with generic cars (of size 2 or 3)
    const totalVehiclesToPlace = gSize === 6 ? 8 : gSize === 7 ? 12 : 16;
    let attempts = 0;
    while (newVehicles.length < totalVehiclesToPlace && attempts < 100) {
      attempts++;
      const vOri = Math.random() > 0.5 ? 'H' : 'V';
      const vSize = Math.random() > 0.3 ? 2 : 3;
      const rRow = Math.floor(Math.random() * gSize);
      const rCol = Math.floor(Math.random() * gSize);

      // Check exit row constraint for horizontal vehicles
      // To prevent permanent blockade, horizontal blocks cannot be on the exitRow
      if (vOri === 'H' && rRow === exitRow) {
        continue;
      }

      // Out of bounds check
      if (vOri === 'H' && rCol + vSize > gSize) continue;
      if (vOri === 'V' && rRow + vSize > gSize) continue;

      // Overlap check
      let hasOverlap = false;
      if (vOri === 'H') {
        for (let j = 0; j < vSize; j++) {
          if (occupied[rRow][rCol + j]) {
            hasOverlap = true;
            break;
          }
        }
      } else {
        for (let j = 0; j < vSize; j++) {
          if (occupied[rRow + j][rCol]) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (!hasOverlap) {
        const vehicle: Vehicle = {
          id: `rand-${blockerIdCounter++}`,
          row: rRow,
          col: rCol,
          size: vSize,
          orientation: vOri,
          color: getRandomVehicleColor(),
          isTarget: false,
        };
        newVehicles.push(vehicle);

        if (vOri === 'H') {
          for (let j = 0; j < vSize; j++) {
            occupied[rRow][rCol + j] = true;
          }
        } else {
          for (let j = 0; j < vSize; j++) {
            occupied[rRow + j][rCol] = true;
          }
        }
      }
    }

    setVehicles(newVehicles);
  };

  // Start continuous gameplay timer
  const startGame = () => {
    setMoves(0);
    setSelectedVehicleId(null);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    setGameState('playing');
    setTimeLeft(getDifficultyTime(difficulty));
    generateLevel(gridSize, targetSize);
  };

  useEffect(() => {
    // Timer is completely disabled per user request
  }, []);

  // Movement Logic: Move selected vehicle along its orientation axis
  const moveVehicle = (vehicleId: string, direction: 'prev' | 'next') => {
    if (gameState !== 'playing') return;

    setVehicles(prevVehicles => {
      const idx = prevVehicles.findIndex(v => v.id === vehicleId);
      if (idx === -1) return prevVehicles;

      const v = prevVehicles[idx];
      const step = direction === 'prev' ? -1 : 1;
      
      const newRow = v.row + (v.orientation === 'V' ? step : 0);
      const newCol = v.col + (v.orientation === 'H' ? step : 0);

      // 1. Boundary checking
      if (v.orientation === 'H') {
        // Special case for escape: Target vehicle escapes to the right
        if (v.isTarget && direction === 'next' && newCol + v.size === gridSize + 1) {
          setTimeout(() => {
            handleLevelComplete();
          }, 300);
        } else if (newCol < 0 || newCol + v.size > gridSize) {
          return prevVehicles;
        }
      } else {
        if (newRow < 0 || newRow + v.size > gridSize) return prevVehicles;
      }

      // 2. Collision checking with other vehicles
      let collision = false;
      for (const other of prevVehicles) {
        if (other.id === v.id) continue;

        if (other.orientation === 'H') {
          // Other is horizontal (row = other.row, cols = other.col ... other.col + size - 1)
          if (v.orientation === 'H') {
            // Both horizontal, same row, check col overlap
            if (newRow === other.row) {
              const oMin = other.col;
              const oMax = other.col + other.size - 1;
              const nMin = newCol;
              const nMax = newCol + v.size - 1;
              if (nMin <= oMax && nMax >= oMin) collision = true;
            }
          } else {
            // v is vertical, other is horizontal
            const otherRow = other.row;
            const otherCols = Array.from({ length: other.size }, (_, i) => other.col + i);
            const myCol = newCol;
            const myRows = Array.from({ length: v.size }, (_, i) => newRow + i);
            if (myRows.includes(otherRow) && otherCols.includes(myCol)) {
              collision = true;
            }
          }
        } else {
          // Other is vertical (col = other.col, rows = other.row ... other.row + size - 1)
          if (v.orientation === 'H') {
            // v is horizontal, other is vertical
            const otherCol = other.col;
            const otherRows = Array.from({ length: other.size }, (_, i) => other.row + i);
            const myRow = newRow;
            const myCols = Array.from({ length: v.size }, (_, i) => newCol + i);
            if (myCols.includes(otherCol) && otherRows.includes(myRow)) {
              collision = true;
            }
          } else {
            // Both vertical, same col, check row overlap
            if (newCol === other.col) {
              const oMin = other.row;
              const oMax = other.row + other.size - 1;
              const nMin = newRow;
              const nMax = newRow + v.size - 1;
              if (nMin <= oMax && nMax >= oMin) collision = true;
            }
          }
        }

        if (collision) break;
      }

      if (collision) return prevVehicles;

      // Successful move
      setMoves(m => m + 1);
      
      const updated = [...prevVehicles];
      updated[idx] = { ...v, row: newRow, col: newCol };
      return updated;
    });
  };

  const handleLevelComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Performance score calculations
    const basePts = 300;
    const speedBonus = 0;
    const roundScore = basePts + speedBonus;
    
    const finalScore = multiplayerMode === '2p' ? p1Score + roundScore : score + roundScore;
    onComplete(
      finalScore,
      1,
      multiplayerMode === '2p',
      selectedPartner,
      multiplayerMode === '2p' ? p1Score + roundScore : score + roundScore,
      p2Score,
      'PARKING_ESCAPE',
      false,
      false
    );
  };

  const handleNextLevel = () => {
    if (multiplayerMode === '2p') {
      setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
    }
    setLevel(prev => prev + 1);
    setGameState('playing');
    setTimeLeft(getDifficultyTime(difficulty));
    generateLevel(gridSize, targetSize);
  };

  const handleFinishDeployment = () => {
    onComplete(
      gameState === 'lost' ? 0 : (multiplayerMode === '2p' ? p1Score : score),
      1,
      multiplayerMode === '2p',
      selectedPartner,
      gameState === 'lost' ? 0 : p1Score,
      gameState === 'lost' ? 0 : p2Score,
      'PARKING_ESCAPE',
      gameState === 'lost',
      false
    );
  };

  // Keyboard controls helper
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedVehicleId || gameState !== 'playing') return;
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (!vehicle) return;

      if (vehicle.orientation === 'H') {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
          moveVehicle(selectedVehicleId, 'prev');
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
          moveVehicle(selectedVehicleId, 'next');
        }
      } else {
        if (e.key === 'ArrowUp' || e.key === 'w') {
          moveVehicle(selectedVehicleId, 'prev');
        } else if (e.key === 'ArrowDown' || e.key === 's') {
          moveVehicle(selectedVehicleId, 'next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVehicleId, vehicles, gameState]);

  // Setup options render
  if (gameState === 'selection') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Header Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Pátio</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Operações</span>
          </div>
        </div>

        <div className="text-center w-full max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4 scale-105 shadow-lg">
            <Car className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Escape</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Retire a viatura em destaque do estacionamento</p>
        </div>

        {/* Nível de dificuldade selector FIRST */}
        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['easy', 'medium', 'hard'] as const).map(levelName => (
                <button
                  key={levelName}
                  onClick={() => setDifficulty(levelName)}
                  className={`relative flex items-center p-4 rounded-2xl border-2 transition-all group ${
                    difficulty === levelName 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">
                      {levelName === 'easy' ? 'Fácil' : levelName === 'medium' ? 'Médio' : 'Difícil'}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === levelName ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {levelName === 'easy' ? 'Manobras Iniciais | Pátio 6x6' : levelName === 'medium' ? 'Tráfego Médio | Pátio 7x7' : 'Batalhão Congestionado | Pátio 8x8'}
                    </span>
                  </div>
                  {difficulty === levelName && (
                    <motion.div 
                      layoutId="active-diff-escape"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Size (Pátio) Selector */}
          <div id="grid-size-selector" className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Tamanho do Pátio (Grade)</p>
            <div className="grid grid-cols-3 gap-2">
              {([6, 7, 8] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`py-3 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all ${
                    gridSize === size
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-md scale-105'
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <span>{size}x{size}</span>
                  <span className="block text-[8px] font-bold text-slate-500 lowercase mt-0.5">
                    {size === 6 ? 'Pequeno' : size === 7 ? 'Médio' : 'Grande'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Vehicle Size Selector */}
          <div id="target-size-selector" className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Comprimento do Alvo (Blocos)</p>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setTargetSize(size)}
                  className={`py-3 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all ${
                    targetSize === size
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-md scale-105'
                      : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <span>{size} Blocos</span>
                  <span className="block text-[8px] font-bold text-slate-500 lowercase mt-0.5">
                    {size === 2 ? 'Viatura' : size === 3 ? 'Van' : 'Caminhão'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
            <span className="text-yellow-400/80 font-black uppercase text-[9px] tracking-widest block">COMO JOGAR:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed italic">
              Selecione as viaturas tocando nelas e deslize o dedo ou use botões para movê-las de acordo com seu alinhamento (para cima/baixo ou lados). Libere a rota de fuga para a viatura vermelha!
            </p>
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
            onClick={startGame} 
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR OPERAÇÃO 🚀'}
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

  return (
    <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center select-none overflow-y-auto">
      {/* Top Header Controls */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <button 
          onClick={() => setGameState('selection')}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-1 items-center gap-2">
          <Gauge className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Nível {level}
          </span>
        </div>

        <button 
          onClick={startGame}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          title="Reiniciar Nível"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm mb-4">
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

      {/* Move counter and level details - replaced timeline per user request */}
      <div className="w-full max-w-sm mb-5 bg-slate-900 border border-slate-850 p-4 rounded-3xl flex justify-between items-center shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Dificuldade</span>
          <span className="text-sm font-black text-white uppercase mt-1">
            {difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Movimentos</span>
          <span className="text-xl font-black text-yellow-400 mt-1">
            {moves}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'playing' ? (
          <motion.div 
            key="board"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="flex flex-col items-center space-y-6 w-full max-w-sm"
          >
            {/* The Main Parking Lot Pátio Block Board */}
            <div className="relative w-full aspect-square bg-slate-950 border-8 border-slate-900 rounded-[2.5rem] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-visible">
              
              {/* Active Playing Area Grid Wrapper to clamp child dimensions and overflow */}
              <div id="parking-grid-container" className="relative w-full h-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800/80">
                
                {/* 1. Mathematical Background Grid Cells */}
                {Array.from({ length: gridSize }).map((_, r) => 
                  Array.from({ length: gridSize }).map((_, c) => {
                    const isExitRow = r === exitRow;
                    const top = r * (100 / gridSize);
                    const left = c * (100 / gridSize);
                    const cellSize = 100 / gridSize;
                    return (
                      <div
                        key={`bcell-${r}-${c}`}
                        className="absolute p-0.5 pointer-events-none"
                        style={{
                          top: `${top}%`,
                          left: `${left}%`,
                          width: `${cellSize}%`,
                          height: `${cellSize}%`,
                        }}
                      >
                        <div 
                          className={`w-full h-full rounded-xl flex items-center justify-center border transition-all ${
                            isExitRow 
                              ? 'bg-red-950/15 border-red-500/15 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]' 
                              : 'bg-slate-950/40 border-slate-900/40 shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]'
                          }`}
                        >
                          {/* Inner crosshair/parking slot marking */}
                          <div className={`w-1.5 h-1.5 rounded-full ${isExitRow ? 'bg-red-500/25' : 'bg-slate-705/30'}`} />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* 2. Floating Escape Route Exit Marker Indicator */}
                <div 
                  className="absolute right-0 z-20 pointer-events-none"
                  style={{
                    top: `${exitRow * (100 / gridSize)}%`,
                    height: `${100 / gridSize}%`,
                    width: '20px'
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-l from-red-600/35 to-transparent border-r-[3px] border-red-500 animate-pulse flex items-center justify-end pr-0.5">
                    <span className="text-[7px] font-black text-red-500/90 tracking-tighter leading-none whitespace-nowrap uppercase -rotate-90">
                      SAÍDA
                    </span>
                  </div>
                </div>

                {/* 3. Render Interactive Vehicles */}
                {vehicles.map(v => {
                  const isSelected = selectedVehicleId === v.id;
                  const cellSize = 100 / gridSize;
                  
                  // Position calculations
                  const top = v.row * cellSize;
                  const left = v.col * cellSize;
                  const width = v.orientation === 'H' ? v.size * cellSize : cellSize;
                  const height = v.orientation === 'V' ? v.size * cellSize : cellSize;

                  return (
                    <motion.div
                      key={v.id}
                      onPointerDown={(e) => {
                        dragStartRef.current = { x: e.clientX, y: e.clientY };
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        setSelectedVehicleId(v.id);
                      }}
                      onPointerUp={(e) => {
                        if (!dragStartRef.current) return;
                        const deltaX = e.clientX - dragStartRef.current.x;
                        const deltaY = e.clientY - dragStartRef.current.y;
                        dragStartRef.current = null;
                        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

                        const dragThreshold = 25; // flick sensitivity
                        if (v.orientation === 'H') {
                          if (Math.abs(deltaX) > dragThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                            if (deltaX > 0) {
                              moveVehicle(v.id, 'next');
                            } else {
                              moveVehicle(v.id, 'prev');
                            }
                          }
                        } else {
                          if (Math.abs(deltaY) > dragThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
                            if (deltaY > 0) {
                              moveVehicle(v.id, 'next');
                            } else {
                              moveVehicle(v.id, 'prev');
                            }
                          }
                        }
                      }}
                      className="absolute p-0.5 transition-shadow duration-300 cursor-pointer touch-none select-none"
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        zIndex: isSelected ? 30 : 10
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Outer beautiful styled vehicle shell */}
                      <div 
                        className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all ${v.color} ${
                          isSelected 
                            ? 'ring-4 ring-yellow-400 border-yellow-300 scale-[1.01] shadow-[0_0_20px_rgba(250,204,21,0.4)]' 
                            : 'hover:border-slate-350 shadow-md'
                        }`}
                      >
                        {/* 3A. Cyberpunk Bumper Lights (Faroletes) on Ends */}
                        {v.orientation === 'H' ? (
                          <>
                            {/* Headlights (left side) */}
                            <div className="absolute left-1.5 top-1 bottom-1 w-1 flex flex-col justify-between pointer-events-none opacity-90 py-0.5">
                              <span className="w-1 h-1 rounded-full bg-yellow-250 shadow-[0_0_6px_#fef08a]" />
                              <span className="w-1 h-1 rounded-full bg-yellow-250 shadow-[0_0_6px_#fef08a]" />
                            </div>
                            {/* Taillights (right side) */}
                            <div className="absolute right-1.5 top-1 bottom-1 w-1 flex flex-col justify-between pointer-events-none opacity-90 py-0.5">
                              <span className="w-1 h-1 rounded-[1px] bg-red-500 shadow-[0_0_6px_#ef4444]" />
                              <span className="w-1 h-1 rounded-[1px] bg-red-500 shadow-[0_0_6px_#ef4444]" />
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Headlights (top side) */}
                            <div className="absolute top-1.5 left-1 right-1 h-1 flex justify-between pointer-events-none opacity-90 px-0.5">
                              <span className="w-1 h-1 rounded-full bg-yellow-250 shadow-[0_0_6px_#fef08a]" />
                              <span className="w-1 h-1 rounded-full bg-yellow-250 shadow-[0_0_6px_#fef08a]" />
                            </div>
                            {/* Taillights (bottom side) */}
                            <div className="absolute bottom-1.5 left-1 right-1 h-1 flex justify-between pointer-events-none opacity-90 px-0.5">
                              <span className="w-1 h-1 rounded-[1px] bg-red-500 shadow-[0_0_6px_#ef4444]" />
                              <span className="w-1 h-1 rounded-[1px] bg-red-500 shadow-[0_0_6px_#ef4444]" />
                            </div>
                          </>
                        )}

                        {/* 3B. High-Contrast cabin windshield decal */}
                        <div 
                          className={`absolute bg-slate-950/75 backdrop-blur-sm border border-white/10 rounded-xl pointer-events-none shadow-inner flex items-center justify-center ${
                            v.orientation === 'H' 
                              ? 'inset-y-2 left-[18%] right-[18%]' 
                              : 'inset-x-2 top-[18%] bottom-[18%]'
                          }`}
                        >
                          {/* Siren flashing details for target breakout patrulha */}
                          {v.isTarget ? (
                            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-750 rounded px-1.5 py-0.5 animate-pulse shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-550 shadow-[0_0_8px_#ef4444] animate-ping" />
                              <span className="text-[7px] font-black uppercase tracking-widest text-red-400">ALVO</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-550 shadow-[0_0_8px_#3b82f6]" />
                            </div>
                          ) : (
                            <div className="opacity-95 text-white/45">
                              {v.orientation === 'H' ? (
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3C. Custom target labeling */}
                        {v.isTarget && (
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-black tracking-widest text-red-300 opacity-90 leading-none whitespace-nowrap uppercase">
                            PATRULHA FUGITIVA
                          </div>
                        )}

                        {/* Direction Helpers arrow overlay on selected */}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-between pointer-events-none z-50">
                            {v.orientation === 'H' ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveVehicle(v.id, 'prev');
                                  }}
                                  className="absolute left-1 pointer-events-auto w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-300 border border-slate-900 text-slate-900 flex items-center justify-center shadow-lg active:scale-90 font-black text-xs"
                                >
                                  ◀
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveVehicle(v.id, 'next');
                                  }}
                                  className="absolute right-1 pointer-events-auto w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-300 border border-slate-900 text-slate-900 flex items-center justify-center shadow-lg active:scale-90 font-black text-xs"
                                >
                                  ▶
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveVehicle(v.id, 'prev');
                                  }}
                                  className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-auto w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-300 border border-slate-900 text-slate-900 flex items-center justify-center shadow-lg active:scale-90 font-black text-xs"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveVehicle(v.id, 'next');
                                  }}
                                  className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-auto w-7 h-7 rounded-full bg-yellow-400 hover:bg-yellow-300 border border-slate-900 text-slate-900 flex items-center justify-center shadow-lg active:scale-90 font-black text-xs"
                                >
                                  ▼
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Instruções Simplificadas */}
            <div className="text-center w-full py-1">
              {selectedVehicleId ? (
                <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider leading-relaxed">
                  Use as <span className="text-yellow-400 font-extrabold">setas amarelas ▲▼◀▶</span> no veículo selecionado para movê-lo!
                </p>
              ) : (
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-relaxed">
                  👉 Toque em qualquer veículo para selecioná-lo e movê-lo
                </p>
              )}
            </div>
          </motion.div>
        ) : gameState === 'won' ? (
          <motion.div 
            key="won"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-slate-900 border-2 border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-fade-in"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
              <Trophy className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-emerald-400 uppercase leading-none italic">Fuga Concluída!</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Viatura Principal Resgatada</p>
            </div>

            {/* Performance board card */}
            <div className="w-full bg-slate-950/60 rounded-2xl border border-slate-850 p-4">
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Total de Movimentos:</span>
                <span className="font-bold text-white">{moves}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Bônus de Tempo:</span>
                <span className="font-bold text-yellow-400">+0 pts</span>
              </div>
              <div className="border-t border-slate-800 my-2 pt-2 flex justify-between text-xs font-bold uppercase">
                <span className="text-emerald-400">Pontuação de Carreira:</span>
                <span className="font-extrabold text-white">{multiplayerMode === '2p' ? p1Score + p2Score : score} pts</span>
              </div>
            </div>

            {/* Standard Score Box (Pontos Ganhos) */}
            <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-sans">Pontos Ganhos</span>
               <span className="text-3xl font-black text-emerald-400 font-mono block">+300 XP</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button
                onClick={handleNextLevel}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase text-xs rounded-2xl tracking-wider active:scale-95 transition-all"
              >
                PRÓXIMO NÍVEL 🚀
              </Button>

              <Button
                onClick={handleFinishDeployment}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>

              <Button
                onClick={() => {
                  setLevel(1);
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setMoves(0);
                  setGameState('selection');
                }}
                variant="outline"
                className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
              >
                TENTAR NOVAMENTE 🔁
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="lost"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-slate-900 border-2 border-red-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-6 text-center shadow-[0_0_30px_rgba(239,68,68,0.1)]"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-slate-950 border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                <span className="text-4xl">⏱️</span>
              </div>
              <span className="absolute -top-1 -right-1 text-xl">🚨</span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">FALHA NA INSPEÇÃO</span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Inspeção Interrompida</h3>
              <p className="text-slate-400 text-xs leading-relaxed italic">
                O tempo regulamentar para concluir esta inspeção expirou. Nenhum ponto de vistoria foi faturado nesta jogada.
              </p>
            </div>

            {/* Score box */}
            <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-sans">Pontos Ganhos</span>
              <span className="text-3xl font-black text-red-500 font-mono block">0 XP</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button
                onClick={handleFinishDeployment}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>

              <Button
                onClick={() => {
                  setGameState('selection');
                  setShowAbandonModal(false);
                }}
                variant="outline"
                className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
              >
                TENTAR NOVAMENTE 🔁
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAbandonModal && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl relative"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-slate-950 border-2 border-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <span className="text-4xl animate-pulse">🏁</span>
              </div>
              <span className="absolute -top-1 -right-1 text-xl">🚨</span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-yellow-505 uppercase">PATRULHA ABANDONADA</span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Pontos Salvos!</h3>
              <p className="text-slate-400 text-xs leading-relaxed italic">
                Sua patrulha foi encerrada com sucesso. Todos os pontos conquistados até o momento foram carregados e computados em seu saldo de carreira:
              </p>
            </div>

            {/* Score box */}
            <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Pontos Ganhos</span>
              <span className="text-3xl font-black text-yellow-400 font-mono block">
                {multiplayerMode === '2p' ? p1Score + p2Score : score} XP
              </span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={onCancel} 
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={() => {
                  setGameState('selection');
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setMoves(0);
                  setShowAbandonModal(false);
                }} 
                variant="outline" 
                className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
              >
                TENTAR NOVAMENTE 🔁
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mt-8 w-full max-w-sm flex flex-col items-center">
        {gameState === 'playing' ? (
          <Button 
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              // Salva os pontos conquistados até agora de forma imediata enviando à central
              onComplete(
                multiplayerMode === '2p' ? p1Score : score,
                1,
                multiplayerMode === '2p',
                selectedPartner,
                p1Score,
                p2Score,
                'PARKING_ESCAPE',
                false,
                false
              );
            }}
            className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
          >
            ABANDONAR PATRULHA
          </Button>
        ) : (
          <Button 
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              onCancel();
            }}
            className="px-6 h-12 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-850 rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
          >
            VOLTAR À CENTRAL DE JOGOS
          </Button>
        )}
      </div>
    </div>
  );
}
