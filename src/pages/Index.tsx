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
import { useScrollLift } from '@/hooks/useScrollLift';

const Index: React.FC = () => {
  const home = useHomeBillboards();
  useScrollLift();

  return (
    <main className="flex flex-col items-stretch relative min-h-screen pb-20 md:pb-0 bg-background overflow-x-hidden">
      <HeroSection available={home.available} />
      {/* Light block: featured + features */}
      <div data-lift-panel style={{ transformOrigin: '50% 0' }} className="dots-light relative z-10 -mt-12 rounded-t-[44px] pb-[104px] max-sm:rounded-t-[32px]">
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
