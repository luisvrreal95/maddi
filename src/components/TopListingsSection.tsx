import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PropertyCard from './PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Billboard {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price_per_month: number;
  image_url: string | null;
  image_urls: string[] | null;
  daily_impressions: number | null;
  points_of_interest: string[] | null;
  width_m: number;
  height_m: number;
  billboard_type: string;
}

const PeopleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.8337 3.66659C12.8337 4.67911 12.0128 5.49992 11.0003 5.49992C9.9878 5.49992 9.16699 4.67911 9.16699 3.66659C9.16699 2.65406 9.9878 1.83325 11.0003 1.83325C12.0128 1.83325 12.8337 2.65406 12.8337 3.66659Z" stroke="#9BFF43" strokeWidth="1.375"/>
    <path d="M17.8322 13.2917C19.2837 14.0215 20.1663 14.9853 20.1663 16.0417C20.1663 18.3199 16.0623 20.1667 10.9997 20.1667C5.93706 20.1667 1.83301 18.3199 1.83301 16.0417C1.83301 14.9853 2.71562 14.0215 4.16713 13.2917" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
  </svg>
);

const ViewsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
    <circle cx="11" cy="11" r="3" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const SaleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M14.2471 7.75253C14.5165 8.02195 14.5165 8.45876 14.2471 8.72818L8.72794 14.2473C8.45852 14.5167 8.0217 14.5167 7.75228 14.2473C7.48287 13.9779 7.48287 13.5411 7.75228 13.2717L13.2714 7.75253C13.5408 7.48311 13.9776 7.48311 14.2471 7.75253Z" fill="#9BFF43"/>
    <path d="M14.2192 13.2996C14.2192 13.8076 13.8073 14.2194 13.2993 14.2194C12.7913 14.2194 12.3795 13.8076 12.3795 13.2996C12.3795 12.7915 12.7913 12.3797 13.2993 12.3797C13.8073 12.3797 14.2192 12.7915 14.2192 13.2996Z" fill="#9BFF43"/>
    <path d="M9.61989 8.70028C9.61989 9.2083 9.20806 9.62014 8.70004 9.62014C8.19202 9.62014 7.78018 9.2083 7.78018 8.70028C7.78018 8.19226 8.19202 7.78043 8.70004 7.78043C9.20806 7.78043 9.61989 8.19226 9.61989 8.70028Z" fill="#9BFF43"/>
    <rect x="2" y="2" width="18" height="18" rx="4" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

const SizeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 9.16428C5.51326 7.59993 5.60011 6.73753 6.16882 6.16882C6.73753 5.60011 7.59993 5.51326 9.16428 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M5.5 12.834C5.51326 14.3984 5.60011 15.2608 6.16882 15.8295C6.73753 16.3982 7.59993 16.485 9.16428 16.4983" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M16.498 9.16428C16.4848 7.59993 16.3979 6.73753 15.8292 6.16882C15.2605 5.60011 14.3981 5.51326 12.8338 5.5" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M16.498 12.834C16.4848 14.3984 16.3979 15.2608 15.8292 15.8295C15.2605 16.3982 14.3981 16.485 12.8338 16.4983" stroke="#9BFF43" strokeWidth="1.375" strokeLinecap="round"/>
    <path d="M1.83301 10.9999C1.83301 6.67871 1.83301 4.51811 3.17544 3.17568C4.51786 1.83325 6.67847 1.83325 10.9997 1.83325C15.3209 1.83325 17.4815 1.83325 18.8239 3.17568C20.1663 4.51811 20.1663 6.67871 20.1663 10.9999C20.1663 15.3211 20.1663 17.4817 18.8239 18.8242C17.4815 20.1666 15.3209 20.1666 10.9997 20.1666C6.67847 20.1666 4.51786 20.1666 3.17544 18.8242C1.83301 17.4817 1.83301 15.3211 1.83301 10.9999Z" stroke="#9BFF43" strokeWidth="1.375"/>
  </svg>
);

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('es-MX')} MXN`;
}

const TopListingsSection: React.FC = () => {
  const navigate = useNavigate();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('billboards')
      .select('id, title, address, city, state, price_per_month, image_url, image_urls, daily_impressions, points_of_interest, width_m, height_m, billboard_type')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setBillboards(data || []);
        setIsLoading(false);
      });
  }, []);

  const displayCity = billboards[0]?.city || '';

  if (isLoading) {
    return (
      <section className="flex flex-col items-start self-stretch relative">
        <div className="w-full bg-[#202020] pt-16 pb-24 px-16 max-md:px-8 max-sm:px-5">
          <div className="flex flex-col items-center gap-4 mb-12">
            <Skeleton className="h-24 w-96 bg-white/10" />
            <Skeleton className="h-12 w-64 bg-white/10" />
          </div>
          <div className="flex justify-center gap-9 max-md:flex-col max-md:gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="flex-1 h-[600px] rounded-[23px] bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (billboards.length === 0) {
    return (
      <section className="flex flex-col items-start self-stretch relative">
        <div className="w-full bg-[#202020] pt-16 pb-24 px-16 max-md:px-8 max-sm:px-5 text-center">
          <p className="text-white/40 text-lg">No hay espectaculares disponibles en este momento.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start self-stretch relative">
      <div className="w-full bg-[#202020] pt-16 pb-24 px-16 max-md:px-8 max-sm:px-5 relative">
        <div className="blur-[100px] w-[400px] h-[600px] absolute bg-[rgba(255,255,255,0.08)] left-16 top-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="blur-[100px] w-[400px] h-[600px] absolute bg-[rgba(255,255,255,0.08)] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="blur-[100px] w-[400px] h-[600px] absolute bg-[rgba(255,255,255,0.08)] right-16 top-1/2 -translate-y-1/2 pointer-events-none" />

        <header className="flex flex-col items-center gap-10 self-stretch relative mb-12">
          <div className="flex flex-col items-center gap-4 self-stretch relative">
            <h2 className="text-[#D9D9D9] text-8xl font-bold leading-[96px] uppercase relative max-md:text-7xl max-md:leading-[72px] max-sm:text-4xl max-sm:leading-[40px] text-center">
              Top listings
            </h2>
            {displayCity && (
              <h3 className="self-stretch text-[#9BFF43] text-center text-5xl font-bold leading-[48px] relative max-md:text-4xl max-sm:text-2xl">
                {displayCity}
              </h3>
            )}
          </div>
        </header>

        <div className="flex justify-center items-stretch gap-9 self-stretch relative z-10 max-md:flex-col max-md:gap-6">
          {billboards.map((b) => {
            const imageUrl = b.image_urls?.[0] || b.image_url || undefined;
            const features = [
              {
                icon: <PeopleIcon />,
                name: 'Puntos de Interés',
                value: b.points_of_interest?.slice(0, 3).join(', ') || 'N/A',
              },
              {
                icon: <ViewsIcon />,
                name: 'Vistas por día',
                value: b.daily_impressions ? `+${b.daily_impressions.toLocaleString('es-MX')}` : 'N/A',
              },
              {
                icon: <SaleIcon />,
                name: 'Tipo',
                value: b.billboard_type,
              },
              {
                icon: <SizeIcon />,
                name: 'Tamaño',
                value: `${b.width_m}m × ${b.height_m}m`,
              },
            ];

            return (
              <PropertyCard
                key={b.id}
                title={b.title}
                address={`${b.address}, ${b.city}, ${b.state}`}
                price={formatPrice(b.price_per_month)}
                features={features}
                availability="Inmediata"
                imageUrl={imageUrl}
                onSelect={() => navigate(`/billboard/${b.id}`)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopListingsSection;
