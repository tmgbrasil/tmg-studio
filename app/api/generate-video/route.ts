import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Token do Replicate não configurado' },
        { status: 500 }
      );
    }

    console.log('Gerando vídeo com Hotshot-XL:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Hotshot-XL: text-to-video direto
    const output: any = await replicate.run(
      "lucataco/hotshot-xl:78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a",
      {
        input: {
          prompt: prompt,
          negative_prompt: "blurry, low quality, distorted, watermark",
          width: 512,
          height: 512,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          video_length: 8,
        }
      }
    );

    console.log('Output recebido, tipo:', typeof output);
    console.log('Output é array?', Array.isArray(output));
    console.log('Output:', output);

    let videoUrl = null;
    
    if (typeof output === 'string') {
      videoUrl = output;
      console.log('Output é string:', videoUrl);
    } else if (Array.isArray(output)) {
      console.log('Output é array com', output.length, 'itens');
      // Pega o último item do array
      videoUrl = output[output.length - 1];
      console.log('Pegando último item:', videoUrl);
    } else if (output && typeof output === 'object') {
      console.log('Output é objeto com keys:', Object.keys(output));
      videoUrl = output.video || output.mp4 || output.output || output.url;
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('Erro: URL inválida');
      console.error('VideoUrl:', videoUrl);
      console.error('Output completo:', JSON.stringify(output, null, 2));
      return NextResponse.json(
        { 
          error: 'Vídeo gerado mas URL não encontrada',
          outputType: typeof output,
          outputArray: Array.isArray(output),
          output: output
        },
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