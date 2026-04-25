import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
    <div className="text-white/70 leading-relaxed space-y-3 text-[15px]">{children}</div>
  </section>
);

const Privacidad: React.FC = () => (
  <main className="min-h-screen bg-background flex flex-col">
    <Header />
    <article className="flex-1 max-w-4xl mx-auto px-6 py-16 text-white w-full">
      <header className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Aviso de Privacidad</h1>
        <p className="text-white/50 text-sm">Vigencia: Enero 2026 · Conforme a la LFPDPPP</p>
      </header>

      <Section title="1. Responsable del tratamiento">
        <p>
          Maddi (en adelante "el Responsable"), con domicilio en Mexicali, Baja California, México, es responsable
          del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP), su Reglamento y demás normatividad aplicable.
        </p>
        <p>Para cualquier asunto relacionado con privacidad puede contactarnos en{' '}
          <a href="mailto:privacidad@maddi.com.mx" className="text-primary hover:underline">privacidad@maddi.com.mx</a>.
        </p>
      </Section>

      <Section title="2. Datos personales recabados">
        <p>Para la prestación de nuestros servicios podemos recabar los siguientes datos:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Identificación:</strong> nombre completo, fotografía, copia de INE, RFC.</li>
          <li><strong className="text-white">Contacto:</strong> correo electrónico, teléfono, dirección.</li>
          <li><strong className="text-white">Patrimoniales:</strong> información bancaria para pagos, comprobantes fiscales.</li>
          <li><strong className="text-white">De navegación:</strong> dirección IP, tipo de dispositivo, ubicación aproximada, comportamiento dentro de la plataforma.</li>
          <li><strong className="text-white">Comerciales:</strong> ubicación e imágenes de espectaculares, historial de campañas y reservas.</li>
        </ul>
        <p>No recabamos datos personales sensibles distintos a los necesarios para verificación de identidad.</p>
      </Section>

      <Section title="3. Finalidades del tratamiento">
        <p><strong className="text-white">Finalidades primarias</strong> (necesarias para el servicio):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Crear y administrar su cuenta de usuario.</li>
          <li>Verificar identidad de propietarios y anunciantes.</li>
          <li>Gestionar reservas, pagos y facturación.</li>
          <li>Comunicar notificaciones operativas (estado de reservas, mensajes).</li>
          <li>Cumplir obligaciones legales, fiscales y de prevención de fraude.</li>
        </ul>
        <p className="mt-3"><strong className="text-white">Finalidades secundarias</strong> (puede oponerse):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Envío de comunicaciones promocionales y newsletters.</li>
          <li>Análisis estadístico y mejora de la plataforma.</li>
        </ul>
      </Section>

      <Section title="4. Transferencia de datos">
        <p>Maddi podrá compartir sus datos personales con:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Procesadores de pago (para liquidación de transacciones).</li>
          <li>Proveedores de infraestructura tecnológica (hosting, correo, analítica).</li>
          <li>Autoridades competentes cuando sea requerido por ley.</li>
          <li>Otros usuarios de la plataforma únicamente cuando exista una reserva o conversación activa entre las partes (nombre y datos de contacto necesarios).</li>
        </ul>
        <p>No vendemos ni comercializamos sus datos personales con terceros para fines de marketing.</p>
      </Section>

      <Section title="5. Derechos ARCO">
        <p>
          Usted tiene derecho a <strong className="text-white">Acceder, Rectificar, Cancelar u Oponerse</strong>{' '}
          al tratamiento de sus datos personales (Derechos ARCO), así como a revocar el consentimiento otorgado.
          Para ejercerlos envíe una solicitud a{' '}
          <a href="mailto:privacidad@maddi.com.mx" className="text-primary hover:underline">privacidad@maddi.com.mx</a>{' '}
          incluyendo:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nombre completo y correo registrado.</li>
          <li>Documento que acredite identidad (INE).</li>
          <li>Descripción clara del derecho que desea ejercer.</li>
        </ul>
        <p>Responderemos su solicitud en un plazo máximo de 20 días hábiles.</p>
      </Section>

      <Section title="6. Uso de cookies">
        <p>
          Utilizamos cookies y tecnologías similares para mantener su sesión activa, recordar preferencias,
          analizar el uso de la plataforma y mejorar la experiencia. Puede deshabilitarlas desde la configuración
          de su navegador, aunque algunas funciones podrían dejar de operar correctamente.
        </p>
      </Section>

      <Section title="7. Medidas de seguridad">
        <p>
          Implementamos medidas administrativas, técnicas y físicas razonables para proteger sus datos contra
          daño, pérdida, alteración, destrucción o uso no autorizado. La información se almacena en
          infraestructura cifrada y el acceso está restringido al personal autorizado.
        </p>
      </Section>

      <Section title="8. Cambios al aviso de privacidad">
        <p>
          Cualquier modificación a este aviso será publicada en{' '}
          <a href="https://maddi.com.mx/privacidad" className="text-primary hover:underline">maddi.com.mx/privacidad</a>{' '}
          y notificada por correo electrónico cuando el cambio sea sustancial.
        </p>
      </Section>

      <p className="text-white/40 text-sm mt-12 pt-6 border-t border-white/10">
        © 2026 Maddi · Contacto privacidad: privacidad@maddi.com.mx
      </p>
    </article>
    <Footer />
  </main>
);

export default Privacidad;
