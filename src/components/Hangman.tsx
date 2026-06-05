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
    gameType?: string,
    isTimeout?: boolean,
    keepInGameSelection?: boolean,
    isAbandoned?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

import { WORDS } from '../data/words';
import { HANGMAN_THEMES, HangmanTheme } from '../data/hangmanThemes';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function Hangman({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: HangmanProps) {
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [level, setLevel] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundFinished, setRoundFinished] = useState(false);
  const [roundOutcome, setRoundOutcome] = useState<'won' | 'lost' | null>(null);
  const [accumulatedScore, setAccumulatedScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selectedTheme, setSelectedTheme] = useState<HangmanTheme>(HANGMAN_THEMES[0]);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const maxMistakes = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 6 : 4;

  useEffect(() => {
    // startNewLevel handled after setup
  }, []);

  const startNewLevel = () => {
    const targetWords = selectedTheme.words;
    let randomWord = word;
    if (targetWords.length > 1) {
      while (randomWord === word) {
        randomWord = targetWords[Math.floor(Math.random() * targetWords.length)];
      }
    } else {
      randomWord = targetWords[Math.floor(Math.random() * targetWords.length)];
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
          playGameSfx('incorrect');

          setRoundScore(30); // consolation score
          setAccumulatedScore(curr => curr + 30);
          setTotalScore(prevScore => prevScore + 30);
          setRoundOutcome('lost');
          setRoundFinished(true);
        } else {
          playGameSfx('incorrect');
        }
        return next;
      });
      if (multiplayerMode === '2p' && mistakes + 1 < maxMistakes) {
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    } else {
      // Check if won
      const isWon = word.split('').every(l => [...guessedLetters, letter].includes(l) || !alphabet.includes(l));
      if (isWon) {
        playGameSfx('win');
        triggerGameConfetti();
        const levelScore = 100 * level - mistakes * 10;
        
        let finalP1 = p1Score;
        let finalP2 = p2Score;
        if (multiplayerMode === '2p') {
          if (activePlayerTurn === 'p1') {
            finalP1 = p1Score + levelScore;
            setP1Score(finalP1);
          } else {
            finalP2 = p2Score + levelScore;
            setP2Score(finalP2);
          }
        } else {
          setTotalScore(prevScore => prevScore + levelScore);
        }
        if (onScoreUpdate) onScoreUpdate(levelScore);

        setRoundScore(levelScore);
        setAccumulatedScore(curr => curr + levelScore);
        setRoundOutcome('won');
        setRoundFinished(true);
      } else {
        // Correct guess but not won yet
        playGameSfx('correct');
      }
    }
  };

  const handleNextLevel = () => {
    setLevel(prev => prev + 1);
    setCurrentRound(1);
    setRoundFinished(false);
    setRoundOutcome(null);
    startNewLevel();
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

          <div id="theme-selector">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Selecione o Tema da Patrulha</p>
            <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {HANGMAN_THEMES.map((theme) => {
                const isSelected = selectedTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected 
                        ? 'bg-slate-850 border-yellow-400 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/25'
                    }`}
                  >
                    <span className="text-xl" role="img">{theme.icon}</span>
                    <div className="min-w-0">
                      <p className={isSelected ? 'text-[11px] font-black uppercase text-yellow-400' : 'text-[11px] font-extrabold uppercase text-slate-300'}>
                        {theme.name}
                      </p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">{theme.description}</p>
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
            disabled={multiplayerMode === '2p' && !selectedPartner}
            onClick={() => {
              setSetupComplete(true);
              startNewLevel();
            }} 
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-955 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
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
          id="back-btn-ingame"
          onClick={() => {
            onComplete(
              multiplayerMode === '2p' ? p1Score : totalScore,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'HANGMAN',
              false,
              false, // keepInGameSelection
              true // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Resgate</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Nível {level} | Rodada {currentRound}/10</span>
          <div className="flex items-center gap-2 bg-slate-900/50 mt-2 px-2 py-0.5 rounded-lg border border-slate-800">
             <span className="text-[10px]">{selectedTheme.icon}</span>
             <span className="text-[8px] font-bold text-slate-300 uppercase">{selectedTheme.name}</span>
          </div>
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

      <div className="w-full flex justify-between items-center mb-6 sm:mb-10 bg-slate-900/60 p-4 rounded-2xl border border-slate-850">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Enforcado</p>
          <p className="text-xl font-black text-yellow-400">Score: {totalScore}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Chances de Erro</p>
          <p className="text-xl font-black text-rose-500 font-mono">
            {maxMistakes - mistakes} / {maxMistakes}
          </p>
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
            className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center z-50 overflow-y-auto w-full select-none"
          >
            <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-xl shadow-yellow-500/10 text-center space-y-6 w-full max-w-sm">
              <div className="w-20 h-20 bg-yellow-400/10 border-2 border-yellow-400 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <span className="text-4xl">{status === 'won' ? '🏆' : '🚨'}</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter text-yellow-400 font-sans">
                  Patrulha de Resgate Superada!
                </h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest font-sans">
                  Excelente percepção e raciocínio vocabular!
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-left w-full font-sans">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                  <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Dificuldade</span>
                  <span className="text-xs font-black text-white uppercase italic">
                    {difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                  <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Rodadas Suportadas</span>
                  <span className="text-xs font-black text-yellow-400 font-mono">
                    {status === 'won' ? '10 / 10 ⚡' : `${currentRound} / 10 🎯`}
                  </span>
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
                    <span className="text-4xl font-extrabold text-yellow-400 font-mono tracking-tighter">
                      {totalScore} <span className="text-xs uppercase text-slate-500">pts</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={() => {
                    onComplete(
                      multiplayerMode === '2p' ? p1Score : totalScore,
                      status === 'won' ? 10 : currentRound,
                      multiplayerMode === '2p',
                      selectedPartner,
                      p1Score,
                      p2Score,
                      'HANGMAN',
                      false,
                      true // keepInGameSelection
                    );

                    // Cycled Promotion
                    const nextDiff = difficulty === 'easy' ? 'medium' : (difficulty === 'medium' ? 'hard' : 'easy');
                    setDifficulty(nextDiff);
                    setSetupComplete(false);
                    setTotalScore(0);
                    setP1Score(0);
                    setP2Score(0);
                    setLevel(1);
                    setGuessedLetters([]);
                    setMistakes(0);
                    setStatus('playing');
                    setCurrentRound(1);
                  }}
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic"
                >
                  {status === 'won' ? 'PRÓXIMO NÍVEL ⚡' : 'TENTAR NOVAMENTE 🔁'}
                </Button>

                <Button 
                  id="finish-hangman-btn"
                  onClick={() => {
                    onComplete(
                      multiplayerMode === '2p' ? p1Score : totalScore,
                      status === 'won' ? 10 : currentRound,
                      multiplayerMode === '2p',
                      selectedPartner,
                      p1Score,
                      p2Score,
                      'HANGMAN',
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
                      multiplayerMode === '2p' ? p1Score : totalScore,
                      status === 'won' ? 10 : currentRound,
                      multiplayerMode === '2p',
                      selectedPartner,
                      p1Score,
                      p2Score,
                      'HANGMAN',
                      false,
                      false
                    );
                    onCancel();
                  }}
                  variant="outline"
                  className="w-full h-12 border-slate-705 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans"
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
                {multiplayerMode === '2p' ? p1Score + p2Score : totalScore} XP
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
                  setTotalScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setLevel(1);
                  setGuessedLetters([]);
                  setMistakes(0);
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

      <AnimatePresence>
        {roundFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-8 z-50 text-center"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl space-y-6">
              <div className="bg-yellow-500/20 border-2 border-yellow-500 w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-glow shadow-yellow-500/40">🤠</div>
              <h2 className="text-3xl font-black text-white italic uppercase font-sans">Rodada {currentRound}/10 Concluída!</h2>
              
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 w-full mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Resultado</span>
                <span className={`text-xl font-black block uppercase ${roundOutcome === 'won' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {roundOutcome === 'won' ? 'Vencedor ✔️' : 'Forca Ativada 🚫'}
                </span>
                <span className="text-sm font-black text-slate-400 block mt-1 font-mono">A palavra era: <span className="text-yellow-400 font-extrabold uppercase">{word}</span></span>
                <span className="text-sm font-black text-yellow-400 font-mono block mt-2">+{roundScore} XP</span>
              </div>

              {currentRound < 10 ? (
                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setCurrentRound(prev => prev + 1);
                      setRoundFinished(false);
                      setRoundOutcome(null);
                      startNewLevel(); // Reset game element board
                    }}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    PRÓXIMA RODADA ({currentRound + 1}/10) 🚀
                  </Button>

                  <Button
                    onClick={() => {
                      onComplete(
                        multiplayerMode === '2p' ? p1Score : totalScore,
                        currentRound,
                        multiplayerMode === '2p',
                        selectedPartner,
                        p1Score,
                        p2Score,
                        'HANGMAN',
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
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setRoundFinished(false);
                      setStatus('won');
                    }}
                    className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans border-none cursor-pointer"
                  >
                    VER RESULTADOS do NÍVEL 🏆
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-center mt-4 sm:mt-6">
        <Button 
          id="hangman-abandon-btn"
          onClick={() => {
            // Salva os pontos acumulados até o momento e registra a patrulha
            onComplete(
              multiplayerMode === '2p' ? p1Score : totalScore,
              10,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'HANGMAN',
              false,
              false, // keepInGameSelection
              true  // isAbandoned = true
            );
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-955 font-black uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs font-sans"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>
    </div>
  );
}
