import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function GET() {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        error: 'Token não configurado',
        hasToken: false
      });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Testar com um modelo simples de texto
    const output = await replicate.run(
      "meta/llama-2-7b-chat:13c3cdee13ee059ab779f0291d29054dab00a47dad8261375654de5540165fb0",
      {
        input: {
          prompt: "Hello, just testing!",
          max_length: 50
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Replicate está funcionando!',
      hasToken: true,
      testOutput: output
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}