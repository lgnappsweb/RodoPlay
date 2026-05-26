/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ArrowLeft, Timer, Award, HelpCircle, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MultiplayerSetup, MultiplayerGameplayBar } from './MultiplayerSetup';
import { Player } from '../types';

interface SignMatchProps {
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

interface TrafficSignData {
  code: string;
  name: string;
  category: 'regulamentação' | 'advertência' | 'indicação';
  type: string;
}

const SIGNS: TrafficSignData[] = [
  // --- REGULAMENTAÇÃO ---
  { code: 'R-1', name: 'Parada Obrigatória', category: 'regulamentação', type: 'pare' },
  { code: 'R-2', name: 'Dê a Preferência', category: 'regulamentação', type: 'preferencia' },
  { code: 'R-3', name: 'Sentido Proibido', category: 'regulamentação', type: 'sentido_proibido' },
  { code: 'R-4a', name: 'Proibido Virar à Esquerda', category: 'regulamentação', type: 'proibido_esquerda' },
  { code: 'R-4b', name: 'Proibido Virar à Direita', category: 'regulamentação', type: 'proibido_direita' },
  { code: 'R-5a', name: 'Proibido Retorno à Esquerda', category: 'regulamentação', type: 'proibido_retorno' },
  { code: 'R-15', name: 'Altura Máxima Permitida', category: 'regulamentação', type: 'altura_max' },
  { code: 'R-16', name: 'Largura Máxima Permitida', category: 'regulamentação', type: 'largura_max' },
  { code: 'R-19_80', name: 'Velocidade Máxima (80 km/h)', category: 'regulamentação', type: 'speed_80' },
  { code: 'R-19_110', name: 'Velocidade Máxima (110 km/h)', category: 'regulamentação', type: 'speed_110' },
  { code: 'R-24a', name: 'Sentido de Circulação da Via', category: 'regulamentação', type: 'sentido_via' },
  { code: 'R-24b', name: 'Passagem Obrigatória', category: 'regulamentação', type: 'passagem_obrigatoria' },
  { code: 'R-26', name: 'Siga em Frente', category: 'regulamentação', type: 'siga_frente' },
  { code: 'R-31', name: 'Pedestre, ande pela esquerda', category: 'regulamentação', type: 'pedestre_esquerda' },
  
  // --- ADVERTÊNCIA ---
  { code: 'A-1a', name: 'Curva Acentuada à Esquerda', category: 'advertência', type: 'curva_esquerda' },
  { code: 'A-1b', name: 'Curva Acentuada à Direita', category: 'advertência', type: 'curva_direita' },
  { code: 'A-3a', name: 'Pista Sinuosa à Esquerda', category: 'advertência', type: 'pista_sinuosa' },
  { code: 'A-14', name: 'Semáforo à Frente', category: 'advertência', type: 'semaforo' },
  { code: 'A-15', name: 'Parada Obrigatória à Frente', category: 'advertência', type: 'pare_frente' },
  { code: 'A-18', name: 'Saliência ou Lombada', category: 'advertência', type: 'lombada' },
  { code: 'A-21a', name: 'Estreitamento de Pista ao Centro', category: 'advertência', type: 'estreitamento' },
  { code: 'A-32a', name: 'Trânsito de Pedestres', category: 'advertência', type: 'pedestres' },
  { code: 'A-32b', name: 'Passagem Sinalizada de Pedestres', category: 'advertência', type: 'pedestres_sinalizada' },
  { code: 'A-33a', name: 'Área Escolar', category: 'advertência', type: 'escolar' },
  { code: 'A-36', name: 'Animais Selvagens', category: 'advertência', type: 'animais' },

  // --- INDICAÇÃO ---
  { code: 'I-1', name: 'Pronto-Socorro', category: 'indicação', type: 'pronto_socorro' },
  { code: 'I-2', name: 'Serviço Sanitário (WC)', category: 'indicação', type: 'wc' },
  { code: 'I-3', name: 'Restaurante', category: 'indicação', type: 'restaurante' },
  { code: 'I-4', name: 'Abastecimento', category: 'indicação', type: 'combustivel' },
  { code: 'I-12', name: 'Pedágio', category: 'indicação', type: 'pedagio' },
  { code: 'I-18', name: 'Estacionamento Regulamentado', category: 'indicação', type: 'estacionamento' },
  { code: 'I-19', name: 'Área de Campismo', category: 'indicação', type: 'campismo' },
];

function TrafficSignSvg({ type }: { type: string }) {
  // Common sizes and views
  return (
    <div className="w-36 h-36 flex items-center justify-center p-2 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-inner relative group select-none">
      <svg viewBox="0 0 100 100" className="w-28 h-28 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        {type === 'pare' && (
          <>
            <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" />
            <polygon points="32,8 68,8 92,32 92,68 68,92 32,92 8,68 8,32" fill="none" stroke="#ffffff" strokeWidth="2" />
            <text x="51" y="58" fill="#ffffff" fontSize="21" fontWeight="950" textAnchor="middle" fontFamily="sans-serif" letterSpacing="-0.5">PARE</text>
          </>
        )}

        {type === 'preferencia' && (
          <>
            <polygon points="5,15 95,15 50,93" fill="#ffffff" stroke="#dc2626" strokeWidth="10" strokeLinejoin="round" />
            <polygon points="12,20 88,20 50,85" fill="#ffffff" />
          </>
        )}

        {type === 'sentido_proibido' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M50,80 L50,26 M41,36 L50,21 L59,36" stroke="#000000" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </>
        )}

        {type === 'proibido_esquerda' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M54,75 L54,50 Q54,39 42,39 L27,39 M35,29 L21,39 L35,49" stroke="#000000" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </>
        )}

        {type === 'proibido_direita' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M46,75 L46,50 Q46,39 58,39 L73,39 M65,29 L79,39 L65,49" stroke="#000000" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </>
        )}

        {type === 'proibido_retorno' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M60,73 L60,45 A14,14 0 0,0 32,45 L32,60 M22,50 L32,61 L42,50" stroke="#000000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </>
        )}

        {type === 'altura_max' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M50,31 L50,15 M43,23 L50,14 L57,23" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M50,69 L50,85 M43,77 L50,86 L57,77" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="50" y="55" fill="#000000" fontSize="19" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">4,3 m</text>
          </>
        )}

        {type === 'largura_max' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <path d="M15,50 L31,50 M23,43 L14,50 L23,57" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M85,50 L69,50 M77,43 L86,50 L77,57" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="50" y="56" fill="#000000" fontSize="19" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">2,5 m</text>
          </>
        )}

        {type === 'speed_80' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <text x="50" y="52" fill="#000000" fontSize="31" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">80</text>
            <text x="50" y="66" fill="#000000" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">km/h</text>
          </>
        )}

        {type === 'speed_110' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            <text x="51" y="52" fill="#000000" fontSize="28" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">110</text>
            <text x="50" y="66" fill="#000000" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">km/h</text>
          </>
        )}

        {type === 'sentido_via' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
            <path d="M22,50 L74,50 M62,38 L76,50 L62,62" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'passagem_obrigatoria' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
            <path d="M30,30 L66,66 M51,66 L68,68 L66,51" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'siga_frente' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#1d4ed8" stroke="#ffffff" strokeWidth="3" />
            <path d="M50,78 L50,24 M41,34 L50,19 L59,34" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'pedestre_esquerda' && (
          <>
            <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
            {/* Person icon left */}
            <circle cx="34" cy="40" r="3" fill="#000000" />
            <path d="M34,43 L34,57 L30,68 M34,57 L38,68 M26,48 L34,50 L42,47" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Blue arrow to keep layout */}
            <path d="M60,65 L60,32 M53,40 L60,30 L67,40" stroke="#1d4ed8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {/* WARNING SIGNS (Yellow Diamond, black outline) */}
        {type === 'curva_esquerda' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M61,65 L61,46 Q61,35 46,35 L28,35 M38,26 L26,35 L38,44" stroke="#000000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'curva_direita' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M39,65 L39,46 Q39,35 54,35 L72,35 M62,26 L74,35 L62,44" stroke="#000000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'pista_sinuosa' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M50,71 L50,60 Q50,54 44,51 Q38,48 38,42 Q38,36 44,33 L44,25" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <path d="M37,32 L44,22 L51,32" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'semaforo' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <rect x="42" y="24" width="16" height="42" rx="4" fill="#1e293b" stroke="#000000" strokeWidth="2.5" />
            <circle cx="50" cy="31" r="4.5" fill="#dc2626" />
            <circle cx="50" cy="45" r="4.5" fill="#f59e0b" />
            <circle cx="50" cy="59" r="4.5" fill="#10b981" />
          </>
        )}

        {type === 'pare_frente' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <polygon points="38,24 62,24 74,36 74,50 62,62 38,62 26,50 26,36" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
            <text x="50" y="47" fill="#ffffff" fontSize="9" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">PARE</text>
            <path d="M50,81 L50,68 M45,74 L50,67 L55,74" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'lombada' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M16,60 L36,60 Q50,38 64,60 L84,60" stroke="#000000" strokeWidth="7" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'estreitamento' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M34,74 L34,54 Q34,44 42,44 L42,24 M66,74 L66,54 Q66,44 58,44 L58,24" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'pedestres' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <circle cx="50" cy="31" r="4.5" fill="#000000" />
            <line x1="50" y1="35.5" x2="50" y2="53" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M50,53 L42,70 M50,53 L58,70 M40,41 L50,43 L60,39" stroke="#000000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {type === 'pedestres_sinalizada' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M26,63 L74,63 M30,69 L70,69 M34,75 L66,75" stroke="#000000" strokeWidth="3" />
            <circle cx="50" cy="27" r="4" fill="#000000" />
            <line x1="50" y1="31" x2="50" y2="48" stroke="#000000" strokeWidth="4" />
            <path d="M50,48 L43,62 M50,48 L57,62 M38,36 L50,38 L62,34" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'escolar' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M42,29 A3.5,3.5 0 1,0 42,22 A3.5,3.5 0 1,0 42,29 M57,34 A3,3 0 1,0 57,28 A3,3 0 1,0 57,34 M42,29 L42,50 L37,65 M42,50 L47,65 M57,34 L57,51 L53,65 M57,51 L61,65 M42,38 L50,44 L57,41" stroke="#000000" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'animais' && (
          <>
            <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M24,49 Q30,34 45,34 Q55,34 60,40 L76,36 L71,46 L76,53 L65,53 L58,60 M28,48 L17,52 M45,53 L39,69 M55,53 L60,69" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}

        {/* INDICATION SIGNS (Blue Square, white borders) */}
        {type === 'pronto_socorro' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            <path d="M50,31 L50,69 M31,50 L69,50" stroke="#dc2626" strokeWidth="11.5" strokeLinecap="square" />
          </>
        )}

        {type === 'wc' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            <text x="50" y="57" fill="#1e40af" fontSize="23" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">WC</text>
          </>
        )}

        {type === 'restaurante' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            {/* Fork */}
            <path d="M38,34 L38,48 M34,34 L34,43 A4,4 0 0,0 42,43 M42,34 L42,43 M38,48 L38,65" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Knife */}
            <path d="M62,34 L62,48 M62,48 L62,65 M55,34 L55,48 A4,4 0 0,0 59,52 L59,65" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {type === 'combustivel' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            <rect x="33" y="38" width="22" height="32" rx="2" fill="#1e40af" />
            <rect x="37" y="42" width="14" height="10" fill="#ffffff" />
            <path d="M55,44 Q65,44 61,63 L57,66" stroke="#1e40af" strokeWidth="3.5" fill="none" />
            <circle cx="44" cy="60" r="2.5" fill="#ffffff" />
          </>
        )}

        {type === 'pedagio' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            <circle cx="50" cy="53" r="16" fill="#1e40af" />
            <text x="50" y="58" fill="#ffffff" fontSize="15" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">$</text>
            <rect x="28" y="29" width="44" height="7" fill="#1e40af" />
          </>
        )}

        {type === 'estacionamento' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <text x="50" y="67" fill="#ffffff" fontSize="56" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">E</text>
          </>
        )}

        {type === 'campismo' && (
          <>
            <rect x="5" y="5" width="90" height="90" rx="10" fill="#1e40af" stroke="#ffffff" strokeWidth="3.5" />
            <rect x="23" y="23" width="54" height="54" rx="4" fill="#ffffff" />
            <polygon points="50,29 28,63 72,63" fill="#1e40af" />
            <polygon points="50,42 38,63 62,63" fill="#ffffff" />
            <line x1="50" y1="29" x2="50" y2="63" stroke="#ffffff" strokeWidth="2.5" />
          </>
        )}
      </svg>
    </div>
  );
}

export function SignMatch({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: SignMatchProps) {
  const [gameState, setGameState] = useState<'selection' | 'playing'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [currentSign, setCurrentSign] = useState<TrafficSignData>({ code: '', name: '', category: 'regulamentação', type: '' });
  const [options, setOptions] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);

  // Multiplayer State
  const [multiplayerMode, setMultiplayerMode] = useState<'1p' | '2p'>('1p');
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [activePlayerTurn, setActivePlayerTurn] = useState<'p1' | 'p2'>('p1');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const [baseTime, setBaseTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isTimeOut, setIsTimeOut] = useState(false);
  
  const totalRounds = 20;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameState === 'playing') {
      generateRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentRound, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (isTimeOut) return;

    if (timeLeft <= 0) {
      setIsTimeOut(true);
      return;
    }

    const timer = setInterval(() => {
      if (!isRevealing) {
        setTimeLeft(t => t - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isRevealing, gameState, isTimeOut]);

  const generateRound = () => {
    // Select signs according to difficulty
    let eligibleSigns = SIGNS;
    if (difficulty === 'easy') {
      // Basic 15 signs of Regulation and Warning only
      eligibleSigns = SIGNS.filter(s => s.category !== 'indicação');
    }

    const sign = eligibleSigns[Math.floor(Math.random() * eligibleSigns.length)];
    setCurrentSign(sign);
    
    const opts = [sign.name];
    
    // Choose wrong options that belong to the same category if difficulty is hard (to confuse), or generic otherwise
    const categoryMates = SIGNS.filter(s => s.name !== sign.name && (difficulty === 'hard' ? s.category === sign.category : true));
    
    while (opts.length < 4) {
      const randomMating = categoryMates[Math.floor(Math.random() * categoryMates.length)];
      if (randomMating && !opts.includes(randomMating.name)) {
        opts.push(randomMating.name);
      } else {
        // Fallback
        const basicRandom = SIGNS[Math.floor(Math.random() * SIGNS.length)];
        if (!opts.includes(basicRandom.name)) {
          opts.push(basicRandom.name);
        }
      }
    }
    
    setOptions(opts.sort(() => Math.random() - 0.5));
    
    // Calculate current timer (starts at initial baseTime, diminishes by 1 second for every 10 rounds, cap at 3s)
    const currentBaseTime = Math.max(3, baseTime - Math.floor((currentRound - 1) / 10));
    setTimeLeft(currentBaseTime);
    setIsRevealing(false);
    setSelectedAnswer(null);
    setIsTimeOut(false);
  };

  const startGame = (mode: 'easy' | 'medium' | 'hard') => {
    setDifficulty(mode);
    const initialTime = mode === 'easy' ? 25 : (mode === 'medium' ? 15 : 10);
    setBaseTime(initialTime);
    setTimeLeft(initialTime);
    setCurrentRound(1);
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setActivePlayerTurn('p1');
    setIsTimeOut(false);
    setGameState('playing');
  };

  const handleAnswer = (choice: string) => {
    if (isRevealing) return;

    setSelectedAnswer(choice);
    setIsRevealing(true);

    const isCorrect = choice === currentSign.name;
    let earnedPoints = 0;

    if (isCorrect) {
      // Dynamic score matching math game speed multiplier
      earnedPoints = 100 + (timeLeft * 20);
      if (multiplayerMode === '2p') {
        if (activePlayerTurn === 'p1') {
          setP1Score(prev => prev + earnedPoints);
        } else {
          setP2Score(prev => prev + earnedPoints);
        }
      } else {
        setScore(s => s + earnedPoints);
      }
      if (onScoreUpdate) onScoreUpdate(earnedPoints);
    }

    // Transit to next round or end game after 1.5s
    timeoutRef.current = setTimeout(() => {
      if (currentRound >= totalRounds) {
        const finalP1 = activePlayerTurn === 'p1' ? p1Score + earnedPoints : p1Score;
        const finalP2 = activePlayerTurn === 'p2' ? p2Score + earnedPoints : p2Score;
        onComplete(
          multiplayerMode === '2p' ? finalP1 : score + earnedPoints,
          1,
          multiplayerMode === '2p',
          selectedPartner,
          finalP1,
          finalP2,
          'SIGN_MATCH'
        );
      } else {
        if (multiplayerMode === '2p') {
          setActivePlayerTurn(prev => prev === 'p1' ? 'p2' : 'p1');
        }
        setCurrentRound(r => r + 1);
      }
    }, 1500);
  };

  if (gameState === 'selection') {
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
          <div className="ml-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Sinais</span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter mt-1 font-mono">Configuração | Trânsito</span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-slate-900 border-2 border-yellow-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-yellow-500/10">
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <polygon points="50,6 94,50 50,94 6,50" fill="#f59e0b" stroke="#000000" strokeWidth="4" />
              <text x="50" y="58" fill="#000000" fontSize="24" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">?</text>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Patrulha de Placas</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Identifique a Sinalização Oficial</p>
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
                      {level === 'easy' ? 'Regulamentação e Advertência | 25s por placa' : level === 'medium' ? 'Sinais Completos + Indicação | 15s por placa' : 'Foco em Detalhes Absolutos | 10s por placa'}
                    </span>
                  </div>
                  {difficulty === level && (
                    <motion.div 
                      layoutId="active-diff-signs"
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
            onClick={() => startGame(difficulty)} 
            className="w-full h-14 bg-yellow-400 text-slate-900 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {multiplayerMode === '2p' && !selectedPartner ? 'SELECIONE O JOGADOR 2 👥' : 'INICIAR MONITORAMENTO 🚦'}
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

  // --- PLAYING STATE ---
  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center select-none">
      {/* Top Bar with Back Selection */}
      <div className="w-full flex items-center mb-6">
        <button 
          onClick={() => setGameState('selection')}
          className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Sinais</span>
          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-tighter mt-1 font-mono">
            DIFICULDADE: {difficulty === 'easy' ? 'FÁCIL' : difficulty === 'medium' ? 'MÉDIO' : 'DIFÍCIL'} | Rodada {currentRound}/{totalRounds}
          </span>
        </div>
      </div>

      {multiplayerMode === '2p' && selectedPartner && (
        <div className="w-full max-w-sm mb-4">
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

      <div className="w-full flex justify-between items-center mb-4">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Placar Atual</p>
          <p className="text-2xl font-black text-yellow-400 mt-1">{multiplayerMode === '2p' ? p1Score + p2Score : score} pts</p>
        </div>
        
        {/* Circular Timer progress match calculation game logic */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-full h-full rotate-270">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1e293b" strokeWidth="4" />
            <motion.circle 
              cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray="138"
              initial={{ strokeDashoffset: 138 }}
              animate={{ 
                strokeDashoffset: 138 - (timeLeft / Math.max(3, baseTime - Math.floor((currentRound - 1) / 10))) * 138 
              }}
              className="text-yellow-400"
            />
          </svg>
          <span className="absolute text-sm font-black text-white font-mono">{timeLeft}s</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full max-w-sm">
        {/* Animated sign wrapper */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSign.code}
            initial={{ scale: 0.82, rotateY: 90, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0.82, rotateY: -90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="relative"
          >
            <TrafficSignSvg type={currentSign.type} />
            <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-400 font-mono">
              {currentSign.category}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
          {isRevealing ? 'Aguardando próxima placa...' : 'Qual é o nome correto desta sinalização?'}
        </p>

        {/* Options grid with reveal feedback states */}
        <div className="grid grid-cols-1 gap-3.5 w-full">
          {options.map((opt, i) => {
            const isCorrect = opt === currentSign.name;
            const isSelected = opt === selectedAnswer;
            
            let btnStyle = "h-14 bg-slate-900 border-2 border-slate-800 rounded-2xl text-xs font-semibold text-slate-300 uppercase tracking-widest text-left px-5 relative overflow-hidden group transition-all";
            
            if (isRevealing) {
              if (isCorrect) {
                btnStyle = "h-14 bg-emerald-600/10 border-2 border-emerald-500 rounded-2xl text-xs font-black text-emerald-300 uppercase tracking-widest text-left px-5 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.15)]";
              } else if (isSelected) {
                btnStyle = "h-14 bg-rose-600/10 border-2 border-rose-500 rounded-2xl text-xs font-black text-rose-400 uppercase tracking-widest text-left px-5 relative overflow-hidden";
              } else {
                btnStyle = "h-14 bg-slate-950 border-2 border-slate-900 rounded-2xl text-xs font-semibold text-slate-700 uppercase tracking-widest text-left px-5 relative overflow-hidden opacity-40";
              }
            } else {
              btnStyle += " hover:border-yellow-400 hover:text-white hover:bg-slate-800/50 active:scale-[0.99]";
            }

            return (
              <motion.button
                key={`${currentSign.code}-${i}`}
                whileHover={!isRevealing ? { scale: 1.01, x: 3 } : {}}
                whileTap={!isRevealing ? { scale: 0.99 } : {}}
                onClick={() => handleAnswer(opt)}
                disabled={isRevealing}
                className={btnStyle}
              >
                <div className="flex items-center justify-between relative z-10">
                  <span>{opt}</span>
                  {isRevealing && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                {!isRevealing && (
                  <div className="absolute inset-0 bg-yellow-400/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

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
              <span className="absolute -top-1 -right-1 text-xl">⚠️</span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">FIM DO TEMPO</span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Tempo Esgotado!</h3>
              <p className="text-slate-400 text-xs leading-relaxed italic">
                O cronômetro encerrou antes de você responder esta placa. Ganhe os pontos que já conquistou! Descubra abaixo:
              </p>
            </div>

            {/* Score box */}
            <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Pontuação Conquistada</span>
              <span className="text-3xl font-black text-yellow-400 font-mono block">{multiplayerMode === '2p' ? p1Score + p2Score : score} XP</span>
            </div>

            <div className="w-full flex flex-col gap-3">
              <Button 
                onClick={() => onComplete(
                  multiplayerMode === '2p' ? p1Score : score,
                  1,
                  multiplayerMode === '2p',
                  selectedPartner,
                  p1Score,
                  p2Score,
                  'SIGN_MATCH',
                  isTimeOut
                )} 
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={() => startGame(difficulty)} 
                variant="outline" 
                className="w-full h-14 border-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-800 text-xs rounded-2xl uppercase tracking-wider active:scale-95 transition-all"
              >
                TENTAR NOVAMENTE 🔁
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="w-full flex justify-center mt-6">
        <Button 
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setGameState('selection');
          }}
          className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
        >
          ABANDONAR PATRULHA
        </Button>
      </div>
    </div>
  );
}
