import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Terminos: React.FC = () => (
  <main className="min-h-screen bg-[#121212] flex flex-col">
    <Header />
    <section className="flex-1 max-w-4xl mx-auto px-6 py-16 text-white">
      <h1 className="text-4xl font-bold mb-6">Términos de Uso</h1>
      <p className="text-white/70 leading-relaxed">
        Bienvenido a Maddi. Al utilizar nuestra plataforma aceptas los presentes términos y condiciones que regulan
        el uso del marketplace de espectaculares publicitarios. Maddi conecta a propietarios de espacios con
        anunciantes, facilitando la búsqueda, contratación y gestión de campañas.
      </p>
      <p className="text-white/50 text-sm mt-8">Última actualización: 2026</p>
    </section>
    <Footer />
  </main>
);

export default Terminos;
