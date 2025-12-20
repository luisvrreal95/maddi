import React from 'react';
import HeroSection from '@/components/HeroSection';
import RatingSection from '@/components/RatingSection';
import BusinessModelSection from '@/components/BusinessModelSection';
import TopListingsSection from '@/components/TopListingsSection';

const Index: React.FC = () => {
  return (
    <main className="flex flex-col items-start self-stretch relative bg-[#202020] min-h-screen">
      <HeroSection />
      <RatingSection />
      <BusinessModelSection />
      <TopListingsSection />
    </main>
  );
};

export default Index;
