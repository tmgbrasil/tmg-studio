import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    console.log('=== INICIANDO GERAÇÃO DE VÍDEO ===');
    console.log('Prompt:', prompt);

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('Token do Replicate não configurado');
      return NextResponse.json(
        { error: 'Token do Replicate não configurado no servidor' },
        { status: 500 }
      );
    }

    console.log('Token presente:', process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...');

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('Cliente Replicate criado');

    // Usando AnimateDiff
    console.log('Chamando modelo AnimateDiff...');
    
    const output = await replicate.run(
      "lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
      {
        input: {
          prompt: prompt,
          num_frames: 16,
          guidance_scale: 7.5,
          num_inference_steps: 25,
        }
      }
    );

    console.log('Output recebido:', JSON.stringify(output, null, 2));
    console.log('Tipo do output:', typeof output);
    console.log('É array?', Array.isArray(output));

    // Extrair URL do vídeo de forma mais robusta
    let videoUrl = null;
    
    if (typeof output === 'string') {
      console.log('Output é string direta');
      videoUrl = output;
    } else if (Array.isArray(output)) {
      console.log('Output é array, tamanho:', output.length);
      if (output.length > 0) {
        videoUrl = output[0];
        console.log('Primeira posição do array:', videoUrl);
      }
    } else if (output && typeof output === 'object') {
      console.log('Output é objeto, chaves:', Object.keys(output));
      videoUrl = output.video || output.output || output.url || output.mp4;
    }

    if (!videoUrl) {
      console.error('URL do vídeo não encontrada!');
      console.error('Output completo:', JSON.stringify(output, null, 2));
      return NextResponse.json(
        { 
          error: 'Vídeo gerado mas URL não encontrada',
          debug: {
            outputType: typeof output,
            outputKeys: output && typeof output === 'object' ? Object.keys(output) : null,
            output: output
          }
        },
        { status: 500 }
      );
    }

    console.log('=== VÍDEO GERADO COM SUCESSO ===');
    console.log('URL do vídeo:', videoUrl);

    return NextResponse.json({ 
      videoUrl: videoUrl
    });

  } catch (error: any) {
    console.error('=== ERRO NA GERAÇÃO ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('Erro completo:', JSON.stringify(error, null, 2));

    return NextResponse.json(
      { 
        error: error.message || 'Erro desconhecido ao gerar vídeo',
        details: error.toString(),
        stack: error.stack
      }, 
      { status: 500 }
    );
  }
}