
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ChevronLeft, ChevronRight, Dumbbell, Flame, 
  CheckCircle2, Trophy, Sparkles, Loader2, 
  Download, Upload, Settings2, Trash2, ShieldCheck 
} from 'lucide-react';
import { 
  format, addMonths, subMonths, endOfMonth, 
  eachDayOfInterval, isToday, startOfWeek, 
  endOfWeek, isSameMonth, subDays, startOfMonth
} from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface AICoachResponse {
  message: string;
  advice: string;
}

// --- Gemini Service ---
const getCoachFeedback = async (completedDates: string[]): Promise<AICoachResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `你是一位活力的健身教練。使用者已打卡日期：${completedDates.join(", ")}。請用繁體中文給一段激勵的話和健身建議。JSON 格式：{"message": "...", "advice": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["message", "advice"]
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (error) {
    return {
      message: "繼續堅持！每一滴汗水都是進步。",
      advice: "記得多攝取蛋白質並保持充足睡眠。"
    };
  }
};

// --- App Component ---
const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [coachData, setCoachData] = useState<AICoachResponse | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STORAGE_KEY = 'fitcheck_records';

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCompletedDates(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedDates));
  }, [completedDates]);

  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setCompletedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const calculateStreak = () => {
    if (completedDates.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date();
    if (!completedDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      checkDate = subDays(checkDate, 1);
    }
    while (completedDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    return streak;
  };

  const handleFetchAI = async () => {
    setIsLoadingCoach(true);
    const data = await getCoachFeedback(completedDates);
    setCoachData(data);
    setIsLoadingCoach(false);
  };

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(endOfMonth(monthStart))
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col pb-10">
      <header className="bg-white px-6 py-8 border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Dumbbell size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">FitCheck</h1>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <Settings2 size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Flame size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">連續天數</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{calculateStreak()}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Trophy size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">累計打卡</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{completedDates.length}</div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {showSettings && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 animate-in fade-in">
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(completedDates)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'fitcheck_backup.json'; a.click();
            }} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl font-medium">
              <Download size={18} /> 匯出備份
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl font-medium">
              <Upload size={18} /> 匯入資料
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (res) => {
                try {
                  const data = JSON.parse(res.target?.result as string);
                  if (Array.isArray(data)) setCompletedDates(data);
                } catch { alert('格式錯誤'); }
              };
              reader.readAsText(file);
            }} />
            <button onClick={() => { if(confirm('確定清除？')) setCompletedDates([]); }} className="w-full py-3 text-red-500 font-medium">
              <Trash2 size={18} className="inline mr-2" /> 清除所有紀錄
            </button>
          </div>
        )}

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full"><ChevronLeft /></button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full"><ChevronRight /></button>
            </div>
          </div>

          <div className="calendar-grid text-center mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 py-2">{d}</span>
            ))}
          </div>

          <div className="calendar-grid gap-1">
            {days.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isDone = completedDates.includes(dateStr);
              const isCurr = isSameMonth(day, monthStart);
              return (
                <button key={i} onClick={() => toggleDate(day)}
                  className={`aspect-square relative flex items-center justify-center rounded-xl text-sm font-bold transition-all
                    ${!isCurr ? 'text-slate-200' : isToday(day) ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-200' : 'text-slate-600'}
                    ${isDone ? 'bg-indigo-600 text-white shadow-md scale-90' : 'hover:bg-slate-100'}
                  `}>
                  {format(day, 'd')}
                  {isDone && <CheckCircle2 size={12} fill="white" className="absolute -top-1 -right-1 text-indigo-600 checkmark-pop" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-indigo-200" />
            <span className="text-xs font-bold tracking-widest uppercase opacity-80">AI 健身教練</span>
          </div>
          {isLoadingCoach ? (
            <div className="py-6 flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-white/50" />
              <p className="text-sm opacity-60">教練分析中...</p>
            </div>
          ) : coachData ? (
            <div className="space-y-4">
              <p className="text-lg font-medium italic">「{coachData.message}」</p>
              <div className="flex gap-2 items-start bg-black/10 p-4 rounded-xl">
                <ShieldCheck size={18} className="text-indigo-300 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-50 leading-relaxed">{coachData.advice}</p>
              </div>
            </div>
          ) : (
            <button onClick={handleFetchAI} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold shadow-lg hover:bg-indigo-50 transition-colors">
              獲取教練建議
            </button>
          )}
        </section>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
