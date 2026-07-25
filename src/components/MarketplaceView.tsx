import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MarketplaceItem } from '../types';
import { ShoppingBag, Search, Plus, MapPin, Tag, Star, MessageSquare } from 'lucide-react';

export const MarketplaceView: React.FC = () => {
  const { marketplace, addMarketplaceItem, user } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyFreebies, setOnlyFreebies] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);

  // New Listing States
  const [listTitle, setListTitle] = useState('');
  const [listPrice, setListPrice] = useState<number>(0);
  const [listCategory, setListCategory] = useState<'textbooks' | 'hardware' | 'notes' | 'other'>('textbooks');
  const [listDesc, setListDesc] = useState('');
  const [listImg, setListImg] = useState('');

  const filteredItems = marketplace.filter(item => {
    // Category filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    // Freebie filter
    if (onlyFreebies && item.price !== 0) {
      return false;
    }
    return true;
  });

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listTitle.trim()) return;

    addMarketplaceItem({
      title: listTitle,
      price: onlyFreebies ? 0 : listPrice,
      image: listImg || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400',
      category: listCategory,
      description: listDesc,
      isFree: onlyFreebies ? true : listPrice === 0
    });

    // Reset Form
    setListTitle('');
    setListPrice(0);
    setListDesc('');
    setListImg('');
    setShowAddListingModal(false);
    alert('Listing posted successfully to StudyBook Student Bazaar!');
  };

  const handleInAppChatInit = (item: MarketplaceItem) => {
    const formattedPrice = item.price === 0 ? 'free (0 VND)' : `${item.price.toLocaleString('en-US')} VND`;
    const msg = `Hi ${item.seller.name}! I saw your listing for "${item.title}" priced at ${formattedPrice} located ${item.distance} km away on StudyBook. Is this item still available? I would love to discuss further.`;
    
    // Simulate popping chat window or prompting user
    alert(`[MESSENGER REDIRECT]\nCreated chat window with seller "${item.seller.name}":\n\n"${msg}"`);
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      
      {/* Banner / Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 dark:border-slate-800 pb-4">
        <div>
          <h2 className="font-display font-extrabold text-lg text-gray-800 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-5.5 w-5.5 text-blue-600" />
            Bazaar - Books & Student Marketplace
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Find calculators, printed notes, and textbooks shared by older students nearby.</p>
        </div>

        <div className="flex gap-2">
          {/* Freebie 0 VND Filter Toggle */}
          <button
            onClick={() => setOnlyFreebies(!onlyFreebies)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              onlyFreebies 
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300' 
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
            }`}
          >
            Giveaways only (0 VND)
          </button>

          {/* Add Listing Trigger */}
          <button
            onClick={() => setShowAddListingModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Post a Listing
          </button>
        </div>
      </div>

      {/* Category Horizontal list */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'All', label: 'All Items' },
          { id: 'textbooks', label: 'Books & Textbooks' },
          { id: 'hardware', label: 'Hardware & Calculators' },
          { id: 'notes', label: 'Printed Notes / Study Guides' },
          { id: 'other', label: 'Other Resources' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id 
                ? 'bg-blue-600 text-white font-bold' 
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid listing */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-400">
          No items found under this filter. Try selecting another category!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Image card with distance badge */}
              <div className="h-36 relative bg-gray-100">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white px-2 py-0.5 rounded-full">
                  <MapPin className="h-2.5 w-2.5" />
                  {item.distance} km away
                </span>
                
                {item.price === 0 && (
                  <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    GIVEAWAY
                  </span>
                )}
              </div>

              {/* Information body */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-t border-gray-50 dark:border-slate-700 pt-2">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      {item.price === 0 ? 'FREE / GIVEAWAY' : `${item.price.toLocaleString('en-US')} VND`}
                    </span>
                    <span className="text-[9px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded uppercase font-bold">
                      {item.category}
                    </span>
                  </div>

                  {/* Seller info */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-750 p-2 rounded-xl">
                    <div className="flex gap-2 items-center min-w-0">
                      <img src={item.seller.avatar} alt="Seller" className="h-6 w-6 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 block truncate">{item.seller.name}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="h-2.5 w-2.5 fill-amber-500" />
                          <span className="text-[8px] font-bold">{item.seller.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pre-filled messenger chat integration */}
                    <button
                      onClick={() => handleInAppChatInit(item)}
                      className="p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg transition-colors shrink-0"
                      title="Contact seller"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add listing modal form */}
      {showAddListingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateListing} className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-150 dark:border-slate-700 w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">List a New Book or Resource</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Listing Title</label>
                <input
                  type="text"
                  required
                  value={listTitle}
                  onChange={e => setListTitle(e.target.value)}
                  placeholder="e.g. Advanced Calculus Textbook (90% New)"
                  className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Price (VND)</label>
                  <input
                    type="number"
                    value={listPrice}
                    onChange={e => setListPrice(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                  <select
                    value={listCategory}
                    onChange={e => setListCategory(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1"
                  >
                    <option value="textbooks" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Textbooks & Books</option>
                    <option value="hardware" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Hardware & Calculators</option>
                    <option value="notes" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Printed Notes / Study Guides</option>
                    <option value="other" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Other Categories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Condition & Description</label>
                <textarea
                  value={listDesc}
                  onChange={e => setListDesc(e.target.value)}
                  placeholder="State if the book has highlight marks, calculator comes with charger, etc..."
                  className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none h-16 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Image URL (Optional)</label>
                <input
                  type="text"
                  value={listImg}
                  onChange={e => setListImg(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-750">
              <button
                type="button"
                onClick={() => setShowAddListingModal(false)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Post to Bazaar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
