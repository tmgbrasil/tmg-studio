import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    console.log('Iniciando geração de vídeo:', prompt);

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Token não configurado' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('Chamando Zeroscope v2...');

    // Usando Zeroscope v2 - modelo mais estável para vídeos
    const output: any = await replicate.run(
      "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
      {
        input: {
          prompt: prompt,
          num_frames: 24,
          num_inference_steps: 50,
        }
      }
    );

    console.log('Output recebido:', output);

    // Zeroscope retorna array de URLs
    let videoUrl = null;
    
    if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (typeof output === 'string') {
      videoUrl = output;
    }

    if (!videoUrl) {
      console.error('URL não encontrada. Output:', output);
      return NextResponse.json(
        { error: 'Vídeo gerado mas URL não encontrada' },
        { status: 500 }
      );
    }

    console.log('Vídeo gerado:', videoUrl);

    return NextResponse.json({ 
      videoUrl: videoUrl
    });

  } catch (error: any) {
    console.error('Erro:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}