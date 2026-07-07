import type { ReactNode } from 'react'
import type { Section } from './App'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  active: Section
  children: ReactNode
}

const NAV: { id: Section; label: string }[] = [{ id: 'campaigns', label: 'Кампании' }]

/**
 * Каркас окна: левая навигация по сущностям + основная область.
 */
export function AppLayout({ active, children }: AppLayoutProps): JSX.Element {
  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>direct_navigator</div>
        <nav>
          {NAV.map((item) => (
            <div
              key={item.id}
              className={item.id === active ? styles.navItemActive : styles.navItem}
            >
              {item.label}
            </div>
          ))}
        </nav>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
