import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Layout, Trash2, Eye, Download, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Header from '@/components/Header';

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

const BILLBOARD_SIZES = [
  { value: 'spectacular', label: 'Espectacular (14x7m)', width: 1400, height: 700 },
  { value: 'unipole', label: 'Unipolo (12x4m)', width: 1200, height: 400 },
  { value: 'mural', label: 'Mural (8x4m)', width: 800, height: 400 },
  { value: 'pantalla', label: 'Pantalla Digital (16:9)', width: 1920, height: 1080 },
  { value: 'custom', label: 'Personalizado', width: 0, height: 0 },
];

const DesignTemplates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<DesignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DesignTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    image_url: '',
    category: 'general',
    width_px: 1920,
    height_px: 1080,
    is_public: false,
    size_preset: 'pantalla',
  });

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const { data: userTemplates, error: userError } = await supabase
        .from('design_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setTemplates(userTemplates || []);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no debe superar 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `templates/${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('billboard-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('billboard-images')
        .getPublicUrl(data.path);

      setImagePreview(urlData.publicUrl);
      setNewTemplate(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Error al subir imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setNewTemplate(prev => ({ ...prev, image_url: '' }));
  };

  const handleSizePresetChange = (preset: string) => {
    const size = BILLBOARD_SIZES.find(s => s.value === preset);
    if (size && preset !== 'custom') {
      setNewTemplate(prev => ({
        ...prev,
        size_preset: preset,
        width_px: size.width,
        height_px: size.height,
      }));
    } else {
      setNewTemplate(prev => ({ ...prev, size_preset: preset }));
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
          name: newTemplate.name,
          description: newTemplate.description,
          image_url: newTemplate.image_url,
          category: newTemplate.category,
          width_px: newTemplate.width_px,
          height_px: newTemplate.height_px,
          is_public: newTemplate.is_public,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Plantilla creada');
      setDialogOpen(false);
      setImagePreview(null);
      setNewTemplate({
        name: '',
        description: '',
        image_url: '',
        category: 'general',
        width_px: 1920,
        height_px: 1080,
        is_public: false,
        size_preset: 'pantalla',
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

  const handleUseTemplate = (template: DesignTemplate) => {
    toast.success('Plantilla copiada. Puedes usarla en tu próxima reserva.');
    setPreviewTemplate(null);
  };

  const displayedTemplates = activeTab === 'mine' ? templates : publicTemplates;

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <div className="px-6 py-4">
        <Header />
      </div>

      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* Back link */}
        <Link 
          to="/business" 
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al dashboard</span>
        </Link>

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#9BFF43]/20 flex items-center justify-center">
              <Layout className="w-6 h-6 text-[#9BFF43]" />
            </div>
            <div>
              <h1 className="text-white text-2xl md:text-3xl font-bold">Plantillas de Diseño</h1>
              <p className="text-white/60 text-sm">Crea y administra tus diseños para espectaculares</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#9BFF43] text-black hover:bg-[#8ae639] font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a1a] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Crear Nueva Plantilla</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 mt-4">
                {/* Image upload */}
                <div>
                  <Label className="text-white/80 mb-2 block">Imagen del diseño *</Label>
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/10">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain bg-black"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#9BFF43]/50 transition-colors bg-[#0a0a0a]"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-10 w-10 text-[#9BFF43] animate-spin mb-2" />
                          <p className="text-white/60 text-sm">Subiendo...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-white/40 mb-3" />
                          <p className="text-white/80 text-sm font-medium">Haz clic para subir tu diseño</p>
                          <p className="text-white/40 text-xs mt-1">JPG, PNG, WebP (máx 10MB)</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-white/80">Nombre de la plantilla *</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Promoción verano 2024"
                    className="bg-[#0a0a0a] border-white/10 text-white mt-1"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-white/80">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción de la plantilla..."
                    className="bg-[#0a0a0a] border-white/10 text-white mt-1"
                    rows={2}
                  />
                </div>

                {/* Category and Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Categoría</Label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/10">
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/80">Tamaño</Label>
                    <Select
                      value={newTemplate.size_preset}
                      onValueChange={handleSizePresetChange}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {BILLBOARD_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value} className="text-white hover:bg-white/10">
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom dimensions */}
                {newTemplate.size_preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/80">Ancho (px)</Label>
                      <Input
                        type="number"
                        value={newTemplate.width_px}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, width_px: parseInt(e.target.value) || 0 }))}
                        className="bg-[#0a0a0a] border-white/10 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white/80">Alto (px)</Label>
                      <Input
                        type="number"
                        value={newTemplate.height_px}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, height_px: parseInt(e.target.value) || 0 }))}
                        className="bg-[#0a0a0a] border-white/10 text-white mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Public toggle */}
                <div className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-white/10">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={newTemplate.is_public}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-[#0a0a0a] text-[#9BFF43] focus:ring-[#9BFF43]"
                  />
                  <div>
                    <Label htmlFor="is_public" className="text-white text-sm cursor-pointer">Hacer pública</Label>
                    <p className="text-white/40 text-xs">Otros usuarios podrán ver y usar tu plantilla</p>
                  </div>
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full bg-[#9BFF43] text-black hover:bg-[#8ae639] font-medium"
                  disabled={!newTemplate.image_url || !newTemplate.name}
                >
                  Crear Plantilla
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'mine' | 'public')} className="mb-6">
          <TabsList className="bg-[#1a1a1a] border border-white/10">
            <TabsTrigger 
              value="mine" 
              className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-black"
            >
              Mis Plantillas ({templates.length})
            </TabsTrigger>
            <TabsTrigger 
              value="public"
              className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-black"
            >
              Plantillas Públicas ({publicTemplates.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Templates grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-xl h-64"></div>
            ))}
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
              <Layout className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">
              {activeTab === 'mine' ? 'No tienes plantillas' : 'No hay plantillas públicas'}
            </h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              {activeTab === 'mine' 
                ? 'Crea tu primera plantilla para tener tus diseños listos para tus campañas publicitarias.'
                : 'Aún no hay plantillas compartidas por otros usuarios.'}
            </p>
            {activeTab === 'mine' && (
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-[#9BFF43] text-black hover:bg-[#8ae639]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear mi primera plantilla
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedTemplates.map(template => (
              <Card key={template.id} className="bg-[#1a1a1a] border-white/10 overflow-hidden group">
                <div className="relative aspect-video">
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white"
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
                    <span className="bg-[#9BFF43]/20 text-[#9BFF43] px-2 py-1 rounded text-xs font-medium">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-1 truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-white/60 text-sm line-clamp-2 mb-2">
                      {template.description}
                    </p>
                  )}
                  <p className="text-white/40 text-xs">
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
        <DialogContent className="max-w-4xl bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-black rounded-lg overflow-hidden">
                <img
                  src={previewTemplate.image_url}
                  alt={previewTemplate.name}
                  className="w-full max-h-[60vh] object-contain"
                />
              </div>
              {previewTemplate.description && (
                <p className="text-white/60">{previewTemplate.description}</p>
              )}
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <span className="bg-[#9BFF43]/20 text-[#9BFF43] px-2 py-1 rounded text-xs">
                  {CATEGORIES.find(c => c.value === previewTemplate.category)?.label}
                </span>
                <span>{previewTemplate.width_px} x {previewTemplate.height_px}px</span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => window.open(previewTemplate.image_url, '_blank')}
                  className="bg-[#9BFF43] text-black hover:bg-[#8ae639]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
                <Button
                  onClick={() => handleUseTemplate(previewTemplate)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Usar plantilla
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
