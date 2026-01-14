'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2, Image as ImageIcon, Download } from 'lucide-react';

interface Message {
  role: string;
  content: string;
  hasPrompt?: boolean;
  imageUrl?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de criação visual da TMG Studio. Descreva o material que você precisa e vou te ajudar a criar imagens e vídeos personalizados!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, references: [] })
      });

      const data = await res.json();
      const assistantMessage = data.response || 'Desculpe, houve um erro.';
      
      const hasPrompt = assistantMessage.toLowerCase().includes('prompt') || 
                       assistantMessage.toLowerCase().includes('dall-e') ||
                       assistantMessage.toLowerCase().includes('imagem');
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage,
        hasPrompt: hasPrompt
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, houve um erro ao processar sua mensagem.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (messageIndex: number) => {
    setGeneratingImage(true);
    
    try {
      const message = messages[messageIndex];
      const prompt = message.content;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      
      if (data.imageUrl) {
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex 
            ? { ...msg, imageUrl: data.imageUrl }
            : msg
        ));
      } else {
        alert('Erro ao gerar imagem: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TMG Studio</h1>
              <p className="text-xs text-gray-500">Crie materiais visuais com IA</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-orange-600">Beta</span> • Powered by Claude & DALL-E
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{height: 'calc(100vh - 200px)'}}>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.role === 'assistant' && msg.hasPrompt && !msg.imageUrl && (
                    <button
                      onClick={() => generateImage(idx)}
                      disabled={generatingImage}
                      className="mt-3 w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gerando imagem...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>Gerar Imagem com DALL-E</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {msg.imageUrl && (
                    <div className="mt-3 space-y-2">
                      <img 
                        src={msg.imageUrl} 
                        alt="Imagem gerada" 
                        className="w-full rounded-lg border-2 border-orange-200"
                      />
                      <a
                        href={msg.imageUrl}
                        download="tmg-studio-image.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Imagem</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Descreva o material visual que você precisa..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Enviar</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Exemplos: banner para promoção de pizza • logo moderno para salão • post Instagram café
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}