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
    testimonial: "La mejor inversión publicitaria que he hecho",
    rating: 5,
    userName: "Carlos",
    userLocation: "Tacos El Rey – Ensenada",
    address: "Av. Reforma 1500, Zona Centro, 22800 Ensenada, B.C.",
    viewsPerDay: "+15,000",
    pointsOfInterest: "+15",
    peakHours: "5pm-9pm",
    price: "$850",
    size: "40m.x80m.",
    peakHoursDetail: "5pm-9pm"
  },
  {
    testimonial: "Maddi me permitió encontrar el espacio perfecto",
    rating: 5,
    userName: "Ana",
    userLocation: "Boutique Rosa – Mexicali",
    address: "Calz. Independencia 1234, Centro, 21100 Mexicali, B.C.",
    viewsPerDay: "+25,000",
    pointsOfInterest: "+30",
    peakHours: "7am-10am",
    price: "$1,200",
    size: "80m.x160m.",
    peakHoursDetail: "7am-10am"
  },
  {
    testimonial: "La plataforma es intuitiva y el soporte excelente",
    rating: 5,
    userName: "Roberto",
    userLocation: "Gym Power – Tijuana",
    address: "Blvd. Agua Caliente 4500, Zona Río, 22420 Tijuana, B.C.",
    viewsPerDay: "+30,000",
    pointsOfInterest: "+25",
    peakHours: "6pm-10pm",
    price: "$1,500",
    size: "100m.x200m.",
    peakHoursDetail: "6pm-10pm"
  }
];

const AdvertisingSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 420;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative bg-[#202020] py-20 px-16 max-md:py-16 max-md:px-8 max-sm:py-12 max-sm:px-5 overflow-hidden">
      {/* Background blur elements */}
      <div className="blur-[100px] w-[400px] h-[400px] absolute bg-[rgba(155,255,67,0.08)] -left-32 top-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="blur-[100px] w-[400px] h-[400px] absolute bg-[rgba(155,255,67,0.08)] -right-32 top-1/2 -translate-y-1/2 pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-col items-center gap-4 mb-12 relative z-10">
        <h2 className="text-[#D9D9D9] text-5xl md:text-6xl lg:text-7xl font-bold leading-tight uppercase text-center max-sm:text-3xl">
          PUBLICIDAD FÍSICA Y DIGITAL
        </h2>
        <h3 className="text-[#9BFF43] text-3xl md:text-4xl lg:text-5xl font-bold text-center max-sm:text-xl">
          PARA TÚ NEGOCIO
        </h3>
        <p className="text-white/70 text-lg text-center mt-2 max-sm:text-base">
          Encuentra los mejores espacios publicitarios
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Navigation Arrows */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#2A2A2A] border border-[rgba(255,255,255,0.2)] flex items-center justify-center transition-all duration-300 max-md:hidden ${
            canScrollLeft 
              ? 'hover:bg-[#9BFF43] hover:border-[#9BFF43] cursor-pointer' 
              : 'opacity-30 cursor-not-allowed'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeft className={`w-6 h-6 ${canScrollLeft ? 'text-white hover:text-[#202020]' : 'text-white/50'}`} />
        </button>

        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#2A2A2A] border border-[rgba(255,255,255,0.2)] flex items-center justify-center transition-all duration-300 max-md:hidden ${
            canScrollRight 
              ? 'hover:bg-[#9BFF43] hover:border-[#9BFF43] cursor-pointer' 
              : 'opacity-30 cursor-not-allowed'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRight className={`w-6 h-6 ${canScrollRight ? 'text-white hover:text-[#202020]' : 'text-white/50'}`} />
        </button>

        {/* Cards Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-8 md:px-16 pb-4 -mx-8 md:-mx-16 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              {...testimonial}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdvertisingSection;