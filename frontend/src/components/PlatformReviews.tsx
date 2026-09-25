'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export interface Review {
  id: string;
  name: string;
  rating: number;
  feedback: string;
  profession?: string;
  createdAt?: string;
  status?: 'approved' | 'pending' | 'rejected';
}

export function PlatformReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    profession: '',
    rating: 5,
    feedback: '',
  });

  useEffect(() => {
    api.get('/public/reviews')
      .then(({ data }) => {
        const approved = Array.isArray(data.data) ? data.data.map((review: {
          id: string;
          name: string;
          rating: number;
          feedback: string;
          profession?: string | null;
          created_at?: string;
        }) => ({
          id: review.id,
          name: review.name,
          rating: review.rating,
          feedback: review.feedback,
          profession: review.profession || 'Verified User',
          createdAt: review.created_at,
          status: 'approved' as const,
        })) : [];
        setReviews(approved);
      })
      .catch(() => {
        setReviews([]);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.feedback.trim()) {
      setErrorMsg('Please complete the required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data } = await api.post('/public/reviews', {
        name: form.name.trim(),
        profession: form.profession.trim() || undefined,
        rating: form.rating,
        feedback: form.feedback.trim(),
      });

      const review = data.data as {
        id: string;
        name: string;
        rating: number;
        feedback: string;
        profession?: string | null;
        created_at?: string;
        status?: 'pending' | 'approved';
      };

      setReviews((current) => [{
        id: review.id,
        name: review.name,
        rating: review.rating,
        feedback: review.feedback,
        profession: review.profession || 'Verified User',
        createdAt: review.created_at,
        status: 'pending',
      }, ...current]);

      setSubmitted(true);
      setForm({ name: '', profession: '', rating: 5, feedback: '' });
    } catch {
      setErrorMsg('We could not submit your review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reviews-section" aria-labelledby="reviews-title">
      <div className="reviews-heading">
        <p className="eyebrow">Customer perspective</p>
        <h2 id="reviews-title">Built to feel calm, clear, and useful.</h2>
        <p>Share how AgentForge fits into your work. Published reviews are moderated before they appear publicly.</p>
      </div>

      {reviews.length > 0 ? (
        <div className="reviews-grid">
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-card-top">
                <span className="review-rating" aria-label={`${review.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index} aria-hidden="true" className={index < review.rating ? 'is-filled' : ''}>★</span>
                  ))}
                </span>
                {review.status === 'pending' ? <span className="review-status">Pending review</span> : null}
              </div>
              <p className="review-feedback">“{review.feedback}”</p>
              <div className="review-author">
                <strong>{review.name}</strong>
                <span>{review.profession}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="reviews-empty">No published reviews yet.</div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="review-form-card"
      >
        {submitted ? (
          <div className="review-success">
            <div className="review-success-mark" aria-hidden="true">✓</div>
            <h3>Thank you.</h3>
            <p>Your review was submitted and is waiting for moderation.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSubmitted(false)}>
              Write another review
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="review-form">
            <div>
              <p className="eyebrow">Share your experience</p>
              <h3>Tell us what you think.</h3>
            </div>

            {errorMsg ? <p className="review-error" role="alert">{errorMsg}</p> : null}

            <div className="review-form-row">
              <label>
                Name
                <input
                  className="input-field"
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label>
                Role or profession
                <input
                  className="input-field"
                  type="text"
                  maxLength={100}
                  value={form.profession}
                  onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  placeholder="Optional"
                />
              </label>
            </div>

            <label>
              Rating
              <div className="review-rating-picker" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={star === form.rating}
                    key={star}
                    onClick={() => setForm({ ...form, rating: star })}
                    className={star <= form.rating ? 'is-selected' : ''}
                    aria-label={`${star} out of 5`}
                  >
                    {star}
                  </button>
                ))}
              </div>
            </label>

            <label>
              Your experience
              <textarea
                className="input-field"
                required
                rows={4}
                maxLength={1000}
                value={form.feedback}
                onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                placeholder="What worked well for you?"
              />
            </label>

            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting' : 'Submit review'}
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
