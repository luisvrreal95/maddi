import React from 'react';
import { useReviews } from '@/hooks/useReviews';
import { Star, User } from 'lucide-react';

interface BillboardReviewsSectionProps {
  billboardId: string;
}

const BillboardReviewsSection: React.FC<BillboardReviewsSectionProps> = ({ billboardId }) => {
  const { reviews, stats, isLoading } = useReviews(billboardId);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="animate-pulse">
          <div className="h-6 bg-secondary rounded w-32 mb-4"></div>
          <div className="h-20 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'fill-[#9BFF43] text-[#9BFF43]' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-foreground font-semibold text-lg">Reseñas</h3>
        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-[#9BFF43] text-[#9BFF43]" />
              <span className="text-foreground font-bold">{stats.averageRating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground text-sm">
              ({stats.totalReviews} {stats.totalReviews === 1 ? 'reseña' : 'reseñas'})
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Este espectacular aún no tiene reseñas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-secondary/50 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.rating)}
                    <span className="text-muted-foreground text-xs">
                      {new Date(review.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-foreground text-sm">{review.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillboardReviewsSection;
