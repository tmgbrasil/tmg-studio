import { NextResponse } from 'next/server';

export async function GET() {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasGoogleClient = !!process.env.GOOGLE_CLIENT_ID;

  return NextResponse.json({
    status: 'OK',
    message: 'TMG Studio - Teste de Configuração',
    timestamp: new Date().toISOString(),
    environment: {
      anthropic: hasAnthropicKey ? '✅ Configurado' : '❌ Faltando',
      openai: hasOpenAIKey ? '✅ Configurado' : '❌ Faltando',
      supabase: hasSupabaseUrl ? '✅ Configurado' : '❌ Faltando',
      google: hasGoogleClient ? '✅ Configurado' : '❌ Faltando',
    },
    node_env: process.env.NODE_ENV,
  });
  }