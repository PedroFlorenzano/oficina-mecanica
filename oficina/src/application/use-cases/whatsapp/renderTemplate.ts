/**
 * Interpolação pura e testável dos templates de mensagem do WhatsApp.
 *
 * Variáveis suportadas: {cliente} {veiculo} {placa} {os} {oficina} {status} {link}
 * Uma variável ausente em `vars` é substituída por string vazia.
 * O nome da variável é case-insensitive e tolera espaços ({ cliente }).
 */
export interface TemplateVars {
  cliente?: string;
  veiculo?: string;
  placa?: string;
  os?: string;
  oficina?: string;
  status?: string;
  link?: string;
}

export const TEMPLATE_VARIABLE_KEYS: (keyof TemplateVars)[] = [
  "cliente",
  "veiculo",
  "placa",
  "os",
  "oficina",
  "status",
  "link",
];

/**
 * Substitui `{variavel}` pelo valor correspondente em `vars`.
 * Placeholders desconhecidos ou sem valor viram string vazia.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  if (!template) return "";
  return template.replace(/\{\s*([a-zA-Z]+)\s*\}/g, (_match, rawName: string) => {
    const key = rawName.toLowerCase() as keyof TemplateVars;
    const value = vars[key];
    return value != null ? value : "";
  });
}
