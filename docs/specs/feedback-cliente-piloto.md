# Feedback do cliente-piloto — transcrições

Falas do dono da oficina piloto (Paiffer Bosch Car Service), gravadas em vídeo por WhatsApp entre 21/08 e 01/09/2026 e transcritas em 09/09/2026. Originaram 15 correções, entregues no mesmo dia.

Preservado porque é insubstituível: é o relato de quem usa o sistema no balcão, com a justificativa de cada mudança na própria voz. Especificação se reescreve; isso não.

Uma observação que vale para o futuro: **a maioria dos "não está salvando" tinha a mesma causa raiz.** O campo existia no formulário e existia no banco, mas era descartado no caminho — o use case simplesmente não o repassava. Quando vários relatos independentes apontam para o mesmo sintoma, vale procurar uma causa comum antes de tratar cada um como bug isolado.

---

## 21/08 — Encontrar peça pelo veículo

> "Eu queria ver com você se teria, né? Se dá pra fazer algo do tipo de colocar assim pela placa do carro, pelo nome do carro, puxar os código, tá vendo, das peças, porque daí o que acontece: o vendedor ou pega o que já está no estoque, né? Ou passa o código para o vendedor passar pra nós qual peça que a gente quer, porque nossa, como eles estão mandando peça errada."

O problema não era buscar peça — era **receber peça errada do fornecedor**. Resolvido com `SearchPartsByVehicle` e o filtro "mostrar só peças deste veículo" na OS, casando marca e modelo com o campo Aplicação.

---

## 23/08 — Código do fabricante como principal

> "Esses código aqui, ó, quem gerou foi o sistema, tá. Eu trabalho mesmo é com esses aqui, os original, que é o que vem marcado na peça. Se der pra tirar isso aqui ou jogar esse como principal é melhor para mim. Esses aqui pra mim é insignificante."

O código gerado pelo sistema não serve para o trabalho dele: o que está estampado na peça é o do fabricante. A listagem passou a mostrar o código original como principal, com o do sistema em cinza abaixo.

---

## 23/08 — Campo Aplicação não aparecia na listagem

> "Essa daqui é a tela de produto lá do Syscar. Fica com o código, né? Que vem na peça. Aí aqui tá filtro de óleo e aqui na aplicação o carro que ele serve. O seu não tá aparecendo essa fileira aqui, ó. Tem o campinho lá, mas é só que não aparece, né? Está lá, tá só aqui assim, ó; teria que ter aqui, ó."

O campo existia no formulário e não aparecia na lista. Adicionada a coluna Aplicação.

---

## 23/08 — Aplicação não salvava

> — "THP Flex, né? Aonde seria a aplicação."
> — "Atualizar, salvando."
> — "Não."
> — "Tá, ele apagou, tá vendo, não tá salvando."

Primeiro dos "não está salvando". A coluna não existia no banco e o use case descartava o valor. Corrigido com a migration que adicionou `originalCode`, `sku`, `application` e `observations` ao item de estoque, e com a persistência desses campos na criação e na edição.

---

## 23/08 — Sem busca no estoque

> "Vem aqui, Pedro, no estoque. Tá vendo, não tem aonde buscar. Que nem agora eu quero mexer no kit do amortecedor. Aí não tem o campinho de busca."

Com catálogo grande, navegar por páginas é inviável. Adicionada busca com espera de 300 ms entre digitação e consulta.

---

## 23/08 — Margem salvava num lugar e não no outro

> — "A gente vai dar entrada, coloquei a margem, né?"
> — "Salvei."
> — "Não, aqui salvou, tá vendo; aqui salvou, só que não tá salvando [no outro lugar]."

A margem era gravada, mas o preço de venda não era recalculado a partir dela. `RegisterStockEntry` passou a recalcular o preço de venda pelo custo médio e pela margem informada.

---

## 23/08 — Prazo de entrega calculado errado

> "Achei legal isso aqui, só que está calculando errado. Serviço, né? Um dia, 60 minutos. Agora a peça deu 5 dias."

A peça estava reservada para aquela própria OS, e o cálculo a tratava como falta de estoque, aplicando o prazo padrão de fornecedor de 5 dias. `CalculateOrderDeadline` passou a somar as reservas da própria OS ao saldo disponível.

---

## 23/08 — Painel vermelho de estoque baixo

> "Agora que eu vi aqui que embaixo tem mais coisa, né? Mas também não está salvando, tá igual lá em cima. Se der pra tirar aquele vermelho e deixar esse, é porque esse aqui já aparece a marca, a quantidade, né? Esse aqui fica melhor do que aquele lá."

O alerta vermelho fixo ocupava espaço e repetia informação que a tabela já mostrava melhor. Substituído por um botão-filtro "Estoque baixo (n)".

---

## 23/08 — Editar orçamento perdia o custo

> — "Aquele orçamento, Pedro, eu abri aqui a editar o orçamento, né? Que eu ia pôr mais uma reclamação aqui."
> — "Aí quando a gente edita, ele volta como era antes, sem o preço do custo e tal."
> — "Aí ele não volta igual era, igual ficou."

O custo da peça não era persistido na OS. Adicionado `costPrice` ao item de peça, com a coluna "R$ Custo" na edição e recálculo pela margem.

---

## 23/08 — Peça não dava baixa no estoque

> "Está 100%? Ó, aqui eu já coloquei em andamento, mas a peça não deu baixa no estoque. Ó, aqui ainda tá 0. Ou ele não fica negativo."

O bug mais grave do conjunto. `ConfirmStockConsumption` filtrava por uma flag `used` que **nunca era gravada em lugar nenhum**: ao concluir a OS, todas as reservas eram estornadas e o saldo voltava ao que era antes. Reescrito para consumir as peças aprovadas, liquidar a reserva existente ou dar baixa real, nunca deixar saldo negativo, e devolver avisos quando algo não fecha.

---

## 23/08 — Subtotal da reclamação no lugar errado

> "Tem como colocar esse subtotal da reclamação aqui na linha da reclamação? Que se deixar assim, do jeito que já é, o nosso povo já se atrapalha. É capaz dele achar que esse é o total, entendeu. Então colocar essa linha aqui."

Argumento de quem conhece a própria equipe: o risco não era estético, era alguém ler o subtotal como total e passar o valor errado ao cliente. O subtotal foi movido para o cabeçalho da reclamação e passou a contar apenas itens aprovados.

---

## 01/09 — Excluir serviços em lote

> "Será que tem algum lugar que eu consiga colocar assim para mim poder pesquisar pelo tipo 'luz'? Porque eu vou ter que apagar um aqui que eu fiz a cor errada. Aí eu vou ter que apagar um por um, né? Vem aqui e exclui. Mas se eu conseguir puxar assim, tipo pela descrição, aí eu consigo excluir tudo de uma vez."

Adicionada busca no catálogo de serviços, seleção múltipla e exclusão em lote. A exclusão pula serviços já vinculados a alguma OS e informa o motivo item por item, em vez de falhar sem explicação.
