# Lembrei! - Aplicativo React Native + Expo


Aplicativo CitizenTech para organizar remedios e habitos, confirmar cuidados,
acompanhar o estoque e visualizar a adesao semanal. A proposta contribui para
o ODS 3: Saude e Bem-Estar, apoiando a organizacao da rotina pessoal.

## 1. TECNOLOGIAS

Expo SDK 57, React Native 0.86, React 19, TypeScript e Expo Router.
O projeto usa a linha 57 do Expo, compativel com o Expo Go que suporta SDK 57.
A versao do pacote expo e a versao do aplicativo Expo Go sao independentes.
O package-lock.json registra as versoes resolvidas para instalacao reproduzivel.

Expo Router fornece as rotas no celular e no navegador. Expo Crypto gera UUID
v4; SecureStore armazena o UUID no celular; AsyncStorage guarda o identificador
da web e as preferencias. Nao sao solicitadas permissoes de notificacao.
React Native Web permite testar as mesmas telas no navegador.

## 2. COMO EXECUTAR

Use Node.js e npm instalados. O ambiente verificado utiliza Node 26.6.0.
O React Native 0.86.3 instalado declara engines.node:
^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0.
Use uma versao compativel; npm ci instala as versoes do package-lock.json.
No Android, use Expo Go compativel com SDK 57. O fluxo iOS tem componentes
especificos, mas nao foi validado neste projeto em aparelho iOS.

A API publicada e https://lembrei-api.onrender.com/api/v1. Nao e necessario
executar o backend localmente para usar esse endereco. O Oracle deve estar
acessivel pelo servico do Render. A primeira requisicao pode demorar apos
inatividade do plano gratuito; aguarde a API iniciar e tente novamente.
Em um PowerShell, partindo da raiz do repositorio:

```powershell
cd mobile-app
Copy-Item .env.example .env
npm ci
npm start
```

Copie o modelo somente na primeira configuracao, sem sobrescrever sua .env.
Para uso diario basta npm start. O terminal mostra o QR Code. Abra com Expo Go no celular.
O computador e o celular devem estar na mesma rede local.

Para abrir tambem no navegador, pressione w no terminal do Expo, ou execute:

```powershell
npm run web
```

A versao web abre em http://localhost:8081. Nao execute dois servidores Expo
simultaneamente na porta 8081. Um unico servidor atende celular e web.
O projeto nao depende de emulador, Android Studio, Firebase ou EAS para esse teste.

O script scripts/start.mjs tenta escolher um IPv4 privado da rede local,
ignorando interfaces com nome VPN/Radmin/WSL, para que o QR Code aponte ao PC.
Se precisar escolher outra interface:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = 'IP_DO_COMPUTADOR'
npm start
```

## 3. ENDERECO DA API

A .env.example aponta para https://lembrei-api.onrender.com/api/v1, tanto
no navegador quanto no Expo Go. Com EXPO_PUBLIC_API_URL vazia, a alternativa
local usa localhost:8080 na web e o host do Expo na porta 8080 no celular.
Nao existe IP pessoal fixo no codigo. Cada pessoa usa seu proprio computador.

Em Ajustes > Conexao, e possivel salvar outro endereco sem alterar codigo:

  http://IP_DO_COMPUTADOR:8080/api/v1

Alternativa: copie .env.example para .env, ajuste EXPO_PUBLIC_API_URL e
reinicie o Expo. Deixe vazia para deteccao automatica. Com tunnel, configure
o endereco acessivel da API separadamente. Essa variavel e publica: nunca coloque senhas Oracle nela.
Quando EXPO_PUBLIC_API_URL muda, o app atualiza o endereco salvo uma unica vez,
inclusive em instalacoes que usavam IP local. Depois disso, Ajustes permite
personalizar o endereco ate a proxima mudanca da configuracao do ambiente.
Use .env para sua configuracao privada; o Git ignora .env e suas variantes,
exceto modelos .env.example. EXPO_PUBLIC_API_URL entra no bundle do aplicativo:
nao e segredo. Nunca coloque senhas ou chaves privadas no app ou em EXPO_PUBLIC_*.
Veja ../SEGURANCA.txt antes de publicar ou compartilhar uma copia do projeto.

No celular, localhost aponta ao proprio celular, nao ao computador.
Com Render, confira a URL HTTPS, a conexao com a internet e se o servico ja
despertou. Somente no modo local, confira API/Expo ligados, IP correto e
acesso de rede as portas 8080 (API) e 8081 (Expo).

O CORS da API ja permite http://localhost:8081. Se abrir a versao web por um
endereco LAN ou outra origem, acrescente essa origem em CORS_ORIGINS na
configuracao do backend. CORS nao e utilizado pelo app nativo.

## 4. FLUXOS DISPONIVEIS

### HOJE

- Calendario semanal e consulta de outras datas.
- Geracao e listagem das ocorrencias pela API, com estados de carregamento,
  vazio, falha e confirmacao.
- Confirmar remedio/habito depois do horario previsto.
- Marcar ocorrencia vencida como esquecida; permite confirmar posteriormente.
- Confirmacao exige uma segunda acao para evitar toques acidentais.

### CUIDADOS

- Listar e buscar remedios/habitos ativos e arquivados.
- Criar um cuidado com nome, dose, quantidade, dias e horarios.
- Horarios escolhidos por seletor nativo: relogio 24h no Android, rodas no iOS
  com confirmar/cancelar e input time do navegador na web. A API recebe HH:mm.
- Editar cadastro mantendo as regras de preservacao de historico do Oracle.
- Arquivar e reativar, sem exclusao fisica.

### ESTOQUE

- Saldo de remedios ativos e alertas de reposicao em ate tres dias.
- Detalhes de consumo semanal, primeira dose prevista sem saldo e movimentos.
- Reposicao validada e confirmada antes de enviar para a API.

### PROGRESSO

- Consulta da semana atual e de semanas anteriores.
- Adesao ponderada pelo total de ocorrencias, confirmadas, pendentes e esquecidas.
- Antes do relatorio, gera ocorrencias da semana ate hoje para incluir cuidados
  nao confirmados. Como no banco existente, a geracao usa a agenda atual e nao
  reconstroi versoes antigas. Considera apenas horarios que ja chegaram.

### AJUSTES

- Nome de exibicao e endereco da API.
- Estado da conexao e informacoes do identificador da instalacao.

## 5. SEM LOGIN

Na primeira abertura, o app gera UUID v4, persiste antes de acessar a API e
chama POST /usuarios/identificar com nome inicial "Voce" (exibido com acento).
Nao ha tela de login nem senha. O nome pode ser personalizado em Ajustes.
Cada requisicao envia o UUID no cabecalho X-Dispositivo-Id.

Celular e navegador tem instalacoes/armazenamentos separados e, portanto,
UUIDs diferentes. Os dados criados manualmente no Swagger com outro UUID nao
aparecem automaticamente. Uma nova instalacao comeca vazia.

O UUID nao e o numero de serie do hardware nem uma prova de identidade.
Nao o compartilhe: quem souber esse valor pode acessar os dados associados.
Nao ha recuperacao de conta ou sincronizacao de identidade entre aparelhos.
Ao limpar o armazenamento do navegador, uma nova identidade sera gerada.
O comportamento do SecureStore apos reinstalacao depende da plataforma.

## 6. AGENDA NO APLICATIVO

Os cuidados e horarios sao consultados na tela Hoje. O aplicativo nao agenda
notificacoes do sistema nem solicita permissao para envia-las.
Ao abrir uma instalacao antiga, tenta cancelar apenas os agendamentos marcados
como pertencentes ao Lembrei!. O pacote expo-notifications e mantido somente
para essa limpeza, sem criar novos alarmes.

## 7. CONTRATO E CONSISTENCIA

src/services/api.ts implementa os endpoints documentados no Swagger da API.
O aplicativo nao inclui credenciais Oracle nem conecta diretamente ao banco.
Os registros da interface sao recebidos da API; nao existe modo demonstracao
com dados ficticios embutidos nas telas.

Datas seguem America/Sao_Paulo. Instantes Oracle sem offset sao interpretados
como UTC-3. A adesao e calculada com soma dos totais, sem media incorreta dos
percentuais individuais. A visualizacao nao inclui horarios futuros no total
do relatorio, conforme o package Oracle.

Reposicoes e cadastros nao sao reenviados automaticamente apos falha de rede.
Em uma resposta incerta, o app orienta conferir os dados antes de repetir.
A interface bloqueia envios em andamento. Confirmacoes repetidas sao tratadas
pela idempotencia do backend; a API e a unica responsavel pela baixa de estoque.

Nao existe fila de gravacao offline. Sem conexao, o app apresenta a falha e
permite tentar novamente; nao exibe confirmacoes que nao foram aceitas pela API.

## 8. ESTRUTURA E RESPONSABILIDADES

src/app/_layout.tsx: navegacao raiz, provedor global e area segura.
src/app/(tabs)/: Hoje, Cuidados, Estoque e Progresso.
src/app/cadastro.tsx: formulario validado de criacao/edicao.
src/app/item/[id].tsx: detalhes, estoque, reposicao, historico e arquivamento.
src/app/ajustes.tsx: nome, conexao e dados da instalacao.
src/components/ui.tsx: botoes, campos, mensagens, modal e estrutura visual.
src/components/ConnectionState.tsx: reconexao e acesso a configuracao do servidor.
src/context/AppContext.tsx: inicializacao da identidade, cliente API, perfil,
preferencias e atualizacao ao voltar ao app.
src/hooks/useResource.ts: busca com cancelamento e descarte de respostas antigas.
src/services/api.ts: cliente HTTP tipado, UUID, timeout e mensagens de falha.
src/services/identity.native.ts: UUID no SecureStore; identity.ts usa armazenamento web.
src/services/legacyReminders.native.ts: cancela agendamentos de versoes antigas.
src/services/legacyReminders.ts: comportamento web sem dependencia nativa.
src/lib/dates.ts: datas, semana ISO e fuso.
src/lib/validation.ts: regras do formulario, inteiros e endereco do servidor.
src/lib/connection.ts: endereco inicial da API sem IP pessoal fixo.
src/types/api.ts: contratos TypeScript correspondentes aos DTOs Java.
src/theme.ts: cores e estilos compartilhados.
assets/lembrei.svg: fonte vetorial do simbolo; PNGs sao exportacoes para o Expo.

## 9. MEMORIA, EFICIENCIA E ACESSIBILIDADE

- FlatList virtualiza as listas da rotina, cuidados, estoque e progresso.
- A API e consumida em paginas de 50, com limite defensivo de 1000 registros
  por consulta agregada; ao exceder, informa o limite em vez de truncar em silencio.
- O detalhe busca apenas uma pagina do historico e exibe os 20 mais recentes.
- AbortController cancela consultas ao trocar a consulta ou desmontar; versoes
  descartam respostas antigas para nao sobrescrever dados de uma nova consulta.
- Timers, assinaturas AppState e listeners de abort sao removidos no cleanup.
- Timeout HTTP limitado; sem polling continuo, caches globais de historicos ou
  fila offline crescente. Preferencias e UUID sao os dados persistidos no app.
- Textos em portugues, botoes amplos, rotulos acessiveis, icones decorativos
  ocultos de leitores de tela e status descritos em texto, alem da cor.
- Fontes respeitam o escalonamento do sistema. Formulario trata teclado e
  areas seguras; web usa a mesma base de componentes.
- FormScroll.native usa KeyboardAwareScrollView com margem acima do teclado,
  dentro de KeyboardProvider, para manter o TextInput focado visivel no Android
  e iOS. O componente e incluido no Expo Go do SDK 57. A web usa ScrollView.

## 10. VERIFICACOES

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo install --check
npm run export:web
npx expo export --platform android --output-dir dist-native
```

Testes no navegador, com o servidor Expo ja ligado em localhost:8081:

```powershell
npm run test:e2e
```

Os testes Playwright usam Microsoft Edge por padrao, em viewport de celular e
desktop. Se Edge nao estiver instalado, ajuste launchOptions.channel em
playwright.config.ts e instale o navegador correspondente do Playwright.
As respostas de API nesses testes sao fixtures restritas a tests/e2e; nao
alteram o banco nem substituem dados na implementacao do aplicativo.

Os testes unitarios verificam datas/fuso, regras, payloads, conexao, paginacao,
cabecalho UUID e ausencia de retry automatico em reposicao.
Os testes de navegador exercitam cadastro, confirmacao, reposicao, relatorio,
identidade persistente, nome, erros, edicao, arquivamento e reativacao.

A exportacao Android verifica o bundle, sem executar um emulador.

## 11. FUNCOES, METODOS E COMPONENTES

AppProvider inicializa o UUID, configura ApiClient e identifica a instalacao.
useApp fornece esse estado para as telas. reconnect refaz a conexao;
saveConnection valida e salva a URL; saveName atualiza o perfil pela API e a
preferencia local; refresh invalida consultas ao incrementar a revisao.
Ao retornar ao primeiro plano, AppState atualiza a revisao; a assinatura e
removida quando o provider desmonta.

ApiClient.request centraliza fetch, cabecalho X-Dispositivo-Id, JSON, timeout
de 35 segundos e traducao de erros. ApiError preserva o status HTTP.
- identificar e renomear: perfil da instalacao, sem autenticacao por senha.
- itens, item, salvarItem e ativar: consulta, cadastro, edicao e arquivamento.
- rotina, gerar, confirmar e esquecer: ocorrencias previstas e seus estados.
- estoque, repor, movimentos e alertas: saldo, reposicoes e previsoes.
- relatorio: consulta semanal.
- all: percorre ate 20 paginas de 50; rejeita agregacao acima desse limite.

getDeviceId gera UUID v4 apenas quando nao existe um salvo e persiste antes
da primeira chamada de identificacao. Uma Promise compartilhada evita gerar
identidades diferentes em chamadas simultaneas. A implementacao native usa
SecureStore; a web usa AsyncStorage.

useResource(loader, enabled) retorna data, loading, error e reload. Cancela a
consulta anterior com AbortController ao desmontar/trocar dependencias e usa
um contador para descartar respostas antigas. Nao persiste dados de negocio.

itemPayload valida o formulario e monta o JSON; nao envia estoqueInicial em
edicoes nem para habitos. positiveInteger valida quantidade inteira e limite.
normalizeApiUrl aceita HTTP/HTTPS e rejeita credenciais, query e fragmentos.
resolveApiUrl prioriza EXPO_PUBLIC_API_URL, depois usa localhost na web ou o
host do Expo no celular. Quando a URL de ambiente muda, AppProvider atualiza a preferencia uma vez;
sem nova mudanca, a preferencia de Ajustes tem prioridade.

today obtem a data em Sao Paulo; addDays desloca datas; monday encontra o inicio
ISO da semana; localInstant interpreta instante local UTC-3; formatDay e
formatInstant formatam exibicao; greeting e weekLabel compoem textos da rotina.

TimeField recebe label, value HH:mm, onChange e disabled. No Android abre o
relogio nativo; no iOS apresenta um modal com rodas e confirmacao; na web usa
input time. Cancelar preserva o valor. FormScroll e KeyboardRoot tratam a area
visivel acima do teclado no celular, com implementacoes proprias para web.
ui.tsx concentra Page, Field, Button, Notice, Badge, Icon e outros componentes
visuais compartilhados. ConnectionState apresenta carregamento, erro e reconexao.
clearLegacyReminders cancela somente agendamentos identificados como lembrei
de instalacoes anteriores. Na web nao faz operacoes nativas nem pede permissoes.

## 12. LIMITES E DOCUMENTACAO GERAL

Nao ha modo offline de negocio nem notificacoes ativas. Confirmacoes e estoque
dependem da API e do Oracle. Android e web nao compartilham identidade.
A previsao presume a agenda atual, sem reconstruir historicos antigos.
Para proposta, publico, ODS, arquitetura e roteiro integrado, veja ../README.md.
Para entidades e relacionamentos, veja ../database/modelo/README.md.
Os detalhes HTTP estao em ../backend-api/lembrei-api/README.md.
