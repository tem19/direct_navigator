import { safeStorage } from 'electron'
import type { SettingsRepository } from '@db/repositories/settingsRepository'

const TOKEN_KEY = 'oauth_token_encrypted'

/**
 * Безопасное хранение OAuth-токена Яндекс Директа.
 *
 * Токен шифруется через Electron safeStorage (ключ — из macOS Keychain) и
 * кладётся в БД только в зашифрованном виде. Сырой токен никогда не пишется
 * в логи и не отдаётся в renderer — наружу доступны лишь set/has/clear.
 */
export class TokenStore {
  constructor(private readonly settings: SettingsRepository) {}

  private assertAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Шифрование safeStorage недоступно — токен не может быть сохранён безопасно')
    }
  }

  set(rawToken: string): void {
    const token = rawToken.trim()
    if (!token) throw new Error('Пустой токен')
    this.assertAvailable()
    const encrypted = safeStorage.encryptString(token)
    this.settings.setBlob(TOKEN_KEY, encrypted)
  }

  has(): boolean {
    return this.settings.has(TOKEN_KEY)
  }

  clear(): void {
    this.settings.delete(TOKEN_KEY)
  }

  /**
   * Расшифровать токен для использования внутри main (напр. в direct-api).
   * НИКОГДА не передавать результат в renderer.
   */
  reveal(): string | null {
    const blob = this.settings.getBlob(TOKEN_KEY)
    if (!blob) return null
    this.assertAvailable()
    return safeStorage.decryptString(blob)
  }
}
