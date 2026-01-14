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

    console.log('Gerando vídeo cinematográfico:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Usando modelo VERIFICADO: fofr/kling-video
    // Este é o modelo oficial do Kling AI no Replicate
    const prediction = await replicate.predictions.create({
      version: "ee7cf78b031d92c9ccdbb1354919c700e96c0c09ff36993c6c0e4782c9f4043d",
      input: {
        prompt: prompt,
        duration: "5",
        aspect_ratio: "16:9",
      }
    });

    console.log('Prediction criada:', prediction.id);

    // Aguardar vídeo ficar pronto
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 180;

    while (
      completedPrediction.status !== "succeeded" &&
      completedPrediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      completedPrediction = await replicate.predictions.get(prediction.id);
      
      if (attempts % 15 === 0 && attempts > 0) {
        console.log(`Gerando... ${attempts * 2}s`);
      }
      
      attempts++;
    }

    if (completedPrediction.status === "failed") {
      console.error('Geração falhou:', completedPrediction.error);
      return NextResponse.json(
        { error: `Falha: ${completedPrediction.error}` },
        { status: 500 }
      );
    }

    if (completedPrediction.status !== "succeeded") {
      return NextResponse.json(
        { error: 'Timeout na geração' },
        { status: 500 }
      );
    }

    const output = completedPrediction.output;
    let videoUrl = null;

    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      videoUrl = output[output.length - 1] || output[0];
    } else if (output && typeof output === 'object') {
      videoUrl = (output as any).video || (output as any).mp4 || (output as any).url;
    }

    if (!videoUrl) {
      console.error('URL não encontrada:', output);
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
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}