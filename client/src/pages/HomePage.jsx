import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import './HomePage.css';

const HomePage = () => {
  const { wheels, loading, loadError } = useAppContext();

  return (
    <section className="home-page">
      <div className="home-page__intro">
        <h2>Choose a wheel to explore</h2>
        <p>
          Every wheel highlights rewards and the people behind them. Pick a wheel to spin it live and
          review its entries.
        </p>
      </div>

      {loading ? (
        <div className="home-page__state">Loading wheels…</div>
      ) : loadError ? (
        <div className="home-page__state home-page__state--error">{loadError}</div>
      ) : wheels.length === 0 ? (
        <div className="home-page__state">No wheels yet. Create one from the admin area.</div>
      ) : (
        <ul className="home-page__list">
          {wheels.map((wheel) => (
            <li key={wheel.id} className="home-page__item">
              <Link to={`/${wheel.slug}`} className="home-page__card">
                <h3>{wheel.name}</h3>
                <p>{wheel.entries.length} entr{wheel.entries.length === 1 ? 'y' : 'ies'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default HomePage;
