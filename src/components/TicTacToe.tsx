/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Grid, Circle, X, ArrowLeft, Trophy, Users, User, Brain, Cpu, Zap, Sparkles } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TicTacToeProps {
  onComplete: (
    score: number, 
    roundsPlayed: number,
    isMultiplayer?: boolean,
    partner?: Player | null,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean,
    keepInGameSelection?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
  room?: any;
  player?: Player;
  onLeaveRoom?: () => void;
}

type BoardState = ('X' | 'O' | null)[];

export function TicTacToe({ 
  onComplete, 
  onScoreUpdate, 
  onCancel, 
  currentPlayerId,
  room,
  player,
  onLeaveRoom
}: TicTacToeProps) {
  // Game Setup States
  const [difficulty, setDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O'>('X');
  const [setupComplete, setSetupComplete] = useState(false);

  // Gameplay States
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true); // X is player 1, O is Player 2 or AI
  const [gameState, setGameState] = useState<'playing' | 'won' | 'draw'>('playing');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [winnerMark, setWinnerMark] = useState<'X' | 'O' | null>(null);
  const [score, setScore] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);

  // Timer States - based on difficulty, greater than 30 seconds
  const [timeLeft, setTimeLeft] = useState(35);
  const [maxTime, setMaxTime] = useState(35);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Synchronize Firestore Room for Online Multiplayer
  useEffect(() => {
    if (!room || !player) return;

    setMultiplayerMode('2p' as any);
    setSetupComplete(true);

    const isCreator = player.uid === room.creatorId;
    setPlayerSymbol(isCreator ? 'X' : 'O');

    const partnerPlayer: Player = isCreator
      ? { uid: room.partnerId || '', displayName: room.partnerName || 'Parceiro', base: room.partnerBase || '', shift: room.partnerShift || '', avatar: room.partnerAvatar || '👷' } as any
      : { uid: room.creatorId, displayName: room.creatorName, base: room.creatorBase, shift: room.creatorShift, avatar: room.creatorAvatar || '👷' } as any;

    setSelectedPartner(partnerPlayer);

    const roomRef = doc(db, 'multiplayer_rooms', room.id);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const rData = snapshot.data();
      if (rData.board) {
        setBoard(rData.board);
      }

      const currentTurn = rData.turn === 'creator' ? 'p1' : 'p2';
      setActivePlayerTurn(currentTurn);
      setIsXNext(rData.turn === 'creator');

      if (rData.status === 'completed') {
        if (rData.winnerId) {
          setGameState('won');
          setWinnerMark(rData.winnerId === room.creatorId ? 'X' : 'O');
          if (rData.winningLine) setWinningLine(rData.winningLine);
        } else {
          setGameState('draw');
        }
        setP1Score(rData.p1Score || 0);
        setP2Score(rData.p2Score || 0);
      } else if (rData.status === 'playing' || rData.status === 'ready') {
        setGameState('playing');
        setWinningLine(null);
        setWinnerMark(null);
      }
    });

    return () => unsubscribe();
  }, [room, player]);

  // Get max time for each difficulty level
  const getMaxTimeForDifficulty = (diff: 'facil' | 'medio' | 'dificil') => {
    if (diff === 'facil') return 35;  // 35s greater than 30s
    if (diff === 'medio') return 45;  // 45s
    return 55;                        // 55s
  };

  // Setup the game timer - disabled per user request
  useEffect(() => {
    // No timer running
  }, []);

  // Handle AI turn triggers
  useEffect(() => {
    const isAiTurn = multiplayerMode === '1p' && (isXNext !== (playerSymbol === 'X'));
    if (setupComplete && isAiTurn && gameState === 'playing' && !isAiThinking) {
      setIsAiThinking(true);
      const thinkTime = difficulty === 'facil' ? 600 : difficulty === 'medio' ? 1000 : 1300;
      const timeout = setTimeout(() => {
        makeAiMove();
      }, thinkTime);
      return () => clearTimeout(timeout);
    }
  }, [isXNext, setupComplete, multiplayerMode, gameState, board, playerSymbol]);

  const initGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setGameState('playing');
    setWinningLine(null);
    setWinnerMark(null);
    setIsAiThinking(false);
    setIsTimeOut(false);
    
    const time = getMaxTimeForDifficulty(difficulty);
    setTimeLeft(time);
    setMaxTime(time);
  };

  const startWholeGame = () => {
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setCompletedRounds(0);
    setActivePlayerTurn('p1');
    initGame();
    setSetupComplete(true);
  };

  // Winning lines mapping
  const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const checkWinner = (currentBoard: BoardState) => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], combo };
      }
    }
    const isDraw = currentBoard.every(cell => cell !== null);
    return { winner: null, combo: null, isDraw };
  };

  const handleCellClick = async (index: number) => {
    if (board[index] || gameState !== 'playing' || isTimeOut || isAiThinking) return;

    if (room) {
      const isCreator = player?.uid === room.creatorId;
      const isMyTurn = (room.turn === 'creator' && isCreator) || (room.turn === 'partner' && !isCreator);
      if (!isMyTurn) return;

      const newBoard = [...board];
      const myMark = isCreator ? 'X' : 'O';
      newBoard[index] = myMark;
      setBoard(newBoard);

      const result = checkWinner(newBoard);
      const roomRef = doc(db, 'multiplayer_rooms', room.id);

      let updatePayload: any = {
        board: newBoard,
        turn: isCreator ? 'partner' : 'creator',
        updatedAt: new Date().toISOString()
      };

      if (result.winner) {
        updatePayload.status = 'completed';
        updatePayload.winnerId = isCreator ? room.creatorId : room.partnerId;
        updatePayload.winnerName = isCreator ? room.creatorName : room.partnerName;
        updatePayload.winningLine = result.combo;
        updatePayload.p1Score = isCreator ? (room.p1Score || 0) + 150 : (room.p1Score || 0);
        updatePayload.p2Score = !isCreator ? (room.p2Score || 0) + 150 : (room.p2Score || 0);

        await updateDoc(roomRef, updatePayload);

        const finalScore = isCreator === (result.winner === 'X') ? 150 : 30;
        if (onScoreUpdate) onScoreUpdate(finalScore);

        setTimeout(() => {
          onComplete(
            finalScore,
            1,
            true,
            selectedPartner,
            isCreator ? 150 : 30,
            !isCreator ? 150 : 30,
            'TIC_TAC_TOE'
          );
        }, 2500);
      } else if (result.isDraw) {
        updatePayload.status = 'completed';
        updatePayload.p1Score = (room.p1Score || 0) + 50;
        updatePayload.p2Score = (room.p2Score || 0) + 50;

        await updateDoc(roomRef, updatePayload);
        if (onScoreUpdate) onScoreUpdate(50);

        setTimeout(() => {
          onComplete(
            50,
            1,
            true,
            selectedPartner,
            50,
            50,
            'TIC_TAC_TOE'
          );
        }, 2500);
      } else {
        await updateDoc(roomRef, updatePayload);
      }
      return;
    }

    const newBoard = [...board];
    const currentMark = isXNext ? 'X' : 'O';
    newBoard[index] = currentMark;
    setBoard(newBoard);

    const result = checkWinner(newBoard);

    if (result.winner) {
      setGameState('won');
      setWinningLine(result.combo);
      setWinnerMark(result.winner);
      awardPoints(result.winner);
      setCompletedRounds(prev => prev + 1);
    } else if (result.isDraw) {
      setGameState('draw');
      awardPoints('draw');
      setCompletedRounds(prev => prev + 1);
    } else {
      setIsXNext(!isXNext);
      if (multiplayerMode === '2p') {
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    }
  };

  // Smart AI Move Logic based on selected difficulty
  const makeAiMove = () => {
    const availableIndices: number[] = [];
    board.forEach((val, idx) => {
      if (val === null) availableIndices.push(idx);
    });

    if (availableIndices.length === 0 || gameState !== 'playing') {
      setIsAiThinking(false);
      return;
    }

    let chosenIndex = -1;
    const aiSymbol = playerSymbol === 'X' ? 'O' : 'X';
    const humanSymbol = playerSymbol;

    // Helper: find winning index for a given mark ('O' or 'X')
    const findWinningIndex = (mark: 'X' | 'O') => {
      for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        const vals = [board[a], board[b], board[c]];
        const markCount = vals.filter(v => v === mark).length;
        const emptyCount = vals.filter(v => v === null).length;
        if (markCount === 2 && emptyCount === 1) {
          if (board[a] === null) return a;
          if (board[b] === null) return b;
          if (board[c] === null) return c;
        }
      }
      return -1;
    };

    if (difficulty === 'facil') {
      // 80% Random, 20% Win check
      const checkWinChance = Math.random() < 0.2;
      const winningMove = findWinningIndex(aiSymbol);
      if (checkWinChance && winningMove !== -1) {
        chosenIndex = winningMove;
      } else {
        chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }
    } else if (difficulty === 'medio') {
      // Medium: Checks for own win first (100%), then blocks player win (70%), then center, otherwise random.
      const ownWin = findWinningIndex(aiSymbol);
      if (ownWin !== -1) {
        chosenIndex = ownWin;
      } else {
        const playerWin = findWinningIndex(humanSymbol);
        if (playerWin !== -1 && Math.random() < 0.75) {
          chosenIndex = playerWin;
        } else if (board[4] === null) {
          chosenIndex = 4; // Prefer center
        } else {
          chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }
      }
    } else {
      // Hard (Difícil): Near perfect strategy
      // 1. Own win
      const ownWin = findWinningIndex(aiSymbol);
      if (ownWin !== -1) {
        chosenIndex = ownWin;
      } else {
        // 2. Block player win
        const playerWin = findWinningIndex(humanSymbol);
        if (playerWin !== -1) {
          chosenIndex = playerWin;
        } else {
          // 3. Take center if empty
          if (board[4] === null) {
            chosenIndex = 4;
          } else {
            // 4. Opt corners if open
            const corners = [0, 2, 6, 8].filter(c => board[c] === null);
            if (corners.length > 0) {
              chosenIndex = corners[Math.floor(Math.random() * corners.length)];
            } else {
              // 5. Take whatever is left
              chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            }
          }
        }
      }
    }

    if (chosenIndex !== -1) {
      const newBoard = [...board];
      newBoard[chosenIndex] = aiSymbol;
      setBoard(newBoard);

      const result = checkWinner(newBoard);
      if (result.winner) {
        setGameState('won');
        setWinningLine(result.combo);
        setWinnerMark(result.winner);
        awardPoints(result.winner);
        setCompletedRounds(prev => prev + 1);
      } else if (result.isDraw) {
        setGameState('draw');
        awardPoints('draw');
        setCompletedRounds(prev => prev + 1);
      } else {
        setIsXNext(playerSymbol === 'X');
      }
    }
    
    setIsAiThinking(false);
  };

  const awardPoints = (winnerToken: 'X' | 'O' | 'draw') => {
    // Determine points baseline
    const baseWin = difficulty === 'facil' ? 100 : difficulty === 'medio' ? 150 : 250;
    const timeBonus = 0;
    const pointsGained = baseWin + timeBonus;

    let finalP1 = p1Score;
    let finalP2 = p2Score;
    let singleScore = score;

    if (multiplayerMode === '2p') {
      if (winnerToken === 'X') {
        finalP1 = p1Score + pointsGained;
        setP1Score(finalP1);
        if (onScoreUpdate) onScoreUpdate(pointsGained);
      } else if (winnerToken === 'O') {
        finalP2 = p2Score + pointsGained;
        setP2Score(finalP2);
        if (onScoreUpdate) onScoreUpdate(pointsGained);
      } else {
        // Draw rewards 50 XP to both
        finalP1 = p1Score + 50;
        finalP2 = p2Score + 50;
        setP1Score(finalP1);
        setP2Score(finalP2);
        if (onScoreUpdate) onScoreUpdate(50);
      }
    } else {
      // 1P Mode points rules
      if (winnerToken === playerSymbol) {
        singleScore = score + pointsGained;
        setScore(singleScore);
        if (onScoreUpdate) onScoreUpdate(pointsGained);
      } else if (winnerToken === (playerSymbol === 'X' ? 'O' : 'X')) {
        // Lost - no points
      } else {
        // Draw: minor bonus
        singleScore = score + 40;
        setScore(singleScore);
        if (onScoreUpdate) onScoreUpdate(40);
      }
    }

    // Directly trigger standard Parent completion after showing final board for 1.5 seconds
    setTimeout(() => {
      onComplete(
        multiplayerMode === '2p' ? finalP1 + finalP2 : singleScore,
        completedRounds + 1,
        multiplayerMode === '2p',
        selectedPartner,
        finalP1,
        finalP2,
        'TIC_TAC_TOE'
      );
    }, 1500);
  };

  const getDifficultyLabel = () => {
    if (difficulty === 'facil') return 'Fácil';
    if (difficulty === 'medio') return 'Médio';
    return 'Difícil';
  };

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Header Setup */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="ttt-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col font-sans">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha da Velha</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Jogo da Velha</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-indigo-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Grid className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha da Velha</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Vença no clássico jogo da velha operacional</p>
        </div>

        <div className="w-full max-w-sm space-y-6 pt-2">
          <div id="difficulty-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
            <div className="grid grid-cols-1 gap-3">
              {(['facil', 'medio', 'dificil'] as const).map(level => (
                <button
                  id={`ttt-btn-diff-${level}`}
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`relative flex items-center p-4 rounded-2xl border-2 transition-all ${
                    difficulty === level 
                      ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-black uppercase text-sm italic">
                      {level === 'facil' ? 'Fácil' : level === 'medio' ? 'Médio' : 'Difícil'}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                      {level === 'facil' ? 'Oponente Aprendiz / IA Básica' : level === 'medio' ? 'Oponente Estratégico / IA Avançada' : 'Oponente Mestre / IA Especialista'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-tictactoe"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div id="symbol-selector" className="space-y-4">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Escolha o seu Símbolo</p>
            <div className="grid grid-cols-2 gap-3">
              {(['X', 'O'] as const).map(symbol => (
                <button
                  id={`ttt-btn-symbol-${symbol}`}
                  key={symbol}
                  onClick={() => setPlayerSymbol(symbol)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                    playerSymbol === symbol 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 font-black scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {symbol === 'X' ? (
                      <X className="w-5 h-5 stroke-[3] text-yellow-400" />
                    ) : (
                      <Circle className="w-4 h-4 stroke-[3] text-cyan-400" />
                    )}
                    <span className="font-black uppercase text-xs italic">Jogar de {symbol}</span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-tighter ${playerSymbol === symbol ? 'text-indigo-300' : 'text-slate-600'}`}>
                    {symbol === 'X' ? 'Você Começa' : 'Oponente Começa'}
                  </span>
                  {playerSymbol === symbol && (
                    <motion.div 
                      layoutId="active-symbol-tictactoe"
                      className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Match setup explanation */}
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl flex items-center justify-around text-center mt-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[7px] uppercase tracking-wider font-extrabold text-slate-500">SUAS PEÇAS</span>
                <div className="flex items-center gap-1 px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  {playerSymbol === 'X' ? (
                    <X className="w-4 h-4 stroke-[3] text-yellow-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 stroke-[3] text-cyan-400" />
                  )}
                  <span className="font-black text-white text-[11px]">{playerSymbol}</span>
                </div>
                <span className="text-[7px] text-emerald-400 font-bold uppercase leading-none">Você</span>
              </div>

              <div className="text-slate-600 font-black text-xs">VS</div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[7px] uppercase tracking-wider font-extrabold text-slate-500">IA / OPONENTE</span>
                <div className="flex items-center gap-1 px-3 py-1 bg-slate-950/80 rounded-xl border border-slate-800">
                  {playerSymbol === 'O' ? (
                    <X className="w-4 h-4 stroke-[3] text-yellow-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 stroke-[3] text-cyan-400" />
                  )}
                  <span className="font-black text-white text-[11px]">{playerSymbol === 'X' ? 'O' : 'X'}</span>
                </div>
                <span className="text-[7px] text-red-400 font-bold uppercase leading-none">
                  {multiplayerMode === '1p' ? 'Computador' : selectedPartner ? selectedPartner.displayName : 'Jogador 2'}
                </span>
              </div>
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
            onClick={startWholeGame} 
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR CONFRONTO 🚀'}
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
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-6 select-none">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-2">
        <button 
          id="ttt-back-btn"
          onClick={() => {
            if (room && onLeaveRoom) {
              onLeaveRoom();
            } else {
              setSetupComplete(false);
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha da Velha</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {getDifficultyLabel().toUpperCase()}</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm">
          <MultiplayerGameplayBar
            player1={{ displayName: 'Você' }}
            player2={selectedPartner}
            activePlayer={activePlayerTurn}
            onToggleTurn={() => {
              setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
              setIsXNext(!isXNext);
            }}
            p1Score={p1Score}
            p2Score={p2Score}
          />
        </div>
      )}

      {/* Score panel in 1p */}
      {multiplayerMode === '1p' && (
        <div className="w-full max-w-sm flex justify-between items-center bg-slate-900 border border-slate-805 p-3 px-4 rounded-2xl">
          <div className="text-left">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Seu Score</p>
            <p className="text-lg font-black text-yellow-400">{score} XP</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Oponente</p>
            <p className="text-xs font-bold text-slate-400 uppercase">AI ({getDifficultyLabel()})</p>
          </div>
        </div>
      )}

      {/* Timer display section hidden per user request */}

      <div className="text-center mt-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {multiplayerMode === '1p' ? (
            isXNext === (playerSymbol === 'X') ? `SUA VEZ (${playerSymbol})` : 'PENSANDO...'
          ) : (
            isXNext ? 'VEZ DO JOGADOR 1 (X)' : 'VEZ DO JOGADOR 2 (O)'
          )}
        </h3>
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-3 gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl relative w-72 h-72">
        {board.map((cell, idx) => {
          const isWinning = winningLine?.includes(idx);
          return (
            <button
              id={`ttt-cell-${idx}`}
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={cell !== null || gameState !== 'playing' || isAiThinking}
              className={`w-full h-full rounded-2xl flex items-center justify-center transition-all relative ${
                isWinning 
                  ? 'bg-emerald-500/20 border-2 border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                  : 'bg-slate-950 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 active:scale-95'
              }`}
            >
              <AnimatePresence mode="popLayout">
                {cell === 'X' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                  >
                    <X className="w-10 h-10 stroke-[3]" />
                  </motion.div>
                )}
                {cell === 'O' && (
                  <motion.div
                    initial={{ scale: 0, rotate: 45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  >
                    <Circle className="w-9 h-9 stroke-[3]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {setupComplete && gameState === 'playing' && (
        <div className="w-full flex justify-center mt-6">
          <Button 
            id="ttt-abandon-btn"
            onClick={() => {
              onComplete(
                multiplayerMode === '2p' ? p1Score : score,
                completedRounds || 1,
                multiplayerMode === '2p',
                selectedPartner,
                p1Score,
                p2Score,
                'TIC_TAC_TOE',
                false,
                false
              );
            }}
            className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
          >
            ABANDONAR PATRULHA
          </Button>
        </div>
      )}
    </div>
  );
}
