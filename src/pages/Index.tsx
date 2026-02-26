import React from 'react';
import HeroSection from '@/components/HeroSection';
import FeaturedListingsSection from '@/components/FeaturedListingsSection';
import FeaturesSection from '@/components/FeaturesSection';
import OwnerCTASection from '@/components/OwnerCTASection';
import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';
import PromoBanner from '@/components/PromoBanner';

const Index: React.FC = () => {
  return (
    <main className="flex flex-col items-stretch relative min-h-screen pb-20 md:pb-0">
      <PromoBanner />
      <HeroSection />
      <FeaturedListingsSection />
      <FeaturesSection />
      <OwnerCTASection />
      <Footer />
      <MobileNavBar />
    </main>
  );
};

export default Index;
