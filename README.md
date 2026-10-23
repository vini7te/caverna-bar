# Caverna Bar — cardápio e chamado de mesa

Site estático (GitHub Pages) + Firebase (plano gratuito Spark) para os chamados em tempo real.

| Endereço | Para quem | O que faz |
|---|---|---|
| `/` | Qualquer pessoa | Cardápio digital |
| `/?mesa=5` | Cliente na mesa 5 (QR da mesa) | Cardápio + botão **Chamar** (atendente, conta, gelo/copos) |
| `/painel.html` | Equipe (com login) | Fila de chamados + planta do salão ao vivo |

## Arquivos

- `index.html`: cardápio. Itens e preços ficam na lista `cats` dentro do arquivo.
- `chamar.js` / `chamar.css`: barra de chamado que aparece com `?mesa=N`.
- `painel.html` / `painel.js`: painel da equipe.
- `mesas.js`: quantidade e posição das mesas na planta (em centímetros, salão de 720 × 1200).
- `firebase-config.js`: configuração do projeto Firebase.
- `firestore.rules`: regras de segurança do banco.
- `qrcodes/`: um QR por mesa, pronto para imprimir.

## Configurar o Firebase (uma vez, uns 10 minutos)

1. Acesse https://console.firebase.google.com e crie um projeto chamado `caverna-bar` (pode desligar o Google Analytics).
2. **Firestore Database** > Criar banco de dados > modo de produção > local `southamerica-east1 (São Paulo)`.
3. Na aba **Regras** do Firestore, apague o que estiver lá, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
4. **Authentication** > Vamos começar > ative **E-mail/senha**. Na aba **Usuários**, clique em **Adicionar usuário** e crie o login de quem vai usar o painel.
5. Copie o **UID** desse usuário (coluna "UID do usuário").
6. Volte ao **Firestore** > Iniciar coleção > ID da coleção: `equipe` > ID do documento: cole o UID > adicione um campo `nome` com o seu nome > Salvar. Repita para cada pessoa da equipe.
7. **Configurações do projeto** (engrenagem) > Seus apps > ícone `</>` (Web) > apelido `caverna-bar` > Registrar. Copie o bloco `firebaseConfig` e cole em `firebase-config.js`.
8. **Authentication** > Configurações > Domínios autorizados > adicione `vini7te.github.io`.

## Publicar

Repositório público `caverna-bar` no GitHub, com GitHub Pages ligado em `main` / raiz.
Endereço final: https://vini7te.github.io/caverna-bar/

## Mudar mesas

Edite `mesas.js`. Se mudar a quantidade de mesas, gere novos QR codes e ajuste o limite `mesa <= 40` em `firestore.rules` se passar de 40.

## Limites e cuidados

- O plano gratuito do Firestore aguenta 50 mil leituras e 20 mil gravações por dia, muito acima do movimento de um bar.
- Qualquer pessoa com o QR de uma mesa consegue chamar. Se aparecer trote, dá para trocar o endereço dos QRs.
- Só quem está na coleção `equipe` consegue marcar chamados como "a caminho" ou "atendido".
