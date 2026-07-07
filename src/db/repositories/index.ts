export { BaseSyncRepository, PUSH_STATUSES } from './base';
export { ClientRepository } from './clientRepository';
export { CampaignRepository } from './campaignRepository';
export { AdGroupRepository } from './adGroupRepository';
export { AdRepository } from './adRepository';
export { KeywordRepository } from './keywordRepository';

import type { Database } from 'better-sqlite3';
import { AdGroupRepository } from './adGroupRepository';
import { AdRepository } from './adRepository';
import { CampaignRepository } from './campaignRepository';
import { ClientRepository } from './clientRepository';
import { KeywordRepository } from './keywordRepository';

/** Единая точка доступа ко всем репозиториям над одним подключением. */
export interface Repositories {
  clients: ClientRepository;
  campaigns: CampaignRepository;
  adGroups: AdGroupRepository;
  ads: AdRepository;
  keywords: KeywordRepository;
}

export function createRepositories(db: Database): Repositories {
  return {
    clients: new ClientRepository(db),
    campaigns: new CampaignRepository(db),
    adGroups: new AdGroupRepository(db),
    ads: new AdRepository(db),
    keywords: new KeywordRepository(db),
  };
}
