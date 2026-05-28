/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Search } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface WordSearchProps {
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

import { WORDS } from '../data/words';

const DIRECTIONS = [
  { r: 0, c: 1 },   // Horizontal Right
  { r: 0, c: -1 },  // Horizontal Left
  { r: 1, c: 0 },   // Vertical Down
  { r: -1, c: 0 },  // Vertical Up
  { r: 1, c: 1 },   // Diagonal Down-Right
  { r: 1, c: -1 },  // Diagonal Down-Left
  { r: -1, c: 1 },  // Diagonal Up-Right
  { r: -1, c: -1 }, // Diagonal Up-Left
];

export function WordSearch({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: WordSearchProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<{r: number, c: number, word: string}[]>([]);
  const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gridSize, setGridSize] = useState(10);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  useEffect(() => {
    generateGrid();
  }, [level, difficulty]);

  const generateGrid = () => {
    let baseSize = 10;
    let wordCount = 8;
    if (difficulty === 'easy') {
      baseSize = 9;
    } else if (difficulty === 'medium') {
      baseSize = 11;
    } else if (difficulty === 'hard') {
      baseSize = 13;
    }
    const size = Math.min(baseSize + Math.floor(level / 2), 14);
    setGridSize(size);

    const newGrid = Array.from({ length: size }, () => 
      Array.from({ length: size }, () => '')
    );

    // Pick random words from the large database
    const filteredWords = WORDS.filter(w => w.length >= 3 && w.length <= size - 2);
    const selectedWords: string[] = [];
    while (selectedWords.length < wordCount && filteredWords.length > 0) {
      const w = filteredWords[Math.floor(Math.random() * filteredWords.length)].toUpperCase();
      if (!selectedWords.includes(w)) selectedWords.push(w);
    }
    setTargetWords(selectedWords);

    // Shuffle directions to ensure variety in the same game
    const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

    selectedWords.forEach((word, index) => {
      let placed = false;
      let attempts = 0;
      
      // Try to use a unique direction from the shuffled list first
      const preferredDirs = [
        shuffledDirs[index % shuffledDirs.length], // Primary unique direction
        ...shuffledDirs.filter((_, i) => i !== (index % shuffledDirs.length)) // Fallbacks
      ];

      for (const dir of preferredDirs) {
        if (placed) break;
        
        // Try multiple random start positions for this direction
        for (let posAttempt = 0; posAttempt < 50; posAttempt++) {
          const startR = Math.floor(Math.random() * size);
          const startC = Math.floor(Math.random() * size);

          // Check if fits
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir.r * i;
            const c = startC + dir.c * i;
            if (r < 0 || r >= size || c < 0 || c >= size || (newGrid[r][c] !== '' && newGrid[r][c] !== word[i])) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              newGrid[startR + dir.r * i][startC + dir.c * i] = word[i];
            }
            placed = true;
            break;
          }
        }
      }
    });

    // Fill remaining
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    setGrid(newGrid);
    setFoundWords([]);
    setFoundCells([]);
    setSelectedCells([]);
  };

  const handleCellClick = (r: number, c: number) => {
    if (foundWords.length === targetWords.length) return;

    const alreadySelected = selectedCells.some(cell => cell.r === r && cell.c === c);
    let nextSelected = [];
    
    if (alreadySelected) {
      nextSelected = selectedCells.filter(cell => !(cell.r === r && cell.c === c));
    } else {
      nextSelected = [...selectedCells, {r, c}];
    }
    
    setSelectedCells(nextSelected);

    // Try to matches in any order of selection (user might click letters out of order, or backwards)
    // To make it easier for user, if they select N letters, we see if those N letters (any permutation or sequence) form a target word
    // Actually, usually WordSearch requires sequential selection. 
    // Let's check if the currently selected cells form ANY target word
    const selectedString = nextSelected.map(cell => grid[cell.r][cell.c]).join('');
    // Also check reverse
    const revSelectedString = [...selectedString].reverse().join('');
    
    // Sort logic to handle non-sequential clicks if we want, but sequential is better.
    // For now, let's just check if the selected sequence matches exactly or reverse.
    const matchedWord = targetWords.find(w => (w === selectedString || w === revSelectedString) && !foundWords.includes(w));

    if (matchedWord) {
      const nextFoundWords = [...foundWords, matchedWord];
      setFoundWords(nextFoundWords);
      setFoundCells(prev => [...prev, ...nextSelected.map(cell => ({ ...cell, word: matchedWord }))]);
      setSelectedCells([]);
      const points = 100 + matchedWord.length * 10;
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
        // Alternate player turns after a word is found
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      } else {
        finalScore = score + points;
        setScore(finalScore);
      }
      if (onScoreUpdate) onScoreUpdate(points);

      // Se todas as palavras foram localizadas, computa e salva a patrulha e pontos imediatamente
      if (nextFoundWords.length === targetWords.length && targetWords.length > 0) {
        onComplete(
          multiplayerMode === '2p' ? finalP1 : finalScore,
          1,
          multiplayerMode === '2p',
          selectedPartner,
          finalP1,
          finalP2,
          'WORD_SEARCH',
          false,
          true
        );
      }
    }
  };

  const getDifficulty = () => {
    if (difficulty === 'easy') return 'Fácil';
    if (difficulty === 'medium') return 'Médio';
    return 'Difícil';
  };

  const isLevelComplete = foundWords.length === targetWords.length && targetWords.length > 0;

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
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Busca</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Caça-Palavras</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <Search className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Busca</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Encontre as palavras ocultas no caça-palavras</p>
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
                      {level === 'easy' ? 'Grelha Menor (9x9 | 8 Alvos)' : level === 'medium' ? 'Grelha Normal (11x11 | 8 Alvos)' : 'Grelha Ampla (13x13 | 8 Alvos)'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-wordsearch"
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
            onClick={() => {
              setScore(0);
              setP1Score(0);
              setP2Score(0);
              setActivePlayerTurn('p1');
              setLevel(1);
              setSetupComplete(true);
            }} 
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
          id="ws-back-button"
          onClick={onCancel}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Busca</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {getDifficulty().toUpperCase()} | Nível {level}</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm mb-6">
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

      <div className="w-full flex justify-between items-center mb-6">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Caça-Palavras</p>
          <p className="text-xl font-black text-yellow-400">Score: {multiplayerMode === '2p' ? p1Score + p2Score : score}</p>
        </div>
      </div>

      <div className="text-center mb-6">
         <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">CAÇA-PALAVRAS</h2>
         <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Localize os termos técnicos do trecho</p>
      </div>

      <div 
        className="grid gap-1 bg-slate-900 p-2 rounded-2xl border-2 border-slate-800 mb-8"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) => row.map((char, c) => {
          const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
          const foundCell = foundCells.find(cell => cell.r === r && cell.c === c);
          const isFound = !!foundCell;

          return (
            <button
              id={`ws-cell-${r}-${c}`}
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              className={`w-8 h-8 md:w-9 md:h-9 rounded-lg text-xs md:text-sm font-black flex items-center justify-center transition-all relative ${
                isSelected 
                  ? 'bg-yellow-400 text-slate-900 z-10 scale-105' 
                  : isFound
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {char}
              {isFound && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 border-2 border-emerald-500/50 rounded-lg pointer-events-none"
                />
              )}
            </button>
          );
        }))}
      </div>

      <div className="w-full max-w-sm bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Encontrar ({targetWords.length} alvos):</p>
        <div className="grid grid-cols-4 gap-2">
          {targetWords.map((word, idx) => (
            <div 
              id={`ws-target-${idx}`}
              key={word} 
              className={`px-1 py-2.5 rounded-xl text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-tighter sm:tracking-tight transition-all shadow-sm text-center flex items-center justify-center truncate ${
              foundWords.includes(word) ? 'bg-emerald-500/25 text-emerald-400 line-through scale-95 opacity-80' : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {word}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isLevelComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
             <div className="bg-yellow-400 w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-glow shadow-yellow-400/40 rotate-12">🔍</div>
             <h2 className="text-4xl font-black text-white mb-2 italic uppercase">Pista Limpa!</h2>
             <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest text-sm">Todos os registros foram localizados.</p>
                 <div className="flex flex-col w-full gap-3">
                    <Button 
                      id="ws-next-level-btn"
                      onClick={() => {
                        if (multiplayerMode === '2p') {
                          setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
                        }
                        setLevel(prev => prev + 1);
                      }} 
                      className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-lg rounded-2xl uppercase italic shadow-xl"
                    >
                      PRÓXIMO SETOR ⚡
                    </Button>
                    <Button 
                      id="ws-finish-btn"
                      onClick={() => onComplete(
                        multiplayerMode === '2p' ? p1Score : score,
                        1,
                        multiplayerMode === '2p',
                        selectedPartner,
                        p1Score,
                        p2Score,
                        'WORD_SEARCH'
                      )} 
                      variant="outline" 
                      className="w-full h-14 border-slate-700 text-slate-400 font-black text-lg rounded-2xl uppercase italic"
                    >
                      FINALIZAR PATRULHA
                    </Button>
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
                   setLevel(1);
                   setFoundWords([]);
                   setFoundCells([]);
                   setSelectedCells([]);
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
          id="ws-abandon-btn"
          onClick={() => {
            // Salva os pontos acumulados até agora e incrementa 1 patrulha de forma imediata antes de abrir o modal
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'WORD_SEARCH',
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
    </div>
  );
}
