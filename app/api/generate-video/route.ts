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

    console.log('Gerando vídeo com Stable Video Diffusion:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // PASSO 1: Primeiro gerar uma imagem com DALL-E
    console.log('Gerando imagem base com DALL-E...');
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      );
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = imageResponse.data[0].url;
    console.log('Imagem base gerada:', imageUrl);

    // PASSO 2: Animar a imagem com Stable Video Diffusion
    console.log('Animando imagem com Stable Video Diffusion...');

    const prediction = await replicate.predictions.create({
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      input: {
        input_image: imageUrl,
        sizing_strategy: "maintain_aspect_ratio",
        frames_per_second: 6,
        motion_bucket_id: 127,
        cond_aug: 0.02,
      }
    });

    console.log('Prediction criada:', prediction.id);

    // Aguardar vídeo ficar pronto
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 120;

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
      return NextResponse.json(
        { error: 'Timeout na geração do vídeo' },
        { status: 500 }
      );
    }

    const output = completedPrediction.output;
    let videoUrl = null;

    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      videoUrl = output[0];
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
    console.error('Erro completo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}