import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MarketplaceItem } from '../types';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  MapPin, 
  Tag, 
  MessageSquare, 
  Upload, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  ShieldCheck,
  Check,
  Sparkles,
  Trash2
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { 
  interceptMarketplacePrivacySettings, 
  canUserDeleteMarketplaceItem, 
  isUserListingSeller 
} from '../utils/permissionUtils';

export const MarketplaceView: React.FC = () => {
  const { 
    marketplace, 
    addMarketplaceItem, 
    deleteMarketplaceItem, 
    user, 
    setUser, 
    settings, 
    setSettings, 
    openDirectChat,
    showConfirmModal 
  } = useApp();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyFreebies, setOnlyFreebies] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<MarketplaceItem | null>(null);
  const [detailActiveImgIndex, setDetailActiveImgIndex] = useState(0);

  // New Listing States
  const [listTitle, setListTitle] = useState('');
  const [listPrice, setListPrice] = useState<number>(0);
  const [listCategory, setListCategory] = useState<'textbooks' | 'hardware' | 'notes' | 'other'>('textbooks');
  const [listDesc, setListDesc] = useState('');
  const [stagedImages, setStagedImages] = useState<string[]>([]);
  const [singleImgUrlInput, setSingleImgUrlInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Per-card active image index for cycling through photos directly on cards
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setStagedImages(prev => [...prev, result]);
          playSound('pop');
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = singleImgUrlInput.trim();
    if (!trimmed) return;
    setStagedImages(prev => [...prev, trimmed]);
    setSingleImgUrlInput('');
    playSound('pop');
  };

  const handleRemoveStagedImage = (indexToRemove: number) => {
    playSound('delete');
    setStagedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    playSound('pop');
    setStagedImages(prev => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listTitle.trim()) return;

    // Safety Messaging Guard: The moment a user publishes a marketplace listing,
    // check their privacy settings configuration. If they previously toggled
    // "Allow direct messages from strangers" to ON, automatically force it to OFF.
    const privacyCheck = interceptMarketplacePrivacySettings(user, settings);
    if (privacyCheck.wasModified) {
      setUser(privacyCheck.user);
      setSettings(privacyCheck.settings);
      try {
        localStorage.setItem('sb_user', JSON.stringify(privacyCheck.user));
        localStorage.setItem('sb_settings', JSON.stringify(privacyCheck.settings));
      } catch (_) {}
    }

    playSound('send');

    const finalImages = stagedImages.length > 0
      ? stagedImages
      : ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400'];

    addMarketplaceItem({
      title: listTitle.trim(),
      price: onlyFreebies ? 0 : listPrice,
      image: finalImages[0],
      images: finalImages,
      category: listCategory,
      description: listDesc.trim(),
      isFree: onlyFreebies ? true : listPrice === 0
    });

    // Reset Form
    setListTitle('');
    setListPrice(0);
    setListDesc('');
    setStagedImages([]);
    setSingleImgUrlInput('');
    setShowAddListingModal(false);

    if (privacyCheck.wasModified) {
      showToast('🎉 Listing published! Stranger DMs were automatically turned OFF for your privacy.');
    } else {
      showToast('🎉 Listing published to StudyBook Student Bazaar!');
    }
  };

  const handlePrevCardImage = (itemId: string, imagesCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIndexes(prev => {
      const current = prev[itemId] || 0;
      const nextIndex = (current - 1 + imagesCount) % imagesCount;
      return { ...prev, [itemId]: nextIndex };
    });
  };

  const handleNextCardImage = (itemId: string, imagesCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIndexes(prev => {
      const current = prev[itemId] || 0;
      const nextIndex = (current + 1) % imagesCount;
      return { ...prev, [itemId]: nextIndex };
    });
  };

  const handleInAppChatInit = (item: MarketplaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Hide Rule: If a user views their own listing, hide/disable the Chat button entirely.
    if (isUserListingSeller(item, user)) {
      return;
    }

    playSound('pop');
    const formattedPrice = item.price === 0 ? 'free (0 VND)' : `${item.price.toLocaleString('en-US')} VND`;
    const inquiryMessage = `Hi ${item.seller.name}! I saw your listing for "${item.title}" priced at ${formattedPrice} on StudyBook. Is this item still available? I would love to discuss further.`;

    const sellerId = item.seller.id || `u_${(item.seller.name || 'seller').trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    openDirectChat(
      {
        id: sellerId,
        name: item.seller.name,
        avatar: item.seller.avatar,
        role: 'student',
        allowDMsFromStrangers: true
      },
      inquiryMessage,
      true // isMarketplaceInquiry
    );

    setSelectedDetailItem(null);
    showToast(`💬 Connected to ${item.seller.name}! Messenger chat active.`);
  };

  const handleDeleteListing = async (item: MarketplaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Permission rule check: Seller exclusive authority + Application Admin overriding authority
    if (!canUserDeleteMarketplaceItem(item, user)) {
      alert("Permission denied: Only the listing's seller or an Application Admin can delete this listing.");
      return;
    }

    const isGlobalAdmin = user.role === 'admin' || user.email?.toLowerCase() === 'billkute030709@gmail.com';
    const isSeller = isUserListingSeller(item, user);

    showConfirmModal({
      title: isGlobalAdmin && !isSeller ? 'Remove Marketplace Listing?' : 'Delete Your Listing?',
      message: isGlobalAdmin && !isSeller
        ? `As Administrator, delete listing "${item.title}" by ${item.seller.name}?`
        : `Are you sure you want to delete your listing "${item.title}" from Bazaar?`,
      confirmText: 'Delete Listing',
      variant: 'danger',
      icon: 'trash',
      onConfirm: async () => {
        await deleteMarketplaceItem(item.id);
        if (selectedDetailItem?.id === item.id) {
          setSelectedDetailItem(null);
        }
        showToast('🗑️ Listing deleted from Marketplace.');
      }
    });
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto space-y-6 h-[calc(100vh-57px)] overflow-y-auto pb-20 scrollbar-thin">
      
      {/* Success Notification Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            onClick={() => {
              playSound('pop');
              setOnlyFreebies(!onlyFreebies);
            }}
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
            onClick={() => {
              playSound('openModal');
              setShowAddListingModal(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm cursor-pointer"
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
            onClick={() => {
              playSound('tab');
              setSelectedCategory(cat.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 text-center text-gray-400 space-y-3">
          <ShoppingBag className="h-10 w-10 mx-auto text-gray-300 dark:text-slate-600" />
          <p className="text-xs">No items found under this filter. Try selecting another category or post your own listing!</p>
          <button
            onClick={() => {
              playSound('openModal');
              setShowAddListingModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Post First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const itemImages = item.images && item.images.length > 0 ? item.images : [item.image];
            const currentImgIndex = (cardImageIndexes[item.id] || 0) % itemImages.length;
            const currentImg = itemImages[currentImgIndex] || item.image;

            return (
              <div 
                key={item.id} 
                onClick={() => {
                  setSelectedDetailItem(item);
                  setDetailActiveImgIndex(currentImgIndex);
                }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                {/* Image card with multi-image navigation and distance badge */}
                <div className="h-40 relative bg-gray-100 dark:bg-neutral-900 overflow-hidden">
                  <img 
                    src={currentImg} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />

                  {/* Your listing badge */}
                  {isUserListingSeller(item, user) && (
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm">
                      YOUR LISTING
                    </span>
                  )}

                  {/* Giveaway badge */}
                  {item.price === 0 && (
                    <span className={`absolute top-2 ${isUserListingSeller(item, user) ? 'right-24' : 'right-2'} bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm`}>
                      GIVEAWAY
                    </span>
                  )}

                  {/* Multi-image indicator and quick arrows */}
                  {itemImages.length > 1 && (
                    <>
                      {/* Photo counter badge */}
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-white px-2 py-0.5 rounded-full z-10">
                        <ImageIcon className="h-2.5 w-2.5" />
                        {currentImgIndex + 1}/{itemImages.length}
                      </span>

                      {/* Navigation arrow buttons */}
                      <button
                        onClick={(e) => handlePrevCardImage(item.id, itemImages.length, e)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Previous photo"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleNextCardImage(item.id, itemImages.length, e)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Next photo"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Information body */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
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
                          <span className="text-[8px] font-semibold text-blue-600 dark:text-blue-400">Student</span>
                        </div>
                      </div>

                      {/* Actions: Chat button & Deletion rights */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Hide Rule: If a user views their own listing, hide the Chat button entirely. */}
                        {!isUserListingSeller(item, user) && (
                          <button
                            onClick={(e) => handleInAppChatInit(item, e)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Chat with seller via Messenger"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Listing Deletion Rights: Seller exclusive authority + Application Admin overriding authority */}
                        {canUserDeleteMarketplaceItem(item, user) && (
                          <button
                            onClick={(e) => handleDeleteListing(item, e)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title={isUserListingSeller(item, user) ? "Delete your listing" : "Delete listing (Admin Authority)"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add listing modal form with Multi-Image Support */}
      {showAddListingModal && (
        <div 
          onClick={() => setShowAddListingModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-gray-150 dark:border-slate-750 w-full max-w-lg space-y-4 shadow-2xl my-auto text-gray-900 dark:text-white"
          >
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-750 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-gray-800 dark:text-white">List a Resource on Bazaar</h3>
                  <p className="text-[11px] text-gray-400">Share textbooks, calculators, or printed notes with students</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddListingModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Listing Title *</label>
                <input
                  type="text"
                  required
                  value={listTitle}
                  onChange={e => setListTitle(e.target.value)}
                  placeholder="e.g. Casio fx-580VN X Scientific Calculator (Mint Condition)"
                  className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Price (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={listPrice}
                    onChange={e => setListPrice(Number(e.target.value))}
                    placeholder="0 for Giveaway"
                    className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">Enter 0 to mark as Free Giveaway</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                  <select
                    value={listCategory}
                    onChange={e => setListCategory(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="textbooks" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Textbooks & Books</option>
                    <option value="hardware" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Hardware & Calculators</option>
                    <option value="notes" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Printed Notes / Study Guides</option>
                    <option value="other" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Other Categories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Condition & Details</label>
                <textarea
                  value={listDesc}
                  onChange={e => setListDesc(e.target.value)}
                  placeholder="State if the book has highlight marks, calculator includes batteries/case, meetup spot..."
                  className="w-full bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-white mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 h-16 resize-none"
                />
              </div>

              {/* Multi-Image Attachment Upload Section */}
              <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                      Product Photos ({stagedImages.length})
                    </span>
                  </div>
                  {stagedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStagedImages([])}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Staged Images Thumbnails Gallery */}
                {stagedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {stagedImages.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-slate-700 group bg-neutral-900"
                      >
                        <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded shadow">
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMakeCover(idx)}
                            className="absolute bottom-1 left-1 bg-black/60 hover:bg-blue-600 text-white text-[8px] px-1 py-0.2 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Set as primary cover photo"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedImage(idx)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Action Triggers */}
                <div className="flex flex-col gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 px-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-slate-750 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                      <span>Upload Photos</span>
                    </button>
                  </div>

                  {/* Or Add by Image URL */}
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="url"
                      value={singleImgUrlInput}
                      onChange={e => setSingleImgUrlInput(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="flex-1 bg-white dark:bg-slate-750 border border-gray-200 dark:border-slate-650 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      disabled={!singleImgUrlInput.trim()}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white disabled:opacity-40 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Safety Messaging Guard Notice Banner */}
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2 text-[11px] text-blue-700 dark:text-blue-300">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <p className="leading-snug">
                  <strong className="font-bold">Student Safety Guardrail:</strong> Publishing a public listing automatically disables direct messages from strangers on your account to keep your messaging channels protected.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-150 dark:border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowAddListingModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-750 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Post Listing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail & Image Gallery Modal */}
      {selectedDetailItem && (
        <div 
          onClick={() => setSelectedDetailItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white dark:bg-slate-850 rounded-2xl border border-gray-150 dark:border-slate-750 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-gray-900 dark:text-white max-h-[90vh]"
          >
            {/* Gallery Column */}
            <div className="md:w-1/2 bg-black flex flex-col justify-between relative min-h-[260px] md:min-h-[380px]">
              {(() => {
                const itemImages = selectedDetailItem.images && selectedDetailItem.images.length > 0 
                  ? selectedDetailItem.images 
                  : [selectedDetailItem.image];
                const activeImg = itemImages[detailActiveImgIndex % itemImages.length] || selectedDetailItem.image;

                return (
                  <>
                    <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                      <img 
                        src={activeImg} 
                        alt={selectedDetailItem.title} 
                        className="w-full h-full object-contain max-h-[320px]" 
                      />

                      {itemImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setDetailActiveImgIndex(prev => (prev - 1 + itemImages.length) % itemImages.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDetailActiveImgIndex(prev => (prev + 1) % itemImages.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {itemImages.length > 1 && (
                      <div className="p-2 bg-neutral-900/90 flex gap-2 overflow-x-auto justify-center">
                        {itemImages.map((thumb, idx) => (
                          <button
                            key={idx}
                            onClick={() => setDetailActiveImgIndex(idx)}
                            className={`h-10 w-10 rounded-lg overflow-hidden border-2 shrink-0 ${
                              idx === (detailActiveImgIndex % itemImages.length) 
                                ? 'border-blue-500' 
                                : 'border-neutral-700 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={thumb} alt="thumb" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Details Column */}
            <div className="md:w-1/2 p-5 flex flex-col justify-between overflow-y-auto space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold px-2 py-0.5 rounded uppercase">
                    {selectedDetailItem.category}
                  </span>
                  <button
                    onClick={() => setSelectedDetailItem(null)}
                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="font-display font-bold text-base mt-2 text-gray-800 dark:text-white">
                  {selectedDetailItem.title}
                </h3>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {selectedDetailItem.price === 0 ? 'FREE / GIVEAWAY' : `${selectedDetailItem.price.toLocaleString('en-US')} VND`}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 leading-relaxed whitespace-pre-line">
                  {selectedDetailItem.description || 'No additional details provided.'}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-150 dark:border-slate-750">
                {/* Seller profile box */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-750 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={selectedDetailItem.seller.avatar} 
                      alt="Seller" 
                      className="h-8 w-8 rounded-full object-cover border border-white dark:border-slate-600" 
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800 dark:text-white block">
                        {selectedDetailItem.seller.name}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Verified Student</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Chat with Seller (Hidden if own listing) + Delete (Seller / Admin) */}
                <div className="space-y-2">
                  {/* Hide Rule: If a user views their own listing, hide the Chat button entirely. */}
                  {!isUserListingSeller(selectedDetailItem, user) ? (
                    <button
                      onClick={() => handleInAppChatInit(selectedDetailItem)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chat with Seller via Messenger</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 px-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300">
                      ✨ You are the seller of this listing
                    </div>
                  )}

                  {/* Listing Deletion Rights: Seller exclusive authority + Application Admin overriding authority */}
                  {canUserDeleteMarketplaceItem(selectedDetailItem, user) && (
                    <button
                      onClick={() => handleDeleteListing(selectedDetailItem)}
                      className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>
                        {isUserListingSeller(selectedDetailItem, user) 
                          ? 'Delete Listing' 
                          : 'Delete Listing (Admin Override)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
