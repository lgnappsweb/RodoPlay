/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameType } from '../types';
import { HelpCircle, Shield, Search, Type, Gamepad2, Brain, Zap, Calculator, Info, Map, Hash, Car, Compass, Grid, Trophy, Sparkles, Crown, Flame, ArrowLeft, Construction, Skull, Radio, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface GamesGridProps {
  onPlay: (gameType: GameType) => void;
  onBack?: () => void;
}

export function GamesGrid({ onPlay, onBack }: GamesGridProps) {
  const games: Array<{
    type: GameType;
    friendlyName: string;
    title: string;
    desc: string;
    bgIcon: any;
    mainIcon: any;
    iconClass: string;
    borderClass: string;
    rotateClass: string;
    bgIconSize: string;
    isPromotedText?: string;
  }> = [
    {
      type: GameType.QUIZ_MASTER_APH,
      friendlyName: 'Quiz Master APH',
      title: 'QUIZ APH',
      desc: 'Desafio de Operações & Salvamento',
      bgIcon: Activity,
      mainIcon: Activity,
      iconClass: 'bg-gradient-to-r from-red-600 to-amber-500 text-white animate-pulse',
      borderClass: 'border-amber-550 border-2',
      rotateClass: 'group-hover:scale-110',
      bgIconSize: 'w-14 h-14',
      isPromotedText: 'POPULAR ✨',
    },
    {
      type: GameType.WORD_SEARCH,
      friendlyName: 'Caça-Palavras',
      title: 'BUSCA',
      desc: 'Percepção',
      bgIcon: Search,
      mainIcon: Search,
      iconClass: 'bg-emerald-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'rotate-6 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.SPEED_MATH,
      friendlyName: 'Cálculo Rápido',
      title: 'CÁLCULO',
      desc: 'Rapidez',
      bgIcon: Calculator,
      mainIcon: Calculator,
      iconClass: 'bg-red-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-110',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.WORD_GUESS,
      friendlyName: 'Código Secreto',
      title: 'CÓDIGO',
      desc: 'Lógica',
      bgIcon: Type,
      mainIcon: Type,
      iconClass: 'bg-orange-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: '-rotate-6 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.CONTEXTO,
      friendlyName: 'Contexto',
      title: 'CONTEXTO',
      desc: 'Associação Semântica',
      bgIcon: Brain,
      mainIcon: Brain,
      iconClass: 'bg-teal-400 text-slate-950',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-115',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.DAMA,
      friendlyName: 'Jogo de Dama',
      title: 'DAMA',
      desc: 'Conquista de Território',
      bgIcon: Grid,
      mainIcon: Gamepad2,
      iconClass: 'bg-red-600 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-110 -rotate-6',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.PARKING_ESCAPE,
      friendlyName: 'Escape de Pátio',
      title: 'ESCAPE',
      desc: 'Operações',
      bgIcon: Car,
      mainIcon: Car,
      iconClass: 'bg-rose-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'rotate-12 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.HANGMAN,
      friendlyName: 'Forca',
      title: 'FORCA',
      desc: 'Sobrevivência',
      bgIcon: Skull,
      mainIcon: Skull,
      iconClass: 'bg-blue-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: '-rotate-3 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.MEMORY,
      friendlyName: 'Memória',
      title: 'MEMÓRIA',
      desc: 'Foco',
      bgIcon: Brain,
      mainIcon: Brain,
      iconClass: 'bg-pink-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'rotate-12 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.PALAVRAS_500,
      friendlyName: 'Palavras 500',
      title: 'PALAVRAS 500',
      desc: 'Vocabulário Ativo',
      bgIcon: Flame,
      mainIcon: Flame,
      iconClass: 'bg-lime-500 text-slate-900',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-110',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.SIGN_MATCH,
      friendlyName: 'Placas de Sinalização',
      title: 'PLACAS',
      desc: 'Sinalização',
      bgIcon: Info,
      mainIcon: Info,
      iconClass: 'bg-amber-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:skew-x-6',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.QUEENS,
      friendlyName: 'Queens',
      title: 'QUEENS',
      desc: 'Estratégia Lógica',
      bgIcon: Crown,
      mainIcon: Crown,
      iconClass: 'bg-violet-600 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'rotate-6 group-hover:-rotate-6',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.QUIZ,
      friendlyName: 'Super Quiz',
      title: 'QUIZ',
      desc: 'Conhecimento',
      bgIcon: HelpCircle,
      mainIcon: HelpCircle,
      iconClass: 'bg-yellow-400 text-slate-950',
      borderClass: 'border-slate-705',
      rotateClass: 'rotate-3 group-hover:rotate-12',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.REACTION,
      friendlyName: 'Reflexo Rápido',
      title: 'REFLEXO',
      desc: 'Agilidade',
      bgIcon: Zap,
      mainIcon: Zap,
      iconClass: 'bg-cyan-400 text-slate-950',
      borderClass: 'border-slate-705',
      rotateClass: '-rotate-12 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.ROUTE_ORDER,
      friendlyName: 'Trajeto / Rota',
      title: 'ROTA',
      desc: 'Coordenação',
      bgIcon: Map,
      mainIcon: Map,
      iconClass: 'bg-purple-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:-translate-y-1',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.NUMBER_GUESS,
      friendlyName: 'Sinais',
      title: 'SINAIS',
      desc: 'Memória',
      bgIcon: Radio,
      mainIcon: Radio,
      iconClass: 'bg-indigo-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-110',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.SUDOKU,
      friendlyName: 'Sudoku Tático',
      title: 'SUDOKU',
      desc: 'Lógica Numérica',
      bgIcon: Grid,
      mainIcon: Grid,
      iconClass: 'bg-sky-400 text-slate-950',
      borderClass: 'border-slate-705',
      rotateClass: 'group-hover:scale-110 rotate-6',
      bgIconSize: 'w-12 h-12',
    },
    {
      type: GameType.TIC_TAC_TOE,
      friendlyName: 'Jogo da Velha',
      title: 'VELHA',
      desc: 'Estratégia',
      bgIcon: Hash,
      mainIcon: Hash,
      iconClass: 'bg-fuchsia-500 text-white',
      borderClass: 'border-slate-705',
      rotateClass: '-rotate-12 group-hover:rotate-0',
      bgIconSize: 'w-12 h-12',
    }
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {onBack && (
        <div className="flex justify-start pt-2">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="flex items-center gap-1.5 bg-slate-900/90 border-2 border-yellow-500 hover:border-yellow-405 hover:bg-slate-800 text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all focus:outline-none font-sans font-black text-[10px] tracking-wider uppercase cursor-pointer z-20"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <Construction size={11} className="stroke-[2]" />
            <span>Voltar</span>
          </motion.button>
        </div>
      )}
      <div className="text-center space-y-2 py-2">
        <div className="inline-block bg-yellow-400 text-black px-4 py-1 font-black skew-x-[-12deg] text-xs uppercase shadow-[3px_3px_0px_#f97316]">
          🚧 PATRULHAS SOLO
        </div>
        <h2 className="text-3xl font-black tracking-tighter uppercase italic drop-shadow-2xl text-white">
          CENTRAL DE JOGOS
        </h2>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
          Escolha um desafio e teste as suas habilidades operacionais
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {games
          .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
          .map((g) => {
            const BgIcon = g.bgIcon;
            const MainIcon = g.mainIcon;
            return (
              <motion.button
                key={g.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlay(g.type)}
                className={`bg-slate-800 border-2 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 group relative overflow-hidden ${g.borderClass}`}
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BgIcon className={g.bgIconSize} />
                </div>
                <motion.div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${g.iconClass} ${g.rotateClass}`}
                  animate={{
                    scale: [1, 1.12, 1],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (g.title.charCodeAt(0) % 6) * 0.35,
                  }}
                >
                  <MainIcon className="w-6 h-6" />
                </motion.div>
                <div className="text-center">
                  {g.isPromotedText && (
                    <span className="text-[9px] font-black uppercase text-yellow-400 tracking-[0.2em] bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 block w-max mx-auto mb-1">
                      {g.isPromotedText}
                    </span>
                  )}
                  <p className={g.isPromotedText ? "text-base sm:text-lg font-black uppercase text-white italic tracking-wide mt-1.5" : "text-sm sm:text-base font-black uppercase text-white italic tracking-wide"}>
                    {g.title}
                  </p>
                  <p className={g.isPromotedText ? "text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest mt-1.5" : "text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight mt-1.5"}>
                    {g.desc}
                  </p>
                </div>
              </motion.button>
            );
          })}
      </div>
    </div>
  );
}
