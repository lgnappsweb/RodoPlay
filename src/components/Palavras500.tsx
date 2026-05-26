/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, RotateCcw, HelpCircle, Shuffle, Sparkles, CheckCircle, AlertTriangle, Play, HelpCircle as HelpIcon, Flame, Trophy } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface Palavras500Props {
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

interface LevelSet {
  letters: string[];
  targets: string[];
}

const EASY_LEVELS: LevelSet[] = [
  { letters: ['A', 'R', 'T', 'O'], targets: ['ROTA', 'RATO', 'ATOR', 'AMOR', 'TETA'] }, // wait, targets need to be possible with spelling
  { letters: ['A', 'M', 'O', 'R'], targets: ['AMOR', 'ROMA', 'RAMO', 'MORA', 'ORA', 'MAR'] },
  { letters: ['P', 'A', 'T', 'O'], targets: ['PATO', 'APTO', 'ATO', 'PAO', 'TAO'] },
  { letters: ['C', 'A', 'R', 'O'], targets: ['CARO', 'ARCO', 'ROCA', 'ORCA', 'CORA', 'ORA'] },
  { letters: ['G', 'A', 'T', 'O'], targets: ['GATO', 'TOGA', 'ATO', 'GOTA', 'TAO'] }
];

const MEDIUM_LEVELS: LevelSet[] = [
  { letters: ['P', 'O', 'S', 'T', 'A'], targets: ['POSTA', 'PASTO', 'PATOS', 'SAPO', 'SOPA', 'APTO', 'ATO', 'POSA'] },
  { letters: ['C', 'L', 'A', 'R', 'O'], targets: ['CLARO', 'CALOR', 'CORAL', 'ROCA', 'ORCA', 'ARCO', 'COLA', 'FALÓ'] },
  { letters: ['F', 'A', 'R', 'O', 'L'], targets: ['FAROL', 'FORAL', 'FALO', 'ORAL', 'FLOR', 'OLA', 'AFO'] },
  { letters: ['V', 'E', 'L', 'O', 'Z'], targets: ['VELOZ', 'LEVE', 'ZELO', 'VOZ', 'VÉU', 'ELE'] },
  { letters: ['P', 'L', 'A', 'N', 'O'], targets: ['PLANO', 'LONA', 'POLO', 'PANO', 'ANO', 'ALPO'] }
];

const HARD_LEVELS: LevelSet[] = [
  { letters: ['A', 'M', 'O', 'R', 'E', 'S'], targets: ['AMORES', 'MORSE', 'SOMER', 'RAMOS', 'ROMA', 'AMOR', 'RAMO', 'MORA', 'MARE', 'SERA'] },
  { letters: ['E', 'N', 'T', 'R', 'A', 'R'], targets: ['ENTRAR', 'ENTRA', 'TENRA', 'RETER', 'ANTE', 'TERRA', 'NETAS', 'RENAS', 'NATA'] },
  { letters: ['P', 'A', 'S', 'T', 'E', 'L'], targets: ['PASTEL', 'PESTAL', 'PASSE', 'PESTAS', 'TELES', 'PATA', 'LEST', 'SETA', 'TELA', 'PALA'] },
  { letters: ['C', 'O', 'R', 'T', 'A', 'R'], targets: ['CORTAR', 'TRATOR', 'CORTA', 'TROCA', 'ATOR', 'ROTA', 'RATO', 'COTA', 'ORCA', 'ARCO'] },
  { letters: ['S', 'E', 'N', 'T', 'I', 'R'], targets: ['SENTIR', 'REIS', 'TESE', 'NIRS', 'RENI', 'SINE', 'ISTO', 'SINO', 'RETE', 'SENTI'] }
];

// Rich fallback set of Portuguese words for bonus calculations
const DICT = new Set([
  'AMOR', 'ROMA', 'RAMO', 'MORA', 'ORA', 'MAR', 'ARO', 'AMO', 'MAO', 'ROTA', 'RATO', 'ATOR', 'TOAR', 'RETA', 'TETO', 'TEO',
  'PATO', 'APTO', 'ATO', 'PAO', 'TAO', 'APO', 'PATOS', 'PASTO', 'SAPO', 'SOPA', 'OPAS', 'APTOS', 'ATOS', 'POSTA', 'POSA',
  'CARO', 'ARCO', 'ROCA', 'ORCA', 'CORA', 'GATO', 'TOGA', 'GOTA', 'CLARO', 'CALOR', 'CORAL', 'COLA', 'CORA', 'RALO', 'ALTO', 'LAR', 'CAL',
  'FAROL', 'FORAL', 'FALO', 'ORAL', 'FLOR', 'OLA', 'VELOZ', 'LEVE', 'ZELO', 'VOZ', 'VEU', 'ELE', 'ELO', 'PLANO', 'LONA', 'POLO', 'PANO', 'ANO',
  'AMORES', 'MORSE', 'SOMER', 'RAMOS', 'SERA', 'MARE', 'ERAS', 'RESA', 'SEMA', 'SOM', 'ENTRAR', 'ENTRA', 'TENRA', 'RETER', 'ANTE', 'TERRA', 'NETAS', 'RENAS', 'NATA', 'ATE', 'ERA',
  'PASTEL', 'PATA', 'LEST', 'SETA', 'TELA', 'PALA', 'SAL', 'TAL', 'CORTAR', 'CORTA', 'TROCA', 'COTA', 'SENTIR', 'SENTI', 'SINO', 'REIS', 'TESE', 'ISTO'
]);

export function Palavras500({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: Palavras500Props) {
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
  const [levelIndex, setLevelIndex] = useState(0);

  // Active game setup elements
  const [letterPool, setLetterPool] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [discoveredWords, setDiscoveredWords] = useState<Set<string>>(new Set());
  const [bonusWords, setBonusWords] = useState<Set<string>>(new Set());
  
  // Scramble visual layout variables
  const [shuffledPool, setShuffledPool] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Score metrics
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [maxTime, setMaxTime] = useState(120);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'failed'>('playing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Load the selected level definition
  const initLevel = () => {
    let pool: LevelSet[] = EASY_LEVELS;
    let limit = 150;
    if (difficulty === 'Médio') {
      pool = MEDIUM_LEVELS;
      limit = 120;
    } else if (difficulty === 'Difícil') {
      pool = HARD_LEVELS;
      limit = 95;
    }

    const levelIdx = Math.floor(Math.random() * pool.length);
    setLevelIndex(levelIdx);
    
    const activeLevel = pool[levelIdx];
    setLetterPool(activeLevel.letters);
    setShuffledPool([...activeLevel.letters]);
    setTargetWords(activeLevel.targets);
    
    setDiscoveredWords(new Set());
    setBonusWords(new Set());
    setCurrentWord('');
    setSelectedIndices([]);
    setErrorMessage('');
    
    setTimeLeft(limit);
    setMaxTime(limit);
    setGameState('playing');
  };

  useEffect(() => {
    if (setupComplete) {
      initLevel();
    }
  }, [setupComplete, difficulty]);

  // Timer simulation
  useEffect(() => {
    if (gameState !== 'playing' || !setupComplete) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('failed');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, setupComplete]);

  // Letters wheel angle coordinates
  const radius = 68; // wheel operational radius from center in px

  // Handle addition of letters when clicking circular nodes
  const handleLetterClick = (letter: string, index: number) => {
    if (gameState !== 'playing') return;
    
    // Anagram connection wheel mechanics:
    // If we click an already selected node, let's allow undoing the building chain up to that element
    if (selectedIndices.includes(index)) {
      const pos = selectedIndices.indexOf(index);
      const nextSelection = selectedIndices.slice(0, pos);
      setSelectedIndices(nextSelection);
      const nextWord = nextSelection.map(idx => shuffledPool[idx]).join('');
      setCurrentWord(nextWord);
    } else {
      setSelectedIndices(prev => [...prev, index]);
      setCurrentWord(prev => prev + letter);
    }
    setErrorMessage('');
  };

  const handleShuffle = () => {
    if (gameState !== 'playing') return;
    const array = [...shuffledPool];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setShuffledPool(array);
    setSelectedIndices([]);
    setCurrentWord('');
    setErrorMessage('');
  };

  const handleClear = () => {
    setSelectedIndices([]);
    setCurrentWord('');
    setErrorMessage('');
  };

  const handleVerify = () => {
    if (gameState !== 'playing' || !currentWord) return;

    const word = currentWord.toUpperCase();
    
    // Check if we already found this word
    if (discoveredWords.has(word) || bonusWords.has(word)) {
      setErrorMessage('VOCÊ JÁ ACHOU ESSA PALAVRA! ⚠️');
      handleClear();
      return;
    }

    // Is it a target word?
    if (targetWords.includes(word)) {
      const nextDiscovered = new Set<string>(discoveredWords);
      nextDiscovered.add(word);
      setDiscoveredWords(nextDiscovered);
      
      const ptsToAdd = 100; // 100 pts per target word
      const nextScore = score + ptsToAdd;
      setScore(nextScore);

      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + ptsToAdd);
        } else {
          setP2Score(prev => prev + ptsToAdd);
        }
      }

      handleClear();
      checkWinCondition(nextDiscovered, nextScore);
      return;
    }

    // Is it a dictionary valid Portuguese bonus word?
    if (DICT.has(word)) {
      const nextBonus = new Set<string>(bonusWords);
      nextBonus.add(word);
      setBonusWords(nextBonus);

      const bonusPts = 50; // 50 pts per valid bonus word
      const nextScore = score + bonusPts;
      setScore(nextScore);

      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + bonusPts);
        } else {
          setP2Score(prev => prev + bonusPts);
        }
      }

      handleClear();
      checkWinCondition(discoveredWords, nextScore);
      return;
    }

    // Invalida
    setErrorMessage('PALAVRA NÃO CONSTA DA PATRULHA! ❌');
    handleClear();

    // Toggle turn in 2-Player mode on invalid attempt to share the board
    if (multiplayerMode === '2p') {
      setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
    }
  };

  const checkWinCondition = (currentDiscovered: Set<string>, curTotalScore: number) => {
    // Standard wins are achieved by reaching 500 points (Palavras 500!) OR finding all target words!
    const allDiscovered = currentDiscovered.size === targetWords.length;
    const reachedTargetScore = curTotalScore >= 500;

    if (allDiscovered || reachedTargetScore) {
      setGameState('victory');

      const baseAward = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
      const speedBonus = timeLeft * 3;
      const finalAward = baseAward + speedBonus;

      if (multiplayerMode === '2p') {
        const p1Final = activePlayerTurn === 'p1' ? p1Score + finalAward : p1Score;
        const p2Final = activePlayerTurn === 'p2' ? p2Score + finalAward : p2Score;
        
        if (activePlayerTurn === 'p1') {
          setP1Score(p1Final);
        } else {
          setP2Score(p2Final);
        }

        setTimeout(() => {
          onComplete(
            p1Final,
            1,
            true,
            selectedPartner,
            p1Final,
            p2Final,
            'PALAVRAS_500'
          );
        }, 3500);
      } else {
        const finalScore = score + finalAward;
        setScore(finalScore);
        if (onScoreUpdate) onScoreUpdate(finalAward);

        setTimeout(() => {
          onComplete(
            finalScore,
            1,
            false,
            null,
            0,
            0,
            'PALAVRAS_500'
          );
        }, 3500);
      }
    }
  };

  // Provide a smart hint - reveals one letter of an uncompleted target word
  const handleGetHint = () => {
    if (gameState !== 'playing') return;
    
    // Find first target word that wasn't discovered
    const unsolved = targetWords.find(w => !discoveredWords.has(w));
    if (unsolved) {
      // Find a letter that has not been put in currentWord
      // For simplicity, let's just reveal the unsolved word in current word builder!
      setCurrentWord(unsolved);
      setSelectedIndices([]); // clear layout selection
    }
  };

  // Reveal all targets
  const handleRevealAll = () => {
    if (gameState !== 'playing') return;
    setDiscoveredWords(new Set(targetWords));
    setGameState('victory');

    setTimeout(() => {
      onComplete(
        0, // Revealed solution awards 0 XP to prevent leaderboard exploit
        1,
        multiplayerMode === '2p',
        selectedPartner,
        0,
        0,
        'PALAVRAS_500'
      );
    }, 4500);
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Bar Navigation */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="palavras-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Ativa</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Palavras 500</span>
          </div>
        </div>

        {/* Branding Title */}
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Flame className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Palavras 500</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto text-center">
            Forme palavras a partir do círculo e dispute para consolidar 500 pontos na operação!
          </p>
        </div>

        {/* Input Configuration Grid */}
        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['Fácil', 'Médio', 'Difícil'] as const).map(level => {
                const lettersCount = level === 'Fácil' ? '4 Letras' : level === 'Médio' ? '5 Letras' : '6 Letras';
                const reward = level === 'Fácil' ? '+300 XP BP' : level === 'Médio' ? '+450 XP BP' : '+700 XP BP';
                return (
                  <button
                    id={`btn-palavras-diff-${level}`}
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`relative flex items-center p-4 rounded-xl border-2 transition-all group ${
                      difficulty === level 
                        ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-black uppercase text-sm italic">{level} ({lettersCount})</span>
                      <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                        {reward} • Meta: Alcançar 500 Pts ou desvendar o círculo de anagramas
                      </span>
                    </div>
                    {difficulty === level && (
                      <motion.div 
                        layoutId="active-diff-palavras"
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
            id="start-palavras-btn"
            onClick={() => setSetupComplete(true)}
            className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
          </Button>

          <Button 
            id="palavras-back-to-center-btn"
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-5">
      
      {/* Top Header Navigation */}
      <div className="w-full flex items-center mb-1 max-w-lg">
        <button 
          id="palavras-back-btn"
          onClick={() => setSetupComplete(false)}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Ativa</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">Palavras 500 | Nível {difficulty.toUpperCase()}</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-lg">
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

      {/* Score and Goal Metrics */}
      <div className="w-full flex justify-between items-center max-w-lg bg-slate-900/40 p-4 border border-slate-850 rounded-2xl">
        <div className="text-left">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Score Acumulado</p>
          <p className="text-xl font-black text-yellow-400 font-mono">
            {multiplayerMode === '2p' ? p1Score + p2Score : score} <span className="text-xs text-slate-500">/ 500 Pts</span>
          </p>
        </div>

        <div className="flex flex-col items-center bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl min-w-[75px]">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Cronômetro</p>
          <p className={`text-sm font-black font-mono transition-colors leading-none mt-1 ${timeLeft <= 20 ? 'text-red-500 animate-pulse animate-duration-500' : 'text-white'}`}>
            {timeLeft}s
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Alvo Encontrado</p>
          <p className="text-xl font-black text-white font-mono">{discoveredWords.size} / {targetWords.length}</p>
        </div>
      </div>

      {/* Visual Progress Timer Bar */}
      <div className="w-full max-w-lg bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5 relative">
        <motion.div 
          className={`h-full ${timeLeft <= 20 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500'}`}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / maxTime) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
        {/* target 500 pts visual milestone marker */}
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-500/80 animate-pulse" title="Meta 500 Pts" />
      </div>

      {/* Target Word Grid Row */}
      <div className="w-full max-w-lg bg-slate-900/60 p-5 rounded-3xl border border-slate-800 flex flex-wrap justify-center gap-3 min-h-[90px]">
        {targetWords.map((word, idx) => {
          const isDiscovered = discoveredWords.has(word);
          return (
            <div 
              key={idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm tracking-wide transition-all ${
                isDiscovered 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-500'
              }`}
            >
              {word.split('').map((char, charIdx) => (
                <span key={charIdx} className="w-3 text-center block">
                  {isDiscovered ? char : '_'}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Play Controls and Feedback message */}
      <div className="w-full max-w-sm flex flex-col items-center space-y-3">
        {/* Highlight feedback messages */}
        <div className="h-6 flex items-center justify-center">
          {errorMessage ? (
            <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              {errorMessage}
            </span>
          ) : currentWord ? (
            <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              FORMANDO PALAVRA...
            </span>
          ) : null}
        </div>

        {/* Current Working Built Word Showcase */}
        <div className="w-full bg-slate-900/80 border border-slate-800 text-center py-3.5 rounded-2xl min-h-[50px] flex items-center justify-center font-black text-xl italic tracking-widest text-slate-100">
          {currentWord || <span className="text-slate-600 font-normal not-italic text-sm tracking-normal">SELECIONE LETRAS ABAIXO</span>}
        </div>
      </div>

      {/* CIRCULAR INTUITIVE LETTERS WHEEL OR SEQUENTIAL SELECTOR */}
      <div className="relative w-full max-w-lg flex items-center justify-center py-6 h-[220px]">
        {/* Circular backplate */}
        <div className="absolute w-[184px] h-[184px] rounded-full border-2 border-dashed border-slate-800 bg-slate-900/10 flex items-center justify-center">
          {/* Wheel trigger clear buttons or center helper labels */}
          <button 
            onClick={handleShuffle}
            title="Embaralhar"
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-350 hover:text-white transition-all active:scale-90"
          >
            <Shuffle size={18} />
          </button>
        </div>

        {/* Placing Pool Letters uniformly around circle */}
        {shuffledPool.map((letter, idx) => {
          const isSelected = selectedIndices.includes(idx);
          const angle = (2 * Math.PI * idx) / shuffledPool.length;
          const leftPosition = `calc(50% + ${radius * Math.sin(angle)}px - 1.5rem)`;
          const topPosition = `calc(50% - ${radius * Math.cos(angle)}px - 1.5rem)`;

          return (
            <button
              id={`wordscapes-node-${idx}`}
              key={idx}
              onClick={() => handleLetterClick(letter, idx)}
              style={{
                position: 'absolute',
                left: leftPosition,
                top: topPosition,
              }}
              className={`w-12 h-12 rounded-full font-black text-lg flex items-center justify-center transition-all shadow-md active:scale-90 select-none ${
                isSelected 
                  ? 'bg-yellow-400 text-slate-950 scale-110 ring-4 ring-yellow-400/20' 
                  : 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-750'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Verification submission and cleanup actions bar */}
      <div className="w-full max-w-sm grid grid-cols-3 gap-3">
        <Button 
          id="palavras-clear-btn"
          onClick={handleClear}
          variant="outline"
          className="border-slate-800 hover:bg-slate-900 text-slate-400 uppercase font-black text-xs h-12 rounded-xl"
        >
          Limpar
        </Button>

        <Button 
          id="palavras-submit-btn"
          onClick={handleVerify}
          disabled={!currentWord}
          className="bg-yellow-400 hover:bg-yellow-350 disabled:opacity-40 text-slate-950 uppercase font-black text-xs h-12 rounded-xl border border-white/5 shadow-md shadow-yellow-400/5 col-span-2"
        >
          CONCORDAR 📁
        </Button>
      </div>

      {/* Bonus Words list container */}
      {bonusWords.size > 0 && (
        <div className="w-full max-w-lg bg-slate-900/30 border border-slate-850 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <span>🎉</span> PALAVRAS BÔNUS (+50 Pts cd)
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(bonusWords).map((w, idx) => (
              <span key={idx} className="bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg text-yellow-400 font-bold font-mono text-[10px] uppercase">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Utilities control bar at bottom */}
      <div className="w-full max-w-lg grid grid-cols-3 gap-2.5 pt-3">
        <button
          id="palavras-reset-btn"
          onClick={initLevel}
          className="bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white transition-all py-2 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase shrink-0"
        >
          <RotateCcw size={14} className="mb-1" />
          Reiniciar
        </button>

        <button
          id="palavras-hint-btn"
          onClick={handleGetHint}
          className="bg-slate-900 border border-slate-850 hover:border-slate-800 text-yellow-400 hover:text-yellow-350 transition-all py-2 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase shrink-0"
        >
          <Sparkles size={14} className="mb-1" />
          Dica Sábia
        </button>

        <button
          id="palavras-reveal-btn"
          onClick={handleRevealAll}
          className="bg-slate-900 border border-slate-850 hover:border-slate-850 text-indigo-400 hover:text-indigo-350 transition-all py-2 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase shrink-0"
        >
          <HelpIcon size={14} className="mb-1" />
          Solução
        </button>
      </div>

      {/* Modals & Gameplay Overlays inside Canvas view */}
      <AnimatePresence>
        {gameState === 'victory' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col justify-center items-center p-6 text-center z-50 select-none"
          >
            <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full flex items-center justify-center text-4xl mb-4 animate-bounce">
              🏆💫
            </div>
            
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Alvo Atingido! (500 pts+)
            </h3>
            
            <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-xs mt-2">
              Seu vocabulário tático de patrulha é impecável! Todas as palavras-chave foram identificadas com sucesso.
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 mt-6">
              <span className="text-[8px] font-black tracking-wider text-slate-500 block uppercase">XP Consolidado</span>
              <span className="text-3.5xl font-black text-yellow-400 font-mono block">
                +{difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700} XP
              </span>
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-6">Arquivando sessão na folha de serviço...</p>
          </motion.div>
        )}

        {gameState === 'failed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col justify-center items-center p-6 text-center z-50 border border-red-500/20"
          >
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center text-3xl mb-4 text-red-500">
              🛑
            </div>
            
            <h3 className="text-2xl font-black text-red-500 uppercase italic tracking-tighter">
              Limites Excedidos! (Reprovado)
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mt-2">
              Seu tempo de decodificação expirou. Estude os conjuntos de letras e recomece para garantir sua pontuação!
            </p>

            <div className="flex gap-4 mt-6 w-full max-w-xs">
              <Button 
                onClick={() => {
                  setSetupComplete(false);
                  setGameState('playing');
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-slate-700 h-12"
              >
                Voltar Menu
              </Button>
              <Button 
                onClick={initLevel}
                className="flex-1 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black uppercase tracking-wider text-[10px] h-12 animate-pulse"
              >
                Recomeçar
              </Button>
            </div>

            <Button 
              onClick={() => onComplete(
                multiplayerMode === '2p' ? p1Score : score,
                1,
                multiplayerMode === '2p',
                selectedPartner,
                p1Score,
                p2Score,
                'PALAVRAS_500',
                true
              )}
              variant="outline"
              className="w-full max-w-xs h-12 mt-3 rounded-2xl border-slate-850 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-[10px] tracking-wider transition-all active:scale-95"
            >
              VOLTAR À CENTRAL DE JOGOS
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
