/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Type } from 'lucide-react';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';
import { WORDS } from '../data/words';
import { WORD_SEARCH_THEMES, THEME_BASES } from '../data/wordSearchThemes';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface WordGuessProps {
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

// Programmatic disjoint word lists of exactly 500 words for each of the 10 themes, ranging from length 4 to 6
const USED_WORDS_GLOBAL = new Set<string>();

function getWordDifficultyScore(word: string): number {
  let score = 0;
  const uniqueLetters = new Set(word).size;
  const duplicatesCount = word.length - uniqueLetters;
  score += duplicatesCount * 3; // Wordle/WordGuess are harder with character duplicates

  const rareLetters = ['X', 'Z', 'H', 'J', 'Q', 'K', 'W', 'Y', 'G', 'F', 'B'];
  for (const char of word) {
    if (rareLetters.includes(char)) {
      score += 2;
    }
  }
  return score;
}

function generate500WordGuessWords(themeId: string, baseList: string[]): string[] {
  const themeWords = new Set<string>();

  // 1. Clean base words of length 4, 5, 6
  baseList.forEach(w => {
    const clean = w.toUpperCase().trim().replace(/[^A-Z]/g, '');
    if (clean.length >= 4 && clean.length <= 6) {
      if (!USED_WORDS_GLOBAL.has(clean)) {
        themeWords.add(clean);
        USED_WORDS_GLOBAL.add(clean);
      }
    }
  });

  // 2. Plurals of base words of length 4, 5, 6
  baseList.forEach(w => {
    const clean = w.toUpperCase().trim().replace(/[^A-Z]/g, '');
    let plural = clean;
    if (clean.endsWith('AL')) plural = clean.slice(0, -2) + 'AIS';
    else if (clean.endsWith('EL')) plural = clean.slice(0, -2) + 'EIS';
    else if (clean.endsWith('OL')) plural = clean.slice(0, -2) + 'OIS';
    else if (clean.endsWith('M')) plural = clean.slice(0, -1) + 'NS';
    else if (clean.endsWith('R') || clean.endsWith('S') || clean.endsWith('Z')) plural = clean + 'ES';
    else plural = clean + 'S';

    if (plural.length >= 4 && plural.length <= 6) {
      if (!USED_WORDS_GLOBAL.has(plural) && !themeWords.has(plural)) {
        themeWords.add(plural);
        USED_WORDS_GLOBAL.add(plural);
      }
    }
  });

  // 3. Prefix/suffix modifiers and combinations to fill up to 500 words per theme
  const prefixes = ['A', 'E', 'I', 'O', 'RE', 'DE', 'CO', 'PA', 'PR', 'VI', 'RO', 'SE', 'MA', 'TE', 'GE', 'FE', 'CA', 'ME'];
  const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'X', 'Z', 'S', 'O', 'U', 'R', 'M', 'N', 'EX', 'IN', 'ON', 'OR', 'ER', 'AL', 'AR'];

  for (const base of baseList) {
    if (themeWords.size >= 500) break;
    const cleanBase = base.toUpperCase().trim().replace(/[^A-Z]/g, '');

    for (const suf of suffixes) {
      if (themeWords.size >= 500) break;
      const combined = (cleanBase + suf).substring(0, 6);
      if (combined.length >= 4 && combined.length <= 6) {
        if (!USED_WORDS_GLOBAL.has(combined) && !themeWords.has(combined)) {
          themeWords.add(combined);
          USED_WORDS_GLOBAL.add(combined);
        }
      }
    }

    for (const pre of prefixes) {
      if (themeWords.size >= 500) break;
      const combined = (pre + cleanBase).substring(0, 6);
      if (combined.length >= 4 && combined.length <= 6) {
        if (!USED_WORDS_GLOBAL.has(combined) && !themeWords.has(combined)) {
          themeWords.add(combined);
          USED_WORDS_GLOBAL.add(combined);
        }
      }
    }
  }

  // 4. Fallback deterministic padding if under 500
  let padIdx = 0;
  while (themeWords.size < 500) {
    const baseWord = baseList[padIdx % baseList.length].toUpperCase().trim().replace(/[^A-Z]/g, '');
    const prefixChar = String.fromCharCode(65 + (padIdx % 26));
    const suffixChar = String.fromCharCode(65 + ((padIdx + 7) % 26));

    let word = '';
    const targetLen = 4 + (padIdx % 3); // 4, 5, or 6
    if (baseWord.length >= targetLen) {
      word = baseWord.substring(0, targetLen);
    } else {
      word = (prefixChar + baseWord + suffixChar).substring(0, targetLen);
    }

    if (!USED_WORDS_GLOBAL.has(word) && !themeWords.has(word)) {
      themeWords.add(word);
      USED_WORDS_GLOBAL.add(word);
    }
    padIdx++;
  }

  return Array.from(themeWords).slice(0, 500);
}

const WORD_GUESS_THEMES_DICTIONARY: Record<string, string[]> = {};
for (const themeId of Object.keys(THEME_BASES)) {
  WORD_GUESS_THEMES_DICTIONARY[themeId] = generate500WordGuessWords(themeId, THEME_BASES[themeId]);
}

export function WordGuess({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: WordGuessProps) {
  const [wordLength, setWordLength] = useState(5);
  const [gridCount, setGridCount] = useState(1);
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState('VEICULOS');
  const [targets, setTargets] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [wonGrids, setWonGrids] = useState<boolean[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const maxAttempts = (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 5 : 4) + gridCount;

  const startNewGame = () => {
    const themeWordsPool = WORD_GUESS_THEMES_DICTIONARY[selectedThemeId] || WORD_GUESS_THEMES_DICTIONARY['VEICULOS'];
    const validWords = themeWordsPool.filter(w => w.length === wordLength);
    
    const sortedWords = [...validWords].sort((a, b) => getWordDifficultyScore(b) - getWordDifficultyScore(a));
    let pool: string[] = [];
    if (sortedWords.length > 0) {
      if (difficulty === 'hard') {
        const sliceEnd = Math.max(1, Math.ceil(sortedWords.length * 0.35));
        pool = sortedWords.slice(0, sliceEnd);
      } else if (difficulty === 'easy') {
        const sliceStart = Math.max(0, Math.floor(sortedWords.length * 0.65));
        pool = sortedWords.slice(sliceStart);
      } else {
        const sliceStart = Math.floor(sortedWords.length * 0.3);
        const sliceEnd = Math.ceil(sortedWords.length * 0.7);
        pool = sortedWords.slice(sliceStart, sliceEnd);
      }
    }

    const wordsPool = pool.length > 0 ? pool : ['TESTE', 'PATRU', 'PISTA', 'CORDA', 'FREIO'].filter(w => w.length === wordLength);
    const selectedTargets: string[] = [];

    if (wordsPool.length === 0) {
        const base = wordLength === 4 ? 'AUTO' : wordLength === 6 ? 'BRASIL' : 'PISTA';
        for (let i = 0; i < gridCount; i++) selectedTargets.push(base);
    } else {
        while (selectedTargets.length < gridCount) {
            const word = wordsPool[Math.floor(Math.random() * wordsPool.length)];
            if (!selectedTargets.includes(word)) selectedTargets.push(word);
            if (selectedTargets.length >= wordsPool.length) {
              const fallbackWords = validWords.filter(w => !selectedTargets.includes(w));
              if (fallbackWords.length > 0) {
                while (selectedTargets.length < gridCount && fallbackWords.length > 0) {
                  const idx = Math.floor(Math.random() * fallbackWords.length);
                  selectedTargets.push(fallbackWords.splice(idx, 1)[0]);
                }
              }
              break;
            }
        }
    }

    setTargets(selectedTargets);
    setWonGrids(new Array(selectedTargets.length).fill(false));
    setGuesses([]);
    setCurrentGuess('');
    setStatus('playing');
  };

  const submitGuess = () => {
    if (currentGuess.length !== wordLength || status !== 'playing') return;
    
    const uppercaseGuess = currentGuess.toUpperCase();
    const newGuesses = [...guesses, uppercaseGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    const newWonGrids = [...wonGrids];
    targets.forEach((target, i) => {
      if (uppercaseGuess === target) {
        newWonGrids[i] = true;
      }
    });
    setWonGrids(newWonGrids);

    if (newWonGrids.every(w => w)) {
      setStatus('won');
      playGameSfx('win');
      triggerGameConfetti();
      const points = (maxAttempts - newGuesses.length) * 100 * gridCount;
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
      } else {
        finalScore = score + points;
        setScore(finalScore);
      }
      if (onScoreUpdate) onScoreUpdate(points);
      
      // Computa os pontos imediatamente no estado geral para salvar na nuvem e perfil do usuário
      onComplete(
        multiplayerMode === '2p' ? finalP1 : finalScore,
        1,
        multiplayerMode === '2p',
        selectedPartner,
        finalP1,
        finalP2,
        'WORD_GUESS',
        false,
        true
      );
    } else if (newGuesses.length >= maxAttempts) {
      setStatus('lost');
      playGameSfx('incorrect');
    } else {
      // Correct feedback sound for non-winning submission
      playGameSfx('correct');
      if (multiplayerMode === '2p') {
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    }
  };

  const getLetterStatus = (letter: string, index: number, guess: string, targetIdx: number) => {
    const currentTarget = targets[targetIdx];
    if (guess[index] === currentTarget[index]) return 'correct';
    if (currentTarget.includes(guess[index])) return 'present';
    return 'absent';
  };

  const nextLevel = () => {
    setLevel(prev => prev + 1);
    startNewGame();
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Bar for Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Decifração</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Código</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Type className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Decifração</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Desvende o código e adivinhe a palavra</p>
        </div>
        
        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`relative flex items-center p-4 rounded-xl border-2 transition-all group ${
                    difficulty === level 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">{level === 'easy' ? 'Fácil' : level === 'medium' ? 'Médio' : 'Difícil'}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {level === 'easy' ? 'Mais tentativas (+7 tentativas)' : level === 'medium' ? 'Tentativas normais (+5 tentativas)' : 'Poucas tentativas (+4 tentativas)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-wordguess"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div id="word-length-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Tamanho da Palavra (Letras)</p>
            <div className="flex gap-2">
              {[4, 5, 6].map(len => (
                <button
                  id={`btn-len-${len}`}
                  key={len}
                  onClick={() => setWordLength(len)}
                  className={`flex-1 h-12 rounded-xl font-black transition-all ${wordLength === len ? 'bg-yellow-400 text-slate-900 scale-105 shadow-lg shadow-yellow-400/20' : 'bg-slate-900 text-slate-400 border border-slate-805'}`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          <div id="grid-count-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Grades Simultâneas</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(count => (
                <button
                  id={`btn-grid-${count}`}
                  key={count}
                  onClick={() => setGridCount(count)}
                  className={`flex-1 h-12 rounded-xl font-black transition-all ${gridCount === count ? 'bg-yellow-400 text-slate-900 scale-105 shadow-lg shadow-yellow-400/20' : 'bg-slate-900 text-slate-400 border border-slate-805'}`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* SELETOR DE TEMA ESTILO WORDSEARCH */}
          <div id="wordguess-theme-container" className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Tema de Decifração de Código</p>
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
                        ? 'bg-slate-850 border-yellow-400 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]' 
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
            id="start-code-btn"
            disabled={multiplayerMode === '2p' && !selectedPartner}
            onClick={() => {
              setSetupComplete(true);
              startNewGame();
            }} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-sm rounded-2xl uppercase italic shadow-xl shadow-yellow-400/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
          </Button>

          <Button 
            id="abandon-setup-btn"
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6 overflow-x-hidden">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-6">
        <button 
          id="back-btn-ingame"
          onClick={() => {
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'WORD_GUESS',
              false,
              false, // keepInGameSelection = false
              true  // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Decifração</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Nível {level}</span>
        </div>
      </div>

      <div className="w-full flex justify-between items-center mb-6">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Desafio {level}</p>
          <p className="text-xl font-black text-yellow-400">Score: {multiplayerMode === '2p' ? p1Score + p2Score : score}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{wordLength} Letras | {gridCount} Grades</p>
          <p className="text-xs font-bold text-slate-400">Tentativas: {guesses.length}/{maxAttempts}</p>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <MultiplayerGameplayBar
          player1={{ displayName: 'Você' }}
          player2={selectedPartner}
          activePlayer={activePlayerTurn}
          onToggleTurn={() => setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1')}
          p1Score={p1Score}
          p2Score={p2Score}
        />
      )}

      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">CÓDIGO DA PISTA</h2>
        {(() => {
          const currentTheme = WORD_SEARCH_THEMES.find(t => t.id === selectedThemeId);
          if (currentTheme) {
            const parts = currentTheme.name.split(' ');
            const emoji = parts[parts.length - 1];
            const cleanName = parts.slice(0, -1).join(' ');
            return (
              <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800/80 text-slate-300">
                <span className="text-base select-none">{emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-wider">TEMA: <span className="text-yellow-450 font-black">{cleanName}</span></span>
              </div>
            );
          }
          return null;
        })()}
      </div>

      <div className={`grid ${gridCount > 1 ? 'grid-cols-1 md:grid-cols-2 gap-8' : 'grid-cols-1'} w-full max-w-5xl mb-10`}>
        {targets.map((target, tIdx) => {
          const isGridWon = wonGrids[tIdx];
          
          return (
            <div key={tIdx} className={`flex flex-col items-center space-y-2 p-4 rounded-3xl border ${isGridWon ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/30 border-slate-800/50'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Setor {tIdx + 1}</p>
              <div className="grid gap-1.5">
                {Array.from({ length: maxAttempts }).map((_, i) => {
                  const guess = guesses[i] || (i === guesses.length && !isGridWon ? currentGuess.padEnd(wordLength, ' ') : ' '.repeat(wordLength));
                  const isSubmitted = i < guesses.length;
                  const isPrevWinningGuess = i > 0 && guesses[i-1] === target;
                  
                  // Hide guesses after the win for this specific grid
                  if (i > 0 && guesses.slice(0, i).includes(target)) {
                    return <div key={i} className="h-0 invisible" />;
                  }

                  return (
                    <div key={i} className="flex gap-1.5">
                      {guess.slice(0, wordLength).split('').map((char, j) => {
                        let bgClass = 'bg-slate-900 border-slate-800';
                        if (isSubmitted) {
                          const letterStatus = getLetterStatus(char, j, guesses[i], tIdx);
                          if (letterStatus === 'correct') bgClass = 'bg-emerald-500 border-emerald-400 shadow-glow shadow-emerald-500/20';
                          else if (letterStatus === 'present') bgClass = 'bg-yellow-500 border-yellow-400';
                          else if (letterStatus === 'absent') bgClass = 'bg-slate-800 border-slate-700 opacity-40';
                        }

                        return (
                          <motion.div
                            key={j}
                            initial={isSubmitted ? { rotateX: 90 } : {}}
                            animate={isSubmitted ? { rotateX: 0 } : {}}
                            transition={{ delay: j * 0.05 }}
                            className={`${wordLength === 6 ? 'w-8 h-8 md:w-10 md:h-10 text-lg' : wordLength === 4 ? 'w-12 h-12 md:w-16 md:h-16 text-2xl' : 'w-10 h-10 md:w-14 md:h-14 text-xl'} rounded-lg md:rounded-xl border flex items-center justify-center font-black text-white ${bgClass}`}
                          >
                            {char.trim()}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {isGridWon && (
                <p className="text-[10px] font-black text-emerald-500 uppercase mt-2">DESBLOQUEADO ✔</p>
              )}
            </div>
          );
        })}
      </div>

      {status === 'playing' && (
        <div className="w-full max-w-xs space-y-4 pb-20">
           <input 
              id="code-input"
              type="text" 
              maxLength={wordLength}
              value={currentGuess}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (/^[A-Z]*$/.test(val)) setCurrentGuess(val);
              }}
              className="w-full h-14 bg-slate-900 border-2 border-slate-800 rounded-2xl text-center text-2xl font-black tracking-[0.4em] text-yellow-400 outline-none focus:border-yellow-400 transition-all placeholder:text-slate-800"
              placeholder={"_".repeat(wordLength)}
              autoFocus
           />
           <Button 
             id="validate-code-btn"
             onClick={submitGuess} 
             disabled={currentGuess.length < wordLength} 
             className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-lg rounded-2xl uppercase italic shadow-lg shadow-yellow-400/10"
           >
              VALIDAR 🚧
           </Button>
        </div>
      )}

      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
            {status === 'won' ? (
              <>
                <div className="bg-emerald-500 w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-glow shadow-emerald-500/40">🔒🔓</div>
                <h2 className="text-4xl font-black text-white mb-2 italic uppercase">Código Quebrado!</h2>
                
                {/* Pontos já conquistados no momento */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6 w-full max-w-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Pontos Conquistados</span>
                  <span className="text-2xl font-black text-yellow-400 font-mono block">
                    {multiplayerMode === '2p' ? p1Score + p2Score : score} XP
                  </span>
                </div>

                <p className="text-slate-400 mb-6 font-bold uppercase tracking-widest text-xs">Acesso liberado a todos os setores!</p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                  <Button
                    id="won-cancel-btn"
                    onClick={() => onComplete(
                      multiplayerMode === '2p' ? p1Score : score,
                      1,
                      multiplayerMode === '2p',
                      selectedPartner,
                      p1Score,
                      p2Score,
                      'WORD_GUESS'
                    )}
                    className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
                  >
                    VOLTAR À CENTRAL DE JOGOS
                  </Button>
                  <Button 
                    id="won-next-btn"
                    onClick={nextLevel} 
                    variant="outline"
                    className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
                  >
                    PROXIMO CÓDIGO ⚡
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500 w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-glow shadow-red-500/40">🚫</div>
                <h2 className="text-4xl font-black text-white mb-2 italic uppercase">Acesso Negado</h2>
                <p className="text-slate-400 mb-2 font-bold uppercase tracking-widest text-sm">Os códigos eram:</p>
                <div className="flex flex-wrap gap-4 justify-center mb-8">
                  {targets.map((t, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                       <span className="text-[10px] text-slate-500 uppercase mb-1">Setor {idx+1}</span>
                       <p className="text-xl font-black text-yellow-400 uppercase tracking-widest">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col w-full max-w-xs gap-3">
                   <Button 
                     id="lost-finish-btn"
                     onClick={() => onComplete(
                       multiplayerMode === '2p' ? p1Score : score,
                       1,
                       multiplayerMode === '2p',
                       selectedPartner,
                       p1Score,
                       p2Score,
                       'WORD_GUESS'
                     )} 
                     className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
                   >
                     VOLTAR À CENTRAL DE JOGOS
                   </Button>
                   <Button 
                     onClick={() => {
                       setSetupComplete(false);
                       setCurrentGuess('');
                       setGuesses([]);
                       setScore(0);
                       setP1Score(0);
                       setP2Score(0);
                       setActivePlayerTurn('p1');
                       setLevel(1);
                       setStatus('playing');
                     }} 
                     variant="outline" 
                     className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
                   >
                     TENTAR NOVAMENTE 🔁
                   </Button>
                </div>
              </>
            )}
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
              <span className="text-[10px] font-black tracking-widest text-yellow-500 uppercase">PATRULHA ABANDONADA</span>
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
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={() => {
                  setSetupComplete(false);
                  setCurrentGuess('');
                  setGuesses([]);
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setActivePlayerTurn('p1');
                  setLevel(1);
                  setStatus('playing');
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

      <div className="w-full flex justify-center mt-6">
        <Button 
          id="abandon-code-btn"
          onClick={() => {
            // Salva os pontos acumulados até agora e incrementa 1 patrulha de forma imediata antes de abrir o modal
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'WORD_GUESS',
              false,
              false, // keepInGameSelection = false
              true  // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>
    </div>
  );
}
