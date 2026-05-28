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
    isTimeout?: boolean,
    keepInGameSelection?: boolean
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
  { code: 'R-5a', name: 'Proibido Retorno à Esquerda', category: 'regulamentação', type: 'proibido_retorno_esquerda' },
  { code: 'R-5b', name: 'Proibido Retorno à Direita', category: 'regulamentação', type: 'proibido_retorno_direita' },
  { code: 'R-6a', name: 'Proibido Estacionar', category: 'regulamentação', type: 'proibido_estacionar' },
  { code: 'R-6b', name: 'Estacionamento Regulamentado', category: 'regulamentação', type: 'estacionamento_reg' },
  { code: 'R-6c', name: 'Proibido Parar e Estacionar', category: 'regulamentação', type: 'proibido_parar_estacionar' },
  { code: 'R-7', name: 'Proibido Ultrapassar', category: 'regulamentação', type: 'proibido_ultrapassar' },
  { code: 'R-8a', name: 'Proibido Mudar de Faixa da Esquerda para Direita', category: 'regulamentação', type: 'proibido_mudar_faixa_esq_dir' },
  { code: 'R-8b', name: 'Proibido Mudar de Faixa da Direita para Esquerda', category: 'regulamentação', type: 'proibido_mudar_faixa_dir_esq' },
  { code: 'R-9', name: 'Proibido Trânsito de Caminhões', category: 'regulamentação', type: 'proibido_caminhoes' },
  { code: 'R-10', name: 'Proibido Trânsito de Veículos Automotores', category: 'regulamentação', type: 'proibido_automotores' },
  { code: 'R-11', name: 'Proibido Trânsito de Veículos de Tração Animal', category: 'regulamentação', type: 'proibido_tracao_animal' },
  { code: 'R-12', name: 'Proibido Trânsito de Bicicletas', category: 'regulamentação', type: 'proibido_bicicletas' },
  { code: 'R-13', name: 'Proibido Trânsito de Tratores e Máquinas Agrícolas', category: 'regulamentação', type: 'proibido_tratores' },
  { code: 'R-14', name: 'Peso Máximo Permitido por Eixo (2 t)', category: 'regulamentação', type: 'peso_max_eixo_2t' },
  { code: 'R-15', name: 'Altura Máxima Permitida (4,3 m)', category: 'regulamentação', type: 'altura_max_43m' },
  { code: 'R-16', name: 'Largura Máxima Permitida (2,5 m)', category: 'regulamentação', type: 'largura_max_25m' },
  { code: 'R-17', name: 'Peso Máximo Total Permitido (10 t)', category: 'regulamentação', type: 'peso_max_total_10t' },
  { code: 'R-18', name: 'Comprimento Máximo Permitido (10 m)', category: 'regulamentação', type: 'comprimento_max_10m' },
  { code: 'R-19_30', name: 'Velocidade Máxima (30 km/h)', category: 'regulamentação', type: 'speed_30' },
  { code: 'R-19_60', name: 'Velocidade Máxima (60 km/h)', category: 'regulamentação', type: 'speed_60' },
  { code: 'R-19_80', name: 'Velocidade Máxima (80 km/h)', category: 'regulamentação', type: 'speed_80' },
  { code: 'R-19_110', name: 'Velocidade Máxima (110 km/h)', category: 'regulamentação', type: 'speed_110' },
  { code: 'R-20', name: 'Proibido Buzina ou Sinal Sonoro', category: 'regulamentação', type: 'proibido_buzina' },
  { code: 'R-21', name: 'Alfândega', category: 'regulamentação', type: 'alfandega' },
  { code: 'R-22', name: 'Uso Obrigatório de Corrente', category: 'regulamentação', type: 'uso_correntes' },
  { code: 'R-23', name: 'Conserve-se à Direita', category: 'regulamentação', type: 'conserve_direita' },
  { code: 'R-24a', name: 'Sentido de Circulação da Via', category: 'regulamentação', type: 'sentido_circular' },
  { code: 'R-24b', name: 'Passagem Obrigatória', category: 'regulamentação', type: 'passagem_obrigatoria' },
  { code: 'R-25a', name: 'Vire à Esquerda', category: 'regulamentação', type: 'vire_esquerda' },
  { code: 'R-25b', name: 'Vire à Direita', category: 'regulamentação', type: 'vire_direita' },
  { code: 'R-25c', name: 'Siga em Frente ou à Esquerda', category: 'regulamentação', type: 'siga_frente_esquerda' },
  { code: 'R-25d', name: 'Siga em Frente ou à Direita', category: 'regulamentação', type: 'siga_frente_direita' },
  { code: 'R-26', name: 'Siga em Frente', category: 'regulamentação', type: 'siga_frente' },
  { code: 'R-27', name: 'Ônibus, Caminhões e Veículos de Grande Porte, Conservem-se à Direita', category: 'regulamentação', type: 'veiculos_grandes_direita' },
  { code: 'R-28', name: 'Duplo Sentido de Circulação', category: 'regulamentação', type: 'duplo_sentido' },
  { code: 'R-29', name: 'Proibido Trânsito de Pedestres', category: 'regulamentação', type: 'proibido_pedestres' },
  { code: 'R-30', name: 'Pedestre, Ande pela Direita', category: 'regulamentação', type: 'pedestre_direita' },
  { code: 'R-31', name: 'Pedestre, Ande pela Esquerda', category: 'regulamentação', type: 'pedestre_esquerda' },
  { code: 'R-32', name: 'Proibido Trânsito de Motocicletas, Motonetas e Ciclomotores', category: 'regulamentação', type: 'proibido_motos' },
  { code: 'R-33', name: 'Sentido Circular na Rotatória', category: 'regulamentação', type: 'rotatoria_regulamento' },
  { code: 'R-34', name: 'Circulação Exclusiva de Bicicletas', category: 'regulamentação', type: 'exclusivo_bicicleta' },
  { code: 'R-35a', name: 'Ciclista, Transite à Esquerda', category: 'regulamentação', type: 'ciclista_esquerda' },
  { code: 'R-35b', name: 'Ciclista, Transite à Direita', category: 'regulamentação', type: 'ciclista_direita' },
  { code: 'R-36a', name: 'Ciclistas à Esquerda, Pedestres à Direita', category: 'regulamentação', type: 'ciclista_pedestre' },
  { code: 'R-36b', name: 'Pedestres à Esquerda, Ciclistas à Direita', category: 'regulamentação', type: 'pedestre_ciclista' },
  { code: 'R-37', name: 'Proibido Trânsito de Motocicletas', category: 'regulamentação', type: 'proibido_motocicletas' },
  { code: 'R-38', name: 'Proibido Trânsito de Ônibus', category: 'regulamentação', type: 'proibido_onibus' },
  { code: 'R-39', name: 'Circulação Exclusiva de Caminhões', category: 'regulamentação', type: 'exclusivo_caminhoes' },
  { code: 'R-40', name: 'Trânsito Proibido de Carros de Mão', category: 'regulamentação', type: 'proibido_carros_mao' },

  // --- ADVERTÊNCIA ---
  { code: 'A-1a', name: 'Curva Acentuada à Esquerda', category: 'advertência', type: 'curva_acentuada_esquerda' },
  { code: 'A-1b', name: 'Curva Acentuada à Direita', category: 'advertência', type: 'curva_acentuada_direita' },
  { code: 'A-2a', name: 'Curva à Esquerda', category: 'advertência', type: 'curva_esquerda_adv' },
  { code: 'A-2b', name: 'Curva à Direita', category: 'advertência', type: 'curva_direita_adv' },
  { code: 'A-3a', name: 'Pista Sinuosa à Esquerda', category: 'advertência', type: 'pista_sinuosa_esquerda' },
  { code: 'A-3b', name: 'Pista Sinuosa à Direita', category: 'advertência', type: 'pista_sinuosa_direita' },
  { code: 'A-4a', name: 'Curva Acentuada em "S" à Esquerda', category: 'advertência', type: 'curva_s_acentuada_esquerda' },
  { code: 'A-4b', name: 'Curva Acentuada em "S" à Direita', category: 'advertência', type: 'curva_s_acentuada_direita' },
  { code: 'A-5a', name: 'Curva em "S" à Esquerda', category: 'advertência', type: 'curva_s_esquerda' },
  { code: 'A-5b', name: 'Curva em "S" à Direita', category: 'advertência', type: 'curva_s_direita' },
  { code: 'A-6', name: 'Cruzamento de Vias', category: 'advertência', type: 'cruzamento_vias' },
  { code: 'A-7a', name: 'Via Lateral à Esquerda', category: 'advertência', type: 'via_lateral_esquerda' },
  { code: 'A-7b', name: 'Via Lateral à Direita', category: 'advertência', type: 'via_lateral_direita' },
  { code: 'A-8', name: 'Interseção em "T"', category: 'advertência', type: 'intersecao_t' },
  { code: 'A-9', name: 'Bifurcação em "Y"', category: 'advertência', type: 'bifurcacao_y' },
  { code: 'A-10a', name: 'Entroncamento Oblíquo à Esquerda', category: 'advertência', type: 'entroncamento_esquerda' },
  { code: 'A-10b', name: 'Entroncamento Oblíquo à Direita', category: 'advertência', type: 'entroncamento_direita' },
  { code: 'A-11a', name: 'Interseção em Círculo (Rotatória)', category: 'advertência', type: 'rotatoria_adv' },
  { code: 'A-12', name: 'Interseção em Círculo', category: 'advertência', type: 'intersecao_circulo' },
  { code: 'A-13a', name: 'Confluência à Esquerda', category: 'advertência', type: 'confluencia_esquerda' },
  { code: 'A-13b', name: 'Confluência à Direita', category: 'advertência', type: 'confluencia_direita' },
  { code: 'A-14', name: 'Semáforo à Frente', category: 'advertência', type: 'semaforo_adv' },
  { code: 'A-15', name: 'Parada Obrigatória à Frente', category: 'advertência', type: 'pare_frente_adv' },
  { code: 'A-16', name: 'Bonde', category: 'advertência', type: 'bonde_adv' },
  { code: 'A-17', name: 'Pista Irregular', category: 'advertência', type: 'pista_irregular_adv' },
  { code: 'A-18', name: 'Saliência ou Lombada', category: 'advertência', type: 'lombada_adv' },
  { code: 'A-19', name: 'Depressão', category: 'advertência', type: 'depressao_adv' },
  { code: 'A-20a', name: 'Declive Acentuado', category: 'advertência', type: 'declive_acentuado' },
  { code: 'A-20b', name: 'Aclive Acentuado', category: 'advertência', type: 'aclive_acentuado' },
  { code: 'A-21a', name: 'Estreitamento de Pista ao Centro', category: 'advertência', type: 'estreitamento_centro_adv' },
  { code: 'A-21b', name: 'Estreitamento de Pista à Esquerda', category: 'advertência', type: 'estreitamento_esquerda_adv' },
  { code: 'A-21c', name: 'Estreitamento de Pista à Direita', category: 'advertência', type: 'estreitamento_direita_adv' },
  { code: 'A-22', name: 'Alargamento de Pista', category: 'advertência', type: 'alargamento_pista_adv' },
  { code: 'A-23', name: 'Ponte Estreita', category: 'advertência', type: 'ponte_estreita_adv' },
  { code: 'A-24', name: 'Início de Pista Dupla', category: 'advertência', type: 'inicio_pista_dupla_adv' },
  { code: 'A-25', name: 'Mão Dupla Adiante', category: 'advertência', type: 'mao_dupla_adv' },
  { code: 'A-26a', name: 'Sentido Único', category: 'advertência', type: 'sentido_unico_adv' },
  { code: 'A-26b', name: 'Sentido Duplo', category: 'advertência', type: 'sentido_duplo_adv' },
  { code: 'A-27', name: 'Área com Desmoronamento', category: 'advertência', type: 'desmoronamento_adv' },
  { code: 'A-28', name: 'Pista Escorregadia', category: 'advertência', type: 'pista_escorregadia_adv' },
  { code: 'A-29', name: 'Projeção de Cascalho', category: 'advertência', type: 'projecao_cascalho_adv' },
  { code: 'A-30a', name: 'Trânsito de Ciclistas', category: 'advertência', type: 'ciclistas_adv' },
  { code: 'A-30b', name: 'Passagem Sinalizada de Ciclistas', category: 'advertência', type: 'passagem_ciclistas_adv' },
  { code: 'A-30c', name: 'Trânsito Compartilhado de Ciclistas e Pedestres', category: 'advertência', type: 'ciclistas_pedestres_adv' },
  { code: 'A-31', name: 'Trânsito de Tratores ou Máquinas Agrícolas', category: 'advertência', type: 'tratores_adv' },
  { code: 'A-32a', name: 'Trânsito de Pedestres', category: 'advertência', type: 'pedestres_adv' },
  { code: 'A-32b', name: 'Passagem Sinalizada de Pedestres', category: 'advertência', type: 'passagem_pedestres_adv' },
  { code: 'A-33a', name: 'Área Escolar', category: 'advertência', type: 'area_escolar_adv' },
  { code: 'A-33b', name: 'Passagem Sinalizada de Escolares', category: 'advertência', type: 'passagem_escolares_adv' },
  { code: 'A-34', name: 'Área de Recreação Infantil', category: 'advertência', type: 'recreacao_infantil_adv' },
  { code: 'A-35', name: 'Animais', category: 'advertência', type: 'animais_adv' },
  { code: 'A-36', name: 'Animais Selvagens', category: 'advertência', type: 'animais_selvagens_adv' },
  { code: 'A-37', name: 'Altura Limitada', category: 'advertência', type: 'altura_limitada_adv' },
  { code: 'A-38', name: 'Largura Limitada', category: 'advertência', type: 'largura_limitada_adv' },
  { code: 'A-39', name: 'Passagem de Nível sem Barreira', category: 'advertência', type: 'passagem_nivel_sem_adv' },
  { code: 'A-40', name: 'Passagem de Nível com Barreira', category: 'advertência', type: 'passagem_nivel_com_adv' },
  { code: 'A-41', name: 'Cruz de Santo André', category: 'advertência', type: 'cruz_santo_andre_adv' },
  { code: 'A-42a', name: 'Início de Pista Dupla', category: 'advertência', type: 'pista_dupla_adv' },
  { code: 'A-42b', name: 'Fim de Pista Dupla', category: 'advertência', type: 'fim_pista_dupla_adv' },
  { code: 'A-42c', name: 'Pista Dividida', category: 'advertência', type: 'pista_dividida_adv' },
  { code: 'A-43', name: 'Aeroporto', category: 'advertência', type: 'aeroporto_adv' },
  { code: 'A-44', name: 'Vento Lateral', category: 'advertência', type: 'vento_lateral_adv' },
  { code: 'A-45', name: 'Rua Sem Saída', category: 'advertência', type: 'rua_sem_saida_adv' },

  // --- INDICAÇÃO & SERVIÇOS ---
  { code: 'I-1', name: 'Pronto-Socorro', category: 'indicação', type: 'pronto_socorro' },
  { code: 'I-2', name: 'Serviço Sanitário (WC)', category: 'indicação', type: 'wc' },
  { code: 'I-3', name: 'Restaurante', category: 'indicação', type: 'restaurante' },
  { code: 'I-4', name: 'Abastecimento Completo', category: 'indicação', type: 'combustivel' },
  { code: 'I-5', name: 'Serviço Mecânico', category: 'indicação', type: 'mecanico' },
  { code: 'I-6', name: 'Borracharia', category: 'indicação', type: 'borracharia' },
  { code: 'I-7', name: 'Hotel', category: 'indicação', type: 'hotel' },
  { code: 'I-8', name: 'Área de Estacionamento', category: 'indicação', type: 'estacionamento' },
  { code: 'I-9', name: 'Serviço de Reboque', category: 'indicação', type: 'reboque_ind' },
  { code: 'I-10', name: 'Transporte Coletivo', category: 'indicação', type: 'transporte_coletivo_ind' },
  { code: 'I-11', name: 'Aeroporto', category: 'indicação', type: 'aeroporto_servico' },
  { code: 'I-12', name: 'Telefonia Pública', category: 'indicação', type: 'telefone_ind' },
  { code: 'I-13', name: 'Terminal Rodoviário', category: 'indicação', type: 'rodoviaria_ind' },
  { code: 'I-14', name: 'Terminal Ferroviário', category: 'indicação', type: 'ferroviaria_ind' },
  { code: 'I-15', name: 'Ponto de Parada', category: 'indicação', type: 'ponto_onibus_ind' },
  { code: 'I-16', name: 'Pedágio', category: 'indicação', type: 'pedagio' },
  { code: 'I-17', name: 'Informação Turística', category: 'indicação', type: 'informacao_tur' },
  { code: 'I-18', name: 'Teatro', category: 'indicação', type: 'teatro_ind' },
  { code: 'I-19', name: 'Caravanismo', category: 'indicação', type: 'caravanas_ind' },
  { code: 'I-20', name: 'Área de Campismo', category: 'indicação', type: 'campismo' },
  { code: 'I-21', name: 'Farol', category: 'indicação', type: 'farol_ind' },
  { code: 'I-22', name: 'Atração Turística', category: 'indicação', type: 'atracao_ind' },
  { code: 'I-23', name: 'Monumento Classificado', category: 'indicação', type: 'monumento_ind' },
  { code: 'I-24', name: 'Museu', category: 'indicação', type: 'museu_ind' },

  // --- ATRATIVOS TURÍSTICOS ---
  { code: 'T-1', name: 'Cachoeira', category: 'indicação', type: 'cachoeira_tur' },
  { code: 'T-2', name: 'Praia', category: 'indicação', type: 'praia_tur' },
  { code: 'T-3', name: 'Monumento Histórico', category: 'indicação', type: 'monumento_tur' },
  { code: 'T-4', name: 'Museu', category: 'indicação', type: 'museu_tur' },
  { code: 'T-5', name: 'Parque Nacional', category: 'indicação', type: 'parque_tur' },
  { code: 'T-6', name: 'Feira de Artesanato', category: 'indicação', type: 'artesanato_tur' },
  { code: 'T-7', name: 'Arquitetura Militar', category: 'indicação', type: 'militar_tur' },
  { code: 'T-8', name: 'Ruínas Arqueológicas', category: 'indicação', type: 'ruinas_tur' },
  { code: 'T-9', name: 'Patrimônio Cultural', category: 'indicação', type: 'patrimonio_tur' },
  { code: 'T-10', name: 'Mirante', category: 'indicação', type: 'mirante_tur' },
  { code: 'T-11', name: 'Pesca Esportiva', category: 'indicação', type: 'pesca_tur' },
  { code: 'T-12', name: 'Montanhismo', category: 'indicação', type: 'montanhismo_tur' },
  { code: 'T-13', name: 'Trilha Ecológica', category: 'indicação', type: 'trilha_tur' },
  { code: 'T-14', name: 'Voo Livre', category: 'indicação', type: 'voo_livre_tur' },
  { code: 'T-15', name: 'Marina / Iate Clube', category: 'indicação', type: 'marina_tur' },
  { code: 'T-16', name: 'Estância Hidromineral', category: 'indicação', type: 'estancia_tur' }
];

function renderSymbol(type: string, color: string) {
  // Simple check for numeric patterns
  if (type.startsWith('speed_')) {
    const value = type.split('_')[1];
    return <text x="50" y="59" fill={color} fontSize="31" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">{value}</text>;
  }

  if (type.startsWith('height_')) {
    const val = type.split('_')[1].replace('m', ' m');
    return (
      <g>
        <path d="M50,28 L50,15 M43,23 L50,14 L57,23" stroke={color} strokeWidth="3.5" fill="none" />
        <path d="M50,72 L50,85 M43,77 L50,86 L57,77" stroke={color} strokeWidth="3.5" fill="none" />
        <text x="50" y="55" fill={color} fontSize="17.5" fontWeight="950" textAnchor="middle">{val}</text>
      </g>
    );
  }

  if (type.startsWith('width_')) {
    const val = type.split('_')[1].replace('m', ' m');
    return (
      <g>
        <path d="M15,50 L30,50 M22,43 L14,50 L22,57" stroke={color} strokeWidth="3.5" fill="none" />
        <path d="M85,50 L70,50 M78,43 L86,50 L78,57" stroke={color} strokeWidth="3.5" fill="none" />
        <text x="50" y="56" fill={color} fontSize="17.5" fontWeight="950" textAnchor="middle">{val}</text>
      </g>
    );
  }

  switch (type) {
    case 'sentido_proibido':
    case 'siga_frente':
      return (
        <path d="M50,76 L50,23 M40,35 L50,18 L60,35" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'proibido_esquerda':
    case 'vire_esquerda':
      return (
        <path d="M58,70 L58,44 Q58,32 44,32 L22,32 M32,20 L20,32 L32,44" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'proibido_direita':
    case 'vire_direita':
      return (
        <path d="M42,70 L42,44 Q42,32 56,32 L78,32 M68,20 L80,32 L68,44" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'proibido_retorno_esquerda':
      return (
        <path d="M58,68 L58,44 A13,13 0 0,0 32,44 L32,56 M24,46 L32,57 L40,46" stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'proibido_retorno_direita':
      return (
        <path d="M42,68 L42,44 A13,13 0 0,1 68,44 L68,56 M60,46 L68,57 L76,46" stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'siga_frente_esquerda':
      return (
        <g>
          <path d="M50,75 L50,22 M40,34 L50,18 L60,34" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M50,48 L34,48 M42,38 L30,48 L42,58" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'siga_frente_direita':
      return (
        <g>
          <path d="M50,75 L50,22 M40,34 L50,18 L60,34" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M50,48 L66,48 M58,38 L70,48 L58,58" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'passagem_obrigatoria':
      return (
        <path d="M28,28 L66,66 M50,65 L67,67 L65,50" stroke={color} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'sentido_circular':
    case 'rotatoria_regulamento':
    case 'rotatoria_adv':
      return (
        <g transform="translate(50,50) scale(0.95) translate(-50,-50)">
          <path d="M50,22 A28,28 0 0,1 74,64" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M74,64 A28,28 0 0,1 26,64" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M26,64 A28,28 0 0,1 50,22" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <polygon points="50,22 42,12 56,10" fill={color} />
          <polygon points="74,64 84,56 72,47" fill={color} />
          <polygon points="26,64 16,56 28,47" fill={color} />
        </g>
      );
    case 'duplo_sentido':
    case 'sentido_duplo_adv':
    case 'mao_dupla_adv':
      return (
        <g>
          <path d="M34,74 L34,26 M25,38 L34,22 L43,38" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M66,26 L66,74 M57,62 L66,78 L75,62" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'conserve_direita':
    case 'veiculos_grandes_direita':
      return (
        <g>
          <path d="M24,54 L24,46 L34,46 L39,50 L39,54 Z M24,54 L16,54 L16,42 L24,42 Z" stroke={color} strokeWidth="2.5" fill="none" />
          <circle cx="20" cy="56" r="2.5" fill={color} />
          <circle cx="34" cy="56" r="2.5" fill={color} />
          <path d="M46,50 L76,50 M66,40 L78,50 L66,60" stroke={color} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'curva_esquerda_adv':
      return (
        <path d="M58,70 L58,46 Q58,32 42,32 L25,32 M35,20 L22,32 L35,44" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'curva_direita_adv':
      return (
        <path d="M42,70 L42,46 Q42,32 58,32 L75,32 M65,20 L78,32 L65,44" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'curva_acentuada_esquerda':
      return (
        <path d="M60,68 L60,38 L25,38 M35,26 L22,38 L35,50" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'curva_acentuada_direita':
      return (
        <path d="M40,68 L40,38 L75,38 M65,26 L78,38 L65,50" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'pista_sinuosa_esquerda':
      return (
        <g>
          <path d="M50,72 L50,60 Q50,54 44,51 Q38,48 38,42 Q38,36 44,33 L44,25" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M37,32 L44,22 L51,32" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'pista_sinuosa_direita':
      return (
        <g>
          <path d="M50,72 L50,60 Q50,54 56,51 Q62,48 62,42 Q62,36 56,33 L56,25" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M49,32 L56,22 L63,32" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'cruzamento_vias':
      return (
        <path d="M50,15 L50,85 M15,50 L85,50" stroke={color} strokeWidth="12" strokeLinecap="square" />
      );
    case 'via_lateral_esquerda':
      return (
        <path d="M52,15 L52,85 M20,50 L52,50" stroke={color} strokeWidth="11" strokeLinecap="square" />
      );
    case 'via_lateral_direita':
      return (
        <path d="M48,15 L48,85 M48,50 L80,50" stroke={color} strokeWidth="11" strokeLinecap="square" />
      );
    case 'intersecao_t':
      return (
        <path d="M15,32 L85,32 M50,32 L50,85" stroke={color} strokeWidth="11" strokeLinecap="square" />
      );
    case 'bifurcacao_y':
      return (
        <path d="M50,85 L50,55 L20,25 M50,55 L80,25" stroke={color} strokeWidth="11" strokeLinecap="square" />
      );
    case 'semaforo_adv':
      return (
        <g>
          <rect x="42" y="24" width="16" height="42" rx="4" fill="#1e293b" stroke="#000000" strokeWidth="2.5" />
          <circle cx="50" cy="31" r="4.5" fill="#dc2626" />
          <circle cx="50" cy="45" r="4.5" fill="#f59e0b" />
          <circle cx="50" cy="59" r="4.5" fill="#10b981" />
        </g>
      );
    case 'pare_frente_adv':
      return (
        <g>
          <polygon points="38,22 62,22 74,34 74,47 62,59 38,59 26,47 26,34" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
          <text x="50" y="44" fill="#ffffff" fontSize="9" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">PARE</text>
          <path d="M50,78 L50,66 M45,71 L50,65 L55,71" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'lombada':
    case 'lombada_adv':
      return (
        <path d="M16,60 L36,60 Q50,38 64,60 L84,60" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
      );
    case 'depressao_adv':
      return (
        <path d="M16,45 L36,45 Q50,68 64,45 L84,45" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
      );
    case 'estreitamento_centro_adv':
      return (
        <path d="M30,75 L30,52 Q30,42 42,42 L42,25 M70,75 L70,52 Q70,42 58,42 L58,25" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
      );
    case 'pista_escorregadia_adv':
      return (
        <g>
          <rect x="38" y="30" width="24" height="12" rx="3" fill={color} />
          <path d="M38,48 Q44,40 50,48 Q56,56 62,48" stroke={color} strokeWidth="3" fill="none" />
          <path d="M28,62 Q38,52 48,62 Q58,72 68,62" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'proibido_estacionar':
    case 'proibido_parar_estacionar':
    case 'estacionamento_reg':
    case 'estacionamento':
      return (
        <text x="50.5" y="67" fill={color} fontSize="52" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">E</text>
      );
    case 'proibido_buzina':
      return (
        <g transform="translate(50,50) scale(0.95) translate(-48,-48)">
          <path d="M25,48 L38,48 L56,33 L56,63 Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M66,40 Q74,48 66,56" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'proibido_caminhoes':
    case 'exclusivo_caminhoes':
      return (
        <g transform="translate(10, 10) scale(0.8)">
          <path d="M20,54 L20,46 L36,46 L42,50 L42,54 Z M20,54 L12,54 L12,38 L20,38 Z" stroke={color} strokeWidth="3.5" fill="none" />
          <circle cx="17" cy="56" r="3.5" fill={color} />
          <circle cx="36" cy="56" r="3.5" fill={color} />
        </g>
      );
    case 'proibido_automotores':
      return (
        <g transform="translate(0, 5)">
          <rect x="36" y="38" width="28" height="14" rx="4" fill="none" stroke={color} strokeWidth="4" />
          <rect x="40" y="28" width="20" height="11" rx="2.5" fill="none" stroke={color} strokeWidth="3" />
          <circle cx="42" cy="45" r="2" fill={color} />
          <circle cx="58" cy="45" r="2" fill={color} />
          <circle cx="43" cy="54" r="3.5" fill={color} />
          <circle cx="57" cy="54" r="3.5" fill={color} />
        </g>
      );
    case 'proibido_bicicletas':
    case 'exclusivo_bicicleta':
    case 'ciclistas_adv':
    case 'ciclista_esquerda':
    case 'ciclista_direita':
      return (
        <g transform="translate(0, 5)">
          <circle cx="34" cy="50" r="10" fill="none" stroke={color} strokeWidth="3.5" />
          <circle cx="66" cy="50" r="10" fill="none" stroke={color} strokeWidth="3.5" />
          <path d="M34,50 L50,50 L56,34 L40,34 M50,50 L44,34 M56,34 L66,50" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'pedestre_esquerda':
    case 'pedestres_adv':
    case 'passagem_pedestres_adv':
      return (
        <g transform="translate(0, 3)">
          <circle cx="50" cy="27" r="4.5" fill={color} />
          <line x1="50" y1="32.5" x2="50" y2="52" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <path d="M50,52 L42,70 M50,52 L58,70 M40,38 L50,41 L60,37" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'area_escolar_adv':
    case 'passagem_escolares_adv':
      return (
        <g transform="translate(5, 5)">
          <circle cx="38" cy="27" r="4.5" fill={color} />
          <line x1="38" y1="32.5" x2="38" y2="52" stroke={color} strokeWidth="5.5" />
          <path d="M38,52 L30,68 M38,52 L44,68" stroke={color} strokeWidth="4.5" fill="none" />
          <circle cx="56" cy="38" r="3.5" fill={color} />
          <line x1="56" y1="42" x2="56" y2="56" stroke={color} strokeWidth="4.5" />
          <path d="M56,56 L51,68 M56,56 L61,68 M38,36 L48,46 L56,44" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'recreacao_infantil_adv':
      return (
        <g transform="translate(0, 3)">
          <circle cx="44" cy="28" r="4" fill={color} />
          <path d="M44,32 L44,48 L36,65 M44,48 L52,65 M34,38 L44,42 L54,36" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" strokeLinejoin="round" />
          <circle cx="68" cy="46" r="5" fill={color} />
        </g>
      );
    case 'animais_selvagens_adv':
      return (
        <g transform="translate(-2, 3)">
          <path d="M26,50 Q32,36 46,36 Q56,36 61,42 L76,38 L71,48 L76,55 L65,55 L58,62 M30,50 L18,54 M46,55 L40,69 M56,55 L61,69" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      );
    case 'aeroporto_adv':
      return (
        <g transform="translate(50,50) rotate(-45) translate(-50,-50)">
          <path d="M50,15 L50,85 M20,50 L80,50 M35,72 L65,72 M47,15 L53,15" stroke={color} strokeWidth="8.5" strokeLinecap="round" />
        </g>
      );

    // --- INDICAÇÕES & SERVIÇOS ---
    case 'pronto_socorro':
      return (
        <path d="M50,22 L50,78 M22,50 L78,50" stroke="#dc2626" strokeWidth="15" strokeLinecap="square" />
      );
    case 'wc':
      return (
        <text x="50" y="58" fill={color} fontSize="21" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">WC</text>
      );
    case 'restaurante':
      return (
        <g transform="translate(10, 5)">
          <path d="M28,26 L28,42 M23,26 L23,36 A5,5 0 0,0 33,36 M33,26 L33,36 M28,42 L28,68" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M58,26 L58,42 M58,42 L58,68 M50,26 L50,42 A5,5 0 0,0 55,47 L55,68" stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'combustivel':
      return (
        <g transform="translate(5, 0)">
          <rect x="28" y="34" width="26" height="36" rx="3" fill="none" stroke={color} strokeWidth="5.5" />
          <rect x="33" y="39" width="16" height="12" fill={color} />
          <path d="M54,42 Q66,42 61,64 L56,68" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'mecanico':
      return (
        <path d="M25,75 L65,35 A10,10 0 1,1 78,48 L38,88 Z" fill="none" stroke={color} strokeWidth="5.5" />
      );
    case 'borracharia':
      return (
        <circle cx="50" cy="50" r="22" fill="none" stroke={color} strokeWidth="10" />
      );
    case 'hotel':
      return (
        <g>
          <path d="M15,62 L85,62 M15,42 L15,70 M85,50 L85,70 M25,62 L25,50 L55,50 L55,62 Z" stroke={color} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <circle cx="35" cy="42" r="5" fill={color} />
        </g>
      );
    case 'telefone_ind':
      return (
        <path d="M30,30 Q40,15 50,30 M50,30 L45,45 Q50,55 58,58 L68,54" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
      );
    case 'pedagio':
      return (
        <g>
          <circle cx="50" cy="50" r="18" fill="none" stroke={color} strokeWidth="4.5" />
          <text x="50" y="56" fill={color} fontSize="17.5" fontWeight="950" textAnchor="middle" fontFamily="sans-serif">$</text>
        </g>
      );
    case 'informacao_tur':
      return (
        <g transform="translate(50,50) scale(1.1) translate(-50,-50)">
          <circle cx="50" cy="30" r="4" fill={color} />
          <line x1="50" y1="39" x2="50" y2="68" stroke={color} strokeWidth="7" strokeLinecap="round" />
          <line x1="44" y1="39" x2="50" y2="39" stroke={color} strokeWidth="7" strokeLinecap="round" />
          <line x1="43" y1="68" x2="57" y2="68" stroke={color} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'teatro_ind':
      return (
        <g transform="translate(0, 3)">
          <rect x="25" y="30" width="22" height="30" rx="6" fill="none" stroke={color} strokeWidth="3" />
          <rect x="53" y="35" width="22" height="30" rx="6" fill="none" stroke={color} strokeWidth="3" />
          <circle cx="32" cy="40" r="2.5" fill={color} />
          <circle cx="40" cy="40" r="2.5" fill={color} />
          <circle cx="60" cy="45" r="2.5" fill={color} />
          <circle cx="68" cy="45" r="2.5" fill={color} />
        </g>
      );
    case 'campismo':
      return (
        <g>
          <polygon points="50,25 24,68 76,68" fill="none" stroke={color} strokeWidth="5.5" strokeLinejoin="round" />
          <line x1="50" y1="25" x2="50" y2="68" stroke={color} strokeWidth="3" />
          <polygon points="50,44 38,68 62,68" fill="none" stroke={color} strokeWidth="2.5" />
        </g>
      );

    // --- ATRATIVOS TURÍSTICOS ---
    case 'cachoeira_tur':
      return (
        <g>
          <path d="M25,25 Q50,42 75,25" stroke={color} strokeWidth="4" fill="none" />
          <path d="M35,42 C35,68 45,74 45,85" stroke={color} strokeWidth="3.5" fill="none" />
          <path d="M50,42 C50,68 55,74 55,85" stroke={color} strokeWidth="3.5" fill="none" />
          <path d="M65,42 C65,68 65,74 65,85" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'praia_tur':
      return (
        <g>
          <path d="M26,72 Q50,65 74,72" stroke={color} strokeWidth="4.5" fill="none" />
          <path d="M50,30 L50,65" stroke={color} strokeWidth="4" />
          <path d="M30,46 C34,32 66,32 70,46 Z" fill="none" stroke={color} strokeWidth="4.5" />
        </g>
      );
    case 'monumento_tur':
      return (
        <g>
          <polygon points="44,75 56,75 52,24 48,24" fill="none" stroke={color} strokeWidth="4" />
          <line x1="38" y1="80" x2="62" y2="80" stroke={color} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'museu_tur':
      return (
        <g>
          <polygon points="20,32 50,18 80,32" fill="none" stroke={color} strokeWidth="4" />
          <line x1="24" y1="32" x2="76" y2="32" stroke={color} strokeWidth="4" />
          <line x1="32" y1="32" x2="32" y2="68" stroke={color} strokeWidth="4" />
          <line x1="50" y1="32" x2="50" y2="68" stroke={color} strokeWidth="4" />
          <line x1="68" y1="32" x2="68" y2="68" stroke={color} strokeWidth="4" />
          <line x1="20" y1="68" x2="80" y2="68" stroke={color} strokeWidth="5" />
        </g>
      );
    case 'parque_tur':
      return (
        <g>
          <polygon points="34,60 18,60 26,40" fill="none" stroke={color} strokeWidth="3.5" />
          <polygon points="32,45 20,45 26,30" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="26" y1="60" x2="26" y2="72" stroke={color} strokeWidth="3.5" />
          <polygon points="68,60 52,60 60,40" fill="none" stroke={color} strokeWidth="3.5" />
          <polygon points="66,45 54,45 60,30" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="60" y1="60" x2="60" y2="72" stroke={color} strokeWidth="3.5" />
        </g>
      );
    case 'artesanato_tur':
      return (
        <g>
          <path d="M38,72 Q30,68 30,50 Q30,30 44,24 L56,24 Q70,30 70,50 Q70,68 62,72" fill="none" stroke={color} strokeWidth="4.5" />
          <ellipse cx="50" cy="24" rx="8" ry="3" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="30" y1="50" x2="70" y2="50" stroke={color} strokeWidth="3" />
        </g>
      );
    case 'proibido_mudar_faixa_esq_dir':
      return (
        <g>
          <line x1="34" y1="18" x2="34" y2="82" stroke={color} strokeWidth="3.5" strokeDasharray="8 6" />
          <line x1="66" y1="18" x2="66" y2="82" stroke={color} strokeWidth="3.5" strokeDasharray="8 6" />
          <path d="M28,58 Q50,48 72,52 M60,42 L74,52 L60,62" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'proibido_mudar_faixa_dir_esq':
      return (
        <g>
          <line x1="34" y1="18" x2="34" y2="82" stroke={color} strokeWidth="3.5" strokeDasharray="8 6" />
          <line x1="66" y1="18" x2="66" y2="82" stroke={color} strokeWidth="3.5" strokeDasharray="8 6" />
          <path d="M72,58 Q50,48 28,52 M40,42 L26,52 L40,62" stroke={color} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'proibido_tracao_animal':
      return (
        <g transform="translate(5, 5)">
          <circle cx="56" cy="46" r="10" fill="none" stroke={color} strokeWidth="3.5" />
          <path d="M46,46 L30,46 M30,46 L20,38 M30,46 L24,58 M36,56 L42,68" stroke={color} strokeWidth="4.5" fill="none" />
        </g>
      );
    case 'proibido_tratores':
    case 'tratores_adv':
      return (
        <g transform="translate(0, 3)">
          <rect x="36" y="36" width="28" height="20" rx="3" fill="none" stroke={color} strokeWidth="4.5" />
          <circle cx="28" cy="54" r="10" fill="none" stroke={color} strokeWidth="4.5" />
          <circle cx="72" cy="54" r="7" fill="none" stroke={color} strokeWidth="3.5" />
          <path d="M45,36 L45,22 L55,22" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'alfandega':
      return (
        <rect x="20" y="44" width="60" height="12" fill={color} />
      );
    case 'uso_correntes':
      return (
        <g>
          <circle cx="50" cy="50" r="22" fill="none" stroke={color} strokeWidth="5.5" />
          <circle cx="50" cy="50" r="12" fill="none" stroke={color} strokeWidth="4" />
          <line x1="50" y1="22" x2="50" y2="78" stroke={color} strokeWidth="3" />
          <line x1="22" y1="50" x2="78" y2="50" stroke={color} strokeWidth="3" />
        </g>
      );
    case 'curva_s_acentuada_esquerda':
    case 'curva_s_esquerda':
      return (
        <path d="M56,72 L56,54 Q56,40 44,40 Q32,40 32,25 M22,35 L32,22 L42,35" stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'curva_s_acentuada_direita':
    case 'curva_s_direita':
      return (
        <path d="M44,72 L44,54 Q44,40 56,40 Q68,40 68,25 M58,35 L68,22 L78,35" stroke={color} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case 'entroncamento_esquerda':
      return (
        <path d="M50,15 L50,85 M50,55 L22,35" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" />
      );
    case 'entroncamento_direita':
      return (
        <path d="M50,15 L50,85 M50,55 L78,35" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" />
      );
    case 'confluencia_esquerda':
      return (
        <path d="M50,15 L50,85 M22,65 Q36,55 50,55" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" />
      );
    case 'confluencia_direita':
      return (
        <path d="M50,15 L50,85 M78,65 Q64,55 50,55" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" />
      );
    case 'intersecao_circulo':
      return (
        <g transform="translate(50,50) scale(0.9) translate(-50,-50)">
          <circle cx="50" cy="50" r="22" fill="none" stroke={color} strokeWidth="6" strokeDasharray="14 10" />
          <path d="M50,15 L50,30 L45,23 M50,30 L55,23" stroke={color} strokeWidth="4.5" fill="none" />
        </g>
      );
    case 'bonde_adv':
      return (
        <g transform="translate(0, 5)">
          <rect x="28" y="32" width="44" height="25" rx="3" fill="none" stroke={color} strokeWidth="4.5" />
          <line x1="28" y1="46" x2="72" y2="46" stroke={color} strokeWidth="3" />
          <line x1="38" y1="32" x2="38" y2="57" stroke={color} strokeWidth="3" />
          <line x1="62" y1="32" x2="62" y2="57" stroke={color} strokeWidth="3" />
          <circle cx="38" cy="62" r="3" fill={color} />
          <circle cx="62" cy="62" r="3" fill={color} />
          <path d="M50,32 L56,15 L66,15" stroke={color} strokeWidth="3" fill="none" />
        </g>
      );
    case 'pista_irregular_adv':
      return (
        <path d="M15,62 Q25,38 35,62 Q45,38 55,62 Q65,38 75,62 L85,62" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      );
    case 'declive_acentuado':
      return (
        <g>
          <polygon points="18,68 82,68 82,32" fill="none" stroke={color} strokeWidth="4.5" />
          <rect x="44" y="36" width="18" height="10" rx="3" fill="none" stroke={color} strokeWidth="3" transform="rotate(-30 44 36)" />
        </g>
      );
    case 'aclive_acentuado':
      return (
        <g>
          <polygon points="18,68 82,68 18,32" fill="none" stroke={color} strokeWidth="4.5" />
          <rect x="36" y="36" width="18" height="10" rx="3" fill="none" stroke={color} strokeWidth="3" transform="rotate(30 36 36)" />
        </g>
      );
    case 'estreitamento_esquerda_adv':
      return (
        <path d="M30,75 L45,55 L45,25 M70,75 L70,25" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      );
    case 'estreitamento_direita_adv':
      return (
        <path d="M30,75 L30,25 M70,75 L55,55 L55,25" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      );
    case 'alargamento_pista_adv':
      return (
        <path d="M42,75 L30,55 L30,25 M58,75 L70,55 L70,25" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      );
    case 'ponte_estreita_adv':
      return (
        <path d="M28,75 L28,52 Q28,45 40,43 L40,25 M72,75 L72,52 Q72,45 60,43 L60,25" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
      );
    case 'inicio_pista_dupla_adv':
    case 'pista_dupla_adv':
    case 'pista_dividida_adv':
      return (
        <g>
          <path d="M34,74 L34,26 M25,38 L34,22 L43,38" stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66,26 L66,74 M57,62 L66,78 L75,62" stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="42" y="44" width="16" height="12" rx="3" fill={color} />
        </g>
      );
    case 'fim_pista_dupla_adv':
      return (
        <g>
          <path d="M34,74 L34,26 M25,38 L34,22 L43,38" stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66,26 L66,74 M57,62 L66,78 L75,62" stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="42" y="16" width="16" height="12" rx="3" fill={color} />
        </g>
      );
    case 'sentido_unico_adv':
      return (
        <path d="M20,50 L80,50 M65,35 L80,50 L65,65" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      );
    case 'desmoronamento_adv':
      return (
        <g>
          <path d="M22,74 L78,74 M22,74 L38,30" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="56" cy="54" r="3.5" fill={color} />
          <circle cx="68" cy="62" r="3" fill={color} />
          <circle cx="50" cy="68" r="3.5" fill={color} />
        </g>
      );
    case 'projecao_cascalho_adv':
      return (
        <g>
          <ellipse cx="38" cy="63" rx="15" ry="7" stroke={color} strokeWidth="3" fill="none" />
          <circle cx="58" cy="51" r="2.5" fill={color} />
          <circle cx="68" cy="56" r="2.5" fill={color} />
          <circle cx="74" cy="46" r="2" fill={color} />
        </g>
      );
    case 'passagem_nivel_sem_adv':
      return (
        <g transform="translate(0, 3)">
          <rect x="25" y="32" width="50" height="28" fill="none" stroke={color} strokeWidth="4.5" />
          <line x1="25" y1="46" x2="75" y2="46" stroke={color} strokeWidth="3" />
          <line x1="42" y1="32" x2="42" y2="60" stroke={color} strokeWidth="3" />
          <line x1="58" y1="32" x2="58" y2="60" stroke={color} strokeWidth="3" />
        </g>
      );
    case 'passagem_nivel_com_adv':
      return (
        <g>
          <path d="M20,62 L80,62 M24,32 L24,62 M76,32 L76,62 M32,44 L68,44" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M38,32 L62,32" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 'cruz_santo_andre_adv':
      return (
        <g>
          <line x1="22" y1="22" x2="78" y2="78" stroke={color} strokeWidth="9.5" strokeLinecap="round" />
          <line x1="78" y1="22" x2="22" y2="78" stroke={color} strokeWidth="9.5" strokeLinecap="round" />
        </g>
      );
    case 'vento_lateral_adv':
      return (
        <g transform="translate(0, 4)">
          <line x1="50" y1="18" x2="50" y2="74" stroke={color} strokeWidth="4.5" />
          <path d="M50,18 Q68,22 64,36 Q50,44 50,44" stroke={color} strokeWidth="4" fill="none" />
          <line x1="50" y1="31" x2="68" y2="31" stroke={color} strokeWidth="3" />
        </g>
      );
    case 'rua_sem_saida_adv':
      return (
        <g>
          <path d="M50,75 L50,28" stroke={color} strokeWidth="10" strokeLinecap="square" />
          <rect x="34" y="24" width="32" height="10" fill="#dc2626" />
        </g>
      );
    case 'reboque_ind':
      return (
        <g>
          <path d="M22,65 L54,65 L66,54 L78,54" stroke={color} strokeWidth="4.5" fill="none" />
          <circle cx="34" cy="65" r="4.5" fill={color} />
          <path d="M54,65 L44,44 M44,44 L28,48" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'atracao_ind':
      return (
        <g transform="scale(0.9) translate(6, 6)">
          <circle cx="50" cy="50" r="16" fill="none" stroke={color} strokeWidth="4" />
          <path d="M50,15 L50,34 M50,66 L50,85 M15,50 L34,50 M66,50 L85,50" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 'militar_tur':
      return (
        <g>
          <polygon points="50,22 72,40 64,74 36,74 28,40" fill="none" stroke={color} strokeWidth="4.5" />
          <path d="M40,55 L50,45 L60,55" stroke={color} strokeWidth="3.5" fill="none" />
        </g>
      );
    case 'ruinas_tur':
      return (
        <g>
          <rect x="25" y="44" width="16" height="28" fill="none" stroke={color} strokeWidth="4" />
          <rect x="59" y="44" width="16" height="28" fill="none" stroke={color} strokeWidth="4" />
          <rect x="38" y="54" width="24" height="18" fill="none" stroke={color} strokeWidth="4" />
          <path d="M20,44 L80,44 M25,32 M75,32" stroke={color} strokeWidth="4.5" />
        </g>
      );
    case 'patrimonio_tur':
      return (
        <g transform="translate(50,54) scale(1.1) translate(-50,-54)">
          <circle cx="50" cy="40" r="12" fill="none" stroke={color} strokeWidth="4" />
          <polygon points="50,40 32,70 68,70" fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 'mirante_tur':
      return (
        <g>
          <path d="M22,68 L32,54 L44,60 L58,40 L68,48 L78,32" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="28" r="4.5" fill={color} />
          <path d="M45,39 L55,39" stroke={color} strokeWidth="3" />
        </g>
      );
    case 'pesca_tur':
      return (
        <g>
          <path d="M24,40 Q44,28 66,48 Q76,58 64,68" stroke={color} strokeWidth="4.5" fill="none" />
          <line x1="28" y1="68" x2="68" y2="28" stroke={color} strokeWidth="3" />
          <path d="M22,62 Q28,58 34,64" stroke={color} strokeWidth="3" fill="none" />
        </g>
      );
    case 'montanhismo_tur':
      return (
        <g>
          <polygon points="18,68 44,28 60,50" fill="none" stroke={color} strokeWidth="4.5" />
          <polygon points="44,68 64,36 82,68" fill="none" stroke={color} strokeWidth="4.5" />
        </g>
      );
    case 'trilha_tur':
      return (
        <g>
          <path d="M30,72 Q38,50 42,42 Q46,34 58,25" stroke={color} strokeWidth="5.5" strokeDasharray="10 6" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="72" r="3.5" fill={color} />
          <circle cx="58" cy="25" r="3.5" fill={color} />
        </g>
      );
    case 'voo_livre_tur':
      return (
        <path d="M18,34 C30,18 70,18 82,34 C70,44 30,44 18,34 Z M50,34 L50,68" stroke={color} strokeWidth="4.5" fill="none" />
      );
    case 'marina_tur':
      return (
        <g>
          <path d="M24,56 L76,56 L68,68 L32,68 Z" fill="none" stroke={color} strokeWidth="4.5" />
          <line x1="50" y1="22" x2="50" y2="56" stroke={color} strokeWidth="4.5" />
          <polygon points="50,22 68,32 50,42" fill={color} />
        </g>
      );
    case 'estancia_tur':
      return (
        <g>
          <path d="M25,72 Q50,62 75,72" stroke={color} strokeWidth="4.5" fill="none" />
          <path d="M50,48 Q44,38 48,22 Q58,38 50,48" fill={color} />
          <path d="M34,54 Q30,46 36,34 Q42,46 34,54" fill={color} />
          <path d="M66,54 Q60,46 64,34 Q70,46 66,54" fill={color} />
        </g>
      );
    case 'proibido_carros_mao':
      return (
        <g transform="translate(10, 10)">
          <circle cx="34" cy="56" r="4" fill={color} />
          <path d="M20,38 L48,38 L54,54 L20,54 Z M48,38 L68,38" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'artesanato_tur':
      return (
        <g>
          <path d="M38,72 Q30,68 30,50 Q30,30 44,24 L56,24 Q70,30 70,50 Q70,68 62,72" fill="none" stroke={color} strokeWidth="4.5" />
          <ellipse cx="50" cy="24" rx="8" ry="3" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="30" y1="50" x2="70" y2="50" stroke={color} strokeWidth="3" />
        </g>
      );

    default:
      return (
        <text x="50" y="58" fill={color} fontSize="17" fontWeight="950" textAnchor="middle" fontFamily="monospace">🚦</text>
      );
  }
}

function TrafficSignSvg({ type, category, code }: { type: string; category?: string; code?: string }) {
  const isBlueReg = type.includes('siga_frente') || type.includes('sentido_circular') || type.includes('passagem_obrigatoria') || type.includes('exclusivo_') || type.includes('vire_') || type.includes('conserve_') || type.includes('obrigatoria');
  const isTur = type.endsWith('_tur');
  
  let shapeContent;
  
  if (type === 'pare') {
    shapeContent = (
      <>
        <polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" />
        <polygon points="32,8 68,8 92,32 92,68 68,92 32,92 8,68 8,32" fill="none" stroke="#ffffff" strokeWidth="2" />
        <text x="50" y="58" fill="#ffffff" fontSize="21" fontWeight="950" textAnchor="middle" fontFamily="sans-serif" letterSpacing="-0.5">PARE</text>
      </>
    );
  } else if (type === 'preferencia') {
    shapeContent = (
      <>
        <polygon points="5,15 95,15 50,93" fill="#ffffff" stroke="#dc2626" strokeWidth="10" strokeLinejoin="round" />
        <polygon points="12,20 88,20 50,85" fill="#ffffff" />
      </>
    );
  } else if (category === 'regulamentação') {
    shapeContent = (
      <>
        {isBlueReg ? (
          <circle cx="50" cy="50" r="44" fill="#1e40af" stroke="#ffffff" strokeWidth="3" />
        ) : (
          <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#dc2626" strokeWidth="9" />
        )}
        
        {renderSymbol(type, isBlueReg ? '#ffffff' : '#000000')}

        {type.includes('proibido_parar') && (
          <>
            <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
            <line x1="78" y1="22" x2="22" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </>
        )}
        {type.startsWith('proibido_') && !type.includes('proibido_parar') && (
          <line x1="22" y1="22" x2="78" y2="78" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
        )}
      </>
    );
  } else if (category === 'advertência') {
    shapeContent = (
      <>
        <polygon points="50,4 96,50 50,96 4,50" fill="#f59e0b" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
        <polygon points="50,8 92,50 50,92 8,50" fill="none" stroke="#000000" strokeWidth="1.5" />
        {renderSymbol(type, '#000000')}
      </>
    );
  } else {
    // Indicação ou Turístico (brown)
    const bgColor = isTur ? '#78350f' : '#1e40af';
    shapeContent = (
      <>
        <rect x="5" y="5" width="90" height="90" rx="10" fill={bgColor} stroke="#ffffff" strokeWidth="3.5" />
        <rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        {renderSymbol(type, '#ffffff')}
      </>
    );
  }

  return (
    <div className="w-36 h-36 flex items-center justify-center p-2 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-inner relative group select-none">
      <svg viewBox="0 0 100 100" className="w-28 h-28 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        {shapeContent}
      </svg>
    </div>
  );
}

export function SignMatch({ onComplete, onScoreUpdate, onCancel, currentPlayerId }: SignMatchProps) {
  const [gameState, setGameState] = useState<'selection' | 'playing'>('selection');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [shuffledQueue, setShuffledQueue] = useState<TrafficSignData[]>([]);
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
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  
  const totalRounds = 20;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (gameState === 'playing' && shuffledQueue.length > 0) {
      generateRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentRound, gameState, shuffledQueue]);

  useEffect(() => {
    // Timer is completely disabled per user request
  }, []);

  const generateRound = () => {
    if (shuffledQueue.length === 0) return;

    // Retrieve the pre-randomized unique sign for this round sequentially
    const signIndex = (currentRound - 1) % shuffledQueue.length;
    const sign = shuffledQueue[signIndex];
    if (!sign) return;

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

    // Shuffle and extract a set of 20 unique traffic signs for the session
    let eligibleSigns = [...SIGNS];
    if (mode === 'easy') {
      // Basic Regulation and Warning only - exclude "indicação"
      eligibleSigns = SIGNS.filter(s => s.category !== 'indicação');
    }

    const shuffled = [...eligibleSigns];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Limit to the total rounds of the game session safely
    const gameQueue = shuffled.slice(0, Math.min(shuffled.length, totalRounds));
    setShuffledQueue(gameQueue);
    setGameState('playing');
  };

  const handleAnswer = (choice: string) => {
    if (isRevealing) return;

    setSelectedAnswer(choice);
    setIsRevealing(true);

    const isCorrect = choice === currentSign.name;
    let earnedPoints = 0;

    if (isCorrect) {
      // Dynamic score matching math game speed multiplier - removed per user request
      earnedPoints = 100;
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
                      {level === 'easy' ? 'Regulamentação e Advertência (Placas Básicas)' : level === 'medium' ? 'Sinais Completos + Indicação' : 'Todos os Sinais + Detalhes Técnicos'}
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
        
        {/* Replaced circular timer with static badge per user request */}
        <div className="flex items-center justify-center bg-slate-900 border border-slate-800 w-12 h-12 rounded-xl text-lg">
          🚦
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
            <TrafficSignSvg type={currentSign.type} category={currentSign.category} code={currentSign.code} />
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
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl relative"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-slate-950 border-2 border-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                <span className="text-4xl">⏱️</span>
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
                onClick={() => onComplete(
                  0,
                  1,
                  multiplayerMode === '2p',
                  selectedPartner,
                  0,
                  0,
                  'SIGN_MATCH',
                  true,
                  false
                )} 
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-md shadow-yellow-500/10 active:scale-95 transition-all font-sans"
              >
                VOLTAR À CENTRAL DE JOGOS
              </Button>
              <Button 
                onClick={() => {
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setIsTimeOut(false);
                  setGameState('selection');
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

      {gameState === 'playing' && (
        <div className="w-full flex justify-center mt-6">
          <Button 
            onClick={() => {
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              onComplete(
                multiplayerMode === '2p' ? p1Score : score,
                1,
                multiplayerMode === '2p',
                selectedPartner,
                p1Score,
                p2Score,
                'SIGN_MATCH',
                false,
                true // keepInGameSelection
              );
              setShowAbandonModal(true);
            }}
            className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider"
          >
            ABANDONAR PATRULHA
          </Button>
        </div>
      )}

      {showAbandonModal && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-6 bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl relative animate-scale-in"
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
                  setScore(0);
                  setP1Score(0);
                  setP2Score(0);
                  setGameState('selection');
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
    </div>
  );
}
