import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Token não configurado' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('Gerando vídeo com prompt:', prompt);

    // Hotshot-XL: text-to-video direto, sem precisar de imagem
    const output: any = await replicate.run(
      "lucataco/hotshot-xl:78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a",
      {
        input: {
          prompt: prompt,
          negative_prompt: "blurry, low quality, distorted",
          width: 512,
          height: 512,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          video_length: 8, // 8 frames
        }
      }
    );

    console.log('Output recebido:', output);

    // Extrair URL do vídeo
    let videoUrl = null;
    
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      // Pega o último item (geralmente é o vídeo final)
      videoUrl = output[output.length - 1];
    } else if (output && typeof output === 'object') {
      videoUrl = output.video || output.mp4 || output.output;
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('Erro: URL inválida. Output:', output);
      return NextResponse.json(
        { 
          error: 'Vídeo gerado mas formato inválido',
          debug: output
        },
        { status: 500 }
      );
    }

    console.log('Vídeo gerado com sucesso:', videoUrl);

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