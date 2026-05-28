/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Brain, ArrowLeft } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface MemoryGameProps {
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

const CARDS_POOL = ['🚗', '🚛', '🚧', '⛽', '🚦', '🛑', '🅿️', '🛣️', '🏍️', '🚐', '🚑', '🚒', '🚓', '🚕', '🚌', '🚅'];

const getMaxTime = (diff: 'Fácil' | 'Médio' | 'Difícil', pairs: number) => {
  const secondsPerPair = diff === 'Fácil' ? 2.5 : diff === 'Médio' ? 1.8 : 1.4;
  const baseSeconds = diff === 'Fácil' ? 15 : diff === 'Médio' ? 11 : 7;
  const cap = diff === 'Fácil' ? 30 : diff === 'Médio' ? 24 : 18;
  const calculated = Math.round(baseSeconds + pairs * secondsPerPair);
  return Math.min(calculated, cap);
};

export function MemoryGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: MemoryGameProps) {
  const [board, setBoard] = useState<{ id: number, icon: string, flipped: boolean, matched: boolean }[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [pairsCount, setPairsCount] = useState(4);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
  const [setupComplete, setSetupComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25);
  const [maxTime, setMaxTime] = useState(25);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  useEffect(() => {
    if (setupComplete) {
      startNewGame();
    }
  }, [setupComplete]);

  useEffect(() => {
    // Timer disabled per user request
  }, []);

  const startNewGame = () => {
    // Pick unique icons from pool
    const shuffledPool = [...CARDS_POOL].sort(() => Math.random() - 0.5);
    const selectedIcons = shuffledPool.slice(0, pairsCount);
    
    const deck = [...selectedIcons, ...selectedIcons]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, flipped: false, matched: false }));
    
    setBoard(deck);
    setSelection([]);
    setMoves(0);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');

    const initialTime = getMaxTime(difficulty, pairsCount);
    setMaxTime(initialTime);
    setTimeLeft(initialTime);
    setIsTimeOut(false);
  };

  const handleCardClick = (id: number) => {
    if (selection.length === 2 || board[id].flipped || board[id].matched || isTimeOut) return;

    const newBoard = [...board];
    newBoard[id].flipped = true;
    setBoard(newBoard);

    const newSelection = [...selection, id];
    setSelection(newSelection);

    if (newSelection.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newSelection;
      
      if (board[first].icon === board[second].icon) {
        setTimeout(() => {
          const matchedBoard = [...board];
          matchedBoard[first].matched = true;
          matchedBoard[second].matched = true;
          setBoard(matchedBoard);
          setSelection([]);
          
          // Difficulty multiplier
          const multiplier = difficulty === 'Fácil' ? 1 : difficulty === 'Médio' ? 1.5 : 2;
          const points = Math.round(200 * multiplier);
          
          // Time bonus for finishing fast - disabled per user request
          const isFinished = matchedBoard.every(c => c.matched);
          const timeBonus = 0;
          const totalEarned = points + timeBonus;

          let finalScore = score;
          let finalP1 = p1Score;
          let finalP2 = p2Score;

          if (multiplayerMode === '2p') {
            if (activePlayerTurn === 'p1') {
              finalP1 = p1Score + totalEarned;
              setP1Score(finalP1);
            } else {
              finalP2 = p2Score + totalEarned;
              setP2Score(finalP2);
            }
          } else {
            finalScore = score + totalEarned;
            setScore(finalScore);
          }
          if (onScoreUpdate) onScoreUpdate(totalEarned);

          // Computa os pontos imediatamente no faturamento geral de patrulhas e perfil
          onComplete(
            multiplayerMode === '2p' ? finalP1 : finalScore,
            1,
            multiplayerMode === '2p',
            selectedPartner,
            finalP1,
            finalP2,
            'MEMORY',
            false,
            true // keepInGameSelection
          );

          if (isFinished) {
            setTimeout(() => {
              onComplete(
                multiplayerMode === '2p' ? finalP1 : finalScore,
                1,
                multiplayerMode === '2p',
                selectedPartner,
                finalP1,
                finalP2,
                'MEMORY'
              );
            }, 1000);
          }
        }, 500);
      } else {
        const hideTimeout = difficulty === 'Fácil' ? 1000 : difficulty === 'Médio' ? 700 : 400;
        setTimeout(() => {
          const resetBoard = [...board];
          resetBoard[first].flipped = false;
          resetBoard[second].flipped = false;
          setBoard(resetBoard);
          setSelection([]);
          if (multiplayerMode === '2p') {
            setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
          }
        }, hideTimeout);
      }
    }
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Bar for Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="mem-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Memória</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Memória</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Brain className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Memória</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Encontre os pares correspondentes de trânsito</p>
        </div>
        
        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center font-sans">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['Fácil', 'Médio', 'Difícil'] as const).map(level => (
                <button
                  id={`btn-diff-${level}`}
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`relative flex items-center p-4 rounded-xl border-2 transition-all group ${
                    difficulty === level 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">{level}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {level === 'Fácil' ? 'Mais Tempo de Memorização (1000ms)' : level === 'Médio' ? 'Tempo de Memorização Moderado (700ms)' : 'Exigência Extrema (400ms)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-memory"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div id="pairs-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Quantidade de Pares</p>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  id={`btn-pair-${num}`}
                  key={num}
                  onClick={() => setPairsCount(num)}
                  className={`h-11 rounded-xl font-black text-xs transition-all ${pairsCount === num ? 'bg-yellow-400 text-slate-900 scale-105 shadow-lg shadow-yellow-400/20 shadow-inner' : 'bg-slate-900 text-slate-400 border border-slate-805'}`}
                >
                  {num} Pares
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
            id="start-memory-btn"
            onClick={() => setSetupComplete(true)} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
          </Button>

          <Button 
            id="abandon-mem-setup-btn"
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
          id="mem-back-btn"
          onClick={() => setSetupComplete(false)}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Memória</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty.toUpperCase()} | {pairsCount} Pares</span>
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

      <div className="w-full flex justify-between items-center mb-6">
        <div className="text-left w-24">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Memória</p>
          <p className="text-xl font-black text-yellow-400">Score: {score}</p>
        </div>

        {/* Dynamic Timer Display - Hidden per user request */}

        <div className="text-right w-24">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Movimentos</p>
          <p className="text-xl font-black text-white">{moves}</p>
        </div>
      </div>

      {/* Visual Timer Bar - Hidden per user request */}

      <div className={`grid ${pairsCount > 6 ? 'grid-cols-4' : 'grid-cols-3 md:grid-cols-4'} gap-3 w-full max-w-lg mb-10`}>
        {board.map((card) => (
          <motion.button
            key={card.id}
            id={`mem-card-${card.id}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-2xl flex items-center justify-center text-2xl md:text-3xl transition-all duration-300 border-2 ${
              card.flipped || card.matched 
                ? 'bg-slate-700 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]' 
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {(card.flipped || card.matched) ? card.icon : '❓'}
          </motion.button>
        ))}
      </div>

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
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setSelection([]);
                  setMoves(0);
                  setIsTimeOut(false);
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
          id="abandon-mem-btn"
          onClick={() => {
            // Salva os pontos acumulados até agora e incrementa 1 patrulha de forma imediata antes de abrir o modal
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'MEMORY',
              false,
              true // keepInGameSelection = true
            );
            setShowAbandonModal(true);
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* Timeout Full Screen Overlay */}
      <AnimatePresence>
        {isTimeOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm flex flex-col items-center text-center space-y-6 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl relative"
            >
              <div className="relative">
                <div className="w-20 h-20 bg-slate-950 border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20">
                  <span className="text-4xl animate-pulse">⏱️</span>
                </div>
                <span className="absolute -top-1 -right-1 text-xl">🚨</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">FALHA NA INSPEÇÃO</span>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Inspeção Interrompida</h3>
                <p className="text-slate-400 text-xs leading-relaxed italic">
                  O tempo regulamentar para concluir esta inspeção expirou. Nenhum ponto de vistoria foi faturado nesta jogada.
                </p>
              </div>

              {/* Score box */}
              <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-sans">Pontos Ganhos</span>
                <span className="text-3xl font-black text-red-500 font-mono block">0 XP</span>
              </div>

              <div className="w-full flex flex-col gap-3">
                <Button 
                  onClick={() => onComplete(0, 1, false, null, 0, 0, 'MEMORY', true, false)} 
                  className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
                >
                  VOLTAR À CENTRAL DE JOGOS
                </Button>
                <Button 
                  onClick={() => {
                    setSetupComplete(false);
                    setIsTimeOut(false);
                  }}
                  variant="outline" 
                  className="w-full h-14 border border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all bg-slate-900/40 font-sans"
                >
                  TENTAR NOVAMENTE 🔁
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
