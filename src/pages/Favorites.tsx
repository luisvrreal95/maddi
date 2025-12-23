import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Billboard } from '@/hooks/useBillboards';
import { ArrowLeft, Heart, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Favorites: React.FC = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteBillboards = async () => {
      if (favorites.length === 0) {
        setBillboards([]);
        setIsLoading(false);
        return;
      }

      const billboardIds = favorites.map(f => f.billboard_id);
      const { data, error } = await supabase
        .from('billboards')
        .select('*')
        .in('id', billboardIds);

      if (!error && data) {
        setBillboards(data);
      }
      setIsLoading(false);
    };

    fetchFavoriteBillboards();
  }, [favorites]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <Link to="/business" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al dashboard</span>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-primary" />
          <h1 className="text-foreground text-3xl font-bold">Mis Favoritos</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-card rounded-xl h-64"></div>
            ))}
          </div>
        ) : billboards.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-foreground text-xl font-semibold mb-2">
              No tienes favoritos guardados
            </h2>
            <p className="text-muted-foreground mb-6">
              Explora espectaculares y guarda tus favoritos para verlos aquí.
            </p>
            <Link to="/search">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Explorar espectaculares
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {billboards.map(billboard => (
              <Card key={billboard.id} className="bg-card border-border overflow-hidden group">
                <Link to={`/billboard/${billboard.id}`}>
                  <div className="relative h-48">
                    {billboard.image_url ? (
                      <img
                        src={billboard.image_url}
                        alt={billboard.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        billboard.is_available 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-destructive/20 text-destructive'
                      }`}>
                        {billboard.is_available ? 'Disponible' : 'Ocupado'}
                      </span>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link to={`/billboard/${billboard.id}`}>
                    <h3 className="text-foreground font-semibold mb-1 group-hover:text-primary transition-colors">
                      {billboard.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground text-sm flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {billboard.city}, {billboard.state}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-primary font-bold">
                      ${billboard.price_per_month.toLocaleString()}/mes
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(billboard.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;
