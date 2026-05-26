/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Type } from 'lucide-react';
import { WORDS } from '../data/words';
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
    gameType?: string
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

export function WordGuess({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: WordGuessProps) {
  const [wordLength, setWordLength] = useState(5);
  const [gridCount, setGridCount] = useState(1);
  const [setupComplete, setSetupComplete] = useState(false);
  const [targets, setTargets] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [wonGrids, setWonGrids] = useState<boolean[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const maxAttempts = (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 5 : 4) + gridCount;

  const startNewGame = () => {
    const validWords = WORDS.filter(w => w.length === wordLength);
    const selectedTargets: string[] = [];
    
    // Ensure we have words of that length
    const wordsPool = validWords.length > 0 ? validWords : ['TESTE', 'PATRU', 'PISTA', 'CORDA', 'FREIO'].filter(w => w.length === wordLength);
    
    if (wordsPool.length === 0) {
        // Fallback if no words found for that length
        const base = wordLength === 4 ? 'AUTO' : wordLength === 6 ? 'BRASIL' : 'PISTA';
        for(let i=0; i<gridCount; i++) selectedTargets.push(base);
    } else {
        while (selectedTargets.length < gridCount) {
            const word = wordsPool[Math.floor(Math.random() * wordsPool.length)];
            if (!selectedTargets.includes(word)) selectedTargets.push(word);
            if (selectedTargets.length >= wordsPool.length) break; // Not enough unique words
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
      const points = (maxAttempts - newGuesses.length) * 100 * gridCount;
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + points);
        } else {
          setP2Score(prev => prev + points);
        }
      } else {
        setScore(prev => prev + points);
      }
      if (onScoreUpdate) onScoreUpdate(points);
    } else if (newGuesses.length >= maxAttempts) {
      setStatus('lost');
    } else {
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
          onClick={onCancel}
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
                <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest text-sm">Acesso liberado a todos os setores!</p>
                <Button 
                  id="won-next-btn"
                  onClick={nextLevel} 
                  className="w-full max-w-xs h-14 bg-yellow-400 text-slate-900 font-black text-lg rounded-2xl uppercase italic"
                >
                  PRÓXIMO CÓDIGO ⚡
                </Button>
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
                     className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-lg rounded-2xl uppercase italic"
                   >
                      RESGATAR XP
                   </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="w-full flex justify-center mt-6">
        <Button 
          id="abandon-code-btn"
          onClick={() => {
            setSetupComplete(false);
            setScore(0);
            setP1Score(0);
            setP2Score(0);
            setActivePlayerTurn('p1');
            setLevel(1);
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          Abandonar Patrulha
        </Button>
      </div>
    </div>
  );
}
