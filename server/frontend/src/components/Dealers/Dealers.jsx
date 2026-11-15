import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../api";

export default function Dealers({ session }) {
  const [state, setState] = useState("");
  const all = useApi("/dealers");
  const filtered = useApi(state ? "/dealers/" + encodeURIComponent(state) : null);
  const catalog = all.data?.dealers || [];
  const selected = state ? filtered : all;
  const dealers = selected.data?.dealers || [];
  const states = [...new Set(catalog.map((entry) => entry.state))].sort();

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Dealer directory</h1>
          <p className="muted">Find a dealership by state and see what customers have to say.</p>
        </div>
        <label className="filter">
          Filter by state
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">All states</option>
            {states.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>

      {selected.error ? (
        <p className="notice error" role="alert">{selected.error}</p>
      ) : (
        <section className="directory">
          <p className="table-summary" role="status">
            {selected.loading ? "Loading dealers…" :
              dealers.length + (dealers.length === 1 ? " dealer found" : " dealers found")}
          </p>
          <div className="table-scroll" role="region" aria-label="Dealership results" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Dealer Name</th>
                  <th scope="col">City</th>
                  <th scope="col">Address</th>
                  <th scope="col">ZIP</th>
                  <th scope="col">State</th>
                  {session.authenticated && <th scope="col">Review Dealer</th>}
                </tr>
              </thead>
              <tbody>
                {dealers.map((dealer) => (
                  <tr key={dealer.id}>
                    <td>{dealer.id}</td>
                    <th scope="row"><Link to={"/dealer/" + dealer.id}>{dealer.full_name}</Link></th>
                    <td>{dealer.city}</td>
                    <td>{dealer.address}</td>
                    <td>{dealer.zip}</td>
                    <td>{dealer.state}</td>
                    {session.authenticated && (
                      <td><Link className="btn compact" to={"/postreview/" + dealer.id}>Write review</Link></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!selected.loading && !dealers.length && (
            <p className="table-summary muted">No dealers match this state.</p>
          )}
        </section>
      )}
    </>
  );
}
