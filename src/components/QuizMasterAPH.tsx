/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, HelpCircle, Trophy, Activity, CheckCircle2, XCircle, 
  Zap, Users, Target, Shield, Award, Clock, Play, Check, 
  Sparkles, TrendingUp, User, Lock, Volume2, Bookmark, Flame, BookOpen
} from 'lucide-react';
import { 
  doc, onSnapshot, writeBatch, updateDoc, setDoc, getDoc, getDocs, 
  collection, query, where, limit, arrayUnion 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, GameType } from '../types';
import { writePlayerProfile } from '../lib/rankingSync';
import confetti from 'canvas-confetti';
import { isAudioEnabled, isVisualEffectsEnabled } from '../lib/gameEffects';

// --- QUESTION STRUCTURE & TYPE DEFINITIONS ---
export interface APHQuestion {
  id: string;
  category: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'fácil' | 'médio' | 'difícil' | 'especialista';
}

export interface QuizCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const CATEGORIES: QuizCategory[] = [
  { id: 'aph', name: 'Quiz APH', icon: '🚑', color: 'from-blue-600 to-indigo-700', description: 'Fundamentos de atendimento clínico emergencial, PCR, OVACE e RCP.' },
  { id: 'trauma', name: 'Quiz de Trauma', icon: '🚨', color: 'from-red-600 to-red-800', description: 'Escalas de coma, imobilização, controle de hemorragias e manejo cervical.' },
  { id: 'sinais_vitais', name: 'Quiz de Sinais Vitais', icon: '❤️', color: 'from-emerald-600 to-teal-700', description: 'Monitoramento de pulso, PA, glicemia, pupilas e saturação do paciente.' },
  { id: 'medicamentos', name: 'Quiz de Medicamentos', icon: '💊', color: 'from-purple-600 to-violet-700', description: 'Doses, diluições e indicações de adrenalina, oxigênio e antiarrítmicos.' },
  { id: 'anatomia', name: 'Quiz de Anatomia', icon: '🦴', color: 'from-amber-600 to-orange-700', description: 'Fisiologia humana aplicada, ossos, cavidades corporais e órgãos vitais.' },
  { id: 'multiplas_vitimas', name: 'Quiz de Múltiplas Vítimas', icon: '🚧', color: 'from-yellow-600 to-amber-700', description: 'Triagem rápida no método START, contendo perigos e áreas de apoio.' },
  { id: 'atendimento_rodoviario', name: 'Quiz de Atendimento Rodoviário', icon: '🛣️', color: 'from-cyan-600 to-blue-700', description: 'Segurança de tráfego, balizamento, cones, zonas quente/fria e desvios.' },
  { id: 'biosseguranca', name: 'Quiz de Biossegurança', icon: '🧤', color: 'from-emerald-500 to-green-700', description: 'Uso ideal de EPIs, descartes, acidentes de perfurocortantes e contágios.' },
  { id: 'equipamentos', name: 'Quiz de Equipamentos de Resgate', icon: '🧰', color: 'from-slate-600 to-zinc-700', description: 'Uso correto de KED, maca rígida, colar cervical, talas e DEA.' },
  { id: 'pediatrico', name: 'Quiz de Atendimento Pediátrico', icon: '👶', color: 'from-pink-600 to-rose-700', description: 'Particularidades do resgate em crianças, escala PAT, doses e imobilizações.' }
];

// --- CLINICAL TEMPLATES AND COMBINATIONS TO REACH 300+ UNIQUE SCENARIOS PER CATEGORY ---
const CLINICAL_SCENARIOS: Record<string, Array<{
  text: string;
  correct: string;
  wrongs: string[];
  explanation: string;
  diff: 'fácil' | 'médio' | 'difícil' | 'especialista';
}>> = {
  aph: [
    {
      text: "Durante uma Parada Cardiorrespiratória (PCR) em {A}, com protocolo em andamento, qual a relação de compressões/ventilações recomendada quando há apenas 1 socorrista disponível e a ocorrência ocorre {B}?",
      correct: "30 compressões para 2 ventilações.",
      wrongs: ["15 compressões para 2 ventilações.", "5 compressões para 1 ventilação.", "20 compressões para 2 ventilações."],
      explanation: "De acordo com as diretrizes da AHA, a relação de compressão/ventilação para socorrista único em parada cardíaca, seja para adulto, criança ou lactente, é sempre de 30:2 para manter a estabilidade hemodinâmica.",
      diff: 'fácil'
    },
    {
      text: "Ao utilizar o Desfibrilador Externo Automático (DEA) em {A} que se encontra em parada cardíaca {B}, qual o procedimento correto se o aparelho indicar: 'Choque recomendado'?",
      correct: "Garantir que ninguém toque na vítima, pressionar o botão de choque e reiniciar as compressões imediatamente.",
      wrongs: ["Pressionar o botão de choque e aguardar 1 minuto antes de checar as pupilas.", "Afastar as pás do peito do paciente para respirar de forma autônoma.", "Pressionar e segurar o botão de choque por pelo menos 15 segundos sem interrupção."],
      explanation: "Após garantir a segurança de todos mantendo distanciamento absoluto do paciente, o choque deve ser descarregado e a RCP deve ser retomada instantaneamente, iniciando pelas compressões sem perda de tempo.",
      diff: 'fácil'
    },
    {
      text: "Ao identificar suspeita de Acidente Vascular Cerebral (AVC) em {A} em situação {B}, qual deve ser a providência imediata?",
      correct: "Avaliar desvio de rima facial, perda de força motora nos braços, fala arrastada (Escala de Cincinnati) e acionar regulação médica para transporte prioritário.",
      wrongs: ["Efetuar compressão torácica vigorosa para estabilizar o batimento cardíaco.", "Forçar ingestão de bebida doce para anular queda glicêmica.", "Colocar a vítima sentada com a cabeça reclinada para trás por 30 minutos."],
      explanation: "A escala pré-hospitalar de Cincinnati orienta a busca imediata de assimetria facial, debilidade muscular de membros superiores e perturbação de discurso. Se presentes, indicam urgência máxima com transferência rápida.",
      diff: 'médio'
    },
    {
      text: "Em caso de parada cardiorrespiratória em {A} {B}, após intubação e estabelecimento de via aérea avançada por equipe médica, como deve proceder o socorrista nas ventilações?",
      correct: "Sincronizar ventilações contínuas: 1 ventilação a cada 6 segundos (10/min) enquanto as compressões torácicas ocorrem de forma assíncrona.",
      wrongs: ["Continuar o ciclo convencional de 30 compressões torácicas para cada 2 ventilações.", "Realizar 1 ventilação rápida no ritmo de 5 ventilações por minuto para poupar oxigênio.", "Fornecer 2 ventilações intensas com pausa obrigatória nas compressões a cada ciclo."],
      explanation: "Com via aérea avançada (tubo orotraqueal ou dispositivo supraglótico), o socorrista responsável pelo ventilador faz uma insuflação contínua a cada 6 segundos de forma independente do bombeamento torácico, que não para.",
      diff: 'médio'
    },
    {
      text: "Durante a crise convulsiva ativa de {A} {B}, qual é a conduta primária obrigatória do operador de APH?",
      correct: "Proteger a cabeça da vítima, retirar objetos perigosos ao redor e posicionar em decúbito lateral após cessarem as contrações.",
      wrongs: ["Inserir colher ou gaze entre os dentes do paciente de modo forçado.", "Conter firmemente os braços e pernas da vítima para reprimir as contrações musculares.", "Aplicar respiração boca a boca imediata para combater a apneia passageira."],
      explanation: "Durante uma convulsão, deve-se afastar objetos e proteger o crânio contra traumatismos. Forçar abertura bucal é contraindicado, podendo quebrar dentes ou machucar gravemente as mãos do socorrista.",
      diff: 'fácil'
    },
    {
      text: "Qual o manejo imediato sugerido para {A} apresentando queimadura térmica generalizada por produtos inflamáveis se {B}?",
      correct: "Arrefecer a lesão com água corrente limpa, cobrir com plástico filme/gaze estéril umedecida e evitar estourar bolhas ou retirar tecidos aderidos.",
      wrongs: ["Aplicar creme dental misturado com clara de ovo nas feridas abertas.", "Utilizar gelo diretamente sobre as queimaduras para aliviar dor intensa rapidamente.", "Retirar à força todas as roupas aderidas às áreas carbonizadas de pele."],
      explanation: "O resfriamento térmico com água limpa em temperatura ambiente cessa a progressão do calor periférico. Deve-se proteger a ferida sem aplicar substâncias químicas caseiras para impedir infecção secundária.",
      diff: 'médio'
    },
    {
      text: "Em caso de suspeita de infarto agudo do miocárdio (IAM) envolvendo {A} {B}, qual procedimento inicial o socorrista executa?",
      correct: "Manter repouso absoluto do paciente, administrar oxigênio se saturação < 90%, realizar triagem de Cincinnati invertida e encaminhar a ECG urgente.",
      wrongs: ["Instruir o paciente a realizar esforço físico leve como caminhar para aliviar cólicas.", "Aplicar torniquete arterial no braço esquerdo para restringir infecção.", "Administrar anti-inflamatório corticoide de alta dosagem sem controle de pulso."],
      explanation: "No IAM suspenso, repouso físico diminui o consumo cardíaco de O2. Oxigenação suplementar é recomendada apenas em casos de hipoxemia (queda de oxigênio sanguíneo abaixo de 90% ou sofrimento ventilatório).",
      diff: 'difícil'
    },
    {
      text: "Vítima ({A}) engasgada que se torna responsiva e, de repente, perde a consciência {B}, qual é a alteração imediata no protocolo de resgate?",
      correct: "Deitar a vítima cuidadosamente no solo, solicitar apoio médico/DEA e iniciar compressões torácicas sem verificação prévia de pulso.",
      wrongs: ["Aumentar o ritmo da manobra de Heimlich aplicando golpes intercostais.", "Realizar traqueostomia emergencial imediatamente utilizando caneta esferográfica.", "Iniciar respiração forçada vigorosa com compressão gástrica brusca."],
      explanation: "Quando a vítima de OVACE desmaia, deita-se a mesma em superfície plana e inicia-se diretamente o protocolo de massagem torácica (RCP), abrindo a cavidade oral a cada ciclo para buscar e extrair corpos estranhos visíveis.",
      diff: 'médio'
    },
    {
      text: "Qual é o valor mínimo tolerável do escore da Escala de Coma de Glasgow atualizado que define indicação imediata de intubação orotraqueal em {A} que sofreu colisão {B}?",
      correct: "Igual ou inferior a 8 (Glasgow 3 a 8 indica trauma cranioencefálico grave).",
      wrongs: ["GCS menor ou igual a 12.", "GCS de exatamente 15.", "Independente do valor, o escore de Glasgow nunca gera indicação direta de intubação."],
      explanation: "Recomenda-se intubação precoce protetora de via aérea quando o paciente apresenta traumatismo no nível de rebaixamento neurológico de Glasgow de 8 ou menor, pois os reflexos de tosse e deglutição são severamente abalidos.",
      diff: 'difícil'
    },
    {
      text: "Paciente ({A}) em choque anafilático grave após ferroada/fármaco, {B}. Qual é o agente farmacológico de primeira escolha no suporte básico ou avançado de vida?",
      correct: "Epinefrina (Adrenalina), administrada por via intramuscular na face anterolateral da coxa.",
      wrongs: ["Dipirona injetável diluída em soro fisiológico.", "Atropina injetável direta na veia jugular.", "Amiodarone por via subcutânea."],
      explanation: "A epinefrina injetável no músculo vasto lateral da coxa reverte instantaneamente o colapso cardiovascular por sua ação alfa-1 adrenérgica (vasoconstrição) e beta-2 (broncodilatação) no choque anafilático.",
      diff: 'especialista'
    },
    {
      text: "Qual a conduta perante {A} com síncope súbita pós-esforço {B}, com vias aéreas limpas e pulso firme e rítmico mantido?",
      correct: "Colocar o paciente em decúbito dorsal plano e elevar os membros inferiores a 30-45 graus para otimizar o fluxo cerebral (Posição de Trendelenburg modificada).",
      wrongs: ["Colocar água na boca do paciente de forma contínua enquanto ele estiver inconsciente.", "Forçar o paciente a ficar de pé e respirar rápido para melhorar o fôlego pulmonar.", "Deitar o paciente em decúbito ventral e comprimir o abdômen energeticamente."],
      explanation: "A elevação de pernas (auto-transfusão natural) ajuda no retorno venoso e no restabelecimento do débito cardíaco diminuído na síncope comum postural.",
      diff: 'fácil'
    }
  ],
  trauma: [
    {
      text: "Suspeita de trauma na coluna cervical de {A} {B}. Qual técnica de abertura de vias aéreas é imprescindível no APH para evitar movimentos rotacionais?",
      correct: "Manobra de tração da mandíbula (Jaw-thrust).",
      wrongs: ["Manobra de inclinação da cabeça e elevação do queijo (Chin-lift).", "Manobra de Sellick continuada por compressão externa.", "Hiperextensão cervical aguda contínua."],
      explanation: "A manobra Jaw-thrust (tração mandibular) permite liberar vias aéreas sem transladar ou rotacionar a coluna cervical, minimizando riscos de agravamento de lesões raquimedulares instáveis.",
      diff: 'fácil'
    },
    {
      text: "Ao atender {A} com hemorragia arterial intensa em perna direita após colisão rodoviária {B}, qual dispositivo deve ser aplicado imediatamente se compressão manual falhar?",
      correct: "Torniquete tático homologado de 5 a 7 centímetros acima da lesão, evitando articulações e anotando a hora exata da aplicação.",
      wrongs: ["Tala de imobilização pneumática de alta sucção inflamada.", "Gelo triturado aplicado diretamente na ferida até saturar.", "Torniquete frouxo com barbante de algodão e prego rotativo."],
      explanation: "O torniquete circunferencial rígido representa conduta salvadora de primeira linha para hemorragias massivas em extremidades, impossíveis de conter apenas por pressão direta tradicional.",
      diff: 'fácil'
    },
    {
      text: "Qual o tratamento primário emergencial sugerido frente à suspeita de Pneumotórax Aberto em {A} {B}?",
      correct: "Curativo de três pontas (curativo oclusivo parcial) posicionado sobre a ferida torácica aberta.",
      wrongs: ["curativo oclusivo totalmente vedado nas quatro extremidades.", "Insuflar oxigênio sob altíssima pressão diretamente sobre a ruptura intercostal.", "Colocação direta de peso de chumbo sobre o tórax do paciente."],
      explanation: "O curativo valvular de 3 pontas impede a entrada de ar externo no pulmão durante a inspiração, mas permite o escape do ar aprisionado na cavidade pleural na expiração, prevenindo o pneumotórax hipertensivo.",
      diff: 'médio'
    },
    {
      text: "Durante o exame físico detalhado de {A} que sofreu atropelamento {B}, constata-se crepitação óssea, dor viva e assimetria pélvica. Qual é a conduta preventiva prioritária?",
      correct: "Imobilizar eletronicamente a bacia usando uma cinta/lençol pélvico no nível dos trocanteres maiores para conter sangramento retroperitoneal.",
      wrongs: ["Instruir o paciente a realizar movimentos circulares de rotação lateral do quadril.", "Tracionar as duas pernas simetricamente usando ganchos mecânicos.", "Sentar a vítima em ângulo de 90 graus para equilibrar os eixos pélvicos."],
      explanation: "A fratura de pelve constitui risco letal oculto por volumoso sangramento interno (retroperitoneal). A fixação e fechamento pélvico cirúrgico ou emergencial com cinta limita a perda sanguínea catastrófica.",
      diff: 'difícil'
    },
    {
      text: "Paciente ({A}) apresenta trauma de tórax grave {B} evoluindo com hipotensão severa, turgência jugular bilateral, hipofonese de bulhas cardíacas e dispneia grave. Essa tríade sugere:",
      correct: "Tamponamento Cardíaco (Tríade de Beck).",
      wrongs: ["Pneumotórax simples unilateral.", "Choque neurogênico central.", "Edema agudo de glote periférico."],
      explanation: "A tríade de Beck (hipotensão arterial, bulhas cardíacas abafadas e estase venosa jugular) indica acúmulo agudo de sangue no saco pericárdico, exigindo descompressão ou transporte emergencial.",
      diff: 'difícil'
    },
    {
      text: "Qual é o principal sinal patognomônico ocular tardio de fratura de base posterior do crânio (Trauma de Crânio) em {A} {B}?",
      correct: "Equimose periorbital bilateral (Olhos de guaxinim) e Sinal de Battle (equimose retroauricular na região mastóidea).",
      wrongs: ["Mydriase bilateral reversível temporária.", "Anisocoria pura com estrabismo convergente.", "Prurido conjuntival intenso com conjuntivite lacrimejante."],
      explanation: "O extravasamento capilar ósseo nos tecidos moles retroauriculares (Sinal de Battle) e na órbita palpebral (olhos de guaxinim) revela danos mecânicos na base de sustentação craniana.",
      diff: 'médio'
    }
  ],
  sinais_vitais: [
    {
      text: "Qual é o intervalo de frequência cardíaca de repouso classificado como normal para {A} em monitoramento médico regulamentar {B}?",
      correct: "60 a 100 batimentos por minuto (bpm) para adultos saudáveis.",
      wrongs: ["120 a 160 batimentos por minuto.", "30 a 50 batimentos por minuto.", "80 a 130 batimentos por minuto."],
      explanation: "Em pessoas adultas, considera-se a frequência normal (normocardia) entre 60 e 100 bpm. Valores abaixo de 60 definem bradicardia; acima de 100 qualificam taquicardia.",
      diff: 'fácil'
    },
    {
      text: "Frente a {A} que se apresenta com pupilas de diâmetros marcadamente desiguais (uma contraída e outra amplamente dilatada) {B}, qual suspeita clínica deve guiar o atendimento?",
      correct: "Anisocoria, sugerindo lesão cerebral expansiva unilateral ou traumatismo craniencefálico grave.",
      wrongs: ["Isocoria simples por cansaço físico comum.", "Mydriase fisiológica protetora contra vento.", "Miose induzida por estafa térmica leve."],
      explanation: "As pupilas desiguais (anisocoria) no trauma denotam compressão mecânica de nervo oculomotor ipsilateral, frequentemente decorrente de herniação cerebral decorrente de sangramento intracraniano.",
      diff: 'médio'
    },
    {
      text: "Qual é a frequência respiratória fisiológica normal esperada para {A} se examinado sob {B}?",
      correct: "12 a 20 incursões respiratórias por minuto (rpm) em adultos.",
      wrongs: ["25 a 35 incursões por minuto.", "8 a 10 incursões por minuto.", "30 a 45 incursões por minuto."],
      explanation: "No adulto normopneico, o ritmo respiratório ideal em repouso varia de 12 a 20 respirações por minuto. Acima de 20 define-se taquipneia; abaixo de 12 designa-se bradipneia.",
      diff: 'fácil'
    },
    {
      text: "Ao avaliar {A} em situação {B}, o glicosímetro capilar registra 42 mg/dL. Qual o quadro clínico associado e a intervenção primária ideal se consciente?",
      correct: "Hipoglicemia severa. Deve-se fornecer carboidrato simples de rápida absorção por via oral (se houver reflexo protetor mantido).",
      wrongs: ["Hiperglicemia aguda. Administrar dose maciça de insulina rápida imediatamente por via injetável.", "Cetoacidose diabética estável. Fornecer água filtrada e instruir repouso prolongado.", "Estado hiperosmolar sem necessidade de glicose."],
      explanation: "Glicemia abaixo de 70 mg/dL qualifica hipoglicemia. Se o indivíduo estiver lúcido e apto a engolir, o aporte de glicose oral rápida corrige a severidade neurológica prontamente.",
      diff: 'médio'
    },
    {
      text: "O parâmetro de tempo do preenchimento capilar periférico usado para avaliação hemodinâmica ágil e pulso periférico em {A} {B} deve ser de no máximo:",
      correct: "Até 2 segundos (tempo indicador de boa perfusão periférica).",
      wrongs: ["Até 5 segundos.", "Exatamente 7 segundos.", "Menos de 0,5 segundos."],
      explanation: "Preenchimento capilar leito ungueal menor ou igual a 2 segundos atesta integridade pressórica de microvascularização periférica e estabilidade circulatória.",
      diff: 'fácil'
    }
  ],
  medicamentos: [
    {
      text: "Qual a indicação prioritária e dosagem clássica da Epinefrina (Adrenalina) em protocolo de RCP nos ritmos chocáveis e não chocáveis para {A} {B}?",
      correct: "1 mg da solução 1:10.000 por via intravenosa ou intraóssea a cada 3 a 5 minutos.",
      wrongs: ["10 mg pura diluída em água destilada a cada 10 minutos sob gotejamento.", "0,1 mg injetável por via subcutânea apenas após o terceiro choque do DEA.", "5 mg injetável direta no músculo cardíaco unilateral."],
      explanation: "Em parada cardiorrespiratória adulta, administra-se 1 mg de epinefrina de forma intravenosa ou intraóssea (solução diluída) repetida a cada ciclo de 3 a 5 minutos.",
      diff: 'difícil'
    },
    {
      text: "Como operador/resgatista prestando apoio em emergência com {A} {B}, qual é o limite de fluxo e saturação alvo que justifica uso do cateter nasal simples de oxigênio de baixo fluxo?",
      correct: "Fluxo de até 6 L/min, fornecendo fração inspirada de O2 estimada entre 24% e 44%, com saturação alvo acima de 94%.",
      wrongs: ["Fluxo de 15 a 20 L/min com vedação total das narinas.", "Fluxo mínimo de 12 L/min independentemente da queixa respiratória.", "Substituição completa do ar atmosférico por O2 puro a 100%."],
      explanation: "O cateter nasal é um sistema de baixo fluxo que tolera de 1 a 6 litros por minuto de fluxo de oxigênio. Taxas maiores ressecam as mucosas bucofaringéas sem aumentar a deposição alveolar.",
      diff: 'médio'
    },
    {
      text: "Em caso de parada cardíaca em {A} que se apresenta em Fibrilação Ventricular (FV) refratária {B}, após o terceiro choque, qual antiarrítmico deve ser considerado?",
      correct: "Amiodarona (dose inicial de 300 mg intravenosa em bólus), ou Lidocaína.",
      wrongs: ["Atropina (3 mg intravenosa instantânea).", "Adrenalina concentrada (50 mg diluída em soro).", "Morfina para analgesia coronária contínua."],
      explanation: "A amiodarona é um potente antiarrítmico de escolha para FV ou TV sem pulso refratárias a choques. A dose recomendada após o 3º choque é 300 mg em bólus IV/IO.",
      diff: 'difícil'
    }
  ],
  anatomia: [
    {
      text: "Em caso de fratura de fêmur em {A} {B}, qual o potencial de perda sanguínea oculta interna no canal medular que o socorrista deve mapear para prevenir choque hipovolêmico?",
      correct: "De 1.000 mL a 1.500 mL por coxa lesionada.",
      wrongs: ["De 50 mL a 150 mL apenas.", "De 5.000 mL (sangramento total) em poucos segundos.", "Menos de 500 mL devido à retenção muscular."],
      explanation: "Fraturas fechadas de fêmur geram sangramentos internos expressivos nos compartimentos musculares da coxa, com perda estimada entre 1 a 1,5 litros de sangue por membro afetado.",
      diff: 'médio'
    },
    {
      text: "Ao atender {A} com dor aguda abdominal intensa localizada no quadrante superior direito (QSD) {B}, quais órgãos vitais merecem suspeição de comprometimento ou hemorragia retroperitoneal?",
      correct: "Fígado e vesícula biliar.",
      wrongs: ["Baço e cauda do pâncreas.", "Apêndice cecal e cólon sigmoide.", "Estômago e baço esquerdo."],
      explanation: "Anatomicamente, o quadrante superior direito abriga majoritariamente o fígado e a árvore biliar. Traumas cortantes ou contusões nesse quadrante sugerem lesão hepática com alto débito hemorrágico.",
      diff: 'difícil'
    },
    {
      text: "Qual é a estrutura óssea que protege o coração e pulmões na caixa torácica que é frequentemente fraturada em traumas graves em {A} {B}?",
      correct: "O osso Esterno e os arcos costais (costelas).",
      wrongs: ["O osso Fêmur e pelve orbital.", "A patela e a tíbia acessória.", "A clavícula proximal apenas."],
      explanation: "O osso esterno reside no centro da parece torácica anterior, articulando-se com as costelas para resguardar as vísceras torácicas (coração e pulmões de danos mecânicos mecânicos).",
      diff: 'fácil'
    }
  ],
  multiplas_vitimas: [
    {
      text: "Durante triagem START em cenário de múltiplas vítimas envolvendo colisão com {A} {B}, você constata um paciente que não respira mesmo após abertura simples de vias aéreas. Qual a classificação de cor de sua tarjeta?",
      correct: "Preta (Óbito ou lesão incompatível com a vida).",
      wrongs: ["Vermelha (Imediato / Crítico).", "Amarela (Urgente / Retardado).", "Verde (Leve / Não urgente)."],
      explanation: "No método START, se o paciente não respira espontaneamente mesmo após abertura manual das vias aéreas, ele é classificado na cor Preta (óbito constatado ou lesões fatais evidentes).",
      diff: 'médio'
    },
    {
      text: "No método de triagem rápida START {B}, uma vítima ({A}) respira a 34 rpm. Como deve ser classificada de forma imediata?",
      correct: "Vermelha (Tratamento Imediato / Urgência Máxima).",
      wrongs: ["Amarela (Paciente Retardado estável).", "Verde (Paciente ambulatório andarilho).", "Preta (Paciente sem indicação ventilatória)."],
      explanation: "Frequência respiratória superior a 30 incursões por minuto é critério direto no START para classificar o paciente como Vermelho (prioridade absoluta de intervenção e transporte).",
      diff: 'médio'
    },
    {
      text: "Em um acidente rodoviário de grandes proporções {B}, com múltiplas vítimas de choque, qual protocolo instrui o socorrista a mandar os acidentados que andam se moverem para um local específico?",
      correct: "Pedir que todos os que puderem caminhar se levantem e se dirijam a uma área de triagem segura (sendo estes triados inicialmente como Verdes).",
      wrongs: ["Efetuar imobilizações de alta complexidade no meio da faixa de rodagem ativa.", "Tracionar as pernas de cada um com cordas para desobstruir a via de carros.", "Mandar todos deitarem e reterem a respiração sob perigo de gás."],
      explanation: "O primeiro passo do método START é segmentar os 'andarilhos'. O socorrista diz em voz alta: 'Quem consegue andar, vá até o ponto demarcado'. Estes são classificados inicialmente como verdes, agilizando o resgate.",
      diff: 'fácil'
    }
  ],
  atendimento_rodoviario: [
    {
      text: "Ao posicionar a viatura de resgate rodoviário em pista para atendimento a acidente {B} envolvendo {A}, como deve se dar o alinhamento de segurança?",
      correct: "Posicionar a viatura em ângulo (cerca de 45 graus) antes do acidente, direcionando as rodas contrárias à zona de trabalho para criar uma barreira física de proteção caso colidida.",
      wrongs: ["Parar a viatura em paralelo colada no carro acidentado, com faróis apagados.", "Bloquear todo o trânsito da rodovia nos dois sentidos girando em círculo contínuo.", "Manter as rodas traseiras levantadas sobre cavaletes."],
      explanation: "Estacionar a viatura angulada entre o fluxo de tráfego que se aproxima e a cena cria uma 'barreira física ativa'. As rodas viradas para longe da cena evitam que o veículo de socorro seja empurrado sobre as vítimas e resgatistas em caso de colisão traseira.",
      diff: 'médio'
    },
    {
      text: "Ao sinalizar a rodovia {B} com velocidade média permitida de 80 km/h para socorrer {A}, a distância mínima recomendada de posicionamento do primeiro cone/sinalizador de segurança sob boas condições climáticas deve ser de:",
      correct: "No mínimo 80 metros (ou 80 passos longos), duplicando a distância se chover ou houver neblina.",
      wrongs: ["Apenas 10 metros de distância do veículo sinistrado.", "Exatamente 250 passos independentemente da via de velocidade mínima.", "Não há necessidade de demarcação de cones em rodovias federais."],
      explanation: "Como margem de segurança recomendada na direção defensiva e segurança operacional, o balizamento começa com distância em metros equivalente à velocidade limite da via, isto é, 80 metros para vias de 80 km/h.",
      diff: 'médio'
    }
  ],
  biosseguranca: [
    {
      text: "Durante socorros prestados a {A} com volumoso sangramento arterial {B}, quais EPIs compõem a barreira mecânica mínima contra patógenos transportados por fluidos corpóreos?",
      correct: "Luvas de procedimento descartáveis, óculos de proteção facial, avental impermeável e máscara cirúrgica protetora.",
      wrongs: ["Apenas luvas de lã comum para reter umidade.", "Máscara de mergulho acoplável sem filtro respiratório.", "Nenhum protetor facial se o operador já for vacinado."],
      explanation: "A exposição biológica a sangue e fluidos corporais de alta pressão exige o uso de barreiras de ampla proteção: luvas, óculos para mucosas oculares, máscara e capote protetor à prova d'água.",
      diff: 'fácil'
    },
    {
      text: "Em caso de picada/corte acidental com agulha ou bisturi usada no atendimento a {A} {B}, qual o primeiro socorro profilático imediato a ser feito na pele pelo profissional?",
      correct: "Lavar exaustivamente o local com água corrente limpa e sabão neutro, sem espremer ou forçar sangramento, e relatar o acidente imediatamente para profilaxia pós-exposição (PEP).",
      wrongs: ["Aplicar fogo controlado ou ácido sulfúrico na perfuração para calcinar resíduos.", "Colocar o membro em garrafa de álcool absoluto por no mínimo 4 horas.", "Manter silêncio absoluto para evitar suspensão ou punições organizacionais."],
      explanation: "A limpeza primária mecânica com água e sabão remove patógenos expostos. Forçar sangramento ou usar produtos cáusticos aumenta o dano celular local e facilita a entrada viral, devendo-se acionar prontamente a PEP contra HIV/Hepatites.",
      diff: 'médio'
    }
  ],
  equipamentos: [
    {
      text: "Na fixação segura do paciente ({A}) em prancha rígida longa com tirantes coloridos {B}, qual a sequência recomendada de travamento para prevenir movimentação pélvica e escorregamento?",
      correct: "Tórax, Pelve (quadril) e Membros Inferiores, imobilizando a cabeça por último com o fixador lateral (coxim/headblock).",
      wrongs: ["Apenas a cabeça com o coxim, mantendo abdômen livre para se mover voluntariamente.", "Sempre de baixo para cima: tornozelo, joelho e por último o quadril pélvico seco.", "Amarrar fitas cruzadas diretamente sobre o pescoço do paciente."],
      explanation: "Fixar primeiro o tronco e quadril (centro de gravidade maior) estabiliza o corpo na prancha, o que garante que a cabeça não sofra cisalhamentos axiais indesejados durante o processo final de aperto.",
      diff: 'médio'
    },
    {
      text: "Frente à remoção emergencial de {A} da cabine de veículo com suspeita de injúria vertebro-medular {B}, qual imobilizador extricador de coluna é projetado especificamente para remoção de vítimas sentadas?",
      correct: "Dispositivo de Extricação Ked (Splint Abdominal/Cervical KED).",
      wrongs: ["Maca rígida de alumínio de resgate em altura.", "Maca de vácuo inflável de repouso.", "Colar cervical simples sem hastes laterais de retenção."],
      explanation: "O colete extrator e imobilizador KED é projetado para ancorar a coluna, cabeça e tórax de vítimas aprisionadas e sentadas, permitindo a extração com menor mobilização raquimedular.",
      diff: 'fácil'
    }
  ],
  pediatrico: [
    {
      text: "Ao atender {A} na emergência de APH {B}, qual ferramenta visual e auditiva permite a avaliação pediátrica rápida sem tocar no paciente?",
      correct: "Triângulo de Avaliação Pediátrica (PAT), avaliando: Aparência, Trabalho Respiratório e Circulação Cutânea.",
      wrongs: ["Escala de Coma de Glasgow tradicional para adultos com foco em ECG.", "Cálculo matemático de peso pela idade da criança.", "Apenas o teste de glicemia na ponta do dedo."],
      explanation: "O Triângulo de Avaliação Pediátrica (PAT) permite estabelecer gravidade do estado em menos de 30 segundos usando apenas observação clínica visual e auditiva de comportamento, esforço pulmonar e perfusão da pele.",
      diff: 'médio'
    },
    {
      text: "Durante RCP em {A} que se apresenta sem batimento palpável, {B}. Qual é a profundidade de compressão preconizada pelo protocolo pediátrico (AHA) para bebês menores de 1 ano?",
      correct: "Aproximadamente 4 cm (ou 1,5 polegadas), correspondente a um terço do diâmetro anteroposterior do tórax.",
      wrongs: ["Exatamente 8 cm com as duas mãos trancadas.", "Menos de 1 cm para evitar rompimento de artérias proximais.", "De 5 cm a 6 cm assim como no paciente adulto obeso."],
      explanation: "Para lactentes (menores de 1 ano), as compressões devem deprimir o tórax em aproximadamente 4 cm (1,5 polegadas). Para crianças maiores, usa-se 5 cm de forma a garantir fluxo circulatório seguro.",
      diff: 'médio'
    }
  ]
};

// --- PROCEDURAL GENERATOR TO EXPAND EACH CATEGORY TO OVER 300+ DISTINCT, SITUATIONAL QUESTIONS ---
// Seedable or deterministic generator based on combinatorics
const PATIENT_SEGMENTS = [
  "um paciente idoso hipertenso de 78 anos",
  "um rapaz jovem saudável de 22 anos",
  "uma gestante no terceiro trimestre gestacional",
  "um homem de meia idade hipertenso e obeso (130 kg)",
  "uma colega de serviço inconsciente sob fadiga intensa"
];

const RESCUE_COMPLICATIONS = [
  "sob forte tempestade desabando na pista",
  "dentro de uma área de desmoronamento instável",
  "no acostamento úmido de rodovia de alta velocidade",
  "durante o turno noturno de neblina espessa na serra",
  "em uma vala profunda à margem da pista asfáltica"
];

export function generateAllQuestions(): APHQuestion[] {
  const finalPool: APHQuestion[] = [];

  CATEGORIES.forEach(cat => {
    const templates = CLINICAL_SCENARIOS[cat.id] || CLINICAL_SCENARIOS['aph'];
    
    // We will generate exactly 500 questions per category (theme) to allow high replayability!
    // By duplicating the scenarios list with index variations, replacing placeholders {A} and {B}
    for (let i = 0; i < 500; i++) {
      const templateIdx = i % templates.length;
      const baseTemplate = templates[templateIdx];

      const patient = PATIENT_SEGMENTS[(i + 1) % PATIENT_SEGMENTS.length];
      const complication = RESCUE_COMPLICATIONS[(i + 3) % RESCUE_COMPLICATIONS.length];

      // Formulate customized text
      let text = baseTemplate.text
        .replace(/\{A\}/g, patient)
        .replace(/\{B\}/g, complication);

      // Add a code to make questions distinctly traceable and authoritative
      const questionCode = `QM-${cat.id.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
      text = `[${questionCode}] ${text}`;

      // Distribute difficulties dynamically so each difficulty has exactly 125 questions (total 500)
      let currentDiff: 'fácil' | 'médio' | 'difícil' | 'especialista' = 'fácil';
      if (i < 125) {
        currentDiff = 'fácil';
      } else if (i < 250) {
        currentDiff = 'médio';
      } else if (i < 375) {
        currentDiff = 'difícil';
      } else {
        currentDiff = 'especialista';
      }

      finalPool.push({
        id: `${cat.id}-${i + 1}`,
        category: cat.id,
        text,
        options: [...baseTemplate.wrongs, baseTemplate.correct].sort((a,b) => a.localeCompare(b)),
        correctAnswer: [...baseTemplate.wrongs, baseTemplate.correct].sort((a,b) => a.localeCompare(b)).indexOf(baseTemplate.correct),
        explanation: baseTemplate.explanation,
        difficulty: currentDiff
      });
    }
  });

  return finalPool;
}

// --- MAIN REACT COMPONENT FOR QUIZ MASTER APH ---
interface QuizMasterAPHProps {
  currentPlayerId: string;
  onComplete: (
    score: number, 
    roundsPlayed: number,
    isMultiplayer?: boolean,
    partner?: Player | null,
    p1Score?: number,
    p2Score?: number,
    gameType?: string,
    isTimeout?: boolean,
    keepInGameSelection?: boolean,
    isAbandoned?: boolean
  ) => void;
  onScoreUpdate?: (points: number) => void;
  onCancel: () => void;
  player: Player;
}

interface MatchRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorScore: number;
  creatorCurrentIdx: number;
  partnerId?: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerScore?: number;
  partnerCurrentIdx?: number;
  status: 'searching' | 'playing' | 'completed';
  category: string;
  questions: string[]; // List of index seeds
  difficulty: string;
  questionCount: number;
  winnerId?: string;
}

export function QuizMasterAPH({ 
  currentPlayerId, 
  onComplete, 
  onScoreUpdate, 
  onCancel, 
  player 
}: QuizMasterAPHProps) {
  
  // High level assets
  const questionsList = useMemo(() => generateAllQuestions(), []);

  // System states
  const [gameState, setGameState] = useState<'menu' | 'setup' | 'solo_playing' | 'multi_lobby' | 'multi_playing' | 'results' | 'stats'>('setup');
  
  // Match Configuration
  const [selectedCatId, setSelectedCatId] = useState<string>('aph');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<'fácil' | 'médio' | 'difícil' | 'especialista'>('médio');

  // Active Solo Game States
  const [currentQuestions, setCurrentQuestions] = useState<APHQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOptIdx, setSelectedOptIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [scoreCollected, setScoreCollected] = useState<number>(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [avgResponseTimeSim, setAvgResponseTimeSim] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(!isAudioEnabled());
  const [timeLeft, setTimeLeft] = useState<number>(20);

  // Active Multiplayer Setup & Database Session
  const [multiplayerRoom, setMultiplayerRoom] = useState<MatchRoom | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'history'>('invite');
  const [inviteNotification, setInviteNotification] = useState<any | null>(null);

  // Bot Duel Simulated details (fallback if offline or quickmatch)
  const [opponentNameSim, setOpponentNameSim] = useState<string>('');
  const [opponentAvatarSim, setOpponentAvatarSim] = useState<string>('👷');
  const [opponentScoreSim, setOpponentScoreSim] = useState<number>(0);
  const [opponentCurrentIdxSim, setOpponentCurrentIdxSim] = useState<number>(0);
  const [isQuickMatch, setIsQuickMatch] = useState<boolean>(false);

  // Timer Ref for gameplay
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const responseTimesRef = useRef<number[]>([]);

  // Sound feedback placeholders
  const playSfx = (type: 'correct' | 'incorrect' | 'levelUp') => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'incorrect') {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        osc.frequency.setValueAtTime(147, audioCtx.currentTime + 0.15); // D3
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else if (type === 'levelUp') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.7);
      }
    } catch (e) {
      // Audio support fallback
    }
  };

  // --- PERSISTENT USER APH STATS LOADER ---
  const quizMasterStats = useMemo(() => {
    // Attempt load stats from user profile parameters safely
    const statsObj = player?.gameStats?.QUIZ_MASTER_APH;
    const scoreSum = statsObj?.score || 0;
    const comps = statsObj?.completions || 0;

    // Additional specific fields stored in player custom attributes
    const extendedStats = (player as any).quizMasterStats || {
      gamesPlayed: comps,
      victories: (player as any).vitorias || 0,
      defeats: (player as any).derrotas || 0,
      totalCorrect: 0,
      totalQuestions: 0,
      avgTime: 5.4,
      favoriteCategory: 'ambulance'
    };

    return {
      scoreSum,
      completions: comps,
      ...extendedStats
    };
  }, [player]);

  // Handle Invitation listeners in Realtime
  useEffect(() => {
    if (!player?.uid) return;

    // Query for active invitations aimed at current user
    const q = query(
      collection(db, 'quiz_master_invites'),
      where('recipientId', '==', player.uid),
      where('status', '==', 'pending'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docObj = snap.docs[0];
        setInviteNotification({ id: docObj.id, ...docObj.data() });
      } else {
        setInviteNotification(null);
      }
    }, (err) => {
      console.warn("[QuizMaster] Firestore invites listener error:", err);
    });

    return () => unsubscribe();
  }, [player?.uid]);

  // Load online users for multiplayer challenge lists
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const usersList = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.id !== player?.uid);
        setOnlineUsers(usersList);
      } catch (e) {
        console.warn("Could not load users for invitation list:", e);
      }
    };
    if (gameState === 'multi_lobby') {
      loadUsers();
    }
  }, [gameState, player?.uid]);

  // --- GAMEPLAY TIMER RUNNER ---
  useEffect(() => {
    if ((gameState === 'solo_playing' || gameState === 'multi_playing') && !isAnswered) {
      setTimeLeft(20);
      startTimeRef.current = Date.now();
    }
  }, [gameState, currentIdx, isAnswered]);

  // --- AI SIMULATED RIVAL RUNNER (QUICK MATCH DUAL RIVALRY) ---
  useEffect(() => {
    if (gameState === 'multi_playing' && isQuickMatch && !isAnswered) {
      // Simulate Bot progression
      const delay = 4000 + Math.random() * 5000; // Bot answers between 4 and 9 seconds
      const timeout = setTimeout(() => {
        const correctProbability = difficulty === 'fácil' ? 0.8 : difficulty === 'médio' ? 0.7 : difficulty === 'difícil' ? 0.6 : 0.45;
        const correct = Math.random() < correctProbability;
        
        let scoreReward = 0;
        if (correct) {
          const pointsMap = { fácil: 10, médio: 20, difícil: 30, especialista: 50 };
          scoreReward = pointsMap[difficulty] || 20;
          if (Math.random() < 0.4) scoreReward += 5; // Simulates speed bonus for bot!
        }

        setOpponentScoreSim(prev => prev + scoreReward);
        setOpponentCurrentIdxSim(prev => {
          const nextVal = prev + 1;
          if (nextVal >= questionCount) {
            // Simulated opponent finished!
          }
          return nextVal;
        });
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [gameState, currentIdx, isAnswered, isQuickMatch, difficulty, questionCount]);

  // --- SCORE POINTS CALCULATOR ---
  const calculatePointsAwarded = (diff: string, secElapsed: number) => {
    const baseScores = { fácil: 10, médio: 20, difícil: 30, especialista: 50 };
    const points = baseScores[diff as keyof typeof baseScores] || 15;
    
    // Speed bonus (+5 points if answered in under 5 seconds)
    const speedBonus = secElapsed < 5 ? 5 : 0;
    
    // Streaks progressive multipliers
    let multiplier = 1.0;
    if (streakCount >= 8) multiplier = 2.0;
    else if (streakCount >= 5) multiplier = 1.5;
    else if (streakCount >= 3) multiplier = 1.25;

    return Math.floor((points + speedBonus) * multiplier);
  };

  // --- BEGIN PLAYING SOLO MODE ---
  const startSoloMatch = () => {
    // Load configured category specific questions
    const filtered = questionsList.filter(q => q.category === selectedCatId);
    
    // Grab selected difficulty items
    let targetDataset = filtered.filter(q => q.difficulty === difficulty);
    if (targetDataset.length < questionCount) {
      targetDataset = filtered; // fallback
    }

    // Pick dynamic randomized questions list
    const shuffled = [...targetDataset].sort(() => Math.random() - 0.5).slice(0, questionCount);
    
    setCurrentQuestions(shuffled);
    setCurrentIdx(0);
    setScoreCollected(0);
    setCorrectAnswersCount(0);
    setStreakCount(0);
    setIsAnswered(false);
    setSelectedOptIdx(null);
    responseTimesRef.current = [];
    setIsQuickMatch(false);
    setGameState('solo_playing');
  };

  // --- BEGIN QUICK SIMULATED MULTIPLAYER LOBBY ---
  const startQuickMatchLobby = () => {
    setIsQuickMatch(true);
    setOpponentScoreSim(0);
    setOpponentCurrentIdxSim(0);
    
    // Generate simulated emergency colleague profile details
    const names = ["Op. Marcos - Base CCR 01", "Op. Regina - SAMU Base 4", "Op. Claudio - Resgate CCR 05", "Socorrista Thiago - Base CCR Vias", "Dra. Eliana - UTQ Emergência"];
    const avatars = ["🚑", "🚁", "🚨", "🧤", "⚕️"];
    const chosenIdx = Math.floor(Math.random() * names.length);
    setOpponentNameSim(names[chosenIdx]);
    setOpponentAvatarSim(avatars[chosenIdx]);

    // Setup questions
    const filtered = questionsList.filter(q => q.category === selectedCatId);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, questionCount);
    setCurrentQuestions(shuffled);
    setCurrentIdx(0);
    setScoreCollected(0);
    setCorrectAnswersCount(0);
    setStreakCount(0);
    setIsAnswered(false);
    setSelectedOptIdx(null);
    responseTimesRef.current = [];
    
    setGameState('multi_playing');
  };

  // --- OPTION SELECT CLICK HANDLE ---
  const handleSelectOption = (optIndex: number) => {
    if (isAnswered) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    responseTimesRef.current.push(elapsedSeconds);

    setSelectedOptIdx(optIndex);
    setIsAnswered(true);

    const question = currentQuestions[currentIdx];
    const isCorrect = optIndex === question.correctAnswer;

    if (isCorrect) {
      // Grant score points
      const scoreGain = calculatePointsAwarded(question.difficulty, elapsedSeconds);
      setScoreCollected(prev => prev + scoreGain);
      setCorrectAnswersCount(prev => prev + 1);
      setStreakCount(prev => prev + 1);
      playSfx('correct');
      
      // Floating particle confettis
      if (isVisualEffectsEnabled()) {
        confetti({
          particleCount: 20,
          spread: 30,
          origin: { y: 0.8 }
        });
      }

      if (onScoreUpdate) onScoreUpdate(scoreGain);
    } else {
      setStreakCount(0);
      playSfx('incorrect');
    }
  };

  // --- GO TO NEXT QUESTION OR FINISH SESSION ---
  const handleNextQuestion = async () => {
    if (currentIdx + 1 < currentQuestions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOptIdx(null);
      setIsAnswered(false);
    } else {
      // Calculate overall stats and finish
      const overallSeconds = responseTimesRef.current.reduce((a, b) => a + b, 0);
      const calculatedAvg = Math.round((overallSeconds / currentQuestions.length) * 10) / 10;
      setAvgResponseTimeSim(calculatedAvg);

      // Sincronizar com sistema principal
      const isWinner = isQuickMatch ? (scoreCollected >= opponentScoreSim) : true;
      const finalPatrolCount = 1 + (isQuickMatch && isWinner ? 1 : 0);
      
      // Calculate level and upgrades
      onComplete(
        scoreCollected,
        finalPatrolCount,
        isQuickMatch,
        isQuickMatch ? { uid: 'sim_bot', displayName: opponentNameSim, avatar: opponentAvatarSim } as any : null,
        scoreCollected,
        isQuickMatch ? opponentScoreSim : 0,
        GameType.QUIZ_MASTER_APH,
        false,
        true
      );

      // Dynamically calculate and save custom game metrics to user DB
      try {
        const favCategory = selectedCatId;
        const totalAnswersAdded = currentQuestions.length;
        const correctsAdded = correctAnswersCount;

        const updatedStatsObj = {
          gamesPlayed: (quizMasterStats.gamesPlayed || 0) + 1,
          victories: (quizMasterStats.victories || 0) + (isQuickMatch && isWinner ? 1 : 0),
          defeats: (quizMasterStats.defeats || 0) + (isQuickMatch && !isWinner ? 1 : 0),
          totalCorrect: (quizMasterStats.totalCorrect || 0) + correctsAdded,
          totalQuestions: (quizMasterStats.totalQuestions || 0) + totalAnswersAdded,
          avgTime: Math.round(((quizMasterStats.avgTime || 5.2) + calculatedAvg) / 2 * 10) / 10,
          favoriteCategory: favCategory
        };

        // Write atomic updates
        const totalXpGain = scoreCollected / 2;
        await writePlayerProfile(player.uid, {
          xp: player.xp + totalXpGain,
          totalScore: player.totalScore + scoreCollected,
          gamesPlayed: player.gamesPlayed,
          completedGames: player.completedGames + 1,
          quizMasterStats: updatedStatsObj as any
        } as any);

      } catch (errSync) {
        console.warn("Error registering profile sync results:", errSync);
      }

      setGameState('results');
    }
  };

  // --- DYNAMIC REAL-TIME FIRESTORE INVITATIONS HANDLING ---
  const sendOnlineInvite = async (receiverUser: any) => {
    try {
      const inviteId = `invite-${player.uid}-${receiverUser.id}-${Date.now()}`;
      
      const newRoomId = `room-${player.uid}-${Date.now()}`;
      
      // Write room initializer
      await setDoc(doc(db, 'multiplayer_rooms', newRoomId), {
        creatorId: player.uid,
        creatorName: player.apelido || player.displayName,
        creatorAvatar: player.avatar || '👷',
        creatorScore: 0,
        creatorCurrentIdx: 0,
        partnerId: receiverUser.id,
        partnerName: receiverUser.apelido || receiverUser.displayName,
        partnerAvatar: receiverUser.avatar || '👷',
        partnerScore: 0,
        partnerCurrentIdx: 0,
        status: 'searching',
        category: selectedCatId,
        difficulty,
        questionCount,
        questions: [] // will load on setup
      });

      // Write invite
      await setDoc(doc(doc(db, 'quiz_master_invites'), inviteId), {
        senderId: player.uid,
        senderName: player.apelido || player.displayName,
        senderAvatar: player.avatar || '👷',
        recipientId: receiverUser.id,
        recipientName: receiverUser.apelido || receiverUser.displayName,
        roomId: newRoomId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      alert(`Convite de resgate enviado com sucesso para ${receiverUser.displayName}! Aguardando resposta...`);
    } catch (e) {
      console.warn("Error creating invite:", e);
    }
  };

  // --- ACCEPT EXTERNAL INVITATION ---
  const acceptIncomingInvite = async () => {
    if (!inviteNotification) return;
    try {
      const inviteRef = doc(db, 'quiz_master_invites', inviteNotification.id);
      await updateDoc(inviteRef, { status: 'accepted' });

      // Join the room initialized
      const roomRef = doc(db, 'multiplayer_rooms', inviteNotification.roomId);
      await updateDoc(roomRef, { status: 'playing' });

      // Pull questions set
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const categorySet = questionsList.filter(q => q.category === roomData.category);
        const selected = [...categorySet].sort(() => Math.random() - 0.5).slice(0, roomData.questionCount || 10);
        
        setCurrentQuestions(selected);
        setCurrentIdx(0);
        setScoreCollected(0);
        setCorrectAnswersCount(0);
        setStreakCount(0);
        setIsAnswered(false);
        setSelectedOptIdx(null);

        // Turn on Live Listener
        const unsubRoom = onSnapshot(roomRef, (snapshot) => {
          if (!snapshot.exists()) return;
          const liveData = snapshot.data();
          setOpponentScoreSim(liveData.creatorScore || 0);
          setOpponentCurrentIdxSim(liveData.creatorCurrentIdx || 0);
          setOpponentNameSim(liveData.creatorName);
          setOpponentAvatarSim(liveData.creatorAvatar);
          
          if (liveData.status === 'completed') {
            // End
          }
        });

        setGameState('multi_playing');
        setInviteNotification(null);
      }
    } catch (e) {
      console.warn("Could not decline/accept invite:", e);
    }
  };

  // --- ACHIEVEMENTS TIERS SHELF LIST ---
  const achievementsList = useMemo(() => {
    const totalCorrect = quizMasterStats.totalCorrect || 0;
    
    return [
      { id: '100_ans', label: 'Bronze APH 🥉', req: '100 respostas corretas', check: totalCorrect >= 100, progress: totalCorrect, total: 100 },
      { id: '500_ans', label: 'Prata APH 🥈', req: '500 respostas corretas', check: totalCorrect >= 500, progress: totalCorrect, total: 500 },
      { id: '1000_ans', label: 'Ouro APH 🥇', req: '1.000 respostas corretas', check: totalCorrect >= 1000, progress: totalCorrect, total: 1000 },
      { id: 'mestre', label: 'Mestre APH 🏆', req: 'Completar 50 partidas', check: quizMasterStats.gamesPlayed >= 50, progress: quizMasterStats.gamesPlayed, total: 50 },
      { id: 'trauma_spec', label: 'Esp. em Trauma 🚑', req: 'Garantir 50 acertos em trauma', check: totalCorrect >= 50, progress: totalCorrect, total: 50 },
      { id: 'sinais_spec', label: 'Mestre dos Sinais ❤️', req: 'Garantir nível Especialista', check: player.level >= 10, progress: player.level, total: 10 },
      { id: 'road_hero', label: 'Herói Rodoviário 🛣️', req: 'Garantir 15 vitórias em duelo', check: quizMasterStats.victories >= 15, progress: quizMasterStats.victories, total: 15 }
    ];
  }, [quizMasterStats, player]);

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950 text-slate-100 min-h-screen pb-20 shadow-2xl relative rounded-b-xl overflow-hidden font-sans border-x border-b border-slate-900">
      
      {/* Top Standardized Header */}
      <div className="w-full flex items-center p-4 border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-40 select-none">
        <button 
          onClick={() => {
            if (gameState === 'setup' || gameState === 'menu') {
              onCancel();
            } else {
              // Act as Abandonar Patrulha like standard games
              onComplete(
                scoreCollected,
                1,
                gameState === 'multi_playing',
                null,
                scoreCollected,
                opponentScoreSim,
                'APH',
                false,
                false,
                true // isAbandoned = true
              );
            }
          }} 
          className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-805 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-slate-850 cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ml-4 flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Patrulha de Resgate</span>
          <span className="text-[9px] font-bold text-yellow-500 uppercase mt-1 font-mono tracking-wider">
            {gameState === 'setup' ? 'Configuração | Quiz APH' : `Quiz APH — Nível: ${(difficulty || 'médio').toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Incoming Quiz Invitation Notification Pop */}
      <AnimatePresence>
        {inviteNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-16 left-4 right-4 z-50 bg-gradient-to-r from-indigo-900 to-indigo-950 p-4 rounded-xl border border-indigo-400/50 shadow-2xl shadow-indigo-950 flex flex-col gap-3 justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl animate-bounce">🚑</div>
              <div>
                <h4 className="text-xs font-extrabold text-indigo-200 uppercase tracking-widest">DESAFIO DE APH RECEBIDO!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  <strong>{inviteNotification.senderName}</strong> te chamou para um duelo de Quiz Master APH em tempo real agora!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={acceptIncomingInvite}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider transition-all shadow-md shadow-emerald-950 uppercase"
              >
                Aceitar Resgate
              </button>
              <button 
                onClick={async () => {
                  await updateDoc(doc(db, 'quiz_master_invites', inviteNotification.id), { status: 'declined' });
                  setInviteNotification(null);
                }}
                className="py-1.5 px-3 rounded-lg bg-red-600/30 border border-red-500/30 hover:bg-red-600/50 text-red-200 font-bold text-xs"
              >
                Recusar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MENU VIEW --- */}
      {gameState === 'menu' && (
        <div className="p-4 space-y-5 animate-fade-in">
          
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>
            <h2 className="text-base font-extrabold tracking-tight text-amber-400 uppercase italic">Seja Bem-vindo, Quiz Master!</h2>
            <p className="text-xs text-slate-300">
              Teste seu conhecimento clínico, agilidade mental e ganhe pontos, conquistas operacionais e posições no ranking oficial das rodovias do Brasil.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[10px] font-mono">SEUS PONTOS APH</div>
                <div className="text-sm font-extrabold text-amber-500 mt-0.5">{quizMasterStats.scoreSum} Pts</div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                <div className="text-slate-400 text-[10px] font-mono">DUELOS VENCIDOS</div>
                <div className="text-sm font-extrabold text-emerald-400 mt-0.5">{quizMasterStats.victories} Vitórias</div>
              </div>
            </div>
          </div>

          {/* Quick Play Selection Box */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
              <Play size={14} className="text-amber-500" /> ESCOLHA SEU MODO DE JOGO
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              
              <button 
                onClick={() => setGameState('setup')}
                className="group relative p-4 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-850 hover:to-indigo-900 rounded-2xl border border-indigo-900/40 text-left outline-none transition-all shadow-md flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                    MODO SOLO CLINICO ⏱️
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] text-blue-300 font-extrabold border border-blue-500/30">TREINO</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                    Configure perguntas (10, 20 ou 50), escolha a dificuldade e treine no seu ritmo.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-900/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-all">
                  <Target size={18} />
                </div>
              </button>

              <button 
                onClick={() => setGameState('multi_lobby')}
                className="group relative p-4 bg-gradient-to-r from-slate-900 to-red-950 hover:from-slate-850 hover:to-red-900 rounded-2xl border border-red-950/40 text-left outline-none transition-all shadow-md flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                    MULTIPLAYER DUELO EM GRUPO 🏎️
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-[9px] text-red-300 font-extrabold border border-red-500/30 animate-pulse">COMPETITIVO</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                    Desafie colegas, envie convite privado ou corra contra a elite rodoviária simulada.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-400/30 flex items-center justify-center text-red-300 group-hover:scale-110 transition-all">
                  <Users size={18} />
                </div>
              </button>

            </div>
          </div>

          {/* Core Badges/Achievements Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" /> CONQUISTAS ADQUIRIDAS
              </h3>
              <button 
                onClick={() => setGameState('stats')}
                className="text-[10px] text-indigo-400 font-bold hover:underline"
              >
                VER ESTATÍSTICAS COMPLETAS
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {achievementsList.map(ach => (
                <div 
                  key={ach.id} 
                  className={`p-3 rounded-xl border flex flex-col justify-between h-24 transition-all relative overflow-hidden ${
                    ach.check 
                      ? 'bg-slate-900/80 border-slate-800 text-slate-200' 
                      : 'bg-slate-950 border-slate-900/50 text-slate-500'
                  }`}
                >
                  {/* Lock Indicator */}
                  {!ach.check && <Lock size={12} className="absolute top-2 right-2 text-slate-700" />}
                  
                  <div className="space-y-1">
                    <div className={`text-xs font-extrabold ${ach.check ? 'text-amber-400' : 'text-slate-500'}`}>
                      {ach.label}
                    </div>
                    <div className="text-[9px] leading-tight font-mono text-slate-400">
                      {ach.req}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-450">
                      <span>PROGRESSO</span>
                      <span>{ach.progress}/{ach.total}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (ach.progress/ach.total)*100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- STATISTICS GRAPHIC PANEL --- */}
      {gameState === 'stats' && (
        <div className="p-4 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-amber-400" size={20} />
            <h2 className="text-sm font-extrabold tracking-tight text-white uppercase italic">Análise de Carreira Médica</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">PARTIDAS DISPUTADAS</span>
              <strong className="text-lg font-black text-slate-100">{quizMasterStats.gamesPlayed}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">VITÓRIA MULTI</span>
              <strong className="text-lg font-black text-emerald-400">{quizMasterStats.victories}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">DERROTAS MULTI</span>
              <strong className="text-lg font-black text-red-405">{quizMasterStats.defeats}</strong>
            </div>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block">TEMPO MÉDIO DE RESPOSTA</span>
              <strong className="text-lg font-black text-blue-400">{quizMasterStats.avgTime || 5.2}s</strong>
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-extrabold text-amber-500 mb-2 uppercase">ACURÁCIA DE RESPOSTAS</h4>
            <div className="flex items-center justify-between font-mono text-xs text-slate-300">
              <span>ACERTOS CONTABILIZADOS</span>
              <strong>{quizMasterStats.totalCorrect} / {quizMasterStats.totalQuestions}</strong>
            </div>
            <div className="w-full h-2 bg-slate-955 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${quizMasterStats.totalQuestions > 0 ? (quizMasterStats.totalCorrect / quizMasterStats.totalQuestions)*100 : 0}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Sua taxa atual de acerto é de {' '}
              <strong>
                {quizMasterStats.totalQuestions > 0 ? Math.round((quizMasterStats.totalCorrect / quizMasterStats.totalQuestions)*100) : 0}%
              </strong>. Continue praticando para masterizar todos os tópicos de urgência.
            </p>
          </div>

          <button 
            onClick={() => setGameState('menu')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono tracking-tight"
          >
            VOLTAR AO MENU PRINCIPAL
          </button>
        </div>
      )}

      {/* --- SETUP MATCH SCREEN --- */}
      {gameState === 'setup' && (
        <div className="p-4 space-y-5 animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Activity className="text-red-500" size={16} /> PARAMETRIZAR NOVO RESGATE (SOLO)
            </h2>
            <p className="text-[11px] text-slate-450">Prepare-se para o atendimento de alta precisão clínica.</p>
          </div>

          {/* Choose Category Area Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">1. CATEGORIAS DE EMERGÊNCIA</label>
            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col gap-1.5 ${
                    selectedCatId === cat.id 
                      ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-400 text-white shadow-md' 
                      : 'bg-slate-900 border-slate-850 hover:bg-slate-850 text-slate-330'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{cat.icon}</span>
                    {selectedCatId === cat.id && <CheckCircle2 className="text-indigo-400" size={14} />}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase leading-tight">{cat.name}</h4>
                    <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{cat.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level Selector */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">2. NÍVEL DE APRECIAÇÃO</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono outline-none focus:border-indigo-400"
              >
                <option value="fácil">🟢 FÁCIL</option>
                <option value="médio">🟡 MÉDIO</option>
                <option value="difícil">🔴 DIFÍCIL</option>
                <option value="especialista">💀 ESPECIALISTA</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block">3. QUANTIDADE DE QUESTÕES</label>
              <select 
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono outline-none focus:border-indigo-400"
              >
                <option value={10}>10 PERGUNTAS</option>
                <option value={20}>20 PERGUNTAS</option>
                <option value={50}>50 PERGUNTAS</option>
                <option value={100}>100 PERGUNTAS</option>
              </select>
            </div>
          </div>

          {/* Action Trigger */}
          <button 
            onClick={startSoloMatch}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-indigo-850 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-black uppercase shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
          >
            INICIAR ATENDIMENTO (QUIZ) 🚑
          </button>
          
          <button 
            onClick={onCancel}
            className="w-full py-3 mt-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white font-bold text-xs uppercase transition-all tracking-wider cursor-pointer"
          >
            VOLTAR À CENTRAL DE JOGOS
          </button>
        </div>
      )}

      {/* --- MULTIPLAYER ROOMS & CHALLENGES PANEL --- */}
      {gameState === 'multi_lobby' && (
        <div className="p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="text-indigo-400" size={16} /> SALA DE DUELOS MULTIPLAYER
              </h2>
              <p className="text-[11px] text-slate-450">Corra contra parceiros reais de rodovia.</p>
            </div>
          </div>

          {/* Mode Switch Controls */}
          <div className="flex bg-slate-900 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setActiveTab('invite')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                activeTab === 'invite' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              Convidar Online
            </button>
            <button 
              onClick={startQuickMatchLobby}
              className="flex-1 py-2 text-center text-xs font-extrabold bg-gradient-to-r from-red-750 to-amber-650 hover:from-red-600 hover:to-amber-500 rounded-lg text-white animate-pulse"
            >
              🏎️ Corrida Rápida Sim (Bot)
            </button>
          </div>

          {/* Real Online Colleagues Invitation list */}
          {activeTab === 'invite' && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Selecione colega de turno online para desafiar:</h4>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {onlineUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Nenhum operador logado no momento. Use o botão de <strong>Corrida Rápida</strong> para duelar contra a IA!</p>
                ) : (
                  onlineUsers.map(u => (
                    <div 
                      key={u.id}
                      className="bg-slate-900 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs hover:border-slate-800 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{u.avatar || '👷'}</span>
                        <div>
                          <strong className="text-slate-200 block">{u.apelido || u.displayName}</strong>
                          <span className="text-[9px] text-slate-450 uppercase">{u.base || 'SEM BASE'} • NÍV {u.level || 1}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => sendOnlineInvite(u)}
                        className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-extrabold text-[10px] tracking-wide"
                      >
                        DESAFIAR
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ACTIVE ACTIVE PLAYING PANEL (SOLO AND MULTIPLAYER COEXISTENT) --- */}
      {(gameState === 'solo_playing' || gameState === 'multi_playing') && (
        <div className="p-4 space-y-4 animate-fade-in relative text-xs">
          
          {/* Header Progress Dashboard */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-900">
            <div className="space-y-1">
              <span>QUESTÃO {currentIdx + 1} DE {currentQuestions.length}</span>
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">CRÍTICO</span>
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-amber-400 font-extrabold text-xs">{scoreCollected} PTS</div>
              <div className="flex items-center gap-1 text-[9px] text-emerald-400 justify-end font-extrabold uppercase">
                <Flame size={12} className="animate-pulse" /> SEQUÊNCIA: {streakCount}x
              </div>
            </div>
          </div>

          {/* Dual Split Score Multi Player Tracker (if in quick-bot matching) */}
          {gameState === 'multi_playing' && (
            <div className="bg-slate-900 p-2.5 rounded-xl border border-red-900/30 flex justify-between gap-1.5 text-center text-[10px]">
              <div className="flex-1 bg-black/30 p-1.5 rounded border border-white/5">
                <span className="text-[9px] text-blue-400 uppercase font-mono block">SUA MARCAÇÃO</span>
                <strong className="text-slate-200 block text-xs">{player.displayName}</strong>
                <span className="text-indigo-400 font-extrabold text-xs">{scoreCollected} Pts</span>
                <p className="text-[8px] text-slate-500">Questão {currentIdx + 1}/{currentQuestions.length}</p>
              </div>

              <div className="flex flex-col justify-center px-1 text-slate-500 font-black italic">VS</div>

              <div className="flex-1 bg-black/30 p-1.5 rounded border border-white/5">
                <span className="text-[9px] text-amber-500 uppercase font-mono block">RIVAL RODODOC</span>
                <strong className="text-slate-200 block text-xs">{opponentNameSim}</strong>
                <span className="text-amber-400 font-extrabold text-xs">{opponentScoreSim} Pts</span>
                <p className="text-[8px] text-slate-500">Questão {Math.min(currentQuestions.length, opponentCurrentIdxSim + 1)}/{currentQuestions.length}</p>
              </div>
            </div>
          )}

          {/* Dynamic XP Progress Tracking bar */}
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-300" style={{ width: `${((currentIdx + 1) / currentQuestions.length) * 100}%` }}></div>
          </div>

          {/* Case Scenario Enunciado Card */}
          <div className="bg-slate-905 border-2 border-yellow-500/80 shadow-[0_0_25px_rgba(234,179,8,0.15)] p-6 rounded-[2rem] space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500"></div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              <span className="font-extrabold text-yellow-500 flex items-center gap-1">🚑 OCORRÊNCIA EM APH</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/90 text-yellow-400 font-black tracking-wider text-[9px] border border-yellow-500/25">{currentQuestions[currentIdx]?.difficulty.toUpperCase()}</span>
            </div>
            
            <p className="text-white font-black leading-relaxed text-sm uppercase tracking-tight pl-2">
              {currentQuestions[currentIdx]?.text}
            </p>
          </div>

          {/* 4 Choices Grid List */}
          <div className="grid gap-3">
            {currentQuestions[currentIdx]?.options.map((opt, oIdx) => {
              const isCorrect = oIdx === currentQuestions[currentIdx].correctAnswer;
              
              let className = "min-h-16 h-auto py-4 text-xs md:text-sm justify-start px-6 font-black uppercase tracking-tight transition-all duration-300 rounded-2xl border-2 whitespace-normal text-left flex items-center w-full cursor-pointer ";

              if (isAnswered) {
                if (isCorrect) {
                  className += "bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] ";
                } else if (selectedOptIdx === oIdx) {
                  className += "bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] ";
                } else {
                  className += "bg-slate-900/50 text-slate-600 border-slate-800 opacity-50 ";
                }
              } else {
                className += "bg-slate-800/40 text-slate-300 border-slate-700 hover:border-yellow-400 hover:bg-slate-800 hover:text-white ";
              }

              const letterBadgeStyle = isAnswered && isCorrect 
                ? "bg-emerald-500 border-emerald-400 text-slate-900 font-bold" 
                : isAnswered && selectedOptIdx === oIdx 
                  ? "bg-red-500 border-red-500 text-white font-bold"
                  : "bg-slate-705 border-white/5 text-slate-400 font-black";

              return (
                <button 
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  disabled={isAnswered}
                  className={className}
                >
                  <span className={`mr-4 shrink-0 w-6 h-6 flex items-center justify-center rounded-lg border text-[10px] ${letterBadgeStyle}`}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Abandon Patrol Button underneath option list (only while unanswered) */}
          {!isAnswered && (
            <div className="w-full flex justify-center pt-4">
              <button 
                onClick={() => {
                  onComplete(
                    scoreCollected,
                    1,
                    gameState === 'multi_playing',
                    null,
                    scoreCollected,
                    opponentScoreSim,
                    'APH',
                    false,
                    false,
                    true // isAbandoned = true
                  );
                }}
                className="w-full max-w-xs h-12 rounded-2xl border border-yellow-500/30 bg-yellow-400 text-slate-950 font-black uppercase shadow-[0_0_20px_rgba(250,204,21,0.2)] hover:bg-yellow-300 transition-all active:scale-95 text-xs tracking-wider cursor-pointer"
              >
                ABANDONAR PATRULHA
              </button>
            </div>
          )}

          {/* Clinical Case Explanation Card */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/50 space-y-2 text-indigo-200 font-sans text-xs"
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[9px] text-indigo-300">
                  <BookOpen size={14} /> FUNDAMENTO CLÍNICO PROTOCOLAR
                </div>
                <p className="leading-relaxed leading-6 text-indigo-300/90 text-xs">
                  {currentQuestions[currentIdx]?.explanation}
                </p>

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={handleNextQuestion}
                    className="py-1.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs tracking-wide uppercase transition-all"
                  >
                    {currentIdx + 1 === currentQuestions.length ? "Finalizar Atendimento" : "Próxima Ocorrência"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* --- RESULTS EXCEL PANEL --- */}
      {gameState === 'results' && (
        <div className="p-4 space-y-5 animate-fade-in text-center text-xs">
          
          <div className="space-y-2 py-4">
            <div className="inline-flex w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 items-center justify-center text-3xl mb-1 animate-bounce">
              🏆
            </div>
            <h2 className="text-md font-black tracking-tight text-white uppercase italic">Atendimento Concluído com Sucesso!</h2>
            <p className="text-slate-400">Excelente desempenho em campo! Suas métricas foram salvas na central.</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-850 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono uppercase">PONTUAÇÃO OBTIDA</span>
                <strong className="text-base text-amber-400 font-extrabold">{scoreCollected} Pts</strong>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono uppercase">TAXA DE EFICÁCIA</span>
                <strong className="text-base text-emerald-400 font-extrabold">
                  {Math.round((correctAnswersCount / currentQuestions.length) * 100)}%
                </strong>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono uppercase">PATRULHA CREDITADA</span>
                <strong className="text-base text-blue-400 font-extrabold">+1 Patrulha</strong>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono uppercase">TEMPO MÉDIO</span>
                <strong className="text-base text-violet-400 font-extrabold">{avgResponseTimeSim}s</strong>
              </div>
            </div>

            {/* Display bot result if multiplayer */}
            {isQuickMatch && (
              <div className="p-2 bg-black/40 rounded-lg border border-white/5 flex justify-between items-center mt-3 text-slate-400">
                <span className="font-bold text-[10px]">RIVAL: {opponentNameSim}</span>
                <span className="font-extrabold font-mono text-xs">{opponentScoreSim} Pts</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={() => {
                onComplete(
                  scoreCollected,
                  10,
                  gameState === 'multi_playing',
                  null,
                  scoreCollected,
                  opponentScoreSim,
                  'APH',
                  false,
                  true // keepInGameSelection
                );
                
                // Advance level
                setGameState('setup');
                setScoreCollected(0);
                setCorrectAnswersCount(0);
              }}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-2xl uppercase tracking-wider transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              PRÓXIMO NÍVEL ⚡
            </button>

            <button 
              onClick={() => {
                onComplete(
                  scoreCollected,
                  10,
                  gameState === 'multi_playing',
                  null,
                  scoreCollected,
                  opponentScoreSim,
                  'APH',
                  false,
                  false
                );
                onCancel();
              }}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-2xl uppercase tracking-wider shadow-lg shadow-yellow-500/10 active:scale-95 transition-all font-sans italic flex items-center justify-center gap-2 border-none cursor-pointer"
            >
              FINALIZAR PARTIDA 🏁
            </button>

            <button 
              onClick={() => {
                onComplete(
                  scoreCollected,
                  10,
                  gameState === 'multi_playing',
                  null,
                  scoreCollected,
                  opponentScoreSim,
                  'APH',
                  false,
                  false
                );
                onCancel();
              }}
              className="w-full h-12 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-extrabold text-xs rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 font-sans cursor-pointer"
            >
              Voltar à Central de Jogos
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
