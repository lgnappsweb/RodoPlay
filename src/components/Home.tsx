/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
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
  { title: "MELHORIA CONTÍNUA", desc: "Monitore sua posição no painel de classificação geral para acompanhar seu crescimento individual e ver quem está alcançando o topo da pontuação operacional.", category: "Estratégia Organizada" },
  { title: "SINALIZAÇÃO DE OBRAS", desc: "Placas com detalhes em tons de laranja representam modificações temporárias por obras na pista. Reduza o ritmo imediatamente e redobre a atenção visual.", category: "Educação Rodoviária" },
  { title: "CONSISTÊNCIA DIÁRIA", desc: "Pratique ao menos cinco minutos de desafios lógicos diariamente. O aprendizado fragmentado contínuo fixa conexões neuronais de forma superior a maratonas exaustivas.", category: "Treinamento Humano" },
  { title: "FADIGA AO VOLANTE", desc: "Sintomas de fadiga extrema prejudicam os reflexos na mesma proporção de embriaguez leve. Se os olhos pesarem ou houver bocejos constantes, pare imediatamente no ponto de apoio mais próximo.", category: "Segurança de Tráfego" },
  { title: "AQUAPLANAGEM", desc: "Nunca pise no freio bruscamente se o veículo flutuar na água. Mantenha o pé firme no acelerador, segure o volante em linha reta e reduza a velocidade de forma suave.", category: "Direção Defensiva" },
  { title: "ULTRAPASSAGEM SEGURA", desc: "Sinalize com antecedência e use o espelho retrovisor convexo antes de mudar de faixa. Lembre-se: em vias de pista simples, ultrapasse apenas onde a faixa amarela central for tracejada ou seccionada.", category: "Tráfego & Normas" },
  { title: "USO DO PISCA-ALERTA", desc: "O pisca-alerta só deve ser acionado com o veículo em movimento sob condições extremas de neblina espessa ou pane iminente de segurança. Nunca o use de forma fútil.", category: "Legislação & Trânsito" },
  { title: "CONDUÇÃO RETROVISORA", desc: "Ajuste os espelhos para eliminar pontos cegos estruturais: você deve enxergar apenas uma fração mínima da lateral do seu próprio veículo. Isso amplia o campo visual traseiro em até 45%!", category: "Foco & Atenção" }
];

export function Home({ player, onPlay, onViewChange }: HomeProps) {
  const [topPlayer, setTopPlayer] = useState<Player | null>(null);
  const [weeklyHighlight, setWeeklyHighlight] = useState<Player | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Subscribe to the weekly highlight state
  useEffect(() => {
    const docRef = doc(db, 'stats', 'weekly_highlight');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.player) {
          setWeeklyHighlight(data.player as Player);
        }
      }
    }, (err) => {
      console.warn("[Home Highlights] Error fetching weekly highlight from Firestore:", err);
    });
    return () => unsubscribe();
  }, []);

  // Update weekly highlight at Sunday 00:00 (or first load after it)
  useEffect(() => {
    if (!topPlayer) return;

    const checkAndUpdateWeeklyHighlight = async () => {
      try {
        const docRef = doc(db, 'stats', 'weekly_highlight');
        const snap = await getDoc(docRef);

        const now = new Date();
        const currentSunday = new Date();
        const currentDay = currentSunday.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Find the past Sunday 00:00:00
        currentSunday.setDate(currentSunday.getDate() - currentDay);
        currentSunday.setHours(0, 0, 0, 0);
        const currentSundayTime = currentSunday.getTime();

        let needsUpdate = false;
        if (!snap.exists()) {
          needsUpdate = true;
        } else {
          const data = snap.data();
          const lastUpdated = data.lastUpdated || 0;
          // If the last persistent update was before this Sunday's 00:00, refresh with current top player!
          if (lastUpdated < currentSundayTime) {
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          console.log("[Home] Automatically updating weekly highlight to highest ranked:", topPlayer.displayName);
          await setDoc(docRef, {
            player: topPlayer,
            lastUpdated: Date.now()
          });
        }
      } catch (err) {
        console.warn("Failed to check/update weekly highlight:", err);
      }
    };

    checkAndUpdateWeeklyHighlight();
  }, [topPlayer]);



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
        const name = (data.displayName || data.apelido || '').toLowerCase();
        const email = (data.email || '').toLowerCase().trim();
        const isTestName = name === 'teste' || name.startsWith('teste ') || name === 'test' || name.includes('dummy') || name.includes('deletada') || name.includes('deletar') || name === 'recruta' || name.includes('teste');
        const isTestEmail = email === 'teste@rodoplay.com.br' || email.includes('teste@') || email.includes('test@');
        
        if (!isTestName && !isTestEmail) {
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
        }
      });
      const activePlayers = allPlayers.filter(p => {
        const score = p.totalScore || 0;
        const patrols = p.gamesPlayed || p.completedGames || 0;
        return score > 0 && patrols > 0;
      });

      if (activePlayers.length > 0) {
        activePlayers.sort((a, b) => {
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
        setTopPlayer(activePlayers[0]);
      } else {
        setTopPlayer(null);
      }
    }, (err) => {
      console.error("[Home Highlights] Error fetching players:", err);
    });
    return () => unsubscribe();
  }, []);

  const isCurrentPlayerActive = (player.totalScore || 0) > 0 && ((player.gamesPlayed || 0) > 0 || (player.completedGames || 0) > 0);
  const highlightPlayer = topPlayer || (isCurrentPlayerActive ? player : null);

  // Level XP progression calculation
  const currentTotalPower = player.totalScore || 0;
  const currentLevel = player.level || 1;
  const pointsRemainingInLevel = 1000 - (currentTotalPower % 1000);
  const currentLevelProgress = Math.min(100, Math.round(((currentTotalPower % 1000) / 1000) * 100));

  // Real-time synchronization of the highlighted player's profile data
  const highlightUid = weeklyHighlight?.uid || topPlayer?.uid;
  const [realTimeHighlightDetails, setRealTimeHighlightDetails] = useState<Player | null>(null);

  useEffect(() => {
    if (!highlightUid) {
      setRealTimeHighlightDetails(null);
      return;
    }

    const docRef = doc(db, 'rankings/global/players', highlightUid);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRealTimeHighlightDetails({
          ...data,
          totalScore: typeof data.totalScore === 'string' ? parseFloat(data.totalScore) : (data.totalScore !== undefined ? data.totalScore : (data.pontos || 0)),
          gamesPlayed: typeof data.gamesPlayed === 'string' ? parseInt(data.gamesPlayed, 10) : (data.gamesPlayed !== undefined ? data.gamesPlayed : (data.patrulhas || 0)),
          completedGames: typeof data.completedGames === 'string' ? parseInt(data.completedGames, 10) : (data.completedGames !== undefined ? data.completedGames : (data.partidas || 0)),
          victories: typeof data.victories === 'string' ? parseInt(data.victories, 10) : (data.victories !== undefined ? data.victories : (data.vitorias || 0)),
          defeats: typeof data.defeats === 'string' ? parseInt(data.defeats, 10) : (data.defeats !== undefined ? data.defeats : (data.derrotas || 0)),
          level: typeof data.level === 'string' ? parseInt(data.level, 10) : (data.level !== undefined ? data.level : (data.nivel || 1)),
          uid: snapshot.id
        } as Player);
      }
    }, (err) => {
      console.warn("[Home Highlights] Error syncing highlight player details:", err);
    });

    return () => unsubscribe();
  }, [highlightUid]);

  // Determine which operator is displayed on the "Destaque da Semana" card (shared weekly snapshot with real-time updates)
  const displayedHighlight = realTimeHighlightDetails || weeklyHighlight || topPlayer;
  const highlightName = displayedHighlight?.displayName || (displayedHighlight as any)?.name || (displayedHighlight as any)?.apelido || 'Operador RodoPlay';

  // Level XP progression calculation for the displayed highlighted operator
  const highlightTotalPower = displayedHighlight?.totalScore || 0;
  const highlightLevel = displayedHighlight?.level || 1;
  const highlightRemainingInLevel = 1000 - (highlightTotalPower % 1000);
  const highlightLevelProgress = Math.min(100, Math.round(((highlightTotalPower % 1000) / 1000) * 100));

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
              BEM-VINDO, {player?.displayName ? player.displayName.toUpperCase() : 'OPERADOR'}
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
          <div className="flex flex-col items-center justify-center gap-3 w-full border-b border-slate-800 pb-4 text-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className="p-2.5 bg-yellow-450/15 border border-yellow-550/20 rounded-xl text-yellow-400 flex-shrink-0 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <HelpCircle size={20} />
              </div>
              <div className="text-center">
                <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-[0.25em] block leading-none whitespace-nowrap">GUIA RÁPIDO S.O.S</span>
                <span className="text-sm sm:text-base font-black text-yellow-400 uppercase tracking-wider block mt-1.5 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] whitespace-nowrap">DICAS DE TODOS OS JOGOS</span>
              </div>
            </div>

            {/* Slider navigation controls */}
            <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-850 select-none">
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

        {/* Custom Player Profile Card - Extremely Highlighted Masterpiece */}
        {displayedHighlight ? (
          <div 
            onMouseEnter={() => setIsCardHovered(true)}
            onMouseLeave={() => setIsCardHovered(false)}
            style={{ 
              borderColor: 'var(--primary-color)',
              boxShadow: isCardHovered 
                ? '0 0 55px color-mix(in srgb, var(--primary-color) 45%, transparent)' 
                : '0 0 32px color-mix(in srgb, var(--primary-color) 25%, transparent)'
            }}
            className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-[3px] rounded-[2.5rem] p-6 mb-8 relative overflow-hidden group transition-all duration-300 hover:scale-[1.012]"
          >
            {/* Ambient Background Glows */}
            <div 
              style={{ 
                backgroundColor: isCardHovered 
                  ? 'color-mix(in srgb, var(--primary-color) 15%, transparent)' 
                  : 'color-mix(in srgb, var(--primary-color) 10%, transparent)' 
              }}
              className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-500" 
            />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header: Identity & Status Indicator */}
            <div 
              style={{ borderBottomColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)' }}
              className="flex flex-col items-center justify-center text-center border-b-2 pb-5 mb-5 relative"
            >
              <div 
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary-color) 30%, transparent)',
                  boxShadow: '0 0 15px color-mix(in srgb, var(--primary-color) 20%, transparent)'
                }}
                className="flex items-center gap-2 select-none shrink-0 border px-3 py-1 rounded-full mb-3"
              >
                <Crown size={14} style={{ color: 'var(--primary-color)' }} className="animate-bounce" />
                <span style={{ color: 'var(--primary-color)' }} className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">REVELADO TODO DOMINGO ÀS 00:00</span>
              </div>
              <h2 
                style={{ 
                  backgroundImage: 'linear-gradient(to right, var(--primary-light), var(--primary-color), #ffffff)',
                  filter: 'drop-shadow(0 2px 15px color-mix(in srgb, var(--primary-color) 30%, transparent))'
                }}
                className="text-3xl sm:text-4xl font-black italic tracking-wider uppercase text-center text-transparent bg-clip-text drop-shadow-[0_2px_15px_rgba(250,204,21,0.3)] select-none"
              >
                DESTAQUE DA SEMANA
              </h2>
              
              {/* Real-time highlighted player's name directly below the title - Extremely Highlighted Masterpiece */}
              <div 
                style={{ 
                  backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--primary-color) 15%, transparent), color-mix(in srgb, var(--primary-color) 25%, transparent), color-mix(in srgb, var(--primary-color) 15%, transparent))',
                  borderColor: 'var(--primary-color)',
                  boxShadow: '0 0 25px color-mix(in srgb, var(--primary-color) 40%, transparent)'
                }}
                className="mt-3 px-8 py-2.5 border-2 rounded-3xl select-all transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
              >
                <Sparkles size={16} style={{ color: 'var(--primary-color)' }} className="animate-pulse shrink-0" />
                <span style={{ color: 'var(--primary-light)' }} className="text-2xl sm:text-3.5xl font-black uppercase italic tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {highlightName}
                </span>
                <Sparkles size={16} style={{ color: 'var(--primary-color)' }} className="animate-pulse shrink-0" />
              </div>

              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-1 justify-center">
                <Sparkles size={11} className="animate-spin" style={{ color: 'var(--primary-color)', animationDuration: '4s' }} />
                OPERADOR RECOMPENSADO POR EXCELÊNCIA INTEGRAL
                <Sparkles size={11} className="animate-spin" style={{ color: 'var(--primary-color)', animationDuration: '4s' }} />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Primary Identity Section: Avatar and Name Unified Together */}
              <div className="md:col-span-12">
                <div 
                  style={{ 
                    borderColor: 'color-mix(in srgb, var(--primary-color) 25%, transparent)',
                    boxShadow: 'inset 0 1px 25px color-mix(in srgb, var(--primary-color) 10%, transparent)'
                  }}
                  className="relative flex flex-col sm:flex-row items-center gap-5 bg-slate-950/80 border-2 p-5 rounded-3xl w-full transition-all duration-300 hover:border-yellow-400/65"
                >
                  
                  {/* Left block: Avatar & level badge tightly unified */}
                  <div 
                    style={{ 
                      borderColor: 'color-mix(in srgb, var(--primary-color) 20%, transparent)'
                    }}
                    className="relative flex flex-col items-center shrink-0 w-full sm:w-auto p-4 bg-slate-900/90 border rounded-2xl shadow-lg"
                  >
                    <div 
                      style={{ borderColor: 'var(--primary-color)' }}
                      className="w-20 h-20 rounded-2xl bg-slate-950 border-2 flex items-center justify-center text-5xl shadow-[0_4px_22px_rgba(0,0,0,0.75)] overflow-hidden select-none leading-none relative group-hover:border-yellow-300 transition-colors duration-300"
                    >
                      {displayedHighlight.avatar?.startsWith('data') || displayedHighlight.avatar?.startsWith('http') ? (
                        <img src={displayedHighlight.avatar} alt={highlightName} className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <span className="text-2xl text-yellow-500 font-black">{(highlightName || '??').split(' ').filter(n => n).map(n=>n[0]).join('').substring(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div 
                      style={{ 
                        backgroundColor: 'var(--primary-color)',
                        boxShadow: '0 3px 10px color-mix(in srgb, var(--primary-color) 30%, transparent)'
                      }}
                      className="mt-2.5 text-slate-950 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                    >
                      NÍVEL {highlightLevel}
                    </div>
                  </div>

                  {/* Right block: Name and email bound together inside this avatar header */}
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-[0.25em] leading-none block mb-1">OPERADOR DESTAQUE</span>
                    <h3 
                      style={{ backgroundImage: 'linear-gradient(to right, var(--primary-light), var(--primary-color), #ffffff)' }}
                      className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text uppercase italic tracking-tight leading-tight whitespace-normal break-words drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
                    >
                      {highlightName}
                    </h3>
                    {displayedHighlight.email && (
                      <p className="text-slate-400 font-bold tracking-wide lowercase truncate text-[11px] sm:text-xs mt-1.5 flex items-center justify-center sm:justify-start gap-1">
                        <span 
                          style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 85%, transparent)' }}
                          className="w-1.5 h-1.5 rounded-full animate-pulse" 
                        />
                        {displayedHighlight.email}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Grid Section: Base, Turn and Location details */}
              <div className="md:col-span-12 grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/60">
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Compass size={10} style={{ color: 'var(--primary-color)' }} />
                    Base Operacional
                  </span>
                  <span className="text-xs font-black text-white uppercase mt-1.5 truncate">{displayedHighlight.base || 'Base 01'}</span>
                </div>
                
                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Flame size={10} style={{ color: 'var(--primary-color)' }} className="animate-pulse" />
                    Turno de Serviço
                  </span>
                  <span style={{ color: 'var(--primary-color)' }} className="text-xs font-black uppercase mt-1.5 truncate">{displayedHighlight.shift || (displayedHighlight as any).turno || 'GERAL'}</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Car size={10} style={{ color: 'var(--primary-color)' }} />
                    Praça de Pedágio
                  </span>
                  <span className="text-xs font-black text-slate-350 uppercase mt-1.5 truncate">
                    {(displayedHighlight as any).praca || (displayedHighlight as any).praça || 'Não Aplicável'}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Trophy size={10} style={{ color: 'var(--primary-color)' }} />
                    Patrulhas Ativas
                  </span>
                  <span className="text-xs font-black text-blue-400 uppercase mt-1.5 truncate">
                    {displayedHighlight.completedGames || displayedHighlight.gamesPlayed || 0} EFETUADAS
                  </span>
                </div>
              </div>

              {/* Progress and Real-time XP Charging bar */}
              <div className="md:col-span-12 bg-slate-950/80 border border-slate-850 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award size={16} style={{ color: 'var(--primary-color)' }} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">MÉTRICA DE PONTUAÇÃO</span>
                  </div>
                  <span style={{ color: 'var(--primary-color)' }} className="text-[10px] font-black font-mono">
                    {highlightTotalPower % 1000} / 1000 XP
                  </span>
                </div>

                {/* Micro level tracking bar */}
                <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{ 
                      backgroundImage: 'linear-gradient(to right, var(--primary-dark), var(--primary-color), var(--primary-light))', 
                      width: `${highlightLevelProgress}%` 
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${highlightLevelProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>

                <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-bold uppercase mt-1">
                  <span>PONTUAÇÃO OPERACIONAL: <strong style={{ color: 'var(--primary-light)' }} className="font-mono text-[9px] ml-0.5">{(displayedHighlight.totalScore || 0).toLocaleString()} PTS</strong></span>
                  <span>FALTAM <strong className="text-slate-350">{highlightRemainingInLevel} XP</strong> P/ LVL {highlightLevel + 1}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            style={{ borderColor: 'var(--primary-color)' }}
            className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-[3px] rounded-[2.5rem] p-8 mb-8 text-center text-slate-400 font-black uppercase text-xs tracking-widest animate-pulse h-40 flex items-center justify-center"
          >
            CARREGANDO DESTAQUE DA SEMANA... 🏆
          </div>
        )}

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
