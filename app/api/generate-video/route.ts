// app/api/generate-video/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    // ✅ VERSÃO CORRETA E ATUALIZADA DO MODELO KLING
    const output = await replicate.run(
      "kwaivgi/kling-v2.5-turbo-pro:b0e3b21e7c91466e9b6fe9db96fd05e9d5d9e69da9ea1f4098e23b949e2c6ec2",
      {
        input: {
          prompt: prompt,
          duration: "5", // 5 ou 10 segundos
          aspect_ratio: "16:9",
          // Adicione outros parâmetros se necessário
        }
      }
    );

    return NextResponse.json({ 
      success: true, 
      videoUrl: output 
    });

  } catch (error: any) {
    console.error('Erro ao gerar vídeo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao gerar vídeo' 
      },
      { status: 500 }
    );
  }
}