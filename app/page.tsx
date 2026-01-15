'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Sparkles, Loader2, Image as ImageIcon, Download, Coins, AlertCircle, LogOut, File } from 'lucide-react';
import AuthForm from '@/components/AuthForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  role: string;
  content: string;
  hasPrompt?: boolean;
  imageUrl?: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  credits_images: number;
  plan: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de criação visual da TMG Studio. Descreva o material que você precisa e vou te ajudar a criar!'
    }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setChatLoading(true);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, references: [] })
      });

      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'Desculpe, houve um erro ao processar sua mensagem.',
        hasPrompt: !!data.hasPrompt
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua mensagem.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!userData) return;

    if (userData.credits_images <= 0) {
      alert('Você não tem créditos suficientes para gerar imagens.');
      return;
    }

    try {
      setGeneratingImage(true);

      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage.content;

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            imageUrl: data.imageUrl
          };
          return newMessages;
        });

        // Atualizar créditos
        await loadUserData(user.id);
      } else {
        alert('Erro ao gerar imagem: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserData(null);
    setMessages([{
      role: 'assistant',
      content: 'Olá! Sou seu assistente de criação visual da TMG Studio. Descreva o material que você precisa e vou te ajudar a criar!'
    }]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 text-white p-2 rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">TMG Studio</h1>
              <p className="text-sm text-gray-500">Crie materiais visuais com IA</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Créditos de Imagens */}
            <div className="flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-lg">
              <ImageIcon className="w-5 h-5 text-orange-600" />
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{userData?.credits_images || 0}</div>
                <div className="text-xs text-gray-500">Imagens</div>
              </div>
            </div>

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
        <div className="w-full max-w-4xl mx-auto space-y-3">
          {/* Messages */}
          <div className="bg-white border-b border-gray-200 px-4 py-4">
            <div className="max-w-6xl mx-auto flex flex-col space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-4xl px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-orange-100 text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

{/* Preview da Imagem */}
{msg.imageUrl && (
  <div className="mt-3 space-y-2">
    <img
      src={msg.imageUrl}
      alt="Imagem gerada"
      className="w-full rounded-lg border-2 border-orange-200"
    />
    
      href={msg.imageUrl}
      download="tmg-studio-image.png"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center space-x-2 bg-gradient-to-br from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all"
    >
      <Download className="w-4 h-4" />
      <span>Baixar Imagem</span>
    </a>
  </div>
)}

                    {/* Botão de Gerar Imagem */}
                    {msg.role === 'assistant' && msg.hasPrompt && !msg.imageUrl && idx === messages.length - 1 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          onClick={handleGenerateImage}
                          disabled={generatingImage || (userData?.credits_images || 0) <= 0}
                          className="flex items-center space-x-2 bg-gradient-to-br from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {generatingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4" />
                              <span>Gerar Imagem</span>
                            </>
                          )}
                        </button>

                        {(userData?.credits_images || 0) <= 0 && (
                          <div className="flex items-center space-x-1 text-xs text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Sem créditos</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-4xl px-4 py-3 rounded-lg bg-gray-100">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-4">
            <div className="max-w-6xl mx-auto flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Descreva o material que você precisa..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !input.trim()}
                className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-3 rounded-lg hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}