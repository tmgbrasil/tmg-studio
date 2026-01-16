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
            content: `Você é um assistente especializado em criar prompts para geração de imagens da TMG Studio.

REGRAS IMPORTANTES:
1. Quando o usuário pedir para criar algo (logo, banner, post, etc), faça NO MÁXIMO 2 perguntas para entender melhor
2. Após as respostas do usuário, SEMPRE gere um prompt em inglês
3. O prompt DEVE começar EXATAMENTE com a palavra "Prompt:" (com dois pontos)
4. O prompt deve ser detalhado, em inglês, com estilo visual, cores, composição

EXEMPLOS DE CONVERSA:

Usuário: "Quero um logo"
Você: "Para criar o logo perfeito, preciso saber:
1. Para qual empresa/negócio?
2. Qual estilo prefere? (moderno, minimalista, vintage, etc)
3. Quais cores gostaria?"

Usuário: "Para uma cafeteria, estilo moderno, cores marrom e branco"
Você: "Perfeito! Vou criar um logo moderno para a cafeteria.

Prompt: A modern minimalist coffee shop logo, featuring a stylized coffee cup with steam, geometric shapes, warm brown and white color palette, clean lines, professional design, flat design style, simple and elegant, on white background, vector art"

---

Agora responda ao usuário:
${message}`
          }
        ]
      })
    });

    const data = await response.json();
    const assistantMessage = data.content[0].text;

    // Verificar se tem "Prompt:" na resposta (case insensitive)
    const hasPrompt = assistantMessage.toLowerCase().includes('prompt:');

    console.log('✅ Resposta gerada');
    console.log('📝 Tem prompt?', hasPrompt);
    console.log('📄 Resposta:', assistantMessage.substring(0, 200));

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