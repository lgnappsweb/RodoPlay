/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, GameType } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Leaderboard } from './Leaderboard';
import { Play, Star, Target, Shield, HelpCircle, Hash, Search, Type, Gamepad2, Brain, Zap, Calculator, Info, Map, Car, Compass, Grid, Trophy, Sparkles, Crown, Flame, Award, BookOpen, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface HomeProps {
  player: Player;
  onPlay: (gameType: GameType) => void;
  onViewChange?: (view: 'home' | 'leaderboard' | 'settings' | 'multiplayer') => void;
}

const TIPS = [
  { title: "SUPER QUIZ", desc: "Preste muita atenção em pegadinhas teóricas de legislação. Respostas corretas rápidas dão bônus adicionais de XP e aumentam o seu score!", category: "Legislação & Trânsito" },
  { title: "JOGO DA FORCA", desc: "Comece vasculhando vogais frequentes (A, E, O). Elas revelam a estrutura da palavra secreta sem gastar chances cruciais.", category: "Vocabulário & Foco" },
  { title: "CAÇA-PALAVRAS", desc: "Escaneie os quadrantes em zigue-zague. As palavras podem estar em qualquer direção: horizontais, verticais ou ocultas em diagonais reversas.", category: "Percepção Visual" },
  { title: "CÓDIGO SECRETO", desc: "Aproveite o feedback cromático: Verde significa letra e posição certas; Amarelo diz que a letra existe mas está em outra posição; Cinza a descarta.", category: "Dedução Lógica" },
  { title: "TESTE DE MEMÓRIA", desc: "Mapeie mentalmente pequenos quadrantes de 2x2. Revelar as cartas em ordens coordenadas ajuda a fixar as posições com menos tentativas furtivas.", category: "Cognição & Foco" },
  { title: "REFLEXO RÁPIDO", desc: "Não clique por impulso ou ansiedade! Guarde os dedos sob repouso e toque na tela no milissegundo exato em que a cor mudar para verde.", category: "Reação Neuromotora" },
  { title: "CÁLCULO RÁPIDO", desc: "Resolva as operações menores de cabeça de forma instantânea para poupar tempo precioso para as equações complexas de maior pontuação.", category: "Agilidade Mental" },
  { title: "PLACAS DE SINALIZAÇÃO", desc: "Domine a lógica das formas e cores: as circulares vermelhas são Regulamentação (obrigação/proibição); as amarelas trazem Advertência.", category: "Educação Rodoviária" },
  { title: "MAPEAMENTO DE ROTAS", desc: "Escolha o trajeto de menor custo e perigo potencial. Observe e antecipe pontos vermelhos de intercorrência antes de confirmar a rota.", category: "Orientação Espacial" },
  { title: "SINAIS SEQUENCIAIS", desc: "Use a audição associando o tom musical de cada botão de cor luminosa no painel. Gravar o ritmo instrumental facilita sequências muito longas.", category: "Memória Sensorial" },
  { title: "ESCAPE DE PÁTIO", desc: "Crie espaço de escoamento movendo primeiro os automóveis de passeio e veículos leves para depois remover caminhões pesados rumo à saída.", category: "Resolução Espacial" },
  { title: "QUEENS (RAINHAS)", desc: "Xadrez lógico puro: garanta que nenhuma rainha ocupe a mesma linha, coluna ou diagonal. Use a marcação de segurança para anular quadrantes.", category: "Estratégia Pura" },
  { title: "PALAVRAS 500", desc: "Escreva palavras compactas de 3 ou 4 letras logo no início para garantir tempo bônus, depois componha termos maiores e radicais múltiplos.", category: "Vocábulo Rápido" },
  { title: "CONTEXTO", desc: "Envie palavras de amplo contexto conceitual inicialmente (ex: 'objeto', 'pessoa') para verificar os graus de similaridade e filtrar a pista.", category: "Análise Semântica" },
  { title: "JOGO DA VELHA", desc: "Garanta o controle rápido do quadrado do meio. O domínio central anula ataques cruzados e facilita bifurcações de vitória dupla contra a IA.", category: "Grade & Confronto" },
  { title: "BUSCA DE NÚMEROS", desc: "Use a estratégia de busca binária para encontrar o número secreto. Comece sempre dividindo a faixa restante pela metade para eliminar opções o mais rápido possível.", category: "Busca Lógica" },
  { title: "DIREÇÃO DEFENSIVA", desc: "Mantenha sempre a regra clássica dos 'dois segundos' de distância do automóvel à sua frente na rodovia. Sob condições chuvosas intensas, duplique essa folga crucial.", category: "Segurança de Tráfego" },
  { title: "HIDRATAÇÃO E FOCO", desc: "Beba água regularmente durante os turnos de patrulhamento. Fadiga severa e desidratação podem reduzir o seu tempo de reação neurológica em mais de 30%.", category: "Saúde Ocupacional" },
  { title: "DUELOS MULTIPLAYER", desc: "Antes de iniciar uma disputa cooperativa ou duelo síncrono, confira a base operacional e o nível de XP do seu oponente no mural para antecipar seu ritmo.", category: "Estratégia Organizada" },
  { title: "SINALIZAÇÃO DE OBRAS", desc: "Placas com detalhes em tons de laranja representam modificações temporárias por obras na pista. Reduza o ritmo imediatamente e redobre a atenção visual.", category: "Educação Rodoviária" },
  { title: "CONSISTÊNCIA DIÁRIA", desc: "Pratique ao menos cinco minutos de desafios lógicos diariamente. O aprendizado fragmentado contínuo fixa conexões neuronais de forma superior a maratonas exaustivas.", category: "Treinamento Humano" }
];

export function Home({ player, onPlay, onViewChange }: HomeProps) {
  const [topPlayer, setTopPlayer] = useState<Player | null>(null);
  const [tipIndex, setTipIndex] = useState(0);



  // Switch manual tips
  const nextTip = () => {
    setTipIndex(prev => (prev + 1) % TIPS.length);
  };

  const prevTip = () => {
    setTipIndex(prev => (prev - 1 + TIPS.length) % TIPS.length);
  };

  // Interval rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 9000); // rotates every 9 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'rankings/global/players'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPlayers: Player[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        allPlayers.push({
          ...data,
          totalScore: typeof data.totalScore === 'string' ? parseFloat(data.totalScore) : (data.totalScore !== undefined ? data.totalScore : (data.pontos || 0)),
          gamesPlayed: typeof data.gamesPlayed === 'string' ? parseInt(data.gamesPlayed, 10) : (data.gamesPlayed !== undefined ? data.gamesPlayed : (data.patrulhas || 0)),
          completedGames: typeof data.completedGames === 'string' ? parseInt(data.completedGames, 10) : (data.completedGames !== undefined ? data.completedGames : (data.partidas || 0)),
          victories: typeof data.victories === 'string' ? parseInt(data.victories, 10) : (data.victories !== undefined ? data.victories : (data.vitorias || 0)),
          defeats: typeof data.defeats === 'string' ? parseInt(data.defeats, 10) : (data.defeats !== undefined ? data.defeats : (data.derrotas || 0)),
          level: typeof data.level === 'string' ? parseInt(data.level, 10) : (data.level !== undefined ? data.level : (data.nivel || 1)),
          uid: doc.id
        });
      });
      if (allPlayers.length > 0) {
        allPlayers.sort((a, b) => {
          const scoreB = b.totalScore || 0;
          const scoreA = a.totalScore || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          
          const gamesPlayedB = b.gamesPlayed || 0;
          const gamesPlayedA = a.gamesPlayed || 0;
          if (gamesPlayedB !== gamesPlayedA) {
            return gamesPlayedB - gamesPlayedA;
          }

          const victoriesB = b.victories || 0;
          const victoriesA = a.victories || 0;
          return victoriesB - victoriesA;
        });
        setTopPlayer(allPlayers[0]);
      }
    }, (err) => {
      console.error("[Home Highlights] Error fetching players:", err);
    });
    return () => unsubscribe();
  }, []);

  const highlightPlayer = topPlayer || player;

  // Level XP progression calculation
  const currentTotalPower = player.totalScore || 0;
  const currentLevel = player.level || 1;
  const pointsRemainingInLevel = 1000 - (currentTotalPower % 1000);
  const currentLevelProgress = Math.min(100, Math.round(((currentTotalPower % 1000) / 1000) * 100));

  const handleLaunchRandomGame = () => {
    const gameTypes = Object.values(GameType);
    const randomIndex = Math.floor(Math.random() * gameTypes.length);
    onPlay(gameTypes[randomIndex]);
  };

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="px-4">
        {/* Dashboard Title & Call to Action */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-block bg-yellow-400 text-black px-4 py-1 font-black skew-x-[-12deg] text-sm uppercase shadow-[3px_3px_0px_#f97316]">
              PAINEL DA PATRULHA
            </div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic drop-shadow-2xl text-white">
              BEM-VINDO, OPERADOR
            </h2>
          </div>

          {/* Quick random patrol trigger & safety guidelines panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Surprise Quick Start */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLaunchRandomGame}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 p-6 rounded-[2rem] border-2 border-yellow-300/40 shadow-lg font-black text-left flex flex-col justify-between group relative overflow-hidden cursor-pointer h-40"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Compass className="w-24 h-24" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] bg-slate-950 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest leading-none">PATRULHA SURPRESA</span>
                <h4 className="text-lg uppercase italic font-black tracking-wide leading-tight mt-1">INICIAR DESAFIO ALEATÓRIO 🎲</h4>
              </div>
              <span className="text-[9px] text-slate-900/75 font-bold uppercase tracking-wider block">Estude ou pratique habilidades sob pressão!</span>
            </motion.button>

            {/* Direct games link */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange && onViewChange('multiplayer')}
              className="bg-slate-850 hover:bg-slate-800 text-white p-6 rounded-[2rem] border-2 border-slate-700/60 shadow-lg font-black text-left flex flex-col justify-between group relative overflow-hidden cursor-pointer h-40"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Grid className="w-24 h-24" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest leading-none">BIBLIOTECA COMPLETA</span>
                <h4 className="text-lg uppercase italic font-black tracking-wide leading-tight mt-1 text-yellow-400">ABRIR CENTRAL COMPLETA ➔</h4>
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Escolha entre as 16 patrulhas profissionais de excelência</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-2 bg-slate-850/80 px-4 py-2 rounded-full border border-slate-705">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Patrulha Ativa • Modo Solo</span>
          </div>
        </div>

        {/* 1. Live Operator Profile Level Progression Gauge */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="text-yellow-400" size={18} />
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest leading-none">Progresso De Licença</h3>
            </div>
            <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 px-2.5 py-0.5 rounded-full uppercase border border-yellow-500/20">
              NÍVEL {currentLevel}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase">EXPERIÊNCIA NA CATEGORIA</span>
              <span className="text-xs font-black text-yellow-400 font-mono italic">
                {currentTotalPower % 1000} / 1000 XP
              </span>
            </div>
            
            {/* Level up bar status indicator */}
            <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-450 to-yellow-350 rounded-full"
                style={{ width: `${currentLevelProgress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${currentLevelProgress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            
            <p className="text-[8.5px] font-semibold text-slate-500 uppercase tracking-wide text-right">
              Faltam <strong className="text-slate-300">{pointsRemainingInLevel} XP</strong> para subir para o Nível {currentLevel + 1}
            </p>
          </div>

          {/* Micro Solo Metrics Quick Counters */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-850">
            <div className="bg-slate-950/40 p-2.5 rounded-xl text-center border border-slate-850/30">
              <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Partidas</p>
              <p className="text-sm font-black text-white font-mono">{player.completedGames || player.gamesPlayed || 0}</p>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded-xl text-center border border-slate-850/30">
              <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total XP</p>
              <p className="text-sm font-black text-yellow-400 font-mono">{player.totalScore || 0}</p>
            </div>
            <div className="bg-slate-950/40 p-2.5 rounded-xl text-center border border-slate-850/30">
              <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Licença</p>
              <p className="text-xs font-black text-slate-300 uppercase leading-none mt-1">Solo-A</p>
            </div>
          </div>
        </div>



        {/* 3. Dynamic Interactive Game Tip & Doubts Resolver Module */}
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-900/60 border-2 border-yellow-500/10 p-6 rounded-[2rem] mb-8 relative overflow-hidden flex flex-col gap-4 shadow-xl shadow-slate-950/20">
          <div className="absolute right-0 bottom-0 p-4 opacity-5 pointer-events-none">
            <HelpCircle className="w-40 h-40 text-yellow-450" />
          </div>
          
          {/* Header row with badges and manual slider keys */}
          <div className="flex items-center justify-between gap-2.5 w-full border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-450/10 border border-yellow-550/20 rounded-lg text-yellow-450 flex-shrink-0">
                <HelpCircle size={14} className="animate-pulse" />
              </div>
              <div className="text-left">
                <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest block leading-none">GUIA RÁPIDO S.O.S</span>
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-wider block mt-0.5">DICAS DE TODOS OS JOGOS</span>
              </div>
            </div>

            {/* Slider navigation controls */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-850 select-none">
              <button 
                onClick={prevTip}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-yellow-400 rounded-lg transition-colors focus:outline-none"
                title="Dica anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-mono font-black text-slate-400 px-1.5 min-w-[38px] text-center">
                {tipIndex + 1} / {TIPS.length}
              </span>
              <button 
                onClick={nextTip}
                className="p-1 hover:bg-slate-950 text-slate-400 hover:text-yellow-400 rounded-lg transition-colors focus:outline-none"
                title="Próxima dica"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start relative z-10">
            {/* Game Category tag + Title */}
            <div className="space-y-1 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-yellow-400/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest leading-none">
                  {TIPS[tipIndex]?.category || "Geral"}
                </span>
                <span className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  MÉTODO
                </span>
              </div>
              
              <h4 className="text-sm font-black text-white italic tracking-wider uppercase mt-1">
                COMO JOGAR: {TIPS[tipIndex]?.title} ⚡
              </h4>
              
              <p className="text-slate-300 text-xs font-bold leading-relaxed pt-1.5 min-h-[4rem]">
                "{TIPS[tipIndex]?.desc}"
              </p>
            </div>
          </div>

          {/* Miniature dot index tracker representation */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-850/40 w-full overflow-hidden">
            {TIPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setTipIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === tipIndex ? 'w-4 bg-yellow-400' : 'w-1.5 bg-slate-800 hover:bg-slate-700'}`}
                title={`Ir para dica ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Rivalry Widget */}
        <div className="bg-slate-800/40 border-2 border-yellow-500/30 rounded-[2rem] p-6 mb-8 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/10 transition-colors duration-500" />
          
          {/* Header do Card (Destaque da Semana) - Posicionado internamente e bem visível */}
          <div className="flex items-center justify-between gap-3 border-b border-yellow-500/10 pb-4 mb-5">
            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-500/30 px-3 py-1.5 rounded-full text-[10px] font-black text-yellow-400 uppercase tracking-widest shadow-sm">
              <Sparkles size={12} className="animate-spin text-yellow-400" style={{ animationDuration: '3s' }} />
              Destaque da Semana
            </div>
            
            <div className="flex items-center gap-1.5 select-none shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Tempo Real</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Coluna Esquerda/Centro: Avatar e Detalhes do Perfil */}
            <div className="md:col-span-8 flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-yellow-400/50 flex items-center justify-center text-5xl shadow-md overflow-hidden select-none leading-none">
                  {highlightPlayer.avatar?.startsWith('data') || highlightPlayer.avatar?.startsWith('http') ? (
                    <img src={highlightPlayer.avatar} alt={highlightPlayer.displayName} className="w-full h-full object-cover" />
                  ) : (
                    highlightPlayer.avatar || '👷'
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 border border-slate-900 rounded-full flex items-center justify-center text-[10px] text-slate-950 font-black shadow-md">
                  #1
                </span>
              </div>

              <div className="min-w-0 space-y-2 flex-1">
                {/* Nome do jogador - Completo, sem truncamento, wrapping suave */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight leading-normal whitespace-normal break-words">
                  {highlightPlayer.displayName}
                </h3>

                {/* Badges do jogador: Nível, Base e Turno */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  {/* Nivel */}
                  <span className="inline-flex items-center justify-center bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider h-5.5 select-none shrink-0">
                    Nível {highlightPlayer.level || 1}
                  </span>
                  
                  {/* Base */}
                  <span className="inline-flex items-center justify-center text-white bg-slate-900 border border-slate-705 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest h-5.5 shrink-0">
                    {highlightPlayer.base || 'SEM BASE'}
                  </span>

                  {/* Turno */}
                  <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none h-5.5">
                    Turno: <strong className="text-white ml-1">{highlightPlayer.shift || 'GERAL'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Box de Pontuação Acumulada em Tempo Real */}
            <div className="md:col-span-4 w-full bg-slate-900/40 border border-slate-700/40 p-4 rounded-2xl flex flex-col justify-center items-start md:items-end">
              <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase leading-none mb-1">SCORE ACUMULADO</p>
              <p className="text-xl sm:text-2xl font-black text-yellow-400 tracking-tighter leading-none mt-1">
                {highlightPlayer.totalScore?.toLocaleString('pt-BR') || 0} PTS
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div 
          id="home-hall-fama-card"
          onClick={() => onViewChange && onViewChange('leaderboard')}
          className="bg-slate-800/20 border border-slate-700 hover:border-yellow-500/30 hover:bg-slate-800/30 transition-all rounded-3xl p-5 mb-8 cursor-pointer group duration-300"
        >
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap sm:flex-nowrap">
            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-[0.15em] group-hover:text-yellow-400 transition-colors whitespace-nowrap shrink-0">HALL DA FAMA</h3>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300">VER RANKING COMPLETO ➔</span>
              <div className="flex gap-1 shrink-0">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-glow shadow-yellow-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              </div>
            </div>
          </div>
          <Leaderboard isMini={true} onViewAll={() => onViewChange && onViewChange('leaderboard')} />
        </div>
      </div>
    </div>
  );
}
