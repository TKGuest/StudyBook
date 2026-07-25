import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Award, Zap, Timer, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

export const GamesView: React.FC = () => {
  const { user, setUser } = useApp();
  const [activeTab, setActiveTab] = useState<'flashcards' | 'battle'>('flashcards');

  // Interactive Quiz states
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  const sampleQuestions: Question[] = [
    {
      text: 'In the harmonic oscillation of a spring pendulum, when the kinetic energy increases, what happens to the potential energy?',
      options: ['Increases proportionally', 'Decreases correspondingly', 'Remains unchanged', 'Varies out of phase'],
      correctIdx: 1,
      explanation: 'Total Mechanical Energy = Kinetic Energy + Potential Energy. Since mechanical energy remains constant, when kinetic energy increases, potential energy must correspondingly decrease.'
    },
    {
      text: 'Which idiom means "to understand something completely or know how to do it"?',
      options: ['Get the hang of', 'Under the weather', 'Spill the beans', 'A piece of cake'],
      correctIdx: 0,
      explanation: '"Get the hang of" means to learn how to use or do something well through practice.'
    },
    {
      text: 'When Sodium metal (Na) is added to a beaker of distilled water containing Phenolphthalein, what phenomenon occurs?',
      options: [
        'Sodium sinks, water bubbles, and turns blue',
        'Sodium melts and darts across the water surface, and the solution turns pink',
        'Sodium explodes violently, and the solution turns yellow',
        'No noticeable phenomenon occurs'
      ],
      correctIdx: 1,
      explanation: 'Sodium reacts vigorously with water, releasing significant heat which causes the sodium to melt into a tiny sphere darting across the water surface, producing bubbling H2 gas and alkaline NaOH which turns phenolphthalein pink.'
    }
  ];

  const handleAnswerClick = (idx: number) => {
    if (selectedAns !== null) return; // Prevent double clicks
    setSelectedAns(idx);
    
    if (idx === sampleQuestions[currentQIdx].correctIdx) {
      setScore(prev => prev + 10);
    }
  };

  const handleNextQ = () => {
    setSelectedAns(null);
    if (currentQIdx < sampleQuestions.length - 1) {
      setCurrentQIdx(currentQIdx + 1);
    } else {
      setGameEnded(true);
      // Award user points to increase study streak or add a badge!
      if (score >= 20 && !user.badges.includes('Math Whiz')) {
        setUser(prev => ({
          ...prev,
          badges: [...prev.badges, 'Sharp Intuition']
        }));
      }
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setCurrentQIdx(0);
    setSelectedAns(null);
    setScore(0);
    setGameEnded(false);
  };

  // Leaderboard List
  const mockLeaders = [
    { name: `${user.name || 'Bạn'} (You)`, score: user.streak * 10 + 50, streak: user.streak ?? 1, badge: user.badges[0] || 'Member' }
  ];

  return (
    <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      
      {/* Tab toggle */}
      <div className="flex justify-between items-center border-b border-gray-150 dark:border-slate-850 pb-4">
        <div>
          <h2 className="font-display font-extrabold text-lg text-gray-800 dark:text-white flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-indigo-600" />
            Quiz Arena & Flashcards
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Learn while playing, challenge peers, and secure your spot on the weekly Leaderboard.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'flashcards' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quiz Challenge
          </button>
          <button
            onClick={() => setActiveTab('battle')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'battle' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Weekly Leaderboard
          </button>
        </div>
      </div>

      {/* RENDER FLASHCARD QUIZZ CHALLENGE */}
      {activeTab === 'flashcards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          <div className="md:col-span-2 space-y-4">
            {!gameStarted ? (
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10">
                  <Gamepad2 className="h-44 w-44" />
                </div>
                <div className="flex items-center gap-2 bg-white/20 w-max px-3 py-1 rounded-full text-xs font-bold">
                  <Zap className="h-4.5 w-4.5 text-yellow-300 fill-yellow-300" />
                  LEARN WITH FUN
                </div>
                <h3 className="font-display font-extrabold text-xl leading-snug">
                  StudyBook 60s Arena of Knowledge
                </h3>
                <p className="text-xs text-indigo-150 leading-relaxed font-sans font-normal">
                  A curated selection of mock quiz questions compiled from high school entrance exams, English IELTS prep, and applied science by verified educators. Earn 10 reputation points for every correct answer.
                </p>
                <button
                  onClick={() => setGameStarted(true)}
                  className="bg-white text-indigo-700 hover:bg-indigo-50 font-black px-6 py-3 rounded-2xl text-xs shadow-md transition-all"
                >
                  Start Quiz Now!
                </button>
              </div>
            ) : gameEnded ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-150 dark:border-slate-700 p-6 text-center space-y-4 shadow-sm animate-fade-in">
                <Award className="h-14 w-14 text-yellow-500 fill-yellow-500 mx-auto animate-bounce" />
                <h3 className="font-display font-black text-lg text-gray-800 dark:text-white">Quiz Complete!</h3>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">You earned {score} student reputation points!</p>
                <p className="text-xs text-gray-400 font-medium">You correctly answered {score/10} out of {sampleQuestions.length} questions.</p>
                <button
                  onClick={resetGame}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-150 dark:border-slate-700 p-6 space-y-5 shadow-sm animate-fade-in">
                {/* Score / Progress bar */}
                <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                  <span className="flex items-center gap-1">
                    <Timer className="h-4 w-4 animate-pulse text-indigo-500" />
                    Question {currentQIdx + 1} of {sampleQuestions.length}
                  </span>
                  <span className="text-indigo-600">Score: {score} pts</span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-800 dark:text-white font-sans leading-relaxed">
                    {sampleQuestions[currentQIdx].text}
                  </p>
                </div>

                {/* Option buttons */}
                <div className="grid grid-cols-1 gap-2.5">
                  {sampleQuestions[currentQIdx].options.map((opt, idx) => {
                    const isSelected = selectedAns === idx;
                    const isCorrect = idx === sampleQuestions[currentQIdx].correctIdx;
                    
                    let btnStyle = 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750';
                    if (selectedAns !== null) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400';
                      } else if (isSelected) {
                        btnStyle = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400';
                      } else {
                        btnStyle = 'opacity-40 border-gray-100';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAns !== null}
                        onClick={() => handleAnswerClick(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {selectedAns !== null && isCorrect && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {selectedAns !== null && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Question Explanation display */}
                {selectedAns !== null && (
                  <div className="bg-indigo-50/40 dark:bg-slate-900/45 p-3.5 rounded-xl border border-indigo-100/30 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-sans font-normal animate-fade-in">
                    <span className="font-bold text-indigo-600 block mb-1">EXPLANATION:</span>
                    {sampleQuestions[currentQIdx].explanation}
                  </div>
                )}

                {/* Next Question Control */}
                {selectedAns !== null && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQ}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl text-xs shadow-sm transition-all animate-bounce"
                    >
                      {currentQIdx === sampleQuestions.length - 1 ? 'See Results' : 'Next Question'}
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Quick Stats sidebar in game */}
          <div className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 p-4 rounded-3xl space-y-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Your Challenge</span>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-750 p-2.5 rounded-xl">
                <span className="text-xs text-gray-500 font-semibold">Quiz Level</span>
                <span className="text-xs font-bold text-gray-800 dark:text-white">LEVEL 4</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-750 p-2.5 rounded-xl">
                <span className="text-xs text-gray-500 font-semibold">Avg Accuracy</span>
                <span className="text-xs font-bold text-emerald-500">85% (Excellent)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB: BATTLE LEADERBOARD */}
      {activeTab === 'battle' && (
        <div className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-3xl p-6 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="text-center space-y-1">
            <Award className="h-10 w-10 text-yellow-500 fill-yellow-500 mx-auto" />
            <h3 className="font-display font-extrabold text-base text-gray-800 dark:text-white">Weekly Hall of Fame</h3>
            <p className="text-[11px] text-gray-400 font-medium">Automatically tallies quiz scores and resources contributed every Sunday.</p>
          </div>

          <div className="space-y-2 divide-y divide-gray-50 dark:divide-slate-700 pt-3">
            {mockLeaders.map((leader, index) => {
              const isCurrentUser = leader.name.includes('(You)');
              return (
                <div key={leader.name} className={`p-3 flex items-center justify-between gap-4 transition-all ${isCurrentUser ? 'bg-indigo-50/30 dark:bg-slate-750 rounded-xl' : ''}`}>
                  <div className="flex gap-3 items-center min-w-0">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black ${
                      index === 0 ? 'bg-yellow-150 text-yellow-800' :
                      index === 1 ? 'bg-slate-150 text-slate-700' :
                      index === 2 ? 'bg-orange-150 text-orange-800' : 'text-gray-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{leader.name}</h4>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{leader.badge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-400 font-medium">{leader.streak}-day streak</span>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{leader.score} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
