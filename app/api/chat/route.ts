import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, references } = await request.json();

    console.log('💬 Mensagem recebida:', message);

    // Chamar API do Claude (Anthropic)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Você é um assistente de criação visual da TMG Studio. Ajude o usuário a criar materiais visuais (imagens para redes sociais, anúncios, logos, etc).

IMPORTANTE: Você gera apenas prompts para IMAGENS. NÃO mencione vídeos em nenhuma hipótese.

Quando o usuário pedir para criar algo:
1. Entenda o que ele quer
2. Faça perguntas se necessário para refinar a ideia
3. Quando tiver informações suficientes, gere um prompt otimizado para DALL-E 3
4. O prompt deve ser detalhado, descritivo e em inglês
5. Termine sua mensagem com a palavra "Prompt:" seguido do prompt otimizado

Exemplo de prompt otimizado:
"Prompt: A modern minimalist logo for a coffee shop, featuring a stylized coffee cup with geometric shapes, warm brown and cream colors, clean lines, professional design, vector art style, on white background"

Mensagem do usuário: ${message}`
          }
        ]
      })
    });

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    // Verificar se é um prompt otimizado (tem a palavra "Prompt:" ou "prompt:")
    const hasPrompt = assistantMessage.toLowerCase().includes('prompt:');

    console.log('✅ Resposta gerada');
    console.log('📝 Tem prompt?', hasPrompt);

    return NextResponse.json({
      response: assistantMessage,
      hasPrompt: hasPrompt
    });

  } catch (error: any) {
    console.error('❌ Erro no chat:', error);
    return NextResponse.json(
      { response: 'Desculpe, houve um erro ao processar sua mensagem.' },
      { status: 500 }
    );
  }
}