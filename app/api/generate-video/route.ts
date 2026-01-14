import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'Chave de API do Runway não configurada' },
        { status: 500 }
      );
    }

    console.log('Iniciando geração de vídeo:', prompt);

    // URL CORRETA da API do Runway
    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        promptImage: null,
        promptText: prompt,
        model: 'gen3a_turbo',
        watermark: false,
        duration: 5,
        ratio: '16:9',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Runway:', errorText);
      return NextResponse.json(
        { error: `Erro da API Runway: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const taskId = data.id;

    console.log('Task criada:', taskId);

    // Polling: aguardar vídeo ficar pronto
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 90;

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(
        `https://api.dev.runwayml.com/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          }
        }
      );

      if (!statusResponse.ok) {
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Status (${attempts + 1}):`, statusData.status);

      if (statusData.status === 'SUCCEEDED') {
        videoUrl = statusData.output?.[0];
        break;
      } else if (statusData.status === 'FAILED') {
        throw new Error('Falha na geração do vídeo');
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Timeout na geração do vídeo');
    }

    return NextResponse.json({ 
      videoUrl: videoUrl,
      taskId: taskId
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}