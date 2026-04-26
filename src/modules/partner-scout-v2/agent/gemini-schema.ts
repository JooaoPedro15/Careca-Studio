// Schema OpenAPI usado no responseSchema do Gemini.
// Gemini exige tipos em maiúsculas e estrutura ligeiramente diferente do JSON Schema.

export const GEMINI_PROSPECTION_SCHEMA = {
  type: 'OBJECT',
  required: [
    'executado_em',
    'ano_referencia',
    'janela_temporal_busca',
    'criador',
    'queries_executadas',
    'candidatos_descobertos',
    'filtrados',
    'resultado_final',
    'top_10_destaque',
    'estatisticas_busca',
    'proximas_acoes_sugeridas',
  ],
  properties: {
    executado_em: { type: 'STRING' },
    ano_referencia: { type: 'INTEGER' },
    janela_temporal_busca: { type: 'STRING' },
    criador: { type: 'STRING' },
    queries_executadas: { type: 'ARRAY', items: { type: 'STRING' } },
    candidatos_descobertos: { type: 'INTEGER' },
    filtrados: { type: 'INTEGER' },
    top_10_destaque: { type: 'ARRAY', items: { type: 'STRING' } },
    estatisticas_busca: {
      type: 'OBJECT',
      required: [
        'emails_encontrados',
        'emails_inferidos',
        'emails_nao_localizados',
        'categorias_cobertas',
      ],
      properties: {
        emails_encontrados: { type: 'INTEGER' },
        emails_inferidos: { type: 'INTEGER' },
        emails_nao_localizados: { type: 'INTEGER' },
        categorias_cobertas: { type: 'INTEGER' },
      },
    },
    proximas_acoes_sugeridas: { type: 'ARRAY', items: { type: 'STRING' } },
    resultado_final: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: [
          'marca',
          'categoria',
          'site',
          'operacao_brasil',
          'ultima_atividade_publica',
          'porte',
          'campanhas_recentes_creator',
          'lancamentos_proximos',
          'fit_demografico',
          'tipo_publi_recomendado',
          'ticket_estimado_brl',
          'contato',
          'argumento_pitch',
          'alertas',
        ],
        properties: {
          marca: { type: 'STRING' },
          categoria: { type: 'STRING' },
          site: { type: 'STRING' },
          operacao_brasil: {
            type: 'STRING',
            enum: ['confirmada', 'provavel', 'nao'],
          },
          ultima_atividade_publica: { type: 'STRING' },
          porte: {
            type: 'STRING',
            enum: ['global', 'regional_grande', 'medio', 'startup'],
          },
          campanhas_recentes_creator: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['creator', 'marca_no_post', 'data', 'link'],
              properties: {
                creator: { type: 'STRING' },
                marca_no_post: { type: 'STRING' },
                data: { type: 'STRING' },
                link: { type: 'STRING' },
              },
            },
          },
          lancamentos_proximos: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['titulo', 'data_prevista', 'tipo'],
              properties: {
                titulo: { type: 'STRING' },
                data_prevista: { type: 'STRING' },
                tipo: {
                  type: 'STRING',
                  enum: ['jogo', 'produto', 'evento', 'temporada'],
                },
              },
            },
          },
          fit_demografico: {
            type: 'OBJECT',
            required: ['score', 'justificativa'],
            properties: {
              score: { type: 'INTEGER' },
              justificativa: { type: 'STRING' },
            },
          },
          tipo_publi_recomendado: {
            type: 'STRING',
            enum: ['short_patrocinado', 'integracao', 'codigo_desconto', 'embaixador_long_term'],
          },
          ticket_estimado_brl: {
            type: 'OBJECT',
            required: ['minimo', 'ideal', 'premium', 'base_calculo'],
            properties: {
              minimo: { type: 'NUMBER' },
              ideal: { type: 'NUMBER' },
              premium: { type: 'NUMBER' },
              base_calculo: { type: 'STRING' },
            },
          },
          contato: {
            type: 'OBJECT',
            required: [
              'email_primario',
              'email_alternativo',
              'fonte_email',
              'editavel',
              'linkedin_decisor',
              'agencia_representante',
              'formulario_parcerias',
            ],
            properties: {
              email_primario: { type: 'STRING', nullable: true },
              email_alternativo: { type: 'STRING', nullable: true },
              fonte_email: { type: 'STRING' },
              editavel: { type: 'BOOLEAN' },
              linkedin_decisor: {
                type: 'OBJECT',
                required: ['nome', 'cargo', 'url'],
                properties: {
                  nome: { type: 'STRING', nullable: true },
                  cargo: { type: 'STRING', nullable: true },
                  url: { type: 'STRING', nullable: true },
                },
              },
              agencia_representante: { type: 'STRING', nullable: true },
              formulario_parcerias: { type: 'STRING', nullable: true },
            },
          },
          argumento_pitch: { type: 'STRING' },
          alertas: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
  },
} as const
