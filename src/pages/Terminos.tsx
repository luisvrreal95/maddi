import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
    <div className="text-white/70 leading-relaxed space-y-3 text-[15px]">{children}</div>
  </section>
);

const Terminos: React.FC = () => (
  <main className="min-h-screen bg-background flex flex-col">
    <Header />
    <article className="flex-1 max-w-4xl mx-auto px-6 py-16 text-white w-full">
      <header className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Términos de Uso</h1>
        <p className="text-white/50 text-sm">Vigencia: Octubre 2026</p>
      </header>

      <Section title="1. Descripción del servicio">
        <p>
          Maddi (en adelante "la Plataforma") es un marketplace digital que conecta a propietarios de espacios
          publicitarios exteriores (espectaculares, vallas, pantallas digitales y demás formatos OOH) con
          anunciantes, agencias y marcas que buscan contratar dichos espacios en la República Mexicana.
        </p>
        <p>
          La Plataforma facilita la búsqueda, comparación, contratación, pago y gestión de campañas, pero no es
          propietaria de los espacios publicitarios listados ni participa directamente en la operación de los
          mismos.
        </p>
      </Section>

      <Section title="2. Condiciones de uso para Propietarios">
        <ul className="list-disc pl-5 space-y-2">
          <li>El Propietario declara ser el dueño legal del espectacular o contar con autorización vigente para comercializarlo.</li>
          <li>La información publicada (ubicación, dimensiones, fotos, precio) debe ser veraz y actualizada.</li>
          <li>El Propietario es responsable del mantenimiento físico, permisos municipales y vigencia regulatoria de su espacio.</li>
          <li>Maddi se reserva el derecho de suspender publicaciones que violen estos términos o leyes aplicables.</li>
        </ul>
      </Section>

      <Section title="3. Condiciones de uso para Anunciantes">
        <ul className="list-disc pl-5 space-y-2">
          <li>El Anunciante se obliga a proporcionar artes publicitarios que cumplan con la normatividad vigente.</li>
          <li>Queda prohibida la publicación de contenido ilegal, difamatorio, pornográfico o que incite al odio.</li>
          <li>El Anunciante es el único responsable del contenido y mensajes de su campaña.</li>
        </ul>
      </Section>

      <Section title="4. Reservas, pagos y cancelaciones">
        <p>
          Las solicitudes de reserva se realizan a través de la Plataforma y requieren aprobación expresa del
          Propietario. Los pagos con tarjeta se procesan mediante Stripe, un procesador de pagos independiente;
          Maddi no almacena los datos de la tarjeta.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">Retención al solicitar:</strong> al enviar la solicitud, Stripe autoriza y retiene en la tarjeta del Anunciante el importe total de la campaña. En ese momento no se realiza el cobro.</li>
          <li><strong className="text-white">Aprobación:</strong> si el Propietario aprueba, se cobra el importe retenido, las fechas quedan bloqueadas y el Anunciante recibe la confirmación.</li>
          <li><strong className="text-white">Liberación del pago al Propietario:</strong> una vez aprobada la campaña, Maddi conserva el importe cobrado y lo transfiere al Propietario cuando éste acredite con fotografías que el anuncio fue instalado y el Anunciante lo confirme, o transcurran 48 horas desde el envío de la evidencia sin que el Anunciante reporte un problema. Si el Anunciante reporta un problema, Maddi retiene el pago mientras revisa el caso y podrá liberarlo al Propietario o reembolsarlo al Anunciante.</li>
          <li><strong className="text-white">Rechazo o falta de respuesta:</strong> si el Propietario rechaza la solicitud, o no responde en un máximo de 7 días, la retención se libera y no se realiza ningún cobro. El plazo en que el banco refleja la liberación depende de la institución emisora.</li>
          <li><strong className="text-white">Cancelación por el Anunciante:</strong> mientras la solicitud esté pendiente, el Anunciante puede cancelarla sin costo y la retención se libera. Una vez aprobada y cobrada la campaña, el cobro no es reembolsable por decisión del Anunciante; cualquier ajuste deberá acordarse con el Propietario.</li>
          <li><strong className="text-white">Cancelación por el Propietario:</strong> si el Propietario cancela una campaña ya aprobada o no puede cumplirla por causas que le sean imputables, se reembolsa al Anunciante el importe total pagado y las fechas se liberan. Deberá notificar con la mayor anticipación posible.</li>
        </ul>
      </Section>

      <Section title="5. Comisiones, impuestos y facturación">
        <p>
          Maddi cobra una comisión equivalente al <strong className="text-primary">15%</strong> sobre el monto
          de cada campaña aprobada. La comisión se descuenta del pago que recibe el Propietario; el Anunciante
          paga el precio publicado por el Propietario, sin cargo adicional por parte de Maddi.
        </p>
        <p>
          El Propietario recibe el monto neto de la comisión a través de su cuenta de cobros en Stripe, y los
          depósitos a su cuenta bancaria están sujetos a los tiempos y condiciones de Stripe. Cada parte es
          responsable de sus propias obligaciones fiscales derivadas de las operaciones realizadas en la
          Plataforma, incluyendo la emisión de los comprobantes fiscales que correspondan.
        </p>
        <p>
          Maddi podrá ofrecer promociones temporales con comisión reducida o nula; dichas promociones se
          comunicarán expresamente y tendrán vigencia limitada.
        </p>
      </Section>

      <Section title="6. Limitación de responsabilidad">
        <p>
          Maddi actúa como intermediario tecnológico. No garantiza resultados publicitarios específicos, niveles
          de tráfico vehicular o impacto comercial de las campañas. Las métricas mostradas (impresiones, aforo,
          POI cercanos) son estimaciones basadas en fuentes de terceros (TomTom, INEGI) y deben tomarse como
          referencia.
        </p>
        <p>
          Maddi no será responsable por daños directos o indirectos derivados de fallas técnicas, interrupciones
          de servicio, vandalismo, fenómenos naturales o actos de terceros que afecten la operación de los
          espectaculares.
        </p>
      </Section>

      <Section title="7. Propiedad intelectual">
        <p>
          Todo el contenido de la Plataforma (marca Maddi, logotipos, diseño, código) es propiedad exclusiva de
          Maddi. Los artes publicitarios subidos por Anunciantes permanecen de su propiedad, otorgando a Maddi
          una licencia no exclusiva para mostrarlos durante la vigencia de la campaña.
        </p>
      </Section>

      <Section title="8. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las
          partes se someten expresamente a la jurisdicción de los tribunales competentes en Mexicali, Baja
          California, renunciando a cualquier otro fuero que pudiera corresponderles.
        </p>
      </Section>

      <Section title="9. Modificaciones">
        <p>
          Maddi podrá modificar estos términos en cualquier momento. Las modificaciones serán notificadas por
          correo electrónico o dentro de la Plataforma con al menos 15 días de anticipación a su entrada en
          vigor.
        </p>
      </Section>

      <p className="text-muted-foreground text-sm mt-12 pt-6 border-t border-white/10">
        © 2026 Maddi · Última actualización: Enero 2026
      </p>
    </article>
    <Footer />
  </main>
);

export default Terminos;
