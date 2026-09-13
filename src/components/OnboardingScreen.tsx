import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GRADE_LEVELS, GradeLevel } from '../types';
import { GraduationCap, BookOpen, Check, ArrowRight, ArrowLeft, Sparkles, User as UserIcon, School } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OnboardingScreen: React.FC = () => {
  const { completeOnboarding, user, requestTutorVerification } = useApp();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [selectedGrade, setSelectedGrade] = useState<string>(user?.grade || 'Grade 10');
  const [role, setRole] = useState<'student' | 'tutor'>(() => {
    const r = user?.role;
    if (r === 'tutor') return 'tutor';
    return 'student';
  });
  
  const [selectedSubjects, setSelectedSubjects] = useState<('Math' | 'Physics' | 'English' | 'Chemistry' | 'Other')[]>([]);

  const handleNext = async () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      const hasSelection = selectedSubjects.length > 0;
      const finalWeights = {
        Math: !hasSelection || selectedSubjects.includes('Math') ? 100 : 50,
        Physics: !hasSelection || selectedSubjects.includes('Physics') ? 100 : 50,
        English: !hasSelection || selectedSubjects.includes('English') ? 100 : 50,
        Chemistry: !hasSelection || selectedSubjects.includes('Chemistry') ? 100 : 50,
        Other: !hasSelection || selectedSubjects.includes('Other') ? 100 : 50
      };
      if (role === 'tutor' && user.email?.toLowerCase() !== 'billkute030709@gmail.com') {
        await completeOnboarding(displayName, 'student', '', finalWeights, selectedGrade);
        await requestTutorVerification({ 
          requestedSubjects: selectedSubjects.map(s => s === 'Math' ? 'Mathematics' : s === 'Physics' ? 'Physics' : s === 'English' ? 'English' : s === 'Chemistry' ? 'Chemistry' : 'Other Subjects') 
        });
      } else {
        await completeOnboarding(displayName, role, '', finalWeights, selectedGrade);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const allGrades = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12', 'College'
  ];

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
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 pl-4 whitespace-nowrap">
            Step {step}/3
          </span>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Profile and Role */}
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
                <h2 className="font-display font-extrabold text-xl tracking-tight">Welcome to StudyBook</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Help us personalize your StudyBook learning feed with your profile details.
                </p>
              </div>

              {/* Name Input Field */}
              <div className="space-y-1.5 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">Your Full Name</label>
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
                        type="button"
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

          {/* Step 2: Grade Selection (Grade 1 to College) */}
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
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-1">
                  <School className="h-5 w-5" />
                </div>
                <h2 className="font-display font-extrabold text-xl tracking-tight">Select Your Grade Level</h2>
                <p className="text-xs text-slate-400">
                  Our feed algorithm boosts content matching your current grade to the top. Choose from Grade 1 to College.
                </p>
              </div>

              {/* Selected Grade Indicator */}
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Currently selected grade:</span>
                <span className="font-bold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-500/30">
                  🎓 {selectedGrade}
                </span>
              </div>

              {/* Grade Badges */}
              <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-none no-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allGrades.map(grade => {
                    const isSelected = selectedGrade === grade;
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setSelectedGrade(grade)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30 ring-2 ring-blue-500/30'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        <span>{grade}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preferred subjects */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5 mb-2">
                <h2 className="font-display font-extrabold text-xl tracking-tight">Primary Focus Subjects</h2>
                <p className="text-xs text-slate-400">
                  Select the subjects you want prioritized in your personalized StudyBook feed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto scrollbar-none no-scrollbar p-1">
                {[
                  { key: 'Math' as const, label: 'Mathematics', sub: 'Algebra, Geometry, Calculus', desc: 'Algebra, Geometry, Calculus & problem solving' },
                  { key: 'Physics' as const, label: 'Physics', sub: 'Mechanics, Optics, Waves', desc: 'Mechanics, Thermodynamics & experiments' },
                  { key: 'English' as const, label: 'English', sub: 'Grammar, Essay Writing', desc: 'Grammar, Vocabulary & Academic Essays' },
                  { key: 'Chemistry' as const, label: 'Chemistry', sub: 'Organic, Inorganic', desc: 'Atomic structure, Stoichiometry & Reactions' },
                  { key: 'Other' as const, label: 'Other Subjects', sub: 'History, Biology, Computing', desc: 'Social sciences, biology, coding & extracurriculars' }
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
            {step === 3 ? 'Get Started' : 'Continue'}
            {step === 3 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};

