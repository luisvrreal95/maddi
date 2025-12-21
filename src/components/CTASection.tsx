import React from 'react';

const CTASection: React.FC = () => {
  return (
    <section className="relative bg-[#1A1A1A] py-24 px-16 max-md:py-16 max-md:px-8 max-sm:py-12 max-sm:px-5 overflow-hidden">
      {/* Decorative Maddi Logo Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <svg width="600" height="200" viewBox="0 0 600 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="160" fontWeight="bold" fontFamily="system-ui">
            MADDI
          </text>
        </svg>
      </div>
      
      {/* Background blur elements */}
      <div className="blur-[150px] w-[500px] h-[300px] absolute bg-[rgba(155,255,67,0.1)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-4xl mx-auto text-center">
        <h2 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-sm:text-2xl">
          La publicidad exterior nunca fue tan fácil de gestionar.
        </h2>
        
        <p className="text-white/60 text-lg md:text-xl max-w-2xl max-sm:text-base">
          Únete a la plataforma que conecta negocios con los mejores espacios publicitarios de la región.
        </p>
        
        <button className="mt-4 px-10 py-4 bg-[#9BFF43] text-[#202020] font-bold text-lg rounded-full hover:bg-[#8AE63A] transition-colors duration-300 shadow-lg shadow-[#9BFF43]/20 hover:shadow-[#9BFF43]/40 max-sm:px-8 max-sm:py-3 max-sm:text-base">
          Unirme a Maddi
        </button>
      </div>
    </section>
  );
};

export default CTASection;
