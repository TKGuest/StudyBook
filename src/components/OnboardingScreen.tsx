import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, BookOpen, Sliders, Check, ArrowRight, ArrowLeft, Award, Sparkles, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, user, requestTutorVerification } = useApp();
  const [step, setStep] = useState(() => {
    // If name is already customized (not empty or generic) and role is set, jump directly to subject preferences
    if (user?.name && user.name !== 'Học viên StudyBook' && user?.role) {
      return 2;
    }
    return 1;
  });
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [role, setRole] = useState<'student' | 'tutor'>(() => {
    const r = user?.role;
    if (r === 'tutor') return 'tutor';
    return 'student';
  });
  
  const [selectedSubjects, setSelectedSubjects] = useState<('Math' | 'Physics' | 'English' | 'Chemistry')[]>([]);

  const handleNext = async () => {
    if (step < 2) {
      setStep(prev => prev + 1);
    } else {
      const hasSelection = selectedSubjects.length > 0;
      const finalWeights = {
        Math: !hasSelection || selectedSubjects.includes('Math') ? 100 : 50,
        Physics: !hasSelection || selectedSubjects.includes('Physics') ? 100 : 50,
        English: !hasSelection || selectedSubjects.includes('English') ? 100 : 50,
        Chemistry: !hasSelection || selectedSubjects.includes('Chemistry') ? 100 : 50,
        ExamPrep: 100
      };
      if (role === 'tutor' && user.email?.toLowerCase() !== 'billkute030709@gmail.com') {
        await completeOnboarding(displayName, 'student', '', finalWeights);
        await requestTutorVerification({ 
          requestedSubjects: selectedSubjects.map(s => s === 'Math' ? 'Mathematics' : s === 'Physics' ? 'Physics' : s === 'English' ? 'English' : 'Chemistry') 
        });
      } else {
        await completeOnboarding(displayName, role, '', finalWeights);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div id="onboarding-container" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <motion.div 
        id="onboarding-card" 
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-xl bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>

        {/* Top Progress bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-1.5 w-full">
            {[1, 2].map(s => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 pl-4">
            Bước {step}/2
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Role selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Welcome Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Hãy giúp chúng tôi cá nhân hóa trải nghiệm StudyBook của bạn bằng cách trả lời một vài câu hỏi nhanh.
                </p>
              </div>

              {/* Name Input Field */}
              <div className="space-y-1.5 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">Họ và Tên của bạn</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your full name..."
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-sans"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-1">This display name will appear on your posts and study materials.</p>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-300 block mb-2 text-center">Your primary role on StudyBook?</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { 
                      id: 'student' as const, 
                      title: 'Student / Scholar', 
                      desc: 'Search for exam prep materials, solve practice problems, and join study groups.',
                      icon: GraduationCap,
                      accent: 'border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400'
                    },
                    { 
                      id: 'tutor' as const, 
                      title: 'Tutor / Educator (Verification sent to Admin)', 
                      desc: 'Teach online and share academic courseware. Tutor verification requests are submitted to Admin for approval.',
                      icon: BookOpen,
                      accent: 'border-blue-500/30 hover:border-blue-500/50 text-blue-400'
                    }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = role === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => setRole(item.id)}
                        whileHover={{ scale: 1.015, y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 cursor-pointer w-full ${
                          isSelected 
                            ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/20' 
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl bg-slate-950 border flex items-center justify-center shrink-0 ${isSelected ? 'text-blue-400 border-blue-500/30' : 'text-slate-500 border-slate-800'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            {item.title}
                            {isSelected && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-normal">{item.desc}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Preferred subject multiple choice */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5 mb-2">
                <h2 className="font-display font-extrabold text-xl tracking-tight">Primary Focus Subjects</h2>
                <p className="text-xs text-slate-400">
                  Select the subjects you want to focus on in StudyBook (multiple selections allowed).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto scrollbar-thin p-1">
                {[
                  { key: 'Math' as const, label: 'Mathematics', sub: 'Algebra, Geometry, Calculus', desc: 'Algebra, Geometry, Calculus...' },
                  { key: 'Physics' as const, label: 'Physics', sub: 'Mechanics, Electromagnetism', desc: 'Mechanics, Electromagnetism, Optics...' },
                  { key: 'English' as const, label: 'English', sub: 'Grammar, Vocabulary, Communication', desc: 'Grammar, Vocabulary, Writing...' },
                  { key: 'Chemistry' as const, label: 'Chemistry', sub: 'Organic & Inorganic', desc: 'Organic, Inorganic, Reactions...' }
                ].map(sub => {
                  const isSelected = selectedSubjects.includes(sub.key);
                  return (
                    <motion.button
                      key={sub.key}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSubjects(prev => prev.filter(k => k !== sub.key));
                        } else {
                          setSelectedSubjects(prev => [...prev, sub.key]);
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer h-28 relative ${
                        isSelected 
                          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/25' 
                          : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-full flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-100">{sub.label}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{sub.sub}</span>
                        </div>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'border-slate-700 text-transparent'
                        }`}>
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight mt-2 line-clamp-1">
                        {sub.desc}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-slate-850">
          {step > 1 ? (
            <motion.button
              type="button"
              onClick={handleBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </motion.button>
          ) : (
            <div />
          )}

          <motion.button
            type="button"
            onClick={handleNext}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            {step === 2 ? 'Get Started' : 'Continue'}
            {step === 2 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
