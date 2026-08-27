# Public Clone Checklist

Este documento é um handoff para a futura criação do clone público. Ele não executa sanitização nem altera o repositório de produção.

## Segurança

- [ ] remover secrets e credenciais
- [ ] revisar `.env` e configurações locais
- [ ] verificar histórico apropriado para publicação

## Conteúdo

- [ ] separar código do conteúdo privado de KALLISTIS
- [ ] revisar imagens e outros assets
- [ ] remover dados pessoais
- [ ] substituir exemplos privados quando necessário

## Portabilidade

- [ ] remover paths absolutos pessoais
- [ ] testar instalação limpa
- [ ] testar projeto de exemplo sanitizado

## Documentação

- [ ] confirmar comandos do README
- [ ] adicionar screenshot sanitizado
- [ ] adicionar URL pública
- [ ] definir licença

## Produto

- [ ] app abre
- [ ] projeto abre
- [ ] edição funciona
- [ ] save/reopen funciona
- [ ] export funciona
