import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Iniciar geração do vídeo
    const response = await fetch('https://api.runwayml.com/v1/video_generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gen3a_turbo',
        prompt_text: prompt,
        duration: 5, // 5 segundos
        ratio: '16:9',
        watermark: false,
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao iniciar geração de vídeo');
    }

    const data = await response.json();
    const taskId = data.id;

    // Polling para verificar quando o vídeo estiver pronto
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutos máximo

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos
      
      const statusResponse = await fetch(`https://api.runwayml.com/v1/video_generations/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        }
      });

      const statusData = await statusResponse.json();

      if (statusData.status === 'SUCCEEDED') {
        videoUrl = statusData.output[0];
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
    console.error('Erro ao gerar vídeo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: 'RUNWAY_API_KEY não configurada' },
        { status: 500 }
      );
    }

    console.log('Iniciando geração de vídeo:', prompt);

    // Iniciar geração do vídeo
    const response = await fetch('https://api.runwayml.com/v1/video_generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen3a_turbo',
        promptText: prompt,
        duration: 5,
        ratio: '16:9',
        seed: Math.floor(Math.random() * 1000000),
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro Runway:', errorData);
      throw new Error(errorData.message || 'Erro ao iniciar geração de vídeo');
    }

    const data = await response.json();
    const taskId = data.id;

    console.log('Task ID criada:', taskId);

    // Polling para verificar quando o vídeo estiver pronto
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 90; // 3 minutos máximo (2 segundos * 90 = 180s)

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos
      
      const statusResponse = await fetch(
        `https://api.runwayml.com/v1/video_generations/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
            'X-Runway-Version': '2024-11-06',
          }
        }
      );

      if (!statusResponse.ok) {
        console.error('Erro ao verificar status:', await statusResponse.text());
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Tentativa ${attempts + 1}: Status =`, statusData.status);

      if (statusData.status === 'SUCCEEDED') {
        videoUrl = statusData.output?.[0] || statusData.outputVideo;
        console.log('Vídeo gerado com sucesso:', videoUrl);
        break;
      } else if (statusData.status === 'FAILED') {
        throw new Error(statusData.failure?.message || 'Falha na geração do vídeo');
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Timeout na geração do vídeo. Tente novamente.');
    }

    return NextResponse.json({ 
      videoUrl: videoUrl,
      taskId: taskId
    });

  } catch (error: any) {
    console.error('Erro ao gerar vídeo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar vídeo' }, 
      { status: 500 }
    );
  }
}