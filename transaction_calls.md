# CoinFlip Transaction Calls Examples

## 1. Publicar o contrato
```bash
sui client publish . --gas-budget 10000000
```

**Após publicar, pegue o PACKAGE_ID retornado**

## 2. Criar uma moeda SUI para apostar (para teste)
```bash
# Criar uma moeda de 100 MIST (0.0001 SUI)
sui client call \
  --package 0x2 \
  --module coin \
  --function mint_and_transfer \
  --type-args 0x2::sui::SUI \
  --args 100 <YOUR_ADDRESS> \
  --gas-budget 10000000
```

## 3. Criar uma partida (Player 1)
```bash
# Substitua <PACKAGE_ID> pelo ID do seu package
# Substitua <COIN_OBJECT_ID> pelo ID da moeda que você quer apostar
sui client call \
  --package <PACKAGE_ID> \
  --module coinflip \
  --function create_match \
  --args <COIN_OBJECT_ID> 100 true \
  --gas-budget 10000000
```

**Parâmetros:**
- `<COIN_OBJECT_ID>`: ID da moeda SUI para apostar
- `100`: Valor da aposta (em MIST)
- `true`: Escolha do Player 1 (true = cara, false = coroa)

**Após executar, pegue o MATCH_OBJECT_ID do objeto criado**

## 4. Player 2 entra na partida
```bash
# Troque para a conta do Player 2 primeiro
sui client switch --address <PLAYER2_ADDRESS>

# Ou use --signer <PLAYER2_ADDRESS> no comando

sui client call \
  --package <PACKAGE_ID> \
  --module coinflip \
  --function add_another_player \
  --args <COIN_OBJECT_ID_PLAYER2> <MATCH_OBJECT_ID> false \
  --gas-budget 10000000
```

**Parâmetros:**
- `<COIN_OBJECT_ID_PLAYER2>`: Moeda SUI do Player 2 (mesmo valor da aposta)
- `<MATCH_OBJECT_ID>`: ID da partida criada pelo Player 1
- `false`: Escolha do Player 2 (true = cara, false = coroa)

## 5. Definir o resultado da moeda (pode ser qualquer endereço autorizado)
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module coinflip \
  --function set_winner \
  --args <MATCH_OBJECT_ID> true \
  --gas-budget 10000000
```

**Parâmetros:**
- `<MATCH_OBJECT_ID>`: ID da partida
- `true`: Resultado da moeda (true = cara, false = coroa)

## 6. Pagar o vencedor
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module coinflip \
  --function pay_winner \
  --args <MATCH_OBJECT_ID> \
  --gas-budget 10000000
```

**Parâmetros:**
- `<MATCH_OBJECT_ID>`: ID da partida

## Exemplo Completo com IDs fictícios

```bash
# 1. Publicar
sui client publish . --gas-budget 10000000
# Resultado: PACKAGE_ID = 0x123abc...

# 2. Player 1 cria partida
sui client call \
  --package 0x123abc... \
  --module coinflip \
  --function create_match \
  --args 0x456def... 100 true \
  --gas-budget 10000000
# Resultado: MATCH_ID = 0x789ghi...

# 3. Player 2 entra na partida
sui client call \
  --package 0x123abc... \
  --module coinflip \
  --function add_another_player \
  --args 0x987zyx... 0x789ghi... false \
  --gas-budget 10000000 \
  --signer <PLAYER2_ADDRESS>

# 4. Definir resultado
sui client call \
  --package 0x123abc... \
  --module coinflip \
  --function set_winner \
  --args 0x789ghi... true \
  --gas-budget 10000000

# 5. Pagar vencedor
sui client call \
  --package 0x123abc... \
  --module coinflip \
  --function pay_winner \
  --args 0x789ghi... \
  --gas-budget 10000000
```

## Como obter IDs de objetos

```bash
# Ver objetos de uma conta
sui client objects --owner <ADDRESS>

# Ver detalhes de um objeto específico
sui client object <OBJECT_ID>

# Ver o endereço ativo atual
sui client active-address

# Listar todas as contas
sui client addresses
```

## Executar Testes

```bash
# Executar todos os testes
sui move test

# Executar teste específico
sui move test test_complete_game_flow
```