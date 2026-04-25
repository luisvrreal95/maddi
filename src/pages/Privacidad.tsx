import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Privacidad: React.FC = () => (
  <main className="min-h-screen bg-[#121212] flex flex-col">
    <Header />
    <section className="flex-1 max-w-4xl mx-auto px-6 py-16 text-white">
      <h1 className="text-4xl font-bold mb-6">Aviso de Privacidad</h1>
      <p className="text-white/70 leading-relaxed">
        En Maddi protegemos tus datos personales conforme a la Ley Federal de Protección de Datos Personales en
        Posesión de los Particulares. La información recolectada se utiliza únicamente para operar la plataforma,
        verificar identidades y mejorar la experiencia del usuario.
      </p>
      <p className="text-white/50 text-sm mt-8">Última actualización: 2026</p>
    </section>
    <Footer />
  </main>
);

export default Privacidad;
