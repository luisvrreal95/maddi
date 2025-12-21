import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchFormProps {
  onSearch?: (query: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const navigate = useNavigate();
  
  const placeholderText = 'Buscar en Mexicali, Ensenada...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery || 'Mexicali, B.C.';
    onSearch?.(query);
    navigate(`/search?location=${encodeURIComponent(query)}`);
  };

  const handleFocus = () => {
    setHasInteracted(true);
  };

  const displayText = hasInteracted ? searchQuery : placeholderText;

  return (
    <div className="flex w-[650px] flex-col items-center gap-4 relative max-md:w-full max-md:max-w-[580px] max-sm:max-w-[95%]">
      <p className="self-stretch text-white text-center text-base font-normal">
        ¡El espacio perfecto para tu marca!
      </p>
      
      <form 
        onSubmit={handleSubmit} 
        className="flex justify-between items-center gap-3 self-stretch border relative bg-[rgba(255,255,255,0.03)] px-8 py-5 rounded-[100px] border-solid border-[rgba(255,255,255,0.25)] max-sm:gap-2 max-sm:px-6 max-sm:py-4"
        style={{
          boxShadow: '8px 8px 20px rgba(0, 0, 0, 0.4), 4px 4px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex flex-col items-start flex-[1_0_0] relative">
          <label htmlFor="search-input" className="sr-only">
            Buscar espacios publicitarios
          </label>
          <input
            id="search-input"
            type="text"
            value={displayText}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleFocus}
            className="w-full text-white text-xl leading-[1.4] bg-transparent border-none outline-none max-md:text-lg max-sm:text-base placeholder:text-white/70"
            placeholder={placeholderText}
          />
        </div>
        
        <button
          type="submit"
          className="flex w-12 h-12 justify-center items-center shrink-0 relative bg-[rgba(255,255,255,0.08)] rounded-full max-sm:w-10 max-sm:h-10 hover:bg-[rgba(255,255,255,0.15)] transition-colors"
          aria-label="Buscar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_search)">
              <path d="M14.4244 13.2936L17.8508 16.7192L16.7188 17.8512L13.2932 14.4248C12.0186 15.4466 10.4332 16.0023 8.79961 16C4.82521 16 1.59961 12.7744 1.59961 8.79998C1.59961 4.82558 4.82521 1.59998 8.79961 1.59998C12.774 1.59998 15.9996 4.82558 15.9996 8.79998C16.0019 10.4336 15.4462 12.019 14.4244 13.2936ZM12.8196 12.7C13.8349 11.6559 14.4019 10.2563 14.3996 8.79998C14.3996 5.70558 11.8932 3.19998 8.79961 3.19998C5.70521 3.19998 3.19961 5.70558 3.19961 8.79998C3.19961 11.8936 5.70521 14.4 8.79961 14.4C10.256 14.4023 11.6555 13.8353 12.6996 12.82L12.8196 12.7Z" fill="white"/>
            </g>
            <defs>
              <clipPath id="clip0_search">
                <rect width="19.2" height="19.2" rx="4.8" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default SearchForm;
