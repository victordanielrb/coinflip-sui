# CoinFlip Transaction Calls - EXEMPLO PRÁTICO

## IDs obtidos do deploy:
- **PACKAGE_ID**: `0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9`
- **UPGRADE_CAP**: `0xd62ee1e1521cd612137cd2704d65c57d5d39f03addf4f072eabd80043925e71b`
- **GAS_COIN**: `0xc3fef77290dcf8fc21f43d6a10f10fc5d4384192fd4e70b08ea09419fdf6777f`
- **DEPLOYER_ADDRESS**: `0xa56363e98c2e5566c87b4ab9916a709301875d1e2265171c8b3f63c198cd1ac9`

## 1. Criar uma partida (Player 1)

```bash
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function create_match \
  --args 0xc3fef77290dcf8fc21f43d6a10f10fc5d4384192fd4e70b08ea09419fdf6777f 100 true \
  --gas-budget 10000000
```

**Parâmetros:**
- **Coin**: `0xc3fef77290dcf8fc21f43d6a10f10fc5d4384192fd4e70b08ea09419fdf6777f` (uma moeda SUI)
- **Bet Amount**: `100` (valor da aposta em MIST)
- **Choice**: `true` (Player 1 escolhe "cara")

**Após executar, você receberá um MATCH_OBJECT_ID - substitua nos próximos comandos**

## 2. Player 2 entra na partida

Primeiro, precisa ter uma segunda conta:

```bash
# Criar nova conta (se necessário)
sui client new-address

# Listar endereços disponíveis
sui client addresses

# Trocar para Player 2
sui client switch --address <PLAYER2_ADDRESS>

# Player 2 precisa de gas - transferir de Player 1
sui client transfer-sui \
  --to <PLAYER2_ADDRESS> \
  --amount 1000000 \
  --gas-budget 10000000

# Player 2 entra na partida
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function add_another_player \
  --args <COIN_OBJECT_ID_PLAYER2> <MATCH_OBJECT_ID> false \
  --gas-budget 10000000
```

**Parâmetros:**
- **Coin Player 2**: Um objeto coin do Player 2 com valor 100 MIST
- **Match Object**: ID da partida criada pelo Player 1
- **Choice**: `false` (Player 2 escolhe "coroa")

## 3. Definir o resultado da moeda

```bash
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function set_winner \
  --args <MATCH_OBJECT_ID> true \
  --gas-budget 10000000
```

**Parâmetros:**
- **Match Object**: ID da partida
- **Coin Result**: `true` (resultado "cara" - Player 1 ganha) ou `false` (resultado "coroa" - Player 2 ganha)

## 4. Pagar o vencedor

```bash
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function pay_winner \
  --args <MATCH_OBJECT_ID> \
  --gas-budget 10000000
```

## Comandos úteis para rastreamento

```bash
# Ver objetos de uma conta
sui client objects --owner 0xa56363e98c2e5566c87b4ab9916a709301875d1e2265171c8b3f63c198cd1ac9

# Ver detalhes de um objeto específico
sui client object <OBJECT_ID>

# Ver transação específica
sui client tx-block 68VEwbTdWzEiW14RMCCk2pxmAc62VwHiP91v5ywvuZ2s

# Ver endereço ativo
sui client active-address

# Ver saldo de gas
sui client gas
```

## Fluxo completo de exemplo (substituir IDs conforme necessário)

```bash
# 1. Player 1 cria partida
sui client call --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 --module coinflip --function create_match --args 0xc3fef77290dcf8fc21f43d6a10f10fc5d4384192fd4e70b08ea09419fdf6777f 100 true --gas-budget 10000000

# 2. Criar Player 2
sui client new-address

# 3. Transferir SUI para Player 2
sui client transfer-sui --to <PLAYER2_ADDR> --amount 1000000 --gas-budget 10000000

# 4. Trocar para Player 2
sui client switch --address <PLAYER2_ADDR>

# 5. Player 2 entra na partida
sui client call --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 --module coinflip --function add_another_player --args <COIN_P2> <MATCH_ID> false --gas-budget 10000000

# 6. Definir resultado
sui client call --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 --module coinflip --function set_winner --args <MATCH_ID> true --gas-budget 10000000

# 7. Pagar vencedor
sui client call --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 --module coinflip --function pay_winner --args <MATCH_ID> --gas-budget 10000000
```

## Executar testes

```bash
cd /home/victor/Desktop/sui-first-steps/coinflip/coinflip
sui move test
```

**Resultado esperado**: `Test result: OK. Total tests: 1; passed: 1; failed: 0`