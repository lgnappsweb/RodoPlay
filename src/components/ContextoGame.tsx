/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Trophy, 
  Compass, 
  Sliders, 
  AlertCircle,
  Lightbulb,
  Layers,
  ChevronDown,
  RefreshCw,
  Brain
} from 'lucide-react';
import { Player } from '../types';
import { Button } from './ui/button';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { PredefinedThemeInfo } from './contextoWordsData';
import { WORD_SEARCH_THEMES } from '../data/wordSearchThemes';

interface ContextoGameProps {
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

interface PredefinedWord {
  word: string;
  rank: number;
}

interface PredefinedTheme {
  themeId: string;
  themeName: string;
  icon: string;
  secretWord: string;
  description: string;
  words: PredefinedWord[];
}

const COMMON_PADDER_WORDS = [
  'casa', 'tempo', 'vida', 'mundo', 'dia', 'ano', 'vez', 'homem', 'mulher', 'coisa', 'par', 'luz', 'paz', 'som', 'cor', 
  'fim', 'amor', 'arte', 'livro', 'ponto', 'parte', 'forma', 'fogo', 'ar', 'terra', 'mar', 'sol', 'vento', 'ceu', 'agua', 
  'rocha', 'pedra', 'planta', 'flor', 'folha', 'fruto', 'semente', 'raiz', 'ramo', 'tronco', 'madeira', 'metal', 'ouro', 
  'prata', 'ferro', 'bronze', 'cobre', 'aço', 'vidro', 'papel', 'pano', 'couro', 'borracha', 'algodao', 'seda', 
  'fita', 'fio', 'agulha', 'linha', 'tesoura', 'caixa', 'saco', 'bolsa', 'mala', 'carteira', 'bolso', 'chave', 
  'cadeado', 'trinco', 'porta', 'janela', 'parede', 'teto', 'chao', 'piso', 'tapete', 'cortina', 'espelho', 'quadro', 'relogio', 
  'mesa', 'cadeira', 'sofa', 'poltrona', 'cama', 'travesseiro', 'lençol', 'cobertor', 'armario', 'comoda', 'gaveta', 'cabide', 
  'prato', 'copo', 'garfo', 'faca', 'colher', 'panela', 'frigideira', 'forno', 'fogao', 'geladeira', 'torneira',
  'esponja', 'sabao', 'balde', 'vassoura', 'rodo', 'lixo', 'lixeira', 'sacola', 'cesta', 'caixote'
];

export const compileDynamicTheme = (info: PredefinedThemeInfo, secretWordOverride?: string): PredefinedTheme => {
  // 1. Choose secret word (either requested override, or random candidate)
  let secret = secretWordOverride;
  if (!secret) {
    const candidates = info.secretWordCandidates;
    secret = candidates[Math.floor(Math.random() * candidates.length)];
  }

  const cleanSecret = secret.trim().toLowerCase();

  // 2. Gather unique words within this theme, filtering out the secret word itself
  const uniqueWordsMap = new Map<string, string>();
  info.words.forEach(pw => {
    const wNormalized = pw.word.trim().toLowerCase();
    if (wNormalized && wNormalized !== cleanSecret) {
      uniqueWordsMap.set(wNormalized, pw.category);
    }
  });

  // 3. Ensure we have at least 500+ elements (dynamic size guarantee)
  let wordList = Array.from(uniqueWordsMap.entries()).map(([word, category]) => ({ word, category }));
  
  let padIdx = 0;
  while (wordList.length < 520 && padIdx < COMMON_PADDER_WORDS.length) {
    const padWord = COMMON_PADDER_WORDS[padIdx].trim().toLowerCase();
    if (padWord !== cleanSecret && !uniqueWordsMap.has(padWord)) {
      wordList.push({ word: padWord, category: 'padder' });
      uniqueWordsMap.set(padWord, 'padder');
    }
    padIdx++;
  }

  // Helper to normalize Portuguese words
  const normalizeLocal = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const cleanSecretNorm = normalizeLocal(cleanSecret);
  const secretObj = info.words.find(w => normalizeLocal(w.word) === cleanSecretNorm);
  const secretCat = secretObj ? secretObj.category : undefined;

  // 4. Compute similarity for all words relative to the secret word
  const wordsWithSimilarity = wordList.map(item => {
    const wNorm = normalizeLocal(item.word);
    const sNorm = cleanSecretNorm;

    // Get Bigrams
    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(wNorm);
    const b2 = getBigrams(sNorm);
    let intersection = 0;
    b1.forEach(bg => {
      if (b2.has(bg)) intersection++;
    });
    const union = b1.size + b2.size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;

    // Prefix match
    let prefix = 0;
    const minLen = Math.min(wNorm.length, sNorm.length);
    for (let i = 0; i < minLen; i++) {
      if (wNorm[i] === sNorm[i]) prefix++;
      else break;
    }
    const prefixRatio = minLen > 0 ? prefix / minLen : 0;

    // Category boost
    let categoryBoost = 0;
    if (item.category !== 'padder' && secretCat && item.category === secretCat) {
      categoryBoost = 0.35;
    }

    // Deterministic hash based seed for organic rank variation
    let hashVal = 0;
    const combined = wNorm + '_' + sNorm;
    for (let i = 0; i < combined.length; i++) {
      hashVal = combined.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const hashFactor = (Math.abs(hashVal) % 100) / 1000;

    const similarity = (jaccard * 0.45) + (prefixRatio * 0.20) + categoryBoost + hashFactor;

    return {
      word: item.word,
      similarity
    };
  });

  // 5. Sort words by similarity descending
  wordsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

  // 6. Map to PredefinedWord structure with sequential ranks (starting from rank 2)
  const finalPredefinedWords = wordsWithSimilarity.map((item, index) => {
    return {
      word: item.word,
      rank: index + 2
    };
  });

  return {
    themeId: info.themeId,
    themeName: info.themeName,
    icon: info.icon,
    description: info.description,
    secretWord: cleanSecret,
    words: finalPredefinedWords
  };
};

function getWordDifficultyScore(word: string): number {
  let score = 0;
  // Length: longer word is generally harder in Portuguese
  score += word.length * 2;
  
  // Rare letters in Portuguese: Y, W, K, X, Z, H, J, Q
  const rareLetters = ['y', 'w', 'k', 'x', 'z', 'h', 'j', 'q', 'ç', 'v', 'f', 'g'];
  for (const char of word.toLowerCase()) {
    if (rareLetters.includes(char)) {
      score += 3;
    }
  }

  // Accent letters make things a little wordplay tricky
  const accentChars = ['á', 'à', 'â', 'ã', 'é', 'è', 'ê', 'í', 'ï', 'ó', 'ô', 'õ', 'ö', 'ú'];
  for (const char of word.toLowerCase()) {
    if (accentChars.includes(char)) {
      score += 2;
    }
  }

  return score;
}

const CONTEXT_THEME_INFOS: PredefinedThemeInfo[] = WORD_SEARCH_THEMES.map(theme => {
  const parts = theme.name.split(' ');
  const icon = parts[parts.length - 1]; // e.g. 🎒 or 🚗
  const themeName = parts.slice(0, -1).join(' '); // e.g. "Veículos & Transportes"
  
  // Choose reasonable secret word candidates from theme.words
  // Let's filter words of length 4 to 10 that are alphabet-only
  const candidates = theme.words.filter(w => /^[a-zA-Záàâãéèêíïóôõöúçñ-]{4,10}$/i.test(w));
  const finalCandidates = candidates.length > 5 ? candidates : theme.words.slice(0, 50);

  return {
    themeId: theme.id,
    themeName: themeName,
    icon: icon || '📝',
    description: theme.description,
    secretWordCandidates: finalCandidates,
    words: theme.words.map(w => ({
      word: w,
      category: theme.id
    }))
  };
});

const CONTEXT_THEMES: PredefinedTheme[] = CONTEXT_THEME_INFOS.map(info => 
  compileDynamicTheme(info)
);

export function ContextoGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: ContextoGameProps) {
  // Navigation states
  const [gameState, setGameState] = useState<'selection' | 'playing' | 'victory'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selectedTheme, setSelectedTheme] = useState<PredefinedTheme>(CONTEXT_THEMES[0]);

  // Track secret word history to avoid repetitions
  const [usedSecretWords, setUsedSecretWords] = useState<Record<string, string[]>>({});

  // Search/Guesses tracking states
  const [guesses, setGuesses] = useState<{ word: string; rank: number; timestamp: number }[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  
  // Sort toggle representation: 'rank' (closest first) vs 'time' (newest first)
  const [sortBy, setSortBy] = useState<'rank' | 'time'>('rank');

  // Stats Counters
  const [attempts, setAttempts] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Multiplayer same-screen setup states
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [showAbandonModal, setShowAbandonModal] = useState<boolean>(false);

  // Focus reference for input field
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer interval control
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  // Normalize Portuguese words by removing accents / spaces for perfect comparison matching
  const normalizeWord = (str: string): string => {
    if (!str) return '';
    return str
      .normalize('NFD')                     // Decompose accents
      .replace(/[\u0300-\u036f]/g, '')       // Strip combine marks
      .toLowerCase()
      .trim();
  };

  // Helper to determine the color code for custom visual indicators
  const getClosenessDetails = (rank: number) => {
    if (rank === 1) {
      return {
        colorClass: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50',
        progressBarClass: 'bg-yellow-400',
        label: '👑 SEGREDO REVELADO!',
        percent: 100
      };
    }
    if (rank <= 100) {
      return {
        colorClass: 'text-emerald-400 bg-emerald-400/15 border-emerald-400/40',
        progressBarClass: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
        label: '🔥 MUITO QUENTE',
        percent: Math.max(80, 100 - (rank * 0.15))
      };
    }
    if (rank <= 500) {
      return {
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        progressBarClass: 'bg-amber-500',
        label: '✨ QUENTE',
        percent: Math.max(50, 80 - ((rank - 100) * 0.08))
      };
    }
    if (rank <= 1500) {
      return {
        colorClass: 'text-orange-400 bg-orange-400/5 border-orange-400/20',
        progressBarClass: 'bg-orange-400',
        label: '🌤️ MORNO',
        percent: Math.max(30, 50 - ((rank - 500) * 0.02))
      };
    }
    return {
      colorClass: 'text-slate-400 bg-slate-900 border-slate-800',
      progressBarClass: 'bg-slate-700',
      label: '❄️ FRIO',
      percent: Math.max(5, 30 - ((rank - 1500) * 0.002))
    };
  };

  // Safe semantic similarity algorithm fallback to handle ANY guessed word
  const getSemanticRank = (guessStr: string, theme: PredefinedTheme): number => {
    const cleanGuess = normalizeWord(guessStr);
    const cleanSecret = normalizeWord(theme.secretWord);

    if (cleanGuess === cleanSecret) {
      return 1;
    }

    // 1. Check if the word is predefined
    const predefinedObj = theme.words.find(w => normalizeWord(w.word) === cleanGuess);
    if (predefinedObj) {
      return predefinedObj.rank;
    }

    // 2. Perform dynamic bigram similarity + prefix calculation to yield deterministic rank
    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(cleanGuess);
    const b2 = getBigrams(cleanSecret);

    let intersection = 0;
    b1.forEach(bg => {
      if (b2.has(bg)) intersection++;
    });

    const union = b1.size + b2.size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;

    // Check matching prefix length ratio
    let prefixCount = 0;
    const minLen = Math.min(cleanGuess.length, cleanSecret.length);
    for (let i = 0; i < minLen; i++) {
      if (cleanGuess[i] === cleanSecret[i]) prefixCount++;
      else break;
    }
    const prefixRatio = minLen > 0 ? prefixCount / minLen : 0;

    const similarity = (jaccard * 0.75) + (prefixRatio * 0.25);

    // Dynamic predictable hash seed so that a guessed word ALWAYS holds the exact same rank
    let hashVal = 0;
    for (let i = 0; i < cleanGuess.length; i++) {
      hashVal = cleanGuess.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const seed = Math.abs(hashVal) % 100;

    // Assign appropriate rank grouping based on semantic match similarity
    let baseRank = 1500;
    let rangeWidth = 8400;

    if (similarity > 0.45) {
      baseRank = 101;     // Warm
      rangeWidth = 399;
    } else if (similarity > 0.25) {
      baseRank = 501;     // Mild
      rangeWidth = 999;
    } else if (similarity > 0.1) {
      baseRank = 1501;    // Cool
      rangeWidth = 1499;
    }

    const calculatedRank = baseRank + Math.floor((1.0 - similarity) * rangeWidth) + (seed % 20);
    return Math.min(9999, Math.max(51, calculatedRank));
  };

  // Start a fresh new Contexto gameplay session
  const startNewSession = (difficultyLevel: 'easy' | 'medium' | 'hard', themeSelection: PredefinedTheme) => {
    // 1. Get raw theme definitions
    const themeInfo = CONTEXT_THEME_INFOS.find(t => t.themeId === themeSelection.themeId);
    
    let freshTheme = themeSelection;
    if (themeInfo) {
      // Filter out candidates that were played recently
      const alreadyUsed = usedSecretWords[themeInfo.themeId] || [];
      let unusedCandidates = themeInfo.secretWordCandidates.filter(w => !alreadyUsed.includes(w));
      
      // Reset tracker if all candidates have been played
      if (unusedCandidates.length === 0) {
        unusedCandidates = themeInfo.secretWordCandidates;
        setUsedSecretWords(prev => ({
          ...prev,
          [themeInfo.themeId]: []
        }));
      }

      // Sort unused candidates by difficulty score for graded difficulty selection
      const sortedCandidates = [...unusedCandidates].sort((a, b) => getWordDifficultyScore(b) - getWordDifficultyScore(a));
      
      let poolToSelectFrom = sortedCandidates;
      if (sortedCandidates.length > 5) {
        if (difficultyLevel === 'hard') {
          // Harder words (top 35% of difficulty scores)
          const sliceEnd = Math.max(1, Math.ceil(sortedCandidates.length * 0.35));
          poolToSelectFrom = sortedCandidates.slice(0, sliceEnd);
        } else if (difficultyLevel === 'easy') {
          // Easier words (bottom 35% of difficulty scores)
          const sliceStart = Math.max(0, Math.floor(sortedCandidates.length * 0.65));
          poolToSelectFrom = sortedCandidates.slice(sliceStart);
        } else {
          // Medium words (middle 30% of difficulty)
          const sliceStart = Math.floor(sortedCandidates.length * 0.35);
          const sliceEnd = Math.ceil(sortedCandidates.length * 0.65);
          poolToSelectFrom = sortedCandidates.slice(sliceStart, sliceEnd);
        }
      }

      // Select a random secret word from the filtered difficulty pool
      const newSecretWord = poolToSelectFrom[Math.floor(Math.random() * poolToSelectFrom.length)] || unusedCandidates[0];

      // Register the secret word as used
      setUsedSecretWords(prev => {
        const list = prev[themeInfo.themeId] || [];
        if (!list.includes(newSecretWord)) {
          return {
            ...prev,
            [themeInfo.themeId]: [...list, newSecretWord]
          };
        }
        return prev;
      });

      // Compile a fresh theme on-the-fly with exactly 500+ ranked words centered on this secret word!
      freshTheme = compileDynamicTheme(themeInfo, newSecretWord);
    }

    setDifficulty(difficultyLevel);
    setSelectedTheme(freshTheme);
    setInputValue('');
    setErrorText('');
    setAttempts(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setStartTime(Date.now());
    setP1Score(0);
    setP2Score(0);
    setScore(0);
    setActivePlayerTurn('p1');
    setShowAbandonModal(false);
    
    // Setup initial guess values based on difficulty requirements
    const initialGuesses: { word: string; rank: number; timestamp: number }[] = [];
    
    setGuesses(initialGuesses);
    setGameState('playing');
  };

  // Process a newly dispatched guess
  const handleSendGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorText('');

    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Check simple alphabetic sanity (accept standard Portuguese letters with accents/dash, reject symbols/numerics)
    const isValidLetters = /^[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s-]+$/.test(trimmedInput);
    if (!isValidLetters) {
      setErrorText('Por favor entre apenas palavras válidas (letras de A-Z).');
      return;
    }

    const normalizedNewGuess = normalizeWord(trimmedInput);
    
    // Check if player has already guessed this exact word
    const alreadyGuessed = guesses.some(g => normalizeWord(g.word) === normalizedNewGuess);
    if (alreadyGuessed) {
      setErrorText(`Você já tentou a palavra "${trimmedInput.toUpperCase()}"!`);
      return;
    }

    // Identify closeness rank
    const guessRank = getSemanticRank(trimmedInput, selectedTheme);
    const timestamp = Date.now();

    const newGuessObj = {
      word: trimmedInput.toLowerCase(),
      rank: guessRank,
      timestamp
    };

    const updatedGuesses = [...guesses, newGuessObj];
    setGuesses(updatedGuesses);
    setInputValue('');
    setAttempts(prev => prev + 1);

    // Notify sound-like micro-points or visual success feedback
    if (guessRank < 500) {
      // Real-time minor score feedback for cool hot guesses
      const scoreTier = guessRank === 1 ? 500 : Math.max(5, Math.floor(100 / guessRank));
      if (onScoreUpdate) {
        onScoreUpdate(scoreTier);
      }
      if (multiplayerMode === '1p') {
        setScore(prev => prev + scoreTier);
      }
    }

    // Check if the game is successfully solved
    if (guessRank === 1) {
      let finalP1 = p1Score;
      let finalP2 = p2Score;
      let finalSingle = calculatedPoints;
      if (multiplayerMode === '2p') {
        const winReward = calculatedPoints;
        if (activePlayerTurn === 'p1') {
          finalP1 = p1Score + winReward;
          setP1Score(finalP1);
        } else {
          finalP2 = p2Score + winReward;
          setP2Score(finalP2);
        }
      } else {
        setScore(calculatedPoints);
        finalSingle = calculatedPoints;
      }
      setTimeout(() => {
        onComplete(
          multiplayerMode === '2p' ? finalP1 + finalP2 : finalSingle,
          1,
          multiplayerMode === '2p',
          selectedPartner,
          finalP1,
          finalP2,
          'CONTEXTO',
          false,
          false
        );
      }, 1000);
    } else {
      if (multiplayerMode === '2p') {
        if (guessRank < 500) {
          const scoreTier = Math.max(5, Math.floor(100 / guessRank));
          if (activePlayerTurn === 'p1') {
            setP1Score(prev => prev + scoreTier);
          } else {
            setP2Score(prev => prev + scoreTier);
          }
        }
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    }

    // Maintain input focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Tips/Hints limit per difficulty mode
  const hintsLimit = useMemo(() => {
    if (difficulty === 'easy') return 99; // unlimited hints for relaxation mode
    if (difficulty === 'medium') return 3;
    return 1; // strict hard mode
  }, [difficulty]);

  // Request a hint (word near the secret, choosing from unrevealed predefined list)
  const handleRequestHint = () => {
    if (hintsUsed >= hintsLimit) {
      setErrorText('Limite de dicas esgotado para esta dificuldade!');
      return;
    }

    // Find predefined words of hot ranks (say, under 250) that players haven't guessed yet
    const unrevealedWords = selectedTheme.words.filter(w => 
      w.rank > 1 && 
      w.rank <= 180 && 
      !guesses.some(g => normalizeWord(g.word) === normalizeWord(w.word))
    );

    if (unrevealedWords.length === 0) {
      setErrorText('Não há mais dicas úteis para este tema!');
      return;
    }

    // Sort to offer a nice warm rank based on hints count (each subsequent hint can get tighter/closer!)
    const sortedOptions = unrevealedWords.sort((a, b) => a.rank - b.rank);
    // Take a smart option
    const hintWordObj = sortedOptions[Math.floor(Math.random() * Math.min(5, sortedOptions.length))];

    const newGuessObj = {
      word: hintWordObj.word,
      rank: hintWordObj.rank,
      timestamp: Date.now()
    };

    setGuesses(prev => [...prev, newGuessObj]);
    setHintsUsed(prev => prev + 1);
    
    if (hintWordObj.rank === 1) {
      setGameState('victory');
    }

    setErrorText(`Lâmpada Mágica acendeu! Palavra dica adicionada à lista.`);
  };

  // Sort and filter guessed lists based on state variable settings
  const sortedGuesses = useMemo(() => {
    const list = [...guesses];
    if (sortBy === 'rank') {
      return list.sort((a, b) => a.rank - b.rank);
    } else {
      return list.sort((a, b) => b.timestamp - a.timestamp); // newest first
    }
  }, [guesses, sortBy]);

  // Count distribution metrics for game over dashboard visual charts
  const statsSummary = useMemo(() => {
    let greenCount = 0;
    let yellowCount = 0;
    let orangeCount = 0;
    let coldCount = 0;

    guesses.forEach(g => {
      if (g.rank <= 100) greenCount++;
      else if (g.rank <= 500) yellowCount++;
      else if (g.rank <= 1500) orangeCount++;
      else coldCount++;
    });

    return { greenCount, yellowCount, orangeCount, coldCount };
  }, [guesses]);

  // Calculate final score when game completed based on attempts, difficulty & limits
  const calculatedPoints = useMemo(() => {
    let baseScore = 2000;
    if (difficulty === 'medium') baseScore = 3500;
    if (difficulty === 'hard') baseScore = 5500;

    // Deduct slightly for longer attempts and dica usage to keep it balanced & performance driven
    const deductions = (attempts * 15) + (hintsUsed * 250);
    const finalScore = Math.max(difficulty === 'hard' ? 600 : (difficulty === 'medium' ? 400 : 200), baseScore - deductions);
    return Math.floor(finalScore);
  }, [attempts, hintsUsed, difficulty]);

  // Complete and report game session stats back to profile context
  const triggerGameComplete = () => {
    const is2P = multiplayerMode === '2p';
    onComplete(
      is2P ? p1Score + p2Score : calculatedPoints,
      1,
      is2P,
      selectedPartner,
      p1Score,
      p2Score,
      'CONTEXTO'
    );
  };

  return (
    <div className="w-full text-slate-200" id="game_contexto_root">
      {/* 1. SELECTION SCREEN */}
      {gameState === 'selection' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto w-full"
        >
          {/* Top Bar Navigation */}
          <div className="w-full max-w-sm flex items-center mb-2">
            <button 
              id="contexto-setup-back-btn"
              onClick={onCancel}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-705"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="ml-4 flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-sans">Patrulha Semântica</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Contexto</span>
            </div>
          </div>

          {/* Branding Title */}
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
              <Brain className="w-10 h-10 text-yellow-400 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Contexto</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto text-center">
              Adivinhe a palavra secreta! Cada palpite revela quão perto você está do segredo em termos de afinidade de contexto.
            </p>
          </div>

          {/* Input Configuration Box */}
          <div className="w-full max-w-sm space-y-6 pt-2">
            <div id="difficulty-selector">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
              <div className="grid grid-cols-1 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(level => {
                  const label = level === 'easy' ? 'Fácil' : level === 'medium' ? 'Médio' : 'Difícil';
                  const reward = level === 'easy' ? '+300 XP BP' : level === 'medium' ? '+455 XP BP' : '+700 XP BP';
                  return (
                    <button
                      id={`btn-contexto-diff-${level}`}
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`relative flex items-center p-4 rounded-xl border-2 transition-all group cursor-pointer ${
                        difficulty === level 
                          ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-black uppercase text-sm italic">{label}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                          {reward}
                        </span>
                      </div>
                      {difficulty === level && (
                        <motion.div 
                          layoutId="active-diff-contexto"
                          className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Predefined Category Grid Selection list */}
            <div id="theme-selector">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Selecione o Tema da Patrulha</p>
              <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {CONTEXT_THEMES.map((theme) => {
                  const isSelected = selectedTheme.themeId === theme.themeId;
                  return (
                    <button
                      key={theme.themeId}
                      type="button"
                      onClick={() => setSelectedTheme(theme)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-850 border-yellow-400 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/25'
                      }`}
                    >
                      <span className="text-2xl select-none shrink-0" role="img" aria-label={theme.themeName}>
                        {theme.icon}
                      </span>
                      <div className="min-w-0">
                        <p className={isSelected ? 'text-[11.5px] font-black uppercase text-yellow-400' : 'text-[11.5px] font-extrabold uppercase text-slate-300'}>
                          {theme.themeName}
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

            {/* Launch Active Game button */}
            <button
              id="start-contexto-btn"
              disabled={multiplayerMode === '2p' && !selectedPartner}
              onClick={() => startNewSession(difficulty, selectedTheme)}
              className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
            </button>

            {/* Go Back To Center button */}
            <button
              id="contexto-back-to-center-btn"
              onClick={onCancel}
              className="w-full h-12 rounded-2xl border border-slate-850 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              VOLTAR À CENTRAL DE JOGOS
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. MAIN ACTIVE GAMEPLAY SCREEN */}
      {gameState === 'playing' && (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] p-5 sm:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col min-h-[500px]">
          {/* Top Panel Actions */}
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-4 mb-4">
            <button
              onClick={() => setGameState('selection')}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-white bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800/80 transition-all cursor-pointer"
            >
              <ArrowLeft size={12} /> VOLTAR
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl shrink-0">{selectedTheme.icon}</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMA ATIVO</p>
                <p className="text-xs font-black uppercase text-yellow-400 tracking-tight mt-0.5 leading-none">{selectedTheme.themeName}</p>
              </div>
            </div>

            {/* Game Duration Elapsed and attempts */}
            <div className="text-right flex items-center gap-4">
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMPO</p>
                <p className="text-xs font-mono font-black text-white mt-0.5 leading-none">
                  {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/70 px-3 py-1 rounded-xl">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">PALPITES</p>
                <p className="text-sm font-mono font-black text-yellow-400 leading-none mt-0.5">{attempts}</p>
              </div>
            </div>
          </div>

          {multiplayerMode === '2p' && selectedPartner && (
            <div className="mb-4">
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

          {/* Guesses Input Sending Console */}
          <form onSubmit={handleSendGuess} className="mb-4">
            <div className="relative flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={30}
                aria-label="Entre com a sua palavra palpite"
                placeholder="Qual palavra está no contexto?"
                className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-600 border border-slate-800 px-4 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider outline-none focus:border-yellow-400 transition-all h-12"
              />
              <button
                type="submit"
                className="w-12 h-12 rounded-2xl bg-yellow-400 hover:bg-yellow-350 text-slate-950 flex items-center justify-center font-black transition-all cursor-pointer shrink-0"
                aria-label="Submeter tentativa"
              >
                <Send size={16} />
              </button>
            </div>

            {errorText && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800/60 text-[10px] font-black uppercase text-center flex items-center justify-center gap-1.5 tracking-wider"
              >
                {errorText.includes('esgotado') || errorText.includes('vazias') ? (
                  <AlertCircle size={12} className="text-rose-450 shrink-0" />
                ) : (
                  <Lightbulb size={12} className="text-yellow-400 shrink-0 select-none animate-pulse" />
                )}
                <span className={errorText.includes('esgotado') ? 'text-rose-400' : 'text-slate-300'}>{errorText}</span>
              </motion.div>
            )}
          </form>

          {/* Core Dashboard Action Control Bar */}
          <div className="flex items-center justify-between bg-slate-950/50 border border-slate-850 p-2.5 rounded-2xl mb-4 text-xs gap-3 flex-wrap">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSortBy('rank')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider cursor-pointer border transition-all ${sortBy === 'rank' ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-500' : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-350'}`}
              >
                🏆 Ordenar por Distância
              </button>
              <button
                type="button"
                onClick={() => setSortBy('time')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider cursor-pointer border transition-all ${sortBy === 'time' ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-500' : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-350'}`}
              >
                ⏱️ Ordem cronológica
              </button>
            </div>

            {/* Hint Button */}
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={hintsUsed >= hintsLimit}
              className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${hintsUsed >= hintsLimit ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-yellow-400 text-slate-950 hover:bg-yellow-350 font-black shadow-[0_2px_10px_rgba(234,179,8,0.15)]'}`}
            >
              <Lightbulb size={10} /> DICA ({hintsUsed}/{hintsLimit})
            </button>
          </div>

          {/* Guesses scrolling lists container */}
          <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-850/60 rounded-2xl bg-slate-950/20 p-2.5 space-y-2.5 min-h-[220px]">
            {sortedGuesses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <span className="text-3xl animate-bounce" style={{ animationDuration: '3s' }}>🎯</span>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">NENHUM PALPITE ENVIADO</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Insira palavras relacionadas ao tema "{selectedTheme.themeName.split(' ')[0]}" na barra de busca acima para ver a proximidade de contexto.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {sortedGuesses.map((g) => {
                  const closeness = getClosenessDetails(g.rank);
                  return (
                    <motion.div
                      key={g.word}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`flex flex-col p-3 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-md ${closeness.colorClass}`}
                    >
                      {/* Interactive background semantic bar representation */}
                      <div 
                        className={`absolute top-0 left-0 h-full opacity-[0.06] transition-all duration-1000 ${closeness.progressBarClass}`}
                        style={{ width: `${closeness.percent}%` }}
                      />

                      <div className="flex items-center justify-between relative z-10">
                        {/* Word string */}
                        <span className="font-extrabold uppercase text-xs tracking-wider font-mono">
                          {g.word}
                        </span>

                        {/* Closeness numeric tag and badges */}
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[8px] font-black opacity-80 uppercase select-none tracking-widest">
                            {closeness.label}
                          </span>
                          <span className="text-xs font-black bg-slate-950/80 px-2.5 py-0.5 rounded border border-slate-800/80">
                            #{g.rank}
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar at bottom of card */}
                      <div className="w-full bg-slate-950/40 h-1 rounded overflow-hidden mt-2 relative z-10">
                        <div 
                          className={`h-full transition-all duration-1000 ${closeness.progressBarClass}`}
                          style={{ width: `${closeness.percent}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
          
          {/* Abandonar Patrulha Button */}
          <div className="w-full flex justify-center mt-6">
            <button
              id="contexto-abandon-btn"
              onClick={() => {
                // Salva os pontos acumulados até agora e incrementa 1 patrulha de forma imediata antes de abrir o modal
                onComplete(
                  multiplayerMode === '2p' ? p1Score + p2Score : score,
                  1,
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'CONTEXTO',
                  false,
                  false,
                  true // isAbandoned = true
                );
              }}
              className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider cursor-pointer flex items-center justify-center font-sans"
            >
              ABANDONAR PATRULHA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
