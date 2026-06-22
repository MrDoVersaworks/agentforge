import { motion } from 'framer-motion';

export interface Review {
  id: string;
  name: string;
  rating: number;
  feedback: string;
  profession?: string;
}

export function PlatformReviews({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>
          User <span style={{ color: '#38bdf8' }}>Feedback</span>
        </h2>
        <p style={{ color: '#94a3b8' }}>See what elite engineering teams are saying.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2rem' }}>
        {reviews.map((review, idx) => (
          <motion.div 
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '1rem', 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ color: '#fbbf24', fontSize: '1.25rem', letterSpacing: '4px' }}>
              {'★'.repeat(review.rating)}
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.6 }}>
              "{review.feedback}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                {review.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#fff' }}>{review.name}</div>
                {review.profession && <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{review.profession}</div>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
