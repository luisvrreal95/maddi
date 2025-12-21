import React, { useState } from 'react';

interface SearchFormProps {
  onSearch?: (query: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('Buscar en Mexicali un espectacular que tenga un tamaño grande y en una zona transitada');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex w-[576px] flex-col items-center gap-4 relative max-md:w-full max-md:max-w-[480px]">
      <p className="self-stretch text-white text-center text-base font-normal">
        ¡El espacio perfecto para tu marca!
      </p>
      
      <form onSubmit={handleSubmit} className="flex justify-center items-center gap-3 self-stretch relative bg-transparent pl-14 pr-6 py-4 rounded-[100px] max-sm:gap-2 max-sm:pl-10 max-sm:pr-4 max-sm:py-3">
        <div className="flex flex-col items-start gap-3 flex-[1_0_0] relative">
          <label htmlFor="search-input" className="sr-only">
            Buscar espacios publicitarios
          </label>
          <textarea
            id="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="self-stretch text-white text-2xl leading-[28.8px] relative max-md:text-xl max-sm:text-base bg-transparent border-none outline-none resize-none overflow-hidden"
            rows={2}
            placeholder="Buscar espacios publicitarios..."
          />
        </div>
        
        <button
          type="submit"
          className="flex w-12 justify-center items-center gap-3 border relative bg-[rgba(255,255,255,0.05)] p-[14.4px] rounded-[100px] border-solid border-[rgba(255,255,255,0.30)] max-sm:w-10 max-sm:p-2.5 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          aria-label="Buscar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_2008_669)">
              <path d="M14.4244 13.2936L17.8508 16.7192L16.7188 17.8512L13.2932 14.4248C12.0186 15.4466 10.4332 16.0023 8.79961 16C4.82521 16 1.59961 12.7744 1.59961 8.79998C1.59961 4.82558 4.82521 1.59998 8.79961 1.59998C12.774 1.59998 15.9996 4.82558 15.9996 8.79998C16.0019 10.4336 15.4462 12.019 14.4244 13.2936ZM12.8196 12.7C13.8349 11.6559 14.4019 10.2563 14.3996 8.79998C14.3996 5.70558 11.8932 3.19998 8.79961 3.19998C5.70521 3.19998 3.19961 5.70558 3.19961 8.79998C3.19961 11.8936 5.70521 14.4 8.79961 14.4C10.256 14.4023 11.6555 13.8353 12.6996 12.82L12.8196 12.7Z" fill="white"/>
            </g>
            <defs>
              <clipPath id="clip0_2008_669">
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
