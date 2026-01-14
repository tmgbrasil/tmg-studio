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

    console.log('🎬 Gerando vídeo cinematográfico com Kling AI:', prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Kling AI 1.5 - Qualidade cinematográfica profissional
    console.log('Iniciando geração com Kling AI 1.5...');
    
    const prediction = await replicate.predictions.create({
      version: "ee7cf78b031d92c9ccdbb1354919c700e96c0c09ff36993c6c0e4782c9f4043d",
      input: {
        prompt: prompt,
        duration: "5", // 5 segundos
        aspect_ratio: "16:9",
        cfg_scale: 0.5, // Qualidade vs criatividade
      }
    });

    console.log('✅ Task criada:', prediction.id);

    // Aguardar vídeo ficar pronto (Kling demora mas vale muito a pena!)
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 240; // 8 minutos (Kling pode demorar para alta qualidade)

    console.log('⏳ Gerando vídeo cinematográfico... isso pode levar 3-5 minutos');

    while (
      completedPrediction.status !== "succeeded" &&
      completedPrediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      completedPrediction = await replicate.predictions.get(prediction.id);
      
      // Log a cada 30 segundos
      if (attempts % 15 === 0 && attempts > 0) {
        const elapsed = attempts * 2;
        console.log(`⏱️  ${elapsed}s decorridos... Status: ${completedPrediction.status}`);
      }
      
      attempts++;
    }

    if (completedPrediction.status === "failed") {
      console.error('❌ Geração falhou:', completedPrediction.error);
      return NextResponse.json(
        { error: `Falha na geração: ${completedPrediction.error || 'Erro desconhecido'}` },
        { status: 500 }
      );
    }

    if (completedPrediction.status !== "succeeded") {
      console.error('⏰ Timeout na geração');
      return NextResponse.json(
        { error: 'Timeout: O vídeo demorou muito para ser gerado. Tente novamente ou simplifique o prompt.' },
        { status: 500 }
      );
    }

    const output = completedPrediction.output;
    let videoUrl = null;

    // Extrair URL do vídeo
    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output)) {
      videoUrl = output[0]; // Primeiro item do array
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

    const totalTime = attempts * 2;
    console.log(`🎉 Vídeo cinematográfico gerado com sucesso em ${totalTime}s!`);
    console.log('📹 URL:', videoUrl);

    return NextResponse.json({ 
      videoUrl: videoUrl,
      generationTime: totalTime
    });

  } catch (error: any) {
    console.error('💥 Erro completo:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao gerar vídeo',
        details: error.toString()
      }, 
      { status: 500 }
    );
  }
}