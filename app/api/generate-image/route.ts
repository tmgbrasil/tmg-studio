import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    // 🔧 CORREÇÃO: Verificar se data existe
    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma imagem foi gerada' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      imageUrl: response.data[0].url 
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar imagem' }, 
      { status: 500 }
    );
  }
}