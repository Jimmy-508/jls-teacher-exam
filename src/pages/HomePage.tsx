import { Link } from 'react-router-dom';
import { APP_DESCRIPTION, APP_FULL_NAME, APP_NAME } from '../config/appInfo';

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="brand-mark">{APP_NAME}</div>
      <div className="home-brand">
        <h1>{APP_NAME}</h1>
        <p className="home-brand__full-name">{APP_FULL_NAME}</p>
        <p>{APP_DESCRIPTION}</p>
      </div>
      <p>從題庫開始練習，累積學習歷程，整理核心概念，逐步建立自己的考前學習節奏。</p>
      <div className="home-actions">
        <Link className="primary-button primary-button--wide" to="/practice">
          開始練習
        </Link>
        <Link className="secondary-button primary-button--wide" to="/knowledge">
          知識總覽
        </Link>
      </div>
    </section>
  );
}
