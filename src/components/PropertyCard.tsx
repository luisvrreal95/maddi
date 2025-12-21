import React from 'react';

interface Feature {
  icon: React.ReactNode;
  name: string;
  value: string;
}

interface PropertyCardProps {
  title: string;
  address: string;
  price: string;
  features: Feature[];
  availability: string;
  onSelect?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  address,
  price,
  features,
  availability,
  onSelect
}) => {
  return (
    <article className="flex flex-1 min-w-0 flex-col items-center gap-9 self-stretch relative bg-[#202020] p-8 rounded-[23px] border-[1.5px] border-solid border-[rgba(255,255,255,0.30)] hover:border-white hover:bg-[#252525] transition-all duration-300 cursor-pointer max-md:w-full max-sm:gap-6 max-sm:p-6">
      <div className="flex flex-col items-start gap-8 self-stretch relative">
        <div className="flex flex-col items-start gap-6 self-stretch relative">
          <header className="flex flex-col items-start gap-2 self-stretch relative">
            <h3 className="self-stretch text-white text-4xl font-semibold relative max-sm:text-[28px]">
              {title}
            </h3>
            <div className="flex items-start gap-1 self-stretch relative">
              <address className="flex-[1_0_0] text-white text-sm font-normal relative not-italic opacity-70">
                {address}
              </address>
            </div>
          </header>
          
          <div className="flex justify-center items-center gap-1 self-stretch relative px-0 py-4 rounded-xl border-[1.5px] border-solid border-[rgba(255,255,255,0.30)]">
            <span className="text-white text-4xl font-semibold relative max-sm:text-[28px]">
              {price}
            </span>
            <div className="flex justify-center items-center gap-2 relative pt-1">
              <span className="text-[#C4C4C4] text-2xl font-normal relative max-sm:text-xl">
                /mes
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-start gap-6 self-stretch relative">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-start gap-2 self-stretch relative">
              <div className="flex items-center gap-2 relative">
                {feature.icon}
                <span className="text-white text-lg font-semibold relative">
                  {feature.name}
                </span>
              </div>
              <span className="text-white text-lg font-normal relative opacity-70">
                {feature.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col justify-center items-center gap-4 self-stretch border relative p-6 rounded-lg border-solid border-[#444]">
        <div className="flex justify-center items-center gap-2 relative">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.6941 9.19439C14.9626 8.9259 14.9626 8.4906 14.6941 8.22212C14.4257 7.95363 13.9904 7.95363 13.7219 8.22212L9.62467 12.3193L8.27748 10.9721C8.00899 10.7036 7.57369 10.7036 7.30521 10.9721C7.03672 11.2406 7.03672 11.6759 7.30521 11.9444L9.13854 13.7777C9.40702 14.0462 9.84232 14.0462 10.1108 13.7777L14.6941 9.19439Z" fill="#9BFF43"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M11.0523 1.14575H10.9471C8.83106 1.14574 7.17276 1.14573 5.8789 1.31969C4.55456 1.49774 3.50954 1.8693 2.6893 2.68954C1.86906 3.50979 1.4975 4.55481 1.31944 5.87915C1.14549 7.17301 1.1455 8.83129 1.14551 10.9473V11.0525C1.1455 13.1685 1.14549 14.8268 1.31944 16.1207C1.4975 17.445 1.86906 18.4901 2.6893 19.3103C3.50954 20.1305 4.55456 20.5021 5.8789 20.6802C7.17277 20.8541 8.83105 20.8541 10.9471 20.8541H11.0523C13.1683 20.8541 14.8266 20.8541 16.1204 20.6802C17.4448 20.5021 18.4898 20.1305 19.3101 19.3103C20.1303 18.4901 20.5019 17.445 20.6799 16.1207C20.8539 14.8268 20.8539 13.1685 20.8538 11.0525V10.9473C20.8539 8.8313 20.8539 7.17301 20.6799 5.87915C20.5019 4.55481 20.1303 3.50979 19.3101 2.68954C18.4898 1.8693 17.4448 1.49774 16.1204 1.31969C14.8266 1.14573 13.1683 1.14574 11.0523 1.14575ZM3.66157 3.66182C4.18376 3.13963 4.89025 2.83998 6.06212 2.68243C7.25377 2.52221 8.81963 2.52075 10.9997 2.52075C13.1797 2.52075 14.7456 2.52221 15.9372 2.68243C17.1091 2.83998 17.8156 3.13963 18.3378 3.66182C18.86 4.184 19.1596 4.89049 19.3172 6.06236C19.4774 7.25401 19.4788 8.81988 19.4788 10.9999C19.4788 13.18 19.4774 14.7458 19.3172 15.9375C19.1596 17.1093 18.86 17.8158 18.3378 18.338C17.8156 18.8602 17.1091 19.1599 15.9372 19.3174C14.7456 19.4776 13.1797 19.4791 10.9997 19.4791C8.81963 19.4791 7.25377 19.4776 6.06212 19.3174C4.89025 19.1599 4.18376 18.8602 3.66157 18.338C3.13939 17.8158 2.83974 17.1093 2.68218 15.9375C2.52197 14.7458 2.52051 13.18 2.52051 10.9999C2.52051 8.81988 2.52197 7.25401 2.68218 6.06236C2.83974 4.89049 3.13939 4.184 3.66157 3.66182Z" fill="#9BFF43"/>
          </svg>
          <span className="text-white text-2xl font-semibold leading-5 relative">
            Disponibilidad
          </span>
        </div>
        <span className="text-white text-2xl font-normal leading-5 relative">
          {availability}
        </span>
      </div>
      
      <button 
        onClick={onSelect}
        className="flex justify-center items-center gap-2.5 self-stretch border backdrop-blur-[30px] relative px-[19px] py-4 rounded-[30px] border-solid border-[#9BFF43] hover:bg-[#9BFF43]/10 transition-colors"
      >
        <span className="text-[#9BFF43] text-center text-base font-semibold capitalize">
          ¡Lo Quiero!
        </span>
      </button>
    </article>
  );
};

export default PropertyCard;
