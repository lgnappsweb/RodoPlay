/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Theme {
  id: string;
  name: string;
  description: string;
  words: string[];
}

// 10 Distinct Categories with rich base lists
const VEICULOS_BASE = [
  'CARRO', 'CAMINHAO', 'MOTO', 'ONIBUS', 'VAN', 'REBOQUE', 'CEGONHA', 'CHASSI', 'PLACA', 'HATCH', 
  'SEDAN', 'ESPORTIVO', 'UTILITARIO', 'AMBULANCIA', 'VIATURA', 'BETONEIRA', 'GUINCHO', 'TANQUE', 
  'CARRETA', 'TRATOR', 'SUV', 'CAVALO', 'FURGAO', 'CAMINHONETE', 'MICROONIBUS', 'BIARTICULADO', 
  'TRICICLO', 'QUADRICICLO', 'SCOOTER', 'PERUA', 'PICAPE', 'BOIADEIRA', 'SIDER', 'GRANELEIRO', 
  'CONVERSIVEL', 'MINIVAN', 'COLETIVO', 'VEICULO', 'AUTOMOVEL', 'REBOQUADO', 'CARREGADO', 'EXCESSO',
  'AUTOCARRO', 'TREM', 'METRO', 'BONDE', 'BALSA', 'LANCHA', 'BARCO', 'CANOA', 'JATO', 'AVIAO', 
  'HELICOPTERO', 'BUGGY', 'FUSCA', 'KOMBI', 'VESPA', 'TRAILER', 'MOTORHOME', 'JANGADA', 'CRUZEIRO', 
  'CARGA', 'TROLLEYBUS', 'DRONE', 'MOBI'
];

const MECANICA_BASE = [
  'MOTOR', 'FREIO', 'EMBREAGEM', 'PNEU', 'RODA', 'VOLANTE', 'SUSPENSAO', 'AMORTECEDOR', 'PISTAO', 
  'BIELA', 'JUNTA', 'CABECOTE', 'VALVULA', 'ESCAPAMENTO', 'RADIADOR', 'BATERIA', 'RETROVISOR', 
  'PARABRISA', 'VELA', 'BOBINA', 'INJECAO', 'CARBURADOR', 'FILTRO', 'OLEO', 'FLUIDO', 'GASOLINA', 
  'ETANOL', 'DIESEL', 'BIODIESEL', 'ADITIVO', 'FREIOMAO', 'PASTILHA', 'DISCO', 'SUJEIRA', 'MOLA', 
  'CHASSIS', 'CARROCERIA', 'PARACHOQUE', 'PARALAMA', 'CAPO', 'PORTAMALAS', 'MACANETA', 'VIDRO', 
  'TRAVA', 'ALARME', 'PAINEL', 'VELOCIMETRO', 'ODOMETRO', 'TACOMETRO', 'TERMOMETRO', 'COMBUSTIVEL', 
  'RESERVA', 'INDICADOR', 'ALAVANCA', 'PEDAL', 'BANCO', 'CARPETE', 'CORREIA', 'ALTERNADOR', 
  'VENTOINHA', 'IGNICAO', 'BOMBA', 'TUBO', 'RELE', 'FUSIVEL', 'VELAIGNICAO', 'BICO', 'MANCAL'
];

const RODOVIAS_BASE = [
  'RODOVIA', 'AVENIDA', 'ESTRADA', 'PONTE', 'TUNEL', 'VIADUTO', 'PEDAGIO', 'BALANCA', 'ROTATORIA', 
  'ACOSTAMENTO', 'CANTEIRO', 'SARJETA', 'MEIOFIO', 'CALCADA', 'CICLOVIA', 'ABRIGO', 'CRUZAMENTO', 
  'INTERSECAO', 'TREVO', 'ENTRONCAMENTO', 'LAJOTA', 'ASFALTO', 'PAVIMENTO', 'PARALELEPIPEDO', 
  'TERRA', 'CASCALHO', 'LAMA', 'OBRAS', 'PISTA', 'FAIXA', 'MARGEM', 'BORDA', 'LIMITE', 
  'BARREIRA', 'BLOQUEIO', 'DESVIO', 'CURVA', 'RETA', 'ACLIVE', 'DECLIVE', 'LOMBARDA', 
  'VALETA', 'BURACO', 'QUILOMETRO', 'TRECHO', 'URBANO', 'RURAL', 'VICINAL', 'LITORANEA', 
  'SERRA', 'MONTANHA', 'ESTACIONAMENTO', 'GARAGEM', 'PERIMETRO', 'REBAIXO', 'ACESSOLIVRE'
];

const SINALIZACAO_BASE = [
  'PLACA', 'SEMAFORO', 'SINAL', 'CONE', 'BALIZADOR', 'TACHAO', 'TACHINHA', 'ZEBRADO', 'HORIZONTAL', 
  'VERTICAL', 'ADVERTENCIA', 'REGULAMENTACAO', 'PARE', 'PREFERENCIA', 'RETORNO', 'VELOCIDADE', 
  'GESTUAL', 'APITO', 'BRACO', 'MAO', 'BANDEIRA', 'CAVALETE', 'TAMBOR', 'GRADE', 'FITA', 
  'OLHODEGATO', 'DELINEADOR', 'MARCADOR', 'RESTRICAO', 'PROIBICAO', 'OBRIGATORIO', 'PERMITIDO', 
  'ESTREITAMENTO', 'LARGURA', 'ALTURA', 'PESO', 'EIXO', 'COMPRIMENTO', 'CONVERSAO', 'ULTRAPASSAGEM', 
  'ESTACIONAR', 'PARAR', 'CARGA', 'DESCARGA', 'HIDRANTE', 'PEDESTRE', 'CICLISTA', 'TRAVESSIA', 
  'ESCOLAR', 'CRIANCA', 'LUMINOSA', 'SONORA', 'SAIDA', 'ENTRADA', 'INFORMATIVA', 'TURISTICA'
];

const LEGISLACAO_BASE = [
  'MULTA', 'CODIGO', 'TRANSITO', 'BRASILEIRO', 'INFRACAO', 'HABILITACAO', 'CARTEIRA', 'RECURSO', 
  'DEFESA', 'AGENTE', 'FISCAL', 'JARI', 'CONTRAN', 'DETRAN', 'RESOLUCAO', 'LEI', 'DECRETO', 
  'PORTARIA', 'OPERADOR', 'PENALIDADE', 'SUSPENSAO', 'CASSACAO', 'REABILITACAO', 'RECICLAGEM', 
  'EXAME', 'PROVA', 'SIMULADO', 'AULA', 'CNH', 'PPD', 'ACC', 'CATEGORIA', 'RENOVACAO', 
  'VALIDADE', 'PRONTUARIO', 'RENAVAM', 'DUT', 'CRLV', 'CRV', 'RECIBO', 'TRANSFERENCIA', 
  'LICENCIAMENTO', 'IPVA', 'DPVAT', 'SEGURO', 'POLICE', 'SINISTRO', 'OCORRENCIA', 'BOLETIM', 
  'POLICIA', 'AUTORIDADE', 'RESPONSABILIDADE', 'CIVIL', 'CRIMINAL', 'CUSTODIA', 'PRISAO'
];

const SEGURANCA_BASE = [
  'CINTO', 'AIRBAG', 'CAPACETE', 'EXTINTOR', 'COLETE', 'REFLETIVO', 'RESGATE', 'AMBULANCIA', 
  'SOCORRISTA', 'MACACO', 'TRIANGULO', 'EMERGENCIA', 'SINALIZAR', 'BAFOMETRO', 'VISEIRA', 
  'LUVAS', 'BOTAS', 'ESTEPE', 'SIRENE', 'ALERTA', 'PRIMEIROSSOCORROS', 'SAMU', 'BOMBEIROS', 
  'DEFESA', 'VIGILANCIA', 'SEGURANCA', 'PREVENTIVA', 'CORRETIVA', 'DEFENSIVA', 'TRAVESSIA', 
  'PROTECAO', 'EQUIPAMENTO', 'MASCARA', 'OCULOS', 'JAQUETA', 'CAPA', 'LANTERNA', 'RADIO', 
  'COMUNICADOR', 'MACA', 'SALVAMENTO', 'HEROI', 'PATRULHEIRO', 'AUXILIO', 'AJUDA', 'CONVERGENCIA'
];

const OPERACOES_BASE = [
  'INSPECAO', 'PATRULHA', 'RONDA', 'ATENDIMENTO', 'MONITORAMENTO', 'CENTRAL', 'OBRAS', 'PISTA', 
  'BLOQUEIO', 'INTERVENCAO', 'DESVIO', 'FLUXO', 'CONGESTIONAMENTO', 'TRAFEGO', 'CONTROLE', 
  'SENSOR', 'RADAR', 'CAMERA', 'VIATURA', 'OPERADOR', 'BOLETIM', 'REGISTRO', 'OCORRENCIA', 
  'VISTORIA', 'BLITZ', 'FISCALIZACAO', 'APREENSAO', 'REMOCAO', 'GUINCHO', 'PATIO', 'LEILAO', 
  'AUTORIZACAO', 'ESCOLTA', 'DURACAO', 'QUILOMETRAGEM', 'PERCURSO', 'INTERRUPCAO', 'LIBERACAO', 
  'FLUXOLIVRE', 'CRUZADOR', 'DETERMINACAO', 'DILIGENCIA', 'VIGILANCIA', 'ABORDAGEM', 'AVALIACAO'
];

const GEOGRAFIA_BASE = [
  'ROTA', 'DESTINO', 'ORIGEM', 'MAPA', 'RUMO', 'SENTIDO', 'NORTE', 'SUL', 'LESTE', 'OESTE', 
  'ORIENTE', 'OCIDENTE', 'COORDENADA', 'CIDADE', 'ESTADO', 'PAIS', 'MUNICIPIO', 'BAIRRO', 
  'REGIAO', 'DISTRITO', 'SUDESTE', 'NORDESTE', 'CENTROESTE', 'FRONTEIRA', 'DIVISA', 'LIMITE', 
  'TRECHO', 'SETOR', 'LOCALIZACAO', 'POSICAO', 'GPS', 'RELEVO', 'MONTANHA', 'VALE', 'PLANALTO', 
  'PLANICIE', 'RIO', 'LAGOA', 'LITORAL', 'PRAIA', 'SERRA', 'INTERIOR', 'METROPOLE', 'CAPITAL', 
  'AUTOESTRADA', 'ATALHO', 'TRAVESSIA', 'DIRECAO', 'TRAJETO', 'ITINERARIO', 'VIAGEM', 'RODOVIA'
];

const FERRAMENTAS_BASE = [
  'ALICATE', 'CHAVE', 'MARTELO', 'PARAFUSO', 'PORCA', 'BROCA', 'FURADEIRA', 'SERRA', 'LIXA', 
  'TRENA', 'NIVEL', 'ESQUADRO', 'MACACO', 'CABO', 'SUPORTE', 'LANTERNA', 'PILHA', 'BATERIA', 
  'PINCA', 'SOLDA', 'GRAXA', 'OLEO', 'TINTA', 'PINCEL', 'ROLO', 'PARAFUSADEIRA', 'SILICONE', 
  'FITA', 'ISOLANTE', 'ADESIVO', 'REBITE', 'REBITADEIRA', 'ENGRENAGEM', 'POLIA', 'CORRENTE', 
  'CADEADO', 'PREGO', 'BUCHA', 'CHAVEDEFENDA', 'CHAVESTAR', 'MULTIMETRO', 'ETILOMETRO', 
  'CALIBRADOR', 'COMPRESSOR', 'MANGUEIRA', 'ABRACADEIRA'
];

const TECNOLOGIA_BASE = [
  'GPS', 'RADIO', 'ANTENA', 'CELULAR', 'SISTEMA', 'TELA', 'PAINEL', 'CHIP', 'CONEXAO', 'SINAL', 
  'SOFTWARE', 'INTERNET', 'APLICATIVO', 'NOTIFICACAO', 'MENSAGEM', 'REGISTRO', 'GEOFENCE', 
  'FOTOSSENSOR', 'RADAR', 'TABLET', 'COMPUTADOR', 'NUVEM', 'DISPOSITIVO', 'DASHBOARD', 'MEDIDOR', 
  'SENSOR', 'AUTOMACAO', 'REDE', 'CABOS', 'TELEMETRIA', 'ROUTER', 'MODEM', 'IMPRESSORA', 
  'SCANNER', 'CAMERA', 'MONITOR', 'BATERIA', 'RECARGA', 'GERADOR', 'INVERSOR', 'SATELLITE'
];

// Operational modifiers (Adjectives, states, contexts)
const MODIFIERS = [
  'NOVO', 'VELHO', 'GRANDE', 'PEQUENO', 'ATIVO', 'GERAL', 'SUL', 'NORTE', 'LESTE', 'OESTE', 
  'DUPLO', 'TRIPLO', 'LIMPO', 'SUJO', 'FORTE', 'FRACO', 'RAPIDO', 'LENTO', 'SEGURO', 'ALERTA', 
  'LOCAL', 'URBANO', 'RURAL', 'REGIONAL', 'ESTADUAL', 'FEDERAL', 'NACIONAL', 'COMPLETO', 
  'INTEGRAL', 'EXTERNO', 'INTERNO', 'OFICIAL', 'MILITAR', 'ESPECIAL', 'PRINCIPAL', 'EXTRA', 
  'DIARIO', 'MENSAL', 'ANUAL', 'ROTINA', 'PLENO', 'FIXO', 'MOVEL', 'TOTAL', 'PARCIAL'
];

// Accurate mapping of unaccented words to their proper Portuguese accented versions
const ACCENTED_MAP: Record<string, string> = {
  'CAMINHAO': 'CAMINHÃO',
  'ONIBUS': 'ÔNIBUS',
  'AVIAO': 'AVIÃO',
  'HELICOPTERO': 'HELICÓPTERO',
  'VEICULO': 'VEÍCULO',
  'AUTOMOVEL': 'AUTOMÓVEL',
  'VALVULA': 'VÁLVULA',
  'INJECAO': 'INJEÇÃO',
  'OLEO': 'ÓLEO',
  'CABECOTE': 'CABEÇOTE',
  'IGNICAO': 'IGNIÇÃO',
  'TUNEL': 'TÚNEL',
  'PEDAGIO': 'PEDÁGIO',
  'ROTATORIA': 'ROTATÓRIA',
  'INTERSECAO': 'INTERSEÇÃO',
  'SEMAFORO': 'SEMÁFORO',
  'ADVERTENCIA': 'ADVERTÊNCIA',
  'REGULAMENTACAO': 'REGULAMENTAÇÃO',
  'RESTRICAO': 'RESTRIÇÃO',
  'PROIBICAO': 'PROIBIÇÃO',
  'CONVERSAO': 'CONVERSÃO',
  'TRANSITO': 'TRÂNSITO',
  'INFRACAO': 'INFRAÇÃO',
  'HABILITACAO': 'HABILITAÇÃO',
  'RESOLUCAO': 'RESOLUÇÃO',
  'RENOVACAO': 'RENOVAÇÃO',
  'CASSACAO': 'CASSAÇÃO',
  'REABILITACAO': 'REABILITAÇÃO',
  'POLICIA': 'POLÍCIA',
  'EMERGENCIA': 'EMERGÊNCIA',
  'PROTECAO': 'PROTEÇÃO',
  'OCULOS': 'ÓCULOS',
  'INSPECAO': 'INSPEÇÃO',
  'FISCALIZACAO': 'FISCALIZAÇÃO',
  'APREENSAO': 'APREENSÃO',
  'REMOCAO': 'REMOÇÃO',
  'AUTORIZACAO': 'AUTORIZAÇÃO',
  'LIBERACAO': 'LIBERAÇÃO',
  'DURACAO': 'DURAÇÃO',
  'DILIGENCIA': 'DILIGÊNCIA',
  'AVALIACAO': 'AVALIAÇÃO',
  'PAIS': 'PAÍS',
  'REGIAO': 'REGIÃO',
  'LOCALIZACAO': 'LOCALIZAÇÃO',
  'POSICAO': 'POSIÇÃO',
  'CONEXAO': 'CONEXÃO',
  'NOTIFICACAO': 'NOTIFICAÇÃO',
  'AUTOMACAO': 'AUTOMAÇÃO',
  'PINCA': 'PINÇA',
  'DIARIO': 'DIÁRIO',
  'MOVEL': 'MÓVEL',
  'SINALIZACAO': 'SINALIZAÇÃO',
  'MECANICA': 'MECÂNICA',
  'LEGISLACAO': 'LEGISLAÇÃO',
  'SEGURANCA': 'SEGURANÇA',
  'OPERACOES': 'OPERAÇÕES',
  'MICROONIBUS': 'MICROÔNIBUS',
};

export function applyPortugueseAccents(word: string): string {
  let result = word.toUpperCase();
  // Sort keys by length descending to replace larger phrases first
  const keys = Object.keys(ACCENTED_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.replaceAll(key, ACCENTED_MAP[key]);
  }
  return result;
}

// Helper to return clean, unique terms per theme with proper accents and length bounds
function expandList(baseList: string[]): string[] {
  const wordsSet = new Set<string>();

  // 1. Add accented base words
  baseList.forEach(w => {
    const clean = w.toUpperCase().trim().replace(/[-_ ]/g, '');
    const withAccents = applyPortugueseAccents(clean);
    if (withAccents.length >= 3 && withAccents.length <= 12) {
      wordsSet.add(withAccents);
    }
  });

  return Array.from(wordsSet);
}

export const WORD_SEARCH_THEMES: Theme[] = [
  {
    id: 'VEICULOS',
    name: 'Veículos & Transportes 🚚',
    description: 'Veículos de patrulha, carga, transporte coletivo e especiais.',
    words: expandList(VEICULOS_BASE)
  },
  {
    id: 'MECANICA',
    name: 'Peças & Mecânica ⚙️',
    description: 'Componentes mecânicos, motorização, suspensão e fluidos.',
    words: expandList(MECANICA_BASE)
  },
  {
    id: 'RODOVIAS',
    name: 'Rodovias & Infraestrutura 🛣️',
    description: 'Elementos de engenharia de tráfego, vias, acostamentos e pontes.',
    words: expandList(RODOVIAS_BASE)
  },
  {
    id: 'SINALIZACAO',
    name: 'Sinalização & Placas 🚦',
    description: 'Placas de advertência, regulamentação, semáforos e marcas táteis.',
    words: expandList(SINALIZACAO_BASE)
  },
  {
    id: 'LEGISLACAO',
    name: 'Legislação & Normas ⚖️',
    description: 'Leis de trânsito, multas, CNH, resoluções e regulamentos.',
    words: expandList(LEGISLACAO_BASE)
  },
  {
    id: 'SEGURANCA',
    name: 'Segurança & Resgate 🛟',
    description: 'EPIs, prevenção de acidentes, primeiros socorros e veículos de salvamento.',
    words: expandList(SEGURANCA_BASE)
  },
  {
    id: 'OPERACOES',
    name: 'Operações & Patrulhamentos 👮‍♂️',
    description: 'Rondas de inspeção, vistorias operacionais e bloqueios viários.',
    words: expandList(OPERACOES_BASE)
  },
  {
    id: 'GEOGRAFIA',
    name: 'Geografia & Rotas 🧭',
    description: 'Cidades, limites departamentais, direções cardeais e rumos.',
    words: expandList(GEOGRAFIA_BASE)
  },
  {
    id: 'FERRAMENTAS',
    name: 'Ferramentas & Materiais 🔧',
    description: 'Instrumentos manuais, ferramentas mecânicas e calibradores operacionais.',
    words: expandList(FERRAMENTAS_BASE)
  },
  {
    id: 'TECNOLOGIA',
    name: 'Tecnologia & Sistemas 📡',
    description: 'Monitoramento remoto, GPS, rádio-transmissores e telemetria.',
    words: expandList(TECNOLOGIA_BASE)
  }
];

export const THEME_BASES: Record<string, string[]> = {
  VEICULOS: VEICULOS_BASE,
  MECANICA: MECANICA_BASE,
  RODOVIAS: RODOVIAS_BASE,
  SINALIZACAO: SINALIZACAO_BASE,
  LEGISLACAO: LEGISLACAO_BASE,
  SEGURANCA: SEGURANCA_BASE,
  OPERACOES: OPERACOES_BASE,
  GEOGRAFIA: GEOGRAFIA_BASE,
  FERRAMENTAS: FERRAMENTAS_BASE,
  TECNOLOGIA: TECNOLOGIA_BASE,
};
