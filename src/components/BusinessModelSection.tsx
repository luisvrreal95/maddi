import React from 'react';
import BusinessCard from './BusinessCard';

const BusinessModelSection: React.FC = () => {
  const handleRegister = (type: string) => {
    console.log(`Registering as ${type}`);
  };

  const BuildingIcon = () => (
    <div className="relative w-[83px] h-[83px]">
      <svg width="83" height="83" viewBox="0 0 83 83" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
        <circle cx="41.3045" cy="41.3045" r="40.5545" fill="url(#paint0_linear_building)" stroke="url(#paint1_linear_building)" strokeWidth="1.5"/>
        <defs>
          <linearGradient id="paint0_linear_building" x1="41.3045" y1="0" x2="41.3045" y2="82.6091" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.05"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="paint1_linear_building" x1="41.3045" y1="-2.19705" x2="85.685" y2="37.8768" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.3"/>
            <stop offset="0.545" stopColor="white" stopOpacity="0.05"/>
          </linearGradient>
        </defs>
      </svg>
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-[18px] top-[18px]">
        <path d="M42.1663 42.1666L3.83301 42.1666" stroke="#9BFF43" strokeWidth="2.875" strokeLinecap="round"/>
        <path d="M32.5837 42.1667V11.5C32.5837 7.88594 32.5837 6.07889 31.4609 4.95613C30.3381 3.83337 28.5311 3.83337 24.917 3.83337H21.0837C17.4696 3.83337 15.6625 3.83337 14.5397 4.95613C13.417 6.07889 13.417 7.88594 13.417 11.5V42.1667" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M40.2503 42.1667V16.2917C40.2503 13.5998 40.2503 12.2539 39.6043 11.287C39.3246 10.8685 38.9652 10.5091 38.5467 10.2294C37.5798 9.58337 36.2339 9.58337 33.542 9.58337" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M5.75 42.1667V16.2917C5.75 13.5998 5.75 12.2539 6.39603 11.287C6.67571 10.8685 7.03509 10.5091 7.45365 10.2294C8.4205 9.58337 9.76645 9.58337 12.4583 9.58337" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M23 42.1666V36.4166" stroke="#9BFF43" strokeWidth="2.875" strokeLinecap="round"/>
        <path d="M19.167 23H26.8337" stroke="#9BFF43" strokeWidth="2.875" strokeLinecap="round"/>
        <circle cx="23.0003" cy="13.4167" r="3.83333" stroke="#9BFF43" strokeWidth="2.875"/>
      </svg>
    </div>
  );

  const ShopIcon = () => (
    <div className="relative w-[83px] h-[83px]">
      <svg width="83" height="83" viewBox="0 0 83 83" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
        <circle cx="41.3045" cy="41.3045" r="40.5545" fill="url(#paint0_linear_shop)" stroke="url(#paint1_linear_shop)" strokeWidth="1.5"/>
        <defs>
          <linearGradient id="paint0_linear_shop" x1="41.3045" y1="0" x2="41.3045" y2="82.6091" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.05"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="paint1_linear_shop" x1="41.3045" y1="-2.19705" x2="85.685" y2="37.8768" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.3"/>
            <stop offset="0.545" stopColor="white" stopOpacity="0.05"/>
          </linearGradient>
        </defs>
      </svg>
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-[18px] top-[18px]">
        <path d="M6.70801 21.0834V26.8334C6.70801 34.0616 6.70801 37.6757 8.95352 39.9212C11.199 42.1667 14.8131 42.1667 22.0413 42.1667H23.958C31.1862 42.1667 34.8003 42.1667 37.0458 39.9212C39.2913 37.6757 39.2913 34.0616 39.2913 26.8334V21.0834" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M18.2076 3.83337H27.791L29.0401 16.325C29.3975 19.8989 26.591 23 22.9993 23C19.4076 23 16.6011 19.8989 16.9585 16.325L18.2076 3.83337Z" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M6.38101 10.2567C6.72233 8.55016 6.89299 7.69686 7.23998 7.00515C7.97113 5.54763 9.28675 4.46908 10.8594 4.03797C11.6057 3.83337 12.4759 3.83337 14.2163 3.83337H18.2074L16.8187 17.7201C16.5189 20.7175 13.9967 23 10.9845 23C7.28443 23 4.50936 19.615 5.23499 15.9868L6.38101 10.2567Z" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M39.6183 10.2567C39.277 8.55016 39.1064 7.69686 38.7594 7.00515C38.0282 5.54763 36.7126 4.46908 35.14 4.03797C34.3937 3.83337 33.5235 3.83337 31.7831 3.83337H27.792L29.1807 17.7201C29.4804 20.7175 32.0026 23 35.0149 23C38.7149 23 41.49 19.615 40.7644 15.9868L39.6183 10.2567Z" stroke="#9BFF43" strokeWidth="2.875"/>
        <path d="M18.208 41.2083V35.4583C18.208 33.6669 18.208 32.7713 18.5932 32.1041C18.8455 31.6671 19.2085 31.3041 19.6455 31.0518C20.3127 30.6666 21.2083 30.6666 22.9997 30.6666C24.791 30.6666 25.6867 30.6666 26.3538 31.0518C26.7909 31.3041 27.1538 31.6671 27.4062 32.1041C27.7913 32.7713 27.7913 33.6669 27.7913 35.4583V41.2083" stroke="#9BFF43" strokeWidth="2.875" strokeLinecap="round"/>
      </svg>
    </div>
  );

  return (
    <section className="flex flex-col items-start gap-16 self-stretch relative bg-[#202020] pt-0 pb-[100px] px-16 max-md:gap-12 max-md:pt-0 max-md:pb-20 max-md:px-8 max-sm:gap-8 max-sm:pt-0 max-sm:pb-[60px] max-sm:px-5">
      <div className="blur-[75px] w-full max-w-[1152px] h-[404px] absolute bg-[rgba(196,196,196,0.20)] left-16 bottom-[100px] pointer-events-none" />
      
      <header className="flex flex-col items-center gap-10 self-stretch relative rounded-[8px_8px_0_0]">
        <div className="flex flex-col items-center gap-4 self-stretch relative">
          <h2 className="text-[#D9D9D9] text-8xl font-bold leading-[96px] uppercase relative max-md:text-7xl max-md:leading-[72px] max-sm:text-4xl max-sm:leading-[40px] text-center">
            MODELO DE NEGOCIO
          </h2>
        </div>
      </header>

      <div className="flex items-start gap-9 self-stretch relative z-10 max-md:flex-col max-md:gap-6">
        <BusinessCard
          icon={<BuildingIcon />}
          title="Dueño de Espectacular"
          description="Crea una cuenta, da de alta tus propiedades donde la gente se pueda anunciar"
          callToAction="¡Comienza a rentar!"
          onRegister={() => handleRegister('owner')}
        />
        
        <BusinessCard
          icon={<ShopIcon />}
          title="Negocio"
          description="Busca un spot para publicitar tú negocio, crea una cuenta y agéndalo."
          callToAction="¡Ve tú marca en todos lados!"
          onRegister={() => handleRegister('business')}
        />
      </div>
    </section>
  );
};

export default BusinessModelSection;
