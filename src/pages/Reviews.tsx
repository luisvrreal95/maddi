import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserReviews, Review } from '@/hooks/useReviews';
import { supabase } from '@/integrations/supabase/client';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Star, MapPin, Calendar, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CompletedBooking {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  billboard: {
    title: string;
    city: string;
    image_url: string | null;
  };
  hasReview: boolean;
}

const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: loading } = useAuth();
  const { reviews, isLoading: isLoadingReviews, refetch } = useUserReviews();
  
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  
  // New review state
  const [selectedBooking, setSelectedBooking] = useState<CompletedBooking | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit review state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  
  // Delete state
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && userRole !== 'business') {
      navigate('/');
      return;
    }
  }, [user, userRole, loading, navigate]);

  // Fetch completed bookings that can be reviewed
  useEffect(() => {
    const fetchCompletedBookings = async () => {
      if (!user) return;

      try {
        setIsLoadingBookings(true);
        
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            id,
            billboard_id,
            start_date,
            end_date,
            billboard:billboards(title, city, image_url)
          `)
          .eq('business_id', user.id)
          .eq('status', 'completed');

        if (error) throw error;

        // Get existing reviews for these bookings
        const bookingIds = (bookings || []).map(b => b.id);
        const { data: existingReviews } = await supabase
          .from('reviews')
          .select('booking_id')
          .in('booking_id', bookingIds);

        const reviewedBookingIds = new Set((existingReviews || []).map(r => r.booking_id));

        const transformed = (bookings || []).map(booking => ({
          id: booking.id,
          billboard_id: booking.billboard_id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          billboard: booking.billboard ? {
            title: booking.billboard.title,
            city: booking.billboard.city,
            image_url: booking.billboard.image_url
          } : { title: 'Espectacular', city: '', image_url: null },
          hasReview: reviewedBookingIds.has(booking.id)
        }));

        setCompletedBookings(transformed);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    if (user) {
      fetchCompletedBookings();
    }
  }, [user, reviews]);

  const handleSubmitReview = async () => {
    if (!selectedBooking || !user) return;

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase.from('reviews').insert({
        billboard_id: selectedBooking.billboard_id,
        booking_id: selectedBooking.id,
        business_id: user.id,
        rating: newRating,
        comment: newComment || null
      });

      if (error) throw error;

      toast.success('¡Reseña enviada con éxito!');
      setSelectedBooking(null);
      setNewRating(5);
      setNewComment('');
      refetch();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Error al enviar la reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: editRating,
          comment: editComment || null
        })
        .eq('id', editingReview.id);

      if (error) throw error;

      toast.success('Reseña actualizada');
      setEditingReview(null);
      refetch();
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Error al actualizar la reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReviewId) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deletingReviewId);

      if (error) throw error;

      toast.success('Reseña eliminada');
      setDeletingReviewId(null);
      refetch();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Error al eliminar la reseña');
    }
  };

  const openEditDialog = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const StarRating = ({ rating, onRatingChange, size = 'md' }: { rating: number; onRatingChange?: (r: number) => void; size?: 'sm' | 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange?.(star)}
            disabled={!onRatingChange}
            className={`${onRatingChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`${sizeClass} ${star <= rating ? 'fill-[#9BFF43] text-[#9BFF43]' : 'text-white/30'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading || isLoadingReviews || isLoadingBookings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  const pendingReviews = completedBookings.filter(b => !b.hasReview);

  return (
    <div className="min-h-screen bg-background">
      <BusinessHeader />

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/business" className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-foreground text-3xl font-bold">Mis Reseñas</h1>
        </div>

        {/* Pending Reviews Section */}
        {pendingReviews.length > 0 && (
          <section className="mb-10">
            <h2 className="text-foreground text-xl font-semibold mb-4">
              Reservas pendientes de reseña ({pendingReviews.length})
            </h2>
            <div className="space-y-4">
              {pendingReviews.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {booking.billboard.image_url ? (
                      <img src={booking.billboard.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold truncate">{booking.billboard.title}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedBooking(booking)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Escribir Reseña
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Reviews Section */}
        <section>
          <h2 className="text-foreground text-xl font-semibold mb-4">
            Mis reseñas ({reviews.length})
          </h2>
          
          {reviews.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Star className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No tienes reseñas aún</p>
              <p className="text-muted-foreground text-sm">
                Después de completar una reserva, podrás escribir una reseña del espectacular.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {review.billboard?.image_url ? (
                        <img src={review.billboard.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-foreground font-semibold truncate">
                          {review.billboard?.title || 'Espectacular'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditDialog(review)}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingReviewId(review.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                      {review.comment && (
                        <p className="text-muted-foreground text-sm mt-2">{review.comment}</p>
                      )}
                      <p className="text-muted-foreground text-xs mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* New Review Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Escribir Reseña</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                  {selectedBooking.billboard.image_url ? (
                    <img src={selectedBooking.billboard.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-foreground font-medium">{selectedBooking.billboard.title}</p>
                  <p className="text-muted-foreground text-sm">{selectedBooking.billboard.city}</p>
                </div>
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">Calificación</label>
                <StarRating rating={newRating} onRatingChange={setNewRating} />
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">Comentario (opcional)</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Comparte tu experiencia con este espectacular..."
                  className="bg-secondary border-border text-foreground"
                  rows={4}
                />
              </div>
              
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Reseña'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Review Dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Reseña</DialogTitle>
          </DialogHeader>
          {editingReview && (
            <div className="space-y-4">
              <div>
                <label className="text-foreground text-sm mb-2 block">Calificación</label>
                <StarRating rating={editRating} onRatingChange={setEditRating} />
              </div>
              
              <div>
                <label className="text-foreground text-sm mb-2 block">Comentario (opcional)</label>
                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Comparte tu experiencia con este espectacular..."
                  className="bg-secondary border-border text-foreground"
                  rows={4}
                />
              </div>
              
              <Button
                onClick={handleUpdateReview}
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar reseña?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. La reseña será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewsPage;
