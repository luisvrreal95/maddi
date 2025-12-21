import React from 'react';

interface TestimonialCardProps {
  testimonial: string;
  rating: number;
  userName: string;
  userLocation: string;
  address: string;
  viewsPerDay: string;
  monthlyTraffic: string;
  peakHours: string;
  price: string;
  size: string;
  peakHoursDetail: string;
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill={filled ? "#9BFF43" : "none"} xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1.66667L12.575 6.88334L18.3333 7.725L14.1667 11.7833L15.15 17.5167L10 14.8083L4.85 17.5167L5.83333 11.7833L1.66667 7.725L7.425 6.88334L10 1.66667Z" stroke="#9BFF43" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={filled ? "#9BFF43" : "none"}/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.8337 3.66659C12.8337 4.67911 12.0128 5.49992 11.0003 5.49992C9.9878 5.49992 9.16699 4.67911 9.16699 3.66659C9.16699 2.65406 9.9878 1.83325 11.0003 1.83325C12.0128 1.83325 12.8337 2.65406 12.8337 3.66659Z" stroke="#9BFF43" strokeWidth="1.375"/>
    <path d="M17.8322 13.2917C19.2837 14.0215 20.1663 14.9853 20.1663 16.0417C20.1663 18.3199 16.0623 20.1667 10.9997 20.1667C5.93706 20.1667 1.83301 18.3199 1.83301 16.0417C1.83301 14.9853 2.71562 14.0215 4.16713 13.2917" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
  </svg>
);

const ViewsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
    <circle cx="11" cy="11" r="3" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const ClockIcon = () => (
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
  monthlyTraffic,
  peakHours,
  price,
  size,
  peakHoursDetail
}) => {
  return (
    <article className="flex flex-col w-[380px] min-w-[380px] bg-[#2A2A2A] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] hover:border-[rgba(155,255,67,0.3)] transition-all duration-300 max-sm:w-[320px] max-sm:min-w-[320px]">
      {/* Testimonial Section */}
      <div className="p-6 pb-4">
        <p className="text-white/80 text-sm leading-relaxed italic mb-4">
          "{testimonial}"
        </p>
        
        {/* Rating */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} filled={star <= rating} />
          ))}
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
            <span className="text-[#9BFF43] font-semibold text-sm">
              {userName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{userName}</p>
            <p className="text-white/50 text-xs">{userLocation}</p>
          </div>
        </div>
        
        <p className="text-white/60 text-xs">{address}</p>
      </div>
      
      {/* Metrics Section */}
      <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ViewsIcon />
            <span className="text-white/70 text-xs">{viewsPerDay}</span>
          </div>
          <div className="flex items-center gap-2">
            <PeopleIcon />
            <span className="text-white/70 text-xs">{monthlyTraffic}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="text-white/70 text-xs">{peakHours}</span>
          </div>
        </div>
      </div>
      
      {/* Price Section */}
      <div className="px-6 py-3 bg-[#9BFF43] flex justify-between items-center">
        <span className="text-[#202020] font-bold text-xl">{price}<span className="font-normal text-sm">/mes</span></span>
      </div>
      
      {/* Bottom Details */}
      <div className="px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-white/50 text-xs mb-1">Tamaño</p>
          <p className="text-white font-medium text-sm">{size}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs mb-1">Horas Pico</p>
          <p className="text-white font-medium text-sm">{peakHoursDetail}</p>
        </div>
      </div>
      
      {/* CTA Button */}
      <div className="px-6 pb-6">
        <button className="w-full py-3 rounded-full border border-[#9BFF43] text-[#9BFF43] font-semibold text-sm hover:bg-[#9BFF43]/10 transition-colors">
          Ver Más
        </button>
      </div>
    </article>
  );
};

export default TestimonialCard;
