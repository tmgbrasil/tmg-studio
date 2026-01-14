import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Verificar chave de API
    if (!process.env.RUNWAY_API_KEY) {
      console.error('RUNWAY_API_KEY não está configurada');
      return NextResponse.json(
        { error: 'Chave de API do Runway não configurada no servidor' },
        { status: 500 }
      );
    }

    console.log('=== Iniciando geração de vídeo ===');
    console.log('Prompt:', prompt);
    console.log('API Key presente:', !!process.env.RUNWAY_API_KEY);

    // Iniciar geração do vídeo
    const requestBody = {
      model: 'gen3a_turbo',
      promptText: prompt,
      duration: 5,
      ratio: '16:9',
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.runwayml.com/v1/video_generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Erro ao iniciar geração de vídeo';
      
      try {
        const errorData = JSON.parse(responseText);
        console.error('Erro detalhado da Runway:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.error('Resposta não é JSON:', responseText);
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: responseText,
          status: response.status
        },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText);
    const taskId = data.id;

    if (!taskId) {
      console.error('Task ID não encontrada na resposta:', data);
      return NextResponse.json(
        { error: 'Task ID não retornada pela API' },
        { status: 500 }
      );
    }

    console.log('Task ID criada:', taskId);

    // Polling para verificar quando o vídeo estiver pronto
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 90;

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Verificando status (tentativa ${attempts + 1})...`);

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
        const errorText = await statusResponse.text();
        console.error('Erro ao verificar status:', errorText);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Status atual:`, statusData.status);

      if (statusData.status === 'SUCCEEDED') {
        videoUrl = statusData.output?.[0] || statusData.outputVideo || statusData.video?.url;
        console.log('Vídeo gerado com sucesso:', videoUrl);
        break;
      } else if (statusData.status === 'FAILED') {
        const failureMessage = statusData.failure?.message || statusData.failureReason || 'Falha desconhecida';
        console.error('Geração falhou:', failureMessage);
        return NextResponse.json(
          { error: `Falha na geração: ${failureMessage}` },
          { status: 500 }
        );
      }

      attempts++;
    }

    if (!videoUrl) {
      console.error('Timeout: vídeo não foi gerado em 3 minutos');
      return NextResponse.json(
        { error: 'Timeout: O vídeo está demorando muito. Tente novamente.' },
        { status: 500 }
      );
    }

    console.log('=== Vídeo gerado com sucesso ===');
    return NextResponse.json({ 
      videoUrl: videoUrl,
      taskId: taskId
    });

  } catch (error: any) {
    console.error('Erro não tratado:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro desconhecido ao gerar vídeo',
        stack: error.stack 
      }, 
      { status: 500 }
    );
  }
}