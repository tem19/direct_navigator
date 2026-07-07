import { useEffect, useState } from 'react';
import { useAppStore } from './store';

export function App(): JSX.Element {
  const {
    campaigns,
    hasToken,
    loading,
    syncing,
    status,
    loadCampaigns,
    refreshToken,
    setToken,
    clearToken,
    createTestCampaign,
    pull,
    push,
  } = useAppStore();
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    void refreshToken();
    void loadCampaigns();
  }, [refreshToken, loadCampaigns]);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900 }}>
      <h1>direct_navigator</h1>
      <p style={{ color: '#666' }}>
        Аналог Директ.Коммандера · токен: {hasToken ? '✅ задан' : '⛔ не задан'}
      </p>

      <section style={{ marginBottom: 20 }}>
        <h2>Доступ к Яндекс Директу</h2>
        {hasToken ? (
          <button onClick={() => void clearToken()}>Сбросить токен</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              placeholder="OAuth-токен (sandbox)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              style={{ flex: 1, padding: 6 }}
            />
            <button
              disabled={!tokenInput.trim()}
              onClick={() => {
                void setToken(tokenInput.trim());
                setTokenInput('');
              }}
            >
              Сохранить
            </button>
          </div>
        )}
        <p style={{ color: '#888', fontSize: 13 }}>
          Токен шифруется через Keychain (safeStorage) и не хранится в файлах.
        </p>
      </section>

      <section style={{ marginBottom: 20 }}>
        <h2>Синхронизация</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={!hasToken || syncing} onClick={() => void pull()}>
            ⬇ Pull
          </button>
          <button disabled={!hasToken || syncing} onClick={() => void push()}>
            ⬆ Push
          </button>
          <button disabled={syncing} onClick={() => void createTestCampaign()}>
            + тестовая кампания
          </button>
          {status && <span style={{ color: '#555' }}>{status}</span>}
        </div>
        <p style={{ color: '#888', fontSize: 13 }}>
          «+ тестовая кампания» создаёт кампанию локально (статус <code>new</code>).
          Нажмите <b>Push</b>, чтобы отправить её в песочницу Директа, затем{' '}
          <b>Pull</b> — чтобы подтянуть обратно с присвоенным ID.
        </p>
      </section>

      <section>
        <h2>Кампании ({campaigns.length})</h2>
        {loading ? (
          <p>Загрузка…</p>
        ) : campaigns.length === 0 ? (
          <p style={{ color: '#888' }}>
            Пусто. Задайте токен и нажмите Pull, чтобы подтянуть кампании из
            песочницы Директа. Полноценный грид добавит команда <code>/grid-ui</code>.
          </p>
        ) : (
          <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                <th>Название</th>
                <th>Статус</th>
                <th>Синхр.</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.localId} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
