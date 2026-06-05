/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Gamepad2, Award, Users, Bot, Zap, Shield, Swords, RotateCcw } from 'lucide-react';
import { Player } from '../types';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';

interface DamaGameProps {
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

interface DamaPiece {
  id: string;
  color: 'yellow' | 'red'; // yellow = Player/Patrol, red = AI/Rogue
  isKing: boolean;
}

interface Coordinate {
  r: number;
  c: number;
}

interface Move {
  from: Coordinate;
  to: Coordinate;
  captured?: Coordinate;
}

const PARTNER_OPTIONS = [
  {
    id: 'bruno',
    name: 'Sargento Bruno 🎖️',
    avatar: '👮',
    desc: 'Tático Equilibrado',
    profile: 'Nível Fácil. Comportamento clássico, foca em construir barreiras mas aceita trocas.',
    difficulty: 'Fácil' as const,
  },
  {
    id: 'silva',
    name: 'Cabo Silva 🚓',
    avatar: '🛡️',
    desc: 'Escudo de Patrulha',
    profile: 'Nível Médio. Excelente defensivamente. Protege as colunas e as linhas de fundo.',
    difficulty: 'Médio' as const,
  },
  {
    id: 'rocha',
    name: 'Inspetora Rocha 🕵️',
    avatar: '⚡',
    desc: 'Estrategista Letal',
    profile: 'Nível Difícil. Extremamente agressiva. Busca coroamento rápido de Damas para dominar.',
    difficulty: 'Difícil' as const,
  }
];

export function DamaGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: DamaGameProps) {
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Médio');
  const [selectedPartner, setSelectedPartner] = useState<typeof PARTNER_OPTIONS[0]>(PARTNER_OPTIONS[1]);
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [playerColor, setPlayerColor] = useState<'yellow' | 'cyan' | 'violet' | 'emerald'>('yellow');

  // Game States
  const [board, setBoard] = useState<(DamaPiece | null)[][]>(() => createInitialBoard());
  const [turn, setTurn] = useState<'yellow' | 'red'>('yellow');
  const [selectedPiece, setSelectedPiece] = useState<Coordinate | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [consecutiveJumpPiece, setConsecutiveJumpPiece] = useState<Coordinate | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'victory' | 'failed' | 'draw'>('playing');

  // 10 rounds per level progression
  const [level, setLevel] = useState<number>(1);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [accumulatedScore, setAccumulatedScore] = useState<number>(0);
  const [roundFinished, setRoundFinished] = useState<boolean>(false);
  const [roundOutcome, setRoundOutcome] = useState<'victory' | 'failed' | 'draw' | null>(null);
  const [roundScore, setRoundScore] = useState<number>(0);

  // Metrics
  const [yellowCaptures, setYellowCaptures] = useState(0);
  const [redCaptures, setRedCaptures] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [lastCaptureMove, setLastCaptureMove] = useState(0); // for draw detection

  // Iniciar jogo com parceiro selecionado
  useEffect(() => {
    if (selectedPartner.id === 'local') {
      setMultiplayerMode('2p');
      setDifficulty('Médio');
    } else {
      setMultiplayerMode('1p');
      setDifficulty(selectedPartner.difficulty);
    }
  }, [selectedPartner]);

  // Create start conditions for a checkers board (12 pieces each on dark squares)
  function createInitialBoard(): (DamaPiece | null)[][] {
    const freshBoard: (DamaPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    let pieceId = 1;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) {
            freshBoard[r][c] = { id: `red-${pieceId++}`, color: 'red', isKing: false };
          } else if (r > 4) {
            freshBoard[r][c] = { id: `yellow-${pieceId++}`, color: 'yellow', isKing: false };
          }
        }
      }
    }
    return freshBoard;
  }

  // Restart active game board
  const handleRestart = () => {
    setBoard(createInitialBoard());
    setTurn('yellow');
    setSelectedPiece(null);
    setValidMoves([]);
    setConsecutiveJumpPiece(null);
    setGameState('playing');
    setYellowCaptures(0);
    setRedCaptures(0);
    setMoveCount(0);
    setLastCaptureMove(0);
  };

  const triggerDirectEnd = (outcome: 'victory' | 'failed' | 'draw') => {
    let finalScore = 150; // default draw
    if (outcome === 'victory') {
      finalScore = difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
      playGameSfx('win');
      triggerGameConfetti();
    } else if (outcome === 'failed') {
      finalScore = 100; // consolation
      playGameSfx('incorrect');
    } else {
      playGameSfx('incorrect');
    }

    setRoundScore(finalScore);
    setAccumulatedScore(prev => prev + finalScore);
    setRoundOutcome(outcome);
    setRoundFinished(true);
    setGameState('paused');
  };

  // Check board state for game ending after every move
  useEffect(() => {
    if (!setupComplete || gameState !== 'playing') return;

    // Count available pieces
    let yellowCount = 0;
    let redCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          if (p.color === 'yellow') yellowCount++;
          if (p.color === 'red') redCount++;
        }
      }
    }

    // Capture limits reached
    if (yellowCount === 0) {
      setTimeout(() => triggerDirectEnd('failed'), 50);
      return;
    }
    if (redCount === 0) {
      setTimeout(() => triggerDirectEnd('victory'), 50);
      return;
    }

    // Draw condition: 40 moves without capture
    if (moveCount - lastCaptureMove >= 40) {
      setTimeout(() => triggerDirectEnd('draw'), 50);
      return;
    }

    // Check if the currently active turn player has any valid moves
    const allAvailable = getTurnMoves(turn, board);
    if (allAvailable.length === 0) {
      // If active has no moves, they lose
      if (turn === 'yellow') {
        setTimeout(() => triggerDirectEnd('failed'), 50);
      } else {
        setTimeout(() => triggerDirectEnd('victory'), 50);
      }
    }
  }, [board, turn, setupComplete]);

  // AI execution trigger
  useEffect(() => {
    if (!setupComplete || gameState !== 'playing' || multiplayerMode === '2p' || turn !== 'red') return;

    // Trigger AI move if it's the AI's turn
    const timer = setTimeout(() => {
      executeAIMove();
    }, 850);

    return () => clearTimeout(timer);
  }, [turn, consecutiveJumpPiece, setupComplete, gameState]);

  // Retrieve coordinates of a piece by id
  function findPieceCoordinate(pieceId: string, currentBoard: (DamaPiece | null)[][]): Coordinate | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c]?.id === pieceId) {
          return { r, c };
        }
      }
    }
    return null;
  }

  // Get all valid moves for a turn
  function getTurnMoves(color: 'yellow' | 'red', currentBoard: (DamaPiece | null)[][]): Move[] {
    // If consecutive jump is in progress, ONLY look for moves from that specific piece
    if (consecutiveJumpPiece) {
      const pieceMoves = getPieceMoves(consecutiveJumpPiece, currentBoard);
      return pieceMoves.filter(m => m.captured !== undefined);
    }

    const list: Move[] = [];
    const captureList: Move[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = currentBoard[r][c];
        if (p && p.color === color) {
          const pieceMoves = getPieceMoves({ r, c }, currentBoard);
          for (const m of pieceMoves) {
            if (m.captured) {
              captureList.push(m);
            } else {
              list.push(m);
            }
          }
        }
      }
    }

    // Checkers rule: capturing is absolutely mandatory if any exist!
    return captureList.length > 0 ? captureList : list;
  }

  // Get valid moves specifically for a single piece
  function getPieceMoves(coord: Coordinate, currentBoard: (DamaPiece | null)[][]): Move[] {
    const p = currentBoard[coord.r][coord.c];
    if (!p) return [];

    const moves: Move[] = [];
    const directions = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    ];

    if (p.isKing) {
      // Long range King/Dama movement (flying king)
      for (const dir of directions) {
        let r = coord.r + dir.dr;
        let c = coord.c + dir.dc;
        let encounteredOpponent = false;
        let opponentCoord: Coordinate | null = null;

        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const targetPiece = currentBoard[r][c];

          if (!encounteredOpponent) {
            if (!targetPiece) {
              // Sliding moves: king can move to any empty square along the diagonal
              moves.push({ from: coord, to: { r, c } });
            } else {
              // Found a piece
              if (targetPiece.color === p.color) {
                // Blocked by friendly piece
                break;
              } else {
                // Opponent piece: prepare for capture!
                encounteredOpponent = true;
                opponentCoord = { r, c };
              }
            }
          } else {
            // After finding the opponent piece, all landing spots must be empty
            if (!targetPiece) {
              moves.push({
                from: coord,
                to: { r, c },
                captured: opponentCoord!
              });
            } else {
              // Blocked by another piece (can't jump more than one piece)
              break;
            }
          }

          r += dir.dr;
          c += dir.dc;
        }
      }
    } else {
      // Standard checkers step rule:
      // Kings move forward and backward. Normal pieces only move forward (yellow up / row decrease, red down / row increase)
      // However, BOTH normal pieces and kings can jump/capture backwards!
      for (const dir of directions) {
        const targetR = coord.r + dir.dr;
        const targetC = coord.c + dir.dc;

        // 1-step move verification
        const isForward = p.color === 'yellow' ? dir.dr < 0 : dir.dr > 0;
        if (isForward) {
          if (targetR >= 0 && targetR < 8 && targetC >= 0 && targetC < 8) {
            if (!currentBoard[targetR][targetC]) {
              moves.push({ from: coord, to: { r: targetR, c: targetC } });
            }
          }
        }

        // 2-step capture/jump moves (backward cap allowed for normal pieces too)
        const captureR = coord.r + dir.dr * 2;
        const captureC = coord.c + dir.dc * 2;
        if (captureR >= 0 && captureR < 8 && captureC >= 0 && captureC < 8) {
          const intermediatePiece = currentBoard[targetR][targetC];
          const landingIsFree = !currentBoard[captureR][captureC];

          if (intermediatePiece && intermediatePiece.color !== p.color && landingIsFree) {
            moves.push({
              from: coord,
              to: { r: captureR, c: captureC },
              captured: { r: targetR, c: targetC }
            });
          }
        }
      }
    }

    return moves;
  }

  // Handle board clicking during the game loop
  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    if (turn === 'red' && multiplayerMode === '1p') return; // AI is processing block

    const clickedPiece = board[r][c];

    // If a consecutive jump is in progress, the player is locked to that piece only
    if (consecutiveJumpPiece) {
      if (consecutiveJumpPiece.r !== r || consecutiveJumpPiece.c !== c) {
        // Highlight they can only click destination cells
        const clickedIsMove = validMoves.find(m => m.to.r === r && m.to.c === c);
        if (clickedIsMove) {
          executeMove(clickedIsMove);
        }
        return;
      }
    }

    // 1. Select internal piece coordinate
    if (clickedPiece && clickedPiece.color === turn) {
      // Find all possible moves for active player to enforce mandatory capture
      const allTurnMoves = getTurnMoves(turn, board);
      const isAnyCaptureAvailable = allTurnMoves.some(m => m.captured !== undefined);

      // Compute moves for selected piece
      let pieceMoves = getPieceMoves({ r, c }, board);

      // Filter: if capture is mandatory, piece must capture
      if (isAnyCaptureAvailable) {
        pieceMoves = pieceMoves.filter(m => m.captured !== undefined);
      }

      setSelectedPiece({ r, c });
      setValidMoves(pieceMoves);
      return;
    }

    // 2. Click a cell to trigger a move
    if (selectedPiece) {
      const activeMove = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (activeMove) {
        executeMove(activeMove);
      } else {
        // De-select only if we are not in consecutive jump state
        if (!consecutiveJumpPiece) {
          setSelectedPiece(null);
          setValidMoves([]);
        }
      }
    }
  };

  // Perform physical state modifications on the board
  function executeMove(move: Move) {
    const nextBoard = board.map(row => [...row]);
    const movingPiece = nextBoard[move.from.r][move.from.c];

    if (!movingPiece) return;

    // Relocate piece
    nextBoard[move.from.r][move.from.c] = null;
    nextBoard[move.to.r][move.to.c] = movingPiece;

    let wasCapture = false;

    // Handle captures
    if (move.captured) {
      nextBoard[move.captured.r][move.captured.c] = null;
      wasCapture = true;
      if (movingPiece.color === 'yellow') {
        setYellowCaptures(prev => prev + 1);
        playGameSfx('correct');
        triggerGameConfetti();
      } else {
        setRedCaptures(prev => prev + 1);
        playGameSfx('incorrect');
      }
      setLastCaptureMove(moveCount + 1);
    }

    // Promote to King (Dama)
    const reachedFarEnd = movingPiece.color === 'yellow' ? move.to.r === 0 : move.to.r === 7;
    if (reachedFarEnd && !movingPiece.isKing) {
      movingPiece.isKing = true;
    }

    setMoveCount(prev => prev + 1);

    // If capture made, check for optional multiple jumps
    if (wasCapture) {
      // Evaluate if this specific piece has further jumps available
      const nextPieceMoves = getPieceMoves(move.to, nextBoard).filter(m => m.captured !== undefined);
      if (nextPieceMoves.length > 0) {
        // Keep the turn active for this piece to make consecutive jump
        setBoard(nextBoard);
        setSelectedPiece(move.to);
        setValidMoves(nextPieceMoves);
        setConsecutiveJumpPiece(move.to);
        return;
      }
    } else {
      playGameSfx('click');
    }

    // Reset selection and toggle turn
    setBoard(nextBoard);
    setSelectedPiece(null);
    setValidMoves([]);
    setConsecutiveJumpPiece(null);
    setTurn(prev => prev === 'yellow' ? 'red' : 'yellow');
  }

  // AI Decision Engine representing various operational difficulties
  function executeAIMove() {
    const allAIMoves = getTurnMoves('red', board);
    if (allAIMoves.length === 0) return;

    // Filter list for only captures
    const captureMoves = allAIMoves.filter(m => m.captured !== undefined);
    const hasMandatoryCapture = captureMoves.length > 0;
    const candidates = hasMandatoryCapture ? captureMoves : allAIMoves;

    let chosen: Move;

    if (difficulty === 'Fácil') {
      // Pick randomly
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (difficulty === 'Médio') {
      // Prefers promoter steps or standard simple protections
      const promoteMoves = candidates.filter(m => m.to.r === 7);
      if (promoteMoves.length > 0 && Math.random() < 0.7) {
        chosen = promoteMoves[0];
      } else {
        // Choose based on positional safety (try not to land in capture position)
        const safeCandidates = candidates.filter(m => {
          const simulatedBoard = board.map(row => [...row]);
          // Apply temp move
          const p = simulatedBoard[m.from.r][m.from.c];
          simulatedBoard[m.from.r][m.from.c] = null;
          simulatedBoard[m.to.r][m.to.c] = p;
          // Check if now vulnerable to next jump
          const oppMoves = getTurnMoves('yellow', simulatedBoard);
          const opponentHasCapture = oppMoves.some(om => om.captured !== undefined);
          return !opponentHasCapture;
        });

        chosen = safeCandidates.length > 0 ? safeCandidates[0] : candidates[0];
      }
    } else {
      // Difícil - Minimax rating evaluation
      let bestScore = -Infinity;
      let bestMove = candidates[0];

      for (const move of candidates) {
        // Clone board for analysis
        const simulatedBoard = board.map(row => [...row]);
        const p = simulatedBoard[move.from.r][move.from.c];
        if (p) {
          simulatedBoard[move.from.r][move.from.c] = null;
          simulatedBoard[move.to.r][move.to.c] = p;
          if (move.captured) {
            simulatedBoard[move.captured.r][move.captured.c] = null;
          }
          if (move.to.r === 7 && !p.isKing) {
            p.isKing = true;
          }
        }

        // Calculate score
        let score = evaluateBoard(simulatedBoard);

        // Subtract score based on opponent's immediate responses
        const oppResponses = getTurnMoves('yellow', simulatedBoard);
        if (oppResponses.length > 0) {
          const hasResponseCapture = oppResponses.some(o => o.captured !== undefined);
          if (hasResponseCapture) {
            score -= 4; // Lose points if opponent can capture
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      chosen = bestMove;
    }

    if (chosen) {
      executeMove(chosen);
    }
  }

  // Piece ratio board evaluation for Hard AI decision scoring
  function evaluateBoard(targetBoard: (DamaPiece | null)[][]): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = targetBoard[r][c];
        if (piece) {
          const multiplier = piece.isKing ? 3 : 1;
          if (piece.color === 'red') {
            score += multiplier * 2.0;
            // Center lanes score premium
            if (c >= 2 && c <= 5) score += 0.2;
            if (r >= 3 && r <= 4) score += 0.2;
          } else {
            score -= multiplier * 2.0;
            if (c >= 2 && c <= 5) score -= 0.2;
          }
        }
      }
    }
    return score;
  }

  // Calculate final score when game is complete
  const getConsolidatedXP = () => {
    if (gameState === 'victory') {
      return difficulty === 'Fácil' ? 300 : difficulty === 'Médio' ? 450 : 700;
    }
    return 100; // Defeat consolidation prize
  };

  const handleFinishSession = () => {
    const finalScore = getConsolidatedXP();
    onComplete(
      finalScore,
      1,
      multiplayerMode === '2p',
      selectedPartner.id === 'local' ? null : selectedPartner,
      multiplayerMode === '2p' ? yellowCaptures * 30 : finalScore,
      multiplayerMode === '2p' ? redCaptures * 30 : 0,
      'DAMA',
      false,
      false
    );
  };

  // If in first page/setup screen
  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto">
        {/* Top Navigation */}
        <div className="w-full max-w-sm flex items-center mb-2">
          <button 
            id="dama-setup-back-btn"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Ativa</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração do Desafio | Dama</span>
          </div>
        </div>

        {/* Brand Display */}
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-400 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-400/10">
            <Gamepad2 className="w-10 h-10 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter col-span-1">Dama Tática</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto text-center">
            Conquiste o território do tabuleiro, arme cercos táticos e coroe suas peças para vencer!
          </p>
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-sm space-y-6 pt-2">
          {/* Whom to play with Selection (Parceiro / Oponente) */}
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Escolha com quem irá jogar</p>
            <div className="grid grid-cols-1 gap-3">
              {PARTNER_OPTIONS.map((opt) => {
                const isSelected = selectedPartner.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`btn-partner-${opt.id}`}
                    onClick={() => {
                      setSelectedPartner(opt);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-[0_0_20px_rgba(250,204,21,0.2)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-3xl bg-slate-950/40 w-12 h-12 rounded-xl flex items-center justify-center">
                      {opt.avatar}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-sm">{opt.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{opt.profile}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div id="color-selector" className="space-y-4">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Cor da sua Pedra de Dama</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'yellow', name: 'Amarelo Padrão', class: 'bg-yellow-400', label: 'Eletricidade' },
                { id: 'cyan', name: 'Azul Celeste', class: 'bg-cyan-400', label: 'Inovação' },
                { id: 'violet', name: 'Roxo Noturno', class: 'bg-purple-500', label: 'Tática' },
                { id: 'emerald', name: 'Verde Guardião', class: 'bg-emerald-500', label: 'Preservação' }
              ].map(opt => (
                <button
                  id={`dama-btn-color-${opt.id}`}
                  key={opt.id}
                  onClick={() => setPlayerColor(opt.id as any)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    playerColor === opt.id 
                      ? 'bg-slate-900 border-yellow-400 text-white scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.15)]' 
                      : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full ${opt.class} border border-white/20 shadow-sm`} />
                    <span className="font-extrabold text-xs">{opt.name}</span>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                    {opt.label}
                  </span>
                  {playerColor === opt.id && (
                    <motion.div 
                      layoutId="active-color-dama"
                      className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-400 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Status display */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="text-yellow-400 w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nível Vinculado</span>
                <span className="text-xs font-black text-white uppercase italic">{selectedPartner.id === 'local' ? 'Cooperativo Local' : `Inteligência IA ${difficulty}`}</span>
              </div>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono font-black text-yellow-400">
                {difficulty === 'Fácil' ? '+300 XP' : difficulty === 'Médio' ? '+450 XP' : '+700 XP'}
              </span>
            </div>
          </div>

          <Button 
            id="start-level-btn"
            onClick={() => setSetupComplete(true)}
            className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/5 active:scale-95 transition-all cursor-pointer"
          >
            INICIAR OPERAÇÃO DAMA 🚀
          </Button>

          <Button 
            id="back-to-center-btn"
            onClick={onCancel}
            variant="outline"
            className="w-full h-12 rounded-2xl border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95 cursor-pointer"
          >
            VOLTAR À CENTRAL DE JOGOS
          </Button>
        </div>
      </div>
    );
  }

  // Active game view
  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center space-y-5 select-none overflow-y-auto pb-20">
      
      {/* Active Game Header */}
      <div className="w-full flex items-center mb-1 max-w-lg">
        <button 
          id="dama-back-btn"
          onClick={() => {
            onComplete(
              0, 
              1,
              multiplayerMode === '2p',
              selectedPartner.id === 'local' ? null : selectedPartner,
              0,
              0,
              'DAMA',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Nível {level} • Rodada {currentRound}/10</span>
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Dama • No Combate</span>
        </div>
        <div className="ml-auto bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-black tracking-widest text-slate-400 font-mono uppercase">{difficulty}</span>
        </div>
      </div>

      {/* Gameplay board HUD */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6">
        
        {/* Opponent Identity Bar */}
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-3">
            <div className="text-2xl bg-red-600/10 border border-red-500/30 w-10 h-10 rounded-xl flex items-center justify-center">
              {selectedPartner.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white">{multiplayerMode === '2p' ? 'Oponente Local (P2)' : selectedPartner.name}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aliança Operacional</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-extrabold text-slate-400">Pontos Red:</span>
            <span className="text-sm font-black text-red-500 font-mono italic">
              {redCaptures} / 12
            </span>
          </div>
        </div>

        {/* Actual Checkers Board */}
        <div className="relative aspect-square w-full bg-[#11141d] border-4 border-[#252c3c] p-2.5 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-slate-800/80">
          <div className="grid grid-cols-8 grid-rows-8 h-full w-full gap-[2px]">
            {board.map((row, r) => (
              <div key={r} className="contents">
                {row.map((piece, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selectedPiece?.r === r && selectedPiece?.c === c;
                  const isPossibleDest = validMoves.some(m => m.to.r === r && m.to.c === c);
                  const isCaptureTarget = validMoves.find(m => m.to.r === r && m.to.c === c)?.captured;
                  
                  return (
                    <div
                      key={c}
                      onClick={() => handleCellClick(r, c)}
                      className={`relative flex items-center justify-center transition-all duration-200 select-none ${
                        isDark 
                          ? 'bg-[#222837] hover:bg-[#2b3347] border border-[#2b354a]/25' 
                          : 'bg-[#151924] opacity-80 border border-slate-900/10'
                      }`}
                      style={{ cursor: isDark ? 'pointer' : 'default' }}
                    >
                      {/* Grid numbering label for tactical visual feel */}
                      {isDark && (
                        <span className="absolute bottom-1 right-1 font-mono text-[7px] text-slate-500 font-bold tracking-tighter opacity-80 select-none">
                          {String.fromCharCode(65 + c)}{8 - r}
                        </span>
                      )}

                      {/* Display Move Highlights */}
                      {isPossibleDest && (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 opacity-75 ${isCaptureTarget ? 'bg-red-500/20' : 'bg-emerald-500/25'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full ${isCaptureTarget ? 'bg-red-500 animate-pulse' : 'bg-[#10b981]'}`} />
                        </div>
                      )}

                      {/* Check Piece Render */}
                      {piece && (
                        <motion.div
                          layoutId={`piece-anim-${piece.id}`}
                          className={`relative w-[85%] h-[85%] rounded-full flex items-center justify-center shadow-lg shadow-black/60 border-2 transition-transform duration-200 select-none ${
                            piece.color === 'yellow'
                              ? playerColor === 'cyan'
                                ? `bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 border-cyan-200 ${isSelected ? 'scale-110 shadow-2xl shadow-cyan-400/40 ring-4 ring-cyan-400 animate-pulse' : ''}`
                                : playerColor === 'violet'
                                ? `bg-gradient-to-br from-purple-400 to-violet-600 text-white border-purple-200 ${isSelected ? 'scale-110 shadow-2xl shadow-purple-500/40 ring-4 ring-purple-400 animate-pulse' : ''}`
                                : playerColor === 'emerald'
                                ? `bg-gradient-to-br from-emerald-400 to-teal-600 text-white border-emerald-200 ${isSelected ? 'scale-110 shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-400 animate-pulse' : ''}`
                                : `bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 border-yellow-250 ${isSelected ? 'scale-110 shadow-2xl shadow-yellow-400/40 ring-4 ring-yellow-400 animate-pulse' : ''}`
                              : `bg-gradient-to-br from-red-500 to-rose-700 text-white border-red-300 ${isSelected ? 'scale-110 shadow-2xl shadow-red-500/40 ring-4 ring-red-500 animate-pulse' : ''}`
                          }`}
                        >
                          {/* Inner concentric ridges for an authentic, premium checker look */}
                          <div className="w-[75%] h-[75%] rounded-full border border-black/15 flex items-center justify-center shadow-inner">
                            <div className="w-[70%] h-[70%] rounded-full border border-black/10 flex items-center justify-center">
                              {piece.isKing ? (
                                <span className="text-xs drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)] font-black text-white">👑</span>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-white/25 border border-black/5" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Player Turn Indicator */}
        <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
          <div className="flex items-center gap-3 font-sans">
            <div className={`w-10 h-10 ${
              playerColor === 'cyan' ? 'bg-cyan-500/10 border border-cyan-500/35 text-cyan-400' :
              playerColor === 'violet' ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
              playerColor === 'emerald' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
              'bg-yellow-400/10 border border-yellow-500/30 text-yellow-400'
            } rounded-xl flex items-center justify-center text-xl`}>
              👷
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-white">Seu Personagem {multiplayerMode === '2p' ? '(P1)' : ''}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Patrulha Ativa</span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-sans">
            <span className="text-[9.5px] font-extrabold text-slate-400">Pontos {playerColor === 'cyan' ? 'Azuis' : playerColor === 'violet' ? 'Roxos' : playerColor === 'emerald' ? 'Verdes' : 'Amarelos'}:</span>
            <span className={`text-sm font-black font-mono italic ${
              playerColor === 'cyan' ? 'text-cyan-400' :
              playerColor === 'violet' ? 'text-purple-400 font-sans' :
              playerColor === 'emerald' ? 'text-emerald-400 font-sans' :
              'text-yellow-400 font-sans'
            }`}>
              {yellowCaptures} / 12
            </span>
          </div>
        </div>

        {/* Turn Indicator Banner */}
        <div className="w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={turn}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`inline-block px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] border font-sans ${
                turn === 'yellow'
                  ? playerColor === 'cyan'
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                    : playerColor === 'violet'
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                    : playerColor === 'emerald'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400'
                  : 'bg-red-500/10 border-red-500/40 text-red-400'
              }`}
            >
              ⏱️ TURNO: {turn === 'yellow' ? (multiplayerMode === '2p' ? `Player 1 (${playerColor.toUpperCase()})` : 'Seu Turno!') : (multiplayerMode === '2p' ? 'Player 2 (Red)' : 'Vez do Oponente...')}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Command Actions Bar */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={handleRestart}
            variant="outline"
            className="border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> REINICIAR
          </Button>

          <Button
            onClick={() => setSetupComplete(false)}
            variant="outline"
            className="border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider hover:bg-slate-800 hover:text-white"
          >
            CONFIGURAÇÕES
          </Button>
        </div>
      </div>

      {/* Command Actions Bar */}
      <div className="w-full flex justify-center mt-6">
        <Button 
          id="dama-abandon-btn"
          onClick={() => {
            onComplete(
              0, 
              1,
              multiplayerMode === '2p',
              selectedPartner,
              0,
              0,
              'DAMA',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>

      {/* Overlay Screens (Victory, Defeat, Draw) removed - handled globally */}
      <AnimatePresence>
        {roundFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl space-y-6">
              <div className="bg-yellow-500/20 border-2 border-yellow-500 w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-glow shadow-yellow-500/40">🏆</div>
              <h2 className="text-3xl font-black text-white italic uppercase font-sans">Rodada {currentRound}/10 Concluída!</h2>
              
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 w-full mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Resultado</span>
                <span className={`text-xl font-black block uppercase ${roundOutcome === 'victory' ? 'text-emerald-400' : roundOutcome === 'failed' ? 'text-rose-500' : 'text-slate-400'}`}>
                  {roundOutcome === 'victory' ? 'Vitória ✔️' : roundOutcome === 'failed' ? 'Derrota 🚫' : 'Empate 🤝'}
                </span>
                <span className="text-sm font-black text-yellow-400 font-mono block mt-2">+{roundScore} XP</span>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => {
                    if (currentRound < 10) {
                      setCurrentRound(prev => prev + 1);
                      setRoundFinished(false);
                      setRoundOutcome(null);
                      // Reset table board
                      setBoard(createInitialBoard());
                      setTurn('yellow');
                      setSelectedPiece(null);
                      setValidMoves([]);
                      setConsecutiveJumpPiece(null);
                      setYellowCaptures(0);
                      setRedCaptures(0);
                      setMoveCount(0);
                      setLastCaptureMove(0);
                      setGameState('playing');
                    } else {
                      // Silent save in background when raising level
                      onComplete(
                        accumulatedScore,
                        10,
                        multiplayerMode === '2p',
                        selectedPartner.id === 'local' ? null : selectedPartner,
                        multiplayerMode === '2p' ? yellowCaptures * 30 : accumulatedScore,
                        multiplayerMode === '2p' ? redCaptures * 30 : 0,
                        'DAMA',
                        false,
                        true // keepInGameSelection
                      );

                      setLevel(prev => prev + 1);
                      setCurrentRound(1);
                      setRoundFinished(false);
                      setRoundOutcome(null);
                      
                      // Reset table board
                      setBoard(createInitialBoard());
                      setTurn('yellow');
                      setSelectedPiece(null);
                      setValidMoves([]);
                      setConsecutiveJumpPiece(null);
                      setYellowCaptures(0);
                      setRedCaptures(0);
                      setMoveCount(0);
                      setLastCaptureMove(0);
                      setGameState('playing');
                    }
                  }}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  {currentRound < 10 ? `PRÓXIMA RODADA (${currentRound + 1}/10) 🚀` : "PRÓXIMO NÍVEL ⚡"}
                </Button>

                <Button
                  onClick={() => {
                    onComplete(
                      accumulatedScore,
                      currentRound,
                      multiplayerMode === '2p',
                      selectedPartner.id === 'local' ? null : selectedPartner,
                      multiplayerMode === '2p' ? yellowCaptures * 30 : accumulatedScore,
                      multiplayerMode === '2p' ? redCaptures * 30 : 0,
                      'DAMA',
                      false,
                      false // keepInGameSelection = false -> returns to central
                    );
                    onCancel();
                  }}
                  className="w-full h-12 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
                >
                  FINALIZAR PARTIDA 🏁
                </Button>

                <Button
                  onClick={() => {
                    onComplete(
                      accumulatedScore,
                      currentRound,
                      multiplayerMode === '2p',
                      selectedPartner.id === 'local' ? null : selectedPartner,
                      multiplayerMode === '2p' ? yellowCaptures * 30 : accumulatedScore,
                      multiplayerMode === '2p' ? redCaptures * 30 : 0,
                      'DAMA',
                      false,
                      false
                    );
                    onCancel();
                  }}
                  variant="outline"
                  className="w-full h-12 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer hover:text-white"
                >
                  Voltar à Central de Jogos
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
