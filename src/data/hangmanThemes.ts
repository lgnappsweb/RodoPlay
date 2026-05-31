export interface HangmanTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  words: string[];
}

export const HANGMAN_THEMES: HangmanTheme[] = [
  {
    id: 'animais',
    name: 'Animais',
    description: 'De mamíferos a insetos',
    icon: '🦁',
    words: ['ELEFANTE', 'CACHORRO', 'GATO', 'LEAO', 'TIGRE', 'ZEBRA', 'GIRAFA', 'BALEIA', 'GOLFINHO', 'POLVO'] 
  },
  {
    id: 'tecnologia',
    name: 'Tecnologia',
    description: 'Do hardware ao software',
    icon: '💻',
    words: ['COMPUTADOR', 'INTERNET', 'CELULAR', 'TABLET', 'PROGRAMA', 'TECLADO', 'MOUSE', 'PROCESSADOR', 'SERVIDOR', 'DADOS']
  },
  {
    id: 'geografia',
    name: 'Geografia',
    description: 'Lugares e continentes',
    icon: '🌍',
    words: ['BRASIL', 'PORTUGAL', 'FRANCA', 'JAPAO', 'EGIITO', 'CANADA', 'AUSTRALIA', 'ITALIA', 'ESPANHA', 'MEXICO']
  },
  {
    id: 'historia',
    name: 'História',
    description: 'Grandes eventos e eras',
    icon: '🏛️',
    words: ['REINADO', 'GUERRA', 'REVOLUCAO', 'PIRAMIDE', 'COLISEU', 'IMPERIO', 'ESCOLA', 'CASTELO', 'MEDIEVAL', 'ANTIGUIDADE']
  },
  {
    id: 'comidas',
    name: 'Comidas',
    description: 'Pratos e ingredientes',
    icon: '🍕',
    words: ['PIZZA', 'HAMBURGUER', 'LASANHA', 'SUSHI', 'SALADA', 'BOLO', 'SORVETE', 'FRUTA', 'ARROZ', 'FEIJOADA']
  },
  {
    id: 'esportes',
    name: 'Esportes',
    description: 'Modalidades e competições',
    icon: '⚽',
    words: ['FUTEBOL', 'BASQUETE', 'TENIS', 'VOLEI', 'NATACAO', 'GINASTICA', 'CORRIDA', 'GOLFE', 'JUDO', 'RUGBY']
  },
  {
    id: 'filmes',
    name: 'Filmes',
    description: 'Clássicos e gêneros',
    icon: '🎬',
    words: ['AVENTURA', 'COMEDIA', 'DRAMA', 'TERROR', 'ACAO', 'DOCUMENTARIO', 'FICCAO', 'ANIMACAO', 'ROMANCE', 'SUSPENSE']
  },
  {
    id: 'musica',
    name: 'Música',
    description: 'Rritmos e instrumentos',
    icon: '🎵',
    words: ['GUITARRA', 'PIANO', 'BATERIA', 'VIOLINO', 'SAMBA', 'ROCK', 'JAZZ', 'POP', 'CLASSICA', 'REGGAE']
  },
  {
    id: 'profissoes',
    name: 'Profissões',
    description: 'Trabalhos e carreiras',
    icon: '🧑‍🚀',
    words: ['MEDICO', 'ENGENHEIRO', 'PROFESSOR', 'ADVOGADO', 'PROGRAMADOR', 'ARTISTA', 'POLICIAL', 'BOMBEIRO', 'DESIGNER', 'CONTADOR']
  },
  {
    id: 'natureza',
    name: 'Natureza',
    description: 'Plantas e paisagens',
    icon: '🌱',
    words: ['FLORESTA', 'MONTE', 'OCEANO', 'RIO', 'DESERTO', 'VULCAO', 'NUVEEM', 'TROVAO', 'CHUVA', 'NOITE']
  }
];
