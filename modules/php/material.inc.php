<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Fugu implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * material.inc.php
 *
 * Ninjan game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

if (!defined('DECK_LENGTH_2_PLAYERS')) { // guard since this included multiple times
    define("DECK_LENGTHS", [2 => 39, 3 => 57, 4 => 75]); //ekmek solo ekle?
    define("CENTER_CARD_COUNT", 3);
    define("CARDS_PER_PLAYER", 18);

    define("BANNERFISH_SCORING_TABLE", [0 => 0, 1 => 0, 2 => 2, 3 => 5, 4 => 9 ]);
    define("PUFFERFISH_SCORING_TABLE", [0 => 3, 1 => 1, 2 => 0]); //score 3 point for 0 fish-neighbour, 1 point for 1 fish-neighbour, else 0 point
    define("OCTOPUS_SCORING", 2); //score 2 points per adjacent coral
    define("CORAL_SCORING", 3); //score 3 points per sets of corals in pink, green, yellow
    define("ANCHOR_SCORING", fn($n) => ($n * ($n + 1)) / -2); //score minus Gaussian: -1, -3, -6, -10 and so on

    define("CARD_NUM_TO_CARD_TYPE", [
        1 => "coral_pink",
        2 => "octopus",
        3 => "bannerfish",
        4 => "coral_green",
        5 => "pufferfish",
        6 => "bannerfish",
        7 => "coral_yellow",
        8 => "octopus",
        9 => "bannerfish",
        10 => "coral_pink",
        11 => "pufferfish",
        12 => "bannerfish",
        13 => "coral_green",
        14 => "octopus",
        15 => "bannerfish",
        16 => "coral_yellow",
        17 => "pufferfish",
        18 => "bannerfish",
        19 => "coral_pink",
        20 => "octopus",
        21 => "bannerfish",
        22 => "coral_green",
        23 => "pufferfish",
        24 => "bannerfish",
        25 => "coral_yellow",
        26 => "octopus",
        27 => "bannerfish",
        28 => "coral_pink",
        29 => "pufferfish",
        30 => "bannerfish",
        31 => "coral_green",
        32 => "octopus",
        33 => "bannerfish",
        34 => "coral_yellow",
        35 => "pufferfish",
        36 => "bannerfish",
        37 => "octopus",
        38 => "coral_pink",
        39 => "bannerfish",
        40 => "coral_green",
        41 => "pufferfish",
        42 => "bannerfish",
        43 => "coral_yellow",
        44 => "octopus",
        45 => "bannerfish",
        46 => "coral_pink",
        47 => "pufferfish",
        48 => "bannerfish",
        49 => "coral_green",
        50 => "octopus",
        51 => "bannerfish",
        52 => "coral_yellow",
        53 => "pufferfish",
        54 => "bannerfish",
        55 => "octopus",
        56 => "coral_pink",
        57 => "bannerfish",
        58 => "coral_green",
        59 => "pufferfish",
        60 => "bannerfish",
        61 => "coral_yellow",
        62 => "octopus",
        63 => "bannerfish",
        64 => "coral_pink",
        65 => "pufferfish",
        66 => "bannerfish",
        67 => "coral_green",
        68 => "octopus",
        69 => "bannerfish",
        70 => "coral_yellow",
        71 => "pufferfish",
        72 => "bannerfish",
        73 => "octopus",
        74 => "coral_pink",
        75 => "bannerfish",
    ]);
}
