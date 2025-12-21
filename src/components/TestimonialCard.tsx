import React from 'react';

interface TestimonialCardProps {
  testimonial: string;
  rating: number;
  userName: string;
  userLocation: string;
  address: string;
  viewsPerDay: string;
  pointsOfInterest: string;
  peakHours: string;
  price: string;
  size: string;
  peakHoursDetail: string;
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 20 20" fill={filled ? "#9BFF43" : "none"} xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1.66667L12.575 6.88334L18.3333 7.725L14.1667 11.7833L15.15 17.5167L10 14.8083L4.85 17.5167L5.83333 11.7833L1.66667 7.725L7.425 6.88334L10 1.66667Z" stroke="#9BFF43" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={filled ? "#9BFF43" : "none"}/>
  </svg>
);

const ViewsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
    <circle cx="11" cy="11" r="3" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const InterestIcon = () => (
  <svg width="24" height="24" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 1.83325V3.20825" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M11 18.7917V20.1667" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M1.83301 11H3.20801" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M18.792 11H20.167" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M4.5 4.5L5.5 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M16.5 16.5L17.5 17.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M17.5 4.5L16.5 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M5.5 16.5L4.5 17.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <circle cx="11" cy="11" r="4" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 7.33325V10.9999L13.2917 13.2916" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const SizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 9.16428C5.51326 7.59993 5.60011 6.73753 6.16882 6.16882C6.73753 5.60011 7.59993 5.51326 9.16428 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M5.5 12.834C5.51326 14.3984 5.60011 15.2608 6.16882 15.8295C6.73753 16.3982 7.59993 16.485 9.16428 16.4983" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M16.498 9.16428C16.4848 7.59993 16.3979 6.73753 15.8292 6.16882C15.2605 5.60011 14.3981 5.51326 12.8338 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M16.498 12.834C16.4848 14.3984 16.3979 15.2608 15.8292 15.8295C15.2605 16.3982 14.3981 16.485 12.8338 16.4983" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const PeakIcon = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 7.33325V10.9999L13.2917 13.2916" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  rating,
  userName,
  userLocation,
  address,
  viewsPerDay,
  pointsOfInterest,
  peakHours,
  price,
  size,
  peakHoursDetail
}) => {
  return (
    <article className="flex flex-col w-full bg-[#1A1A1A] rounded-3xl overflow-hidden h-full">
      {/* Top Section - Dark */}
      <div className="p-6 pb-5">
        {/* Testimonial Quote */}
        <p className="text-white text-xl font-bold leading-tight mb-4">
          "{testimonial}"
        </p>
        
        {/* Rating Stars */}
        <div className="flex gap-1 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= rating} />
          ))}
        </div>
        
        {/* User Info */}
        <div className="mb-1">
          <p className="text-white font-bold text-base">{userName}</p>
          <p className="text-white/50 text-sm">{userLocation}</p>
        </div>
        
        {/* Location */}
        <div className="mt-4">
          <p className="text-[#9BFF43] font-bold text-lg">Mexicali</p>
          <p className="text-white/60 text-sm leading-relaxed">{address}</p>
        </div>
        
        {/* Metrics Boxes */}
        <div className="flex gap-2 mt-5">
          <div className="flex flex-col items-center flex-1 p-3 rounded-xl border border-[rgba(255,255,255,0.15)]">
            <ViewsIcon />
            <span className="text-white font-bold text-sm mt-2">{viewsPerDay}</span>
            <span className="text-white/50 text-xs">Vistas por Día</span>
          </div>
          <div className="flex flex-col items-center flex-1 p-3 rounded-xl border border-[rgba(255,255,255,0.15)]">
            <InterestIcon />
            <span className="text-white font-bold text-sm mt-2">{pointsOfInterest}</span>
            <span className="text-white/50 text-xs">Puntos Interés</span>
          </div>
          <div className="flex flex-col items-center flex-1 p-3 rounded-xl border border-[rgba(255,255,255,0.15)]">
            <ClockIcon />
            <span className="text-white font-bold text-sm mt-2">{peakHours}</span>
            <span className="text-white/50 text-xs">Horas pico</span>
          </div>
        </div>
        
        {/* Price Box */}
        <div className="flex justify-center items-center py-4 mt-5 rounded-xl bg-[#2A2A2A]">
          <span className="text-white/80 text-2xl font-bold">{price}</span>
          <span className="text-white/50 text-base ml-1">/mes</span>
        </div>
        
        {/* Size and Peak Hours */}
        <div className="flex justify-between items-center mt-5 px-1">
          <div className="flex items-center gap-2">
            <SizeIcon />
            <div>
              <span className="text-white font-semibold text-sm">Tamaño</span>
              <span className="text-white/60 text-sm ml-4">{size}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 px-1">
          <PeakIcon />
          <div>
            <span className="text-white font-semibold text-sm">Horas Pico</span>
            <span className="text-white/60 text-sm ml-4">{peakHoursDetail}</span>
          </div>
        </div>
      </div>
      
      {/* CTA Button */}
      <div className="px-6 pb-6 pt-2">
        <button className="w-full py-4 rounded-full bg-[#9BFF43] text-[#1A1A1A] font-bold text-base hover:bg-[#8AE63A] transition-colors">
          Ver Más
        </button>
      </div>
    </article>
  );
};

export default TestimonialCard;