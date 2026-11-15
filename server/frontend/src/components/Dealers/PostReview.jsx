import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { request, useApi } from "../../api";

export default function PostReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dealer = useApi("/dealer/" + encodeURIComponent(id));
  const cars = useApi("/get_cars");
  const [make, setMake] = useState("");
  const [purchased, setPurchased] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function postReview(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const review = form.get("review").trim();
    if (!review) {
      setError("Enter your review before posting.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await request("/add_review", {
        data: {
          dealership: Number(id), review, purchase: purchased,
          purchase_date: purchased ? form.get("purchase_date") : null,
          car_make: make, car_model: form.get("car_model"), car_year: Number(form.get("car_year")),
        },
      });
      navigate("/dealer/" + id, { replace: true, state: { reviewPosted: true } });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (dealer.loading || cars.loading) return <p role="status">Loading review form…</p>;
  if (dealer.error || cars.error) {
    return <p className="notice error" role="alert">{dealer.error || cars.error}</p>;
  }

  const modelCatalog = cars.data.CarModels;
  const makes = [...new Set(modelCatalog.map((car) => car.CarMake))].sort();
  const models = [...new Set(modelCatalog
    .filter((car) => car.CarMake === make)
    .map((car) => car.CarModel))].sort();

  return (
    <>
      <Link className="back-link" to={"/dealer/" + id}>← Dealer details</Link>
      <section className="form-card review-form">
        <h1>Write a review</h1>
        <p className="muted">{dealer.data.dealer.full_name}</p>
        <form onSubmit={postReview}>
          <label>
            Your review
            <textarea name="review" required rows={5} maxLength={2000} />
          </label>
          <div className="fields">
            <label>
              Car make
              <select required name="car_make" value={make} onChange={(event) => setMake(event.target.value)}>
                <option value="">Choose a make</option>
                {makes.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label>
              Car model
              <select required name="car_model" key={make} defaultValue="" disabled={!make}>
                <option value="">Choose a model</option>
                {models.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>
          <div className="fields">
            <label>
              Car year
              <input name="car_year" required type="number" min={1886} max={new Date().getFullYear() + 1} />
            </label>
            {purchased && (
              <label>
                Purchase date
                <input name="purchase_date" required type="date" />
              </label>
            )}
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={purchased}
              onChange={(event) => setPurchased(event.target.checked)}
            />
            I purchased this vehicle
          </label>
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Posting…" : "Post review"}</button>
        </form>
      </section>
    </>
  );
}
