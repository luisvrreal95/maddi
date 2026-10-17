import React from 'react';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import LiveStatsSection from '@/components/LiveStatsSection';
import FeaturedListingsSection from '@/components/FeaturedListingsSection';
import FeaturesSection from '@/components/FeaturesSection';
import OwnerCTASection from '@/components/OwnerCTASection';
import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import { useHomeBillboards } from '@/hooks/useHomeBillboards';

const Index: React.FC = () => {
  const home = useHomeBillboards();

  return (
    <main className="flex flex-col items-stretch relative min-h-screen pb-20 md:pb-0 bg-background overflow-x-hidden">
      {/* PromoBanner is rendered inside the hero, above the navbar */}
      <HeroSection available={home.available} />
      {/* Light block: featured + features */}
      <div className="dots-light relative z-10 -mt-12 rounded-t-[44px] pb-[104px] max-sm:rounded-t-[32px]">
        <FeaturedListingsSection home={home} />
        <FeaturesSection />
      </div>
      <HowItWorksSection />
      <LiveStatsSection />
      <OwnerCTASection />
      <Footer />
      <MobileNavBar />
      <ChatbotWidget />
    </main>
  );
};

export default Index;
