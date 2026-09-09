/**
 * Contrato de armazenamento de arquivos binários (fotos da OS, anexos).
 *
 * Fica no domínio para que os use cases não dependam de disco, S3 ou de
 * qualquer SDK. As implementações vivem em `infrastructure/storage`.
 *
 * `key` é o caminho lógico do arquivo, sempre relativo e sem barra inicial.
 * Ex.: `t/<tenantId>/orders/<orderId>/<uuid>.jpg`
 */
export interface StoredFile {
  content: Uint8Array;
  contentType: string;
}

export interface IFileStorage {
  save(key: string, content: Uint8Array, contentType: string): Promise<void>;

  /** Retorna null quando o arquivo não existe. */
  get(key: string): Promise<StoredFile | null>;

  /** Não deve lançar erro se o arquivo já não existir. */
  delete(key: string): Promise<void>;
}
