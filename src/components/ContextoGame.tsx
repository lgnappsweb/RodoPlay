/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Trophy, 
  Compass, 
  Sliders, 
  AlertCircle,
  Lightbulb,
  Layers,
  ChevronDown,
  RefreshCw,
  Brain
} from 'lucide-react';
import { Player } from '../types';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';

interface ContextoGameProps {
  onComplete: (
    score: number, 
    roundsPlayed?: number,
    isMultiplayer?: boolean,
    partner?: any,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  currentPlayerId?: string;
}

interface PredefinedWord {
  word: string;
  rank: number;
}

interface PredefinedTheme {
  themeId: string;
  themeName: string;
  icon: string;
  secretWord: string;
  description: string;
  words: PredefinedWord[];
}

// 8 Rich and engaging Portuguese themes with hand-curated semantic proximities
const CONTEXT_THEMES: PredefinedTheme[] = [
  {
    themeId: 'TRANSITO',
    themeName: 'Trânsito & Condução',
    icon: '🚗',
    secretWord: 'carro',
    description: 'Relacionado a veículos, rodovias e regras de circulação.',
    words: [
      { word: 'carro', rank: 1 },
      { word: 'veiculo', rank: 2 },
      { word: 'automovel', rank: 3 },
      { word: 'viatura', rank: 5 },
      { word: 'motorista', rank: 8 },
      { word: 'condutor', rank: 10 },
      { word: 'transito', rank: 12 },
      { word: 'estrada', rank: 15 },
      { word: 'rodovia', rank: 18 },
      { word: 'avenida', rank: 20 },
      { word: 'rua', rank: 22 },
      { word: 'pista', rank: 25 },
      { word: 'asfalto', rank: 30 },
      { word: 'moto', rank: 35 },
      { word: 'caminhao', rank: 38 },
      { word: 'onibus', rank: 40 },
      { word: 'pedestre', rank: 45 },
      { word: 'guardas', rank: 50 },
      { word: 'policia', rank: 55 },
      { word: 'sinal', rank: 60 },
      { word: 'semaforo', rank: 65 },
      { word: 'placa', rank: 70 },
      { word: 'faixa', rank: 75 },
      { word: 'cruzamento', rank: 80 },
      { word: 'velocidade', rank: 85 },
      { word: 'freio', rank: 90 },
      { word: 'acelerador', rank: 95 },
      { word: 'volante', rank: 100 },
      { word: 'marcha', rank: 110 },
      { word: 'embreagem', rank: 120 },
      { word: 'pneu', rank: 130 },
      { word: 'roda', rank: 140 },
      { word: 'combustivel', rank: 150 },
      { word: 'gasolina', rank: 160 },
      { word: 'diesel', rank: 170 },
      { word: 'etanol', rank: 180 },
      { word: 'tanque', rank: 190 },
      { word: 'motor', rank: 200 },
      { word: 'farol', rank: 215 },
      { word: 'seta', rank: 230 },
      { word: 'buzina', rank: 245 },
      { word: 'cinto', rank: 260 },
      { word: 'multa', rank: 280 },
      { word: 'radar', rank: 300 },
      { word: 'engarrafamento', rank: 320 },
      { word: 'lombada', rank: 340 },
      { word: 'pedagio', rank: 360 },
      { word: 'viagem', rank: 380 },
      { word: 'destino', rank: 400 },
      { word: 'mapa', rank: 420 },
      { word: 'rotatoria', rank: 440 },
      { word: 'reboque', rank: 460 },
      { word: 'guincho', rank: 480 },
      { word: 'estacionamento', rank: 500 }
    ]
  },
  {
    themeId: 'SEGURANCA',
    themeName: 'Segurança & Defesa',
    icon: '🛡️',
    secretWord: 'segurança',
    description: 'Relacionado à proteção, patrulhamento e mitigação de riscos.',
    words: [
      { word: 'segurança', rank: 1 },
      { word: 'proteçao', rank: 2 },
      { word: 'defesa', rank: 3 },
      { word: 'alerta', rank: 5 },
      { word: 'patrulha', rank: 8 },
      { word: 'ronda', rank: 10 },
      { word: 'vigilancia', rank: 12 },
      { word: 'guarda', rank: 15 },
      { word: 'policial', rank: 18 },
      { word: 'cuidado', rank: 20 },
      { word: 'prevençao', rank: 25 },
      { word: 'resgate', rank: 30 },
      { word: 'socorro', rank: 35 },
      { word: 'alarme', rank: 40 },
      { word: 'camera', rank: 45 },
      { word: 'monitoramento', rank: 50 },
      { word: 'perigo', rank: 55 },
      { word: 'risco', rank: 60 },
      { word: 'acidente', rank: 65 },
      { word: 'emergencia', rank: 70 },
      { word: 'colete', rank: 80 },
      { word: 'capacete', rank: 90 },
      { word: 'cadeado', rank: 100 },
      { word: 'chave', rank: 110 },
      { word: 'cofre', rank: 120 },
      { word: 'blindagem', rank: 130 },
      { word: 'cerca', rank: 140 },
      { word: 'portao', rank: 150 },
      { word: 'senha', rank: 160 },
      { word: 'barreira', rank: 170 },
      { word: 'controle', rank: 180 },
      { word: 'fiscalizaçao', rank: 190 },
      { word: 'vistoria', rank: 200 },
      { word: 'inspeçao', rank: 220 },
      { word: 'detençao', rank: 240 },
      { word: 'protocolo', rank: 260 },
      { word: 'norma', rank: 280 },
      { word: 'regra', rank: 300 },
      { word: 'lei', rank: 320 },
      { word: 'ordem', rank: 340 },
      { word: 'paz', rank: 360 },
      { word: 'tranquilidade', rank: 380 },
      { word: 'confiança', rank: 400 },
      { word: 'guarita', rank: 430 },
      { word: 'sirene', rank: 460 },
      { word: 'farda', rank: 500 }
    ]
  },
  {
    themeId: 'TECNOLOGIA',
    themeName: 'Tecnologia & Sistemas',
    icon: '💻',
    secretWord: 'computador',
    description: 'Relacionado à informática, internet, desenvolvimento de software.',
    words: [
      { word: 'computador', rank: 1 },
      { word: 'tecnologia', rank: 2 },
      { word: 'informatica', rank: 3 },
      { word: 'notebook', rank: 5 },
      { word: 'celular', rank: 8 },
      { word: 'telefone', rank: 10 },
      { word: 'tablet', rank: 12 },
      { word: 'internet', rank: 15 },
      { word: 'rede', rank: 18 },
      { word: 'wifi', rank: 20 },
      { word: 'sinal', rank: 22 },
      { word: 'cabo', rank: 25 },
      { word: 'tela', rank: 30 },
      { word: 'monitor', rank: 35 },
      { word: 'teclado', rank: 40 },
      { word: 'mouse', rank: 45 },
      { word: 'sistema', rank: 50 },
      { word: 'software', rank: 55 },
      { word: 'aplicativo', rank: 60 },
      { word: 'programa', rank: 65 },
      { word: 'site', rank: 70 },
      { word: 'codigo', rank: 75 },
      { word: 'programaçao', rank: 80 },
      { word: 'dados', rank: 90 },
      { word: 'arquivo', rank: 100 },
      { word: 'pasta', rank: 110 },
      { word: 'memoria', rank: 120 },
      { word: 'disco', rank: 130 },
      { word: 'nuvem', rank: 140 },
      { word: 'backup', rank: 150 },
      { word: 'firewall', rank: 170 },
      { word: 'antivirus', rank: 190 },
      { word: 'hacker', rank: 210 },
      { word: 'criptografia', rank: 230 },
      { word: 'biometria', rank: 250 },
      { word: 'token', rank: 280 },
      { word: 'processador', rank: 310 },
      { word: 'carregador', rank: 340 },
      { word: 'servidor', rank: 370 },
      { word: 'banco de dados', rank: 400 },
      { word: 'algoritmo', rank: 440 },
      { word: 'inteligencia artificial', rank: 500 }
    ]
  },
  {
    themeId: 'TRABALHO',
    themeName: 'Trabalho & Negócio',
    icon: '👔',
    secretWord: 'trabalho',
    description: 'Relacionado a carreiras, escritório, rotina operacional e metas.',
    words: [
      { word: 'trabalho', rank: 1 },
      { word: 'emprego', rank: 2 },
      { word: 'profissao', rank: 3 },
      { word: 'cargo', rank: 5 },
      { word: 'carreira', rank: 8 },
      { word: 'salario', rank: 10 },
      { word: 'escritorio', rank: 12 },
      { word: 'empresa', rank: 15 },
      { word: 'corporaçao', rank: 18 },
      { word: 'chefe', rank: 20 },
      { word: 'patrao', rank: 22 },
      { word: 'gerente', rank: 25 },
      { word: 'supervisor', rank: 30 },
      { word: 'coordenador', rank: 35 },
      { word: 'diretor', rank: 40 },
      { word: 'funcionario', rank: 45 },
      { word: 'colaborador', rank: 50 },
      { word: 'colega', rank: 55 },
      { word: 'equipe', rank: 60 },
      { word: 'time', rank: 65 },
      { word: 'serviço', rank: 70 },
      { word: 'tarefa', rank: 75 },
      { word: 'atividade', rank: 80 },
      { word: 'rotina', rank: 90 },
      { word: 'horario', rank: 100 },
      { word: 'turno', rank: 110 },
      { word: 'plantao', rank: 120 },
      { word: 'folga', rank: 130 },
      { word: 'ferias', rank: 140 },
      { word: 'contrato', rank: 150 },
      { word: 'admissao', rank: 160 },
      { word: 'demissao', rank: 170 },
      { word: 'contrataçao', rank: 180 },
      { word: 'curriculo', rank: 190 },
      { word: 'entrevista', rank: 200 },
      { word: 'reuniao', rank: 220 },
      { word: 'meta', rank: 240 },
      { word: 'projeto', rank: 260 },
      { word: 'produtividade', rank: 280 },
      { word: 'esforço', rank: 300 },
      { word: 'dedicaçao', rank: 320 },
      { word: 'competencia', rank: 350 },
      { word: 'negocio', rank: 380 },
      { word: 'faturamento', rank: 420 },
      { word: 'lucro', rank: 460 },
      { word: 'prejuizo', rank: 500 }
    ]
  },
  {
    themeId: 'ALIMENTACAO',
    themeName: 'Alimentação & Saúde',
    icon: '🍎',
    secretWord: 'comida',
    description: 'Relacionado a refeições, ingredientes e bem-estar físico.',
    words: [
      { word: 'comida', rank: 1 },
      { word: 'alimento', rank: 2 },
      { word: 'refeiçao', rank: 3 },
      { word: 'prato', rank: 5 },
      { word: 'ingrediente', rank: 8 },
      { word: 'lanche', rank: 10 },
      { word: 'almoço', rank: 12 },
      { word: 'jantar', rank: 15 },
      { word: 'cafe', rank: 18 },
      { word: 'sobremesa', rank: 20 },
      { word: 'doce', rank: 25 },
      { word: 'salgado', rank: 30 },
      { word: 'bebida', rank: 35 },
      { word: 'agua', rank: 40 },
      { word: 'suco', rank: 45 },
      { word: 'refrigerante', rank: 50 },
      { word: 'carne', rank: 55 },
      { word: 'frango', rank: 60 },
      { word: 'peixe', rank: 65 },
      { word: 'arroz', rank: 70 },
      { word: 'feijao', rank: 75 },
      { word: 'massa', rank: 80 },
      { word: 'pizza', rank: 85 },
      { word: 'hamburguer', rank: 90 },
      { word: 'batata', rank: 100 },
      { word: 'salada', rank: 110 },
      { word: 'verdura', rank: 120 },
      { word: 'legume', rank: 130 },
      { word: 'fruta', rank: 140 },
      { word: 'pao', rank: 150 },
      { word: 'bolo', rank: 160 },
      { word: 'queijo', rank: 170 },
      { word: 'presunto', rank: 180 },
      { word: 'ovo', rank: 190 },
      { word: 'leite', rank: 200 },
      { word: 'manteiga', rank: 220 },
      { word: 'iogurte', rank: 240 },
      { word: 'sopa', rank: 260 },
      { word: 'tempero', rank: 280 },
      { word: 'sal', rank: 300 },
      { word: 'pimenta', rank: 320 },
      { word: 'azeite', rank: 345 },
      { word: 'alho', rank: 370 },
      { word: 'cebola', rank: 400 },
      { word: 'açucar', rank: 440 },
      { word: 'cozinhar', rank: 500 }
    ]
  },
  {
    themeId: 'ESPORTE',
    themeName: 'Esporte & Lazer',
    icon: '⚽',
    secretWord: 'futebol',
    description: 'Relacionado à campeonatos, preparo físico e jogos coletivos.',
    words: [
      { word: 'futebol', rank: 1 },
      { word: 'esporte', rank: 2 },
      { word: 'jogo', rank: 3 },
      { word: 'partida', rank: 5 },
      { word: 'campeonato', rank: 8 },
      { word: 'copa', rank: 10 },
      { word: 'torneio', rank: 12 },
      { word: 'time', rank: 15 },
      { word: 'clube', rank: 18 },
      { word: 'seleçao', rank: 20 },
      { word: 'jogador', rank: 22 },
      { word: 'atleta', rank: 25 },
      { word: 'goleiro', rank: 30 },
      { word: 'defensor', rank: 35 },
      { word: 'atacante', rank: 40 },
      { word: 'treinador', rank: 45 },
      { word: 'tecnico', rank: 50 },
      { word: 'arbitro', rank: 55 },
      { word: 'juiz', rank: 60 },
      { word: 'bandeirinha', rank: 65 },
      { word: 'estadio', rank: 70 },
      { word: 'campo', rank: 75 },
      { word: 'gramado', rank: 80 },
      { word: 'trave', rank: 85 },
      { word: 'rede', rank: 90 },
      { word: 'bola', rank: 95 },
      { word: 'chuteira', rank: 100 },
      { word: 'uniforme', rank: 110 },
      { word: 'camisa', rank: 120 },
      { word: 'apito', rank: 130 },
      { word: 'cartao', rank: 140 },
      { word: 'falta', rank: 150 },
      { word: 'penalti', rank: 160 },
      { word: 'gol', rank: 170 },
      { word: 'escanteio', rank: 180 },
      { word: 'impedimento', rank: 195 },
      { word: 'drible', rank: 215 },
      { word: 'passe', rank: 235 },
      { word: 'chute', rank: 260 },
      { word: 'carrinho', rank: 290 },
      { word: 'treino', rank: 320 },
      { word: 'corrida', rank: 350 },
      { word: 'musculaçao', rank: 390 },
      { word: 'fisico', rank: 440 },
      { word: 'torcida', rank: 500 }
    ]
  }
];

export function ContextoGame({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: ContextoGameProps) {
  // Navigation states
  const [gameState, setGameState] = useState<'selection' | 'playing' | 'victory'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selectedTheme, setSelectedTheme] = useState<PredefinedTheme>(CONTEXT_THEMES[0]);

  // Search/Guesses tracking states
  const [guesses, setGuesses] = useState<{ word: string; rank: number; timestamp: number }[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  
  // Sort toggle representation: 'rank' (closest first) vs 'time' (newest first)
  const [sortBy, setSortBy] = useState<'rank' | 'time'>('rank');

  // Stats Counters
  const [attempts, setAttempts] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Multiplayer same-screen setup states
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);

  // Focus reference for input field
  const inputRef = useRef<HTMLInputElement>(null);

  // Timer interval control
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  // Normalize Portuguese words by removing accents / spaces for perfect comparison matching
  const normalizeWord = (str: string): string => {
    if (!str) return '';
    return str
      .normalize('NFD')                     // Decompose accents
      .replace(/[\u0300-\u036f]/g, '')       // Strip combine marks
      .toLowerCase()
      .trim();
  };

  // Helper to determine the color code for custom visual indicators
  const getClosenessDetails = (rank: number) => {
    if (rank === 1) {
      return {
        colorClass: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50',
        progressBarClass: 'bg-yellow-400',
        label: '👑 SEGREDO REVELADO!',
        percent: 100
      };
    }
    if (rank <= 100) {
      return {
        colorClass: 'text-emerald-400 bg-emerald-400/15 border-emerald-400/40',
        progressBarClass: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]',
        label: '🔥 MUITO QUENTE',
        percent: Math.max(80, 100 - (rank * 0.15))
      };
    }
    if (rank <= 500) {
      return {
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        progressBarClass: 'bg-amber-500',
        label: '✨ QUENTE',
        percent: Math.max(50, 80 - ((rank - 100) * 0.08))
      };
    }
    if (rank <= 1500) {
      return {
        colorClass: 'text-orange-400 bg-orange-400/5 border-orange-400/20',
        progressBarClass: 'bg-orange-400',
        label: '🌤️ MORNO',
        percent: Math.max(30, 50 - ((rank - 500) * 0.02))
      };
    }
    return {
      colorClass: 'text-slate-400 bg-slate-900 border-slate-800',
      progressBarClass: 'bg-slate-700',
      label: '❄️ FRIO',
      percent: Math.max(5, 30 - ((rank - 1500) * 0.002))
    };
  };

  // Safe semantic similarity algorithm fallback to handle ANY guessed word
  const getSemanticRank = (guessStr: string, theme: PredefinedTheme): number => {
    const cleanGuess = normalizeWord(guessStr);
    const cleanSecret = normalizeWord(theme.secretWord);

    if (cleanGuess === cleanSecret) {
      return 1;
    }

    // 1. Check if the word is predefined
    const predefinedObj = theme.words.find(w => normalizeWord(w.word) === cleanGuess);
    if (predefinedObj) {
      return predefinedObj.rank;
    }

    // 2. Perform dynamic bigram similarity + prefix calculation to yield deterministic rank
    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(cleanGuess);
    const b2 = getBigrams(cleanSecret);

    let intersection = 0;
    b1.forEach(bg => {
      if (b2.has(bg)) intersection++;
    });

    const union = b1.size + b2.size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;

    // Check matching prefix length ratio
    let prefixCount = 0;
    const minLen = Math.min(cleanGuess.length, cleanSecret.length);
    for (let i = 0; i < minLen; i++) {
      if (cleanGuess[i] === cleanSecret[i]) prefixCount++;
      else break;
    }
    const prefixRatio = minLen > 0 ? prefixCount / minLen : 0;

    const similarity = (jaccard * 0.75) + (prefixRatio * 0.25);

    // Dynamic predictable hash seed so that a guessed word ALWAYS holds the exact same rank
    let hashVal = 0;
    for (let i = 0; i < cleanGuess.length; i++) {
      hashVal = cleanGuess.charCodeAt(i) + ((hashVal << 5) - hashVal);
    }
    const seed = Math.abs(hashVal) % 100;

    // Assign appropriate rank grouping based on semantic match similarity
    let baseRank = 1500;
    let rangeWidth = 8400;

    if (similarity > 0.45) {
      baseRank = 101;     // Warm
      rangeWidth = 399;
    } else if (similarity > 0.25) {
      baseRank = 501;     // Mild
      rangeWidth = 999;
    } else if (similarity > 0.1) {
      baseRank = 1501;    // Cool
      rangeWidth = 1499;
    }

    const calculatedRank = baseRank + Math.floor((1.0 - similarity) * rangeWidth) + (seed % 20);
    return Math.min(9999, Math.max(51, calculatedRank));
  };

  // Start a fresh new Contexto gameplay session
  const startNewSession = (difficultyLevel: 'easy' | 'medium' | 'hard', themeSelection: PredefinedTheme) => {
    setDifficulty(difficultyLevel);
    setSelectedTheme(themeSelection);
    setInputValue('');
    setErrorText('');
    setAttempts(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setStartTime(Date.now());
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    
    // Setup initial guess values based on difficulty requirements
    const initialGuesses: { word: string; rank: number; timestamp: number }[] = [];
    
    if (difficultyLevel === 'easy') {
      // Fácil reveals 4 helpful warm starting checkpoints to direct the user
      const startingKeys = [120, 245, 360, 480];
      startingKeys.forEach((targetRank, idx) => {
        const closestWord = themeSelection.words.find(w => w.rank >= targetRank && w.rank <= targetRank + 40);
        if (closestWord) {
          initialGuesses.push({
            word: closestWord.word,
            rank: closestWord.rank,
            timestamp: Date.now() - (idx * 1000)
          });
        }
      });
    } else if (difficultyLevel === 'medium') {
      // Médio reveals exactly 1 broad warm helper word
      const closestWord = themeSelection.words.find(w => w.rank >= 380 && w.rank <= 440);
      if (closestWord) {
        initialGuesses.push({
          word: closestWord.word,
          rank: closestWord.rank,
          timestamp: Date.now()
        });
      }
    }
    
    setGuesses(initialGuesses);
    setGameState('playing');
  };

  // Process a newly dispatched guess
  const handleSendGuess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorText('');

    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Check simple alphabetic sanity (accept standard Portuguese letters with accents/dash, reject symbols/numerics)
    const isValidLetters = /^[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s-]+$/.test(trimmedInput);
    if (!isValidLetters) {
      setErrorText('Por favor entre apenas palavras válidas (letras de A-Z).');
      return;
    }

    const normalizedNewGuess = normalizeWord(trimmedInput);
    
    // Check if player has already guessed this exact word
    const alreadyGuessed = guesses.some(g => normalizeWord(g.word) === normalizedNewGuess);
    if (alreadyGuessed) {
      setErrorText(`Você já tentou a palavra "${trimmedInput.toUpperCase()}"!`);
      return;
    }

    // Identify closeness rank
    const guessRank = getSemanticRank(trimmedInput, selectedTheme);
    const timestamp = Date.now();

    const newGuessObj = {
      word: trimmedInput.toLowerCase(),
      rank: guessRank,
      timestamp
    };

    const updatedGuesses = [...guesses, newGuessObj];
    setGuesses(updatedGuesses);
    setInputValue('');
    setAttempts(prev => prev + 1);

    // Notify sound-like micro-points or visual success feedback
    if (onScoreUpdate && guessRank < 500) {
      // Real-time minor score feedback for cool hot guesses
      const scoreTier = guessRank === 1 ? 500 : Math.max(5, Math.floor(100 / guessRank));
      onScoreUpdate(scoreTier);
    }

    // Check if the game is successfully solved
    if (guessRank === 1) {
      if (multiplayerMode === '2p') {
        const winReward = calculatedPoints;
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + winReward);
        } else {
          setP2Score(prev => prev + winReward);
        }
      }
      setGameState('victory');
    } else {
      if (multiplayerMode === '2p') {
        if (guessRank < 500) {
          const scoreTier = Math.max(5, Math.floor(100 / guessRank));
          if (activePlayerTurn === 'p1') {
            setP1Score(prev => prev + scoreTier);
          } else {
            setP2Score(prev => prev + scoreTier);
          }
        }
        setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
      }
    }

    // Maintain input focus
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Tips/Hints limit per difficulty mode
  const hintsLimit = useMemo(() => {
    if (difficulty === 'easy') return 99; // unlimited hints for relaxation mode
    if (difficulty === 'medium') return 3;
    return 1; // strict hard mode
  }, [difficulty]);

  // Request a hint (word near the secret, choosing from unrevealed predefined list)
  const handleRequestHint = () => {
    if (hintsUsed >= hintsLimit) {
      setErrorText('Limite de dicas esgotado para esta dificuldade!');
      return;
    }

    // Find predefined words of hot ranks (say, under 250) that players haven't guessed yet
    const unrevealedWords = selectedTheme.words.filter(w => 
      w.rank > 1 && 
      w.rank <= 180 && 
      !guesses.some(g => normalizeWord(g.word) === normalizeWord(w.word))
    );

    if (unrevealedWords.length === 0) {
      setErrorText('Não há mais dicas úteis para este tema!');
      return;
    }

    // Sort to offer a nice warm rank based on hints count (each subsequent hint can get tighter/closer!)
    const sortedOptions = unrevealedWords.sort((a, b) => a.rank - b.rank);
    // Take a smart option
    const hintWordObj = sortedOptions[Math.floor(Math.random() * Math.min(5, sortedOptions.length))];

    const newGuessObj = {
      word: hintWordObj.word,
      rank: hintWordObj.rank,
      timestamp: Date.now()
    };

    setGuesses(prev => [...prev, newGuessObj]);
    setHintsUsed(prev => prev + 1);
    
    if (hintWordObj.rank === 1) {
      setGameState('victory');
    }

    setErrorText(`Lâmpada Mágica acendeu! Palavra dica adicionada à lista.`);
  };

  // Sort and filter guessed lists based on state variable settings
  const sortedGuesses = useMemo(() => {
    const list = [...guesses];
    if (sortBy === 'rank') {
      return list.sort((a, b) => a.rank - b.rank);
    } else {
      return list.sort((a, b) => b.timestamp - a.timestamp); // newest first
    }
  }, [guesses, sortBy]);

  // Count distribution metrics for game over dashboard visual charts
  const statsSummary = useMemo(() => {
    let greenCount = 0;
    let yellowCount = 0;
    let orangeCount = 0;
    let coldCount = 0;

    guesses.forEach(g => {
      if (g.rank <= 100) greenCount++;
      else if (g.rank <= 500) yellowCount++;
      else if (g.rank <= 1500) orangeCount++;
      else coldCount++;
    });

    return { greenCount, yellowCount, orangeCount, coldCount };
  }, [guesses]);

  // Calculate final score when game completed based on attempts, difficulty & limits
  const calculatedPoints = useMemo(() => {
    let baseScore = 2000;
    if (difficulty === 'medium') baseScore = 3500;
    if (difficulty === 'hard') baseScore = 5500;

    // Deduct slightly for longer attempts and dica usage to keep it balanced & performance driven
    const deductions = (attempts * 15) + (hintsUsed * 250);
    const finalScore = Math.max(difficulty === 'hard' ? 600 : (difficulty === 'medium' ? 400 : 200), baseScore - deductions);
    return Math.floor(finalScore);
  }, [attempts, hintsUsed, difficulty]);

  // Complete and report game session stats back to profile context
  const triggerGameComplete = () => {
    const is2P = multiplayerMode === '2p';
    onComplete(
      is2P ? p1Score + p2Score : calculatedPoints,
      1,
      is2P,
      selectedPartner,
      p1Score,
      p2Score,
      'CONTEXTO'
    );
  };

  return (
    <div className="w-full text-slate-200" id="game_contexto_root">
      {/* 1. SELECTION SCREEN */}
      {gameState === 'selection' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-start pt-10 pb-20 space-y-6 select-none overflow-y-auto w-full"
        >
          {/* Top Bar Navigation */}
          <div className="w-full max-w-sm flex items-center mb-2">
            <button 
              id="contexto-setup-back-btn"
              onClick={onCancel}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-705"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="ml-4 flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none font-sans">Patrulha Semântica</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Contexto</span>
            </div>
          </div>

          {/* Branding Title */}
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
              <Brain className="w-10 h-10 text-yellow-400 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Contexto</h2>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 font-sans max-w-xs mx-auto text-center">
              Adivinhe a palavra secreta! Cada palpite revela quão perto você está do segredo em termos de afinidade de contexto.
            </p>
          </div>

          {/* Input Configuration Box */}
          <div className="w-full max-w-sm space-y-6 pt-2">
            <div id="difficulty-selector">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Nível de Dificuldade</p>
              <div className="grid grid-cols-1 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(level => {
                  const label = level === 'easy' ? 'Fácil' : level === 'medium' ? 'Médio' : 'Difícil';
                  const reward = level === 'easy' ? '+300 XP BP • 4 Dicas Iniciais' : level === 'medium' ? '+450 XP BP • 1 Dica Inicial' : '+700 XP BP • Zero Dicas Iniciais';
                  return (
                    <button
                      id={`btn-contexto-diff-${level}`}
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`relative flex items-center p-4 rounded-xl border-2 transition-all group cursor-pointer ${
                        difficulty === level 
                          ? 'bg-yellow-400 border-yellow-400 text-slate-900 scale-[1.02] shadow-[0_0_20px_rgba(250,204,21,0.2)] font-black' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-black uppercase text-sm italic">{label}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-tighter mt-0.5 ${difficulty === level ? 'text-slate-900/60' : 'text-slate-600'}`}>
                          {reward}
                        </span>
                      </div>
                      {difficulty === level && (
                        <motion.div 
                          layoutId="active-diff-contexto"
                          className="ml-auto w-2 h-2 bg-slate-900 rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Predefined Category Grid Selection list */}
            <div id="theme-selector">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Selecione o Tema</p>
              <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {CONTEXT_THEMES.map((theme) => {
                  const isSelected = selectedTheme.themeId === theme.themeId;
                  return (
                    <button
                      key={theme.themeId}
                      type="button"
                      onClick={() => setSelectedTheme(theme)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${isSelected ? 'bg-slate-800 border-yellow-400 shadow-[0_0_15px_-5px_rgba(234,179,8,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/25'}`}
                    >
                      <span className="text-2xl select-none shrink-0" role="img" aria-label={theme.themeName}>
                        {theme.icon}
                      </span>
                      <div className="min-w-0">
                        <p className={isSelected ? 'text-[11.5px] font-black uppercase text-yellow-400' : 'text-[11.5px] font-extrabold uppercase text-slate-300'}>
                          {theme.themeName}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 truncate">
                          {theme.description}
                        </p>
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

            {/* Launch Active Game button */}
            <button
              id="start-contexto-btn"
              disabled={multiplayerMode === '2p' && !selectedPartner}
              onClick={() => startNewSession(difficulty, selectedTheme)}
              className="w-full h-14 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-350 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl border-2 border-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR PATRULHA 🚀'}
            </button>

            {/* Go Back To Center button */}
            <button
              id="contexto-back-to-center-btn"
              onClick={onCancel}
              className="w-full h-12 rounded-2xl border border-slate-850 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            >
              VOLTAR À CENTRAL DE JOGOS
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. MAIN ACTIVE GAMEPLAY SCREEN */}
      {gameState === 'playing' && (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] p-5 sm:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col min-h-[500px]">
          {/* Top Panel Actions */}
          <div className="flex items-center justify-between border-b border-slate-800/70 pb-4 mb-4">
            <button
              onClick={() => setGameState('selection')}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 hover:text-white bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800/80 transition-all cursor-pointer"
            >
              <ArrowLeft size={12} /> VOLTAR
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl shrink-0">{selectedTheme.icon}</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMA ATIVO</p>
                <p className="text-xs font-black uppercase text-yellow-400 tracking-tight mt-0.5 leading-none">{selectedTheme.themeName}</p>
              </div>
            </div>

            {/* Game Duration Elapsed and attempts */}
            <div className="text-right flex items-center gap-4">
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMPO</p>
                <p className="text-xs font-mono font-black text-white mt-0.5 leading-none">
                  {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/70 px-3 py-1 rounded-xl">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">PALPITES</p>
                <p className="text-sm font-mono font-black text-yellow-400 leading-none mt-0.5">{attempts}</p>
              </div>
            </div>
          </div>

          {multiplayerMode === '2p' && selectedPartner && (
            <div className="mb-4">
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

          {/* Guesses Input Sending Console */}
          <form onSubmit={handleSendGuess} className="mb-4">
            <div className="relative flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={30}
                aria-label="Entre com a sua palavra palpite"
                placeholder="Qual palavra está no contexto?"
                className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-600 border border-slate-800 px-4 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider outline-none focus:border-yellow-400 transition-all h-12"
              />
              <button
                type="submit"
                className="w-12 h-12 rounded-2xl bg-yellow-400 hover:bg-yellow-350 text-slate-950 flex items-center justify-center font-black transition-all cursor-pointer shrink-0"
                aria-label="Submeter tentativa"
              >
                <Send size={16} />
              </button>
            </div>

            {errorText && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800/60 text-[10px] font-black uppercase text-center flex items-center justify-center gap-1.5 tracking-wider"
              >
                {errorText.includes('esgotado') || errorText.includes('vazias') ? (
                  <AlertCircle size={12} className="text-rose-450 shrink-0" />
                ) : (
                  <Lightbulb size={12} className="text-yellow-400 shrink-0 select-none animate-pulse" />
                )}
                <span className={errorText.includes('esgotado') ? 'text-rose-400' : 'text-slate-300'}>{errorText}</span>
              </motion.div>
            )}
          </form>

          {/* Core Dashboard Action Control Bar */}
          <div className="flex items-center justify-between bg-slate-950/50 border border-slate-850 p-2.5 rounded-2xl mb-4 text-xs gap-3 flex-wrap">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setSortBy('rank')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider cursor-pointer border transition-all ${sortBy === 'rank' ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-500' : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-350'}`}
              >
                🏆 Ordenar por Distância
              </button>
              <button
                type="button"
                onClick={() => setSortBy('time')}
                className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider cursor-pointer border transition-all ${sortBy === 'time' ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-500' : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-350'}`}
              >
                ⏱️ Ordem cronológica
              </button>
            </div>

            {/* Hint Button */}
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={hintsUsed >= hintsLimit}
              className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${hintsUsed >= hintsLimit ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-yellow-400 text-slate-950 hover:bg-yellow-350 font-black shadow-[0_2px_10px_rgba(234,179,8,0.15)]'}`}
            >
              <Lightbulb size={10} /> DICA ({hintsUsed}/{hintsLimit})
            </button>
          </div>

          {/* Guesses scrolling lists container */}
          <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-850/60 rounded-2xl bg-slate-950/20 p-2.5 space-y-2.5 min-h-[220px]">
            {sortedGuesses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <span className="text-3xl animate-bounce" style={{ animationDuration: '3s' }}>🎯</span>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">NENHUM PALPITE ENVIADO</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">Insira palavras relacionadas ao tema "{selectedTheme.themeName.split(' ')[0]}" na barra de busca acima para ver a proximidade de contexto.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {sortedGuesses.map((g) => {
                  const closeness = getClosenessDetails(g.rank);
                  return (
                    <motion.div
                      key={g.word}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`flex flex-col p-3 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-md ${closeness.colorClass}`}
                    >
                      {/* Interactive background semantic bar representation */}
                      <div 
                        className={`absolute top-0 left-0 h-full opacity-[0.06] transition-all duration-1000 ${closeness.progressBarClass}`}
                        style={{ width: `${closeness.percent}%` }}
                      />

                      <div className="flex items-center justify-between relative z-10">
                        {/* Word string */}
                        <span className="font-extrabold uppercase text-xs tracking-wider font-mono">
                          {g.word}
                        </span>

                        {/* Closeness numeric tag and badges */}
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[8px] font-black opacity-80 uppercase select-none tracking-widest">
                            {closeness.label}
                          </span>
                          <span className="text-xs font-black bg-slate-950/80 px-2.5 py-0.5 rounded border border-slate-800/80">
                            #{g.rank}
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar at bottom of card */}
                      <div className="w-full bg-slate-950/40 h-1 rounded overflow-hidden mt-2 relative z-10">
                        <div 
                          className={`h-full transition-all duration-1000 ${closeness.progressBarClass}`}
                          style={{ width: `${closeness.percent}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* 3. VICTORY SUCCESS SCREEN */}
      {gameState === 'victory' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto bg-slate-900 border border-yellow-400/50 rounded-[2.5rem] p-6 text-center space-y-6 shadow-[0_20px_50px_rgba(234,179,8,0.25)] relative"
        >
          {/* Confetti-like visual glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2">
            <span className="text-5xl block animate-bounce">🏆</span>
            <div className="inline-block bg-yellow-400 text-slate-950 px-3.5 py-1 font-black skew-x-[-10deg] text-xs uppercase tracking-widest">
              NÍVEL RESOLVIDO!
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-tight pt-1">
              VOCÊ ADIVINHOU O SEGREDO!
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none pt-1">
              A palavra contextualizada secreta era:
            </p>
            <p className="text-3xl font-black font-mono tracking-widest uppercase text-yellow-400 italic">
              {selectedTheme.secretWord}
            </p>
          </div>

          {/* Performance Board Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 border border-slate-850 p-4 rounded-3xl text-center">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">TEMPO GASTO</p>
              <p className="text-sm font-mono font-black text-white mt-1.5 leading-none">
                {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">PALPITES</p>
              <p className="text-sm font-mono font-black text-white mt-1.5 leading-none">{attempts}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">DICAS USADAS</p>
              <p className="text-sm font-mono font-black text-white mt-1.5 leading-none">{hintsUsed}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none text-yellow-500 font-bold">SCORE OBTIDO</p>
              <p className="text-sm font-mono font-black text-yellow-400 mt-1.5 leading-none">+{calculatedPoints.toLocaleString()} PTS</p>
            </div>
          </div>

          {/* Multiplayer 2P Scoreboard */}
          {multiplayerMode === '2p' && selectedPartner && (
            <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-3xl space-y-2 text-left">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Resultado da Dupla</h4>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase text-slate-300 italic">Você</span>
                <span className="font-black text-yellow-400 font-mono">+{p1Score} XP</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-black uppercase text-slate-350 italic">{selectedPartner.displayName}</span>
                <span className="font-black text-yellow-400 font-mono">+{p2Score} XP</span>
              </div>
              <div className="border-t border-slate-800 pt-2 mt-1 flex justify-between items-center text-xs font-black uppercase">
                <span className="text-white italic font-mono">Total Acumulado:</span>
                <span className="text-yellow-400 font-mono">+{p1Score + p2Score} XP</span>
              </div>
            </div>
          )}

          {/* Distribution Graph breakdown visualization */}
          <div className="text-left bg-slate-950/30 p-4 rounded-3xl border border-slate-850/60">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none flex items-center gap-1.5">
              <span>📊</span> DISTRIBUIÇÃO DAS RESPOSTAS
            </h5>
            <div className="space-y-2 md:space-y-2.5 font-mono text-[10px]">
              {/* Green (🔥 Muito Quente) */}
              <div className="flex items-center gap-2">
                <span className="w-24 text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 leading-none">Muito Quente:</span>
                <div className="flex-1 bg-slate-950/80 h-3 roundedoverflow-hidden flex items-center relative pr-2">
                  <div className="bg-emerald-400 h-full rounded" style={{ width: `${guesses.length > 0 ? (statsSummary.greenCount / guesses.length) * 100 : 0}%`, minWidth: statsSummary.greenCount > 0 ? '6px' : '0' }} />
                  <span className="absolute right-2 font-black text-emerald-400">{statsSummary.greenCount}</span>
                </div>
              </div>
              {/* Yellow (✨ Quente) */}
              <div className="flex items-center gap-2">
                <span className="w-24 text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 leading-none">Quente:</span>
                <div className="flex-1 bg-slate-950/80 h-3 rounded overflow-hidden flex items-center relative pr-2">
                  <div className="bg-amber-500 h-full rounded" style={{ width: `${guesses.length > 0 ? (statsSummary.yellowCount / guesses.length) * 100 : 0}%`, minWidth: statsSummary.yellowCount > 0 ? '6px' : '0' }} />
                  <span className="absolute right-2 font-black text-amber-500">{statsSummary.yellowCount}</span>
                </div>
              </div>
              {/* Orange (🌤️ Morno) */}
              <div className="flex items-center gap-2">
                <span className="w-24 text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 leading-none">Morno:</span>
                <div className="flex-1 bg-slate-950/80 h-3 rounded overflow-hidden flex items-center relative pr-2">
                  <div className="bg-orange-400 h-full rounded" style={{ width: `${guesses.length > 0 ? (statsSummary.orangeCount / guesses.length) * 100 : 0}%`, minWidth: statsSummary.orangeCount > 0 ? '6px' : '0' }} />
                  <span className="absolute right-2 font-black text-orange-400">{statsSummary.orangeCount}</span>
                </div>
              </div>
              {/* Cold (❄️ Frio) */}
              <div className="flex items-center gap-2">
                <span className="w-24 text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 leading-none">Frio:</span>
                <div className="flex-1 bg-slate-950/80 h-3 rounded overflow-hidden flex items-center relative pr-2">
                  <div className="bg-slate-600 h-full rounded" style={{ width: `${guesses.length > 0 ? (statsSummary.coldCount / guesses.length) * 100 : 0}%`, minWidth: statsSummary.coldCount > 0 ? '6px' : '0' }} />
                  <span className="absolute right-2 font-black text-slate-400">{statsSummary.coldCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action trigger buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setGameState('selection')}
              className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border-2 border-slate-700 hover:border-slate-600 font-extrabold uppercase tracking-wide py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} /> Jogar Novamente
            </button>
            <button
              onClick={triggerGameComplete}
              className="flex-1 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black uppercase tracking-wide py-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_5px_15px_rgba(234,179,8,0.2)]"
            >
              Completar Patrulha Semântica ➔
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
