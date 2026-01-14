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

    // Usar predictions API para ter controle sobre o polling
    const prediction = await replicate.predictions.create({
      version: "78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a",
      input: {
        prompt: prompt,
        negative_prompt: "blurry, low quality, distorted, watermark",
        width: 512,
        height: 512,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        video_length: 8,
      }
    });

    console.log('Prediction criada:', prediction.id);

    // Aguardar vídeo ficar pronto
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 120; // 4 minutos

    while (
      completedPrediction.status !== "succeeded" &&
      completedPrediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      completedPrediction = await replicate.predictions.get(prediction.id);
      console.log(`Status (${attempts + 1}):`, completedPrediction.status);
      
      attempts++;
    }

    if (completedPrediction.status === "failed") {
      console.error('Geração falhou:', completedPrediction.error);
      return NextResponse.json(
        { error: `Falha na geração: ${completedPrediction.error}` },
        { status: 500 }
      );
    }

    if (completedPrediction.status !== "succeeded") {
      console.error('Timeout na geração');
      return NextResponse.json(
        { error: 'Timeout: vídeo demorou muito para ser gerado' },
        { status: 500 }
      );
    }

    console.log('Prediction completa:', completedPrediction);
    console.log('Output:', completedPrediction.output);

    let videoUrl = null;
    const output = completedPrediction.output;

    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      videoUrl = output[output.length - 1];
    } else if (output && typeof output === 'object') {
      // Tentar várias propriedades possíveis
      videoUrl = (output as any).video || (output as any).mp4 || (output as any).url || (output as any).output;
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('URL não encontrada no output:', output);
      return NextResponse.json(
        { 
          error: 'Vídeo gerado mas URL não encontrada',
          outputType: typeof output,
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