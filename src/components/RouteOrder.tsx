/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Map, ArrowLeft, Plus, Minus, Check, Timer, Sparkles, Play } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface RouteOrderProps {
  onComplete: (
    score: number, 
    roundsPlayed?: number,
    isMultiplayer?: boolean,
    partner?: any,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

interface PointObject {
  id: number;
  x: number;
  y: number;
  value: number;
  clicked: boolean;
  colorIndex: number;
  toneOffset?: number;
  hueOffset?: number;
}

const COLOR_PALETTE = [
  { name: 'Vermelho', h: 0, s: 85, l: 58 },
  { name: 'Azul', h: 217, s: 91, l: 60 },
  { name: 'Verde', h: 142, s: 72, l: 45 },
  { name: 'Amarelo', h: 45, s: 93, l: 47 },
  { name: 'Roxo', h: 270, s: 91, l: 60 },
  { name: 'Laranja', h: 24, s: 95, l: 53 },
  { name: 'Rosa', h: 330, s: 81, l: 60 },
  { name: 'Ciano', h: 189, s: 94, l: 43 },
  { name: 'Lima', h: 84, s: 81, l: 44 },
  { name: 'Índigo', h: 239, s: 84, l: 66 },
  { name: 'Teal', h: 173, s: 80, l: 40 },
  { name: 'Violeta', h: 258, s: 90, l: 60 },
  { name: 'Âmbar', h: 38, s: 92, l: 50 },
  { name: 'Cereja', h: 348, s: 89, l: 60 },
  { name: 'Fúcsia', h: 292, s: 84, l: 58 },
  { name: 'Esmeralda', h: 162, s: 94, l: 32 },
  { name: 'Céu Azul', h: 199, s: 89, l: 48 },
  { name: 'Ardósia', h: 215, s: 19, l: 38 },
  { name: 'Marrom', h: 20, s: 78, l: 28 },
  { name: 'Lavanda', h: 267, s: 83, l: 73 },
];

const getPointHSL = (p: PointObject) => {
  const baseColor = COLOR_PALETTE[p.colorIndex] || COLOR_PALETTE[0];
  const h = (baseColor.h + (p.hueOffset || 0) + 360) % 360;
  const s = baseColor.s;
  const l = Math.max(15, Math.min(88, baseColor.l + (p.toneOffset || 0)));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const getPointsCount = (type: 'numeros' | 'letras' | 'cores', diff: 'easy' | 'medium' | 'hard', customNumColors: number) => {
  if (type === 'cores') {
    return customNumColors;
  }
  return diff === 'easy' ? 9 : diff === 'medium' ? 18 : 27;
};

export function RouteOrder({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: RouteOrderProps) {
  const [gameState, setGameState] = useState<'selection' | 'playing'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [gameType, setGameType] = useState<'numeros' | 'letras' | 'cores'>('numeros');
  const [numColors, setNumColors] = useState<number>(5);
  const [colorPhase, setColorPhase] = useState<'memorize' | 'playing'>('memorize');
  
  const [points, setPoints] = useState<PointObject[]>([]);
  const [nextValue, setNextValue] = useState(1);
  const [score, setScore] = useState(0);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const [baseTime, setBaseTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRevealing, setIsRevealing] = useState(false);
  const [wrongPointId, setWrongPointId] = useState<number | null>(null);
  
  const totalRounds = 20;

  useEffect(() => {
    if (gameState === 'playing') {
      generateRoute();
    }
  }, [gameState, currentRound]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (gameType === 'cores' && colorPhase === 'memorize') return;
    if (isTimeOut) return;
    
    if (timeLeft <= 0) {
      setIsTimeOut(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, gameState, gameType, colorPhase, isTimeOut]);

  const generateRoute = () => {
    const numPoints = getPointsCount(gameType, difficulty, numColors);

    // Create a shuffled array of color indices to ensure each round has a completely different randomized color order
    const shuffledColorIndices = Array.from({ length: COLOR_PALETTE.length }, (_, i) => i);
    for (let i = shuffledColorIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledColorIndices[i];
      shuffledColorIndices[i] = shuffledColorIndices[j];
      shuffledColorIndices[j] = temp;
    }

    const newPoints: PointObject[] = [];
    const minD = gameType === 'cores' 
      ? Math.max(7, 18 - numPoints * 0.5) 
      : Math.max(6, 16 - numPoints * 0.35);
    let attempts = 0;
    while (newPoints.length < numPoints && attempts < 500) {
      const px = 10 + Math.random() * 80;
      const py = 10 + Math.random() * 80;
      const tooClose = newPoints.some(p => {
        const dx = p.x - px;
        const dy = p.y - py;
        return Math.sqrt(dx*dx + dy*dy) < minD;
      });
      if (!tooClose) {
        const colorIndex = shuffledColorIndices[newPoints.length % shuffledColorIndices.length];
        const candidate = COLOR_PALETTE[colorIndex];
        
        // Find existing similar colors to vary the tone
        const similarCount = newPoints.filter(existP => {
          const existColor = COLOR_PALETTE[existP.colorIndex];
          const diff = Math.abs(existColor.h - candidate.h);
          return diff < 24 || diff > 336;
        }).length;

        let toneOffset = 0;
        let hueOffset = 0;
        if (similarCount > 0) {
          if (similarCount === 1) {
            toneOffset = -22; // dark tone
          } else if (similarCount === 2) {
            toneOffset = +20; // light tone
          } else {
            toneOffset = (similarCount % 2 === 0) ? -32 : +30;
            hueOffset = (similarCount % 2 === 0) ? 15 : -15;
          }
        }

        newPoints.push({
          id: newPoints.length,
          x: px,
          y: py,
          value: newPoints.length + 1,
          clicked: false,
          colorIndex,
          toneOffset,
          hueOffset
        });
      }
      attempts++;
    }
    while (newPoints.length < numPoints) {
      const colorIndex = shuffledColorIndices[newPoints.length % shuffledColorIndices.length];
      const candidate = COLOR_PALETTE[colorIndex];
      const similarCount = newPoints.filter(existP => {
        const existColor = COLOR_PALETTE[existP.colorIndex];
        const diff = Math.abs(existColor.h - candidate.h);
        return diff < 24 || diff > 336;
      }).length;

      let toneOffset = 0;
      let hueOffset = 0;
      if (similarCount > 0) {
        if (similarCount === 1) {
          toneOffset = -22;
        } else if (similarCount === 2) {
          toneOffset = +20;
        } else {
          toneOffset = (similarCount % 2 === 0) ? -32 : +30;
          hueOffset = (similarCount % 2 === 0) ? 15 : -15;
        }
      }

      newPoints.push({
        id: newPoints.length,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        value: newPoints.length + 1,
        clicked: false,
        colorIndex,
        toneOffset,
        hueOffset
      });
    }

    setPoints(newPoints);
    setNextValue(1);
    setIsRevealing(false);
    setWrongPointId(null);
    setIsTimeOut(false);
    
    const currentBaseTime = Math.max(3, baseTime - Math.floor((currentRound - 1) / 10));
    setTimeLeft(currentBaseTime);

    if (gameType === 'cores') {
      setColorPhase('memorize');
    }
  };

  const startGame = (mode: 'easy' | 'medium' | 'hard') => {
    setDifficulty(mode);
    const initialTime = mode === 'easy' ? 25 : (mode === 'medium' ? 15 : 10);
    setBaseTime(initialTime);
    setTimeLeft(initialTime);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    setCurrentRound(1);
    setIsTimeOut(false);
    setGameState('playing');
  };

  const handlePointClick = (id: number) => {
    if (gameType === 'cores' && colorPhase === 'memorize') return;
    if (isRevealing) return;

    const point = points.find(p => p.id === id);
    if (!point || point.clicked) return;

    if (point.value !== nextValue) {
      setWrongPointId(id);
      setTimeout(() => setWrongPointId(null), 400);
      setTimeLeft(t => Math.max(1, t - 1));
      return;
    }

    const newPoints = points.map(p => p.id === id ? { ...p, clicked: true } : p);
    setPoints(newPoints);
    
    const award = 50 + (timeLeft * 2);
    if (multiplayerMode === '2p') {
      if (activePlayerTurn === 'p1') {
        setP1Score(prev => prev + award);
      } else {
        setP2Score(prev => prev + award);
      }
    } else {
      setScore(s => s + award);
    }
    if (onScoreUpdate) onScoreUpdate(award);

    const pointsToComplete = getPointsCount(gameType, difficulty, numColors);

    if (nextValue === pointsToComplete) {
      setIsRevealing(true);
      if (currentRound >= totalRounds) {
        const finalScore = multiplayerMode === '2p' ? p1Score + p2Score + award : score + award;
        setTimeout(() => onComplete(finalScore), 800);
      } else {
        setTimeout(() => {
          if (multiplayerMode === '2p') {
            setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
          }
          setCurrentRound(r => r + 1);
        }, 1000);
      }
    } else {
      setNextValue(v => v + 1);
    }
  };

  const startMemoryPlaying = () => {
    setColorPhase('playing');
    const currentBaseTime = Math.max(3, baseTime - Math.floor((currentRound - 1) / 10));
    setTimeLeft(currentBaseTime);
  };

  const getPointLabel = (val: number, type: 'numeros' | 'letras' | 'cores') => {
    if (type === 'letras') {
      // Wrap around from A (1) to Z (26)
      const letterCode = 65 + ((val - 1) % 26);
      return String.fromCharCode(letterCode);
    }
    return val.toString();
  };

  if (gameState === 'selection') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Trajeto</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Rota</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Map className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Rota</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Trace o caminho na ordem correta</p>
        </div>

        {/* New Layout starting with Difficulty first */}
        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade (Tempo)</p>
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
                      {gameType === 'cores'
                        ? `${level === 'easy' ? 'Tempo Generoso (25s)' : level === 'medium' ? 'Tempo Moderado (15s)' : 'Tempo Extremo (10s)'}`
                        : gameType === 'letras'
                          ? `${level === 'easy' ? '9 Letras | 25s' : level === 'medium' ? '18 Letras | 15s' : '27 Letras | 10s'}`
                          : `${level === 'easy' ? '9 Números | 25s' : level === 'medium' ? '18 Números | 15s' : '27 Números | 10s'}`
                      }
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-route"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode Selector */}
          <div className="space-y-2">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Tipo de Conteúdo</p>
            <div className="grid grid-cols-3 gap-2">
              {(['numeros', 'letras', 'cores'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setGameType(type)}
                  className={`py-3.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                    gameType === type
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 font-extrabold shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  {type === 'numeros' ? 'Números' : type === 'letras' ? 'Letras' : 'Cores 🎨'}
                </button>
              ))}
            </div>
          </div>

          {gameType === 'cores' ? (
            /* Colors custom quantity selector */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Quantidade de Cores</span>
                <span className="text-xs font-black text-yellow-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850 font-mono">
                  {numColors} Cores
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setNumColors(prev => Math.max(5, prev - 1))}
                  disabled={numColors <= 5}
                  className="w-9 h-9 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 active:scale-90 transition-all"
                >
                  <Minus size={14} />
                </button>
                <div className="flex-1 px-2">
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={numColors}
                    onChange={(e) => setNumColors(Number(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer h-1 bg-slate-950 rounded-lg appearance-none"
                  />
                </div>
                <button
                  onClick={() => setNumColors(prev => Math.min(20, prev + 1))}
                  disabled={numColors >= 20}
                  className="w-9 h-9 rounded-lg bg-slate-850 border border-slate-750 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 active:scale-90 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ) : null}

          <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-2xl w-full">
            <h3 className="text-yellow-400 font-black uppercase text-[10px] mb-2 tracking-widest text-center">Como Jogar:</h3>
            <p className="text-slate-400 text-xs leading-relaxed text-center italic">
              {gameType === 'cores' 
                ? 'Memória de Cores! Memorize a posição de cada cor e, após começar, clique nas esferas cinzas na mesma sequência indicada.'
                : 'Os marcos aparecem em ordem. Clique no próximo conteúdo da sequência assim que ele surgir na tela.'
              }
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
            onClick={() => startGame(difficulty)} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR TRAJETO 📍'}
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

  const pointsToCompleteActive = getPointsCount(gameType, difficulty, numColors);

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center select-none overflow-hidden justify-between">
      <div className="w-full">
        {/* Top Header */}
        <div className="w-full flex items-center mb-6">
          <button 
            onClick={() => setGameState('selection')}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Trajeto</span>
            <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1 font-mono">
              DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Modo: {gameType.toUpperCase() === 'NUMBERS' ? 'NÚMEROS' : 'LETRAS'}
            </span>
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

        {/* Score & Timer panel */}
        <div className="w-full flex justify-between items-center mb-4">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Score</p>
            <p className="text-2xl font-black text-yellow-400 mt-1">{multiplayerMode === '2p' ? p1Score + p2Score : score} pts</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right mr-1">
              <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider block leading-none font-mono">Rodada</span>
              <span className="text-xs font-extrabold text-slate-300 block mt-0.5">{currentRound}/{totalRounds}</span>
            </div>
            <div className="text-center font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-inner">
              <Timer className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span className="text-sm font-black text-white leading-none">{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Colors Reference Bar - Moved to the Top with wrapped row styling */}
        {gameType === 'cores' && (
          <div className="w-full bg-slate-900/40 px-3 py-2.5 rounded-2xl border border-slate-850 flex flex-col items-center space-y-1.5 mb-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">A Sequência para Seguir:</span>
            <div className="flex flex-wrap justify-center gap-2 max-w-[316px] mx-auto py-0.5">
              {points.map((p) => {
                const isActive = p.value === nextValue;
                const isDone = p.value < nextValue;
                const hslColor = getPointHSL(p);
                return (
                  <div 
                    key={p.id}
                    style={{ 
                      backgroundColor: hslColor,
                      boxShadow: isActive ? `0 0 10px ${hslColor}` : 'none'
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
                      isActive 
                        ? 'border-yellow-400 scale-125 z-10' 
                        : isDone
                          ? 'border-emerald-500 opacity-30 scale-95'
                          : 'border-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Container Playground */}
      <div className="flex-1 w-full max-w-md bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-800/80 relative overflow-hidden backdrop-blur-sm aspect-square my-4">
        
        {/* Draw lines between already clicked points */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-emerald-500/30" style={{ fill: 'none' }}>
          <AnimatePresence>
            {points.map((p, i) => {
              if (i === 0) return null;
              const prev = points[i-1];
              if (!p.clicked || !prev.clicked) return null;
              return (
                <motion.line
                  key={`line-${p.id}`}
                  x1={`${prev.x}%`} y1={`${prev.y}%`}
                  x2={`${p.x}%`} y2={`${p.y}%`}
                  strokeWidth="3.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  strokeDasharray="10 5"
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Dynamic Buttons grid of elements */}
        <AnimatePresence>
          {points
            .filter(p => gameType === 'cores' ? true : p.value <= nextValue)
            .map((p) => {
              // Determine current styling state of the element
              let circleStyle = `absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-black text-xs transition-all border shadow-lg `;
              
              const isMemorizing = gameType === 'cores' && colorPhase === 'memorize';
              const showOriginalColor = p.clicked || isMemorizing;
              const hslColor = getPointHSL(p);

              let buttonStyle: any = {
                left: `${p.x}%`,
                top: `${p.y}%`
              };

              if (showOriginalColor) {
                // Showing its beautiful color dynamically
                circleStyle += `text-white z-20 border-white/30`;
                buttonStyle.backgroundColor = hslColor;
                buttonStyle.boxShadow = `0 0 15px ${hslColor}`;
              } else if (wrongPointId === p.id) {
                // Incorrect clicked state
                circleStyle += `bg-red-600 border-red-400 text-white shadow-[0_0_20px_#ef4444] z-25`;
              } else if (gameType === 'cores' && !p.clicked) {
                // Grey/hidden slate-800 circles in Cores mode
                circleStyle += `bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 z-10 hover:scale-105 active:scale-95 cursor-pointer`;
              } else {
                // Standard active numbers or letters
                circleStyle += `bg-yellow-400 text-slate-900 border-yellow-300 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-110 z-20`;
              }

              return (
                <motion.button
                  key={`${currentRound}-${p.id}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={
                    wrongPointId === p.id
                      ? { x: [0, -6, 6, -6, 6, 0] }
                      : { scale: 1, opacity: 1 }
                  }
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={!p.clicked ? { scale: 0.82 } : {}}
                  onClick={() => handlePointClick(p.id)}
                  style={buttonStyle}
                  className={circleStyle}
                  disabled={p.clicked || isRevealing || isMemorizing}
                >
                  {p.clicked ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : wrongPointId === p.id ? (
                    <span className="text-[13px] font-black">!</span>
                  ) : gameType === 'cores' ? (
                    colorPhase === 'playing' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    ) : null
                  ) : (
                    getPointLabel(p.value, gameType)
                  )}
                </motion.button>
              );
            })}
        </AnimatePresence>

        {/* Floating current next helper */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-800/80 px-4 py-1.5 rounded-full text-center flex items-center justify-center space-x-1.5">
          {nextValue <= pointsToCompleteActive ? (
            gameType === 'cores' ? (
              <>
                <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest leading-none">Ache a cor:</span>
                {(() => {
                  const nextPoint = points.find(p => p.value === nextValue);
                  if (nextPoint) {
                    const hslColor = getPointHSL(nextPoint);
                    return (
                      <span 
                        style={{ backgroundColor: hslColor }}
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm animate-pulse inline-block" 
                      />
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest leading-none">
                Próximo: {getPointLabel(nextValue, gameType)}
              </p>
            )
          ) : (
            <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest leading-none">
              Concluído! 🏁
            </p>
          )}
        </div>
      </div>

      {/* Memory game explanation moved below the playground, so it never blocks the board circles */}
      {gameType === 'cores' && colorPhase === 'memorize' && (
        <div className="w-full max-w-md px-4 mt-1 mb-2 z-30 text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl space-y-3 w-full backdrop-blur-md"
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Etapa de Memorização</h4>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed italic">
              Guarde a posição das cores exibidas acima antes de começar a corrida! Elas ficarão invisíveis.
            </p>
            <Button
              onClick={startMemoryPlaying}
              className="w-full h-11 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl uppercase tracking-widest shadow-lg shadow-yellow-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>COMEÇAR JOGO ⚡</span>
            </Button>
          </motion.div>
        </div>
      )}

      {/* Persistent Cancel Button */}
      <div className="w-full flex justify-center mt-3">
        <Button 
          onClick={() => setGameState('selection')}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          Abandonar Trajeto
        </Button>
      </div>

      {isTimeOut && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl relative"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-slate-950 border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
                <span className="text-4xl animate-pulse">⏱️</span>
              </div>
              <span className="absolute -top-1 -right-1 text-xl">⚠️</span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">FIM DO TEMPO</span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Tempo Esgotado!</h3>
              <p className="text-slate-400 text-xs leading-relaxed italic">
                O cronômetro encerrou antes que você pudesse completar o trajeto. Não se preocupe! Você não perde seus pontos.
              </p>
            </div>

            {/* Score box */}
            <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Pontuação Conquistada</span>
              <span className="text-3xl font-black text-yellow-400 font-mono block">{multiplayerMode === '2p' ? p1Score + p2Score : score} XP</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={() => onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  1,
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'ROUTE_ORDER',
                  isTimeOut
                )} 
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={() => {
                  startGame(difficulty);
                }} 
                variant="outline" 
                className="w-full h-14 border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all"
              >
                TENTAR NOVAMENTE 🔁
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
