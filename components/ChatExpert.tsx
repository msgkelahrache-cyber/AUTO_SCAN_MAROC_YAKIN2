
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Car, Cpu } from 'lucide-react';
import { chatWithExpert } from '../services/geminiService';
import { ChatMessage, AppLanguage } from '../types';
import { t } from '../services/localization';

interface ChatExpertProps {
  companyName: string;
  appName: string;
  language: AppLanguage;
}

const ChatExpert: React.FC<ChatExpertProps> = ({ companyName, appName, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: t('chatWelcome', language, { appName: appName || 'VIN SCAN PRO' }), 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // FIX: Correctly mapping history to the Content structure required by the Gemini SDK (role and parts array).
      const chatHistory = messages.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.text }] 
      }));
      const response = await chatWithExpert(chatHistory, input);
      const botMessage: ChatMessage = { role: 'model', text: response || "Je rencontre une difficulté momentanée. Veuillez reformuler.", timestamp: Date.now() };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Cpu size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              KHABIR <span className="font-medium text-lg" style={{ fontFamily: 'Cairo' }}>خبير</span>
            </h3>
            <p className="text-xs text-indigo-600 font-bold font-tifinagh tracking-wide">AMUSNAW ⴰⵎⵓⵙⵏⴰⵡ</p>
          </div>
        </div>
        <div className="hidden sm:flex bg-white px-4 py-2 rounded-xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center gap-2 shadow-sm">
          <Sparkles size={14} className="text-indigo-500" />
          Powered by Gemini
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
            <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`p-6 rounded-[2rem] shadow-sm leading-relaxed text-sm font-medium ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-[9px] mt-3 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-500' : 'text-slate-300'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
             <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                   <Bot size={20} />
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-[2rem] rounded-tl-none flex gap-2 items-center h-16">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="relative max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chatPlaceholder', language)}
            className="flex-1 bg-white border border-slate-200 rounded-2xl pl-6 pr-4 py-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white w-14 rounded-2xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={22} />
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase tracking-widest">
          {t('chatDisclaimer', language)}
        </p>
      </div>
    </div>
  );
};

export default ChatExpert;
