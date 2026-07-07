import { safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Хранение OAuth-токена Яндекс Директа. Токен шифруется через safeStorage
 * (ключ из macOS Keychain) и кладётся на диск ТОЛЬКО в зашифрованном виде.
 * Сырой токен не логируется и не отдаётся в renderer.
 */
export class TokenStore {
  private readonly file: string;

  constructor(userDataDir: string) {
    this.file = join(userDataDir, 'yandex-token.enc');
  }

  set(token: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Шифрованное хранилище недоступно (Keychain)');
    }
    const encrypted = safeStorage.encryptString(token);
    writeFileSync(this.file, encrypted);
  }

  has(): boolean {
    return existsSync(this.file);
  }

  /** Расшифровать токен для использования клиентом API (только в main). */
  get(): string {
    if (!this.has()) throw new Error('Токен не задан');
    const encrypted = readFileSync(this.file);
    return safeStorage.decryptString(encrypted);
  }

  clear(): void {
    if (this.has()) rmSync(this.file);
  }
}
