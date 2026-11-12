# CI/CD do Lembrei

O workflow [ci-cd.yml](ci-cd.yml) executa em pushes e pull requests
para `main`, e também pode ser iniciado manualmente pelo GitHub Actions.

As verificações são:

- **Backend:** compila, executa os testes e empacota o JAR com Java 21 e Maven.
- **Mobile:** verifica TypeScript, lint e testes unitários, e exporta o app para Android e web.
- **Banco:** sobe um Oracle temporário, executa os scripts do banco e os testes de integração Java, e remove o contêiner ao final.
- **Docker:** valida a construção da imagem da API após as verificações anteriores passarem.

Com todas as verificações aprovadas, pushes na `main` e execuções manuais nessa
branch solicitam o deploy do commit no Render. Pull requests não disparam deploy.
Essa etapa exige o secret `RENDER_DEPLOY_HOOK_URL` no GitHub; a conclusão do deploy
deve ser acompanhada no painel do Render.

O workflow guarda o JAR, os relatórios de testes do backend e os logs do Oracle
como artefatos por 7 dias. Os resultados de cada execução ficam na aba **Actions**
do repositório.
