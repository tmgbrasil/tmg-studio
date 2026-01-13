import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, references } = await req.json();

    let contextPrompt = '';
    if (references && references.length > 0) {
      contextPrompt = `\n\nREFERÊNCIAS VISUAIS:\n${references.map((ref: any) => 
        `- ${ref.client}: ${ref.style}`
      ).join('\n')}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Você é um especialista em design gráfico. Cliente: "${message}"${contextPrompt}
        
Analise e:
1. Identifique o cliente (se nas referências)
2. Faça perguntas ou gere prompt otimizado
3. Mantenha identidade visual

Seja conversacional e profissional.`
      }]
    });

    return NextResponse.json({ 
      response: response.content[0].text 
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar' }, 
      { status: 500 }
    );
  }
}