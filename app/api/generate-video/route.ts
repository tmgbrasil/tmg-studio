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

    console.log('Iniciando geração de vídeo:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Usando AnimateDiff - modelo estável e disponível
    const output = await replicate.run(
      "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
      {
        input: {
          prompt: prompt,
          num_frames: 16,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        }
      }
    ) as any;

    console.log('Output recebido:', output);

    // Extrair URL do vídeo
    let videoUrl = null;
    
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (output && typeof output === 'object') {
      videoUrl = output.video || output.output || output.url;
    }

    if (!videoUrl) {
      console.error('URL do vídeo não encontrada no output:', output);
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
    console.error('Erro completo:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao gerar vídeo',
        details: error.toString()
      }, 
      { status: 500 }
    );
  }
}