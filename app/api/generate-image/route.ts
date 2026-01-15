import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    console.log('🎨 Gerando imagem com DALL-E 3...');
    console.log('📝 Prompt:', prompt);

    // Buscar token de autenticação
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Buscar usuário da sessão do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verificar créditos do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits_images')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar dados do usuário' },
        { status: 500 }
      );
    }

    if (userData.credits_images <= 0) {
      return NextResponse.json(
        { success: false, error: 'Créditos insuficientes' },
        { status: 402 }
      );
    }

    // Gerar imagem com DALL-E 3
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('Erro da OpenAI:', errorData);
      throw new Error(errorData.error?.message || 'Erro ao gerar imagem');
    }

    const openaiData = await openaiResponse.json();
    const imageUrl = openaiData.data[0].url;

    console.log('✅ Imagem gerada com sucesso!');
    console.log('🔗 URL:', imageUrl);

    // Descontar 1 crédito
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits_images: userData.credits_images - 1 })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar créditos:', updateError);
    }

    // Salvar projeto no histórico
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        type: 'image',
        description: prompt,
        image_url: imageUrl
      });

    if (projectError) {
      console.error('Erro ao salvar projeto:', projectError);
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error: any) {
    console.error('❌ Erro ao gerar imagem:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao gerar imagem' 
      },
      { status: 500 }
    );
  }
}