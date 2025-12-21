import React from 'react';

const CTASection: React.FC = () => {
  return (
    <section className="relative bg-[#E5E5E5] py-16 px-8 md:px-16 lg:px-24">
      {/* Background gradient fade at top */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#202020] to-transparent pointer-events-none" />
      
      {/* Centered Card */}
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-[#1A1A1A] rounded-3xl py-16 px-8 md:px-16 text-center relative overflow-hidden">
          {/* Decorative Maddi Logo Background */}
          <div className="absolute inset-0 flex items-center justify-start opacity-[0.03] pointer-events-none overflow-hidden">
            <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="-ml-20">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="200" fontWeight="bold" fontFamily="system-ui">
                M
              </text>
            </svg>
          </div>
          
          <h2 className="text-white text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 max-sm:text-xl">
            La publicidad exterior nunca fue tan fácil de gestionar.
          </h2>
          
          <p className="text-white/60 text-base md:text-lg mb-8 max-sm:text-sm">
            Tu marca a un solo Descubre cómo con Maddi
          </p>
          
          <button className="px-12 py-4 bg-[#9BFF43] text-[#1A1A1A] font-bold text-lg rounded-full hover:bg-[#8AE63A] transition-colors duration-300 max-sm:px-8 max-sm:py-3 max-sm:text-base">
            Unirme a Maddi
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;