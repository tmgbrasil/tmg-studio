'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Sparkles, Loader2, Image as ImageIcon, Download, Coins, AlertCircle, LogOut, Film } from 'lucide-react';
import AuthForm from '@/components/AuthForm';

interface Message {
  role: string;
  content: string;
  hasPrompt?: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  credits_images: number;
  credits_videos: number;
  plan: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de criação visual da TMG Studio. Descreva o material que você precisa e vou te ajudar a criar imagens e vídeos personalizados com IA!'
    }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [showCreditAlert, setShowCreditAlert] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserData(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

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
                       assistantMessage.toLowerCase().includes('imagem') ||
                       assistantMessage.toLowerCase().includes('banner') ||
                       assistantMessage.toLowerCase().includes('logo') ||
                       assistantMessage.toLowerCase().includes('criar') ||
                       assistantMessage.toLowerCase().includes('vídeo') ||
                       assistantMessage.toLowerCase().includes('video') ||
                       assistantMessage.toLowerCase().includes('animação');
      
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
      setChatLoading(false);
    }
  };

  const generateImage = async (messageIndex: number) => {
    if (!userData || userData.credits_images <= 0) {
      setShowCreditAlert(true);
      setTimeout(() => setShowCreditAlert(false), 5000);
      return;
    }

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
        const { error } = await supabase
          .from('users')
          .update({ credits_images: userData.credits_images - 1 })
          .eq('id', user.id);

        if (!error) {
          setUserData(prev => prev ? { ...prev, credits_images: prev.credits_images - 1 } : null);
        }
        
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

  const generateVideo = async (messageIndex: number) => {
    if (!userData || userData.credits_videos <= 0) {
      alert('Você não tem créditos de vídeo suficientes!');
      return;
    }

    setGeneratingVideo(true);
    
    try {
      const message = messages[messageIndex];
      const prompt = message.content;

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();
      
      if (data.videoUrl) {
        const { error } = await supabase
          .from('users')
          .update({ credits_videos: userData.credits_videos - 1 })
          .eq('id', user.id);

        if (!error) {
          setUserData(prev => prev ? { ...prev, credits_videos: prev.credits_videos - 1 } : null);
        }
        
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex 
            ? { ...msg, videoUrl: data.videoUrl }
            : msg
        ));
      } else {
        alert('Erro ao gerar vídeo: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar vídeo. Tente novamente.');
    } finally {
      setGeneratingVideo(false);
    }
  };

  const getCreditColor = (type: 'image' | 'video') => {
    if (!userData) return 'text-gray-600';
    const credits = type === 'image' ? userData.credits_images : userData.credits_videos;
    if (credits > 20) return 'text-green-600';
    if (credits > 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditBgColor = (type: 'image' | 'video') => {
    if (!userData) return 'bg-gray-50 border-gray-200';
    const credits = type === 'image' ? userData.credits_images : userData.credits_videos;
    if (credits > 20) return 'bg-green-50 border-green-200';
    if (credits > 5) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={checkUser} />;
  }

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
              <p className="text-xs text-gray-500">Olá, {userData?.name || 'Usuário'}!</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 ${getCreditBgColor('image')}`}>
              <ImageIcon className={`w-4 h-4 ${getCreditColor('image')}`} />
              <div>
                <div className="text-xs text-gray-500">Imagens</div>
                <div className={`text-sm font-bold ${getCreditColor('image')}`}>
                  {userData?.credits_images || 0}
                </div>
              </div>
            </div>

            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 ${getCreditBgColor('video')}`}>
              <Film className={`w-4 h-4 ${getCreditColor('video')}`} />
              <div>
                <div className="text-xs text-gray-500">Vídeos</div>
                <div className={`text-sm font-bold ${getCreditColor('video')}`}>
                  {userData?.credits_videos || 0}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {showCreditAlert && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Créditos Esgotados</h3>
              <p className="text-sm text-red-700 mt-1">
                Você não tem créditos suficientes. Entre em contato para renovar seu plano!
              </p>
            </div>
          </div>
        </div>
      )}

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
                  
                  {msg.role === 'assistant' && msg.hasPrompt && !msg.imageUrl && !msg.videoUrl && (
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={() => generateImage(idx)}
                        disabled={generatingImage || generatingVideo || !userData || userData.credits_images <= 0}
                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                      >
                        {generatingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gerando imagem...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            <span>Gerar Imagem (1 crédito)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => generateVideo(idx)}
                        disabled={generatingImage || generatingVideo || !userData || userData.credits_videos <= 0}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                      >
                        {generatingVideo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gerando vídeo... (1-2 min)</span>
                          </>
                        ) : (
                          <>
                            <Film className="w-4 h-4" />
                            <span>Gerar Vídeo (1 crédito)</span>
                          </>
                        )}
                      </button>
                    </div>
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

                  {msg.videoUrl && (
                    <div className="mt-3 space-y-2">
                      <video 
                        src={msg.videoUrl} 
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="w-full rounded-lg border-2 border-purple-200 bg-black"
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                      
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        💡 <strong>Dica:</strong> O vídeo pode demorar alguns segundos para carregar. Se não aparecer, clique no botão de download abaixo!
                      </div>
                      
                      <a
                        href={msg.videoUrl}
                        download="tmg-studio-video.mp4"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Vídeo</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatLoading && (
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
                placeholder="Descreva a imagem ou vídeo que você precisa..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !input.trim()}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Enviar</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              {userData?.plan || 'Free'} • {userData?.credits_images || 0} imagens • {userData?.credits_videos || 0} vídeos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}