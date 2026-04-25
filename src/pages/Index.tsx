import React from 'react';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import LiveStatsSection from '@/components/LiveStatsSection';
import FeaturedListingsSection from '@/components/FeaturedListingsSection';
import FeaturesSection from '@/components/FeaturesSection';
import OwnerCTASection from '@/components/OwnerCTASection';
import Footer from '@/components/Footer';
import MobileNavBar from '@/components/navigation/MobileNavBar';
import PromoBanner from '@/components/PromoBanner';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

const Index: React.FC = () => {
  return (
    <main className="flex flex-col items-stretch relative min-h-screen pb-20 md:pb-0">
      <PromoBanner />
      <HeroSection />
      <HowItWorksSection />
      <LiveStatsSection />
      <FeaturedListingsSection />
      <FeaturesSection />
      <OwnerCTASection />
      <Footer />
      <MobileNavBar />
      <ChatbotWidget />
    </main>
  );
};

export default Index;
