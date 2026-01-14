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

    console.log('Gerando vídeo com Kling AI (modelo mais recente):', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Kling AI 1.5 - Modelo mais recente (janeiro 2025)
    // Este é o modelo pro (melhor qualidade)
    const prediction = await replicate.predictions.create({
      version: "d8a7f02e83e75f539debd6d6bc87512c1a2cbc3de8ca5221f3d8fcf105542e6c",
      input: {
        prompt: prompt,
        // Configurações para máxima qualidade
        cfg_scale: 0.5, // Fidelidade ao prompt
        duration: "5", // 5 segundos
        aspect_ratio: "16:9", // Widescreen cinematográfico
        negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy, amateur",
      }
    });

    console.log('Prediction Kling AI criada:', prediction.id);
    console.log('⏳ Gerando vídeo cinematográfico... (2-5 min)');

    // Aguardar vídeo ficar pronto
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 200; // ~7 minutos (Kling pode demorar)

    while (
      completedPrediction.status !== "succeeded" &&
      completedPrediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      completedPrediction = await replicate.predictions.get(prediction.id);
      
      // Log de progresso a cada 30 segundos
      if (attempts % 15 === 0 && attempts > 0) {
        const elapsed = attempts * 2;
        console.log(`⏱️ Gerando... ${elapsed}s (Status: ${completedPrediction.status})`);
      }
      
      attempts++;
    }

    if (completedPrediction.status === "failed") {
      const errorMsg = completedPrediction.error || 'Erro desconhecido';
      console.error('❌ Kling AI falhou:', errorMsg);
      
      return NextResponse.json(
        { 
          error: `Falha na geração: ${errorMsg}`,
          details: 'O modelo Kling AI encontrou um problema. Tente um prompt diferente ou tente novamente.'
        },
        { status: 500 }
      );
    }

    if (completedPrediction.status !== "succeeded") {
      console.error('⏰ Timeout na geração');
      return NextResponse.json(
        { error: 'Timeout: O vídeo está demorando muito. Tente novamente com um prompt mais simples.' },
        { status: 500 }
      );
    }

    console.log('✅ Prediction completa:', completedPrediction);

    const output = completedPrediction.output;
    let videoUrl = null;

    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      // Pega o último item (geralmente é o vídeo final em melhor qualidade)
      videoUrl = output[output.length - 1] || output[0];
    } else if (output && typeof output === 'object') {
      videoUrl = (output as any).video || (output as any).mp4 || (output as any).url || (output as any).output;
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('❌ URL não encontrada no output:', output);
      return NextResponse.json(
        { 
          error: 'Vídeo gerado mas URL não encontrada',
          debug: {
            outputType: typeof output,
            output: output
          }
        },
        { status: 500 }
      );
    }

    console.log('🎬 Vídeo cinematográfico gerado com sucesso!');
    console.log('📹 URL:', videoUrl);

    return NextResponse.json({ 
      videoUrl: videoUrl,
      model: 'Kling AI 1.5 Pro',
      duration: '5 seconds',
      quality: 'cinematic'
    });

  } catch (error: any) {
    console.error('❌ Erro completo:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao gerar vídeo',
        details: error.toString()
      }, 
      { status: 500 }
    );
  }
}