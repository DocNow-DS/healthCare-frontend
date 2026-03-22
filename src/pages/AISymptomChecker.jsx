import { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const initialMessages = [
  { id: 1, text: "Hello! I'm your DocNow AI assistant. Tell me about your symptoms, and I'll help you find the right specialist.", sender: 'ai' },
];

export default function AISymptomChecker() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages([...messages, userMsg]);
    setInput('');

    // Mock AI reply
    setTimeout(() => {
      const aiReply = { 
        id: Date.now() + 1, 
        text: "Based on the chest pressure you described, I suggest speaking with a Cardiologist. Would you like me to show you available specialists?", 
        sender: 'ai',
        suggestion: 'Cardiology'
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#182C61] tracking-tighter">AI Pulse</h1>
          <p className="text-[#808e9b] mt-1 font-black uppercase tracking-widest text-[9px]">Precision Assistant</p>
        </div>
        <div className="h-10 w-10 bg-[#eb2f06] rounded-xl flex items-center justify-center shadow-lg shadow-[#eb2f06]/20">
          <SparklesIcon className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Chat Container */}
        <div className="flex-1 bg-white border-2 border-slate-50 rounded-[2rem] shadow-xl shadow-[#182C61]/5 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}
              >
                <div className={`max-w-[85%] p-4 rounded-[1.5rem] ${
                  msg.sender === 'user' 
                  ? 'bg-[#182C61] text-white rounded-tr-none shadow-lg' 
                  : 'bg-slate-50 text-[#1e272e] rounded-tl-none border border-slate-100 font-medium'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.suggestion && (
                    <div className="mt-4 pt-4 border-t border-[#182C61]/10">
                      <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Recommendation</p>
                      <button className="flex items-center text-[#eb2f06] font-black hover:translate-x-1 transition-transform uppercase tracking-widest text-[9px]">
                        Find {msg.suggestion} Specialist <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-6 border-t-2 border-slate-50 bg-slate-50/30">
            <div className="relative group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe symptoms..." 
                className="w-full pl-6 pr-16 py-4 bg-white border-2 border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] font-bold text-sm text-[#1e272e] shadow-lg transition-all"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#182C61] text-white rounded-xl hover:bg-[#eb2f06] transition-all shadow-md"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="w-full lg:w-80 space-y-6">
           <div className="bg-[#182C61] p-8 rounded-[2rem] shadow-xl shadow-[#182C61]/20 text-white relative overflow-hidden">
              <div className="relative z-10">
                 <h3 className="text-lg font-black mb-4 tracking-tight">Guide</h3>
                 <ul className="space-y-4">
                    {[
                      'Describe symptoms',
                      'AI analyzes patterns',
                      'Get recommendations'
                    ].map((text, i) => (
                      <li key={i} className="flex items-start">
                        <div className="h-5 w-5 rounded bg-white/10 flex items-center justify-center mr-3 mt-0.5 font-black text-[10px]">{i+1}</div>
                        <p className="text-xs font-bold text-white/80">{text}</p>
                      </li>
                    ))}
                 </ul>
              </div>
           </div>

           <div className="dashboard-card border-[#eb2f06]/10 p-6">
              <div className="flex items-center space-x-3 mb-4">
                 <div className="p-2 bg-[#eb2f06]/5 rounded-lg">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#eb2f06]" />
                 </div>
                 <h3 className="font-black text-[#182C61] text-sm tracking-tight">Safety</h3>
              </div>
              <p className="text-[11px] text-[#808e9b] font-bold leading-relaxed">
                Emergency? Call services immediately.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
