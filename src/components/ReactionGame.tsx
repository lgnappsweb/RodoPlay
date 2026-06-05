/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Zap, ArrowLeft } from 'lucide-react';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface ReactionGameProps {
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

export function ReactionGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: ReactionGameProps) {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'ready' | 'clicked' | 'too-early' | 'summary'>('waiting');
  const [level, setLevel] = useState(1);
  const [activeLights, setActiveLights] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentRound, setCurrentRound] = useState(1);
  const [roundFinished, setRoundFinished] = useState(false);
  const [roundEarnedPoints, setRoundEarnedPoints] = useState(0);
  const [score, setScore] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  useEffect(() => {
    if (setupComplete) {
      startRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setupComplete]);

  const startRound = () => {
    setGameState('waiting');
    setActiveLights(0);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Difficulty scaling
    const baseDuration = difficulty === 'easy' ? 900 : difficulty === 'medium' ? 600 : 350;
    const intervalDuration = Math.max(120, baseDuration - (level - 1) * 60);

    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setActiveLights(count);
      if (count === 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setGameState('ready');
        setStartTime(Date.now());
      }
    }, intervalDuration);
  };

  const handleClick = () => {
    if (gameState === 'waiting') {
      setGameState('too-early');
      playGameSfx('incorrect');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Removed automatic startRound(2000)
    } else if (gameState === 'ready') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setGameState('clicked');
      
      // Level up on reasonable reaction
      if (time < 500) {
        setLevel(prev => Math.min(prev + 1, 10));
      }

      const points = Math.max(0, 1000 - time);
      if (points > 500) {
        playGameSfx('win');
        triggerGameConfetti();
      } else {
        playGameSfx('correct');
        triggerGameConfetti();
      }
      
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + points);
          if (onScoreUpdate) onScoreUpdate(points);
          timeoutRef.current = setTimeout(() => {
            setActivePlayerTurn('p2');
            startRound();
          }, 3000);
        } else {
          setP2Score(prev => prev + points);
          if (onScoreUpdate) onScoreUpdate(points);
          timeoutRef.current = setTimeout(() => {
            if (currentRound < 10) {
              setRoundEarnedPoints(points);
              setRoundFinished(true);
            } else {
              setGameState('summary');
            }
          }, 3000);
        }
      } else {
        setScore(s => s + points);
        if (onScoreUpdate) onScoreUpdate(points);
        timeoutRef.current = setTimeout(() => {
          if (currentRound < 10) {
            setRoundEarnedPoints(points);
            setRoundFinished(true);
          } else {
            setGameState('summary');
          }
        }, 3000);
      }
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
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Reflexo</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Reflexo</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Zap className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Reflexo</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Toque o mais rápido possível no sinal verde</p>
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
                      {level === 'easy' ? 'Contagem Regressiva Lenta (900ms)' : level === 'medium' ? 'Contagem Regressiva Normal (600ms)' : 'Contagem Regressiva Ultra Rápida (350ms)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-reaction"
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

  if (gameState === 'summary') {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center pt-10 pb-20 select-none overflow-y-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-xl shadow-yellow-500/10 text-center space-y-6"
        >
          {/* Trophy Header */}
          <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-4xl">🏆</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter text-yellow-400 font-sans">Patrulha de Reflexo Superada!</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest font-sans">Excelente tempo de reação operacional!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-left w-full font-sans">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Dificuldade</span>
              <span className="text-xs font-black text-white uppercase italic">{difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Rodadas Suportadas</span>
              <span className="text-xs font-black text-yellow-400 font-mono">10 / 10 ⚡</span>
            </div>

            {multiplayerMode === '2p' ? (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/30 col-span-2 space-y-2">
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Resultado da Dupla (Versus)</p>
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1">Você (P1): <span className="text-white font-black font-mono">{p1Score} pts</span></span>
                  {p1Score > p2Score && <span className="text-[9px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase font-sans">Vencedor</span>}
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1">{selectedPartner?.displayName || 'P2'}: <span className="text-white font-black font-mono">{p2Score} pts</span></span>
                  {p2Score > p1Score && <span className="text-[9px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded font-sans">Vencedor</span>}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl col-span-2 text-center font-sans">
                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pontuação Total Acumulada</span>
                <span className="text-4xl font-extrabold text-yellow-400 font-mono tracking-tighter">{score} <span className="text-xs uppercase text-slate-500">pts</span></span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10, // roundsPlayed
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'REACTION',
                  false,
                  true // keepInGameSelection
                );
                
                // Promotion
                const nextDiff = difficulty === 'easy' ? 'medium' : (difficulty === 'medium' ? 'hard' : 'easy');
                setDifficulty(nextDiff);
                setCurrentRound(1);
                setScore(0);
                setP1Score(0);
                setP2Score(0);
                setGameState('waiting');
                startRound();
              }}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-emerald-500/20"
            >
              PRÓXIMO NÍVEL ⚡
            </Button>

            <Button
              onClick={() => {
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10, // roundsPlayed
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'REACTION',
                  false,
                  false
                );
                onCancel();
              }}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              FINALIZAR PARTIDA 🏁
            </Button>

            <Button
              onClick={() => {
                onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  10, // roundsPlayed
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'REACTION',
                  false,
                  false // don't keep in game selection - go back
                );
                onCancel();
              }}
              variant="outline"
              className="w-full h-12 border-slate-705 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer"
            >
              Voltar à Central de Jogos
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-6">
        <button 
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            const scoreNum = multiplayerMode === '2p' ? p1Score : (reactionTime > 0 ? Math.max(0, 1000 - reactionTime) : 0);
            onComplete(
              multiplayerMode === '2p' ? p1Score : scoreNum,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              multiplayerMode === '2p' ? p2Score : 0,
              'REACTION',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-all active:scale-95 overflow-hidden"
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_5px_red] animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
            <div className="w-1.5 h-1.5 rounded-full bg-red-900" />
          </div>
          <ArrowLeft size={14} className="text-slate-400 group-hover:text-white transition-colors" />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Reflexo</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | RODADA: {currentRound}/10</span>
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

      <div className="w-full flex justify-center gap-6 mb-4">
        {/* Vertical Lights Tower */}
        <div className="flex flex-col gap-2 p-3 bg-black/90 rounded-xl border-[6px] border-slate-900 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2">
              <motion.div 
                animate={{ 
                  backgroundColor: gameState === 'ready' ? '#10b981' : (
                    (gameState === 'waiting' && activeLights >= i) ? (
                      i <= 2 ? '#ef4444' : i <= 4 ? '#f59e0b' : '#10b981'
                    ) : '#1a1a1a'
                  ),
                  boxShadow: gameState === 'ready' ? '0 0 20px #10b981' : (
                    (gameState === 'waiting' && activeLights >= i) ? (
                      i <= 2 ? '0 0 20px #ef4444' : i <= 4 ? '0 0 20px #f59e0b' : '0 0 20px #10b981'
                    ) : 'none'
                  )
                }}
                className="w-10 h-10 rounded-full border-2 border-black" 
              />
              <motion.div 
                animate={{ 
                  backgroundColor: gameState === 'ready' ? '#10b981' : (
                    (gameState === 'waiting' && activeLights >= i) ? (
                      i <= 2 ? '#ef4444' : i <= 4 ? '#f59e0b' : '#10b981'
                    ) : '#1a1a1a'
                  ),
                  boxShadow: gameState === 'ready' ? '0 0 20px #10b981' : (
                    (gameState === 'waiting' && activeLights >= i) ? (
                      i <= 2 ? '0 0 20px #ef4444' : i <= 4 ? '0 0 20px #f59e0b' : '0 0 20px #10b981'
                    ) : 'none'
                  )
                }}
                className="w-10 h-10 rounded-full border-2 border-black" 
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center items-center gap-4">
          <div className={`w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center transition-all duration-300 ${
            gameState === 'waiting' ? 'bg-red-950/30' : 
            gameState === 'ready' ? 'bg-emerald-500 shadow-[0_0_30px_#10b981]' : 
            'bg-slate-900'
          }`}>
            <Zap className={`w-8 h-8 ${gameState === 'ready' ? 'text-white' : 'text-slate-800'}`} />
          </div>
          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] animate-pulse text-center max-w-[120px]">
            {gameState === 'waiting' ? 'Aguarde a 5ª luz' : 'REAÇÃO AGORA!'}
          </p>
        </div>
      </div>

      <motion.button
        onClick={handleClick}
        className={`flex-1 w-full rounded-[2.5rem] flex flex-col items-center justify-center p-8 transition-all duration-75 border-b-8 shadow-2xl active:scale-[0.98] active:border-b-0 active:translate-y-2 group relative overflow-hidden ${
          gameState === 'waiting' ? 'bg-slate-900 border-slate-950 hover:bg-slate-800' :
          gameState === 'ready' ? 'bg-emerald-600 border-emerald-800 hover:bg-emerald-500' :
          gameState === 'clicked' ? 'bg-blue-600 border-blue-800' :
          'bg-rose-700 border-rose-900'
        }`}
      >
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
        
        {gameState === 'waiting' && (
          <div className="flex flex-col items-center">
            <Zap className="w-16 h-16 text-slate-700 mb-6 group-hover:text-yellow-500/20 transition-colors" />
            <p className="text-2xl font-black text-slate-500 uppercase italic tracking-tighter">Preparar...</p>
          </div>
        )}
        {gameState === 'ready' && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
             <p className="text-6xl font-black text-white uppercase italic drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]">GO! GO!</p>
          </motion.div>
        )}
        {gameState === 'too-early' && (
          <div className="flex flex-col items-center">
             <p className="text-3xl font-black text-white uppercase italic">QUEIMA DE LARGADA!</p>
             <p className="text-sm font-bold text-white/60 mt-2 uppercase tracking-widest">Penalidade aplicada</p>
          </div>
        )}
        {gameState === 'clicked' && (
          <div className="flex flex-col items-center">
             <p className="text-sm font-black text-white/40 uppercase mb-2">Tempo de Reação</p>
             <p className="text-7xl font-black text-white uppercase italic drop-shadow-lg">{reactionTime}ms</p>
             <div className="mt-6 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-bounce" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-bounce delay-75" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-bounce delay-150" />
             </div>
          </div>
        )}
      </motion.button>

      <div className="w-full max-w-sm flex flex-col gap-3 items-center pt-6">
        {(gameState === 'clicked' || gameState === 'too-early') && (
          <Button
            onClick={startRound}
            variant="outline"
            className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
          >
            TENTAR NOVAMENTE 🔁
          </Button>
        )}
      </div>

      <div className="w-full flex justify-center mt-4">
        <Button 
          id="abandon-reaction-btn"
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            const scoreNum = multiplayerMode === '2p' ? p1Score : (reactionTime > 0 ? Math.max(0, 1000 - reactionTime) : 0);
            onComplete(
              multiplayerMode === '2p' ? p1Score : scoreNum,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              multiplayerMode === '2p' ? p2Score : 0,
              'REACTION',
              false,
              false, // keepInGameSelection = false
              true  // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      <AnimatePresence>
        {roundFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 z-50 select-none overflow-y-auto w-full"
          >
            <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-xl shadow-yellow-500/10 text-center space-y-6 w-full max-w-sm font-sans">
                <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <span className="text-4xl text-yellow-400">🏆</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter text-yellow-400 font-sans">Rodada {currentRound}/10 Concluída!</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest font-sans">Reflexos rápidos e certeiros!</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center font-sans">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 font-sans">Pontos Ganhos</span>
                  <span className="text-2xl font-extrabold text-yellow-400 font-mono">+{roundEarnedPoints} <span className="text-xs uppercase text-slate-500 font-sans">pts</span></span>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => {
                      if (multiplayerMode === '2p') {
                        setActivePlayerTurn('p1');
                      }
                      setCurrentRound(prev => prev + 1);
                      setRoundFinished(false);
                      startRound();
                    }}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    PRÓXIMA RODADA ({currentRound + 1}/10) 🚀
                  </Button>

                  <Button
                    onClick={() => {
                      onComplete(
                        multiplayerMode === '2p' ? p1Score : score,
                        currentRound,
                        multiplayerMode === '2p',
                        selectedPartner,
                        p1Score,
                        p2Score,
                        'REACTION',
                        false,
                        false
                      );
                      onCancel();
                    }}
                    className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    FINALIZAR PARTIDA 🏁
                  </Button>

                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="w-full h-12 border-slate-705 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer hover:text-white"
                  >
                    Voltar à Central de Jogos
                  </Button>
                </div>
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
                {(multiplayerMode === '2p' ? p1Score + p2Score : (reactionTime > 0 ? Math.max(0, 1000 - reactionTime) : 0))} XP
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
                  setReactionTime(0);
                  setP1Score(0);
                  setP2Score(0);
                  setLevel(1);
                  setGameState('waiting');
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
    </div>
  );
}
