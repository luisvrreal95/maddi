import React, { useState } from 'react';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nombre demasiado corto').max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().email('Correo inválido').max(255),
  message: z.string().trim().min(10, 'Mensaje demasiado corto').max(2000, 'Máximo 2000 caracteres'),
});

const Contacto: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((iss) => {
        if (iss.path[0]) fieldErrors[String(iss.path[0])] = iss.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase.from('contact_messages') as any).insert(parsed.data);
    setSubmitting(false);

    if (error) {
      toast.error('Error al enviar', { description: 'No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos a hola@maddi.com.mx' });
      return;
    }

    setSent(true);
    setForm({ name: '', email: '', message: '' });
    toast.success('¡Mensaje enviado!', { description: 'Te responderemos pronto.' });
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      <section className="flex-1 max-w-3xl mx-auto px-6 py-16 text-white w-full">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Contacto</h1>
          <p className="text-white/70 text-lg">
            ¿Tienes dudas o quieres saber más sobre Maddi? Escríbenos.
          </p>
          <p className="text-primary text-sm mt-2 font-medium">Respondemos en menos de 24 horas</p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2 bg-card border border-white/10 rounded-2xl p-6 md:p-8">
            {sent ? (
              <div className="flex flex-col items-center text-center py-10">
                <CheckCircle2 className="w-16 h-16 text-primary mb-4" />
                <h2 className="text-2xl font-bold mb-2">¡Mensaje recibido!</h2>
                <p className="text-white/70 mb-6">Te contactaremos en menos de 24 horas.</p>
                <Button
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setSent(false)}
                >
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-white/80 mb-2 block">Nombre</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    className="bg-background border-white/10 text-white"
                    placeholder="Tu nombre"
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="email" className="text-white/80 mb-2 block">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                    className="bg-background border-white/10 text-white"
                    placeholder="tu@correo.com"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="message" className="text-white/80 mb-2 block">Mensaje</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    maxLength={2000}
                    rows={6}
                    className="bg-background border-white/10 text-white resize-none"
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                  />
                  <div className="flex justify-between mt-1">
                    {errors.message ? (
                      <p className="text-red-400 text-xs">{errors.message}</p>
                    ) : <span />}
                    <span className="text-white/40 text-xs">{form.message.length}/2000</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-black hover:bg-[#8AE83C] font-semibold"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Enviar mensaje</>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-card border border-white/10 rounded-2xl p-6">
              <Mail className="w-6 h-6 text-primary mb-3" />
              <p className="text-white/60 text-sm mb-1">Escríbenos directo</p>
              <a
                href="mailto:hola@maddi.com.mx"
                className="text-white font-medium hover:text-primary transition-colors break-all"
              >
                hola@maddi.com.mx
              </a>
            </div>
            <div className="bg-card border border-white/10 rounded-2xl p-6">
              <p className="text-white/60 text-sm mb-1">Privacidad y datos</p>
              <a
                href="mailto:privacidad@maddi.com.mx"
                className="text-white font-medium hover:text-primary transition-colors break-all"
              >
                privacidad@maddi.com.mx
              </a>
            </div>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default Contacto;
