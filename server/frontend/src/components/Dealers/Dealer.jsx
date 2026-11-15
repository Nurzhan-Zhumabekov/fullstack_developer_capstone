import { Link, useLocation, useParams } from "react-router-dom";
import { useApi } from "../../api";

export default function Dealer({ session }) {
  const { id } = useParams();
  const location = useLocation();
  const dealer = useApi("/dealer/" + encodeURIComponent(id));
  const reviews = useApi("/reviews/dealer/" + encodeURIComponent(id));

  if (dealer.loading) return <p role="status">Loading dealer…</p>;
  if (dealer.error) return <p className="notice error" role="alert">{dealer.error}</p>;

  const record = dealer.data?.dealer;
  if (!record) return <p className="notice error" role="alert">Dealer not found.</p>;

  return (
    <>
      <Link className="back-link" to="/dealers">← All dealerships</Link>
      <div className="page-heading dealer-heading">
        <div>
          <h1>{record.full_name}</h1>
          <p className="muted">{record.address}, {record.city}, {record.state} {record.zip}</p>
        </div>
        {session.authenticated && (
          <Link className="btn" to={"/postreview/" + id}>Write review</Link>
        )}
      </div>
      {location.state?.reviewPosted && <p className="notice success" role="status">Your review was posted.</p>}
      <section aria-labelledby="reviews-title">
        <h2 id="reviews-title">Customer reviews</h2>
        {reviews.loading && <p role="status">Loading reviews…</p>}
        {reviews.error && <p className="notice error" role="alert">{reviews.error}</p>}
        {reviews.data?.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        <div className="review-grid">
          {reviews.data?.reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-author">
                <strong>{review.name}</strong>
                {review.sentiment && <span className="sentiment">{review.sentiment}</span>}
              </div>
              <p className="review-body">{review.review}</p>
              {[review.car_make, review.car_model, review.car_year].some(Boolean) && (
                <p className="muted review-vehicle">
                  {[review.car_year, review.car_make, review.car_model].filter(Boolean).join(" ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
