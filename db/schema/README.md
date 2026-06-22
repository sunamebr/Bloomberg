# db/schema

Schema SQL inicial montado em `/docker-entrypoint-initdb.d` no container MySQL.
Executado apenas na primeira inicialização (volume vazio). Adicione arquivos `.sql` aqui em ordem alfabética.

Migrations incrementais (após a primeira inicialização) ficam em `../migrations/` e rodam via runner em T2.
