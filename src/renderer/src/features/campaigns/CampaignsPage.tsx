import { useEffect } from 'react'
import { useCampaignsStore } from './campaignsStore'
import styles from './CampaignsPage.module.css'

/**
 * Заглушка раздела «Кампании». Полноценный грид (TanStack Table + Virtual,
 * инлайн-правка, дерево, статусы) добавит команда /grid-ui.
 */
export function CampaignsPage(): JSX.Element {
  const { campaigns, loading, error, load } = useCampaignsStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section>
      <header className={styles.header}>
        <h1 className={styles.title}>Кампании</h1>
        <button className={styles.refresh} onClick={() => void load()} disabled={loading}>
          Обновить
        </button>
      </header>

      {error && <p className={styles.error}>Ошибка: {error}</p>}

      {!error && campaigns.length === 0 && !loading && (
        <p className={styles.empty}>
          Пока нет кампаний. Загрузка из Директа появится после настройки синхронизации.
        </p>
      )}

      {campaigns.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Статус</th>
              <th>Синхронизация</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.localId}>
                <td>{c.directId ?? '—'}</td>
                <td>{c.name}</td>
                <td>{c.status}</td>
                <td>{c.syncStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
