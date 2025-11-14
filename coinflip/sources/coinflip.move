module coinflip::coinflip;

use sui::coin::{Self, Coin};
use sui::object::{Self, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::balance::{Self, Balance};
use std::option;

// Código de erro quando o valor da aposta não é igual
const EBetAmountMismatch: u64 = 1;
// Erro quando caller não é o escrow autorizado
const EUnauthorizedEscrow: u64 = 2;

// Endereço do escrow autorizado que pode determinar vencedores
const ESCROW_ADDRESS: address = @0x97e4092b163d12fa6d78dba200f9b335e7e559bd61189f080a0565da6f841027;

public struct CoinFlipMatch has store,key {
    id : UID,
    player1: address,
    player2: option::Option<address>,
    bet_amount: u64,
    player1_choice: bool,
    player2_choice: option::Option<bool>, // campo opcional
    result: bool,
    is_active: bool,
    // Store the match pool as a storable Balance so shared-object handlers
    // can withdraw coins from it without requiring object deletion.
    balance: Balance<SUI>,

}

entry fun create_match(coin: Coin<SUI>, bet_amount: u64, player1_choice: bool, ctx: &mut TxContext) {
    // Allow a coin with value >= bet_amount. If larger, split off the exact bet
    // amount and return the remainder to the sender. This makes the frontend
    // simpler (you can pass any SUI coin) while ensuring the on-chain match
    // balance contains exactly the bet amount.
    assert!(coin::value(&coin) >= bet_amount, EBetAmountMismatch);

    let p1_address = tx_context::sender(ctx);

    // Since `coin` is an owned value, make it mutable so we can split it.
    let mut incoming = coin;

    // Split out the exact bet amount from the provided coin. `coin::split`
    // takes a `&mut Coin<T>` and returns a new `Coin<T>` with the requested
    // amount. Any remainder remains in `incoming`.
    let bet_coin = coin::split(&mut incoming, bet_amount, ctx);

    // Return any remainder (possibly zero) to the sender so the resource is
    // consumed and ownership is correctly handled.
    transfer::public_transfer(incoming, p1_address);

    // Convert the bet `Coin` into a storable `Balance` so the shared object
    // can later mint coins from it without needing to delete the object.
    let bet_balance = coin::into_balance(bet_coin);

    let new_match = CoinFlipMatch {
        id: object::new(ctx),
        player1: p1_address,
        player2: option::none<address>(),
        bet_amount,
        player1_choice,
        player2_choice: option::none<bool>(),
        result: false,
        is_active: true,
        balance: bet_balance
    };

    // Turn the newly created match into a shared object so any player can call
    // the join/set/pay entrypoints without requiring the original owner's
    // signature. This is essential for player2 to be able to join the match.
    transfer::public_share_object(new_match);
}

entry fun add_another_player(pay: Coin<SUI>, match_obj: &mut CoinFlipMatch, player2_choice: bool, ctx: &mut TxContext) {
    // Valida que o Player 2 está depositando exatamente o mesmo valor que Player 1
    assert!(coin::value(&pay) == match_obj.bet_amount, EBetAmountMismatch);

    let p2_address = tx_context::sender(ctx);
    match_obj.player2 = option::some(p2_address);
    match_obj.player2_choice = option::some(player2_choice);
    // Put the coin into the storable balance held inside the shared object.
    coin::put(&mut match_obj.balance, pay);
}

// Função para pagar o vencedor e deletar o jogo
entry fun pay_winner(match_obj: &mut CoinFlipMatch, ctx: &mut TxContext) {
    // Se result = true, player1 ganhou, senão player2 ganhou
    let winner = if (match_obj.result) {
        match_obj.player1
    } else {
        *option::borrow(&match_obj.player2)
    };

    // Withdraw the entire stored balance from the shared object and convert it
    // into a transferable Coin, then send it to the winner. We cannot delete
    // shared objects, so we leave the (now-zero) object in place.
    let prize_balance = sui::balance::withdraw_all(&mut match_obj.balance);
    let prize_coin = coin::from_balance(prize_balance, ctx);
    transfer::public_transfer(prize_coin, winner);
    match_obj.is_active = false;
}
// O resultado vem de fora (true = cara, false = coroa)
// Apenas o escrow autorizado pode chamar esta função
entry fun set_winner(match_obj: &mut CoinFlipMatch, coin_result: bool, ctx: &mut TxContext) {
    // Verificar se o caller é o escrow autorizado
    assert!(tx_context::sender(ctx) == ESCROW_ADDRESS, EUnauthorizedEscrow);
    
    // Determine winner based on the provided coin_result and pay out immediately.
    if (coin_result == match_obj.player1_choice) {
        match_obj.result = true; // player1 won
    } else {
        match_obj.result = false; // player2 won
    };

    // Compute the winner address (player2 is an Option, assume Some when called correctly).
    let winner = if (match_obj.result) {
        match_obj.player1
    } else {
        *option::borrow(&match_obj.player2)
    };

    // Withdraw all stored balance and transfer to the winner immediately.
    let prize_balance = sui::balance::withdraw_all(&mut match_obj.balance);
    let prize_coin = coin::from_balance(prize_balance, ctx);
    transfer::public_transfer(prize_coin, winner);

    match_obj.is_active = false;
}


#[test_only]
use sui::test_scenario;
#[test_only] 
use sui::coin::mint_for_testing;

#[test]
fun test_complete_game_flow() {
    let player1 = @0xA;
    let player2 = @0xB;
    // Use the escrow address for the set_winner call
    let escrow = @0x97e4092b163d12fa6d78dba200f9b335e7e559bd61189f080a0565da6f841027;
    
    let mut scenario = test_scenario::begin(player1);
    
    // Step 1: Player1 creates match
    {
        let coin1 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
        create_match(coin1, 100, true, test_scenario::ctx(&mut scenario));
    };
    
    // Step 2: Get the shared match object (it's now shared, not owned by player1)
    test_scenario::next_tx(&mut scenario, player1);
    {
        let match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        assert!(match_obj.bet_amount == 100, 0);
        assert!(match_obj.player1_choice == true, 1);
        assert!(option::is_none(&match_obj.player2), 2);
        test_scenario::return_shared(match_obj);
    };
    
    // Step 3: Player2 joins the game (can access shared object directly)
    test_scenario::next_tx(&mut scenario, player2); // Change to player2's context
    {
        // Now player2 can access the shared object directly without player1's signature
        let mut match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        let coin2 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
        add_another_player(coin2, &mut match_obj, false, test_scenario::ctx(&mut scenario));

        assert!(option::is_some(&match_obj.player2), 3);
        assert!(*option::borrow(&match_obj.player2) == player2, 4);
        test_scenario::return_shared(match_obj);
    };
    
    // Step 4: Set winner (escrow determines coin result is true, so player1 wins)
    test_scenario::next_tx(&mut scenario, escrow);
    {
        let mut match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        set_winner(&mut match_obj, true, test_scenario::ctx(&mut scenario));

        assert!(match_obj.result == true, 5);
        assert!(match_obj.is_active == false, 6);
        test_scenario::return_shared(match_obj);
    };
    
    // Step 5: After set_winner (which pays immediately), verify winner received the prize
    test_scenario::next_tx(&mut scenario, player1);
    {
        let prize = test_scenario::take_from_sender<Coin<SUI>>(&scenario);
        assert!(coin::value(&prize) == 200, 7); // Both bets combined
        test_scenario::return_to_sender(&scenario, prize);
    };
    
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = EUnauthorizedEscrow)]
fun test_unauthorized_set_winner() {
    let player1 = @0xA;
    let player2 = @0xB;
    let unauthorized = @0xC; // Not the escrow address
    
    let mut scenario = test_scenario::begin(player1);
    
    // Step 1: Player1 creates match
    {
        let coin1 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
        create_match(coin1, 100, true, test_scenario::ctx(&mut scenario));
    };
    
    // Step 2: Player2 joins the game
    test_scenario::next_tx(&mut scenario, player2);
    {
        let mut match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        let coin2 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
        add_another_player(coin2, &mut match_obj, false, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(match_obj);
    };
    
    // Step 3: Unauthorized address tries to set winner - should fail
    test_scenario::next_tx(&mut scenario, unauthorized);
    {
        let mut match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        set_winner(&mut match_obj, true, test_scenario::ctx(&mut scenario)); // Should abort
        test_scenario::return_shared(match_obj);
    };
    
    test_scenario::end(scenario);
}

#[test]
fun test_player1_is_sender() {
    let player1 = @0xA;
    let mut scenario = test_scenario::begin(player1);
    
    // Step 1: Player1 creates match
    {
        let coin1 = mint_for_testing<SUI>(100, test_scenario::ctx(&mut scenario));
        create_match(coin1, 100, true, test_scenario::ctx(&mut scenario));
    };
    
    // Step 2: Verify player1 field equals the sender address
    test_scenario::next_tx(&mut scenario, player1);
    {
        let match_obj = test_scenario::take_shared<CoinFlipMatch>(&scenario);
        // This should pass if player1 is correctly set to the sender
        assert!(match_obj.player1 == player1, 999);
        // This should fail if player1 is incorrectly set to escrow
        assert!(match_obj.player1 != ESCROW_ADDRESS, 998);
        test_scenario::return_shared(match_obj);
    };
    
    test_scenario::end(scenario);
}