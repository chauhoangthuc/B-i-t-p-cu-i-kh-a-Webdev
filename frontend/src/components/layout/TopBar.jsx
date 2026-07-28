import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTrip } from '../../context/TripContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { postgrest } from '../../lib/postgrest.js';
import Dropdown from '../common/Dropdown.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function TopBar({ tripName }) {
  const { currentUser, logout } = useAuth();
  const { currentTripRole, currentTrip, setCurrentTripId } = useTrip();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [allTripsForSearch, setAllTripsForSearch] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync input value with URL search query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchTerm(q);
  }, [location.search]);

  useEffect(() => {
    const fetchTripsForSearch = async () => {
      try {
        const res = await postgrest.get('/trips?select=*');
        setAllTripsForSearch(res.data || []);
      } catch (err) {
        console.error('Failed to fetch trips for search:', err);
      }
    };
    if (currentUser) {
      fetchTripsForSearch();
    }
  }, [currentUser]);

  const filteredSuggestions = allTripsForSearch.filter(trip => 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (trip.destination && trip.destination.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearchSubmit = () => {
    navigate(`/trips?search=${encodeURIComponent(searchTerm.trim())}`);
    setShowSuggestions(false);
  };

  return (
    <header className="h-16 sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#c2c6d6] z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Trip Switcher Dropdown Button */}
        <button 
          onClick={() => navigate('/trips')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f3f4f5] hover:bg-[#e7e8e9] transition-colors border border-[#c2c6d6]"
        >
          <span className="material-symbols-outlined text-[#0058be] text-[20px]">location_on</span>
          <span className="text-xs font-bold text-[#191c1d]">{tripName || currentTrip?.name || t('choose_trip')}</span>
          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
        </button>

        {/* Search */}
        <div className="relative flex items-center group">
          <input 
            className="pl-10 pr-4 py-1.5 rounded-lg bg-[#f3f4f5] border-transparent focus:border-[#0058be] focus:ring-0 focus:bg-white w-48 focus:w-64 transition-all duration-300 text-sm" 
            placeholder={t('search_placeholder')} 
            type="text" 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking links
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
          />
          <span className="material-symbols-outlined absolute left-3 text-[#424754] group-focus-within:text-[#0058be] transition-colors text-[20px]">search</span>

          {showSuggestions && searchTerm.trim() && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#c2c6d6] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map(trip => (
                  <button
                    key={trip.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchTerm(trip.name);
                      navigate(`/trips?search=${encodeURIComponent(trip.name)}`);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#f3f4f5] transition-colors flex flex-col gap-0.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-bold text-[#191c1d] truncate">{trip.name}</span>
                    {trip.destination && (
                      <span className="text-[10px] text-[#727785] truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {trip.destination}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-xs text-gray-500 text-center">
                  Không tìm thấy chuyến đi nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Lang Selector Dropdown */}
        <Dropdown 
          trigger={
            <button className="px-3 py-1.5 rounded-lg hover:bg-[#f3f4f5] transition-colors flex items-center gap-1 text-xs font-bold">
              <span>{language.toUpperCase()}</span>
              <span className="material-symbols-outlined text-[16px]">translate</span>
            </button>
          }
        >
          <button 
            onClick={() => setLanguage('vi')} 
            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center justify-between ${language === 'vi' ? 'text-[#0058be] font-bold' : ''}`}
          >
            <span>Tiếng Việt (VI)</span>
            {language === 'vi' && <span className="material-symbols-outlined text-[14px]">check</span>}
          </button>
          <button 
            onClick={() => setLanguage('en')} 
            className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center justify-between ${language === 'en' ? 'text-[#0058be] font-bold' : ''}`}
          >
            <span>English (EN)</span>
            {language === 'en' && <span className="material-symbols-outlined text-[14px]">check</span>}
          </button>
        </Dropdown>

        <button className="relative p-2 rounded-full hover:bg-[#f3f4f5] transition-colors">
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-[1px] bg-[#c2c6d6]"></div>

        {/* Avatar Dropdown */}
        <Dropdown 
          trigger={
            <button className="flex items-center gap-1 p-1 rounded-full hover:bg-[#f3f4f5] transition-colors">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#c2c6d6]">
                <img 
                  className="w-full h-full object-cover" 
                  src={currentUser?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxnDk9gO35spxMRbVbdzIjd2ZskJKKCvcAPIJnOlmeQyoj3Fa-3fLYyVAHjxLFQhQKJdtcW_GChilERHGu10j8Ig-HTnfA9ePyTipt6uJkbxePmSm-Lq5PcCEGyB43nUCzteSc4EpseJPfD_6gIiNk6lV3NR8_kEWLGi8GBPwbC7mxZxRsRgr2sSw5girL0_eTmlOokMVnKUHTFaRzYrRoP7raHm9URlASSrf1JwDnsMBKvW7eJzyfilygcQwAZfd6-VWSbn3n3m4'} 
                  alt="User avatar" 
                />
              </div>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          }
        >
          <button 
            onClick={() => navigate('/profile')} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>{t('dropdown_profile')}</span>
          </button>
          <button 
            onClick={() => navigate('/edit-profile')} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#f3f4f5] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>{t('dropdown_edit')}</span>
          </button>
          <button 
            onClick={logout} 
            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t('dropdown_logout')}</span>
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
