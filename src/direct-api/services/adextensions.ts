import type { DirectApiClient } from '../client';
import { parseBulkResult, type BulkResult } from '../bulk';
import type { UnitsInfo } from '../types/common';
import type {
  AdExtension,
  AdExtensionAddItem,
  AdExtensionFieldName,
  AdExtensionsAddResult,
  AdExtensionsDeleteResult,
  AdExtensionsGetResult,
  AdExtensionsSelectionCriteria,
} from '../types/adextensions';

const SERVICE = 'adextensions';

const DEFAULT_FIELDS: AdExtensionFieldName[] = ['Id', 'Type', 'Status', 'State'];

/**
 * Сервис `adextensions`: уточнения (Callout). Неизменяемы — только
 * get/add/delete.
 */
export class AdExtensionsService {
  constructor(private readonly client: DirectApiClient) {}

  /** Дочитывает все расширения по критериям (авто-пагинация). */
  async getAll(
    criteria: AdExtensionsSelectionCriteria = {},
    fieldNames: AdExtensionFieldName[] = DEFAULT_FIELDS,
  ): Promise<{ extensions: AdExtension[]; units: UnitsInfo | null }> {
    const { items, units } = await this.client.getAll<AdExtensionsGetResult, AdExtension>(
      SERVICE,
      {
        SelectionCriteria: criteria,
        FieldNames: fieldNames,
        CalloutFieldNames: ['CalloutText'],
      },
      (r) => r.AdExtensions,
    );
    return { extensions: items, units };
  }

  async add(extensions: AdExtensionAddItem[]): Promise<BulkResult<AdExtensionAddItem>> {
    const { result } = await this.client.request<AdExtensionsAddResult>(SERVICE, 'add', {
      AdExtensions: extensions,
    });
    return parseBulkResult(result.AddResults, extensions);
  }

  async delete(ids: number[]): Promise<BulkResult<number>> {
    const { result } = await this.client.request<AdExtensionsDeleteResult>(SERVICE, 'delete', {
      SelectionCriteria: { Ids: ids },
    });
    return parseBulkResult(result.DeleteResults, ids);
  }
}
