import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Layout, Trash2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  category: string;
  width_px: number;
  height_px: number;
  is_public: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'retail', label: 'Retail' },
  { value: 'food', label: 'Restaurantes' },
  { value: 'services', label: 'Servicios' },
  { value: 'events', label: 'Eventos' },
  { value: 'real-estate', label: 'Inmobiliario' },
];

const DesignTemplates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<DesignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DesignTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    image_url: '',
    category: 'general',
    width_px: 1920,
    height_px: 1080,
    is_public: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch user's templates
      const { data: userTemplates, error: userError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setTemplates(userTemplates || []);

      // Fetch public templates
      const { data: pubTemplates, error: pubError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (pubError) throw pubError;
      setPublicTemplates(pubTemplates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !newTemplate.name || !newTemplate.image_url) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('design_templates')
        .insert({
          ...newTemplate,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Plantilla creada');
      setDialogOpen(false);
      setNewTemplate({
        name: '',
        description: '',
        image_url: '',
        category: 'general',
        width_px: 1920,
        height_px: 1080,
        is_public: false,
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear plantilla');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('design_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Plantilla eliminada');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar plantilla');
    }
  };

  const displayedTemplates = activeTab === 'mine' ? templates : publicTemplates;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <Link to="/business" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al dashboard</span>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Layout className="w-8 h-8 text-primary" />
            <h1 className="text-foreground text-3xl font-bold">Plantillas de Diseño</h1>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Crear Plantilla</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mi plantilla"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción de la plantilla..."
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">URL de imagen *</Label>
                  <Input
                    id="image_url"
                    value={newTemplate.image_url}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dimensions">Dimensiones</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newTemplate.width_px}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, width_px: parseInt(e.target.value) }))}
                        className="bg-background border-border"
                      />
                      <span className="text-muted-foreground self-center">x</span>
                      <Input
                        type="number"
                        value={newTemplate.height_px}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, height_px: parseInt(e.target.value) }))}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={newTemplate.is_public}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <Label htmlFor="is_public" className="text-sm">Hacer pública</Label>
                </div>
                <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground">
                  Crear Plantilla
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'mine' ? 'default' : 'outline'}
            onClick={() => setActiveTab('mine')}
          >
            Mis Plantillas ({templates.length})
          </Button>
          <Button
            variant={activeTab === 'public' ? 'default' : 'outline'}
            onClick={() => setActiveTab('public')}
          >
            Plantillas Públicas ({publicTemplates.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl h-64"></div>
            ))}
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Layout className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-foreground text-xl font-semibold mb-2">
              {activeTab === 'mine' ? 'No tienes plantillas' : 'No hay plantillas públicas'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'mine' 
                ? 'Crea tu primera plantilla para tus campañas.'
                : 'Aún no hay plantillas compartidas por otros usuarios.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTemplates.map(template => (
              <Card key={template.id} className="bg-card border-border overflow-hidden group">
                <div className="relative h-48">
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(template.image_url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {activeTab === 'mine' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-foreground font-semibold mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                      {template.description}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {template.width_px} x {template.height_px}px
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div>
              <img
                src={previewTemplate.image_url}
                alt={previewTemplate.name}
                className="w-full rounded-lg"
              />
              <div className="mt-4 flex gap-4">
                <Button
                  onClick={() => window.open(previewTemplate.image_url, '_blank')}
                  className="bg-primary text-primary-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignTemplates;
