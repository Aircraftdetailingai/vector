"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function DetailerProfilePage() {
  const { id } = useParams();
  const [detailer, setDetailer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [googleReviews, setGoogleReviews] = useState([]);
  const [googleStats, setGoogleStats] = useState(null);
  const [googleUrl, setGoogleUrl] = useState(null);
  const [googleLastSynced, setGoogleLastSynced] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/detailers/${id}/profile`).then(r => r.ok ? r.json() : null),
      fetch(`/api/detailers/${id}/google-reviews`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profileData, googleData]) => {
      if (!profileData) { setNotFound(true); return; }
      setDetailer(profileData.detailer);
      setReviews(profileData.reviews || []);
      setStats(profileData.stats || { total: 0, avgRating: 0 });
      if (googleData) {
        setGoogleReviews(googleData.reviews || []);
        setGoogleStats(googleData.stats || { total: 0, avgRating: 0 });
        setGoogleUrl(googleData.google_business_url);
        setGoogleLastSynced(googleData.last_synced);
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const renderStars = (rating, size = 'w-5 h-5') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`${size} ${s <= Math.round(rating) ? 'text-v-gold' : 'text-white/10'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs}h ago`;
    return 'Just now';
  };

  // Combined rating calculation
  const vectorTotal = stats?.total || 0;
  const vectorAvg = stats?.avgRating || 0;
  const gTotal = googleStats?.total || 0;
  const gAvg = googleStats?.avgRating || 0;
  const combinedTotal = vectorTotal + gTotal;
  const combinedAvg = combinedTotal > 0
    ? parseFloat(((vectorAvg * vectorTotal + gAvg * gTotal) / combinedTotal).toFixed(1))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Detailer Not Found</h1>
          <p className="text-gray-400 mb-6">This profile is not available.</p>
          <a href="/find-a-detailer" className="text-v-gold hover:text-v-gold text-sm">Browse all detailers</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-2 text-white text-xl font-bold">
            <span className="text-2xl">{'\u2708\uFE0F'}</span>
            <span>Vector</span>
          </a>
          <div className="flex items-center space-x-4">
            <a href="/find-a-detailer" className="text-gray-300 hover:text-white text-sm transition-colors">Directory</a>
            <a href="/login" className="text-gray-300 hover:text-white text-sm transition-colors">Sign In</a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Profile Header */}
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 mb-6">
          <div className="flex items-start gap-5">
            {detailer?.logoUrl ? (
              <img src={detailer.logoUrl} alt="" className="w-16 h-16 rounded-lg object-contain bg-white/5 p-1" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-v-gold/10 flex items-center justify-center text-2xl">
                {'\u2708\uFE0F'}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{detailer?.company || detailer?.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                {detailer?.country && <span>{detailer.country}</span>}
                {detailer?.homeAirport && <span>{'\u2708\uFE0F'} {detailer.homeAirport}</span>}
              </div>
              {/* Combined Rating */}
              {combinedTotal > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {renderStars(combinedAvg)}
                  <span className="text-v-gold font-semibold">{combinedAvg}</span>
                  <span className="text-gray-500 text-sm">
                    across {combinedTotal} review{combinedTotal !== 1 ? 's' : ''}
                    {vectorTotal > 0 && gTotal > 0 && ' (Vector + Google)'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5">
            <a
              href={`/quote-request/${id}`}
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-v-gold to-v-gold-dim text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Request a Quote
            </a>
          </div>
        </div>

        {/* Vector Reviews */}
        {reviews.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-white">Customer Reviews</h2>
              {vectorTotal > 0 && (
                <span className="text-xs text-gray-500">({vectorAvg} avg, {vectorTotal} review{vectorTotal !== 1 ? 's' : ''})</span>
              )}
            </div>
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {renderStars(review.rating, 'w-4 h-4')}
                      <span className="text-sm font-medium text-white">
                        {review.customerName ? review.customerName.split(' ')[0] : 'Customer'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo(review.createdAt)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-400 mt-1">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Reviews */}
        {googleReviews.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Google Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <h2 className="text-lg font-semibold text-white">Google Reviews</h2>
                {gTotal > 0 && (
                  <span className="text-xs text-gray-500">({gAvg} avg, {gTotal} review{gTotal !== 1 ? 's' : ''})</span>
                )}
              </div>
              {googleUrl && (
                <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-v-gold hover:text-v-gold-dim transition-colors">
                  See all on Google &rarr;
                </a>
              )}
            </div>
            <div className="space-y-3">
              {googleReviews.slice(0, 5).map(review => (
                <div key={review.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {renderStars(review.rating, 'w-4 h-4')}
                      <span className="text-sm font-medium text-white">{review.reviewer_name || 'Google User'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 opacity-40" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {review.review_date && <span className="text-xs text-gray-500">{review.review_date}</span>}
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-gray-400 mt-1">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
            {googleLastSynced && (
              <p className="text-[10px] text-gray-600 mt-3">
                Updated {timeAgo(googleLastSynced)}
              </p>
            )}
          </div>
        )}

        {reviews.length === 0 && googleReviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No reviews yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
