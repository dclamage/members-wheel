import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => (
  <section className="not-found">
    <h2>Page not found</h2>
    <p>The page you&apos;re looking for doesn&apos;t exist. Head back to the wheels directory.</p>
    <Link to="/" className="not-found__link">
      Go to home
    </Link>
  </section>
);

export default NotFoundPage;
