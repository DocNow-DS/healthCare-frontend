import { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  HeartIcon,
  UserIcon,
  ClockIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8087';

const initialMessages = [
  { id: 1, text: "Hello! I'm your DocNow AI assistant. Tell me about your symptoms, and I'll help you find the right specialist.", sender: 'ai' },
];

export default function AISymptomChecker() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    duration: '',
    severity: 'moderate'
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/symptom-checker/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: input,
          age: formData.age || 'Not specified',
          gender: formData.gender || 'Not specified',
          duration: formData.duration || 'Not specified',
          severity: formData.severity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiReply = { 
        id: Date.now() + 1, 
        text: data.summary,
        sender: 'ai',
        analysis: data
      };
      
      setMessages(prev => [...prev, aiReply]);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = { 
        id: Date.now() + 1, 
        text: "I'm sorry, I couldn't analyze your symptoms at the moment. Please try again or consult a healthcare professional directly.", 
        sender: 'ai',
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'EMERGENCY': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const handleFindDoctor = (specialty) => {
    navigate('/dashboard/doctors', { state: { specialty } });
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
                <div className={`max-w-[90%] p-4 rounded-[1.5rem] ${
                  msg.sender === 'user' 
                  ? 'bg-[#182C61] text-white rounded-tr-none shadow-lg' 
                  : msg.isError
                    ? 'bg-red-50 text-red-700 rounded-tl-none border border-red-100 font-medium'
                    : 'bg-slate-50 text-[#1e272e] rounded-tl-none border border-slate-100 font-medium'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  
                  {/* AI Analysis Details */}
                  {msg.analysis && (
                    <div className="mt-4 space-y-4">
                      {/* Urgency Level */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black ${getUrgencyColor(msg.analysis.urgencyLevel)}`}>
                        <SignalIcon className="h-3 w-3" />
                        {msg.analysis.urgencyLevel} PRIORITY
                      </div>

                      {/* Possible Conditions */}
                      {msg.analysis.possibleConditions && msg.analysis.possibleConditions.length > 0 && (
                        <div className="pt-3 border-t border-[#182C61]/10">
                          <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-2 flex items-center gap-1">
                            <LightBulbIcon className="h-3 w-3" />
                            Possible Conditions
                          </p>
                          <ul className="space-y-1">
                            {msg.analysis.possibleConditions.map((condition, idx) => (
                              <li key={idx} className="text-xs text-[#1e272e] font-medium">• {condition}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Specialties */}
                      {msg.analysis.recommendedSpecialties && msg.analysis.recommendedSpecialties.length > 0 && (
                        <div className="pt-3 border-t border-[#182C61]/10">
                          <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-2 flex items-center gap-1">
                            <HeartIcon className="h-3 w-3" />
                            Recommended Specialists
                          </p>
                          <div className="space-y-2">
                            {msg.analysis.recommendedSpecialties.map((spec, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#182C61]">{spec.specialty}</span>
                                  <span className="text-[10px] text-[#808e9b]">Priority: {spec.priority}</span>
                                </div>
                                <p className="text-[10px] text-[#808e9b] mt-1">{spec.reason}</p>
                                <button 
                                  onClick={() => handleFindDoctor(spec.specialty)}
                                  className="mt-2 flex items-center text-[#eb2f06] font-black hover:translate-x-1 transition-transform uppercase tracking-widest text-[9px]"
                                >
                                  Find {spec.specialty} <ArrowRightIcon className="ml-1 h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Self Care Tips */}
                      {msg.analysis.selfCareTips && msg.analysis.selfCareTips.length > 0 && (
                        <div className="pt-3 border-t border-[#182C61]/10">
                          <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-2">Self Care Tips</p>
                          <ul className="space-y-1">
                            {msg.analysis.selfCareTips.map((tip, idx) => (
                              <li key={idx} className="text-xs text-[#1e272e] font-medium">• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Follow-up Questions */}
                      {msg.analysis.followUpQuestions && (
                        <div className="pt-3 border-t border-[#182C61]/10">
                          <p className="text-[9px] font-black text-[#808e9b] uppercase tracking-widest mb-1">Follow-up Questions</p>
                          <p className="text-xs text-[#1e272e] italic">{msg.analysis.followUpQuestions}</p>
                        </div>
                      )}

                      {/* Disclaimer */}
                      {msg.analysis.disclaimer && (
                        <div className="pt-3 border-t border-[#182C61]/10">
                          <p className="text-[9px] text-[#808e9b] italic leading-relaxed">
                            <ExclamationTriangleIcon className="h-3 w-3 inline mr-1" />
                            {msg.analysis.disclaimer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 text-[#1e272e] rounded-[1.5rem] rounded-tl-none border border-slate-100 p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#182C61] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#182C61] rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-[#182C61] rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Info Form Toggle */}
          <div className="px-6 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setShowForm(!showForm)}
              className="text-[10px] font-bold text-[#808e9b] hover:text-[#182C61] transition-colors flex items-center gap-1"
            >
              <UserIcon className="h-3 w-3" />
              {showForm ? 'Hide Patient Info' : 'Add Patient Info (Optional)'}
            </button>
            
            {showForm && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#182C61]"
                />
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#182C61]"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="text"
                  placeholder="Duration (e.g., 3 days)"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#182C61]"
                />
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({...formData, severity: e.target.value})}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#182C61]"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-6 border-t-2 border-slate-50 bg-slate-50/30">
            <div className="relative group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your symptoms... (e.g., 'I have a headache and fever')" 
                className="w-full pl-6 pr-16 py-4 bg-white border-2 border-transparent rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-[#182C61]/5 focus:border-[#182C61] font-bold text-sm text-[#1e272e] shadow-lg transition-all"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#182C61] text-white rounded-xl hover:bg-[#eb2f06] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                 <h3 className="text-lg font-black mb-4 tracking-tight">How It Works</h3>
                 <ul className="space-y-4">
                    {[
                      'Describe your symptoms in detail',
                      'AI analyzes patterns using medical knowledge',
                      'Get specialist recommendations'
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
                    <ExclamationTriangleIcon className="h-5 w-5 text-[#eb2f06]" />
                 </div>
                 <h3 className="font-black text-[#182C61] text-sm tracking-tight">Important Notice</h3>
              </div>
              <p className="text-[11px] text-[#808e9b] font-bold leading-relaxed">
                This AI assistant provides preliminary guidance only. It is NOT a substitute for professional medical diagnosis or treatment.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-[#eb2f06] font-black flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  Emergency? Call 108 or visit nearest hospital immediately.
                </p>
              </div>
           </div>

           <div className="dashboard-card border-green-100 p-6">
              <div className="flex items-center space-x-3 mb-4">
                 <div className="p-2 bg-green-50 rounded-lg">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
                 </div>
                 <h3 className="font-black text-[#182C61] text-sm tracking-tight">Tips</h3>
              </div>
              <ul className="space-y-2 text-[11px] text-[#808e9b] font-medium">
                <li>• Be specific about symptom locations</li>
                <li>• Mention when symptoms started</li>
                <li>• Note any triggers or relievers</li>
                <li>• Include relevant medical history</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
