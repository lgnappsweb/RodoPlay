/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Calculator, ArrowLeft } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface SpeedMathProps {
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

export function SpeedMath({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: SpeedMathProps) {
  const [gameState, setGameState] = useState<'selection' | 'playing'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', answer: 0 });
  const [options, setOptions] = useState<number[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [baseTime, setBaseTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const totalRounds = 10;

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  useEffect(() => {
    if (gameState === 'playing') {
      generateProblem();
    }
  }, [currentRound, gameState]);

  // Timer is disabled per user request
  useEffect(() => {
    // No timer/timeouts running
  }, []);

  const generateProblem = () => {
    // Progression: numbers grow every 5 rounds
    const stage = Math.floor((currentRound - 1) / 5);
    const rangeMultiplier = 1 + stage * 0.5;
    
    let range = 10;
    if (difficulty === 'medium') range = 30;
    if (difficulty === 'hard') range = 60;
    
    range = Math.floor(range * rangeMultiplier);

    const a = Math.floor(Math.random() * range) + (stage * 5) + 1;
    const b = Math.floor(Math.random() * range) + 1;
    
    const ops = difficulty === 'easy' ? ['+', '-'] : ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    let answer = 0;
    switch(op) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '*': answer = a * b; break;
    }

    const opts = [answer];
    while(opts.length < 4) {
      const spread = Math.max(10, Math.floor(Math.abs(answer) * 0.3));
      const wrong = answer + (Math.floor(Math.random() * spread * 2) - spread);
      if (!opts.includes(wrong)) opts.push(wrong);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));
    
    // Time decreases by 1s every 5 rounds, min 3s
    const currentBaseTime = Math.max(3, baseTime - Math.floor((currentRound - 1) / 5));
    setTimeLeft(currentBaseTime);
    setProblem({ a, b, op, answer });
    setIsRevealing(false);
    setSelectedAnswer(null);
    setIsTimeOut(false);
  };

  const startGame = (mode: 'easy' | 'medium' | 'hard') => {
    setDifficulty(mode);
    const initialTime = mode === 'easy' ? 25 : (mode === 'medium' ? 15 : 10);
    setBaseTime(initialTime);
    setTimeLeft(initialTime);
    setIsTimeOut(false);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    setGameState('playing');
  };

  const handleAnswer = (val: number) => {
    if (isRevealing) return;
    
    setSelectedAnswer(val);
    setIsRevealing(true);
    
    let points = 0;
    if (val === problem.answer) {
      points = 200;
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(s => s + points);
        } else {
          setP2Score(s => s + points);
        }
      } else {
        setScore(s => s + points);
      }
      if (onScoreUpdate) onScoreUpdate(points);
    }

    setTimeout(() => {
      if (currentRound >= totalRounds) {
        const finalP1 = activePlayerTurn === 'p1' ? p1Score + points : p1Score;
        const finalP2 = activePlayerTurn === 'p2' ? p2Score + points : p2Score;
        onComplete(
          multiplayerMode === '2p' ? finalP1 : score + points,
          1,
          multiplayerMode === '2p',
          selectedPartner,
          finalP1,
          finalP2,
          'SPEED_MATH'
        );
      } else {
        if (multiplayerMode === '2p') {
          setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
        }
        setCurrentRound(r => r + 1);
      }
    }, 1500);
  };

  if (gameState === 'selection') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Bar for Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Cálculo</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Matemática</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Calculator className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Cálculo</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Resolva as operações matemáticas rapidamente</p>
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
                      {level === 'easy' ? 'Básico (Soma e Subtração)' : level === 'medium' ? 'Intermediário (Soma, Subtração e Multiplicação)' : 'Especialista (Operações Rápidas)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff"
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
            onClick={() => startGame(difficulty)} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-xs uppercase tracking-wider shadow-xl shadow-yellow-400/10 active:scale-95 transition-all disabled:opacity-50"
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
          onClick={() => setGameState('selection')}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Cálculo</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Rodada {currentRound}/{totalRounds}</span>
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

      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-3xl border border-slate-700">
        <div>
          <h3 className="text-sm font-black text-white uppercase italic">Cálculo Rápido</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Rodada {currentRound}/{totalRounds}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-yellow-400 leading-none">{score}</p>
          <p className="text-[10px] text-slate-500 uppercase font-black">Score</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="relative">
             <div className="w-24 h-24 bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center text-3xl font-black text-white italic">
                🧮
             </div>
        </div>

        <div className="text-5xl font-black text-white italic tracking-tighter">
          {problem.a} {problem.op} {problem.b} = ?
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          {options.map((opt, i) => {
            const isCorrect = opt === problem.answer;
            const isSelected = opt === selectedAnswer;
            
            let btnClass = "h-16 bg-slate-800 border-2 border-slate-700 rounded-2xl text-2xl font-black text-white transition-all";
            if (isRevealing) {
              if (isCorrect) btnClass = "h-16 bg-emerald-600/20 border-2 border-emerald-500 rounded-2xl text-2xl font-black text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
              else if (isSelected) btnClass = "h-16 bg-rose-600/20 border-2 border-rose-500 rounded-2xl text-2xl font-black text-rose-400";
              else btnClass = "h-16 bg-slate-900 border-2 border-slate-800 rounded-2xl text-2xl font-black text-slate-700 opacity-50";
            } else {
              btnClass += " hover:border-yellow-400 hover:text-yellow-400";
            }

            return (
              <motion.button
                key={i}
                whileHover={!isRevealing ? { scale: 1.05 } : {}}
                whileTap={!isRevealing ? { scale: 0.95 } : {}}
                onClick={() => handleAnswer(opt)}
                disabled={isRevealing}
                className={btnClass}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="w-full flex justify-center mt-6">
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
              'SPEED_MATH',
              false,
              false,
              true // isAbandoned = true
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
