-- MySQL dump 10.13  Distrib 5.5.62, for Win64 (AMD64)
--
-- Host: localhost    Database: dowload_posts_reddit
-- ------------------------------------------------------
-- Server version	5.5.5-10.5.9-MariaDB
create database if not exists dowload_posts_reddit;
use dowload_posts_reddit;
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `image_iqdb`
--

DROP TABLE IF EXISTS `image_iqdb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `image_iqdb` (
  `idimage_iqdb` int(11) NOT NULL AUTO_INCREMENT,
  `idimage_reddit` int(11) NOT NULL,
  `idreddit` int(11) NOT NULL,
  `url_iqdb` varchar(250) NOT NULL,
  PRIMARY KEY (`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  UNIQUE KEY `idimage_iqdb_UNIQUE` (`idimage_iqdb`),
  KEY `fk_image_iqdb_image_reddit1_idx` (`idimage_reddit`,`idreddit`),
  CONSTRAINT `fk_image_iqdb_image_reddit1` FOREIGN KEY (`idimage_reddit`, `idreddit`) REFERENCES `image_reddit` (`idimage_reddit`, `idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=17414 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `image_reddit`
--

DROP TABLE IF EXISTS `image_reddit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `image_reddit` (
  `idimage_reddit` int(11) NOT NULL AUTO_INCREMENT,
  `idreddit` int(11) NOT NULL,
  `url` varchar(250) NOT NULL,
  `url_iqdb` varchar(250) NOT NULL,
  `name` varchar(100) NOT NULL,
  `reddit_media_id` varchar(100) DEFAULT NULL,
  `reddit_id` int(11) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  PRIMARY KEY (`idimage_reddit`,`idreddit`),
  UNIQUE KEY `idimage_reddit_UNIQUE` (`idimage_reddit`),
  UNIQUE KEY `url_UNIQUE` (`url`),
  UNIQUE KEY `name_UNIQUE` (`name`),
  UNIQUE KEY `url_iqdb_UNIQUE` (`url_iqdb`),
  KEY `fk_image_reddit_post_reddit_idx` (`idreddit`),
  CONSTRAINT `fk_image_reddit_post_reddit` FOREIGN KEY (`idreddit`) REFERENCES `post_reddit` (`idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=19905 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iqdb_result`
--

DROP TABLE IF EXISTS `iqdb_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iqdb_result` (
  `idiqdb_result` int(11) NOT NULL AUTO_INCREMENT,
  `match` varchar(45) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  `type` varchar(45) NOT NULL,
  `similarity` int(11) NOT NULL,
  `similarityPercentage` float NOT NULL,
  `position` int(11) NOT NULL,
  `idimage_iqdb` int(11) NOT NULL,
  `idimage_reddit` int(11) NOT NULL,
  `idreddit` int(11) NOT NULL,
  PRIMARY KEY (`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  UNIQUE KEY `idiqdb_result_UNIQUE` (`idiqdb_result`),
  KEY `fk_iqdb_result_image_iqdb1_idx` (`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  CONSTRAINT `fk_iqdb_result_image_iqdb1` FOREIGN KEY (`idimage_iqdb`, `idimage_reddit`, `idreddit`) REFERENCES `image_iqdb` (`idimage_iqdb`, `idimage_reddit`, `idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=45593 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iqdb_result_tag`
--

DROP TABLE IF EXISTS `iqdb_result_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iqdb_result_tag` (
  `idtag` int(11) NOT NULL,
  `idiqdb_thumbnail` int(11) NOT NULL,
  `idiqdb_result` int(11) NOT NULL,
  `idimage_iqdb` int(11) NOT NULL,
  `idimage_reddit` int(11) NOT NULL,
  `idreddit` int(11) NOT NULL,
  PRIMARY KEY (`idtag`,`idiqdb_thumbnail`,`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  KEY `fk_iqdb_tag_has_iqdb_thumbnail_iqdb_thumbnail1_idx` (`idiqdb_thumbnail`,`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  KEY `fk_iqdb_tag_has_iqdb_thumbnail_iqdb_tag1_idx` (`idtag`),
  CONSTRAINT `fk_iqdb_tag_has_iqdb_thumbnail_iqdb_tag1` FOREIGN KEY (`idtag`) REFERENCES `iqdb_tag` (`idtag`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_iqdb_tag_has_iqdb_thumbnail_iqdb_thumbnail1` FOREIGN KEY (`idiqdb_thumbnail`, `idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) REFERENCES `iqdb_thumbnail` (`idiqdb_thumbnail`, `idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iqdb_source`
--

DROP TABLE IF EXISTS `iqdb_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iqdb_source` (
  `idiqdb_source` int(11) NOT NULL AUTO_INCREMENT,
  `service` varchar(100) NOT NULL,
  `href` varchar(250) NOT NULL,
  `fixed_href` varchar(250) NOT NULL,
  `idiqdb_result` int(11) NOT NULL,
  `idimage_iqdb` int(11) NOT NULL,
  `idimage_reddit` int(11) NOT NULL,
  `idreddit` int(11) NOT NULL,
  PRIMARY KEY (`idiqdb_source`,`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  UNIQUE KEY `idiqdb_source_UNIQUE` (`idiqdb_source`),
  KEY `fk_iqdb_source_iqdb_result1_idx` (`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  CONSTRAINT `fk_iqdb_source_iqdb_result1` FOREIGN KEY (`idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) REFERENCES `iqdb_result` (`idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=70399 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iqdb_tag`
--

DROP TABLE IF EXISTS `iqdb_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iqdb_tag` (
  `idtag` int(11) NOT NULL AUTO_INCREMENT,
  `tag` varchar(100) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`idtag`),
  UNIQUE KEY `idtag_UNIQUE` (`idtag`),
  UNIQUE KEY `tag_UNIQUE` (`tag`)
) ENGINE=InnoDB AUTO_INCREMENT=98037 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `iqdb_thumbnail`
--

DROP TABLE IF EXISTS `iqdb_thumbnail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `iqdb_thumbnail` (
  `idiqdb_thumbnail` int(11) NOT NULL AUTO_INCREMENT,
  `src` varchar(100) NOT NULL,
  `fixed_src` varchar(250) NOT NULL,
  `rating` varchar(45) NOT NULL,
  `score` int(11) NOT NULL,
  `idiqdb_result` int(11) NOT NULL,
  `idimage_iqdb` int(11) NOT NULL,
  `idimage_reddit` int(11) NOT NULL,
  `idreddit` int(11) NOT NULL,
  PRIMARY KEY (`idiqdb_thumbnail`,`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  UNIQUE KEY `idiqdb_thumbnail_UNIQUE` (`idiqdb_thumbnail`),
  KEY `fk_iqdb_thumbnail_iqdb_result1_idx` (`idiqdb_result`,`idimage_iqdb`,`idimage_reddit`,`idreddit`),
  CONSTRAINT `fk_iqdb_thumbnail_iqdb_result1` FOREIGN KEY (`idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) REFERENCES `iqdb_result` (`idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=45031 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_reddit`
--

DROP TABLE IF EXISTS `post_reddit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_reddit` (
  `idreddit` int(11) NOT NULL AUTO_INCREMENT,
  `subreddit` varchar(100) NOT NULL,
  `url` varchar(250) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `created` timestamp NULL DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `subreddit_id` varchar(100) NOT NULL,
  `post_id` varchar(100) NOT NULL,
  PRIMARY KEY (`idreddit`),
  UNIQUE KEY `idreddit_UNIQUE` (`idreddit`),
  UNIQUE KEY `url_UNIQUE` (`url`),
  UNIQUE KEY `name_UNIQUE` (`name`),
  UNIQUE KEY `url` (`url`)
) ENGINE=InnoDB AUTO_INCREMENT=15087 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-03-10 10:15:22
