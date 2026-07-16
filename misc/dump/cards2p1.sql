-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Jul 16, 2026 at 07:17 PM
-- Server version: 8.4.4-4
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ebd_fugu_929125`
--

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

CREATE TABLE `cards` (
  `card_id` int UNSIGNED NOT NULL,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int NOT NULL,
  `card_location` enum('player','center','returned_to_box') NOT NULL,
  `card_location_arg` int NOT NULL,
  `state_in_hand` enum('facedown','number','anchor') DEFAULT NULL,
  `location_in_hand` tinyint UNSIGNED DEFAULT NULL,
  `suit` enum('bannerfish','pufferfish','octopus','coral_pink','coral_green','coral_yellow') NOT NULL,
  `rank` tinyint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `cards`
--

INSERT INTO `cards` (`card_id`, `card_type`, `card_type_arg`, `card_location`, `card_location_arg`, `state_in_hand`, `location_in_hand`, `suit`, `rank`) VALUES
(1, 'card', 0, 'player', 2367142, 'facedown', 11, 'coral_pink', 1),
(2, 'card', 0, 'player', 2367143, 'facedown', 15, 'octopus', 2),
(3, 'card', 0, 'player', 2367143, 'facedown', 4, 'bannerfish', 3),
(4, 'card', 0, 'player', 2367143, 'facedown', 6, 'coral_green', 4),
(5, 'card', 0, 'player', 2367143, 'number', 1, 'pufferfish', 5),
(6, 'card', 0, 'center', 3, NULL, NULL, 'bannerfish', 6),
(7, 'card', 0, 'center', 1, NULL, NULL, 'coral_yellow', 7),
(8, 'card', 0, 'player', 2367142, 'facedown', 13, 'octopus', 8),
(9, 'card', 0, 'player', 2367143, 'number', 3, 'bannerfish', 9),
(10, 'card', 0, 'player', 2367143, 'facedown', 8, 'coral_pink', 10),
(11, 'card', 0, 'player', 2367143, 'facedown', 12, 'pufferfish', 11),
(12, 'card', 0, 'player', 2367143, 'facedown', 14, 'bannerfish', 12),
(13, 'card', 0, 'player', 2367142, 'facedown', 17, 'coral_green', 13),
(14, 'card', 0, 'player', 2367142, 'facedown', 15, 'octopus', 14),
(15, 'card', 0, 'player', 2367142, 'facedown', 1, 'bannerfish', 15),
(16, 'card', 0, 'player', 2367142, 'facedown', 4, 'coral_yellow', 16),
(17, 'card', 0, 'player', 2367142, 'facedown', 18, 'pufferfish', 17),
(18, 'card', 0, 'player', 2367142, 'facedown', 2, 'bannerfish', 18),
(19, 'card', 0, 'player', 2367143, 'facedown', 16, 'coral_pink', 19),
(20, 'card', 0, 'player', 2367142, 'facedown', 3, 'octopus', 20),
(21, 'card', 0, 'player', 2367142, 'facedown', 12, 'bannerfish', 21),
(22, 'card', 0, 'player', 2367142, 'number', 5, 'coral_green', 22),
(23, 'card', 0, 'player', 2367143, 'facedown', 7, 'pufferfish', 23),
(24, 'card', 0, 'player', 2367142, 'number', 6, 'bannerfish', 24),
(25, 'card', 0, 'player', 2367142, 'facedown', 16, 'coral_yellow', 25),
(26, 'card', 0, 'player', 2367142, 'facedown', 14, 'octopus', 26),
(27, 'card', 0, 'player', 2367142, 'number', 7, 'bannerfish', 27),
(28, 'card', 0, 'player', 2367143, 'facedown', 18, 'coral_pink', 28),
(29, 'card', 0, 'player', 2367143, 'number', 9, 'pufferfish', 29),
(30, 'card', 0, 'player', 2367142, 'number', 8, 'bannerfish', 30),
(31, 'card', 0, 'player', 2367143, 'facedown', 13, 'coral_green', 31),
(32, 'card', 0, 'player', 2367143, 'number', 10, 'octopus', 32),
(33, 'card', 0, 'center', 2, NULL, NULL, 'bannerfish', 33),
(34, 'card', 0, 'player', 2367143, 'facedown', 17, 'coral_yellow', 34),
(35, 'card', 0, 'player', 2367143, 'facedown', 5, 'pufferfish', 35),
(36, 'card', 0, 'player', 2367142, 'number', 9, 'bannerfish', 36),
(37, 'card', 0, 'player', 2367143, 'facedown', 11, 'octopus', 37),
(38, 'card', 0, 'player', 2367143, 'anchor', 2, 'coral_pink', 38),
(39, 'card', 0, 'player', 2367142, 'facedown', 10, 'bannerfish', 39);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`card_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cards`
--
ALTER TABLE `cards`
  MODIFY `card_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
