import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  averageRating: number;
  totalReviews: number;
  size?: 'sm' | 'md';
}

const RatingBadge: React.FC<RatingBadgeProps> = ({ averageRating, totalReviews, size = 'sm' }) => {
  if (totalReviews === 0) return null;

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-1">
      <Star className={`${iconSize} fill-[#9BFF43] text-[#9BFF43]`} />
      <span className={`text-foreground font-medium ${textSize}`}>
        {averageRating.toFixed(1)}
      </span>
      <span className={`text-muted-foreground ${textSize}`}>
        ({totalReviews})
      </span>
    </div>
  );
};

export default RatingBadge;
