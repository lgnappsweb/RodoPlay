/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Timer, Award, Check, X, ShieldAlert, Sparkles, Hash } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface NumberColorGameProps {
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

interface ColorOption {
  id: string;
  name: string;
  baseClass: string;
  emoji: string;
  hex: string;
}

const COLOR_POOL: ColorOption[] = [
  { id: 'v', name: 'Vermelho', baseClass: 'bg-red-500 shadow-red-500/40 border-red-400', emoji: '🔴', hex: '#ef4444' },
  { id: 'a', name: 'Amarelo', baseClass: 'bg-yellow-400 shadow-yellow-400/40 border-yellow-300', emoji: '🟡', hex: '#facc15' },
  { id: 've', name: 'Verde', baseClass: 'bg-emerald-500 shadow-emerald-500/40 border-emerald-400', emoji: '🟢', hex: '#10b981' },
  { id: 'az', name: 'Azul', baseClass: 'bg-blue-500 shadow-blue-500/40 border-blue-400', emoji: '🔵', hex: '#3b82f6' },
  { id: 'rx', name: 'Roxo', baseClass: 'bg-purple-500 shadow-purple-500/40 border-purple-400', emoji: '🟣', hex: '#a855f7' },
  { id: 'rs', name: 'Rosa', baseClass: 'bg-pink-500 shadow-pink-500/40 border-pink-400', emoji: '🌸', hex: '#ec4899' },
  { id: 'la', name: 'Laranja', baseClass: 'bg-orange-500 shadow-orange-500/40 border-orange-400', emoji: '🟠', hex: '#f97316' },
  { id: 'ci', name: 'Ciano', baseClass: 'bg-cyan-500 shadow-cyan-500/40 border-cyan-400', emoji: '🌐', hex: '#06b6d4' },
  { id: 'ma', name: 'Marrom', baseClass: 'bg-amber-800 shadow-amber-800/40 border-amber-700', emoji: '🟤', hex: '#92400e' },
  { id: 'cz', name: 'Cinza', baseClass: 'bg-slate-500 shadow-slate-500/40 border-slate-400', emoji: '🔘', hex: '#64748b' },
];

const getRandomColors = (count: number): ColorOption[] => {
  const shuffled = [...COLOR_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export function NumberColorGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: NumberColorGameProps) {
  const [gameState, setGameState] = useState<'selection' | 'playing'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [numColors, setNumColors] = useState<4 | 6 | 8 | 10>(4);
  const [activeColors, setActiveColors] = useState<ColorOption[]>([]);

  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'ready' | 'showing' | 'input' | 'won' | 'lost' | 'match_won'>('idle');

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Input Timer States
  const [timeLeft, setTimeLeft] = useState(25);
  const [maxTime, setMaxTime] = useState(25);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getDifficultySettings = (diff: 'easy' | 'medium' | 'hard', levelNum: number) => {
    let showDuration = 650;
    let pauseDuration = 400;
    let baseTimeLimit = 25;

    if (diff === 'easy') {
      baseTimeLimit = Math.max(12, 25 - (levelNum - 1));
    } else if (diff === 'medium') {
      baseTimeLimit = Math.max(9, 20 - (levelNum - 1));
      showDuration = 450;
      pauseDuration = 250;
    } else if (diff === 'hard') {
      baseTimeLimit = Math.max(6, 15 - (levelNum - 1));
      showDuration = 280;
      pauseDuration = 170;
    }

    return {
      showDuration,
      pauseDuration,
      timeLimit: baseTimeLimit,
    };
  };

  const playLocalSequence = async (seq: number[], colorsSet: ColorOption[], currentLevel: number) => {
    setIsPlaying(true);
    setStatus('showing');
    setActiveIndex(null);

    const settings = getDifficultySettings(difficulty, currentLevel);
    
    // Brief initial pause before showing sequence
    await new Promise(r => setTimeout(r, 800));

    for (let i = 0; i < seq.length; i++) {
      if (gameState === 'selection') return; // Cancel if exited
      setActiveIndex(seq[i]);
      await new Promise(r => setTimeout(r, settings.showDuration));
      setActiveIndex(null);
      await new Promise(r => setTimeout(r, settings.pauseDuration));
    }

    setIsPlaying(false);
    setStatus('input');
    setMaxTime(settings.timeLimit);
    setTimeLeft(settings.timeLimit);
  };

  const startLevel = (currentLevel: number) => {
    // 1. Get a randomized subset of colors for this specific level (satisfying "outras cores diferentes")
    const colorsObj = getRandomColors(numColors);
    setActiveColors(colorsObj);

    // 2. Determine sequence length which increases as level increases
    const seqLength = currentLevel + 2; 
    const newSequence = Array.from({ length: seqLength }, () => Math.floor(Math.random() * numColors));
    
    setSequence(newSequence);
    setUserSequence([]);
    setStatus('ready');
  };

  const startGame = () => {
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    setLevel(1);
    setGameState('playing');
    
    const colorsObj = getRandomColors(numColors);
    setActiveColors(colorsObj);
    const seqLength = 3; // level 1 starting sequence length
    const newSequence = Array.from({ length: seqLength }, () => Math.floor(Math.random() * numColors));
    setSequence(newSequence);
    setUserSequence([]);
    setStatus('ready');
  };

  const triggerSequencePlay = () => {
    if (gameState !== 'playing' || status !== 'ready' || isPlaying) return;
    playLocalSequence(sequence, activeColors, level);
  };

  // Timer loop for countdown in input phase
  useEffect(() => {
    if (status !== 'input' || isPlaying || gameState !== 'playing') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          setStatus('lost');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status, isPlaying, gameState]);

  const handleInput = (index: number) => {
    if (status !== 'input' || isPlaying) return;

    // Trigger visual flash feedback
    setActiveIndex(index);
    setTimeout(() => {
      setActiveIndex(null);
    }, 180);

    const nextUserSeq = [...userSequence, index];
    setUserSequence(nextUserSeq);

    // Check correctness
    if (index !== sequence[nextUserSeq.length - 1]) {
      setStatus('lost');
      return;
    }

    // Successfully completed sequence 
    if (nextUserSeq.length === sequence.length) {
      const diffMultiplier = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 75 : 100;
      const pointsAwarded = level * diffMultiplier;
      
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + pointsAwarded);
        } else {
          setP2Score(prev => prev + pointsAwarded);
        }
      } else {
        setScore(prev => prev + pointsAwarded);
      }
      
      if (onScoreUpdate) onScoreUpdate(pointsAwarded);

      // Match consists of exactly 10 rounds
      if (level === 10) {
        setStatus('match_won');
      } else {
        setStatus('won');
      }
    }
  };

  const handleNextLevel = () => {
    const nextL = level + 1;
    if (multiplayerMode === '2p') {
      setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
    }
    setLevel(nextL);
    startLevel(nextL);
  };

  // Layout calculations for responsive grid styling
  let gridClass = "grid gap-3.5 w-full max-w-sm mx-auto ";
  if (numColors === 4) {
    gridClass += "grid-cols-2";
  } else if (numColors === 6) {
    gridClass += "grid-cols-3";
  } else if (numColors === 8) {
    gridClass += "grid-cols-4";
  } else {
    gridClass += "grid-cols-2 sm:grid-cols-5";
  }

  const buttonHeightClass = 
    numColors === 4 ? 'h-32 rounded-[2rem]' :
    numColors === 6 ? 'h-24 rounded-[1.5rem]' :
    numColors === 8 ? 'h-20 rounded-[1.2rem]' :
    'h-16 rounded-[1rem]';

  const emojiSizeClass = 
    numColors === 4 ? 'text-4xl' :
    numColors === 6 ? 'text-2xl' :
    numColors === 8 ? 'text-xl' :
    'text-lg';

  const labelSizeClass = 
    numColors === 4 ? 'text-[11px]' :
    numColors === 6 ? 'text-[9px]' :
    numColors === 8 ? 'text-[8px]' :
    'text-[7px]';

  if (gameState === 'selection') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center space-y-6 select-none relative overflow-y-auto">
        {/* Header Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col font-sans">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Sinais</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Sinais</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Hash className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Sinais</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Memorize a Sequência Luminosa</p>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Difficulty Selector */}
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['easy', 'medium', 'hard'] as const).map(diffLevel => (
                <button
                  key={diffLevel}
                  type="button"
                  onClick={() => setDifficulty(diffLevel)}
                  className={`relative flex items-center p-4 rounded-xl border-2 transition-all group ${
                    difficulty === diffLevel 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">
                      {diffLevel === 'easy' ? 'Fácil' : diffLevel === 'medium' ? 'Médio' : 'Difícil'}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === diffLevel ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {diffLevel === 'easy' ? 'Tempo Generoso (25s)' : diffLevel === 'medium' ? 'Tempo Moderado (15s)' : 'Tempo Extremo (10s)'}
                    </span>
                  </div>
                  {difficulty === diffLevel && (
                    <motion.div 
                      layoutId="active-diff-signals-game"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Count Selector */}
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Quantidade de Cores</p>
            <div className="grid grid-cols-4 gap-2">
              {([4, 6, 8, 10] as const).map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumColors(num)}
                  className={`flex flex-col items-center py-3 px-1 rounded-2xl border-2 transition-all ${
                    numColors === num 
                      ? 'bg-yellow-400 border-yellow-300 text-slate-900 scale-[1.03] shadow-[0_0_15px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-bold'
                  }`}
                >
                  <span className="text-sm">{num}</span>
                  <span className="text-[7px] uppercase tracking-wider leading-none mt-1">Cores</span>
                </button>
              ))}
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
            onClick={startGame} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-sm rounded-2xl uppercase italic shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR MONITORAMENTO 🚦'}
          </Button>
        </div>

        <div className="w-full max-w-sm flex justify-center pt-2">
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center select-none justify-between overflow-x-hidden">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center">
          <button 
            onClick={() => setGameState('selection')}
            disabled={isPlaying}
            className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 active:scale-95 transition-all ${isPlaying ? 'opacity-30' : 'hover:text-white'}`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="ml-4 flex flex-col text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Cósmica</span>
            <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">
              DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | {numColors} Cores
            </span>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-xs font-black text-white font-mono">{timeLeft}s</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm mb-4 shrink-0">
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

      {/* Match Progress Slots Indicator */}
      <div className="w-full max-w-sm mb-4 shrink-0 text-center">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest">Partida de Sinais</span>
          <span className="text-[9px] font-black text-yellow-400 uppercase tracking-tighter">RODADA {level} / 10</span>
        </div>
        <div className="grid grid-cols-10 gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
          {Array.from({ length: 10 }).map((_, i) => {
            const stepNum = i + 1;
            const completed = stepNum < level;
            const current = stepNum === level;
            return (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  completed ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_6px_rgba(16,185,129,0.3)]' :
                  current ? 'bg-yellow-400 animate-pulse scale-y-110' :
                  'bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Game State Panel */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md my-4 space-y-6">
        <div className="text-center px-4">
          <span className="text-[9px] font-bold text-indigo-400 tracking-[0.25em] uppercase leading-none block mb-2">PROVA DE MEMÓRIA</span>
          <h2 className={`text-2xl font-black italic uppercase tracking-tight transition-all ${status === 'ready' ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.2)]' : status === 'showing' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.2)]' : 'text-white'}`}>
            {status === 'ready' ? '🚦 TUDO PRONTO!' : status === 'showing' ? '💻 PRESTE ATENÇÃO' : '👉 REPLIQUE A ORDEM'}
          </h2>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">
            {status === 'ready' ? 'Clique no botão abaixo para iniciar' : status === 'showing' ? 'Memorize cada cor que piscar' : `Tons restantes: ${sequence.length - userSequence.length}`}
          </p>
        </div>

        {/* Dashboard statistics */}
        <div className="flex items-center gap-6 justify-center w-full">
          <div className="bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/80 min-w-[100px] text-center">
            <span className="text-[8px] font-bold uppercase text-slate-500 tracking-wider">Pontos</span>
            <p className="text-lg font-black text-yellow-400 font-mono leading-none mt-1">{score}</p>
          </div>
          <div className="bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/80 min-w-[100px] text-center">
            <span className="text-[8px] font-bold uppercase text-slate-500 tracking-wider">Comprimento</span>
            <p className="text-lg font-black text-indigo-400 font-mono leading-none mt-1">{sequence.length}</p>
          </div>
        </div>

        {/* Dynamic Color Board Grid */}
        <div className="w-full px-2">
          {status === 'ready' ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-800/80 w-full text-center space-y-5 min-h-[220px]"
            >
              <div className="relative">
                <span className="text-5xl block animate-bounce leading-none">🧠</span>
                <span className="absolute -top-1 -right-1 text-xl">✨</span>
              </div>
              <div className="space-y-1">
                <p className="text-white text-sm font-black uppercase tracking-tight italic">
                  Iniciar Sequência de Sinais
                </p>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider max-w-xs mx-auto">
                  Clique no botão abaixo para piscar as cores e os números de forma sequencial na pista.
                </p>
              </div>
              <Button 
                onClick={triggerSequencePlay} 
                className="w-full max-w-[240px] h-14 bg-yellow-400 text-slate-950 hover:bg-yellow-350 font-black text-xs rounded-2xl uppercase tracking-widest shadow-lg shadow-yellow-500/20 active:scale-95 transition-all border-b-4 border-yellow-600"
              >
                REPRODUZIR SIDERAL 🟢
              </Button>
            </motion.div>
          ) : (
            <div className={gridClass}>
              {activeColors.map((color, i) => {
                const isActive = activeIndex === i;
                
                // Custom inline background color on flash to avoid tailwind bundle limits
                const borderCol = isActive ? '#ffffff' : `${color.hex}30`;
                const bgStyle = isActive ? color.hex : '#020617';
                const textCol = isActive ? (color.name === 'Amarelo' || color.name === 'Branco' ? '#0f172a' : '#ffffff') : '#64748b';
                const shadowGlow = isActive ? `0 0 35px ${color.hex}` : 'none';

                return (
                  <motion.button
                    key={i}
                    style={{
                      backgroundColor: bgStyle,
                      borderColor: borderCol,
                      boxShadow: shadowGlow,
                      color: textCol
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInput(i)}
                    disabled={status !== 'input' || isPlaying}
                    className={`relative flex flex-col items-center justify-center border-2 transition-all duration-150 relative ${buttonHeightClass} overflow-hidden`}
                  >
                    {/* Dynamic number tag */}
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border transition-colors ${
                      isActive 
                        ? 'bg-black/20 border-white/40 text-white' 
                        : 'bg-slate-900/80 border-slate-800/80 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    
                    <span className={`transition-all duration-150 ${emojiSizeClass} ${isActive ? 'scale-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]' : 'opacity-40 scale-95'}`}>
                      {color.emoji}
                    </span>
                    
                    <span className={`font-black uppercase tracking-wider font-sans mt-1.5 block ${labelSizeClass} ${isActive ? '' : 'opacity-55'}`}>
                      {color.name}
                    </span>

                    {/* Pulsing glow particle when active */}
                    {isActive && (
                      <span className="absolute inset-0 bg-white/10 animate-ping opacity-25 rounded-full" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Circular Timing Progress Bar */}
        {status === 'input' && (
          <div className="w-full max-w-sm px-4">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                className={`h-full ${
                  timeLeft < 4 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                  timeLeft < (maxTime / 2) ? 'bg-yellow-400' :
                  'bg-indigo-500'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[7px] font-mono font-black text-slate-600 uppercase tracking-widest">Tempo de Resposta</span>
              <span className="text-[8px] font-mono font-bold text-slate-400">{timeLeft} segundo(s) restante(s)</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Cancel Button */}
      <div className="w-full max-w-sm shrink-0 mt-2">
        <Button 
          onClick={() => {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            setStatus('idle');
            setIsPlaying(false);
            setActiveIndex(null);
            setGameState('selection');
          }}
          className="w-full h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black tracking-wider uppercase text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all border border-yellow-500/20"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {status === 'won' && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-8 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <div className="bg-emerald-500/15 border-2 border-emerald-500 w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                ⭐
              </div>
              <h2 className="text-3xl font-black text-white mb-2 italic uppercase">SINALIZADO!</h2>
              <p className="text-slate-400 mb-6 font-bold uppercase tracking-wider text-[10px]">
                Rodada {level} superada com sucesso!
              </p>

              <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 mb-8 flex items-center justify-around">
                <div className="text-center font-mono">
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Acurácia</span>
                  <span className="text-sm font-black text-slate-300 block mt-1">100%</span>
                </div>
                <div className="text-center font-mono border-l border-slate-800 pl-6">
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Bônus Obtido</span>
                  <span className="text-sm font-black text-emerald-400 block mt-1">+{level * (difficulty === 'easy' ? 50 : difficulty === 'medium' ? 75 : 100)} XP</span>
                </div>
              </div>

              <Button 
                onClick={handleNextLevel} 
                className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 text-slate-950 font-black text-sm rounded-2xl uppercase italic active:scale-95 transition-all shadow-lg shadow-yellow-500/10 border-b-4 border-amber-600"
              >
                RODADA {level + 1} ⚡
              </Button>
            </motion.div>
          </motion.div>
        )}

        {status === 'lost' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
              
              <div className="bg-red-500/15 border border-red-500 w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-red-500/25">
                🚨
              </div>
              <h2 className="text-3xl font-black text-white mb-2 italic uppercase">ERRO NO SINAL</h2>
              <p className="text-slate-400 mb-6 font-bold uppercase tracking-widest text-[9px]">
                {timeLeft === 0 ? 'O cronômetro esgotou antes da resposta.' : 'Sequência incorreta inserida na pista.'}
              </p>

              <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-5 mb-8 flex items-center justify-around font-mono">
                <div>
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Rendimento</span>
                  <span className="text-lg font-black text-white block mt-1">{level}/10 Rodada</span>
                </div>
                <div className="border-l border-slate-800 pl-6">
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Placar Final</span>
                  <span className="text-lg font-black text-yellow-400 block mt-1">{multiplayerMode === '2p' ? p1Score + p2Score : score} pts</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => onComplete(
                    multiplayerMode === '2p' ? p1Score : score,
                    1,
                    multiplayerMode === '2p',
                    selectedPartner,
                    p1Score,
                    p2Score,
                    'NUMBER_GUESS',
                    timeLeft === 0
                  )} 
                  className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider"
                >
                  VOLTAR À CENTRAL DE JOGOS
                </Button>
                <Button 
                  onClick={startGame} 
                  variant="outline" 
                  className="w-full h-14 border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider"
                >
                  TENTAR NOVAMENTE 🔁
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {status === 'match_won' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 via-indigo-500 to-yellow-400" />
              
              <div className="relative w-24 h-24 bg-yellow-400 border-4 border-white/20 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-glow shadow-yellow-400/30 animate-bounce">
                🏆
                <Sparkles className="absolute -top-1 -right-1 text-indigo-400 w-6 h-6 animate-pulse" />
              </div>

              <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">PATRULHA CONCLUÍDA!</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1 mb-6">
                Supere absoluto nas 10 rodadas de sinais!
              </p>

              <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-5 mb-8 flex items-center justify-around font-mono">
                <div>
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Rendimento</span>
                  <span className="text-xl font-black text-emerald-400 block mt-1">10 / 10 Perfeito</span>
                </div>
                <div className="border-l border-slate-800 pl-6 font-semibold">
                  <span className="text-[7px] text-slate-500 block uppercase font-bold tracking-widest leading-none">Total Resgatado</span>
                  <span className="text-xl font-black text-yellow-400 block mt-1">{multiplayerMode === '2p' ? p1Score + p2Score : score} pts</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => onComplete(
                    multiplayerMode === '2p' ? p1Score : score,
                    1,
                    multiplayerMode === '2p',
                    selectedPartner,
                    p1Score,
                    p2Score,
                    'NUMBER_GUESS'
                  )} 
                  className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md active:scale-95"
                >
                  RESGATAR PONTOS SUPREMOS 🎉
                </Button>
                <Button 
                  onClick={startGame} 
                  variant="outline" 
                  className="w-full h-14 border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider"
                >
                  NOVA PARTIDA 🔁
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
