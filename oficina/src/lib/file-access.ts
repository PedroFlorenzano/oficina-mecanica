/**
 * Autorização de acesso a arquivos por tenant.
 *
 * As chaves de arquivo seguem o formato `t/<tenantId>/<resto>`, com o tenant no
 * caminho justamente para que a permissão possa ser decidida sem consultar o
 * banco. Isso é uma segunda barreira: as consultas de metadados também filtram
 * por tenant, mas o RLS do Postgres hoje não está ativo em produção, então não
 * se pode depender de uma única camada.
 */

export const TENANT_KEY_PREFIX = "t";

/** Monta a chave de uma foto de OS. */
export function buildOrderPhotoKey(
  tenantId: string,
  orderId: string,
  fileName: string
): string {
  return `${TENANT_KEY_PREFIX}/${tenantId}/orders/${orderId}/${fileName}`;
}

/**
 * True apenas se a chave pertencer comprovadamente ao tenant informado.
 *
 * Recusa por padrão: chave sem o prefixo de tenant, com travessia de diretório
 * ou com tenant divergente não é liberada. Chaves no formato legado (sem
 * `t/<tenantId>/`) deixam de ser servidas de propósito — não existem em
 * produção, porque o upload em disco nunca funcionou lá.
 */
export function isKeyOwnedByTenant(key: string, tenantId: string): boolean {
  if (!key || !tenantId) {
    return false;
  }

  const segments = key.split("/");

  if (segments.some((segment) => segment === ".." || segment === "" || segment === ".")) {
    return false;
  }

  return segments[0] === TENANT_KEY_PREFIX && segments[1] === tenantId && segments.length > 2;
}
