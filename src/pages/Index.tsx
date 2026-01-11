import React from 'react';
import HeroSection from '@/components/HeroSection';
import RatingSection from '@/components/RatingSection';
import BusinessModelSection from '@/components/BusinessModelSection';
import TopListingsSection from '@/components/TopListingsSection';
import AdvertisingSection from '@/components/AdvertisingSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';

const Index: React.FC = () => {
  return (
    <main className="flex flex-col items-stretch relative min-h-screen pb-16 md:pb-0">
      <HeroSection />
      <RatingSection />
      <BusinessModelSection />
      <TopListingsSection />
      <AdvertisingSection />
      <CTASection />
      <Footer />
      <MobileNavBar />
    </main>
  );
};

export default Index;
