import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, CheckCircle, Calendar, MapPin, Loader2, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ShareDialog from "@/components/share/ShareDialog";

interface OwnerProfile {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_anonymous: boolean;
  is_verified: boolean;
  verification_status: string | null;
}

interface Billboard {
  id: string;
  title: string;
  city: string;
  state: string;
  image_url: string | null;
  price_per_month: number;
  is_available: boolean;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [stats, setStats] = useState({ reviewCount: 0, avgRating: 0, yearsHosting: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData || profileData.is_anonymous) {
          setNotFound(true);
          return;
        }

        setProfile(profileData as OwnerProfile);

        // Calculate years hosting
        const createdDate = new Date(profileData.created_at);
        const yearsHosting = Math.floor(
          (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
        );

        // Fetch owner's billboards
        const { data: billboardsData } = await supabase
          .from("billboards")
          .select("id, title, city, state, image_url, price_per_month, is_available")
          .eq("owner_id", userId)
          .eq("is_available", true);

        setBillboards(billboardsData || []);

        // Get billboard IDs for reviews
        const billboardIds = (billboardsData || []).map((b) => b.id);

        if (billboardIds.length > 0) {
          // Fetch reviews for owner's billboards
          const { data: reviewsData } = await supabase
            .from("reviews")
            .select("id, rating, comment, created_at, business_id")
            .in("billboard_id", billboardIds)
            .order("created_at", { ascending: false })
            .limit(10);

          if (reviewsData && reviewsData.length > 0) {
            // Get reviewer profiles
            const reviewerIds = reviewsData.map((r) => r.business_id);
            const { data: reviewerProfiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url")
              .in("user_id", reviewerIds);

            const reviewsWithProfiles: ReviewData[] = reviewsData.map((review) => {
              const reviewer = reviewerProfiles?.find(
                (p) => p.user_id === review.business_id
              );
              return {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
                reviewer: reviewer
                  ? { full_name: reviewer.full_name, avatar_url: reviewer.avatar_url }
                  : null,
              };
            });

            setReviews(reviewsWithProfiles);

            // Calculate avg rating
            const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / reviewsData.length;

            setStats({
              reviewCount: reviewsData.length,
              avgRating: Math.round(avgRating * 100) / 100,
              yearsHosting: yearsHosting || 1,
            });
          } else {
            setStats({
              reviewCount: 0,
              avgRating: 0,
              yearsHosting: yearsHosting || 1,
            });
          }
        } else {
          setStats({
            reviewCount: 0,
            avgRating: 0,
            yearsHosting: yearsHosting || 1,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Perfil no encontrado</h1>
        <p className="text-muted-foreground">
          Este perfil no existe o es privado.
        </p>
        <Link to="/search" className="text-primary hover:underline">
          Volver a búsqueda
        </Link>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/search"
            className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </Link>
          <ShareDialog
            title={`${profile.full_name} en Maddi`}
            subtitle={profile.company_name || undefined}
            imageUrl={profile.avatar_url}
            shareUrl={`/profile/${userId}`}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* Profile Card + About Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <CheckCircle className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-1">
                {profile.full_name}
              </h1>
              {profile.company_name && (
                <p className="text-muted-foreground flex items-center gap-1 mb-2">
                  <Building2 className="w-4 h-4" />
                  {profile.company_name}
                </p>
              )}
              
              {/* Verified Badge */}
              {profile.is_verified && (
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 mb-2">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Identidad Verificada
                </Badge>
              )}

              {/* Stats Row */}
              <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.reviewCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Reseñas</p>
                </div>
                <div className="text-center border-x border-border">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-foreground">
                      {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-"}
                    </p>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.yearsHosting}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.yearsHosting === 1 ? "Año" : "Años"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Acerca de {profile.full_name}
            </h2>

            <div className="flex flex-wrap gap-3 mb-6">
              {profile.is_verified && (
                <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 border-primary text-primary">
                  <CheckCircle className="w-4 h-4" />
                  Identidad verificada
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                <Calendar className="w-4 h-4" />
                Miembro desde{" "}
                {format(new Date(profile.created_at), "MMMM yyyy", { locale: es })}
              </Badge>
            </div>

            <p className="text-muted-foreground">
              {profile.company_name
                ? `${profile.full_name} representa a ${profile.company_name} y tiene ${billboards.length} espectacular${billboards.length !== 1 ? "es" : ""} disponible${billboards.length !== 1 ? "s" : ""} en Maddi.`
                : `${profile.full_name} tiene ${billboards.length} espectacular${billboards.length !== 1 ? "es" : ""} disponible${billboards.length !== 1 ? "s" : ""} en Maddi.`}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Reseñas de {profile.full_name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {review.reviewer?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {review.reviewer?.full_name || "Usuario"}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span>·</span>
                          <span>
                            {format(new Date(review.created_at), "MMMM yyyy", {
                              locale: es,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {review.comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Billboards Section */}
        {billboards.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-6">
              Espectaculares de {profile.full_name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {billboards.map((billboard) => (
                <Link
                  key={billboard.id}
                  to={`/billboard/${billboard.id}`}
                  className="group"
                >
                  <Card className="bg-card border-border overflow-hidden hover:border-primary transition-colors">
                    <div className="aspect-video relative">
                      {billboard.image_url ? (
                        <img
                          src={billboard.image_url}
                          alt={billboard.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-foreground truncate mb-1">
                        {billboard.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {billboard.city}, {billboard.state}
                      </p>
                      <p className="text-primary font-bold">
                        {formatCurrency(billboard.price_per_month)}/mes
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
