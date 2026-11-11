# Lembrei! - Backend API

O deploy usa Docker com Java 21. As credenciais ficam nas variaveis privadas
do painel da hospedagem. O servidor usa PORT
quando definida e mantem 8080 no ambiente local.


API REST do aplicativo de lembretes de remedios e habitos. Sem login e senha:
um UUID persistido pelo app identifica a instalacao e vincula os seus dados.
Funcionalidades: agenda e rotina, registro de adesao, controle de estoque com
previsao de reposicao e relatorio semanal. A proposta se relaciona ao ODS 3,
Saude e Bem-Estar, ao apoiar a organizacao da rotina de cuidados.

## 1. TECNOLOGIAS

Java 21, Spring Boot 4.1.2, Maven Wrapper, Spring MVC, Bean Validation,
Spring JDBC/JdbcTemplate, Oracle JDBC, Lombok e springdoc-openapi 3.1.0.
Foi mantida a separacao Controller -> Service -> Repository, DTOs e tratamento
centralizado de erros. As regras de estoque e adesao usam o Oracle existente.
O projeto nao utiliza Firebase, JPA ou templates HTML.

DTOs convencionais usam Lombok para gerar construtores, getters e setters. JDBC permite SQL explicito,
parametrizado e chamadas aos packages PL/SQL sem duplicar regras do banco.
Swagger permite testar o backend antes de implementar o aplicativo.

## 2. PRE-REQUISITOS E EXECUCAO

- JDK 21 configurado na IDE ou na sessao de terminal; nao precisa ser global.
- Acesso de rede ao Oracle e credenciais do schema correto.
- Objetos de ../../database instalados conforme o README daquela pasta.
  Esta API nao cria tabelas nem executa migracoes ao iniciar.

No IntelliJ, abra o pom.xml como projeto Maven, configure Project SDK,
Maven Importer e Runner com JDK 21. Se o importador apresentar erro Guice
com Maven 3.10, use Bundled Maven 3.9.x na IDE. O Wrapper funciona no terminal.

Na configuracao de execucao de LembreiApiApplication, defina:

```properties
ORACLE_URL=jdbc:oracle:thin:@oracle.fiap.com.br:1521:ORCL
ORACLE_USER=seu_usuario
ORACLE_PASSWORD=sua_senha
```

Para configurar por arquivo, copie .env.example para .env na pasta do
pom.xml somente na primeira execucao e preencha suas credenciais.
O application.properties importa .env como Java Properties, sem
biblioteca adicional. Nao use export nem aspas ao redor dos valores. Barras
invertidas devem ser escapadas como em Java Properties. Variaveis de ambiente
da IDE ou do servidor continuam tendo prioridade sobre o arquivo local.
Execute com o diretorio de trabalho na pasta do pom.xml.
Nunca inclua valores reais de senha no codigo ou no Git. As configuracoes
locais do IntelliJ, logs e arquivos .env estao ignorados. Somente o modelo
.env.example, sem credenciais reais, deve ser versionado.

Execute a classe LembreiApiApplication. Uma consulta SELECT 1 FROM DUAL
imprime "Oracle conectado com sucesso!" se o banco responder. Se falhar,
a API registra uma mensagem e continua; operacoes dependentes retornam 503.

Alternativa PowerShell, com a .env preenchida ou variaveis Oracle na sessao:

```powershell
$env:JAVA_HOME = 'C:\caminho\para\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd spring-boot:run
```

Compilar e testar sem Oracle:

```powershell
.\mvnw.cmd clean verify
```

Executar o artefato compilado, na pasta do pom.xml, com a .env preenchida
ou variaveis Oracle no processo:

```powershell
java -jar target/lembrei-api-0.0.1-SNAPSHOT.jar
```

API publicada: https://lembrei-api.onrender.com/api/v1
Swagger publicado: https://lembrei-api.onrender.com/swagger-ui.html
O plano gratuito pode exigir aguardar o despertar antes da primeira chamada.

Base local: http://localhost:8080/api/v1
Swagger: http://localhost:8080/swagger-ui.html
Contrato OpenAPI JSON: http://localhost:8080/v3/api-docs

## 3. PRIMEIRO TESTE NO SWAGGER

1) Execute POST /api/v1/usuarios/identificar com UUID v4 novo e nome:
   `{"uuidDispositivo":"123e4567-e89b-42d3-a456-426614174000","nome":"Maria"}`
   Retorna 201 se criado ou 200 se existente. Nao altera nome ao identificar
   novamente; use PUT /usuarios/me para isso.
2) Clique em Authorize e informe somente esse UUID. O Swagger envia o
   cabecalho X-Dispositivo-Id nos demais endpoints. Se o formulario mostrar
   esse cabecalho como parametro, preencha com o mesmo UUID.
3) Cadastre um remedio em POST /itens. Exemplo:
   {"tipo":"REMEDIO","nome":"Remedio demonstrativo","dose":"1 comprimido",
    "qtdPorDose":1,"estoqueInicial":10,"diasSemana":"1111111",
    "horarios":["08:00","20:00"]}
   Para HABITO, omita estoqueInicial ou informe null.
4) Consulte GET /rotina. A API gera as ocorrencias ausentes de hoje.
5) Use o idRegistro retornado para POST /registros/{id}/confirmar.
   Sem corpo, usa LOCALTIMESTAMP do Oracle. Somente horarios ja chegados
   podem ser confirmados. A confirmacao atualiza o estoque pela trigger.
6) Consulte estoque, movimentos, alertas e relatorio semanal.

## 4. ENDPOINTS

Todos abaixo usam /api/v1. Exceto identificar, exigem X-Dispositivo-Id UUID.

```text
POST  /usuarios/identificar              Criar ou recuperar por UUID
GET   /usuarios/me                       Consultar usuario do aparelho
PUT   /usuarios/me                       Atualizar nome: {"nome":"Maria"}
POST  /itens                             Cadastrar item e horarios
GET   /itens                             Listar; filtro opcional ativo=true/false
GET   /itens/{id}                        Consultar item
PUT   /itens/{id}                        Editar item e agenda
PATCH /itens/{id}/ativo                  {"ativo":false} ou true
GET   /rotina?data=2026-11-11             Gerar e listar rotina da data
POST  /rotina/gerar                      {"inicio":"2026-11-09","fim":"2026-11-15"}
GET   /registros/{id}                    Consultar ocorrencia
POST  /registros/{id}/confirmar           Corpo opcional: {} ou dtTomada ISO local
POST  /registros/{id}/esquecer            Marcar como esquecida, sem corpo
GET   /itens/{id}/estoque                Saldo, consumo, previsao e alerta
POST  /itens/{id}/reposicoes              {"quantidade":10}
GET   /itens/{id}/movimentos              Historico de estoque
GET   /alertas/estoque                    Remedios ativos com falta em ate 3 dias
GET   /relatorios/semanal?data=2026-11-11  Adesao na semana ISO dessa data
```

Listas de itens, rotina, movimentos e alertas aceitam pagina (padrao 0) e
tamanho (padrao 20, maximo 100). Pagina maxima: 100000. Exemplo de envelope:
```json
{"conteudo":[],"pagina":0,"tamanho":20,"temProxima":false}
```
O relatorio retorna inicioSemana, fimSemana e itens agregados por item.

## 5. REGRAS E CONTRATO PARA O EXPO

- Gere UUID v4 uma unica vez no app e persista entre aberturas. Nao use um
  UUID novo por requisicao. O backend nao recebe um idUsuario arbitrario.
- UUID e um identificador de instalacao, nao prova de identidade nem conta.
  Quem tiver seu valor pode acessar os dados associados. Nao existe login,
  recuperacao de conta, compartilhamento entre aparelhos ou autenticacao forte.
- O nome e obrigatorio no cadastro, mas nao exige uma tela de login; o app
  pode fornecer um nome inicial e permitir edicao depois.
- REMEDIO exige estoqueInicial 0..99999. HABITO exige estoqueInicial ausente.
  qtdPorDose e inteiro 1..999; nome ate 80; dose opcional ate 40 caracteres.
- diasSemana contem sete caracteres 0/1, de segunda a domingo, com pelo
  menos um dia selecionado. De 1 a 24 horarios HH:mm distintos por item.
- PUT /itens exige os campos de cadastro, mas estoqueInicial deve ser omitido
  ou null. O tipo e imutavel. Estoque muda por confirmacao ou reposicao.
- Horarios mantidos preservam seus IDs. Um horario com ocorrencias nao pode
  ser removido, pois o modelo possui exclusao em cascata. Para substituir
  essa agenda, desative o item e crie outro. Horarios sem ocorrencias podem
  ser removidos; novos horarios podem ser incluidos. Alterar dias nao apaga
  ocorrencias geradas. Nome, dose e quantidade exibidos usam o cadastro atual.
- Desativacao impede novas ocorrencias, mas preserva as ja geradas e permite
  registrar confirmacoes dessas ocorrencias. Nao ha exclusao fisica na API.
- Datas ISO: yyyy-MM-dd; instantes locais: yyyy-MM-dd'T'HH:mm:ss, sem Z/offset.
  Fuso adotado: America/Sao_Paulo, no relogio Java e em cada conexao Oracle.
  Intervalo de datas suportado pela API: 1900 a 2100.
- GET /rotina materializa ocorrencias, de forma idempotente. POST /rotina/gerar
  aceita ate 31 dias inclusivos; nenhum endpoint gera um job no banco.
- O relatorio apenas le ocorrencias existentes cujo horario ja chegou.
  Para cobrir uma semana sem abrir a rotina diariamente, gere o intervalo
  antes de consultar. Gerar datas passadas usa a agenda atual, conforme o DB.
  Nao ha reconstrucao de versoes antigas nem agendador automatico nesta API.
- Confirmacao repetida nao repete a baixa. TOMADO e definitivo. ESQUECIDO
  pode ser confirmado posteriormente; nao pode ser marcado antes do horario.
- Reposicao NAO e idempotente: repetir a requisicao soma novamente. O app
  deve impedir toques duplicados e conferir saldo/historico antes de repetir
  apos uma resposta incerta. Confirmacoes podem ser repetidas com seguranca.
- Previsao e a primeira dose futura nao coberta pelo estoque, supondo adesao
  integral e agenda constante. Nao desconta pendencias antigas. Habitos e
  itens inativos nao geram alertas. O prazo de alerta usa os 3 dias do package.
- Agenda visual, acessibilidade das telas e persistencia do UUID sao
  responsabilidades do Expo. A API retorna os horarios para exibicao da rotina.
  O app atual nao agenda notificacoes do sistema nem pede essa permissao.
- CORS para Expo Web: localhost:8081 e localhost:19006. Personalize com
```powershell
CORS_ORIGINS (origens separadas por virgula). Apps nativos nao usam CORS.
```
  Aparelho fisico usa o IP LAN do computador; emulador Android usa 10.0.2.2.

## 6. CLASSES, METODOS E INTEGRACAO ORACLE

LembreiApiApplication: ponto de entrada Spring Boot.
config/OracleConnectionCheck: run executa SELECT 1 FROM DUAL e imprime status.
config/ApiConfig: cria Clock, contrato OpenAPI e configuracao de CORS.
dto/: contratos organizados em sete arquivos por funcionalidade, com
construtores vazios para JSON e getters/setters gerados pelo Lombok. As validacoes
continuam nos atributos das classes de entrada:
- UsuarioDTO: identificacao, nome, resposta do usuario e resultado do cadastro.
- ItemRequestDTO: cadastro/edicao e a classe auxiliar de ativacao.
- ItemResponseDTO: resposta do item e a classe auxiliar de horario.
- RotinaDTO: confirmacao, intervalo de geracao, resultado e ocorrencias.
- EstoqueDTO: reposicao, saldo/previsao e movimentos.
- RelatorioDTO: adesao por item e resultado semanal.
- PaginaDTO: envelope compartilhado das respostas paginadas.
model/TipoItem: enum com REMEDIO e HABITO.
controller/UsuarioController: identificar, me e renomear.
controller/ItemController: listar, consultar, criar, atualizar e ativo.
controller/RotinaController: rotina, gerar, registro, confirmar e esquecer.
controller/EstoqueController: estoque, repor, movimentos e alertas.
controller/RelatorioController: relatorio semanal.
service/UsuarioService: identifica o aparelho, atualiza o nome e resolve o
usuario usado pelos outros services. bloquearUsuario serializa suas mutacoes.
service/ItemService: cadastro, edicao, horarios e ativacao/desativacao.
service/RotinaService: geracao por data ou intervalo, consulta, confirmacao
idempotente e marcacao como esquecida.
service/EstoqueService: saldo, reposicao, movimentos e alertas de remedios.
service/RelatorioService: define a semana ISO e consulta a adesao no Oracle.
repository/UsuarioRepository: SQL de usuario, UUID e bloqueio transacional.
repository/ItemRepository: SQL de itens e horarios, com carga dos horarios em lote.
repository/RotinaRepository: consultas de ocorrencias e chamadas PL/SQL de rotina
 e confirmacao; a baixa continua a cargo da trigger.
repository/EstoqueRepository: reposicao pelo package, previsoes e movimentos.
repository/RelatorioRepository: chamada do package com SYS_REFCURSOR.
util/Validacoes: limites de paginacao e datas; o Clock mantem o fuso e permite
usar um relogio fixo nos testes.
exception/ApiException: erro de negocio com status HTTP.
exception/GlobalExceptionHandler: valida entradas e traduz falhas em JSON seguro.

Operacao Java -> Rotina Oracle:
gerarRotina -> pkg_lembrei_operacao.prc_gerar_rotina
confirmar -> pkg_lembrei_operacao.prc_confirmar_dose
repor -> pkg_lembrei_operacao.prc_repor_estoque
relatorio -> pkg_lembrei_relatorio.prc_relatorio_semanal (SYS_REFCURSOR)
estoque/alertas -> pkg_lembrei_calculo.fun_consumo_semanal,
                  fun_previsao_termino e fun_precisa_reposicao

As triggers validam confirmacao e fazem a baixa auditada. A API nao subtrai
estoque diretamente. Operacoes de escrita usam @Transactional; chamadas
JDBC participam da mesma conexao/transacao do Spring. Um lock no usuario
serializa mutacoes desse aparelho para evitar disputas entre agenda e geracao.
O contador administrativo dinamico do package nao e exposto ao aplicativo.

Erros: 400 para formato/validacao, 404 para recurso ausente nesse aparelho,
409 para conflitos/estoque insuficiente, 422 para regra de negocio,
503 para falha no acesso Oracle e 500 para falha interna inesperada.
Mensagens retornadas nao incluem senha, SQL ou stack trace.

## 7. MEMORIA E EFICIENCIA

- Pool Hikari limitado a 5 conexoes, com minimo ocioso 1 e timeouts de rede,
  consulta e aquisicao configurados.
- Paginas de ate 100 elementos e consulta de uma linha extra para temProxima,
  evitando carregar todos os dados e executar COUNT em cada listagem.
- Horarios buscados em lote por pagina, evitando uma consulta por item.
- try-with-resources fecha CallableStatements e ResultSets; o Spring devolve
  as conexoes ao pool. Cursores do relatorio sao fechados apos materializacao.
- Relatorio agregado no Oracle por item, sem trazer todas as doses para Java.
- DTOs simples por requisicao, sem caches globais de usuarios, cursores ou dados pessoais.
- Estoque e adesao calculados nas rotinas existentes; SQL usa parametros bind.
- Intervalos de geracao limitados e inclusao idempotente evitam duplicatas.

## 8. TESTES

O GitHub Actions compila/testa o backend sem credenciais reais e executa os
testes de integracao em outro job, com Oracle descartavel. Depois das verificacoes
do mobile, Oracle e Docker, o workflow pode solicitar deploy no Render usando
o secret RENDER_DEPLOY_HOOK_URL. Os scripts do banco FIAP nao sao atualizados
automaticamente por esse workflow.

Sem Oracle: .\mvnw.cmd clean verify
Testes de service/controller verificam validacoes, vinculo ao aparelho,
preservacao de horarios, geracao e tratamento de falhas. O teste de contexto
sobe um servidor em porta aleatoria para validar JSON e OpenAPI sem banco.

Para executar tambem OracleIntegrationTest, preencha a .env na pasta do pom.xml
ou configure ORACLE_URL, ORACLE_USER e ORACLE_PASSWORD no processo de teste:

```powershell
$env:LEMBREI_ORACLE_TESTS = 'true'
.\mvnw.cmd clean verify
```

No IntelliJ, use a pasta do pom.xml como diretorio de trabalho dos testes para
ler a .env. Habilite LEMBREI_ORACLE_TESTS=true na configuracao de testes;
variaveis da configuracao Application nao sao herdadas automaticamente.
Os testes Oracle criam UUIDs exclusivos, fazem rollback no fim de cada teste
e verificam depois que os usuarios de teste nao permaneceram. IDs IDENTITY
podem avancar mesmo com rollback. Nao executam DDL nem alteram os scripts.

## 9. ARQUIVOS COMPLEMENTARES

docs/requisicoes.http: exemplos para o HTTP Client do IntelliJ e clientes compativeis.
../../database/README.md: instalacao, regras e testes do Oracle.
../../database/modelo/README.md: MER, DER textual e dicionario de dados.
../../database/modelo/lembrei_modelo_relacional.png: diagrama relacional em imagem.
../../README.md: proposta CitizenTech, publico, ODS e guia integrado.
../../SEGURANCA.txt: credenciais, arquivos privados e publicacao no Git.

## 10. ORGANIZACAO DAS CAMADAS

A estrutura separa controller, service, repository,
dto, model, config e exception. Foi mantido JDBC para Oracle. Cada dominio
possui um controller, um service e um repository, com injecao por construtor.

Exemplo de reposicao:
EstoqueController recebe ReposicaoRequestDTO e o UUID do cabecalho.
EstoqueService resolve o usuario, verifica o remedio e controla a transacao.
EstoqueRepository chama pkg_lembrei_operacao.prc_repor_estoque com parametros.
O controller devolve EstoqueResponseDTO com os mesmos campos consumidos pelo app.

Os DTOs usam classes Java convencionais com @Getter, @Setter, @NoArgsConstructor
e @AllArgsConstructor do Lombok. Os contratos relacionados ficam agrupados em classes public static
por funcionalidade; cada classe auxiliar possui construtor vazio e pode ser
instanciada diretamente. Esse agrupamento reduz os arquivos sem misturar
campos de requisicoes diferentes. ItemRequestDTO, ItemResponseDTO e PaginaDTO
continuam como classes principais independentes.
Os lacos de horarios usam for, listas e conjuntos. O mapeamento JDBC utiliza
RowMapper e CallableStatement, recursos do Spring JDBC e do proprio JDBC.
Nao ha interfaces genericas de servico, heranca de repositorios ou frameworks
adicionais para realizar essas operacoes. Transacoes, validacoes, binds SQL,
isolamento por usuario, fuso horario e fechamento de recursos sao preservados.

O frontend consome endpoints REST com cabecalho UUID e contratos JSON descritos
no Swagger. Os testes incluem a validacao dos horarios e do JSON paginado com
os DTOs, alem dos fluxos reais Oracle com rollback.

## 11. LOMBOK

A dependencia Lombok usa a versao gerenciada pelo Spring Boot no pom.xml,
com escopo provided. O maven-compiler-plugin declara o processador de anotacoes
explicitamente. O Lombok e utilizado na compilacao e excluido do JAR executavel.

@Getter e @Setter geram os metodos de acesso dos DTOs. @NoArgsConstructor
preserva o construtor vazio utilizado pelo Jackson e @AllArgsConstructor gera
o construtor usado no mapeamento JDBC e nos testes. As validacoes continuam
nos campos. Para boolean primitivo, Lombok usa o prefixo is; os nomes das
propriedades JSON continuam ativo, criado, precisaReposicao e temProxima.

@RequiredArgsConstructor gera a injecao por construtor nos controllers, services,
repositories e verificador de conexao, a partir dos campos final. ItemRepository
recebe JdbcTemplate e NamedParameterJdbcTemplate, fornecidos pelo Spring.
ApiException mantem seu construtor especifico para encaminhar a mensagem ao
RuntimeException; seu getter de status e gerado com @Getter.

No IntelliJ, mantenha o plugin Lombok instalado e o processamento de anotacoes
ativo. Depois de alterar o pom.xml, execute Reload All Maven Projects. A
compilacao com mvnw funciona sem depender do plugin da IDE.
