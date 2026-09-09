# Histórico

Registro condensado do que foi construído, em ordem cronológica inversa. Substitui as ~2.500 linhas de log de sessão do antigo `CONTEXTO-PROJETO.md`. Para o estado atual do sistema, use os outros documentos — este conta apenas como chegamos aqui.

O histórico detalhado de cada alteração está no git. Este arquivo registra o que mudou de rumo e por quê.

## 09/09/2026 — Endurecimento para produção

Dia dedicado a sair de "está no ar" para "operável com cliente real".

**Feedback do cliente-piloto (15 itens).** Levantados de vídeos gravados pelo dono da oficina. A maioria dos "não está salvando" tinha a mesma causa: o campo existia no formulário e no banco, mas era descartado no use case. Corrigidos campos de catálogo do estoque (código original, SKU, aplicação, observações), custo da peça na OS, margem recalculando preço de venda na entrada, busca no estoque e no catálogo de serviços, exclusão em lote de serviços, subtotal por reclamação contando só aprovados, sugestão de peças compatíveis com o veículo e lembrete de óleo por veículo.

**Dois bugs graves de estoque.** `ConfirmStockConsumption` filtrava por uma flag `used` que nunca era gravada em lugar nenhum: ao concluir a OS, **todas as reservas eram estornadas e o saldo voltava**. E o cálculo de prazo tratava peça reservada para a própria OS como falta de estoque, aplicando prazo de fornecedor sem necessidade.

**Rotas públicas protegidas.** Rate limit com contagem no Postgres (contador em memória não funciona em serverless) e captcha Turnstile. A cota de tentativa foi separada da de sucesso depois que erros de formulário passaram a bloquear o IP pelo dia inteiro.

**Fotos da OS.** O upload gravava em disco, o que **nunca funcionou em produção** — o filesystem da Vercel é somente leitura. Migradas para Cloudinary, com compressão no navegador (sem ela, foto de celular estoura o limite de 4,5 MB de corpo de requisição), validação por bytes reais e isolamento por oficina nos arquivos e nos metadados.

**Monitoramento.** Health check e verificação de disponibilidade a cada 15 minutos via GitHub Actions. O health check foi corrigido no mesmo dia para **não** consultar o banco: a versão inicial teria consumido quase toda a cota mensal de compute do Neon mantendo o banco acordado, e derrubado a produção.

**Incidentes de segurança tratados.** A Secret Key do captcha havia sido colocada numa variável com prefixo `NEXT_PUBLIC_`, sendo publicada no JavaScript do navegador — detectada, rotacionada e documentada. E o repositório público contém uma migration com senha de role em texto claro; o LOGIN desses roles foi revogado.

**Descoberta que virou item de backlog.** O RLS do Postgres está inerte em produção: a conexão usa role com `BYPASSRLS`, então as policies não filtram nada. A documentação anterior afirmava o contrário, o que é pior que não documentar.

**Documentação.** Auditoria das 9 specs e consolidação desta pasta `docs/`, substituindo dois `CONTEXTO-PROJETO.md` idênticos de 3.226 linhas e dois `README.md` idênticos.

## 08/2026 — Kits e ajustes na OS

Módulo de kits de serviço (conjuntos de serviços e peças aplicados de uma vez) e persistência real da flag "aprovado" por item, que antes só existia na interface.

## 07/2026 — Importação de dados

Importação self-service de CSV e XLSX para migrar do sistema anterior, com tratamento de duplicatas, validada contra os dados reais do cliente-piloto. Removeu a dependência de digitação manual na entrada de um cliente novo.

Registrada também a limitação das integrações externas de consulta por placa e por CPF: a infraestrutura existe, mas depende de contratar API paga.

## 06/2026 — Fiscal real, comercialização e infraestrutura

**Emissão fiscal deixou de ser simulada.** Adapter SEFAZ-SP para NF-e 4.0 (SOAP, assinatura XML com certificado A1, cancelamento, carta de correção, inutilização, consulta de status) e adapter DSF para NFS-e de Sorocaba. DANFE em PDF com código de barras.

**Comercialização.** Landing page com planos, multi-tenant por caminho (`/oficina` leva ao login da oficina), interface de assinatura, banner de fim de teste e canal de suporte.

**Infraestrutura.** CI/CD no GitHub Actions, testes E2E com Playwright incluindo caso multi-tenant, PWA, alerta de garantia, exportação de OS em lote e relatório de peças mais usadas.

## 05–06/2026 — PostgreSQL, multi-tenancy e módulos de operação

**Migração de SQLite para PostgreSQL** com Row-Level Security, roles separados e seed de duas oficinas para validar isolamento. Concluída em 04/06. O RLS funcionava no ambiente Docker; a inércia em produção só foi descoberta em 09/09, quando o sistema já rodava no Neon com o role owner.

**Módulos entregues no período:** fotos na OS, onboarding self-service, agendamento online, infraestrutura de cobrança, cronômetro de serviço com trilha de auditoria, gestão de comissões, WhatsApp com assinatura digital, relatórios financeiros e de produtividade, dashboard do mecânico e permissões customizadas por usuário.

**Identidade do produto** definida em 27/05: nome Operare, segmentos-alvo e estratégia de multi-tenancy.

**Auditoria de segurança e financeira** em 25/05, que corrigiu cálculos e fechou brechas — o precedente de que auditar o próprio código encontra coisa séria.

## Origem

Projeto piloto na Paiffer Bosch Car Service, em Sorocaba (SP), substituindo o sistema legado Syscar. O modelo de negócio é assinatura mensal, multi-oficina.

A decisão de produto que orienta o resto: a OS é organizada por **reclamações do cliente**, cada uma com seus serviços, peças e subtotal, porque é assim que o cliente aprova o orçamento. Ver [modulos.md](./modulos.md#o-conceito-central-reclamações).
