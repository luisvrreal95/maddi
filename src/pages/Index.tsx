import React from 'react';
import HeroSection from '@/components/HeroSection';
import RatingSection from '@/components/RatingSection';
import BusinessModelSection from '@/components/BusinessModelSection';
import TopListingsSection from '@/components/TopListingsSection';
import AdvertisingSection from '@/components/AdvertisingSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  return (
    <main className="flex flex-col items-start self-stretch relative bg-[#202020] min-h-screen">
      <HeroSection />
      <RatingSection />
      <BusinessModelSection />
      <TopListingsSection />
      <AdvertisingSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
