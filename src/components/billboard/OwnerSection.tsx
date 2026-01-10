import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ChevronRight, MapPin, Star } from "lucide-react";

interface OwnerProfile {
  user_id: string;
  full_name: string;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_anonymous: boolean;
  created_at: string;
}

interface OwnerSectionProps {
  ownerId: string;
}

const OwnerSection = ({ ownerId }: OwnerSectionProps) => {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [propertyCount, setPropertyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        // Fetch owner profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name, avatar_url, is_verified, is_anonymous, created_at")
          .eq("user_id", ownerId)
          .single();

        if (error) throw error;
        if (profile?.is_anonymous) {
          setOwner(null);
          return;
        }
        
        setOwner(profile);

        // Fetch count of available billboards
        const { count } = await supabase
          .from("billboards")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", ownerId)
          .eq("is_available", true);

        setPropertyCount(count || 0);
      } catch (error) {
        console.error("Error fetching owner:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (ownerId) {
      fetchOwnerData();
    }
  }, [ownerId]);

  if (isLoading || !owner) return null;

  const joinYear = new Date(owner.created_at).getFullYear();
  const initials = owner.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8">
      <h3 className="text-foreground font-semibold mb-4">Acerca del propietario</h3>
      
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="w-16 h-16">
          <AvatarImage src={owner.avatar_url || undefined} alt={owner.full_name} />
          <AvatarFallback className="bg-primary/20 text-primary text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-lg font-bold text-foreground">{owner.full_name}</h4>
            {owner.is_verified && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
                <BadgeCheck className="w-3 h-3" />
                Verificado
              </Badge>
            )}
          </div>
          
          {owner.company_name && (
            <p className="text-muted-foreground text-sm">{owner.company_name}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Miembro desde {joinYear}</span>
            {propertyCount > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {propertyCount} propiedad{propertyCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link to={`/profile/${owner.user_id}`}>
          <Button variant="outline" className="gap-2">
            Ver perfil
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default OwnerSection;
