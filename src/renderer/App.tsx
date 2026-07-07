import { useEffect } from 'react';
import { useAppStore } from './store';

export function App(): JSX.Element {
  const { campaigns, hasToken, loading, loadCampaigns, refreshToken } = useAppStore();

  useEffect(() => {
    void refreshToken();
    void loadCampaigns();
  }, [refreshToken, loadCampaigns]);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>direct_navigator</h1>
      <p style={{ color: '#666' }}>
        Аналог Директ.Коммандера · токен:{' '}
        {hasToken ? '✅ задан' : '⛔ не задан'}
      </p>

      <section>
        <h2>Кампании</h2>
        {loading ? (
          <p>Загрузка…</p>
        ) : campaigns.length === 0 ? (
          <p style={{ color: '#888' }}>
            Пока пусто. Выполните синхронизацию (Pull) после подключения токена —
            грид добавит команда <code>/grid-ui</code>, синхронизацию —{' '}
            <code>/sync-engine</code>.
          </p>
        ) : (
          <table cellPadding={6} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Название</th>
                <th align="left">Статус</th>
                <th align="left">Синхр.</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.localId}>
                  <td>{c.name}</td>
                  <td>{c.status}</td>
                  <td>{c.syncStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
