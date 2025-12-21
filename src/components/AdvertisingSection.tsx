import React, { useRef, useState, useEffect } from 'react';
import TestimonialCard from './TestimonialCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    testimonial: "Ayudo a impulsar las ventas de mi negocio",
    rating: 5,
    userName: "Miguel",
    userLocation: "ALHO Water – Mexicali",
    address: "Blvd. Benito Juárez 2151, Centro Cívico, 21000 Mexicali, B.C.",
    viewsPerDay: "+20,000",
    pointsOfInterest: "+20",
    peakHours: "8am-12pm",
    price: "$990",
    size: "60m.x120m.",
    peakHoursDetail: "8am-12pm"
  },
  {
    testimonial: "Fomento la sostenibilidad en la cocina",
    rating: 5,
    userName: "Carlos",
    userLocation: "Restaurante Verde – Ensenada",
    address: "Calle 6, 123, Centro, 22800 Ensenada, B.C.",
    viewsPerDay: "+25,000",
    pointsOfInterest: "+50",
    peakHours: "11am-3pm",
    price: "$1,500",
    size: "80m.x150m.",
    peakHoursDetail: "11am-3pm"
  },
  {
    testimonial: "Transformo la manera en que las personas se conectan",
    rating: 5,
    userName: "Laura",
    userLocation: "Café Conexión – Tijuana",
    address: "Av. Revolución 1234, Centro, 22000 Tijuana, B.C.",
    viewsPerDay: "+15,000",
    pointsOfInterest: "+30",
    peakHours: "9am-1pm",
    price: "$1,200",
    size: "70m.x140m.",
    peakHoursDetail: "9am-1pm"
  }
];

const AdvertisingSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < testimonials.length - 2;

  const scroll = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'right' && canScrollRight) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <section className="relative bg-white py-20 px-16 max-md:py-16 max-md:px-8 max-sm:py-12 max-sm:px-5 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-[#202020] text-5xl md:text-6xl lg:text-7xl font-bold leading-tight uppercase max-sm:text-3xl">
            PUBLICIDAD DIGITAL PARA TÚ
          </h2>
          <h2 className="text-[#202020] text-5xl md:text-6xl lg:text-7xl font-bold leading-tight uppercase max-sm:text-3xl">
            NEGOCIO
          </h2>
          <p className="text-[#202020]/70 text-lg mt-2 max-sm:text-base">
            Encuentra los mejores espacios publicitarios
          </p>
        </div>
        
        {/* Navigation Arrows */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              canScrollLeft 
                ? 'border-[#202020] hover:bg-[#202020] hover:text-white cursor-pointer text-[#202020]' 
                : 'border-[#202020]/30 text-[#202020]/30 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              canScrollRight 
                ? 'border-[#202020] hover:bg-[#202020] hover:text-white cursor-pointer text-[#202020]' 
                : 'border-[#202020]/30 text-[#202020]/30 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div className="relative overflow-hidden -mr-16 max-md:-mr-8 max-sm:-mr-5">
        <div
          ref={scrollContainerRef}
          className="flex gap-8 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 480}px)` }}
        >
          {testimonials.map((testimonial, index) => {
            const isBlurred = index >= currentIndex + 2;
            return (
              <div
                key={index}
                className={`flex-shrink-0 transition-all duration-500 ${
                  isBlurred ? 'opacity-50 blur-sm grayscale' : 'opacity-100'
                }`}
                style={{ width: '450px' }}
              >
                <TestimonialCard {...testimonial} />
              </div>
            );
          })}
        </div>
        
        {/* Fade overlay on the right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
};

export default AdvertisingSection;