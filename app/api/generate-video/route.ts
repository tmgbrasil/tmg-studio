import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    console.log('Iniciando geração de vídeo:', prompt);

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Token não configurado' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('Chamando Stable Video Diffusion...');

    // Primeiro, gerar uma imagem base com DALL-E
    const imageResponse = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    let imageUrl = null;
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      imageUrl = imageData.imageUrl;
    }

    // Se não conseguir gerar imagem, usar modelo text-to-video
    if (!imageUrl) {
      console.log('Usando modelo text-to-video direto...');
      
      const output: any = await replicate.run(
        "deforum/deforum_stable_diffusion:e22e77495f2fb83c34d5fae2ad8ab63c0a87b6b573b6208e1535b23b89ea66d6",
        {
          input: {
            prompt_text: prompt,
            max_frames: 60,
            animation_mode: "2D",
          }
        }
      );

      console.log('Output:', output);

      let videoUrl = null;
      if (Array.isArray(output) && output.length > 0) {
        videoUrl = output[output.length - 1]; // Último item é geralmente o vídeo final
      } else if (typeof output === 'string') {
        videoUrl = output;
      } else if (output && typeof output === 'object') {
        videoUrl = output.video || output.output || output.mp4;
      }

      if (!videoUrl) {
        console.error('URL não encontrada. Output:', JSON.stringify(output));
        return NextResponse.json(
          { error: 'Erro ao processar vídeo gerado' },
          { status: 500 }
        );
      }

      console.log('Vídeo gerado:', videoUrl);

      return NextResponse.json({ 
        videoUrl: videoUrl
      });
    }

    // Se tiver imagem, usar Stable Video Diffusion
    console.log('Usando Stable Video Diffusion com imagem base:', imageUrl);

    const output: any = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          input_image: imageUrl,
          sizing_strategy: "maintain_aspect_ratio",
          frames_per_second: 6,
          motion_bucket_id: 127,
        }
      }
    );

    console.log('Output:', output);

    let videoUrl = null;
    if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (typeof output === 'string') {
      videoUrl = output;
    }

    if (!videoUrl) {
      console.error('URL não encontrada. Output:', JSON.stringify(output));
      return NextResponse.json(
        { error: 'Erro ao processar vídeo gerado' },
        { status: 500 }
      );
    }

    console.log('Vídeo gerado:', videoUrl);

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