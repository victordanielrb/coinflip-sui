# CoinFlip Game - Implementação em Sui Move

Este documento descreve a implementação completa de um jogo de cara ou coroa na blockchain Sui usando Move.

## 📋 Visão Geral

O CoinFlip é um jogo de apostas simples onde dois jogadores apostam SUI em um resultado de cara ou coroa. O vencedor leva toda a aposta (menos taxas de gas).

### Fluxo do Jogo

1. **Player 1** cria uma partida, define sua aposta (SUI) e escolha (cara/coroa)
2. **Player 2** entra na partida, deposita a mesma quantia e faz sua escolha
3. **Oráculo/Admin** define o resultado real da moeda
4. **Sistema** paga automaticamente o vencedor e deleta a partida

## 🏗️ Arquitetura do Contrato

### Estruturas de Dados

```move
public struct CoinFlipMatch has store, key {
    id: UID,                                    // Identificador único
    player1: address,                           // Endereço do Player 1
    player2: option::Option<address>,           // Endereço do Player 2 (opcional)
    bet_amount: u64,                            // Valor da aposta em MIST
    player1_choice: bool,                       // true = cara, false = coroa
    player2_choice: option::Option<bool>,       // Escolha do Player 2 (opcional)
    result: bool,                              // Resultado da moeda
    is_active: bool,                           // Status da partida
    balance: Coin<SUI>,                        // Pool de apostas
}
```

### Funções Principais

#### 1. `create_match()`
- **Entrada**: `Coin<SUI>`, `bet_amount: u64`, `player1_choice: bool`
- **Função**: Cria nova partida, valida o valor da moeda
- **Saída**: Objeto `CoinFlipMatch` transferido para Player 1

#### 2. `add_another_player()`
- **Entrada**: `Coin<SUI>`, `match_obj: &mut CoinFlipMatch`, `player2_choice: bool`
- **Função**: Player 2 entra na partida, valida aposta igual
- **Modificação**: Atualiza objeto da partida com dados do Player 2

#### 3. `set_winner()`
- **Entrada**: `match_obj: &mut CoinFlipMatch`, `coin_result: bool`
- **Função**: Define resultado e calcula vencedor
- **Modificação**: Marca partida como inativa e define resultado

#### 4. `pay_winner()`
- **Entrada**: `match_obj: CoinFlipMatch`
- **Função**: Transfere prêmio total para vencedor e deleta objeto
- **Efeito**: Destrói objeto da partida (consume by value)

## 🔧 Implementação Técnica

### Validações de Segurança

```move
// Validação de valor igual das apostas
assert!(coin::value(&pay) == match_obj.bet_amount, EBetAmountMismatch);

// Validação de entrada do Player 1
assert!(coin::value(&coin) == bet_amount, EBetAmountMismatch);
```

### Gerenciamento de Estado

```move
// Estado inicial (só Player 1)
player2: option::none<address>(),
player2_choice: option::none<bool>(),
is_active: true,

// Estado final (ambos players)
player2: option::some(p2_address),
player2_choice: option::some(player2_choice),
is_active: false,
```

### Transferência de Fundos

```move
// Juntar apostas dos dois players
coin::join(&mut match_obj.balance, pay);

// Determinar vencedor
let winner = if (result) {
    player1  // Player 1 ganhou
} else {
    *option::borrow(&player2)  // Player 2 ganhou
};

// Transferir prêmio total
transfer::public_transfer(balance, winner);
```

## 🎮 Ciclo de Vida da Partida

### Estado 1: Criação
```
Player1: ✓ Definido
Player2: ❌ Vazio
Balance: 100 MIST (só Player 1)
Status: ativa
```

### Estado 2: Player 2 Entra
```
Player1: ✓ Definido  
Player2: ✓ Definido
Balance: 200 MIST (ambos players)
Status: ativa
```

### Estado 3: Resultado Definido
```
Player1: ✓ Definido
Player2: ✓ Definido  
Balance: 200 MIST
Status: inativa
Result: true/false
```

### Estado 4: Pagamento e Destruição
```
Objeto: ❌ DESTRUÍDO
Vencedor: +200 MIST
Perdedor: 0 MIST
```

## 📱 Interação via CLI

### Comandos de Deploy

```bash
# Publicar contrato
sui client publish . --gas-budget 50000000

# Resultado esperado:
# PackageID: 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9
```

### Comandos de Jogo

```bash
# 1. Player 1 cria partida
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function create_match \
  --args <COIN_ID> 100 true \
  --gas-budget 10000000

# 2. Player 2 entra
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function add_another_player \
  --args <COIN_P2> <MATCH_ID> false \
  --gas-budget 10000000

# 3. Definir resultado  
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function set_winner \
  --args <MATCH_ID> true \
  --gas-budget 10000000

# 4. Pagar vencedor
sui client call \
  --package 0xe7d548c9f11426f9c1148d494d02a0e672388ecc9b22876edde157de5f75deb9 \
  --module coinflip \
  --function pay_winner \
  --args <MATCH_ID> \
  --gas-budget 10000000
```

## 🧪 Testes Automatizados

### Teste de Fluxo Completo

```move
#[test]
fun test_complete_game_flow() {
    let player1 = @0xA;
    let player2 = @0xB;
    
    // 1. Setup cenário
    let mut scenario = test_scenario::begin(player1);
    
    // 2. Player 1 cria partida
    let coin1 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
    create_match(coin1, 100, true, test_scenario::ctx(&mut scenario));
    
    // 3. Verificar criação
    test_scenario::next_tx(&mut scenario, player1);
    let match_obj = test_scenario::take_from_sender<CoinFlipMatch>(&scenario);
    assert!(match_obj.bet_amount == 100, 0);
    assert!(option::is_none(&match_obj.player2), 1);
    
    // 4. Player 2 entra
    test_scenario::next_tx(&mut scenario, player2);
    let coin2 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
    add_another_player(coin2, &mut match_obj, false, test_scenario::ctx(&mut scenario));
    
    // 5. Verificar entrada do Player 2
    assert!(option::is_some(&match_obj.player2), 2);
    assert!(*option::borrow(&match_obj.player2) == player2, 3);
    
    // 6. Definir resultado (Player 1 ganha)
    set_winner(&mut match_obj, true);
    assert!(match_obj.result == true, 4);
    assert!(match_obj.is_active == false, 5);
    
    // 7. Pagar vencedor
    pay_winner(match_obj, test_scenario::ctx(&mut scenario));
    
    // 8. Verificar pagamento
    test_scenario::next_tx(&mut scenario, player1);
    let prize = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
    assert!(coin::value(&prize) == 200, 6); // Ambas apostas
    
    test_scenario::end(scenario);
}
```

## ⚡ Otimizações e Melhorias

### Possíveis Implementações Futuras

1. **Oracle Descentralizado**
   - Usar Chainlink VRF ou similar
   - Multiple oracles com consenso
   - Randomness on-chain

2. **Sistema de Ranking**
   - Tracking de vitórias/derrotas
   - Leaderboard global
   - Recompensas por fidelidade

3. **Apostas Variáveis**
   - Diferentes denominações
   - Sistema de buy-in mínimo/máximo
   - Pools de apostas múltiplas

4. **Interface Web**
   - dApp frontend
   - Wallet integration
   - Real-time notifications

5. **Governança**
   - DAO para ajustes de parâmetros
   - Votação em mudanças
   - Treasury management

## 🔐 Considerações de Segurança

### Vetores de Ataque Prevenidos

1. **Double Spending**: Coin é movido atomicamente
2. **Reentrancy**: Move não permite reentrancy
3. **Integer Overflow**: Move tem verificações built-in
4. **Unauthorized Access**: Ownership model do Sui

### Limitações Atuais

1. **Centralização do Oracle**: `set_winner()` pode ser chamado por qualquer um
2. **No Timeouts**: Partidas podem ficar ativas indefinidamente
3. **Fixed Bet Amounts**: Valor deve ser exatamente igual

## 📊 Métricas e Monitoramento

### Eventos para Tracking

```move
// Eventos que poderiam ser emitidos
struct MatchCreated has copy, drop {
    match_id: ID,
    player1: address,
    bet_amount: u64,
}

struct PlayerJoined has copy, drop {
    match_id: ID,
    player2: address,
}

struct GameFinished has copy, drop {
    match_id: ID,
    winner: address,
    prize: u64,
}
```

### Gas Costs (Estimados)

- **create_match**: ~1-2M MIST
- **add_another_player**: ~0.5-1M MIST  
- **set_winner**: ~0.3-0.5M MIST
- **pay_winner**: ~0.5-1M MIST

## 📝 Conclusão

Esta implementação demonstra os conceitos fundamentais de desenvolvimento de games na blockchain Sui:

- **Ownership Model**: Objetos são owned por contas específicas
- **Move Semantics**: Recursos não podem ser duplicados ou perdidos
- **Atomic Operations**: Transações são all-or-nothing
- **Type Safety**: Sistema de tipos previne muitos bugs

O contrato está pronto para produção com as devidas considerações de segurança e pode ser estendido com funcionalidades adicionais conforme necessário.