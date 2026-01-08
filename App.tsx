
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Flame, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Trophy,
  Sparkles,
  Loader2,
  Download,
  Upload,
  Settings2,
  Trash2,
  ShieldCheck
} from 'lucide-react';
// Fixed date-fns imports by removing unused members (parseISO, isSameDay, isBefore) and ensuring correct exports are targeted
import { 
  format, 
  addMonths, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  subDays
} from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { getCoachFeedback } from './services/geminiService';
import { AICoachResponse } from './types';

const STORAGE_KEY = 'fitcheck_records';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [coachData, setCoachData] = useState<AICoachResponse | null>(null);
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化讀取本地資料
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedDates(parsed);
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
  }, []);

  // 當資料變動時儲存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedDates));
  }, [completedDates]);

  // 取得 AI 教練建議
  const fetchAIAdvice = useCallback(async () => {
    if (completedDates.length === 0 && !coachData) {
        setCoachData({
            message: "哈囉！我是你的 AI 健身教練。今天打算從哪裡開始呢？",
            advice: "點擊下方的日曆日期來記錄你的第一場健身吧！",
            rating: 5
        });
        return;
    }
    setIsLoadingCoach(true);
    try {
        const feedback = await getCoachFeedback(completedDates);
        setCoachData(feedback);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoadingCoach(false);
    }
  }, [completedDates, coachData]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchAIAdvice();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setCompletedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  // 計算連續天數 (Streak)
  const calculateStreak = () => {
    if (completedDates.length === 0) return 0;
    const sortedDates = [...completedDates].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    let checkDate = new Date();
    
    // 如果今天沒打卡，從昨天開始算
    if (!completedDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
        checkDate = subDays(checkDate, 1);
    }

    while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        if (completedDates.includes(dateStr)) {
            streak++;
            checkDate = subDays(checkDate, 1);
        } else {
            break;
        }
    }
    return streak;
  };

  // 日曆邏輯
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));

  // 匯出匯入功能
  const exportData = () => {
    const dataStr = JSON.stringify(completedDates);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `fitcheck_backup_${format(new Date(), 'yyyyMMdd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setCompletedDates(parsed);
          alert('資料匯入成功！');
        }
      } catch (err) {
        alert('檔案格式錯誤');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-safe">
      {/* Header */}
      <header className="bg-white px-6 pt-8 pb-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Dumbbell size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FitCheck</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Settings2 size={24} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Flame size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">連續天數</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{calculateStreak()}</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Trophy size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">總次數</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{completedDates.length}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">資料管理</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={exportData} className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                <Download size={18} /> 匯出備份
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium hover:bg-slate-100">
                <Upload size={18} /> 匯入資料
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
            <button 
              onClick={() => { if(confirm('確定要清除所有紀錄嗎？')) setCompletedDates([]); }}
              className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-medium hover:bg-red-50 rounded-xl"
            >
              <Trash2 size={18} /> 清除所有資料
            </button>
          </div>
        )}

        {/* Calendar Card */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft /></button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronRight /></button>
            </div>
          </div>

          <div className="calendar-grid text-center mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <span key={d} className="text-xs font-bold text-slate-400 py-2">{d}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCompleted = completedDates.includes(dateStr);
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <button
                  key={idx}
                  onClick={() => toggleDate(day)}
                  className={`
                    aspect-square relative flex items-center justify-center rounded-2xl text-sm font-semibold transition-all
                    ${!isCurrentMonth ? 'text-slate-200' : 'text-slate-700'}
                    ${isToday(day) ? 'bg-indigo-50 text-indigo-600' : ''}
                    ${isCompleted ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-90' : 'hover:bg-slate-50'}
                  `}
                >
                  {format(day, 'd')}
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 checkmark-pop">
                      <CheckCircle2 size={16} fill="white" className="text-indigo-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* AI Coach Feedback */}
        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                <Sparkles size={18} className="text-indigo-100" />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase opacity-80">AI 教練建議</span>
            </div>

            {isLoadingCoach ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-white/60" size={32} />
                <p className="text-sm text-white/60">教練正在思考中...</p>
              </div>
            ) : coachData ? (
              <div className="space-y-4">
                <p className="text-lg font-medium leading-relaxed italic">
                  「{coachData.message}」
                </p>
                <div className="h-px bg-white/20 w-full" />
                <div className="flex gap-3 items-start bg-black/10 p-4 rounded-2xl backdrop-blur-sm">
                    {/* Added ShieldCheck icon from lucide-react */}
                    <div className="mt-1"><ShieldCheck size={20} className="text-indigo-300" /></div>
                    <p className="text-sm text-indigo-50 font-medium">
                        {coachData.advice}
                    </p>
                </div>
              </div>
            ) : (
              <button 
                onClick={fetchAIAdvice}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                獲取教練點評
              </button>
            )}
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
        </section>
      </main>

      <footer className="p-6 text-center">
        <p className="text-slate-400 text-xs font-medium tracking-wide">
          你的健身旅程，由你掌控
        </p>
      </footer>
    </div>
  );
};

export default App;
