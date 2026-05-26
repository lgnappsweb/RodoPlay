/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Trophy, AlertTriangle, RefreshCw, ArrowLeft, Gamepad2 } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface HangmanProps {
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

import { WORDS } from '../data/words';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function Hangman({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: HangmanProps) {
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [level, setLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const maxMistakes = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 6 : 4;

  useEffect(() => {
    startNewLevel();
  }, []);

  const startNewLevel = () => {
    let randomWord = word;
    if (WORDS.length > 1) {
      while (randomWord === word) {
        randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
      }
    } else {
      randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    setWord(randomWord);
    setGuessedLetters([]);
    setMistakes(0);
    setStatus('playing');
  };

  const currentDisplay = word
    .split('')
    .map(letter => (guessedLetters.includes(letter) || !alphabet.includes(letter) ? letter : '_'));

  const handleGuess = (letter: string) => {
    if (status !== 'playing' || guessedLetters.includes(letter)) return;

    setGuessedLetters(prev => [...prev, letter]);

    if (!word.includes(letter)) {
      setMistakes(prev => {
        const next = prev + 1;
        if (next >= maxMistakes) {
          setStatus('lost');
        }
        return next;
      });
      if (multiplayerMode === '2p') {
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    } else {
      // Check if won
      const isWon = word.split('').every(l => [...guessedLetters, letter].includes(l) || !alphabet.includes(l));
      if (isWon) {
        setStatus('won');
        const levelScore = 100 * level - mistakes * 10;
        if (multiplayerMode === '2p') {
          if (activePlayerTurn === 'p1') {
            setP1Score(prev => prev + levelScore);
          } else {
            setP2Score(prev => prev + levelScore);
          }
        } else {
          setTotalScore(prev => prev + levelScore);
        }
        if (onScoreUpdate) onScoreUpdate(levelScore);
      }
    }
  };

  const handleNextLevel = () => {
    if (status === 'won') {
      setLevel(prev => prev + 1);
      startNewLevel();
    } else {
      onComplete(
        multiplayerMode === '2p' ? p1Score : totalScore,
        1,
        multiplayerMode === '2p',
        selectedPartner,
        p1Score,
        p2Score,
        'HANGMAN'
      );
    }
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Header Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col font-sans">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Resgate</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Forca</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Gamepad2 className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Resgate</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Adivinhe as palavras antes que acabe suas vidas</p>
        </div>

        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
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
                      {level === 'easy' ? 'Até 8 Erros Permitidos' : level === 'medium' ? 'Até 6 Erros Permitidos' : 'Até 4 Erros Permitidos'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-hangman"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
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
            onClick={() => setSetupComplete(true)} 
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-6">
        <button 
          onClick={() => {
            setSetupComplete(false);
            setTotalScore(0);
            setLevel(1);
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Resgate</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Nível {level}</span>
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

      <div className="w-full flex justify-between items-center mb-10">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Enforcado</p>
          <p className="text-xl font-black text-yellow-400">Score: {totalScore}</p>
        </div>
      </div>

      {/* Hangman Visualization */}
      <div className="relative w-48 h-48 mb-10 border-b-4 border-slate-700">
        <div className="absolute bottom-0 left-4 w-2 h-40 bg-slate-700" />
        <div className="absolute top-0 left-4 w-32 h-2 bg-slate-700" />
        <div className="absolute top-0 right-12 w-1 h-8 bg-slate-700" />
        
        {/* Body Parts */}
        <div className="absolute top-8 right-8 w-8 h-8 rounded-full border-4 border-yellow-400 flex items-center justify-center transition-opacity" style={{ opacity: mistakes > 0 ? 1 : 0 }}>
           <div className="flex gap-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full" />
              <div className="w-1 h-1 bg-yellow-400 rounded-full" />
           </div>
        </div>
        <div className="absolute top-16 right-12 w-1 h-16 bg-yellow-400 transition-opacity" style={{ opacity: mistakes > 1 ? 1 : 0 }} />
        <div className="absolute top-20 right-12 w-12 h-1 bg-yellow-400 -rotate-45 origin-left transition-opacity" style={{ opacity: mistakes > 2 ? 1 : 0 }} />
        <div className="absolute top-20 right-[44px] w-12 h-1 bg-yellow-400 rotate-45 origin-right transition-opacity" style={{ opacity: mistakes > 3 ? 1 : 0 }} />
        <div className="absolute top-32 right-12 w-12 h-1 bg-yellow-400 rotate-45 origin-left transition-opacity" style={{ opacity: mistakes > 4 ? 1 : 0 }} />
        <div className="absolute top-32 right-[44px] w-12 h-1 bg-yellow-400 -rotate-45 origin-right transition-opacity" style={{ opacity: mistakes > 5 ? 1 : 0 }} />
      </div>

      {/* Word Display */}
      <div className="flex gap-2 mb-12">
        {currentDisplay.map((l, i) => (
          <div key={i} className="w-8 h-10 border-b-4 border-slate-700 flex items-center justify-center text-2xl font-black text-white italic">
            {l}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className="grid grid-cols-7 gap-2 mb-10 w-full max-w-sm">
        {alphabet.map(l => {
          const isGuessed = guessedLetters.includes(l);
          const isCorrect = isGuessed && word.includes(l);
          const isWrong = isGuessed && !word.includes(l);

          return (
            <motion.button
              key={l}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleGuess(l)}
              disabled={isGuessed || status !== 'playing'}
              className={`h-10 rounded-lg text-sm font-black transition-all ${
                isCorrect ? 'bg-emerald-500 text-white' :
                isWrong ? 'bg-red-500 text-white opacity-40' :
                'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center z-50"
          >
            {status === 'won' ? (
              <>
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-glow shadow-emerald-500/40">🏆</div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase italic">Excelente!</h2>
                <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest text-sm">Você salvou o operador!</p>
                <div className="flex flex-col w-full gap-3">
                  <Button onClick={handleNextLevel} className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-lg rounded-2xl uppercase italic">
                    PRÓXIMO NÍVEL ⚡
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-glow shadow-red-500/40">🚨</div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase italic">Fim de Jogo</h2>
                <p className="text-slate-400 mb-2 font-bold uppercase tracking-widest text-sm text-center">A palavra era:</p>
                <p className="text-2xl font-black text-yellow-400 mb-8 uppercase tracking-tighter">{word}</p>
                <div className="flex flex-col w-full gap-3">
                   <Button onClick={onCancel} variant="outline" className="w-full h-14 border-slate-700 text-slate-400 font-black text-lg rounded-2xl uppercase italic">
                     SAIR
                   </Button>
                   <Button onClick={startNewLevel} className="w-full h-14 bg-slate-100 text-slate-900 font-black text-lg rounded-2xl uppercase italic">
                     TENTAR NOVAMENTE
                   </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-full flex justify-center mt-6">
        <Button 
          onClick={() => {
            setSetupComplete(false);
            setTotalScore(0);
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
