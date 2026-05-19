export interface CreatorProfile {
  nome: string
  canal: string
  inscritos: number
  views_28d: number
  espectadores_unicos_28d: number
  tempo_exibicao_horas_28d: number
  retencao_media: number
  recorrentes: number
  formato_principal: string
  views_por_short: string
  mei: boolean
  emite_nf: boolean
  canais_localizados: string[]
  publico: {
    genero: { masculino: number; feminino: number }
    idade: Record<string, number>
    geografia: Record<string, number>
    renda_familiar: Record<string, number>
    status_parental: { nao_pais: number; pais: number }
    interesses_alto: string[]
    intencao_compra_alta: string[]
  }
}

// Perfil de exemplo (números fictícios). Substitua localmente com dados reais.
export const ROBERTO_CARECA_PROFILE: CreatorProfile = {
  nome: 'Creator Demo',
  canal: 'youtube.com/@creator-demo',
  inscritos: 100000,
  views_28d: 1000000,
  espectadores_unicos_28d: 300000,
  tempo_exibicao_horas_28d: 5000,
  retencao_media: 70,
  recorrentes: 50,
  formato_principal: 'shorts',
  views_por_short: '10000-50000',
  mei: false,
  emite_nf: false,
  canais_localizados: [],
  publico: {
    genero: { masculino: 60, feminino: 40 },
    idade: {
      '13-17': 15,
      '18-24': 25,
      '25-34': 30,
      '35-44': 20,
      '45-54': 7,
      '55-64': 2,
      '65+': 1,
    },
    geografia: {
      brasil: 95,
      portugal: 5,
    },
    renda_familiar: {
      top_10: 20,
      top_11_20: 25,
      top_21_30: 20,
      top_31_40: 15,
      lower_50: 20,
    },
    status_parental: { nao_pais: 60, pais: 40 },
    interesses_alto: [
      'Gamers',
      'Entertainment Fans',
    ],
    intencao_compra_alta: [
      'Computers & Peripherals',
      'Gaming Hardware',
    ],
  },
}
