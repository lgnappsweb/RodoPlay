export interface PalavrasTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  words: string[];
}

export const PALAVRAS_THEMES: PalavrasTheme[] = [
  {
    id: 'seguranca',
    name: 'Segurança',
    description: 'Termos de proteção',
    icon: '🛡️',
    words: ['VIGIA', 'PATRULHA', 'ALERTA', 'DEFESA', 'ORDEM', 'PROTECAO', 'POLICIA', 'REFORCO', 'RADAR', 'ESCOLTA']
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia',
    description: 'Hardware e software',
    icon: '💻',
    words: ['DADOS', 'REDES', 'DIGITAL', 'SISTEMA', 'LOGICA', 'TECLA', 'FONTE', 'BIOS', 'CACHE', 'SERVER']
  },
  {
    id: 'natureza',
    name: 'Natureza',
    description: 'Meio ambiente',
    icon: '🌱',
    words: ['TERRA', 'AGUA', 'ARVORE', 'FLORA', 'FAUNA', 'MONTE', 'RIO', 'VENTO', 'SOLAR', 'NATURE']
  },
  {
    id: 'cidade',
    name: 'Cidade',
    description: 'Vida urbana',
    icon: '🏙️',
    words: ['RUA', 'PRACA', 'PREDIO', 'BAIRRO', 'LOJA', 'POSTO', 'TRAFEGO', 'MAIS', 'FAROL', 'BLOCO']
  },
  {
    id: 'esportes',
    name: 'Esportes',
    description: 'Atividades físicas',
    icon: '⚽',
    words: ['GOL', 'JOGO', 'TIME', 'BOLA', 'TREINO', 'CORRA', 'PULO', 'PESO', 'ACAO', 'META']
  },
  {
    id: 'historia',
    name: 'História',
    description: 'Passado',
    icon: '📜',
    words: ['ERA', 'FATO', 'REINO', 'POVO', 'ARTE', 'DATA', 'RUINA', 'LUTA', 'MEMO', 'TRONO']
  },
  {
    id: 'comidas',
    name: 'Comidas',
    description: 'Alimentação',
    icon: '🍕',
    words: ['APTO', 'BOLO', 'SUCO', 'SAL', 'ARROZ', 'PAO', 'FRUTA', 'DOCE', 'CHAMA', 'PRATO']
  },
  {
    id: 'profissoes',
    name: 'Profissões',
    description: 'Trabalho',
    icon: '👷',
    words: ['OBRA', 'VAGA', 'LIDER', 'ADMIN', 'DADO', 'GUIA', 'MESTRE', 'DITOR', 'REDE', 'DOCE']
  },
  {
    id: 'sentimentos',
    name: 'Sentimentos',
    description: 'Emoções',
    icon: '😊',
    words: ['AMOR', 'PAZ', 'FELIZ', 'CALMA', 'MEDO', 'RAIVA', 'DOR', 'BEM', 'VIVA', 'SORR']
  },
  {
    id: 'viagens',
    name: 'Viagens',
    description: 'Aventuras',
    icon: '✈️',
    words: ['ROTA', 'MAPA', 'LUGAR', 'GUIA', 'AERO', 'TREM', 'TOUR', 'VOLTA', 'MAR', 'CENA']
  }
];
