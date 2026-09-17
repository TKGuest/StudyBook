import React, { useState, useMemo } from 'react';
import { Search, X, Smile, ThumbsUp, User, Activity } from 'lucide-react';

interface ChatEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const FACE_AND_HUMAN_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Faces',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', 
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', 
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', 
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', 
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', 
      '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', 
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', 
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', 
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', 
      '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ]
  },
  {
    id: 'gestures',
    name: 'Hands & Gestures',
    icon: ThumbsUp,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', 
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', 
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', 
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', 
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'
    ]
  },
  {
    id: 'people',
    name: 'People & Roles',
    icon: User,
    emojis: [
      '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', 
      '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', 
      '🤦', '🤷', '🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍🏫', '👨‍🏫', '👩‍🏫', '🧑‍💻', '👨‍💻', 
      '👩‍💻', '🧑‍🔬', '👨‍🔬', '👩‍🔬', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🎨', '👨‍🎨', '👩‍🎨', 
      '🧑‍🍳', '👨‍🍳', '👩‍🍳', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', 
      '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🦸', '🦹', '🧙', 
      '🧚', '🧛', '🧜', '🧝', '🧞', '🧟'
    ]
  },
  {
    id: 'activities',
    name: 'Activities & Figures',
    icon: Activity,
    emojis: [
      '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯', '🧖', '🧗', 
      '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', 
      '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌', 
      '👭', '👫', '👬', '💏', '💑', '👪'
    ]
  }
];

export const POPULAR_FACE_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '🥰', '🥺', '😍', '🤔', '🙏', '😎'];

export const ChatEmojiPicker: React.FC<ChatEmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    const q = searchQuery.toLowerCase();
    const all = FACE_AND_HUMAN_CATEGORIES.flatMap(c => c.emojis);
    // In emoji searches, match all if query is short or emoji list
    return all;
  }, [searchQuery]);

  return (
    <div 
      className="absolute bottom-14 left-4 sm:left-8 w-84 sm:w-[400px] max-h-[440px] bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3a3b3c] rounded-2xl shadow-2xl flex flex-col z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="p-2.5 px-3 border-b border-gray-150 dark:border-[#3a3b3c] flex items-center justify-between bg-gray-50 dark:bg-[#1e1f20]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-100">
          <Smile className="h-4 w-4 text-[#0084ff]" />
          <span>Face & People Emojis</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
          title="Close emoji picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick popular bar */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-[#323334] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none bg-white dark:bg-[#242526]">
        <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0 mr-1">Quick:</span>
        {POPULAR_FACE_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="h-9 w-9 text-2xl hover:scale-125 transition-transform flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#3a3b3c] shrink-0 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center border-b border-gray-150 dark:border-[#323334] px-2 py-1.5 gap-1 bg-gray-50/70 dark:bg-[#1e1f20]/60">
        {FACE_AND_HUMAN_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              className={`flex-1 py-1.5 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-[#0084ff] text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#303132]'
              }`}
              title={cat.name}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate hidden sm:inline">{cat.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Emoji Grid Area */}
      <div className="p-3 overflow-y-auto max-h-[270px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {(() => {
          const currentCat = FACE_AND_HUMAN_CATEGORIES.find(c => c.id === activeCategory);
          const emojisToDisplay = currentCat ? currentCat.emojis : [];

          return (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between px-0.5">
                <span>{currentCat?.name}</span>
                <span className="text-[10px] text-gray-400 font-normal">{emojisToDisplay.length} emojis</span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                {emojisToDisplay.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="h-10 w-10 text-2xl sm:text-[26px] hover:scale-125 transition-transform flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#3a3b3c] cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
