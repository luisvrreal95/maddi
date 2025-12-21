import React from 'react';

interface BusinessCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  callToAction: string;
  onRegister?: () => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({
  icon,
  title,
  description,
  callToAction,
  onRegister
}) => {
  return (
    <article className="flex items-start gap-10 flex-[1_0_0] self-stretch relative bg-[#1D1D1D] px-6 py-10 rounded-2xl max-sm:px-5 max-sm:py-8 border border-transparent hover:border-white/50 hover:bg-[#252525] transition-all duration-300 cursor-pointer">
      <div className="flex flex-col items-center gap-10 flex-[1_0_0] relative">
        <div className="flex flex-col items-start gap-6 self-stretch relative">
          <div className="flex flex-col items-center gap-6 self-stretch relative">
            <div className="w-[83px] h-[83px] relative flex items-center justify-center">
              {icon}
            </div>
            <h3 className="self-stretch text-white text-center text-[28px] font-bold leading-[30px] relative max-sm:text-2xl max-sm:leading-7">
              {title}
            </h3>
          </div>
          <p className="self-stretch text-[rgba(255,255,255,0.63)] text-center text-base font-normal leading-[30px] relative">
            {description}
          </p>
          <p className="self-stretch text-white text-center text-lg font-semibold leading-[25.2px] tracking-[-0.36px] relative">
            {callToAction}
          </p>
        </div>
        <button 
          onClick={onRegister}
          className="flex justify-center items-center gap-2.5 self-stretch relative px-[22px] py-4 rounded-[10px] border-[1.5px] border-solid border-[rgba(255,255,255,0.30)] hover:border-[rgba(255,255,255,0.50)] hover:bg-white/5 transition-colors"
        >
          <span className="text-white text-center text-base font-semibold capitalize">
            Registrarme
          </span>
        </button>
      </div>
    </article>
  );
};

export default BusinessCard;
