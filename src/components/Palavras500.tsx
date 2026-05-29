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
    isTimeout?: boolean,
    keepInGameSelection?: boolean
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
  { letters: ['A', 'R', 'T', 'O'], targets: [] },
  { letters: ['A', 'M', 'O', 'R'], targets: [] },
  { letters: ['P', 'A', 'T', 'O'], targets: [] },
  { letters: ['C', 'A', 'R', 'O'], targets: [] },
  { letters: ['G', 'A', 'T', 'O'], targets: [] }
];

const MEDIUM_LEVELS: LevelSet[] = [
  { letters: ['P', 'O', 'S', 'T', 'A'], targets: [] },
  { letters: ['C', 'L', 'A', 'R', 'O'], targets: [] },
  { letters: ['F', 'A', 'R', 'O', 'L'], targets: [] },
  { letters: ['V', 'E', 'L', 'O', 'Z'], targets: [] },
  { letters: ['P', 'L', 'A', 'N', 'O'], targets: [] }
];

const HARD_LEVELS: LevelSet[] = [
  { letters: ['A', 'M', 'O', 'R', 'E', 'S'], targets: [] },
  { letters: ['E', 'N', 'T', 'R', 'A', 'R'], targets: [] },
  { letters: ['P', 'A', 'S', 'T', 'E', 'L'], targets: [] },
  { letters: ['C', 'O', 'R', 'T', 'A', 'R'], targets: [] },
  { letters: ['S', 'E', 'N', 'T', 'I', 'R'], targets: [] }
];

const PORTUGUESE_WORDS = [
  // 3-letter words
  'MAR', 'ARO', 'AMO', 'MAO', 'ATO', 'PAO', 'TAO', 'APO', 'ORA', 'OLA', 'VOZ', 'VEU', 'ELE', 'ELO', 'SOM', 'ATE', 'ERA', 'SAL', 'TAL', 'REI', 'DEU', 'PAI', 'MAE', 'BOI', 'GOL', 'SOL', 'LUA', 'REU', 'TEU', 'SEU', 'COR', 'VER', 'VIR', 'SER', 'SIM', 'NAO', 'BEM', 'MAL', 'ANO', 'LAR', 'CAL', 'FAL', 'AFO', 'TEO', 'RES', 'SEM', 'NET', 'SEN', 'TIS', 'SOU', 'POR', 'DAU', 'MEU', 'BOA', 'DIA', 'RIO', 'FIM', 'DAR', 'TER', 'FAZ', 'LEI', 'LUZ', 'MIL', 'MEL', 'PAZ', 'RUA', 'TOM', 'UVA', 'VAI', 'VEM', 'VIA', 'GIL', 'NEO', 'GAS',
  
  // 4-letter words
  'AMOR', 'ROMA', 'RAMO', 'MORA', 'ROTA', 'RATO', 'ATOR', 'TOAR', 'RETA', 'TETO', 'PATO', 'APTO', 'SAPO', 'SOPA', 'OPAS', 'ATOS', 'POSA', 'CARO', 'ARCO', 'ROCA', 'ORCA', 'CORA', 'GATO', 'TOGA', 'GOTA', 'COLA', 'RALO', 'ALTO', 'LONA', 'POLO', 'PANO', 'ALPO', 'LEVE', 'ZELO', 'MARE', 'ERAS', 'RESA', 'SEMA', 'ANTE', 'NATA', 'PATA', 'LEST', 'SETA', 'TELA', 'PALA', 'COTA', 'SINO', 'REIS', 'TESE', 'ISTO', 'CADA', 'VIDA', 'CASA', 'FASE', 'ROSA', 'MESA', 'PESA', 'NOVO', 'BOLO', 'BOLA', 'MALA', 'MAPA', 'VOTO', 'LUTA', 'VALE', 'REDE', 'DOCE', 'SUCO', 'TAPA', 'LAMA', 'TIMA', 'RICO', 'SECO', 'PELO', 'PENA', 'MENA', 'MINA', 'LINO', 'RISO', 'MINO', 'VACA', 'VILA', 'VELA', 'PULO', 'SALA', 'NADO', 'FADO', 'RITO', 'MITO', 'FOTO', 'MOTO', 'NUTO', 'VETO', 'SETE', 'NOVE', 'ZERO', 'FLOR', 'FALO', 'NETA', 'RENI', 'SINE', 'RETE', 'RENA', 'PEST', 'COAS', 'COCE', 'CENT', 'SOMO', 'TAPA', 'PASO', 'MARE', 'SERA', 'TERR',
  
  // 5-letter words
  'POSTA', 'PASTO', 'PATOS', 'APTOS', 'CLARO', 'CALOR', 'CORAL', 'FAROL', 'FORAL', 'FALO', 'ORAL', 'FLOR', 'VELOZ', 'PLANO', 'POLOS', 'MORSE', 'SOMER', 'RAMOS', 'SERAS', 'MARES', 'TENRA', 'RETER', 'TERRA', 'NETAS', 'RENAS', 'NATAS', 'DICAS', 'JOGOS', 'PRATO', 'PORTA', 'PONTO', 'PONTE', 'VENTO', 'TEMPO', 'MENTE', 'GENTE', 'FORTE', 'FRITO', 'FEITO', 'SABOR', 'SAUDE', 'VIGOR', 'RIGOR', 'FAVOR', 'VALOR', 'COSER', 'SABER', 'PODER', 'QUERER', 'FONTE', 'SORTE', 'CORTE', 'CRUEL', 'LIVRE', 'FOCAL', 'LOCAL', 'METAL', 'VOCAL', 'PAPEL', 'LESTE', 'NOTAS', 'ROTAS', 'RATOS', 'ATORES', 'MOTAS', 'GOLES', 'BOSSA', 'VITAL', 'TOTAL', 'FALAS', 'SORTO', 'MORTO', 'NORTE', 'FORCA', 'TERCA', 'POLAS', 'VELAS', 'LOURO', 'ROUPA', 'AMIGA', 'SABIO', 'FESTA', 'SANTO', 'LIVRO', 'CARRO', 'CARTA', 'CHAVE', 'CHAPA', 'PORTA', 'VISTA', 'REVER', 'TENER', 'RETEI', 'ENTRA', 'SETAI', 'TELAS', 'PATAS', 'PESTA', 'ROCAS', 'CORAS', 'ARCOS', 'CAROS', 'COTAI', 'TROCA', 'CORTA', 'TRACT', 'SENTI', 'SINOI', 'ISTOS', 'SINO', 'RETE', 'SENTI',
  
  // 6-letter words
  'AMORES', 'ENTRAR', 'ENTRA', 'PASTEL', 'PESTAL', 'PASSE', 'PESTAS', 'TELES', 'CORTAR', 'TRATOR', 'CORTA', 'TROCA', 'SENTIR', 'SENTI', 'ROTINA', 'TREINO', 'CIDADE', 'ESTADO', 'BRASIL', 'PLANOS', 'LONAS', 'PASTOS', 'SOPAS', 'SAPOS', 'POSTAS', 'CLAROS', 'CORAIS', 'CALORES', 'FAROIS', 'VELOZES', 'CARTAS', 'PONTOS', 'PRATOS', 'PORTAS', 'COCOAS', 'COCEAR', 'DENTES', 'GENTES', 'MENTES', 'PONTES', 'VERDES', 'CURVAS'
];

function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .toUpperCase()
    .replace(/[^A-Z]/g, '') // keep only ASCII letters
    .trim();
}

const UNIQUE_PORTUGUESE_WORDS = Array.from(new Set(
  PORTUGUESE_WORDS
    .map(w => normalizeWord(w))
    .filter(w => w.length >= 3)
));

function canFormWord(word: string, pool: string[]): boolean {
  const poolCounts: Record<string, number> = {};
  for (const letter of pool) {
    const l = normalizeWord(letter);
    poolCounts[l] = (poolCounts[l] || 0) + 1;
  }
  
  const wordUpper = normalizeWord(word);
  const wordCounts: Record<string, number> = {};
  for (const char of wordUpper) {
    wordCounts[char] = (wordCounts[char] || 0) + 1;
  }
  
  for (const [char, count] of Object.entries(wordCounts)) {
    if (!poolCounts[char] || poolCounts[char] < count) {
      return false;
    }
  }
  return true;
}

const DICT = new Set(UNIQUE_PORTUGUESE_WORDS);

export function Palavras500({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: Palavras500Props) {
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
  const [levelIndex, setLevelIndex] = useState(0);

  // Active game setup elements
  const [letterPool, setLetterPool] = useState<string[]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [discoveredWords, setDiscoveredWords] = useState<Set<string>>(new Set());
  const [bonusWords, setBonusWords] = useState<Set<string>>(new Set());
  const [revealedChars, setRevealedChars] = useState<Record<number, boolean[]>>({});
  
  // Scramble visual layout variables
  const [shuffledPool, setShuffledPool] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Score metrics
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [maxTime, setMaxTime] = useState(120);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'failed'>('playing');
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Load the selected level definition dynamically from UNIQUE_PORTUGUESE_WORDS dictionary so it's always different!
  const initLevel = () => {
    let limit = 150;
    const minLen = 3;
    if (difficulty === 'Médio') {
      limit = 120;
    } else if (difficulty === 'Difícil') {
      limit = 95;
    }

    const len = difficulty === 'Fácil' ? 4 : difficulty === 'Médio' ? 5 : 6;
    const candidates = UNIQUE_PORTUGUESE_WORDS.filter(w => w.length === len);
    
    let poolLetters: string[] = [];
    let sortedTargets: string[] = [];
    
    // Attempt to pick a dictionary candidate of the matching length 
    // that yields an appropriate amount of formable words (between 3 and 10) for elegant layout
    let attempts = 0;
    while (attempts < 120) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      if (candidate) {
        const letters = candidate.split('').map(l => normalizeWord(l));
        const formable = UNIQUE_PORTUGUESE_WORDS.filter(word => 
          word.length >= minLen && canFormWord(word, letters)
        );
        
        if (formable.length >= 3 && formable.length <= 10) {
          poolLetters = letters;
          sortedTargets = Array.from(new Set(formable)).sort((a, b) => {
            if (a.length !== b.length) return a.length - b.length;
            return a.localeCompare(b);
          });
          break;
        }
      }
      attempts++;
    }
    
    // Relaxed loop fallback
    if (poolLetters.length === 0) {
      let fallbackAttempts = 0;
      while (fallbackAttempts < 100) {
        const candidate = candidates[Math.floor(Math.random() * candidates.length)];
        if (candidate) {
          const letters = candidate.split('').map(l => normalizeWord(l));
          const formable = UNIQUE_PORTUGUESE_WORDS.filter(word => 
            word.length >= minLen && canFormWord(word, letters)
          );
          
          if (formable.length >= 2) {
            poolLetters = letters;
            sortedTargets = Array.from(new Set(formable)).sort((a, b) => {
              if (a.length !== b.length) return a.length - b.length;
              return a.localeCompare(b);
            });
            break;
          }
        }
        fallbackAttempts++;
      }
    }
    
    // Absolute safe fallback
    if (poolLetters.length === 0) {
      const candidate = candidates.length > 0 
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : len === 4 ? 'AMOR' : len === 5 ? 'CLARO' : 'AMORES';
      poolLetters = candidate.split('').map(l => normalizeWord(l));
      const formable = UNIQUE_PORTUGUESE_WORDS.filter(word => 
        word.length >= minLen && canFormWord(word, poolLetters)
      );
      sortedTargets = Array.from(new Set(formable)).sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });
    }

    // Set level index as static or derived
    setLevelIndex(Math.floor(Math.random() * 1000));
    setLetterPool(poolLetters);
    
    // Scramble the letters inside shuffledPool initially so it's fresh and mixed up on startup!
    const scrambled = [...poolLetters];
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
    setShuffledPool(scrambled);
    setTargetWords(sortedTargets);
    
    setDiscoveredWords(new Set());
    setBonusWords(new Set());
    setCurrentWord('');
    setSelectedIndices([]);
    setErrorMessage('');
    setRevealedChars({});
    
    setTimeLeft(limit);
    setMaxTime(limit);
    setGameState('playing');
  };

  useEffect(() => {
    if (setupComplete) {
      initLevel();
    }
  }, [setupComplete, difficulty]);

  // Timer simulation - disabled per user request
  useEffect(() => {
    // No timer countdown
  }, []);

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
      setGameState('playing');

      const baseAward = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
      const speedBonus = 0;
      const finalAward = baseAward + speedBonus;

      if (multiplayerMode === '2p') {
        const p1Final = activePlayerTurn === 'p1' ? p1Score + finalAward : p1Score;
        const p2Final = activePlayerTurn === 'p2' ? p2Score + finalAward : p2Score;
        
        onComplete(
          p1Final,
          1,
          true,
          selectedPartner,
          p1Final,
          p2Final,
          'PALAVRAS_500',
          false,
          false
        );
      } else {
        const finalScore = score + finalAward;
        onComplete(
          finalScore,
          1,
          false,
          null,
          finalScore,
          undefined,
          'PALAVRAS_500',
          false,
          false
        );
      }
    }
  };

  // Provide a smart hint - reveals one letter of an uncompleted target word
  const handleGetHint = () => {
    if (gameState !== 'playing') return;
    
    // Find target words that are not fully discovered
    const unsolvedIndices = targetWords
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => !discoveredWords.has(word));
      
    if (unsolvedIndices.length === 0) return;
    
    // Gather all unrevealed char positions among unsolved words
    const unrevealedPositions: { wordIdx: number; charIdx: number }[] = [];
    
    unsolvedIndices.forEach(({ word, index }) => {
      const revealed = revealedChars[index] || [];
      for (let i = 0; i < word.length; i++) {
        if (!revealed[i]) {
          unrevealedPositions.push({ wordIdx: index, charIdx: i });
        }
      }
    });
    
    if (unrevealedPositions.length > 0) {
      // Pick a random unrevealed position
      const randPos = unrevealedPositions[Math.floor(Math.random() * unrevealedPositions.length)];
      
      setRevealedChars(prev => {
        const nextWordRevealed = [ ...(prev[randPos.wordIdx] || []) ];
        const wordLen = targetWords[randPos.wordIdx].length;
        while (nextWordRevealed.length < wordLen) {
          nextWordRevealed.push(false);
        }
        nextWordRevealed[randPos.charIdx] = true;
        return {
          ...prev,
          [randPos.wordIdx]: nextWordRevealed
        };
      });
      setErrorMessage('LETRA REVELADA NO PAINEL! 💡');
    } else {
      // Fallback
      const firstUnsolved = unsolvedIndices[0].word;
      setCurrentWord(firstUnsolved);
      setSelectedIndices([]);
    }
  };

  // Reveal all targets
  const handleRevealAll = () => {
    if (gameState !== 'playing') return;
    setDiscoveredWords(new Set(targetWords));
    setGameState('playing');
    const finalScore = multiplayerMode === '2p' ? p1Score : score;
    onComplete(
      finalScore,
      1,
      multiplayerMode === '2p',
      selectedPartner,
      p1Score,
      p2Score,
      'PALAVRAS_500',
      false,
      false
    );
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
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Grau</p>
          <p className="text-sm font-black text-indigo-400 leading-none mt-1 uppercase">
            {difficulty}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Alvo Encontrado</p>
          <p className="text-xl font-black text-white font-mono">{discoveredWords.size} / {targetWords.length}</p>
        </div>
      </div>

      {/* Visual Progress Bar for Target Score Meta 500 Pts - modified from remaining time per user request */}
      <div className="w-full max-w-lg bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5 relative">
        <motion.div 
          className="h-full bg-gradient-to-r from-yellow-400 to-amber-500"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, (((multiplayerMode === '2p' ? p1Score + p2Score : score) / 500) * 100))}%` }}
          transition={{ duration: 0.5 }}
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
              {word.split('').map((char, charIdx) => {
                const isCharRevealed = isDiscovered || (revealedChars[idx] && revealedChars[idx][charIdx]);
                return (
                  <span key={charIdx} className="w-3 text-center block">
                    {isCharRevealed ? char : '_'}
                  </span>
                );
              })}
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
        <div className="w-full max-w-lg bg-slate-900/30 border border-slate-850 p-4 rounded-2xl animate-fade-in mt-4">
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
      <div className="w-full max-w-lg grid grid-cols-2 gap-2.5 pt-3">
        <button
          id="palavras-reset-btn"
          onClick={initLevel}
          className="bg-slate-900 border border-slate-855 hover:border-slate-800 text-slate-400 hover:text-white transition-all py-2 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase shrink-0"
        >
          <RotateCcw size={14} className="mb-1" />
          Reiniciar
        </button>

        <button
          id="palavras-hint-btn"
          onClick={handleGetHint}
          className="bg-slate-900 border border-slate-855 hover:border-slate-800 text-yellow-400 hover:text-yellow-350 transition-all py-2 rounded-xl flex flex-col justify-center items-center text-[8px] font-black uppercase shrink-0"
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
              'PALAVRAS_500',
              false,
              false
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* Modals & Gameplay Overlays inside Canvas view */}
      <AnimatePresence />
    </div>
  );
}
