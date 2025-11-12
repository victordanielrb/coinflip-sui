module coinflip::coinflip;

use std::debug::print;
use std::string::utf8;
use sui::tx_context::TxContext;
use sui::tx_context;
use sui::object::{Self, UID};
use sui::balance::Balance;
use sui::coin::Coin;
use sui::sui::SUI;



public struct CoinFlipMatch has store,key {
    id : UID,
    player1: address,
    player2: option::Option<address>,
    bet_amount: u64,
    player1_choice: bool,
    player2_choice: option::Option<bool>, // campo opcional
    result: bool,
    is_active: bool,
    balance: Coin<SUI>,

}


public fun create_match( coin: Coin<SUI>, ctx:&mut TxContext, bet_amount: u64, player1_choice: bool) {

    let p1_address = ctx.sender();
    let new_match = coinflip::coinflip::CoinFlipMatch {
        id: object::new(ctx),
        player1: p1_address,
        player2: option::none<address>(),
        bet_amount,
        player1_choice,
        player2_choice: option::none<bool>(),
        result: false,
        is_active: true,
        balance: coin
    };
    
    transfer::transfer(new_match, p1_address);
    

}

public fun add_another_player( pay: Coin<SUI>, ctx:&mut TxContext, match_obj: &mut coinflip::coinflip::CoinFlipMatch, player2_choice: bool) {
    let p2_address = ctx.sender();
    match_obj.player2 = option::some(p2_address);
    match_obj.player2_choice = option::some(player2_choice);
    match_obj.balance = sui::coin::merge(match_obj.balance, pay);}

public fun set_winner( match_obj: &mut coinflip::coinflip::CoinFlipMatch) {
    let random_value = sui::tx_context::random_u64(&ctx) % 2;
    if (random_value == 0) {
        match_obj.result = match_obj.player1_choice;
    } else {
            let p2_choice = option::borrow(&match_obj.player2_choice);
            match_obj.result = *p2_choice;
        
    }
    match_obj.is_active = false;
}


entry fun test_create_match(  coin: Coin<SUI>,bet_amount: u64, player1_choice: bool, ctx:&mut TxContext) {

    let p1_address = ctx.sender();
    let new_match = coinflip::coinflip::CoinFlipMatch {
        id: object::new(ctx),
        player1: p1_address,
        player2: option::none<address>(),
        bet_amount,
        player1_choice,
        player2_choice: option::none<bool>(),
        result: false,
        is_active: true,
        balance: coin
    };
    
    transfer::transfer(new_match, p1_address);
    

}


