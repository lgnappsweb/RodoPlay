/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { QUESTIONS, QUIZ_THEMES } from '../data/questions';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playGameSfx, triggerGameConfetti } from '../lib/gameEffects';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface QuizProps {
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

export function Quiz({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: QuizProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(QUIZ_THEMES[0].id);
  const [sessionQuestions, setSessionQuestions] = useState<typeof QUESTIONS>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Initialize session questions: pick 2 from each difficulty level (1 to 5) for a total of 10
  const getInitialTimeLimit = (diff: 'easy' | 'medium' | 'hard') => {
    return diff === 'easy' ? 25 : diff === 'medium' ? 15 : 10;
  };

  // Helper to get questions for dynamic theme selections
  const getQuestionsSubset = useCallback((themeId: string, count: number) => {
    const themeQuestions = QUESTIONS.filter(q => q.themeId === themeId);
    // Shuffle the entire pool of 500 questions and slice the requested count
    return [...themeQuestions].sort(() => Math.random() - 0.5).slice(0, count);
  }, []);

  useEffect(() => {
    const qSubset = getQuestionsSubset(selectedThemeId, questionCount);
    setSessionQuestions(qSubset);
    setIsTimeOut(false);
  }, [selectedThemeId, questionCount, getQuestionsSubset]);

  const restartQuiz = () => {
    const qSubset = getQuestionsSubset(selectedThemeId, questionCount);
    setSessionQuestions(qSubset);
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(getInitialTimeLimit(difficulty));
    setSelectedIdx(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setIsTimeOut(false);
    setSetupComplete(false);
  };

  const question = sessionQuestions[currentIdx];

  const handleSelect = useCallback((idx: number) => {
    if (isAnswered || !question) return;
    setSelectedIdx(idx);
    setIsAnswered(true);

    const isCorrect = idx === question.correctAnswer;

    if (isCorrect) {
      const timeBonus = 0;
      const diffMultiplier = question.difficulty || 1;
      const points = (100 * diffMultiplier) + timeBonus;
      
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
      setCorrectCount(c => c + 1);
      if (onScoreUpdate) onScoreUpdate(points);

      // Trigger identical correct sound and visual effects as APH Quiz
      triggerGameConfetti();
      playGameSfx('correct');
    } else {
      // Trigger incorrect sound
      playGameSfx('incorrect');
    }
  }, [isAnswered, question, score, p1Score, p2Score, multiplayerMode, activePlayerTurn, onScoreUpdate]);

  // Timer is disabled per user request
  useEffect(() => {
    // No timer/timeouts running
  }, []);

  const handleNext = () => {
    if (currentIdx < sessionQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setTimeLeft(getInitialTimeLimit(difficulty));
      setSelectedIdx(null);
      setIsAnswered(false);
      if (multiplayerMode === '2p') {
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    } else {
      const finalScore = multiplayerMode === '2p' ? p1Score + p2Score : score;
      const visualEnabled = !localStorage || localStorage.getItem('game_visual_effects_enabled') !== 'false';
      if (finalScore > 1000 && visualEnabled) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      playGameSfx('win');
      onComplete(
        multiplayerMode === '2p' ? p1Score : score,
        1,
        multiplayerMode === '2p',
        selectedPartner,
        p1Score,
        p2Score,
        'QUIZ'
      );
      onCancel();
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
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Quiz</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Quiz</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <HelpCircle className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Quiz</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans">Responda às questões de trânsito e segurança</p>
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
                      {level === 'easy' ? 'Básico / Teoria' : level === 'medium' ? 'Intermediário' : 'Avançado / Placas'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-quiz"
                      className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div id="theme-selector" className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Selecione o Tema do Quiz</p>
            
            <div className="grid grid-cols-1 gap-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {QUIZ_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`flex items-start p-3 bg-slate-900 border-2 rounded-2xl transition-all text-left ${
                    selectedThemeId === theme.id
                      ? 'border-yellow-400 scale-[1.01] shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center text-2xl w-11 h-11 bg-slate-950/60 rounded-xl mr-3 select-none">
                    {theme.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-tight truncate ${selectedThemeId === theme.id ? 'text-yellow-400' : 'text-slate-200'}`}>
                        {theme.name}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold leading-tight line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Quantidade de Questões</p>
            <select 
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl text-slate-200 text-xs font-mono outline-none focus:border-yellow-400 text-center uppercase tracking-wider cursor-pointer"
            >
              <option value={10}>10 PERGUNTAS</option>
              <option value={20}>20 PERGUNTAS</option>
              <option value={50}>50 PERGUNTAS</option>
              <option value={100}>100 PERGUNTAS</option>
            </select>
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
              const qSubset = getQuestionsSubset(selectedThemeId, questionCount);
              setSessionQuestions(qSubset);
              setTimeLeft(getInitialTimeLimit(difficulty));
              setCurrentIdx(0);
              setScore(0);
              setSelectedIdx(null);
              setIsAnswered(false);
              setCorrectCount(0);
              setIsTimeOut(false);
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

  if (sessionQuestions.length === 0) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 relative overflow-hidden space-y-6">
      {/* Background Dots */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zy4=')] opacity-20" />

      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center mb-6 relative z-10">
        <button 
          onClick={() => {
            onComplete(
              multiplayerMode === '2p' ? p1Score : score,
              1,
              multiplayerMode === '2p',
              selectedPartner,
              p1Score,
              p2Score,
              'QUIZ',
              false,
              false,
              true // isAbandoned = true
            );
          }}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha Cultural</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1">DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Pergunta {currentIdx + 1}/{sessionQuestions.length}</span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="relative z-10 w-full mb-2">
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

      {/* Header */}
      <div className="flex justify-between items-center relative z-10">
        <div className="text-left">
          <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Pontos</p>
          <p className="text-2xl font-black text-yellow-400 drop-shadow-glow">{score}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Desafio</p>
          <p className="text-xl font-black text-white">{currentIdx + 1}/{sessionQuestions.length}</p>
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 max-w-2xl mx-auto w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="space-y-4"
          >
            <div className="bg-slate-905 border-2 border-yellow-500/80 shadow-[0_0_25px_rgba(234,179,8,0.15)] p-6 rounded-[2rem] space-y-3 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500" />
               <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                 <span className="font-extrabold text-yellow-500 flex items-center gap-1">❓ PERGUNTA DE INSPEÇÃO</span>
                 <span className="px-2.5 py-1 rounded-full bg-slate-800/90 text-yellow-400 font-black tracking-wider text-[9px] border border-yellow-500/25">NÍVEL: {question.difficulty?.toString().toUpperCase()}</span>
               </div>
               <h2 className="text-white font-black leading-relaxed text-sm md:text-base uppercase tracking-tight pl-2 whitespace-normal break-words">
                 {question.text}
               </h2>
            </div>

            <div className="grid gap-3">
              {question.options.map((option, idx) => {
                let className = "min-h-16 h-auto py-4 text-xs md:text-sm justify-start px-6 font-black uppercase tracking-tight transition-all duration-300 rounded-2xl border-2 whitespace-normal text-left ";

                if (isAnswered) {
                  if (idx === question.correctAnswer) {
                    className += "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] ";
                  } else if (idx === selectedIdx) {
                    className += "bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] ";
                  } else {
                    className += "bg-slate-900/50 text-slate-600 border-slate-800 opacity-50 ";
                  }
                } else {
                  className += "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-yellow-400 hover:bg-slate-800 hover:text-white ";
                }

                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className={className}
                    onClick={() => handleSelect(idx)}
                    disabled={isAnswered}
                  >
                    <span className={`mr-4 w-6 h-6 flex items-center justify-center rounded-lg border font-black text-[10px] ${isAnswered && idx === question.correctAnswer ? 'bg-emerald-500 border-emerald-400 text-slate-900' : 'bg-slate-700 border-white/5 text-slate-400'}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer / Next Button */}
      <div className="mt-auto pb-4 pt-10 relative z-10">
        <AnimatePresence>
          {isAnswered ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full"
            >
              <Button
                onClick={handleNext}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-lg font-black rounded-2xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] uppercase italic tracking-tighter"
              >
                {currentIdx < sessionQuestions.length - 1 ? 'PRÓXIMA PERGUNTA' : 'RESGATAR XP ⚡'}
              </Button>
            </motion.div>
          ) : (
            <div className="w-full flex justify-center mt-6">
              <Button 
                onClick={() => {
                  onComplete(
                    multiplayerMode === '2p' ? p1Score : score,
                    1,
                    multiplayerMode === '2p',
                    selectedPartner,
                    p1Score,
                    p2Score,
                    'QUIZ',
                    false,
                    false, // keepInGameSelection = false
                    true  // isAbandoned = true
                  );
                  onCancel();
                }}
                className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
              >
                ABANDONAR PATRULHA
              </Button>
            </div>
          )}
        </AnimatePresence>
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
                  setCurrentIdx(0);
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setSelectedIdx(null);
                  setIsAnswered(false);
                  setCorrectCount(0);
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

      {isTimeOut && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
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
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Pontos Ganhos</span>
              <span className="text-3xl font-black text-red-500 font-mono block">0 XP</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={() => onComplete(0, 1, false, null, 0, 0, 'QUIZ', true, false)} 
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={restartQuiz} 
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
