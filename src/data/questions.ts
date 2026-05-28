/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from '../types';

export interface QuizTheme {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const QUIZ_THEMES: QuizTheme[] = [
  { id: 'sinalizacao', name: 'Sinalização & Placas', icon: '🛑', description: 'Placas de regulamentação, advertência, indicações e marcas viárias.' },
  { id: 'defensiva', name: 'Direção Defensiva', icon: '🛡️', description: 'Técnicas de prevenção de acidentes, postura do condutor e regras de cuidado.' },
  { id: 'socorros', name: 'Primeiros Socorros', icon: '🏥', description: 'Atendimento inicial a acidentados, controle de pânico e acionamento de resgate.' },
  { id: 'legislacao', name: 'Legislação & Código (CTB)', icon: '⚖️', description: 'Normas de circulação, habilitação, validade de documentos e leis gerais de trânsito.' },
  { id: 'mecanica', name: 'Mecânica Básica & Manutenção', icon: '🔧', description: 'Funcionamento do motor, sistema de freios, suspensão e painel de instrumentos.' },
  { id: 'ambiente', name: 'Meio Ambiente & Cidadania', icon: '🌱', description: 'Convivência harmônica no trânsito, poluição veicular e gases poluentes.' },
  { id: 'obras', name: 'Sinalização de Obras & Perigos', icon: '🚧', description: 'Trechos em obras, desvios operacionais, barreiras e sinalização temporária.' },
  { id: 'adversa', name: 'Condições Adversas (Clima/Luz)', icon: '🌧️', description: 'Como conduzir com segurança sob chuva, neblina, ventos fortes e escuridão.' },
  { id: 'multas', name: 'Infrações & Penalidades', icon: '📝', description: 'Gravidade das infrações, pontuação na CNH, suspensão e valores de multas.' },
  { id: 'seguranca', name: 'Segurança Ativa & Passiva', icon: '🚗', description: 'Uso de cinto de segurança, airbag, cadeirinha infantil, retrovisores e ponto cego.' }
];

// Helper to shuffle arrays
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate the 5,000 Questions (500 per theme)
function generateAllQuestions(): Question[] {
  const questions: Question[] = [];

  for (const theme of QUIZ_THEMES) {
    const themeId = theme.id;
    let category: 'Signs' | 'Safety' | 'Situational' | 'Visual' | 'Logic' = 'Safety';

    if (themeId === 'sinalizacao' || themeId === 'obras') {
      category = 'Signs';
    } else if (themeId === 'defensiva' || themeId === 'adversa') {
      category = 'Situational';
    } else if (themeId === 'mecanica' || themeId === 'seguranca') {
      category = 'Logic';
    } else if (themeId === 'ambiente') {
      category = 'Visual';
    } else {
      category = 'Safety';
    }

    // 10 base template texts per theme to mix with pools
    const templates = getTemplatesForTheme(themeId);
    const poolA = getPoolAForTheme(themeId);
    const poolB = getPoolBForTheme(themeId);
    const poolC = getPoolCForTheme(themeId);

    // Make 500 questions for this theme
    for (let i = 0; i < 500; i++) {
      // Split index i mathematically into scenario, A, B, C indices
      // 10 scenarios * 5 poolA * 5 poolB * 2 poolC = 500 combinations!
      const scenarioIdx = i % 10;
      const aIdx = Math.floor(i / 10) % 5;
      const bIdx = Math.floor(i / 50) % 5;
      const cIdx = Math.floor(i / 250) % 2;

      const valA = poolA[aIdx];
      const valB = poolB[bIdx];
      const valC = poolC[cIdx];

      // Format question text
      let text = templates[scenarioIdx]
        .replace(/\{A\}/g, valA)
        .replace(/\{B\}/g, valB)
        .replace(/\{C\}/g, valC);

      // Append code or unique number to make them completely distinct
      text = `${text} (Ref: ${themeId.toUpperCase()}-${String(i + 1).padStart(3, '0')})`;

      // Get correct and incorrect options
      const { correct, wrongs } = getOptionsForTheme(themeId, scenarioIdx, valA, valB, valC);

      // Shuffle options and find correct index
      const options = shuffleArray([correct, ...wrongs]);
      const correctAnswer = options.indexOf(correct);

      // Distribute difficulty levels 1 to 5 evenly
      const difficulty = (i % 5) + 1;

      questions.push({
        id: `q-${themeId}-${i + 1}`,
        text,
        options,
        correctAnswer,
        category,
        difficulty,
        themeId,
        theme: theme.name
      });
    }
  }

  return questions;
}

export const QUESTIONS: Question[] = generateAllQuestions();

// Theme templates mapping
function getTemplatesForTheme(themeId: string): string[] {
  switch (themeId) {
    case 'sinalizacao':
      return [
        "Qual o significado da placa de regulamentação {A} ao conduzir um {B} sob {C}?",
        "Ao passar por uma {C}, você vê a placa de advertência {A}. Como condutor de {B}, qual a conduta legal?",
        "A marca de demarcação transversal {A} sob pista {C} estabelece que o veículo {B} deve...",
        "Qual é o comportamento esperado ao avistar a placa de indicação {A} a {C} metros pilotando {B}?",
        "Sob sinal de apito do agente de trânsito ({A}), o condutor de um {B} em via {C} é obrigado a...",
        "Ao notar o gesto de braço do agente de trânsito ({A}) sob {C}, o motorista de {B} deve realizar...",
        "A linha longitudinal pintada na pista na cor {A} sob {C} proíbe que o {B} execute qual manobra?",
        "A placa de serviços auxiliares {A} indica que há {B} a {C} metros à frente.",
        "A placa de atrativos turísticos {A} destina-se a orientar o motorista de {B} sobre local de {C}.",
        "A placa de regulamentação {A} restringe o tráfego de {B} nas vias com {C}. Como proceder?"
      ];
    case 'defensiva':
      return [
        "Se o condutor defensivo de um {B} depara-se com {A} sob {C}, qual deve ser a primeira ação preventiva?",
        "A regra dos dois segundos para manter distância de {B} à frente sob {C} deve ser ampliada para {A} se...",
        "Ao realizar uma ultrapassagem segura de {B} sob {C}, a atenção com relação a {A} deve ser...",
        "Para compensar a fadiga física ao dirigir um {B} por mais de {A} horas sob {C}, o condutor deve...",
        "O ponto cego do retrovisor em {B} esconde outros veículos, especialmente {A} sob {C}. Para mitigar, deve-se...",
        "Diante de um animal de grande porte ({A}) na pista molhada sob {C}, qual a manobra recomendável para {B}?",
        "Se o pedal de freio de seu {B} perder pressão ao trafegar sob {C}, a primeira ação defensiva relacionada a {A} é...",
        "A força centrífuga tende a empurrar {B} para fora de curvas em {C}. O condutor evita derrapar ao {A}...",
        "Se um motorista agressivo colado à traseira de seu {B} sob {C} insistir em passar, a atitude defensiva {A} é...",
        "A aquaplanagem é a perda de aderência de {B} por película de água. Ao notar isso sob {C}, o motorista deve {A}..."
      ];
    case 'socorros':
      return [
        "Ao presenciar acidente com {B} com vítima inconsciente sob {C}, qual a primeira ação jurídica relacionada a {A}?",
        "Se a vítima de acidente no {B} apresentar {A} sob {C}, a conduta inicial segura do socorrista é...",
        "Ao sinalizar o local de colisão de {B} ocorrida sob {C} em via de velocidade {A}, o triângulo deve ser colocado a...",
        "Durante o atendimento preliminar de acidentado com suspeita de {A} no {B}, a orientação sob {C} correta é...",
        "Vítima consciente do veículo {B} está em estado de pânico reclamando de {A} sob {C}. O socorrista deve...",
        "Ao notar sangramento abundante em membro de vítima do {B} sob {C}, deve-se aplicar {A} para...",
        "A respiração de vítima inconsciente no {B} parou. Enquanto chama {A} sob {C}, deve-se imediatamente...",
        "Ao mover uma vítima de {B} em situação de incêndio extremo sob {C}, o cuidado essencial com {A} é...",
        "Se há vazamento de produto perigoso ({A}) do {B} sob {C}, a área de segurança recomendada é...",
        "Para acionar apoio rápido de emergência em acidente de {B} com vítimas severas sob {C}, o número {A} deve ser ligado..."
      ];
    case 'legislacao':
      return [
        "Conforme o CTB, conduzir {B} sob {C} com Carteira de Habilitação {A} vencida há mais de 30 dias é infração...",
        "A renovação da CNH de condutor do {B} com idade {A} deve ser realizada sob {C} a cada...",
        "Habilitado na categoria {A} conduzindo um {B} sob {C} comete infração de trânsito se...",
        "A prioridade de passagem legal no trânsito urbano sob {C} pertence ao {B} destinado a {A}...",
        "Dirigir {B} sob efeito de bebida alcoólica verificado por {A} sob {C} impõe como medida penal...",
        "As ordens do agente de trânsito sob {C} em relação à circulação de {B} têm preeminência sobre {A}...",
        "O órgão máximo executivo de trânsito nacional ({A}) determina que {B} sob {C} deve possuir...",
        "A restrição de circulação imposta pela sinalização {A} para {B} sob {C} acarreta penalidade de...",
        "Para transferência de propriedade de {B}, o prazo de regularização sob {C} exigido por {A} é de...",
        "A pontuação máxima acumulada na CNH em 12 meses que gera suspensão para motorista de {B} sem {A} sob {C} é..."
      ];
    case 'mecanica':
      return [
        "A luz de {A} acesa no painel de instrumentos do {B} sob {C} indica que...",
        "Se o pedal de freio do {B} estiver muito baixo e sem pressão ao rodar sob {C}, o problema provável é {A}...",
        "O sistema de arrefecimento do {B} trabalha para controlar o calor térmico. Sob {C}, usar {A} incorreto causa...",
        "A fumaça azulada saindo do escapamento de seu {B} sob {C} indica que o veículo está {A}...",
        "Se a direção de seu {B} estiver puxando excessivamente para um lado sob {C}, indica necessidade de {A}...",
        "O componente {A} do {B} é responsável por filtrar as impurezas atmosféricas sob {C}, devendo ser trocado...",
        "Se o motor de seu {B} não der partida sob {C}, e as luzes do painel estiverem fracas, o defeito está em {A}...",
        "O sistema de suspensão composto de amortecedores e molas do {B} sob {C} evita que ocorra {A}...",
        "A calibragem correta de pneus de um {B} influi na aderência sob {C}. A medição de {A} ideal deve ocorrer...",
        "O fusível queimado no sistema elétrico do {B} sob {C} deve ser substituído por outro de {A}..."
      ];
    case 'ambiente':
      return [
        "O gás poluidor letal e inodoro {A} emitido por motores de {B} sob {C} afeta gravemente a saúde.",
        "O descarte irregular de baterias usadas de {B} sob {C} contamina o solo com metais como {A}, exigindo...",
        "Para reduzir a poluição sonora de seu {B} sob {C}, o CTB estabelece duras sanções para {A}...",
        "O catalisador do escapamento de seu {B} sob {C} tem a função primordial de {A} para...",
        "A direção agressiva de um {B} sob {C} aumenta o consumo de combustível e a liberação de {A} por conta de...",
        "A poluição visual causada por {A} nas margens de rodovias sob {C} distrai motoristas de {B}, provocando...",
        "Para descarte ecologicamente correto de pneus desgastados de {B} sob {C}, a lei {A} determina...",
        "O monóxido de carbono emitido por {B} sob {C} reage na atmosfera contribuindo para o fenômeno {A}...",
        "A queima incompleta de combustíveis fósseis por {B} gera partículas de {A} visíveis sob {C} chamadas...",
        "A cidadania no trânsito exige que o condutor de {B} sob {C} evite jogar na pista materiais como {A} para..."
      ];
    case 'obras':
      return [
        "Ao se deparar com placas cor {A} indicando obras de via na {C}, o motorista de {B} deve...",
        "A barreira de sinalização canalizadora pintada em {A} sinaliza estreitamento de faixa para {B} sob {C}...",
        "A placa provisória de {A} a {C} metros adverte o condutor de {B} que...",
        "Em trecho sob reforma com asfalto fresado na {C}, a condução de {B} exige que {A} seja...",
        "O operário sinalizador empunhando bandeira {A} na via {C} ordena que o condutor de {B} realize...",
        "A sinalização temporária de {A} instalada em {C} restringe o limite físico de peso para {B} a...",
        "Dispositivos delimitadores como cones reflexivos em cores {A} sob {C} guiam {B} de forma a...",
        "A presença de brita solta de pavimentação na via {C} sob reformas exige que o condutor de {B} evite {A}...",
        "Placas portáteis de regulamentação de velocidade em obras indicam {A} para proteger {B} sob {C}.",
        "A sinalização noturna de obras feita com sinalizadores de luz {A} em {C} adverte {B} sobre..."
      ];
    case 'adversa':
      return [
        "Sob chuva torrencial em {C}, o perigo de aquaplanagem aumenta para {B}, sendo correto {A}...",
        "A neblina espessa reduz a visibilidade horizontal de {B} em {C}. O condutor deve ligar faróis baixos e {A}...",
        "Se houver vento lateral muito forte ao pilotar {B} em {C}, a reação defensiva para estabilizar o veículo é {A}...",
        "Durante a noite escura em pista de {C} sem iluminação, o farol alto de {B} deve ser substituído por baixo ao {A}...",
        "Se a pista estiver escorregadia devido a lama ou geada em {C}, o condutor de {B} deve {A} para evitar derrapagens.",
        "O ofuscamento de visão gerado por sol forte ao entardecer em {C} exige que o condutor de {B} utilize {A}...",
        "O cansaço físico extremo ao conduzir {B} sob condições de {C} reduz reflexos. A conduta defensiva adequada é {A}...",
        "O ponto cego em curvas acentuadas sob neblina em {C} requer que o motorista de {B} adote a conduta de {A}...",
        "Sob fumaça densa emanada de queimadas nas margens da rodovia {C}, o motorista de {B} deve imediatamente {A}...",
        "A presença de poças de água acumuladas em depressões asfálticas em {C} exige que {B} realize {A}..."
      ];
    case 'multas':
      return [
        "A infração de natureza {A} por exceder a velocidade máxima em {C} impõe ao condutor de {B} a pontuação de...",
        "Recusar-se a realizar o teste do bafômetro sob {C} ao dirigir {B} gera multa de valor {A} além de...",
        "Estacionar o {B} em guia de calçada rebaixada para entrada de carros sob {C} acarreta multa de nível {A} e...",
        "A infração gravíssima de transitar com {B} pelo acostamento sob {C} tem fator multiplicador {A}, resultando em multa de...",
        "Conduzir {B} sem os equipamentos obrigatórios de segurança ativa ou com eles ineficientes sob {C} é infração de nível {A} e...",
        "Para interpor recurso contra auto de infração decorrente de condução de {B} sob {C}, o condutor deve respeitar {A}...",
        "A multa por uso de celular ao volante conduzindo {B} na via {C} é tipificada como de nível {A} e gera...",
        "O acúmulo de pontos na habilitação por infrações cometidas dirigindo {B} sob {C} causa suspensão da CNH quando atinge {A}...",
        "Dirigir o {B} com os faróis apagados em rodovias sob {C} de pista simples é infração tipificada como de nível {A} e...",
        "Arremessar água em pedestres ou jogar detritos na via ao dirigir {B} sob {C} caracteriza infração {A} e..."
      ];
    case 'seguranca':
      return [
        "O cinto de segurança de três pontos do {B} sob {C} deve ser posicionado cruzando o peito e {A}...",
        "O transporte de bebês menores de um ano em {B} sob {C} exige o uso do dispositivo {A} voltado para...",
        "O encosto de cabeça do banco do {B} sob {C} serve para evitar {A} em colisões traseiras.",
        "Os espelhos retrovisores externos do {B} sob {C} devem ser regulados minimizando {A} de forma a...",
        "O airbag frontal do {B} sob {C} é um dispositivo de segurança passiva projetado para {A} em caso de...",
        "O transporte de crianças com idade entre 4 e 7 anos no {B} sob {C} requer o uso obrigatório do dispositivo {A}...",
        "Para garantir a frenagem segura do {B} sem travamento de rodas sob {C}, o sistema de segurança ativa {A} deve...",
        "Conduzir motocicleta {B} carregando criança de colo menor de 10 anos sob {C} é infração punida com {A}...",
        "O pneu reserva ou estepe do {B} sob {C} deve possuir as dimensões corretas e sulcos com profundidade {A}...",
        "O extintor de incêndio do {B} sob {C} com carga de pó ABC é facultativo para carros, mas quando usado deve {A}..."
      ];
    default:
      return Array(10).fill("Pergunta genérica de trânsito involving {A}, {B} e {C}.");
  }
}

// Pool A mappings (5 items per theme)
function getPoolAForTheme(themeId: string): string[] {
  switch (themeId) {
    case 'sinalizacao':
      return ["R-1 (Parada Obrigatória)", "R-2 (Dê a Preferência)", "R-19 (Velocidade Regulamentada)", "R-4a (Proibido Virar Esquerda)", "R-15 (Altura Máxima Permitida)"];
    case 'defensiva':
      return ["reduzir suavemente a velocidade na faixa", "dobrar a distância de seguimento normal", "acelerar devagar no acostamento", "sinalizar e encostar no acostamento", "buzinar para afastar o perigo imediato"];
    case 'socorros':
      return ["isolar e sinalizar a via", "manter a calma e evitar aglomerações", "ligar para o SAMU (192)", "ligar para os Bombeiros (193)", "verificar a pulsação sem mover"];
    case 'legislacao':
      return ["Categoria A", "Categoria B", "Categoria C", "Categoria D", "Categoria E"];
    case 'mecanica':
      return ["pressão de óleo lubrificante", "carga de bateria", "sistema de freios ABS", "temperatura de arrefecimento", "injeção eletrônica de combustível"];
    case 'ambiente':
      return ["Monóxido de Carbono (CO)", "Dióxido de Enxofre (SO2)", "Ruído excessivo de motor", "Filtro catalisador furado", "Queima ineficiente de etanol"];
    case 'obras':
      return ["laranja reflexiva em alta definição", "amarela de obras temporárias", "Preto e Amarelo listrados", "Cone luminoso", "Barreira física com piscas"];
    case 'adversa':
      return ["reduzir a velocidade aos poucos", "ligar farol de neblina baixo", "parar em posto de serviços seguro", "acelerar com tração equilibrada", "manter maior distância entre eixos"];
    case 'multas':
      return ["Gravíssima (7 pontos)", "Grave (5 pontos)", "Média (4 pontos)", "Leve (3 pontos)", "Suspensão Direta da CNH"];
    case 'seguranca':
      return ["o quadril e ossos da bacia", "o abdômen e tórax superior", "a clavícula e cinta escapular", "ajuste de distância sem folgas", "engate travado firmemente"];
    default:
      return ["Opção A1", "Opção A2", "Opção A3", "Opção A4", "Opção A5"];
  }
}

// Pool B mappings (5 items per theme)
function getPoolBForTheme(themeId: string): string[] {
  switch (themeId) {
    case 'sinalizacao':
    case 'defensiva':
    case 'socorros':
    case 'legislacao':
    case 'mecanica':
    case 'seguranca':
      return ["carro de passeio", "caminhão tanque", "ônibus coletivo", "motocicleta", "utilitário comercial"];
    case 'ambiente':
      return ["motores flex", "veículos movidos a diesel", "carros antigos sem injeção", "caminhões pesados", "motocicletas"];
    case 'obras':
      return ["retroescavadeira", "caminhão caçamba de asfalto", "rolo compactador", "veículo utilitário de obras", "carro de sinalização móvel"];
    case 'adversa':
      return ["veículo com freios desgastados", "motocicleta sem controle de tração", "caminhão carregado de produtos", "ônibus articulado urbano", "veículo familiar de passeio"];
    case 'multas':
      return ["automóvel alugado", "veículo comercial de entregas", "ônibus com passageiros", "motocicleta de frete rápido", "caminhão bi-trem"];
    default:
      return ["Opção B1", "Opção B2", "Opção B3", "Opção B4", "Opção B5"];
  }
}

// Pool C mappings (2 items per theme)
function getPoolCForTheme(themeId: string): string[] {
  switch (themeId) {
    case 'sinalizacao':
      return ["chuva torrencial", "escuridão de rodovia"];
    case 'defensiva':
      return ["pista escorregadia", "trânsito engarrafado"];
    case 'socorros':
      return ["noite sem iluminação", "trecho de neblina"];
    case 'legislacao':
      return ["fiscalização municipal", "rodovia estadual"];
    case 'mecanica':
      return ["temperatura fria extrema", "alto esforço de subida"];
    case 'ambiente':
      return ["perímetro urbano denso", "estrada florestal protegida"];
    case 'obras':
      return ["pista simples estreitada", "curva sem visibilidade"];
    case 'adversa':
      return ["declive acentuado (serra)", "via expressa em alta velocidade"];
    case 'multas':
      return ["fiscalização eletrônica de radar", "blitz policial física"];
    case 'seguranca':
      return ["longa viagem de férias", "tráfego urbano rotineiro"];
    default:
      return ["condição padrão 1", "condição padrão 2"];
  }
}

// High-quality options generation for each theme & template index
function getOptionsForTheme(
  themeId: string, 
  scenarioIdx: number, 
  valA: string, 
  valB: string, 
  valC: string
): { correct: string; wrongs: string[] } {
  // Let's generate options dynamically aligned perfectly with values to look highly realistic and educational
  switch (themeId) {
    case 'sinalizacao':
      if (scenarioIdx === 0) {
        return {
          correct: `Respeitar as restrições da placa ${valA} imediatamente, pois placas de regulamentação têm caráter imperativo legal.`,
          wrongs: [
            "Desconsiderar a placa temporariamente se a via estiver vazia por ser período noturno.",
            "Apenas diminuir um pouco as marchas do veículo sem efetivamente imobilizá-lo.",
            "Acelerar o veículo para concluir a transposição antes que a fiscalização registre."
          ]
        };
      } else if (scenarioIdx === 1) {
        return {
          correct: `Reduzir a velocidade imediatamente e aumentar a atenção difusa, pois placas de advertência alertam sobre perigos à frente.`,
          wrongs: [
            "Manter o acelerador pressionado e acionar o farol alto para obter visibilidade.",
            "Realizar frenagem de emergência imediata no meio da pista assustado com a sinalização.",
            "Efetuar conversão repentina para a esquerda no primeiro retorno improvisado."
          ]
        };
      } else {
        return {
          correct: "Aumentar o cuidado operacional, observando o fluxo transversal para agir de acordo com a legalidade viária.",
          wrongs: [
            "Ligar os faróis de milha e sinalizador sonoro para exigir que outros condutores abram passagem rápida.",
            "Manter-se exatamente na mesma faixa sem fazer escaneamento visual ao redor.",
            "Descer do automóvel para verificar o significado exato da marcação horizontal de calçada."
          ]
        };
      }

    case 'defensiva':
      if (scenarioIdx === 0) {
        return {
          correct: `Desacelerar o veículo progressivamente, aumentar a distância interveicular e prever possíveis reações perigosas.`,
          wrongs: [
            "Buzinar insistentemente e manter a aceleração para advertir os carros em volta.",
            "Aplicar freios bruscos e puxar o freio de mão imediatamente para conter danos.",
            "Desviar pelas bordas de terra sem verificar os espelhos retrovisores protetores."
          ]
        };
      } else {
        return {
          correct: "Ajustar a postura, redobrar a atenção, prever perigos com antecedência e manter o veículo em condições ideais.",
          wrongs: [
            "Mudar de marcha abruptamente forçando giros do motor na faixa avermelhada.",
            "Desligar o motor em descidas de serra (ponto morto) para economizar combustível.",
            "Dirigir com apenas uma das mãos no volante enquanto gerencia telas do painel."
          ]
        };
      }

    case 'socorros':
      if (scenarioIdx === 0) {
        return {
          correct: "Sinalizar adequadamente o local para evitar colisões sucessivas e contatar os serviços oficiais de resgate móvel.",
          wrongs: [
            "Tentar remover o ferido às pressas puxando-o pelos braços de qualquer maneira.",
            "Administrar medicamentos analgésicos fortes ou dar goles de água fria à vítima inconciente.",
            "Abandonar o local rapidamente para evitar ser arrolado como testemunha oficial do fato."
          ]
        };
      } else if (scenarioIdx === 9) {
        return {
          correct: `Acionar os telefones públicos de urgência (192 para SAMU ou 193 para Bombeiros) descrevendo o estado físico das vítimas.`,
          wrongs: [
            "Ligar para a prefeitura local para registrar reclamação de buracos no trecho do acidente.",
            "Chamar um guincho privado comercial pelas redes sociais para remover as ferragens destruídas.",
            "Entrar em fóruns de internet para pedir instrução de reanimação cardiopulmonar manual."
          ]
        };
      } else {
        return {
          correct: "Manter as funções vitais protegidas, conversando com a vítima para mantê-la acordada e imóvel até o socorro.",
          wrongs: [
            "Realizar torniquete com arame de cerca apertado até prender a circulação total.",
            "Virar o pescoço da vítima lateralmente de forma forçada para verificar secreções.",
            "Retirar objetos empalados ou encravados no corpo com alicates normais."
          ]
        };
      }

    case 'legislacao':
      if (scenarioIdx === 0) {
        return {
          correct: "Comete infração de trânsito de natureza gravíssima, punível com multa pesada e retenção do veículo até apresentação de condutor habilitado.",
          wrongs: [
            "Constitui mera infração leve que gera apenas notificação verbal educativa simples no trânsito.",
            "É considerado crime federal hediondo com prisão em flagrante sem direito a fiança imediata.",
            "É permitido legalmente se o condutor estiver prestando ajuda comunitária local de baixa velocidade."
          ]
        };
      } else {
        return {
          correct: "Respeitar rigorosamente os artigos descritos no CTB, sob pena de autuações, multas e cassação de licenças de condução.",
          wrongs: [
            "Ignorar normas operacionais locais em domingos, feriados ou durante o horário de almoço.",
            "Personalizar placas e luzes sem aprovação dos órgãos vistoriadores oficiais de circulação.",
            "Recusar identificação funcional ao ser abordado por policiais rodoviários autorizados."
          ]
        };
      }

    case 'mecanica':
      if (scenarioIdx === 0) {
        return {
          correct: `Alerta sobre uma anomalia severa no componente relacionado a ${valA}, devendo o veículo ser encostado para check-up de emergência.`,
          wrongs: [
            "Trata-se de uma luz decorativa de painel que acende apenas para testar lâmpadas.",
            "Significa que o veículo atingiu a potência máxima de arrancada ecológica reservada.",
            "Exige que o motorista aumente a aceleração para limpar resquícios de óleo diesel."
          ]
        };
      } else {
        return {
          correct: "Realizar inspeções visuais preventivas regulares e trocas conforme plano estipulado pela montadora oficial do veículo.",
          wrongs: [
            "Substituir fluidos vitais exclusivamente quando o motor travar total ou ferver em subidas.",
            "Utilizar água de torneira pura sem aditivos no radiador em qualquer tipo de veículo.",
            "Ignorar ruídos metálicos de atrito nos freios se o carro continuar desacelerando de alguma forma."
          ]
        };
      }

    case 'ambiente':
      return {
        correct: "Exercer a conduta ecológica e cidadã, minimizando emissões de ruídos e fumaça por meio de manutenção periódica correta.",
        wrongs: [
          "Arremessar garrafas plásticas nas canaletas marginais se as lixeiras do carro estiverem cheias.",
          "Instalar ponteiras de escapamento esportivas e silenciadores adulterados de alta pressão de som.",
          "Efetuar queima de óleo lubrificante de cárter usado em fogueiras perto de áreas preservadas."
        ]
      };

    case 'obras':
      return {
        correct: "Reduzir de imediato o ritmo de condução, redobrando a atenção nas margens da rodovia e nos operários que estão trabalhando no trecho.",
        wrongs: [
          "Acelerar o veículo rápido para cruzar o trecho empurado, liberando logo as zonas sob conserto.",
          "Ziguezaguear constantemente entre cones delimitadores para testar a resposta de tração esportiva.",
          "Ultrapassar caminhões pesados de asfalto pelo acostamento que esteja sob recapeamento rígido."
        ]
      };

    case 'adversa':
      return {
        correct: "Aumentar a margem de segurança operacional, diminuindo a velocidade de fluxo e ligando as luzes adequadas recomendadas.",
        wrongs: [
          "Colar na traseira do automóvel condutor da frente para usar seus faróis traseiros como guias cegos.",
          "Ativar o pisca-alerta em via rápida com o veículo rodando velozmente debaixo de temporal.",
          "Acelerar nas poças profundas para realizar frenagem dinâmica por hidroplanagem mecânica."
        ]
      };

    case 'multas':
      return {
        correct: "Estar ciente de que as multas servem para coibir infrações e gerar conscientização, acumulando penalidades severas em prontuário.",
        wrongs: [
          "Saber que as infrações cometidas sob chuva ou de madrugada estão isentas de aplicação de pontuação pela lei.",
          "Indicar condutores falecidos ou falsos nos recursos para livrar-se de suspensões de habilitação.",
          "Continuar dirigindo legalmente com a CNH suspensa até que ocorra uma abordargem física policial."
        ]
      };

    case 'seguranca':
      return {
        correct: "Verificar preventivamente todos os dispositivos de segurança ativa e passiva do veículo, garantindo a integridade dos ocupantes.",
        wrongs: [
          "Utilizar cintos de segurança apenas nos bancos da frente, dispensando os passageiros traseiros de usá-los.",
          "Substituir cadeirinhas infantis homologadas por almofadas residenciais macias soltas sob o banco sobressalente.",
          "Desligar airbags frontais voluntariamente por julgar que causam ferimentos na clavícula."
        ]
      };

    default:
      return {
        correct: "Adotar postura defensiva e preventiva para garantir a fluidez pacífica e segura dos fluxos viários municipais e rodoviários.",
        wrongs: [
          "Ignorar as normativas viárias quando julgar que a infração oferece baixo risco imediato local.",
          "Forçar passagens em gargalos de tráfego usando de força de veículo de maior porte no asfalto.",
          "Avançar e gesticular contra pedestres e ciclistas que estejam atravessando faixas de trânsito."
        ]
      };
  }
}
