import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, Star, MessageSquare, Plus, CheckCircle, ChevronLeft, ChevronRight, ThumbsUp, BadgeCheck } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export const TutorsView: React.FC = () => {
  const { tutors, toggleFollowTutor, addTutorReview, openDirectChat, user } = useApp();
  const [activeTutorId, setActiveTutorId] = useState<string>(tutors[0]?.id || '');
  
  // Custom states for writing reviews
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  if (tutors.length === 0) {
    return (
      <div className="flex-1 p-6 max-w-4xl mx-auto h-[calc(100vh-57px)] flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-500 mb-4">
          <Award className="h-10 w-10" />
        </div>
        <h2 className="font-display font-bold text-lg text-gray-800 dark:text-white">No Verified Tutors or Educators Found</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-md">Verified tutors and educators will appear here once approved on StudyBook.</p>
      </div>
    );
  }

  const activeTutor = tutors.find(t => t.id === activeTutorId) || tutors[0];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;

    playSound('send');
    addTutorReview(activeTutor.id, rating, reviewText);
    setReviewText('');
    setShowReviewForm(false);
    alert(`Thank you for your review! Your contribution has enhanced the academic credentials of Tutor ${activeTutor.name}. ⭐️`);
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      
      {/* Horizontal grid list of tutors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tutors.map(t => {
          const isSelected = t.id === activeTutor.id;
          return (
            <div
              key={t.id}
              onClick={() => {
                playSound('tab');
                setActiveTutorId(t.id);
                setShowReviewForm(false);
              }}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 cursor-pointer flex gap-3.5 items-center transition-all ${
                isSelected 
                  ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20' 
                  : 'border-gray-150 dark:border-slate-700 hover:shadow-sm'
              }`}
            >
              <div className="relative shrink-0">
                <img src={t.avatar} alt={t.name} className="h-14 w-14 rounded-2xl object-cover" />
                {t.verified && (
                  <span className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-xs" title="Verified Tutor">
                    <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-display font-bold text-xs text-gray-800 dark:text-white truncate">{t.name}</h3>
                  {t.verified && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/60 px-1.5 py-0.2 rounded-full">
                      <BadgeCheck className="h-3 w-3 text-blue-600 dark:text-blue-400 fill-blue-500/30 shrink-0" />
                      <span>Verified Tutor</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">{t.bio}</p>
                
                {/* Followers count */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    {t.followers.toLocaleString()} Followers
                  </span>
                  <div className="flex gap-0.5 text-amber-500">
                    <Star className="h-2.5 w-2.5 fill-amber-500" />
                    <span className="text-[9px] font-bold">5.0</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Showcase of active tutor business page */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Cover photo */}
        <div className="h-36 relative bg-gray-100">
          <img src={activeTutor.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          
          <div className="absolute bottom-4 left-4 flex gap-3 items-end">
            <div className="relative shrink-0">
              <img src={activeTutor.avatar} alt="Profile" className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white" />
              {activeTutor.verified && (
                <span className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md">
                  <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                </span>
              )}
            </div>
            <div className="mb-1 text-white">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-display font-extrabold text-sm tracking-tight">{activeTutor.name}</h2>
                {activeTutor.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                    <BadgeCheck className="h-3.5 w-3.5 fill-white text-blue-600" />
                    Verified Tutor
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-200 font-medium mt-0.5">Verified Educator on StudyBook Network</p>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {activeTutor.subjects.map(s => (
              <span key={s} className="text-[9px] font-bold bg-gray-50 text-gray-500 dark:bg-slate-700 dark:text-gray-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {s}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                playSound('pop');
                toggleFollowTutor(activeTutor.id);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTutor.isFollowing 
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-650' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {activeTutor.isFollowing ? 'Following for Insights' : 'Follow Educator'}
            </button>
            <button 
              onClick={() => {
                playSound('pop');
                openDirectChat({
                  id: activeTutor.id,
                  name: activeTutor.name,
                  avatar: activeTutor.avatar,
                  role: 'tutor'
                });
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Direct Message
            </button>
          </div>
        </div>

        {/* Bio information */}
        <div className="p-4 space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Biography & Expertise</span>
          <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-sans font-normal">
            {activeTutor.bio}
          </p>
        </div>

        {/* Reviews and feedback carousel section */}
        <div className="p-4 bg-gray-50/50 dark:bg-slate-850 border-t border-gray-100 dark:border-slate-700 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Student & Parent Reviews</span>
              <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">{activeTutor.reviews.length} reviews</span>
            </div>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Write a Review
            </button>
          </div>

          {/* Expanded rating feedback form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-650 space-y-3 max-w-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Select Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-0.5 focus:outline-none"
                    >
                      <Star className={`h-4.5 w-4.5 ${star <= rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder={`Share your genuine feedback on this educator's teaching methodology...`}
                className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-150 dark:border-slate-650 rounded-xl p-3 text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 h-16"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs"
              >
                Submit Review
              </button>
            </form>
          )}

          {/* Swipeable grid list representing "Reviews and Recommendations" */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTutor.reviews.map(rev => (
              <div key={rev.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-150 dark:border-slate-700 space-y-3 shadow-2xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2.5 items-center">
                    <img src={rev.authorAvatar} alt="Reviewer" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white">{rev.authorName}</h4>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{rev.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed font-sans font-normal">
                  "{rev.content}"
                </p>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold cursor-pointer">
                  <ThumbsUp className="h-3 w-3" />
                  Helpful (12)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
