LEMBREI! - GLOBAL SOLUTION 2 / CITIZENTECH / 2026

Aplicativo React Native + Expo para pessoas idosas organizarem remedios e
habitos, confirmarem cuidados, acompanharem estoque e consultarem progresso.
Contribui para o ODS 3 - Saude e Bem-Estar por apoiar a rotina de cuidados.
Nao prescreve medicamentos nem substitui orientacao profissional.

GUIA COMPLETO
README.md: problema, publico, funcionalidades, arquitetura, tecnologias,
justificativas, execucao, eficiencia, acessibilidade e limites da solucao.
backend-api/lembrei-api/README.md: contratos, classes, metodos e testes da API.
mobile-app/README.md: telas, componentes, funcoes e execucao Expo Go/web.
database/README.md: instalacao Oracle, procedures, packages, triggers e testes.
database/modelo/README.md: MER, DER, relacionamentos e dicionario de dados.
SEGURANCA.txt: protecao de credenciais e cuidados ao publicar o repositorio.

EXECUCAO RESUMIDA (POWERSHELL, PARTINDO DA RAIZ)
Para testar o app com a API publicada no Render, siga os passos 3 e 4.
Os passos 1 e 2 sao para executar seu proprio backend localmente.
1. Instale os objetos Oracle conforme database/README.md. Nao repita o DDL
   se as tabelas ja existem. A carga de exemplo e opcional.
2. Na pasta backend-api/lembrei-api, copie .env.example para .env somente na
   primeira configuracao e preencha ORACLE_URL, ORACLE_USER e ORACLE_PASSWORD.
   Com JDK 21 ativo na sessao, execute .\mvnw.cmd spring-boot:run ou use IntelliJ.
   O diretorio de trabalho deve ser a pasta do pom.xml.
3. Em outro terminal, na pasta mobile-app, copie .env.example para .env na
   primeira configuracao, execute npm ci e depois npm start.
4. Use Expo Go compativel com SDK 57, na mesma rede do computador, ou pressione
   w para abrir a web. API: porta 8080. Expo/web: porta 8081.
5. O modelo mobile aponta para https://lembrei-api.onrender.com/api/v1.
   A API local pode ficar desligada ao usar o Render. Uma mudanca da URL na
   .env atualiza a preferencia salva uma vez. Nunca coloque segredos no mobile.

VALIDACAO
Backend: .\mvnw.cmd clean verify. Para testes Oracle, configure .env e habilite
LEMBREI_ORACLE_TESTS=true no processo. Mobile: npm run typecheck, npm run lint,
npm test. Com Expo ligado: npm run test:e2e. Banco: script 06 com F5.

O app nao exige login; identifica a instalacao por UUID. Agenda e visual,
sem notificacoes do sistema. O backend depende do Oracle e esta hospedado no Render.
Detalhes e limites estao nos READMEs dos componentes.
