import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN não configurada' },
        { status: 500 }
      );
    }

    console.log('Iniciando geração de vídeo com Replicate:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Usando Luma AI Dream Machine - melhor qualidade
    const output = await replicate.run(
      "luma/photon:e3a960e1da653509f87c2e36bf7e8da6f2bbb5bed2334f0d2bf2cab5176f8c34",
      {
        input: {
          prompt: prompt,
          aspect_ratio: "16:9",
          loop: false,
        }
      }
    ) as any;

    console.log('Vídeo gerado:', output);

    // O output pode ser uma URL direta ou um objeto
    let videoUrl = null;
    
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (output && output.video) {
      videoUrl = output.video;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    }

    if (!videoUrl) {
      console.error('URL do vídeo não encontrada:', output);
      return NextResponse.json(
        { error: 'Vídeo gerado mas URL não encontrada' },
        { status: 500 }
      );
    }

    console.log('Vídeo gerado com sucesso:', videoUrl);

    return NextResponse.json({ 
      videoUrl: videoUrl
    });

  } catch (error: any) {
    console.error('Erro ao gerar vídeo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}