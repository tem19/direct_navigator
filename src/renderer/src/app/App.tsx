import { useState } from 'react'
import { AppLayout } from './AppLayout'
import { CampaignsPage } from '@renderer/features/campaigns/CampaignsPage'

/**
 * Корневой компонент. Пока — единственный раздел «Кампании».
 * Роутинг между сущностями (группы/объявления/ключевые слова) добавят
 * последующие команды (/entity, /grid-ui).
 */
export type Section = 'campaigns'

export function App(): JSX.Element {
  const [section] = useState<Section>('campaigns')

  return (
    <AppLayout active={section}>
      {section === 'campaigns' && <CampaignsPage />}
    </AppLayout>
  )
}
