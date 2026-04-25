import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail } from 'lucide-react';

const Contacto: React.FC = () => (
  <main className="min-h-screen bg-[#121212] flex flex-col">
    <Header />
    <section className="flex-1 max-w-4xl mx-auto px-6 py-16 text-white">
      <h1 className="text-4xl font-bold mb-6">Contacto</h1>
      <p className="text-white/70 leading-relaxed mb-8">
        ¿Tienes dudas o quieres saber más sobre Maddi? Escríbenos y con gusto te atenderemos.
      </p>
      <a
        href="mailto:hola@maddi.com.mx"
        className="inline-flex items-center gap-3 bg-[#9BFF43] text-[#121212] px-6 py-3 rounded-xl font-bold hover:bg-[#9BFF43]/90 transition-colors"
      >
        <Mail className="w-5 h-5" />
        hola@maddi.com.mx
      </a>
    </section>
    <Footer />
  </main>
);

export default Contacto;
