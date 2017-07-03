-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.1.18-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             9.4.0.5125
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- Dumping database structure for rps
CREATE DATABASE IF NOT EXISTS `rps` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `rps`;

-- Dumping structure for table rps.t_games
CREATE TABLE IF NOT EXISTS `t_games` (
  `gameId` int(11) NOT NULL AUTO_INCREMENT,
  `playerOneId` int(11) NOT NULL,
  `playerTwoId` int(11) NOT NULL,
  `winnerId` int(11) DEFAULT '0',
  `currentRoundId` int(11) DEFAULT NULL,
  `roundCount` int(11) DEFAULT '0',
  `dateAdded` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dateUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gameId`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table rps.t_rounds
CREATE TABLE IF NOT EXISTS `t_rounds` (
  `roundId` int(11) NOT NULL AUTO_INCREMENT,
  `gameId` int(11) NOT NULL,
  `playerOneTurnId` int(11) DEFAULT NULL,
  `playerTwoTurnId` int(11) DEFAULT NULL,
  `winnerId` int(11) DEFAULT NULL,
  `dateAdded` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dateUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`roundId`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table rps.t_sessions
CREATE TABLE IF NOT EXISTS `t_sessions` (
  `sessionId` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `hash` varchar(64) NOT NULL,
  `dateAdded` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sessionId`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table rps.t_turns
CREATE TABLE IF NOT EXISTS `t_turns` (
  `turnId` int(11) NOT NULL AUTO_INCREMENT,
  `roundId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `action` tinyint(4) DEFAULT NULL,
  `dateAdded` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`turnId`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table rps.t_users
CREATE TABLE IF NOT EXISTS `t_users` (
  `userId` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `emailAddress` varchar(60) NOT NULL,
  `dateAdded` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dateUpdated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `wins` int(11) DEFAULT '0',
  `losses` int(11) DEFAULT '0',
  `elo` int(11) DEFAULT '1000',
  `totalOpponentElo` int(11) DEFAULT '0',
  `passwordHash` varchar(64) NOT NULL,
  `passwordSalt` varchar(64) NOT NULL,
  `extraLives` int(11) DEFAULT '0',
  PRIMARY KEY (`userId`),
  UNIQUE KEY `Unique` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
