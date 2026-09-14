-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 14, 2026 at 07:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fkams`
--

-- --------------------------------------------------------

--
-- Table structure for table `academic_years`
--

CREATE TABLE `academic_years` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('planning','active','closed') NOT NULL DEFAULT 'planning',
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `academic_years`
--

INSERT INTO `academic_years` (`id`, `name`, `start_date`, `end_date`, `status`, `is_current`, `created_by`, `created_at`) VALUES
(1, '2026-2027', '2026-08-29', '2027-07-10', 'planning', 0, 1, '2026-08-25 14:37:08'),
(9, '2027-2028', '2027-02-01', '2027-07-15', 'planning', 0, 1, '2026-08-26 10:38:36'),
(10, '2028-2029', '2028-09-01', '2029-07-15', 'closed', 0, 1, '2026-08-26 11:45:23'),
(11, '2029-2030', '2029-09-01', '2030-07-15', 'active', 1, 1, '2026-08-26 14:55:58');

-- --------------------------------------------------------

--
-- Table structure for table `academic_year_terms`
--

CREATE TABLE `academic_year_terms` (
  `id` int(10) UNSIGNED NOT NULL,
  `academic_year_id` int(10) UNSIGNED NOT NULL,
  `term_number` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(40) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('upcoming','active','ended') NOT NULL DEFAULT 'upcoming'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `academic_year_terms`
--

INSERT INTO `academic_year_terms` (`id`, `academic_year_id`, `term_number`, `name`, `start_date`, `end_date`, `status`) VALUES
(1, 1, 1, 'Term 1', '2026-09-01', '2026-12-15', 'ended'),
(2, 1, 2, 'Term 2', '2027-01-10', '2027-03-30', 'ended'),
(3, 1, 3, 'Term 3', '2027-04-15', '2027-07-15', 'ended'),
(4, 9, 1, 'Term 1', '2026-08-26', '2027-02-15', 'ended'),
(5, 9, 2, 'Term 2', '2027-01-10', '2027-03-30', 'ended'),
(6, 9, 3, 'Term 3', '2027-04-15', '2027-07-15', 'ended'),
(7, 10, 1, 'Term 1', '2028-09-01', '2028-12-15', 'ended'),
(8, 10, 2, 'Term 2', '2029-01-10', '2029-03-30', 'ended'),
(9, 10, 3, 'Term 3', '2029-04-15', '2029-07-15', 'ended'),
(10, 11, 1, 'Term 1', '2029-09-01', '2029-12-15', 'upcoming'),
(11, 11, 2, 'Term 2', '2030-01-10', '2030-03-30', 'upcoming'),
(12, 11, 3, 'Term 3', '2030-04-15', '2030-07-15', 'upcoming');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('test_published','test_closed','grade_available','general') NOT NULL DEFAULT 'general',
  `related_test_id` int(10) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `title`, `message`, `type`, `related_test_id`, `created_by`, `created_at`) VALUES
(1, 'New Test: math', 'A new test \"math\" has been posted. Click to view and take the test.', 'test_published', 2, 16, '2026-08-24 15:54:10'),
(2, 'New Test: math', 'A new test \"math\" has been posted. Click to view and take the test.', 'test_published', 2, 16, '2026-08-24 15:54:19'),
(3, 'New Test: fill', 'A new test \"fill\" has been posted. Click to view and take the test.', 'test_published', 3, 16, '2026-08-24 16:14:55'),
(4, 'New Test: frence', 'A new test \"frence\" has been posted. Click to view and take the test.', 'test_published', 4, 16, '2026-08-24 16:25:57'),
(5, 'New Test: ahshusjdiwsjksol', 'A new test \"ahshusjdiwsjksol\" has been posted. Click to view and take the test.', 'test_published', 5, 16, '2026-08-24 16:46:45'),
(6, 'New Test: storong', 'A new test \"storong\" has been posted. Click to view and take the test.', 'test_published', 6, 16, '2026-08-24 17:20:36'),
(8, 'New Test: french test', 'A new test \"french test\" has been posted. Click to view and take the test.', 'test_published', 9, 16, '2026-08-25 07:26:41'),
(23, 'New Test: isuzuma', 'A new test \"isuzuma\" has been posted. Click to view and take the test.', 'test_published', 13, 42, '2026-09-01 10:51:51'),
(24, 'Test alert: irene', 'irene may be attempting to copy during test \"english Unit 6: Classroom objects and personal belongings Test\". Reason: Fullscreen mode exited', 'general', 16, 17, '2026-09-14 12:10:39');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_recipients`
--

CREATE TABLE `announcement_recipients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `announcement_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `announcement_recipients`
--

INSERT INTO `announcement_recipients` (`id`, `announcement_id`, `user_id`, `read_at`, `created_at`) VALUES
(3, 3, 18, NULL, '2026-08-24 16:14:55'),
(4, 4, 18, NULL, '2026-08-24 16:25:58'),
(5, 5, 18, NULL, '2026-08-24 16:46:45'),
(6, 6, 18, NULL, '2026-08-24 17:20:36'),
(7, 8, 18, NULL, '2026-08-25 07:26:41'),
(8, 23, 46, NULL, '2026-09-01 10:51:51'),
(9, 24, 42, NULL, '2026-09-14 12:10:39');

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

CREATE TABLE `applications` (
  `id` int(10) UNSIGNED NOT NULL,
  `applicant_name` varchar(120) NOT NULL,
  `applicant_photo_key` varchar(255) DEFAULT NULL,
  `mother_name` varchar(120) DEFAULT NULL,
  `mother_phone` varchar(30) DEFAULT NULL,
  `father_name` varchar(120) DEFAULT NULL,
  `father_phone` varchar(30) DEFAULT NULL,
  `parent_phone` varchar(190) NOT NULL,
  `parent_email` varchar(190) DEFAULT NULL,
  `province` varchar(80) DEFAULT NULL,
  `district` varchar(80) DEFAULT NULL,
  `sector` varchar(80) DEFAULT NULL,
  `cell` varchar(80) DEFAULT NULL,
  `village` varchar(80) DEFAULT NULL,
  `desired_class` varchar(80) NOT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `previous_school` varchar(160) DEFAULT NULL,
  `result_slip_key` varchar(255) DEFAULT NULL,
  `report_key` varchar(255) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_at` datetime DEFAULT NULL,
  `reviewer_comment` text DEFAULT NULL,
  `approved_student_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `applications`
--

INSERT INTO `applications` (`id`, `applicant_name`, `applicant_photo_key`, `mother_name`, `mother_phone`, `father_name`, `father_phone`, `parent_phone`, `parent_email`, `province`, `district`, `sector`, `cell`, `village`, `desired_class`, `gender`, `birthday`, `previous_school`, `result_slip_key`, `report_key`, `academic_year`, `status`, `approved_at`, `reviewer_comment`, `approved_student_id`, `created_at`) VALUES
(1, 'nshizirungiusepa', NULL, 'sepa', '0793360920', 'nshizirungu', '0793360920', '0793360920', NULL, 'east', 'nyagatare', 'rukomo', 'nyakagarama', NULL, 'p4', 'female', '2026-08-26', 'g.s rurenge', NULL, NULL, '2028', 'approved', NULL, 'iam still  jujement', 6, '2026-08-26 16:45:10'),
(2, 'iturihafi', NULL, 'iturihafi', 'pacifiquesepa@gmail.com', 'turikumwe', 'pacifiquesepa@gmail.com', '', 'pacifiquesepa@gmail.com', 'east', 'nyagatare', 'rukomo', 'nyakagarama', NULL, 'p5', 'male', '2026-08-26', 'gs rurenge', NULL, NULL, '2029-2030', 'approved', NULL, 'yes you allowed to do', 7, '2026-08-26 21:48:34'),
(3, 'akingeneye', NULL, 'nyirabagenzi', '0793360920', 'gadi', '079336092', '', 'pacifiquesepa@gmail.com', 'kigari', 'kicukiro', 'remera', 'remera', NULL, 'p5', 'female', '2026-08-27', 'gs remera', NULL, NULL, '2029-2030', 'approved', NULL, NULL, 8, '2026-08-26 23:31:56'),
(4, 'iradukunda', NULL, 'well', '0793360920', 'well2', '0793360920', '', 'pacifiquesepa@gmail.com', 'eastern', 'nyagatare', 'rukomo', 'rekomo', NULL, 'p5', 'female', '2026-07-29', 'rukomo', NULL, NULL, '2029-2030', 'approved', NULL, NULL, 9, '2026-08-26 23:46:11'),
(5, 'iyakaremye', NULL, 'sjdhjshj ciskdo', '07934343434', 'jfdhwsdjwkol', '079434334222', '', 'pacifiquesepa@gmail.com', 'ksndjs', 'sdjshd', 'sdhd', 'njsdjiw', NULL, 'p5', 'female', '2026-08-05', 'skdhsijd', NULL, NULL, '2029-2030', 'approved', NULL, NULL, 10, '2026-08-26 23:59:23'),
(6, 'eizeye', NULL, 'shdhcjiskdw', 'pacifiquesepa@gmail.com', 'shxusjhxjsijijsi', 'pacifiquesepa@gmail.com', '', 'pacifiquesepa@gmail.com', 'chbhsjkudueiuddjuuji', 'efrg', 'defeg', 'r4ty45', NULL, 'p5', 'female', '2026-08-27', 'fegef', NULL, NULL, '2029-2030', 'approved', NULL, 'dgth', 11, '2026-08-27 00:12:01'),
(7, 'iturihafi rene', NULL, 'nyirabagenzi dota', '0793360920', 'manishimwe gadi', '0793360920', '', 'pacifiquesepa@gmail.com', 'kigari', 'kicukiro', 'remera', 'remera', NULL, 'p5', 'female', '2026-08-27', 'gs remera', NULL, NULL, '2029-2030', 'approved', NULL, NULL, 12, '2026-08-27 00:31:32'),
(8, 'nshizirungu pacifique', NULL, 'xjnsjdjdiksjdisidwsd', 'sjnxjaxkckmsk', 'cksdjjcskjskx', 'jsdhusjjixs', '', 'pacifiquesepa@gmail.com', 'snbsjssik', 'sjxxnsjkkd', 'sjdjsjik', 'sjnxsj', NULL, 'p5', 'female', '2026-07-28', 'jshhsj', NULL, NULL, '2029-2030', 'rejected', NULL, NULL, NULL, '2026-08-27 00:39:11'),
(9, 'uwineza keza', NULL, 'sbhdhusjsksokso', 'sjdjsiskx', 'sjcisdjio', 'sdhwsijidwj', '', 'pacifiquesepa@gmail.com', 'hxsxhxusjijcisjx', 'jxjcdk', 'jdhucjsijcij', 'jsjjsikjc', NULL, 'p5', 'male', '2026-08-13', 'jshjsij', NULL, NULL, '2029-2030', 'rejected', NULL, NULL, NULL, '2026-08-27 00:40:32'),
(10, 'iyakaremwe app', 'http://localhost:4000/uploads/6dbbb1a6c4d89ee6d51ce6ccf5cef5e5', 'nyirabagenzi', 'keza pacy', 'hhdujdiwdijdiw', NULL, '', 'pacifiquesepa3@gmail.com', 'Kigali', 'Kicukiro', 'Niboye', 'Kagarama', 'dcdkcdkd', 'p5', 'female', '2026-08-05', 'jsdcdjsdks', NULL, 'http://localhost:4000/uploads/4b81fa2286aaa49d120200cc5f4fd876', '2029-2030', 'approved', NULL, 'caming my deal', 13, '2026-08-27 01:31:54'),
(11, 'abayisenga', NULL, 'smnjsnkslcdx', '0793360920', 'skxjsok', '0793360920', '', 'pacifiquesepa3@gmail.com', '5', '502', '050211', '5021103', '502110311', 'p5', 'female', '2026-08-19', NULL, NULL, NULL, '2029-2030', 'approved', '2026-09-14 10:57:08', NULL, NULL, '2026-08-27 02:23:34'),
(12, 'akingeneye', NULL, 'nyirabagenze', '0793360920', 'manishimwe', '0793360920', '', 'pacifiquesepa@gmail.com', '3', '302', '030210', '3021002', '302100204', 'p5', 'female', '2026-08-12', NULL, NULL, NULL, '2029-2030', 'approved', '2026-08-27 04:50:37', NULL, 14, '2026-08-27 02:37:44'),
(13, 'pacifiqueann', NULL, 'ddhdjhdkdjsid', '0793360902', 'heheuje', '0793360910', '', 'pacifiquesepa25@gmail.com', '1', '102', '010211', '1021103', '102110310', 'p3a', 'male', '2026-08-11', 'g.s rurenge', NULL, NULL, '2029-2030', 'approved', '2026-08-31 11:29:48', 'it good things', 16, '2026-08-31 09:28:27'),
(14, 'ilphotex', 'http://localhost:4000/uploads/5f4ca1309677b3aaca1ecdc67c5cf2b3', 'keza anee', 'pacifiquesepa3@gmail.com', 'welll', 'pacifiquesepa3@gmail.com', '', 'pacifiquesepa3@gmail.com', '1', '101', '010104', '1010401', '101040110', 'p3a', 'male', '2026-09-01', 'gs kagitumba', NULL, 'http://localhost:4000/uploads/a9849efe498e8edbdd6faca5ded2ec4a', '2029-2030', 'approved', '2026-09-14 11:40:35', 'mwemerewe kwiga muri eav', NULL, '2026-09-14 09:34:09');

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(140) NOT NULL,
  `asset_tag` varchar(60) NOT NULL,
  `category` varchar(80) NOT NULL,
  `condition_status` enum('new','good','repair','retired') NOT NULL DEFAULT 'good',
  `location` varchar(100) DEFAULT NULL,
  `assigned_to` int(10) UNSIGNED DEFAULT NULL,
  `acquired_on` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent','late','excused') NOT NULL,
  `marked_by` int(10) UNSIGNED NOT NULL,
  `comment` text DEFAULT NULL,
  `score_deduction` tinyint(3) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `student_id`, `attendance_date`, `status`, `marked_by`, `comment`, `score_deduction`) VALUES
(6, 8, '2026-08-28', 'present', 1, NULL, 0),
(12, 10, '2026-08-28', 'absent', 1, NULL, 2),
(14, 11, '2026-08-28', 'present', 1, NULL, 0),
(15, 9, '2026-08-28', 'present', 1, NULL, 0),
(16, 7, '2026-08-28', 'present', 1, NULL, 0),
(20, 12, '2026-08-28', 'present', 1, NULL, 0),
(22, 13, '2026-08-28', 'present', 1, NULL, 0),
(24, 15, '2026-08-31', 'absent', 42, NULL, 2),
(25, 8, '2026-09-01', 'late', 1, NULL, 0),
(27, 11, '2026-09-01', 'present', 1, NULL, 0),
(28, 12, '2026-09-01', 'present', 1, NULL, 0),
(29, 7, '2026-09-01', 'present', 1, NULL, 0),
(30, 9, '2026-09-01', 'present', 1, NULL, 0),
(31, 13, '2026-09-01', 'present', 1, NULL, 0),
(32, 10, '2026-09-01', 'present', 1, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `audit_sessions`
--

CREATE TABLE `audit_sessions` (
  `id` char(36) NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `login_at` datetime NOT NULL,
  `last_seen_at` datetime NOT NULL,
  `logout_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_sessions`
--

INSERT INTO `audit_sessions` (`id`, `user_id`, `login_at`, `last_seen_at`, `logout_at`) VALUES
('7ee17594-88bf-4b33-a574-cdfcd3bb7a52', 1, '2026-09-14 19:50:13', '2026-09-14 19:56:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `behavior_records`
--

CREATE TABLE `behavior_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `category` enum('excellent','good','needs_improvement','discipline') NOT NULL,
  `note` text NOT NULL,
  `recorded_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `score_deduction` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `score_after` tinyint(3) UNSIGNED DEFAULT NULL,
  `attendance_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `behavior_records`
--

INSERT INTO `behavior_records` (`id`, `student_id`, `category`, `note`, `recorded_by`, `created_at`, `score_deduction`, `score_after`, `attendance_id`) VALUES
(4, 3, 'discipline', 'bad behavios', 16, '2026-08-25 16:08:22', 2, 98, NULL),
(5, 4, 'discipline', 'bady  discipline on around on school', 1, '2026-08-26 14:54:43', 2, 98, NULL),
(10, 10, 'discipline', 'bad discipline', 1, '2026-08-28 11:02:57', 2, 94, NULL),
(11, 10, 'needs_improvement', 'jcdcksklxla;xla', 1, '2026-08-28 11:03:27', 0, 94, NULL),
(12, 10, 'needs_improvement', 'hsxushidjic oskoqk', 1, '2026-08-28 11:03:52', 2, 94, NULL),
(13, 10, 'discipline', 'Absent on 2026-08-28. 2 marks deducted.', 1, '2026-08-28 11:04:53', 2, 94, 12),
(14, 15, 'discipline', 'kdjckdjdksodlspd', 42, '2026-08-31 20:31:48', 2, 96, NULL),
(15, 15, 'discipline', 'Absent on 2026-08-31. 2 marks deducted.', 42, '2026-08-31 20:34:49', 2, 96, 24);

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

CREATE TABLE `budgets` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `activity` varchar(180) DEFAULT NULL,
  `fiscal_year` varchar(20) NOT NULL,
  `term` varchar(30) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `document_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(255) DEFAULT NULL,
  `status` enum('draft','approved','closed') NOT NULL DEFAULT 'draft',
  `created_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `budgets`
--

INSERT INTO `budgets` (`id`, `name`, `activity`, `fiscal_year`, `term`, `amount`, `description`, `photo_url`, `document_url`, `video_url`, `status`, `created_by`) VALUES
(1, 'abook', NULL, '2025/2026', NULL, 20000.00, NULL, NULL, NULL, NULL, 'approved', 12),
(2, 'food', NULL, '2025/2026', NULL, 200000.00, 'hhhshsjdsjsjjksjis', 'http://localhost:4000/uploads/b5a468d99b8705852f660aad891161d8', 'http://localhost:4000/uploads/b19ca5afab69d964f86f9f70735323f3', NULL, 'approved', 12);

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(80) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`id`, `name`, `academic_year`, `is_active`) VALUES
(1, 'p2', '2025 / 2026', 1),
(2, 'p3', '2025 / 2026', 1),
(3, 'p1', '2025 / 2026', 1),
(5, 'nusary', '2028/2029', 1),
(7, 'p4', '2028-2029', 1),
(8, 'p5', '2029-2030', 1),
(11, 'p3a', '2029-2030', 1),
(21, 'p6a', '2029-2030', 1),
(23, 's2b', '2029-2030', 1),
(25, 's3c', '2029-2030', 1),
(26, 'primary1', '2029-2030', 1);

-- --------------------------------------------------------

--
-- Table structure for table `class_subjects`
--

CREATE TABLE `class_subjects` (
  `class_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `class_subjects`
--

INSERT INTO `class_subjects` (`class_id`, `subject_id`) VALUES
(1, 1),
(2, 2),
(2, 3),
(2, 4),
(2, 5),
(2, 6),
(2, 7),
(2, 8),
(2, 9),
(3, 10),
(3, 11),
(5, 13),
(25, 20),
(25, 21),
(25, 22),
(26, 23),
(26, 24);

-- --------------------------------------------------------

--
-- Table structure for table `curriculum_items`
--

CREATE TABLE `curriculum_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `year_name` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `subject_name` varchar(100) DEFAULT NULL,
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `curriculum_items`
--

INSERT INTO `curriculum_items` (`id`, `year_name`, `title`, `description`, `file_url`, `subject_name`, `created_by`, `created_at`) VALUES
(1, 'year4', 'win are became', 'more you view it  and read more that subject it good thing fot win', NULL, 'math', 1, '2026-08-20 23:01:44');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'general',
  `document_type` enum('contract','certificate','letter','policy','report','other') NOT NULL,
  `storage_key` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL,
  `visibility` enum('public','admin','dos','staff','parent','student') NOT NULL DEFAULT 'admin',
  `uploaded_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category` varchar(100) NOT NULL,
  `budget_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(180) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `comparison` enum('greater','equal','less') NOT NULL DEFAULT 'equal',
  `reason` text DEFAULT NULL,
  `evidence_photo_url` varchar(255) DEFAULT NULL,
  `evidence_document_url` varchar(255) DEFAULT NULL,
  `evidence_video_url` varchar(255) DEFAULT NULL,
  `spent_at` date NOT NULL,
  `recorded_by` int(10) UNSIGNED NOT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `document_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `budget_status` enum('greater','equal','less') NOT NULL DEFAULT 'less'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `category`, `budget_id`, `description`, `amount`, `comparison`, `reason`, `evidence_photo_url`, `evidence_document_url`, `evidence_video_url`, `spent_at`, `recorded_by`, `photo_url`, `document_url`, `video_url`, `budget_status`) VALUES
(1, 'buy book', NULL, 'for buy the book on', 10000.00, 'equal', NULL, NULL, NULL, NULL, '2026-08-25', 1, NULL, NULL, NULL, 'less'),
(2, 'buy book', NULL, 'on  process of buy the  school books', 500.00, 'equal', NULL, NULL, NULL, NULL, '2026-08-26', 1, NULL, NULL, NULL, 'less'),
(3, 'transport', NULL, 'transiport of  headteacher', 3000.00, 'equal', NULL, NULL, NULL, NULL, '2026-08-26', 1, NULL, NULL, NULL, 'less'),
(4, 'transport', NULL, 'the bus of student  visting  nyungwe forest', 3000.00, 'equal', NULL, NULL, NULL, NULL, '2026-08-26', 1, NULL, NULL, NULL, 'less');

-- --------------------------------------------------------

--
-- Table structure for table `feeding_records`
--

CREATE TABLE `feeding_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `feeding_date` date NOT NULL,
  `served` tinyint(1) NOT NULL DEFAULT 1,
  `meal_type` varchar(60) NOT NULL,
  `recorded_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feeding_stock`
--

CREATE TABLE `feeding_stock` (
  `id` int(10) UNSIGNED NOT NULL,
  `item_name` varchar(120) NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(30) NOT NULL,
  `reorder_level` decimal(12,2) NOT NULL DEFAULT 0.00,
  `updated_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fees`
--

CREATE TABLE `fees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reference` varchar(80) NOT NULL,
  `paid_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fees`
--

INSERT INTO `fees` (`id`, `student_id`, `amount`, `reference`, `paid_at`) VALUES
(1, 2, 5000.00, '2', '2026-08-25 09:35:06'),
(3, 2, 400.00, '3', '2026-08-25 09:37:52'),
(4, 1, 30000.00, '21', '2026-08-25 09:48:18'),
(5, 4, 200000.00, '213', '2026-08-25 09:49:32'),
(6, 4, 40000.00, '29301', '2026-08-26 14:50:19'),
(8, 1, 400000.00, '3030', '2026-08-26 15:28:06'),
(9, 13, 2000.00, '3000', '2026-09-02 11:15:39'),
(10, 15, 20000.00, '30002', '2026-09-02 14:17:54');

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

CREATE TABLE `grades` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `assessment_name` varchar(120) NOT NULL,
  `score` decimal(7,2) NOT NULL,
  `max_score` decimal(7,2) NOT NULL,
  `recorded_by` int(10) UNSIGNED NOT NULL,
  `academic_year_id` int(10) UNSIGNED DEFAULT NULL,
  `term_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `grades`
--

INSERT INTO `grades` (`id`, `student_id`, `subject_id`, `assessment_name`, `score`, `max_score`, `recorded_by`, `academic_year_id`, `term_id`, `created_at`) VALUES
(1, 17, 23, 'english Unit 2: Classroom objects Test', 4.00, 18.00, 39, NULL, NULL, '2026-09-14 16:08:31'),
(5, 15, 4, 'Term 1 report', 60.00, 100.00, 39, NULL, NULL, '2026-09-14 17:12:04');

-- --------------------------------------------------------

--
-- Table structure for table `homework`
--

CREATE TABLE `homework` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `class_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `due_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(140) NOT NULL,
  `category` varchar(80) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `location` varchar(100) DEFAULT NULL,
  `updated_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `name`, `category`, `quantity`, `reorder_level`, `unit_cost`, `location`, `updated_by`) VALUES
(1, 'abook', 'news', 0, 2, 20000.00, 'hoteri', 12),
(2, 'bean', 'general', 8, 30, 2000000.00, NULL, 12);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_transactions`
--

CREATE TABLE `inventory_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `item_id` int(10) UNSIGNED NOT NULL,
  `type` enum('in','out') NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `moved_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_transactions`
--

INSERT INTO `inventory_transactions` (`id`, `item_id`, `type`, `quantity`, `note`, `moved_by`, `created_at`) VALUES
(1, 1, 'out', 20, 'for student reading', 12, '2026-09-04 08:51:08'),
(2, 1, 'out', 10, 'for student reading', 12, '2026-09-04 08:51:34'),
(3, 1, 'out', 19, 'jdhjjd', 12, '2026-09-04 08:52:24'),
(4, 2, 'out', 40, 'for school feeding', 12, '2026-09-04 08:54:57'),
(5, 2, 'out', 2, 'for used', 12, '2026-09-04 08:55:18');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `invoice_number` varchar(60) NOT NULL,
  `description` varchar(180) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('unpaid','partially_paid','paid','overdue') NOT NULL DEFAULT 'unpaid',
  `created_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `student_id`, `invoice_number`, `description`, `amount`, `due_date`, `status`, `created_by`) VALUES
(1, 2, '12345', 'for buy any things', 20000.00, '2026-08-25', 'unpaid', 1),
(5, 1, '394034', 'invoices', 30000.00, '2026-08-26', 'unpaid', 1),
(6, 2, '303010', 'school fees', 20000.00, '2026-08-26', 'unpaid', 1),
(7, 2, 'SCHOOL-2-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(8, 8, 'SCHOOL-8-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(9, 15, 'SCHOOL-15-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(10, 11, 'SCHOOL-11-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(11, 9, 'SCHOOL-9-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(12, 7, 'SCHOOL-7-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(13, 12, 'SCHOOL-12-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(14, 13, 'SCHOOL-13-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(15, 10, 'SCHOOL-10-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(16, 1, 'SCHOOL-1-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(17, 4, 'SCHOOL-4-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12),
(18, 3, 'SCHOOL-3-2026', 'School fees', 90000.00, '2026-09-02', 'unpaid', 12);

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `leave_type` enum('annual','sick','maternity','personal','other') NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `library_books`
--

CREATE TABLE `library_books` (
  `id` int(10) UNSIGNED NOT NULL,
  `isbn` varchar(30) DEFAULT NULL,
  `title` varchar(180) NOT NULL,
  `author` varchar(140) NOT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `available_quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `shelf` varchar(50) DEFAULT NULL,
  `created_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `library_loans`
--

CREATE TABLE `library_loans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `book_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `issued_at` date NOT NULL,
  `due_at` date NOT NULL,
  `returned_at` date DEFAULT NULL,
  `issued_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `news_posts`
--

CREATE TABLE `news_posts` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(220) NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'news',
  `description` text NOT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `event_date` date DEFAULT NULL,
  `published_by` int(10) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `news_posts`
--

INSERT INTO `news_posts` (`id`, `title`, `category`, `description`, `photo_url`, `video_url`, `event_date`, `published_by`, `created_at`) VALUES
(1, 'bamwe mubanabatsinze', 'general', 'Hari hashize iminsi itari mike abanyeshuri bo ku kigo cy’amashuri abanza rya \"Mizero\" bafite igihunga n’amatsiko menshi. Buri wese yibazaga niba azatsinda ikizamini gisoza amashuri abanza bitaga \"Ikiyizamini cya Leta\".Mu muhanda ugana ku kigo, agatsiko k’abana batatu b’incuti magara—Keza, Shema, na Gisa—kagiye kanyonyomba gahinda umushyitsi. Umutima wa buri wese waradihaga.\"Ese ntiwumva se, niba amatsinda yacu yarasohotse uyu munsi?\" Shema abaza bagenzi be, ijwi rye ririmo gutingitika.\"Humura Shema, twize cyane. Twakoraga imyitozo kugeza nijoro,\" Keza aramusubiza akomeza kumuremamo ikizere, nubwo na we yari afite ubwoba.Bakigera mu mbuga y’ishuri, basanze ababyeyi n’abanyeshuri benshi bakoraniye imbere y’icyapa cyamanitswemo amanota. Bamwe barasimbukaga bishimye, abandi bafite amarira mu maso. Umuyobozi w’ishuri yari ahagaze hafi aho afite urutonde mu ntoki.Gisa, wari ugufi mu bagenzi be, yanyonyombye mu kinyamashura cy’abantu n’akanyabugabo kenshi. Yageze imbere, nuko amaso ye agwa ku nshuro ya mbere ku mazina yabo.Yarikanze, arakuba, hanyuma asimbukira mu kirere yhuha umugoroba! \"Twatsinze! Twese twatsinze mu cyiciro cya mbere!\" Gisa akorera mu ijwi riranguruye.Keza na Shema birukanze bamugana, ndetse n’ababyeyi babo bari baje kubaherekeza biruka babasanganira. Ku rutonde, izina rya Keza ryardi riri ku mwanya wa mbere mu kigo cyose, agakurikirwa na Shema ndetse na Gisa.Mwarimu wabo w’imibare, uhora abakangurira gukora cyane, abasanga abagoboka mu ntoki afite akanyamuneza kenshi. \"Mwarakoze guhesha ishema ishuri ryacu. Umwete wanyu utanze umusaruro!\"Uwo mugoroba, mu kagari kabo habaye ibirori bito. Ababyeyi babo bafatanyije kubategurira umutsima n\'amata bishimira intsinzi. Abana bishimiye ko imvune z\'igihe cyo kwiga n\'ijoro zibyaye ibyishimo, ndetse batangira n\'urugendo rushya rwo kwitegura kujya mu mashuri yisumbuye bafite intego nshya z\'ubuzima.', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQA7QMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAAGAAMEBQcBAgj/xABCEAACAQMCAwYDBAYJAwUAAAABAgMABBEFIQYSMRMiQVFhcRSBkQcyobEVI0JDUsEzNFNiY5LR4fAWJHIlJoKy8f/EABsBAAIDAQEBAAAAAAAAAAAAAAIEAAEDBQYH/8QALhEAAgIBAwIEBQMFAAAAAAAAAAECAxEEEiETMQUiMkEGFDNxwSNRYSQ0gbHw/9oADAMBAAIRA', 'https://www.youtube.com/watch?v=KDu6da4rM9I', '2026-08-21', 9, '2026-08-21 00:16:09');

-- --------------------------------------------------------

--
-- Table structure for table `notices`
--

CREATE TABLE `notices` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `body` text NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'announcement',
  `audience` enum('all','teachers','parents','students') NOT NULL DEFAULT 'all',
  `published_by` int(10) UNSIGNED NOT NULL,
  `published_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notices`
--

INSERT INTO `notices` (`id`, `title`, `body`, `category`, `audience`, `published_by`, `published_at`) VALUES
(1, 'inama', 'murararitwe mwese', 'announcement', 'all', 9, '2026-08-21 00:48:28');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `recipient_id` int(10) UNSIGNED NOT NULL,
  `channel` enum('in_app','email','sms','whatsapp') NOT NULL DEFAULT 'in_app',
  `title` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `recipient_id`, `channel`, `title`, `message`, `sent_at`, `read_at`, `created_at`) VALUES
(1, 18, 'in_app', 'Conduct score updated', 'Your conduct score changed by -2. Current score: 98/100.', '2026-08-25 16:08:22', NULL, '2026-08-25 16:08:22'),
(2, 23, 'in_app', 'Conduct score updated', 'Your conduct score changed by -2. Current score: 98/100.', '2026-08-26 14:54:43', NULL, '2026-08-26 14:54:43'),
(3, 31, 'in_app', 'Conduct score updated', 'Your conduct score changed by -2. Current score: 98/100.', '2026-08-28 11:02:57', NULL, '2026-08-28 11:02:57'),
(4, 31, 'in_app', 'Conduct score updated', 'Your conduct score changed by -2. Current score: 96/100.', '2026-08-28 11:03:52', NULL, '2026-08-28 11:03:52'),
(5, 46, 'in_app', 'Conduct score updated', 'Your conduct score changed by -2. Current score: 98/100.', '2026-08-31 20:31:49', NULL, '2026-08-31 20:31:49');

-- --------------------------------------------------------

--
-- Table structure for table `otp_challenges`
--

CREATE TABLE `otp_challenges` (
  `id` char(36) NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `purpose` enum('login','password_reset') NOT NULL DEFAULT 'login',
  `code_hash` char(64) NOT NULL,
  `channel` enum('email','sms') NOT NULL,
  `destination_mask` varchar(190) NOT NULL,
  `expires_at` datetime NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `consumed_at` datetime DEFAULT NULL,
  `reset_verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `otp_challenges`
--

INSERT INTO `otp_challenges` (`id`, `user_id`, `purpose`, `code_hash`, `channel`, `destination_mask`, `expires_at`, `attempts`, `consumed_at`, `reset_verified_at`, `created_at`) VALUES
('04b76e44-6ebb-4475-a895-b6ae400d8382', 1, 'login', 'f8cc0f5cf34279da7c2910bf8c3e22f10d1e8b7b38bd1c08e9611ef03204662b', 'email', 'pa***@gmail.com', '2026-08-31 09:43:28', 0, '2026-08-31 09:39:53', NULL, '2026-08-31 07:38:28'),
('05774ed8-8954-4412-9757-45628658a0b1', 48, 'login', '05371f4e3d3b86b3e9bd1fc1918373e5dc9a8dd1e9cfdbdabae40d38fb422656', 'email', 'ns***@gmail.com', '2026-09-14 12:09:50', 0, '2026-09-14 12:06:04', NULL, '2026-09-14 10:04:50'),
('074a737d-3c0c-455d-b04b-45fae539e98e', 1, 'login', '406e82c77cdb0becc8f58840ddcc7c8c480be1b0df47b38eb9570e84a72fcfe8', 'email', 'pa***@gmail.com', '2026-09-04 20:59:14', 0, '2026-09-04 20:54:46', NULL, '2026-09-04 18:54:14'),
('0822219c-71ec-4f8f-a0f0-df0b6684e154', 48, 'login', '77bb80fd23bc69f8902511a6f7f586cb3927509614283d8265732808374ca9f9', 'email', 'ns***@gmail.com', '2026-09-14 12:16:20', 0, NULL, NULL, '2026-09-14 10:11:20'),
('0830b582-64b2-4ceb-8482-4ec95450225f', 12, 'login', '8191f5f6ec82916af63574adf4c5b4e563265e9f9fbb09c8262bf063f284bf0f', 'email', 'pa***@gmail.com', '2026-09-02 20:19:48', 0, '2026-09-02 20:20:36', NULL, '2026-09-02 18:14:48'),
('08c65f51-ab72-4be5-91cb-cefb8f7e55c2', 1, 'login', 'cdd305a5e45ba331daeee170a97cf932d8b621724574ef21070685c97dff7ee7', 'email', 'pa***@gmail.com', '2026-09-09 19:37:57', 0, '2026-09-09 19:34:35', NULL, '2026-09-09 17:32:57'),
('0fbc38ed-ae8a-4c81-ae58-7f93cec18498', 1, 'login', '080d2122905260ba34e5c496d9a44d027ea3c98eb48ca4e8e2142f52b50af235', 'email', 'pa***@gmail.com', '2026-09-11 13:56:34', 0, '2026-09-11 14:23:59', NULL, '2026-09-11 11:51:35'),
('1381b828-a3d8-4a89-8e93-e765104486a2', 12, 'login', '20432acb1efe4ea171a7343ff42f1ea7a16c73ae5a25fdfdd9437af06b237687', 'email', 'pa***@gmail.com', '2026-09-02 20:25:36', 0, '2026-09-02 20:21:37', NULL, '2026-09-02 18:20:36'),
('166bba39-c079-477b-8871-648ff55f4426', 42, 'login', '00ce5327eb8f3aa7015efbff5de5aee2bc2ed3bc054c314d08ae852bbe3db5d1', 'email', 'ns***@gmail.com', '2026-08-31 09:48:11', 0, '2026-08-31 09:44:25', NULL, '2026-08-31 07:43:11'),
('1b633218-a278-42ad-ba9b-cce2c5fe22cb', 9, 'login', '8ef35f8d8c33c36cdd944293b14e61b9c8253c6186a1893fff4eb96c9a762e90', 'email', 'se***@gmail.com', '2026-08-24 13:35:09', 0, '2026-08-24 13:30:28', NULL, '2026-08-24 11:30:09'),
('212984b2-42d2-4da2-90dc-cf92abc18951', 42, 'login', '0d12a3ff1097fa447b147f1b952b850761ef18faa8e2ea3c3b96b8a737bc0e0b', 'email', 'ns***@gmail.com', '2026-09-11 14:39:25', 0, '2026-09-11 14:36:38', NULL, '2026-09-11 12:34:25'),
('2607aa44-8d6f-40fc-96b2-3689992ecfb4', 16, 'login', 'afc1beed480773337096ca608d443ca4f1c9776a1bf61254cbbac1ae834ff72a', 'email', 'ka***@gmail.com', '2026-08-24 15:31:21', 0, '2026-08-24 15:26:51', NULL, '2026-08-24 13:26:21'),
('2608538e-9b00-4654-bc18-5126bdfc9880', 12, 'login', '552334fe65ad50640ac25db07f75718d96dcf9c868b7c6acae6eeceb32d5932b', 'email', 'pa***@gmail.com', '2026-09-04 10:37:12', 0, '2026-09-04 10:33:07', NULL, '2026-09-04 08:32:12'),
('26e3ab35-ce66-45df-8e92-e782e7e80216', 1, 'login', 'b84b4a1b1422e1b6f5e1833cef9716727fcaccb77e9d102f3c326a9554752684', 'email', 'pa***@gmail.com', '2026-08-28 13:25:46', 0, '2026-08-31 09:38:28', NULL, '2026-08-28 11:20:46'),
('28aef1d3-cc36-4acf-9ad8-52715cbb703d', 42, 'login', '78b22a508dc9da090a7b0175a22fd487fa60fccfd03eaa39ae7214989f839207', 'email', 'ns***@gmail.com', '2026-08-31 22:13:49', 0, '2026-08-31 22:09:16', NULL, '2026-08-31 20:08:49'),
('2bebcb63-480e-4f18-b9d1-ff7de1d59a40', 9, 'login', '8adada7d08db828a15111911355e8a8eef9698aa2751930483b6290e71042b7a', 'email', 'se***@gmail.com', '2026-08-25 09:37:45', 0, '2026-08-25 09:33:01', NULL, '2026-08-25 07:32:45'),
('35bc95a1-f36f-47b7-86c0-e6ba2a479864', 39, 'login', '70db5745f74d593a83fcea13efa5b466c163b6c41266207be7faa66a16c961a6', 'email', 'ma***@gmail.com', '2026-08-31 19:37:19', 0, '2026-08-31 19:33:37', NULL, '2026-08-31 17:32:19'),
('35cbc0b9-61d4-410c-aa6c-a3e882cb3592', 1, 'login', '54e03e9d25106a40b52074e63db571e12f83601642d7443c4d43e7407c763c3f', 'email', 'pa***@gmail.com', '2026-09-14 19:54:44', 0, '2026-09-14 19:50:13', NULL, '2026-09-14 17:49:44'),
('3891eb44-52d5-4656-b0ef-f9eed1f4cad7', 9, 'login', '3618e89902312a0d604ead12bcb68e03a401ae1c8a7161ed90a2e59c96653122', 'email', 'se***@gmail.com', '2026-08-26 14:04:48', 0, '2026-08-26 14:00:26', NULL, '2026-08-26 11:59:48'),
('3bfeba49-cad5-492d-9d6f-3e88cf500e62', 1, 'login', '8a7290850c3256f67f839b4b15d04c2f29c46cf25a91d7bbbc7594778acb088b', 'email', 'pa***@gmail.com', '2026-08-31 19:18:42', 0, '2026-08-31 19:15:53', NULL, '2026-08-31 17:13:42'),
('3c9cb764-b9b2-4302-a5ed-c03a9842ecb7', 1, 'login', 'fc2d8e27008aa58f8deee8a5d3285338fc587fa0bdc122c3128a0727660d9920', 'email', 'pa***@gmail.com', '2026-08-28 12:37:16', 1, '2026-08-28 12:33:17', NULL, '2026-08-28 10:32:16'),
('3cc5f5c4-2c52-4143-a574-1440ee542e29', 42, 'login', '3a9c1050fcef2ccb98c948569e50667a3e0d6309efb88242df1c7a8706f13950', 'email', 'ns***@gmail.com', '2026-09-14 11:24:12', 0, '2026-09-14 11:20:10', NULL, '2026-09-14 09:19:12'),
('3cd8c6ab-a1d1-4c3d-959e-dc4433a477fc', 39, 'login', '199b15a7be389fb633cd156e7e3e2d11d7e81792e32dbc0e4afc10a9b969be39', 'email', 'ma***@gmail.com', '2026-08-28 13:37:45', 0, '2026-08-28 13:33:45', NULL, '2026-08-28 11:32:45'),
('402e3089-ef6f-462c-8736-9fbfb6a8fae3', 1, 'login', 'ddbdcae6bf4303763ad655f2ee01c63883d29934864d53381a7566da454dd238', 'email', 'pa***@gmail.com', '2026-08-24 13:32:35', 0, '2026-08-24 13:28:12', NULL, '2026-08-24 11:27:35'),
('40417222-8a5b-4000-9bed-5434e6304dd2', 42, 'login', '0d8db0ef28c953311a8261b774316e34cb52c2ec2007318fc1a94ddbacf5e040', 'email', 'ns***@gmail.com', '2026-09-14 11:11:35', 0, '2026-09-14 11:19:12', NULL, '2026-09-14 09:06:35'),
('47e8031f-da73-4e93-999c-97dd7fe4af34', 42, 'login', '5e36056e0beb37596a9d63bc681cdd0ff3670f2367fed6d03c98f960115352ba', 'email', 'ns***@gmail.com', '2026-08-31 09:49:25', 0, '2026-08-31 09:47:52', NULL, '2026-08-31 07:44:25'),
('4cdec73c-527d-4f5b-a22d-5f291166e5b2', 42, 'login', 'dde39dcb87603fdbee4ca7fa8567ccacce34dde85e6b5e724e8497bf47422de3', 'email', 'ns***@gmail.com', '2026-08-31 19:28:38', 0, '2026-08-31 19:24:39', NULL, '2026-08-31 17:23:38'),
('4d5b344d-5a67-495d-8be2-a0fe6cd2e176', 48, 'login', '3f86c0a18116bf5e95d9a3ec72841377d9660ace507c5b9104bdfe877da37d1b', 'email', 'ns***@gmail.com', '2026-09-02 20:30:14', 0, '2026-09-02 20:25:35', NULL, '2026-09-02 18:25:14'),
('4fc368d4-aefd-4c80-a46e-7a2a68b0a760', 39, 'login', '9ac6a8794ce6f675138af8afe10c60f1acae39918a456d1444424fb4d777c56d', 'email', 'ma***@gmail.com', '2026-09-14 13:16:15', 0, '2026-09-14 13:11:56', NULL, '2026-09-14 11:11:15'),
('536363a5-70a3-4fa5-9419-270bdadf4fd1', 1, 'login', '0493850dcb11f83af034f433ac74b5f26f2cac0a1d94b47f1798630e322ad714', 'email', 'pa***@gmail.com', '2026-08-28 12:35:48', 0, '2026-08-28 12:32:16', NULL, '2026-08-28 10:30:48'),
('5424ce20-b7d2-49a9-967f-1b418cb0b3e9', 39, 'login', '28d3457935812827392d04f5141610670af58df8fbbd2b0b16d4eddcd81cdea1', 'email', 'ma***@gmail.com', '2026-08-31 10:53:56', 0, '2026-08-31 10:50:00', NULL, '2026-08-31 08:48:56'),
('553946a2-c7c7-4f41-adc8-ed96e357c761', 42, 'login', '27922223eba7141265dfab517b10515775f533b98668ca7edc0dfba891b6fd51', 'email', 'ns***@gmail.com', '2026-09-01 12:15:14', 0, '2026-09-01 12:10:52', NULL, '2026-09-01 10:10:14'),
('5c40624c-0235-4d25-bfa0-89f856eba320', 1, 'login', '4fba9d827e3c2736a17108b78869ed96db93165a4d603689a0d6d58d5287ca39', 'email', 'pa***@gmail.com', '2026-09-04 10:35:01', 0, '2026-09-04 10:30:56', NULL, '2026-09-04 08:30:01'),
('5d9ac9e3-9ff8-479c-a04c-bbbf32a4ca32', 42, 'login', '874e5800fcdaa6b91d4b20ef3ab480e55bdecf4020fbadc10ea46a14682d45ca', 'email', 'ns***@gmail.com', '2026-08-31 22:35:47', 0, '2026-08-31 22:31:27', NULL, '2026-08-31 20:30:47'),
('5f69ca85-3e26-4761-94fe-318a15029231', 1, 'login', 'ad7efa1291cf99a46384a79a3f1d5a0a367eec17685c1db1afefee2267312aa4', 'email', 'pa***@gmail.com', '2026-09-11 14:28:59', 0, '2026-09-11 14:31:12', NULL, '2026-09-11 12:24:00'),
('5fc16af2-6917-41d0-9bc8-a542b046400e', 39, 'login', '3e7276aa5f27fb9db4440978e5d26bfd484db70723512863ca617b0c82813ec7', 'email', 'ma***@gmail.com', '2026-08-31 20:58:22', 0, '2026-08-31 20:57:10', NULL, '2026-08-31 18:53:22'),
('5fe936b3-1712-41ea-91ce-4733abb1793b', 1, 'login', '0e6946298bbc372bcfa729ad0eca09808ee146d2c00c52bf436ce1415b741e1e', 'email', 'pa***@gmail.com', '2026-09-07 11:26:24', 0, '2026-09-07 11:22:16', NULL, '2026-09-07 09:21:24'),
('6121efd3-7c89-483a-a1b5-cc618e56fd31', 9, 'login', 'ee09b9b7ac227ce451a060967399d1c943371c4942f612a18d764581bca5b48f', 'email', 'se***@gmail.com', '2026-08-21 02:04:05', 0, '2026-08-21 02:01:19', NULL, '2026-08-20 23:59:05'),
('630feedc-5001-47ec-b0a9-bea3ee21046b', 1, 'login', '4369119051e5d614818e219081c9d322c102e75bf518fc68361d97363c2bb121', 'email', 'pa***@gmail.com', '2026-08-26 17:30:55', 0, '2026-08-26 17:26:26', NULL, '2026-08-26 15:25:55'),
('6b8ad85b-c04f-4689-8304-fd297bc9fe56', 1, 'login', '55dd5cf7966c2544e06e32c1f17ad4b93d6daaaf135d2ec241c9fd1becfec6c2', 'email', 'pa***@gmail.com', '2026-09-05 14:39:03', 0, '2026-09-05 14:36:30', NULL, '2026-09-05 12:34:03'),
('6db01b6c-0cb6-48ac-9130-6c77e0c9cd31', 1, 'login', 'e062d37385bfc3e355d720cbe0651f1fdf701eb1ee78ec80c477d4782f6fd63e', 'email', 'pa***@gmail.com', '2026-08-28 12:38:17', 0, '2026-08-28 12:34:43', NULL, '2026-08-28 10:33:17'),
('71f22ed5-ce57-4f8a-91ab-37bcb485afbe', 1, 'login', 'fcbd7d32b7eecabdeaac91f6ffef795489fd463072188704d17d9e6c98e69724', 'email', 'pa***@gmail.com', '2026-09-01 13:06:01', 0, '2026-09-01 13:02:19', NULL, '2026-09-01 11:01:01'),
('74b961f1-24eb-46bc-b955-7ffdc1a52a3c', 1, 'login', '9309918667f078dd1ae9a3d0d651cce72f6739c59bee638f90fb2746d463caf9', 'email', 'pa***@gmail.com', '2026-09-14 09:50:57', 0, '2026-09-14 09:46:33', NULL, '2026-09-14 07:45:57'),
('75fea9c5-1e23-4880-a225-4fb71de1a811', 12, 'login', 'dd56b551b38fa128a47c4de9ef597adc59ce5544e743fd45590a3e92d29f2b4d', 'email', 'pa***@gmail.com', '2026-09-02 10:47:44', 1, '2026-09-02 10:44:50', NULL, '2026-09-02 08:42:44'),
('783ca1a6-84b5-41cf-8133-c1ebe1235ef8', 1, 'login', 'edf2a3849ffbb4dcc78af9154510f330b55999852bec9ade295d1195f6adafae', 'email', 'pa***@gmail.com', '2026-09-02 20:20:18', 0, '2026-09-02 20:10:42', NULL, '2026-09-02 18:15:18'),
('7b642852-664c-4a71-89f6-03351608f1cb', 1, 'login', '1e4ed45d2b245d4bf6a239cb3806ce858a6d25b73c1d6124d14d95a91f3cd388', 'email', 'pa***@gmail.com', '2026-09-11 14:36:12', 0, '2026-09-11 14:32:32', NULL, '2026-09-11 12:31:12'),
('7ffea9c4-4ea6-4a6e-8ab1-563f3fb164c2', 1, 'login', '2d9aac008aa4bd221752b3aeac2441db6d92ffd4479cf3850717d9a70ba59064', 'email', 'pa***@gmail.com', '2026-08-22 11:48:00', 0, '2026-08-22 11:43:29', NULL, '2026-08-22 09:43:00'),
('844af494-2bfd-4c6d-ae3c-0e7e5756a6c3', 1, 'login', '1ec1c1bb66e87647977efadf4bebf168addb591d06703919dad8649c0b049d6f', 'email', 'pa***@gmail.com', '2026-09-14 09:47:44', 0, '2026-09-14 09:45:57', NULL, '2026-09-14 07:42:44'),
('89c2b4cb-b523-4359-8552-8742aa0f4b37', 1, 'login', '03edef67feb2b29c915819f40a0085792a4050467ccfa361e7783bcf49e92776', 'email', 'pa***@gmail.com', '2026-08-31 20:56:02', 0, '2026-08-31 20:51:34', NULL, '2026-08-31 18:51:02'),
('8f9c9daa-47ff-4f25-88e0-a021992067bb', 16, 'login', '000ea71c717db95925e0b5d03d5b94c8034ef0d98b203090c9792577f8ae99fe', 'email', 'ka***@gmail.com', '2026-08-28 13:17:29', 0, NULL, NULL, '2026-08-28 11:12:30'),
('90309324-1575-4e74-8e9a-338c6a0c0e17', 48, 'login', 'fda65f35e1627841f3141652758a61ac562286d778187ea6f4be697af8e27759', 'email', 'ns***@gmail.com', '2026-09-14 12:11:04', 0, '2026-09-14 12:08:24', NULL, '2026-09-14 10:06:04'),
('9190bfbc-3d35-4f4b-ab42-4f2f4c13de0d', 1, 'login', '2f9d1cbd7db056f80f649e26b00ffd63dc4d7628f4c7ecc39ce737338f27f057', 'email', 'pa***@gmail.com', '2026-09-05 13:37:50', 0, '2026-09-05 13:33:01', NULL, '2026-09-05 11:32:50'),
('9863cc1e-8e14-4d13-8b05-b5cad1e2841a', 1, 'login', 'e3a332b5d6697b33d61784e9ccb809ce7c3f5b368497071d3ad8f7457b03c165', 'email', 'pa***@gmail.com', '2026-09-01 18:14:51', 0, '2026-09-01 18:12:11', NULL, '2026-09-01 16:09:51'),
('991177f7-d95c-4ba2-9a66-51aab0096f32', 1, 'login', '0f9a4b9d3695f6d891d0e99709d6727e5da88117547cd82a3f2d4131d977e6db', 'email', 'pa***@gmail.com', '2026-08-26 12:23:21', 0, '2026-08-26 12:18:47', NULL, '2026-08-26 10:18:21'),
('994edaba-ec9f-4b8d-aca8-a65997193687', 42, 'login', '5b8787951835a2b51ec5bca513762c4cd5e9d466be8053b51b2cd8c9e1b9e722', 'email', 'ns***@gmail.com', '2026-08-31 09:52:52', 0, '2026-08-31 09:51:24', NULL, '2026-08-31 07:47:52'),
('9c9dba87-d824-4794-9374-23e0ae9947c6', 1, 'login', '8d079405031abaf37ede3ee3459cae9db1b3694b5fa22ff546fa08d98f001cb7', 'email', 'pa***@gmail.com', '2026-09-01 12:12:28', 0, '2026-09-01 12:08:30', NULL, '2026-09-01 10:07:28'),
('9e3a0fcd-522a-439c-821b-dd1a6c50e70c', 1, 'login', 'fb208bcea5aaacc83542dbbba4c69014f0925c976e5980e5e6bdc0cefc60a71b', 'email', 'pa***@gmail.com', '2026-08-21 01:03:34', 0, '2026-08-21 00:58:48', NULL, '2026-08-20 22:58:34'),
('9eaed316-5338-482e-b951-e0fd4e37d16b', 1, 'login', 'caf05c9ca3ea75f6a1d128aef1625d46ff2e61ec812836402685aaa16623502c', 'email', 'pa***@gmail.com', '2026-09-04 20:17:11', 0, '2026-09-04 20:12:53', NULL, '2026-09-04 18:12:11'),
('9f80b376-ccef-4f06-b755-65bb90d2ff13', 9, 'login', 'ea50727180245570cdf58d0b602871976591f0c014b0a8d49c3947cf99112e59', 'email', 'se***@gmail.com', '2026-08-21 02:01:54', 0, '2026-08-21 01:57:59', NULL, '2026-08-20 23:56:54'),
('9ff8f540-12a9-4f4b-b434-2384d50a10fe', 1, 'login', '5ef0d614f7589444731922bbb0a7dcbc1b836fec193c5733895002e3db125f2d', 'email', 'pa***@gmail.com', '2026-09-01 12:07:01', 0, '2026-09-01 12:07:28', NULL, '2026-09-01 10:02:01'),
('a17aa1d4-84ff-4a14-b6e2-b5beda332197', 1, 'login', '54cfd6223e9598525f500a426e5b0d909832887f5cef8fe40d8670f31ed29379', 'email', 'pa***@gmail.com', '2026-08-26 17:48:53', 0, '2026-08-26 17:44:19', NULL, '2026-08-26 15:43:53'),
('a3db5a5e-8735-4897-b7db-a59fd02b9e36', 1, 'login', 'd502fc307322ace236c6c7a1c29b44a4c8034628d571e05cf235ac4494a0691e', 'email', 'pa***@gmail.com', '2026-08-26 17:09:32', 0, '2026-08-26 17:04:58', NULL, '2026-08-26 15:04:32'),
('a48707fb-9be5-4410-8b84-d69ba4759191', 16, 'login', 'c72aac2c395130e216545238e723f4c1dbc64f4610fba93f43ab995d3ac5dc80', 'email', 'ka***@gmail.com', '2026-08-25 10:23:23', 0, '2026-08-25 10:18:45', NULL, '2026-08-25 08:18:23'),
('a4ac6d49-c0de-4f97-b3b3-eb174e6f8469', 42, 'login', '2acf2fd374170ebc015db9d34e47490d0d1d7dd6385c8a8a40344a78e316cb82', 'email', 'ns***@gmail.com', '2026-09-05 16:01:38', 0, '2026-09-05 15:57:17', NULL, '2026-09-05 13:56:38'),
('a76cdbb0-12c5-4060-b28c-761ce721e18d', 39, 'login', '9737e5f85f06495e9212faa2218bad5cde9f8bc9c8a99c8efdbe3b220627835e', 'email', 'ma***@gmail.com', '2026-09-01 16:18:07', 0, '2026-09-01 16:13:45', NULL, '2026-09-01 14:13:07'),
('a825f116-fa7a-4b46-8c85-7626213f4949', 1, 'login', '3970b005972097012bcddc6dfbe8ffff483d6d9aed3b965fa93dae2da39d52b1', 'email', 'pa***@gmail.com', '2026-08-27 01:54:25', 0, '2026-08-27 01:49:52', NULL, '2026-08-26 23:49:25'),
('a8c40c66-4ef5-4872-bd5e-fa0e9a28ca28', 1, 'login', 'a67a06ee925798b181b3ac8324e72b0cbca474c3d23a92b0793603d4cb6b3b2e', 'email', 'pa***@gmail.com', '2026-08-26 17:28:15', 0, '2026-08-26 17:25:55', NULL, '2026-08-26 15:23:15'),
('a9b57a65-6019-48e6-8ca5-5642a5c5aa47', 1, 'login', '8e1fba2f4ed2c68f3488c5bcdce578ef131da0be4dd3303bd7a3be7bf9ddc159', 'email', 'pa***@gmail.com', '2026-09-05 13:38:01', 0, '2026-09-05 14:34:03', NULL, '2026-09-05 11:33:01'),
('aa279ab6-3ca7-4b82-9996-7e8ad6d96480', 1, 'login', '4d7ba71e21ff6709741dbb1d5c6ae6e6f4b5beba3f376a76ee879cbff281181e', 'email', 'pa***@gmail.com', '2026-09-02 20:15:42', 0, '2026-09-02 20:12:55', NULL, '2026-09-02 18:10:42'),
('af2d80f6-32b2-4e75-bd47-918c917bb4cb', 1, 'login', 'ffea267dc98a368f01bb16ee5ff3991215a1a700a385116f733f674b9cd3a374', 'email', 'pa***@gmail.com', '2026-09-09 19:39:35', 0, '2026-09-11 13:51:34', NULL, '2026-09-09 17:34:35'),
('b3fb2294-0f12-4b49-bef5-cd679ce04f2f', 1, 'login', 'cd630eab922f4a4378c5b62a8017c7b5083782ac84f47814a6bedb8d040e4a5b', 'email', 'pa***@gmail.com', '2026-09-09 19:36:43', 0, '2026-09-09 19:32:57', NULL, '2026-09-09 17:31:43'),
('b5430af7-cfd3-46b8-b571-c2a3925698a2', 1, 'login', '25e4585d447fc4e233da95f309ccc5f6656b67ce45b862c720290f5677c2bcc0', 'email', 'pa***@gmail.com', '2026-08-25 10:21:17', 0, '2026-08-25 10:16:37', NULL, '2026-08-25 08:16:17'),
('b75eeaba-9d46-44ad-a74c-119d57f1b47c', 1, 'login', '49c15ea7a4a8adbd24aac635c47d384016df03131a5ebc1b82dd76ef73e74bd4', 'email', 'pa***@gmail.com', '2026-08-25 18:34:08', 0, '2026-08-25 18:29:32', NULL, '2026-08-25 16:29:08'),
('bdbff4d0-0956-4ac4-a228-c5b6315fe5d3', 42, 'login', '20fa7d64b6501f8fce426810e5cebd4e7890fde1e315d9c155d9148a5e23903a', 'email', 'ns***@gmail.com', '2026-08-31 19:22:41', 0, '2026-08-31 19:23:38', NULL, '2026-08-31 17:17:41'),
('bddf1bfc-c5fe-4c1b-9225-9ffcd0500223', 12, 'login', '49c75e0ed21e0b89c362f9a63c076788fb54f9ce689508dd506ea6b656f84851', 'email', 'pa***@gmail.com', '2026-08-25 11:45:08', 0, '2026-08-25 11:40:38', NULL, '2026-08-25 09:40:08'),
('c0291185-46eb-4f78-972c-ffb53b9edd7e', 1, 'login', '07378090354c9cc7451e7a7c656fe6b25282018d0f5370fb48b0524709a3630f', 'email', 'pa***@gmail.com', '2026-09-01 20:03:49', 0, '2026-09-01 19:59:51', NULL, '2026-09-01 17:58:49'),
('cdcad7bc-48c3-4055-a8d2-cd1fc26a2488', 1, 'login', '46aa0c25a81020d119ce5c2d59a9a2277e6230cace35f8ab819b7b9d34f2bd73', 'email', 'pa***@gmail.com', '2026-09-01 18:55:23', 0, '2026-09-01 19:58:49', NULL, '2026-09-01 16:50:25'),
('d95958fe-f3dd-4f9d-878f-29d6ae037cef', 48, 'login', '94b2488b76bf15d678bed1bbeefe3a4cdc334919e4b9fdbba4705cc8310b71d5', 'email', 'ns***@gmail.com', '2026-09-14 12:13:24', 1, '2026-09-14 12:11:20', NULL, '2026-09-14 10:08:24'),
('d9ff4e1a-0740-4e0b-8ba9-bc17cb7dbd15', 42, 'login', 'ab1e0060746fa270631559cba569de1ff079990bd21508a4f9c2826a80303c70', 'email', 'ns***@gmail.com', '2026-08-28 13:46:50', 0, '2026-08-28 13:43:10', NULL, '2026-08-28 11:41:50'),
('e71fa7f4-c3f7-4254-b736-890b8376c652', 16, 'login', 'da21a36bc69b330d1f5a4039e9bfa2f7377dc4aa49bc326c52f2603f3292a713', 'email', 'ka***@gmail.com', '2026-08-25 17:56:29', 0, '2026-08-25 17:52:01', NULL, '2026-08-25 15:51:29'),
('ee29c369-6711-4624-b90d-5947ac2d644e', 42, 'login', '7eb97e52830c1ffab1d1b4ea2f54c526a1c80cd45453f6bb33a24c55d30b6156', 'email', 'ns***@gmail.com', '2026-08-31 09:46:16', 2, '2026-08-31 09:43:11', NULL, '2026-08-31 07:41:16'),
('efbb7d7f-ae40-4aff-9482-3ccf105c4be9', 1, 'login', '8d159ed6eab3001fe04bb5c94b1cf77c6c87fe6d848ce728a3ccd818831d64cf', 'email', 'pa***@gmail.com', '2026-09-05 14:41:30', 0, '2026-09-05 14:38:06', NULL, '2026-09-05 12:36:30'),
('f08b05d2-5d21-4dd9-8d1e-f8300838275e', 42, 'login', 'e0fa1d75e5c6177d8200ceee6b80416e6a60f312a2b1b0432c848b4a71895fab', 'email', 'ns***@gmail.com', '2026-08-31 22:11:28', 3, '2026-08-31 22:08:49', NULL, '2026-08-31 20:06:29'),
('f3331ce9-40ba-4b58-9238-b6615290649e', 1, 'login', '8878787c477ef88d0a0110810909b8b33d09d555e824b7d3be62a4d5ca0ab284', 'email', 'pa***@gmail.com', '2026-09-02 10:40:07', 0, '2026-09-02 10:35:50', NULL, '2026-09-02 08:35:07'),
('f5a8d686-2f46-4072-99bc-e6a7365f3da4', 9, 'login', '450cf5b86bca8710552aac3375ad885b6fee96572afe16c817512b6f577fc5ff', 'email', 'se***@gmail.com', '2026-08-21 02:02:59', 0, '2026-08-21 01:59:05', NULL, '2026-08-20 23:57:59'),
('f5f3a1e9-4ecf-4b0c-80ac-cf21725c754c', 1, 'login', '66c81d12da39a4fa67fb0a81a05951261ad7bd22b687d928d815bd3c069949b2', 'email', 'pa***@gmail.com', '2026-08-26 17:02:41', 0, '2026-08-26 16:58:30', NULL, '2026-08-26 14:57:41'),
('f7853228-0de6-4719-8c93-672dfa262fbb', 1, 'login', 'b58fe08de8d31c1210b2940372b32eaa3d552755e6ba730a448fec5bd6478f0c', 'email', 'pa***@gmail.com', '2026-08-28 12:35:06', 0, '2026-08-28 12:30:48', NULL, '2026-08-28 10:30:06'),
('f81b73f3-eb15-4978-9dd4-d9700db56a82', 9, 'login', '2ae602792a78689921719299a6eb8cabb15c9916f0827aa3d34d285a2c6267bc', 'email', 'se***@gmail.com', '2026-08-21 02:06:19', 0, '2026-08-21 02:01:54', NULL, '2026-08-21 00:01:19'),
('fa3c60cd-df17-46f2-9644-43fb8e27115d', 1, 'login', 'd93a30fb36775cadc66c340b9ca34897d4ba2fe8c642c7086080b6d30782672b', 'email', 'pa***@gmail.com', '2026-08-26 17:25:18', 1, '2026-08-26 17:21:18', NULL, '2026-08-26 15:20:18'),
('fc924e73-5e12-4afd-9e6e-4029d59c0518', 9, 'login', '8590d96ca4896886179c7552bb452ff1e464d5ccf7af64ef421b89de0764b73e', 'email', 'se***@gmail.com', '2026-08-25 17:54:27', 0, '2026-08-25 17:49:45', NULL, '2026-08-25 15:49:27');

-- --------------------------------------------------------

--
-- Table structure for table `parent_students`
--

CREATE TABLE `parent_students` (
  `parent_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `relationship` varchar(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_records`
--

CREATE TABLE `payroll_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `period_month` date NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(12,2) NOT NULL,
  `status` enum('draft','approved','paid') NOT NULL DEFAULT 'draft',
  `approved_by` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_fee_settings`
--

CREATE TABLE `school_fee_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `class_name` varchar(120) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `updated_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendance`
--

CREATE TABLE `staff_attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent','late','leave') NOT NULL,
  `marked_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `admission_number` varchar(40) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `photo_key` varchar(255) DEFAULT NULL,
  `gender` enum('male','female','other') NOT NULL DEFAULT 'other',
  `birthday` date NOT NULL DEFAULT '2000-01-01',
  `academic_year` varchar(20) NOT NULL DEFAULT '2025/2026',
  `class_name` varchar(80) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `parent_phone` varchar(30) NOT NULL,
  `qr_token` char(36) NOT NULL,
  `status` enum('active','inactive','graduated') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `conduct_score` tinyint(3) UNSIGNED NOT NULL DEFAULT 100,
  `conduct_updated_at` timestamp NULL DEFAULT NULL,
  `graduation_date` date DEFAULT NULL,
  `graduated_cohort` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `admission_number`, `full_name`, `photo_key`, `gender`, `birthday`, `academic_year`, `class_name`, `date_of_birth`, `parent_phone`, `qr_token`, `status`, `created_at`, `conduct_score`, `conduct_updated_at`, `graduation_date`, `graduated_cohort`) VALUES
(1, 10, '1', 'keza', NULL, 'female', '2026-08-21', '2025/2026', 'p2A', NULL, '0793360920', 'bdeb3dd9-2f28-458d-ab47-16ebcc6292fa', 'active', '2026-08-20 23:32:30', 100, NULL, NULL, NULL),
(2, 17, '1111', 'abijuri', NULL, 'male', '2026-08-24', '2025/2026', '2025/2026', NULL, '07933606920', '9fb58578-6c17-4f4a-81f3-07ef44ba4412', 'active', '2026-08-24 13:24:09', 100, '2026-08-26 14:54:57', NULL, NULL),
(3, 18, '1234567', 'pacifique', 'http://localhost:4000/uploads/d8310acc03a20ec7eba0c8668df5bcab', 'male', '2026-08-24', '2025/2026', '2025/2026', NULL, '0793360920', '88fc1cc3-1c19-4739-b8a9-f3d9158ca475', 'active', '2026-08-24 15:40:13', 98, '2026-08-28 11:03:06', NULL, NULL),
(4, 23, '2324344', 'nyirabagenzi123', 'http://localhost:4000/uploads/09a02677bb106356ed732bdf680f9342', 'female', '2026-08-25', '2025/2026', 'p3', NULL, '0793360930', 'a3b2387d-be31-4d31-b643-8648954bd1fd', 'graduated', '2026-08-25 07:37:00', 98, '2026-08-26 14:54:43', '2026-08-26', '2027-2028'),
(7, 28, 'FK-2026-00002', 'iturihafi', NULL, 'male', '2026-08-26', '2029-2030', 'p5', NULL, '', '7d411107-d50c-4fd9-9c6b-f2bdfe82d257', 'active', '2026-08-26 21:49:55', 100, NULL, NULL, NULL),
(8, 29, 'FK-2026-00003', 'akingeneye', NULL, 'female', '2026-08-27', '2029-2030', 'p5', NULL, '', '6023c18a-0930-4194-ae29-670ab7c3d8af', 'active', '2026-08-26 23:32:44', 100, NULL, NULL, NULL),
(9, 30, 'FK-2026-00004', 'iradukunda', NULL, 'female', '2026-07-29', '2029-2030', 'p5', NULL, '', '777e78ab-fb43-4eb3-89fc-2e0e8805a03f', 'active', '2026-08-26 23:50:14', 100, NULL, NULL, NULL),
(10, 31, 'FK-2026-00005', 'iyakaremye', NULL, 'female', '2026-08-05', '2029-2030', 'p5', NULL, '', '58322278-8cb0-42a2-be4c-9ed1e366ca9d', 'active', '2026-08-26 23:59:50', 94, '2026-08-28 11:03:52', NULL, NULL),
(11, 32, 'FK-2026-00006', 'eizeye', NULL, 'female', '2026-08-27', '2029-2030', 'p5', NULL, '', '9d545e45-9806-448d-8ae2-14c9eb9d8011', 'active', '2026-08-27 00:12:43', 100, NULL, NULL, NULL),
(12, 33, 'FK-2026-00007', 'iturihafi rene', NULL, 'female', '2026-08-27', '2029-2030', 'p5', NULL, '', '76f50198-ff46-4ebc-98c5-6afe16225e26', 'active', '2026-08-27 00:31:56', 100, NULL, NULL, NULL),
(13, 34, 'FK-2026-00010', 'iyakaremwe app', NULL, 'female', '2026-08-05', '2029-2030', 'p5', NULL, '', '0efd3668-f93a-4499-87d2-da0356f30363', 'active', '2026-08-27 01:33:26', 100, NULL, NULL, NULL),
(15, 46, 'FK-2026-90373', 'ayinkamiye', NULL, 'male', '2026-08-18', '2029-2030', 's3c', NULL, '', 'd89c4eb9-c96c-43ff-b036-1bf042c21e4b', 'active', '2026-08-31 09:58:11', 96, '2026-08-31 20:31:49', NULL, NULL),
(17, 49, 'FK-2026-57016', 'irene', NULL, 'female', '2026-09-14', '2029-2030', 'primary1', NULL, '', '1cc74bb5-3fc7-40da-a35d-d07c3ed78135', 'active', '2026-09-14 11:44:17', 100, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_classes`
--

CREATE TABLE `student_classes` (
  `student_id` int(10) UNSIGNED NOT NULL,
  `class_id` int(10) UNSIGNED NOT NULL,
  `enrolled_at` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_classes`
--

INSERT INTO `student_classes` (`student_id`, `class_id`, `enrolled_at`) VALUES
(3, 2, '2026-08-24'),
(4, 2, '2026-08-25'),
(15, 25, '2026-08-31'),
(17, 26, '2026-09-14');

-- --------------------------------------------------------

--
-- Table structure for table `student_promotions`
--

CREATE TABLE `student_promotions` (
  `id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `academic_year_id` int(10) UNSIGNED NOT NULL,
  `from_level` varchar(80) NOT NULL,
  `to_level` varchar(80) DEFAULT NULL,
  `action` enum('promoted','retained','graduated') NOT NULL,
  `promoted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `promotion_notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_promotions`
--

INSERT INTO `student_promotions` (`id`, `student_id`, `academic_year_id`, `from_level`, `to_level`, `action`, `promoted_at`, `promotion_notes`, `created_by`) VALUES
(1, 1, 9, 'p2A', 'p2A', 'retained', '2026-08-26 11:45:23', NULL, 1),
(2, 2, 9, 's2', '2025/2026', 'promoted', '2026-08-26 11:45:23', NULL, 1),
(3, 3, 9, 'p3', '2025/2026', 'promoted', '2026-08-26 11:45:23', NULL, 1),
(4, 4, 9, 'p3', NULL, 'graduated', '2026-08-26 11:45:23', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `student_transport`
--

CREATE TABLE `student_transport` (
  `student_id` int(10) UNSIGNED NOT NULL,
  `route_id` int(10) UNSIGNED NOT NULL,
  `pickup_point` varchar(160) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_transport`
--

INSERT INTO `student_transport` (`student_id`, `route_id`, `pickup_point`) VALUES
(7, 1, 'kagarama');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(30) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `code`, `is_active`) VALUES
(1, 'Mathematics', '12', 1),
(2, 'Mathematics', 'MATHEMAT', 1),
(3, 'Kinyarwanda:', 'KINYARWA', 1),
(4, 'English', 'ENGLISH', 1),
(5, 'SET', 'SET', 1),
(6, 'SST', 'SST', 1),
(7, 'Creative Arts', 'CREATIVE', 1),
(8, 'PES', 'PES', 1),
(9, 'French', 'FRENCH', 1),
(10, 'math', 'MATH', 1),
(11, 'kiny', 'KINY', 1),
(13, 'ikinyarwanda', 'IKINYARW', 1),
(20, 'english', '23444556', 1),
(21, 'french', '667', 1),
(22, 'ikinyarwanda', '5456', 1),
(23, 'english', '12345', 1),
(24, 'math', '5T5', 1);

-- --------------------------------------------------------

--
-- Table structure for table `subject_modules`
--

CREATE TABLE `subject_modules` (
  `id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subject_modules`
--

INSERT INTO `subject_modules` (`id`, `subject_id`, `teacher_id`, `title`, `description`, `image_url`, `created_at`, `updated_at`) VALUES
(1, 20, 42, 'unit1:read english', 'improve you skill on reading english', 'http://localhost:4000/uploads/6f8d9c970734531524cf6b90124cd9b9', '2026-08-31 15:11:20', '2026-08-31 15:11:20'),
(2, 22, 42, 'igice cyambere :ubumenyi bururimi', 'whdhwsudjiskoxooxlsjicjsixks', 'http://localhost:4000/uploads/aa4c62a0557e0e1f2a3decf391f374d6', '2026-09-01 10:12:23', '2026-09-01 10:12:23');

-- --------------------------------------------------------

--
-- Table structure for table `subject_module_notes`
--

CREATE TABLE `subject_module_notes` (
  `id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `module_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(180) NOT NULL,
  `header` text NOT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  `note_type` varchar(30) NOT NULL DEFAULT 'note',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subject_module_notes`
--

INSERT INTO `subject_module_notes` (`id`, `subject_id`, `module_id`, `teacher_id`, `name`, `header`, `file_url`, `mime_type`, `file_size`, `note_type`, `created_at`, `updated_at`) VALUES
(1, 20, 1, 42, 'read', 'read more and  write for more skil', 'http://localhost:4000/uploads/b1482e7550647d27f0af4741239c940b', 'application/pdf', 453764, 'document', '2026-08-31 15:16:09', '2026-08-31 15:16:09');

-- --------------------------------------------------------

--
-- Table structure for table `subject_notes`
--

CREATE TABLE `subject_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(160) NOT NULL,
  `header` text DEFAULT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `file_size` bigint(20) UNSIGNED DEFAULT NULL,
  `note_type` enum('note','document','video') NOT NULL DEFAULT 'note',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teacher_assignments`
--

CREATE TABLE `teacher_assignments` (
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `class_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teacher_assignments`
--

INSERT INTO `teacher_assignments` (`teacher_id`, `class_id`, `subject_id`) VALUES
(16, 1, 1),
(16, 2, 2),
(16, 2, 9),
(42, 25, 20),
(42, 25, 21),
(42, 25, 22),
(42, 26, 23);

-- --------------------------------------------------------

--
-- Table structure for table `teacher_profiles`
--

CREATE TABLE `teacher_profiles` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `employee_number` varchar(40) NOT NULL,
  `qr_token` char(36) NOT NULL,
  `national_id` varchar(40) DEFAULT NULL,
  `contract_type` enum('permanent','temporary','part_time') NOT NULL DEFAULT 'permanent',
  `contract_start` date DEFAULT NULL,
  `contract_end` date DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `diploma_key` varchar(255) DEFAULT NULL,
  `subject_or_module` varchar(160) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teacher_profiles`
--

INSERT INTO `teacher_profiles` (`user_id`, `employee_number`, `qr_token`, `national_id`, `contract_type`, `contract_start`, `contract_end`, `salary`, `gender`, `birthday`, `diploma_key`, `subject_or_module`) VALUES
(16, 'EMP-16', 'eab99c5b-4b94-4c92-bf81-d5aad217b896', NULL, 'permanent', NULL, NULL, NULL, 'female', '2026-08-25', NULL, 'math'),
(42, 'EMP-42', '08484754-0620-44fd-a863-7eddf02f8c61', NULL, 'permanent', NULL, NULL, NULL, 'male', '2026-08-14', NULL, 'math');

-- --------------------------------------------------------

--
-- Table structure for table `tests`
--

CREATE TABLE `tests` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(180) NOT NULL,
  `class_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `duration_minutes` smallint(5) UNSIGNED NOT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL COMMENT 'Test description/instructions for students',
  `is_draft` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Flag to indicate if test is still being edited',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Test creation timestamp',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Last update timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tests`
--

INSERT INTO `tests` (`id`, `title`, `class_id`, `subject_id`, `teacher_id`, `duration_minutes`, `starts_at`, `ends_at`, `is_published`, `description`, `is_draft`, `created_at`, `updated_at`) VALUES
(2, 'math', 2, 2, 16, 2, NULL, NULL, 1, 'welcome', 0, '2026-08-24 15:48:36', '2026-08-24 15:54:19'),
(3, 'fill', 2, 2, 16, 3, NULL, NULL, 1, 'wellcome', 0, '2026-08-24 16:13:27', '2026-08-24 16:14:55'),
(4, 'frence', 2, 9, 16, 2, NULL, NULL, 1, 'do it to complete you test', 0, '2026-08-24 16:22:59', '2026-08-24 16:25:57'),
(5, 'ahshusjdiwsjksol', 2, 9, 16, 60, NULL, NULL, 1, 'idjeikdfel', 0, '2026-08-24 16:38:48', '2026-08-24 16:46:45'),
(6, 'storong', 2, 2, 16, 60, NULL, NULL, 1, 'wdefrt', 0, '2026-08-24 17:13:51', '2026-08-24 17:20:36'),
(7, 'math', 2, 2, 16, 36, NULL, NULL, 0, 'man', 1, '2026-08-25 08:19:36', '2026-08-25 08:19:36'),
(8, 'wewefrtrg', 2, 2, 16, 60, NULL, NULL, 0, 'sdefef', 1, '2026-08-25 08:26:42', '2026-08-25 08:26:42'),
(9, 'french test', 2, 9, 16, 4, '2026-08-25 09:25:00', '2026-08-25 09:29:00', 1, 'impove', 0, '2026-08-25 08:40:30', '2026-08-25 07:26:41'),
(10, 'french', 2, 9, 16, 60, NULL, NULL, 0, 'as win', 1, '2026-08-25 08:05:15', '2026-08-25 08:05:15'),
(11, 'bcjdsxaks', 2, 2, 16, 60, NULL, NULL, 0, 'jnxsjxijskox', 1, '2026-08-25 08:53:33', '2026-08-25 08:53:33'),
(12, 'reading care full', 25, 20, 1, 30, NULL, NULL, 1, NULL, 1, '2026-08-31 19:26:53', '2026-08-31 19:26:53'),
(13, 'isuzuma', 25, 22, 42, 60, NULL, NULL, 1, 'kumenya urugero abanyeshuri bagezeho', 0, '2026-09-01 10:31:46', '2026-09-01 10:51:51'),
(14, 'english Unit 2: Classroom objects Test', 26, 23, 42, 10, '2026-09-14 13:41:00', NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 11:39:51', '2026-09-14 11:41:57'),
(15, 'english Unit 6: Classroom objects and personal belongings Test', 26, 23, 42, 60, NULL, NULL, 0, 'AI-reviewed assessment for p1.', 1, '2026-09-14 11:51:24', '2026-09-14 11:51:24'),
(16, 'english Unit 6: Classroom objects and personal belongings Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 11:55:33', '2026-09-14 11:56:24'),
(17, 'english Unit 2: Classroom objects Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for primary1.', 0, '2026-09-14 12:38:52', '2026-09-14 12:39:34'),
(18, 'english Unit 2: Classroom objects Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 12:53:22', '2026-09-14 12:54:05'),
(19, 'english Unit 2: Classroom objects Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 12:58:16', '2026-09-14 12:58:50'),
(20, 'english Unit 2: Classroom objects Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 13:08:59', '2026-09-14 13:09:29'),
(21, 'english Unit 5: Likes and dislikes Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 14:55:32', '2026-09-14 14:56:11'),
(22, 'english Unit 5: Likes and dislikes Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 15:45:40', '2026-09-14 15:45:58'),
(23, 'english Unit 5: Likes and dislikes Test', 26, 23, 42, 60, NULL, NULL, 1, 'AI-reviewed assessment for p1.', 0, '2026-09-14 15:57:39', '2026-09-14 15:57:58');

-- --------------------------------------------------------

--
-- Table structure for table `test_attempts`
--

CREATE TABLE `test_attempts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `test_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `started_at` datetime NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `score` decimal(7,2) DEFAULT NULL,
  `answers_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`answers_json`)),
  `status` enum('in_progress','submitted','expired') NOT NULL DEFAULT 'in_progress'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `test_attempts`
--

INSERT INTO `test_attempts` (`id`, `test_id`, `student_id`, `started_at`, `submitted_at`, `score`, `answers_json`, `status`) VALUES
(1, 2, 3, '2026-08-24 17:59:11', '2026-08-24 18:00:51', 0.00, NULL, 'submitted'),
(2, 3, 3, '2026-08-24 18:19:16', '2026-08-24 18:20:10', 0.00, NULL, 'submitted'),
(3, 4, 3, '2026-08-24 18:26:48', '2026-08-24 18:27:08', 0.00, NULL, 'submitted'),
(4, 5, 3, '2026-08-24 18:47:15', '2026-08-24 18:48:00', 0.00, NULL, 'submitted'),
(5, 6, 3, '2026-08-24 19:21:15', NULL, NULL, NULL, 'in_progress'),
(6, 5, 4, '2026-08-25 09:42:47', '2026-08-25 09:43:36', 0.00, NULL, 'submitted'),
(7, 4, 4, '2026-08-25 09:44:18', '2026-08-25 09:45:52', 0.00, NULL, 'submitted'),
(8, 14, 17, '2026-09-14 14:02:50', '2026-09-14 14:04:44', 2.00, NULL, 'submitted'),
(9, 16, 17, '2026-09-14 14:08:30', '2026-09-14 14:24:56', 2.00, NULL, 'submitted'),
(10, 17, 17, '2026-09-14 14:40:13', '2026-09-14 14:41:21', 4.00, NULL, 'submitted'),
(11, 18, 17, '2026-09-14 14:55:06', '2026-09-14 14:56:18', 4.00, NULL, 'submitted'),
(12, 19, 17, '2026-09-14 14:59:37', '2026-09-14 15:00:09', 1.00, NULL, 'submitted'),
(13, 20, 17, '2026-09-14 15:11:10', '2026-09-14 15:14:29', 4.00, NULL, 'submitted'),
(14, 21, 17, '2026-09-14 16:57:29', '2026-09-14 17:08:04', 9.00, NULL, 'submitted'),
(15, 22, 17, '2026-09-14 17:47:20', '2026-09-14 17:47:50', 2.00, '{\"102\":[\"ball.\",\"book.\",\"pencil.\"],\"103\":\"e\",\"104\":\"like\"}', 'submitted'),
(16, 23, 17, '2026-09-14 17:58:45', '2026-09-14 17:58:56', 0.00, '{\"105\":\"a\",\"106\":\"I like mangoes.\"}', 'submitted');

-- --------------------------------------------------------

--
-- Table structure for table `test_progress`
--

CREATE TABLE `test_progress` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `test_id` int(10) UNSIGNED NOT NULL,
  `student_id` int(10) UNSIGNED NOT NULL,
  `started_at` datetime NOT NULL,
  `last_activity_at` datetime NOT NULL DEFAULT current_timestamp(),
  `current_question_index` smallint(5) UNSIGNED DEFAULT 0,
  `status` enum('not_started','in_progress','submitted','expired') NOT NULL DEFAULT 'not_started'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `test_questions`
--

CREATE TABLE `test_questions` (
  `id` int(10) UNSIGNED NOT NULL,
  `test_id` int(10) UNSIGNED NOT NULL,
  `question_order` smallint(5) UNSIGNED NOT NULL,
  `question_type` enum('choice','fill','match','drag','rearrange','open') NOT NULL,
  `prompt` text NOT NULL,
  `options_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options_json`)),
  `answer_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`answer_json`)),
  `points` decimal(6,2) NOT NULL DEFAULT 1.00,
  `is_draft` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag to indicate if question is still being edited'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `test_questions`
--

INSERT INTO `test_questions` (`id`, `test_id`, `question_order`, `question_type`, `prompt`, `options_json`, `answer_json`, `points`, `is_draft`) VALUES
(5, 2, 1, 'choice', '1+1', '[\"3\",\"2\",\"1\"]', '[\"2\"]', 1.00, 1),
(6, 2, 2, 'fill', '1+4=_____', '[]', '[\"5\"]', 1.00, 1),
(7, 2, 3, 'match', 'mach the number', '[\"o.1\",\"5000\",\"20\",\"200\"]', '[\"tens\",\"hundreds\",\"ones\",\"sathound\"]', 1.00, 1),
(8, 2, 4, 'rearrange', 'arrange the following', '[]', '[\"1\",\"2\",\"3\"]', 1.00, 1),
(9, 3, 1, 'choice', '30+30', '[\"30\",\"35\",\"60\"]', '[\"60\"]', 1.00, 1),
(10, 3, 2, 'choice', '30- 20', '[\"10\",\"15\"]', '[\"10\"]', 1.00, 1),
(11, 4, 1, 'choice', 'Comment dit-on \"Good morning\" en français ?', '[\"Bonsoir\",\"Merci\",\"Au revoir\",\"Bonjour\"]', '[\"Bonjour\"]', 1.00, 1),
(12, 4, 2, 'choice', 'Bonjour', '[\"5\",\"2\",\"7\"]', '[\"7\"]', 1.00, 1),
(13, 5, 1, 'fill', '1+2=____', '[]', '[\"2\"]', 1.00, 1),
(14, 5, 2, 'match', 'match', '[\"1\",\"10\",\"300\"]', '[\"are ones\",\"ten\",\"sathound\"]', 1.00, 1),
(15, 5, 3, 'rearrange', 'arrang the best way', '[]', '[\"1\",\"2\",\"3\",\"4\"]', 2.00, 1),
(16, 6, 1, 'choice', '1+2 =', '[\"3\",\"4\",\"5\"]', '[\"3\"]', 1.00, 1),
(17, 6, 2, 'fill', '20 -_____=4', '[]', '[\"16\"]', 1.00, 1),
(18, 6, 3, 'match', 'match', '[\"2\",\"four\",\"5\"]', '[\"tue\",\"4\",\"five\"]', 1.00, 1),
(19, 8, 1, 'choice', 'xnhcjcs dhidji sj furjgib9o4i9-0hig0-beiovno0r-9of-20', '[\"aaaaaaa\",\"asasasasas\"]', '[\"aaaaaaa\"]', 1.00, 1),
(20, 8, 2, 'fill', 'xhvdishciu lehiouwylgdx uyegfucyh_____', '[]', '[\"1\"]', 1.00, 1),
(21, 8, 3, 'match', 'fgehdhuwcj iferjij iuc siopexeio fpicwoei', '{\"leftItems\":[\"2\",\"4\",\"3\"],\"rightItems\":[\"two\",\"three\",\"four\"]}', '[\"two\",\"three\",\"four\"]', 1.00, 1),
(22, 9, 1, 'rearrange', 'arrange the things base on following step', '[\"2\",\"3\",\"4\"]', '[\"2\",\"3\",\"4\"]', 1.00, 1),
(23, 9, 2, 'choice', 'What is un chat in English', '[\"A) Dog\",\"B) Cat\"]', '[\"B) Cat\"]', 1.00, 1),
(24, 13, 1, 'choice', 'what is need', '[\"is same thing you must have\",\"is any thing include on earth\",\"act as an food\",\"is process of health\"]', '[\"is same thing you must have\"]', 2.00, 1),
(25, 13, 2, 'fill', 'what is day on  number ____', '[]', '[\"5\"]', 1.00, 1),
(26, 13, 3, 'match', 'match the following on', '{\"leftItems\":[\"god\",\"the saturn\",\"what is the development\"],\"rightItems\":[\"it occur on haven\",\"was  include on run eclipse\",\"is how to build the system\"]}', '[\"\",\"was  include on run eclipse\",\"is how to build the system\"]', 2.00, 1),
(27, 13, 4, 'drag', 'drag and drop on empt region', '[\"need\",\"whant\",\"good\"]', '[\"whant\"]', 1.00, 1),
(28, 13, 5, 'rearrange', 'arange the following  base on   correct answer', '[\"preparing the side\",\"establish the network connectivities\",\"develop the system\",\"test the software\"]', '[\"preparing the side\",\"establish the network connectivities\",\"develop the system\",\"test the software\"]', 2.00, 1),
(29, 14, 1, 'fill', 'Complete the word for the object we sit on: ch__ir.', '[]', '[\"a\"]', 1.00, 0),
(30, 14, 2, 'fill', 'This ______ a sharpener.', '[]', '[\"is\"]', 1.00, 0),
(31, 14, 3, 'drag', 'Drag the items into the correct boxes.', '[]', '[{\"Writing Tools\":[\"Pencil\",\"Pen\"],\"Classroom Furniture\":[\"Table\",\"Chair\"]}]', 4.00, 0),
(32, 14, 4, 'drag', 'Sort the letters into the correct buckets.', '[]', '[{\"Letters in \'bag\'\":[\"b\",\"a\",\"g\"],\"Letters NOT in \'bag\'\":[\"m\"]}]', 4.00, 0),
(33, 14, 5, 'drag', 'Put items in the correct bin.', '[]', '[{\"Keep in Desk\":[\"Book\",\"Pencil\"],\"Throw in Rubbish Bin\":[\"Pencil shavings\",\"Paper scraps\"]}]', 4.00, 0),
(34, 14, 6, 'match', 'Match the one item with many items.', '[\"One bag\",\"One ruler\"]', '[{\"One bag\":\"Three bags\",\"One ruler\":\"Two rulers\"}]', 2.00, 0),
(35, 14, 7, 'match', 'Match the word to its starting letter.', '[\"Pen\",\"Book\",\"Desk\"]', '[{\"Pen\":\"Starts with P\",\"Book\":\"Starts with B\",\"Desk\":\"Starts with D\"}]', 3.00, 0),
(36, 14, 8, 'choice', 'If you have more than one book, you say two ______.', '[\"book\",\"books\",\"bookes\",\"booking\"]', '[1]', 1.00, 0),
(37, 14, 9, 'choice', 'What do you use to clean a pencil mistake?', '[\"A sharpener\",\"A pen\",\"A rubber\",\"A table\"]', '[2]', 1.00, 0),
(38, 15, 1, 'match', 'Match the classroom question with the correct answer from the game.', '[\"Where is the classroom?\",\"How many books do you see?\",\"Is that your ruler?\"]', '[{\"Where is the classroom?\":\"It is over there.\",\"How many books do you see?\":\"I see three books.\",\"Is that your ruler?\":\"No, it is her ruler.\"}]', 3.00, 0),
(39, 15, 2, 'fill', 'Complete the word for an object used to keep your things: b__g.', '[]', '[\"a\"]', 1.00, 0),
(40, 15, 3, 'choice', 'If a friend asks \'Is this your bag?\' and it belongs to you, what do you say?', '[\"Yes, this is my bag.\",\"No, thank you.\",\"Goodbye, friend.\",\"I do not like bags.\"]', '[0]', 1.00, 0),
(41, 16, 1, 'match', 'Match the classroom question with the correct answer from the game.', '[\"Where is the classroom?\",\"How many books do you see?\",\"Is that your ruler?\"]', '[{\"Where is the classroom?\":\"It is over there.\",\"How many books do you see?\":\"I see three books.\",\"Is that your ruler?\":\"No, it is her ruler.\"}]', 3.00, 0),
(42, 16, 2, 'fill', 'Complete the word for an object used to keep your things: b__g.', '[]', '[\"a\"]', 1.00, 0),
(43, 16, 3, 'choice', 'If a friend asks \'Is this your bag?\' and it belongs to you, what do you say?', '[\"Yes, this is my bag.\",\"No, thank you.\",\"Goodbye, friend.\",\"I do not like bags.\"]', '[0]', 1.00, 0),
(44, 17, 1, 'choice', 'What do we use to write in a notebook?', '[\"A pen\",\"A chair\",\"A duster\",\"A cupboard\"]', '[0]', 1.00, 0),
(45, 17, 2, 'fill', 'This is ______ book.', '[]', '[\"a\"]', 1.00, 0),
(46, 17, 3, 'fill', 'P___n (An object used with ink to write)', '[]', '[\"e\"]', 1.00, 0),
(47, 17, 4, 'choice', 'What do we use to write in our exercise books?', '[\"A pencil\",\"A chair\",\"A window\",\"A door\"]', '[0]', 1.00, 0),
(48, 17, 5, 'choice', 'What do you sit on in the classroom?', '[\"A blackboard\",\"A chair\",\"A book\",\"A ruler\"]', '[1]', 1.00, 0),
(49, 17, 6, 'choice', 'Which tool helps you to draw straight lines?', '[\"A rubber\",\"A ruler\",\"A bag\",\"A desk\"]', '[1]', 1.00, 0),
(50, 17, 7, 'choice', 'Where does the teacher write lessons in the classroom?', '[\"On the floor\",\"On the blackboard\",\"On the school bag\",\"On the desk\"]', '[1]', 1.00, 0),
(51, 18, 1, 'choice', 'What do we use to write in a notebook?', '[\"A pen\",\"A chair\",\"A duster\",\"A cupboard\"]', '[0]', 1.00, 0),
(52, 18, 2, 'fill', 'This is ______ book.', '[]', '[\"a\"]', 1.00, 0),
(53, 18, 3, 'fill', 'P___n (An object used with ink to write)', '[]', '[\"e\"]', 1.00, 0),
(54, 18, 4, 'choice', 'What do we use to write in our exercise books?', '[\"A pencil\",\"A chair\",\"A window\",\"A door\"]', '[0]', 1.00, 0),
(55, 18, 5, 'choice', 'What do you sit on in the classroom?', '[\"A blackboard\",\"A chair\",\"A book\",\"A ruler\"]', '[1]', 1.00, 0),
(56, 18, 6, 'choice', 'Which tool helps you to draw straight lines?', '[\"A rubber\",\"A ruler\",\"A bag\",\"A desk\"]', '[1]', 1.00, 0),
(57, 18, 7, 'choice', 'Where does the teacher write lessons in the classroom?', '[\"On the floor\",\"On the blackboard\",\"On the school bag\",\"On the desk\"]', '[1]', 1.00, 0),
(58, 19, 1, 'fill', 'Complete the word for the object we sit on: ch__ir.', '[]', '[\"a\"]', 1.00, 0),
(59, 19, 2, 'fill', 'This ______ a sharpener.', '[]', '[\"is\"]', 1.00, 0),
(60, 19, 3, 'choice', 'If you have more than one book, you say two ______.', '[\"book\",\"books\",\"bookes\",\"booking\"]', '[1]', 1.00, 0),
(61, 19, 4, 'choice', 'What do you use to clean a pencil mistake?', '[\"A sharpener\",\"A pen\",\"A rubber\",\"A table\"]', '[2]', 1.00, 0),
(62, 20, 1, 'match', 'Match the classroom object with its description from page 19.', '{\"leftItems\":[\"This is a blue\",\"This is a yellow\",\"These are white\"],\"rightItems\":[\"ruler.\",\"pen.\",\"books.\"]}', '{\"This is a blue\":\"pen.\",\"This is a yellow\":\"ruler.\",\"These are white\":\"books.\"}', 3.00, 0),
(63, 20, 2, 'choice', 'What do we use to write in a notebook?', '[\"A pen\",\"A chair\",\"A duster\",\"A cupboard\"]', '[0]', 1.00, 0),
(64, 20, 3, 'fill', 'This is ______ book.', '[]', '[\"a\"]', 1.00, 0),
(65, 20, 4, 'fill', 'P___n (An object used with ink to write)', '[]', '[\"e\"]', 1.00, 0),
(66, 20, 5, 'drag', 'Where do these items belong?', '{\"items\":[\"Sharpener\",\"Blackboard\",\"Rubber\",\"Desk\"],\"groups\":[\"Inside the bag\",\"Outside the bag\"]}', '{\"Inside the bag\":[\"Sharpener\",\"Rubber\"],\"Outside the bag\":[\"Blackboard\",\"Desk\"]}', 4.00, 0),
(67, 20, 6, 'match', 'Match the object with its action.', '{\"leftItems\":[\"Pencil\",\"Chalk\"],\"rightItems\":[\"Writes on the board\",\"Writes in the book\"]}', '{\"Pencil\":\"Writes in the book\",\"Chalk\":\"Writes on the board\"}', 2.00, 0),
(68, 20, 7, 'match', 'Match where you sit and where you write.', '{\"leftItems\":[\"Chair\",\"Desk\"],\"rightItems\":[\"Used to put books on\",\"Used to sit on\"]}', '{\"Chair\":\"Used to sit on\",\"Desk\":\"Used to put books on\"}', 2.00, 0),
(69, 20, 8, 'choice', 'What do we use to write in our exercise books?', '[\"A pencil\",\"A chair\",\"A window\",\"A door\"]', '[0]', 1.00, 0),
(70, 20, 9, 'choice', 'What do you sit on in the classroom?', '[\"A blackboard\",\"A chair\",\"A book\",\"A ruler\"]', '[1]', 1.00, 0),
(71, 20, 10, 'choice', 'Which tool helps you to draw straight lines?', '[\"A rubber\",\"A ruler\",\"A bag\",\"A desk\"]', '[1]', 1.00, 0),
(72, 20, 11, 'choice', 'Where does the teacher write lessons in the classroom?', '[\"On the floor\",\"On the blackboard\",\"On the school bag\",\"On the desk\"]', '[1]', 1.00, 0),
(73, 21, 1, 'choice', 'Which word starts with the letter \'M\' in Unit 5 Activity 1?', '[\"Milk\",\"Nose\",\"Owl\",\"Egg\"]', '[\"Milk\"]', 1.00, 0),
(74, 21, 2, 'choice', 'Which fruit starting with \'O\' is listed under the letter \'Oo\' in Activity 1?', '[\"Orange\",\"Bananas\",\"Cabbage\",\"Cassava\"]', '[\"Orange\"]', 1.00, 0),
(75, 21, 3, 'choice', 'Which word listed under letter \'Nn\' refers to a body part?', '[\"Nose\",\"Nails\",\"Net\",\"Mat\"]', '[\"Nose\"]', 1.00, 0),
(76, 21, 4, 'choice', 'Which of the following is a food item listed under \'Which food do you like eating?\' in Unit 5?', '[\"Pawpaw\",\"Monkey\",\"Net\",\"Owl\"]', '[\"Pawpaw\"]', 1.00, 0),
(77, 21, 5, 'choice', 'Which animal word is listed under letter \'Mm\' in Unit 5?', '[\"Monkey\",\"Milk\",\"Mat\",\"Nails\"]', '[\"Monkey\"]', 1.00, 0),
(78, 21, 6, 'choice', 'Which bird is listed under letter \'Oo\' alongside Oil and Orange?', '[\"Owl\",\"Nose\",\"Net\",\"Carrots\"]', '[\"Owl\"]', 1.00, 0),
(79, 21, 7, 'match', 'Match each letter to its corresponding example word from Activity 1.', '{\"leftItems\":[],\"rightItems\":[]}', '{\"Mm\":\"Milk\",\"Nn\":\"Nose\",\"Oo\":\"Owl\"}', 2.00, 0),
(80, 21, 8, 'match', 'Match each food item from Unit 5 to its starting letter.', '{\"leftItems\":[],\"rightItems\":[]}', '{\"Cabbage\":\"C\",\"Apple\":\"A\",\"Pawpaw\":\"P\"}', 2.00, 0),
(81, 21, 9, 'match', 'Match each food item to its corresponding category/type from Activity 2.', '{\"leftItems\":[],\"rightItems\":[]}', '{\"Bananas\":\"Fruit\",\"Carrots\":\"Vegetable\",\"Egg\":\"Protein/Food\"}', 2.00, 0),
(82, 21, 10, 'match', 'Match each letter \'Mm\' word to its description.', '{\"leftItems\":[],\"rightItems\":[]}', '{\"Milk\":\"A drink\",\"Monkey\":\"An animal\",\"Mat\":\"An object to sit on\"}', 2.00, 0),
(83, 21, 11, 'match', 'Match each letter \'Nn\' word to its context.', '{\"leftItems\":[],\"rightItems\":[]}', '{\"Nose\":\"Part of the face\",\"Nails\":\"Metal fasteners / body part\",\"Net\":\"Object for catching items\"}', 2.00, 0),
(84, 21, 12, 'rearrange', 'Rearrange the letters to spell the fruit food item listed in Activity 2: [\"a\", \"p\", \"p\", \"l\", \"e\"]', '[\"a\",\"p\",\"p\",\"l\",\"e\"]', '[\"apple\"]', 1.00, 0),
(85, 21, 13, 'rearrange', 'Rearrange the words to form a correct sentence expressing a food preference: [\"like\", \"I\", \"eating\", \"bananas\"]', '[\"like\",\"I\",\"eating\",\"bananas\"]', '[\"I like eating bananas\"]', 2.00, 0),
(86, 21, 14, 'rearrange', 'Rearrange the scrambled letters to form a food item: [\"c\", \"a\", \"r\", \"r\", \"o\", \"t\", \"s\"]', '[\"c\",\"a\",\"r\",\"r\",\"o\",\"t\",\"s\"]', '[\"carrots\"]', 1.00, 0),
(87, 21, 15, 'rearrange', 'Rearrange the scrambled letters to form a word starting with letter M: [\"m\", \"i\", \"l\", \"k\"]', '[\"m\",\"i\",\"l\",\"k\"]', '[\"milk\"]', 1.00, 0),
(88, 21, 16, 'rearrange', 'Rearrange the scrambled letters to spell a word starting with letter O: [\"o\", \"r\", \"a\", \"n\", \"g\", \"e\"]', '[\"o\",\"r\",\"a\",\"n\",\"g\",\"e\"]', '[\"orange\"]', 1.00, 0),
(89, 21, 17, 'fill', 'Complete the missing word for letter Nn: Nails, ______, Net.', '[]', '[\"Nose\"]', 1.00, 0),
(90, 21, 18, 'fill', 'Complete the missing word for letter Oo: Oil, Orange, ______.', '[]', '[\"Owl\"]', 1.00, 0),
(91, 21, 19, 'fill', 'Complete the missing word for letter Mm: ______, Monkey, Mat.', '[]', '[\"Milk\"]', 1.00, 0),
(92, 21, 20, 'fill', 'In Activity 2, the question asks: \'Which food do you ______ eating?\'', '[]', '[\"like\"]', 1.00, 0),
(93, 21, 21, 'fill', 'Fill in the missing food name from Activity 2: Cabbage, Carrots, Apple, Egg, Orange, Pawpaw, ______, Potato, Bananas.', '[]', '[\"Cassava\"]', 1.00, 0),
(94, 21, 22, 'drag', 'Drag and drop the missing food items to complete the Activity 2 food list: [Apple, Egg, Pawpaw]', '{\"items\":[\"Apple\",\"Egg\",\"Pawpaw\"],\"groups\":[\"0\",\"1\",\"2\"]}', '[\"Apple\",\"Egg\",\"Pawpaw\"]', 2.00, 0),
(95, 21, 23, 'drag', 'Drag each target word to its starting letter category (Mm, Nn, Oo): Mat, Net, Oil.', '{\"items\":[\"Mat\",\"Net\",\"Oil\"],\"groups\":[\"Mm\",\"Nn\",\"Oo\"]}', '{\"Mm\":\"Mat\",\"Nn\":\"Net\",\"Oo\":\"Oil\"}', 2.00, 0),
(96, 21, 24, 'drag', 'Drag the words into their correct category: Foods vs Letter Nn Words.', '{\"items\":[\"Cabbage\",\"Carrots\",\"Nails\",\"Nose\"],\"groups\":[\"Foods\",\"Letter Nn Words\"]}', '{\"Foods\":[\"Cabbage\",\"Carrots\"],\"Letter Nn Words\":[\"Nails\",\"Nose\"]}', 2.00, 0),
(97, 21, 25, 'open', 'Name three food items listed under \'Which food do you like eating?\' in Unit 5 Activity 2.', '[]', '[\"Model Answer: Three foods listed in Unit 5 Activity 2 are Cabbage, Carrots, and Apple (or any three from: Cabbage, Carrots, Apple, Egg, Orange, Pawpaw, Cassava, Potato, Bananas). Context Evidence: P1-English-PB (1).pdf page 48 lists these under \'Activity 2: Which food do you like eating?\'.\"]', 3.00, 0),
(98, 21, 26, 'open', 'List the three words provided for the letter name \'Mm\' in Unit 5 Activity 1.', '[]', '[\"Model Answer: Milk, Monkey, and Mat. Context Evidence: P1-English-PB (1).pdf page 48 lists \'Milk\', \'Monkey\', \'Mat\' under letter names Mm.\"]', 3.00, 0),
(99, 21, 27, 'open', 'List the three words provided for the letter name \'Nn\' in Unit 5 Activity 1.', '[]', '[\"Model Answer: Nails, Nose, and Net. Context Evidence: P1-English-PB (1).pdf page 48 lists \'Nails\', \'Nose\', \'Net\' under letter names Nn.\"]', 3.00, 0),
(100, 21, 28, 'open', 'List the three words provided for the letter name \'Oo\' in Unit 5 Activity 1.', '[]', '[\"Model Answer: Oil, Orange, and Owl. Context Evidence: P1-English-PB (1).pdf page 48 lists \'Oil\', \'Orange\', \'Owl\' under letter names Oo.\"]', 3.00, 0),
(101, 21, 29, 'open', 'Write a simple sentence expressing a food you like eating using a food item from Unit 5 Activity 2.', '[]', '[\"Model Answer: \'I like eating bananas.\' (or \'I like eating apples.\', etc.). Context Evidence: Unit 5 is titled \'Likes and dislikes\' and Activity 2 asks \'Which food do you like eating?\' listing Bananas, Apple, Orange, etc.\"]', 3.00, 0),
(102, 22, 1, 'match', 'Match the starting phrase with the correct object ending.', '{\"leftItems\":[\"I like to play with my\",\"I like to read my\",\"I like to write with my\"],\"rightItems\":[\"book.\",\"ball.\",\"pencil.\"]}', '{\"I like to play with my\":\"ball.\",\"I like to read my\":\"book.\",\"I like to write with my\":\"pencil.\"}', 3.00, 0),
(103, 22, 2, 'fill', 'Complete the word from our sounds list: I have a red p__n.', '[]', '[\"e\"]', 1.00, 0),
(104, 22, 3, 'choice', 'When you are happy with something or love it, you say: I _______ it.', '[\"like\",\"dislike\",\"hate\",\"no\"]', '[0]', 1.00, 0),
(105, 23, 1, 'fill', 'Fill the missing question word: Do you _______ apples?', '[]', '[\"like\"]', 1.00, 0),
(106, 23, 2, 'choice', 'Which sentence shows that a child does not like an item?', '[\"I like mangoes.\",\"I do not like mangoes.\",\"This is my mango.\",\"Yes, I have mangoes.\"]', '[1]', 1.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `timetable_entries`
--

CREATE TABLE `timetable_entries` (
  `id` int(10) UNSIGNED NOT NULL,
  `class_id` int(10) UNSIGNED NOT NULL,
  `subject_id` int(10) UNSIGNED NOT NULL,
  `teacher_id` int(10) UNSIGNED NOT NULL,
  `day_of_week` tinyint(3) UNSIGNED NOT NULL,
  `starts_at` time NOT NULL,
  `ends_at` time NOT NULL,
  `room` varchar(80) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transport_routes`
--

CREATE TABLE `transport_routes` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `bus_number` varchar(40) NOT NULL,
  `driver_name` varchar(120) NOT NULL,
  `driver_phone` varchar(30) NOT NULL,
  `capacity` smallint(5) UNSIGNED NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transport_routes`
--

INSERT INTO `transport_routes` (`id`, `name`, `bus_number`, `driver_name`, `driver_phone`, `capacity`, `is_active`) VALUES
(1, 'kigari kabuga', '12349', 'pacifique', '0793360920', 28, 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `username` varchar(60) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `photo_key` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','dos','teacher','student','parent','accountant','librarian') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `username`, `email`, `phone`, `photo_key`, `password_hash`, `role`, `is_active`, `created_at`) VALUES
(1, 'System Administrator', 'Pacifiquesepa', 'pacifiquesepa@gmail.com', NULL, 'http://localhost:4000/uploads/20882eae4711c8c1d72d16244905d268', '$2b$12$F26ij4SI3v23kc4W6gNHIuk1Z5r190uXushM4jjHri0Oh0vxA504a', 'admin', 1, '2026-08-20 22:05:41'),
(9, 'sepa', 'sepa', 'sepa@gmail.com', NULL, 'http://localhost:4000/uploads/f99b11ed3acfc771809b777ed06a3141', '$2b$12$zcuBc7rrrlBhP4CzXj/8P.AzdE29agq5wfDktJy/cI2tcnyh80pNq', 'dos', 1, '2026-08-20 23:29:19'),
(10, 'keza', 'keza', 'keza@gmail.com', NULL, NULL, '$2b$12$Lmq68Y0zMiToOuuKm0Twme2pTJOeeRMaBUWR/udhWT9Qy2Nk0Gjm2', 'student', 1, '2026-08-20 23:32:30'),
(12, 'Pacifique Sep', 'well', 'pacifiquesepa25@gmail.com', '0793360930', NULL, '$2b$12$POKQVevbvWlZMGZvVKWktuGMAl5BLo9Or6FsOI8b6ZLMJ8Esb8bii', 'accountant', 1, '2026-08-21 01:11:49'),
(16, 'kayitesi', 'kayitesi', 'kayitesi@gmail.com', NULL, 'http://localhost:4000/uploads/348b64f7437eb2f57997c4a7b4f539c0', '$2b$12$r1uLLYvBLlyrrBAglzNH4esvJ.V71tl7TIJVvUEe4qCNrfCZOrZVe', 'teacher', 1, '2026-08-24 13:21:54'),
(17, 'abijuri', 'abijuru', 'abijuru@fkams.local', NULL, NULL, '$2b$12$sHjXINGWGHtkizgJpGKXOOcrEla1dLHfqLzgS/1VVMB3NfAGSzymm', 'student', 1, '2026-08-24 13:24:09'),
(18, 'pacifique', 'sbxhsxxhsh', 'sbxhsxxhsh@fkams.local', NULL, 'http://localhost:4000/uploads/d8310acc03a20ec7eba0c8668df5bcab', '$2b$12$nlGYyTwnEnzpegw08HZsr.nFxl5eabbu5Q/ReRS3AcyCz7vMSmafK', 'student', 1, '2026-08-24 15:40:13'),
(23, 'nyirabagenzi123', 'well1', 'well1@fkams.local', NULL, NULL, '$2b$12$JhR2/G048zCTCQVJBj88WO3LMO3/PrCW/zicike.ZbC9ZDndqjbky', 'student', 1, '2026-08-25 07:37:00'),
(28, 'iturihafi', 'fk-2026-00002', 'student2@fkams.local', NULL, NULL, '$2b$12$TqIelmcvnkQ1e0L.lWmWO.kNN1uc2B5q.tL8yqflSGDOF.B6TI.7e', 'student', 1, '2026-08-26 21:49:55'),
(29, 'akingeneye', 'fk-2026-00003', 'student3@fkams.local', NULL, NULL, '$2b$12$uqiYC./Dc.IT9vbPFTYlxuBHJXD8xQ2UYebB.Ib5.LT0iyV5JdlW6', 'student', 1, '2026-08-26 23:32:44'),
(30, 'iradukunda', 'fk-2026-00004', 'student4@fkams.local', NULL, NULL, '$2b$12$N7/KEE.353i8uO7Osl/Bwe5T1BsJQyoMVXB602FEgBVrlvp8keopu', 'student', 1, '2026-08-26 23:50:14'),
(31, 'iyakaremye', 'fk-2026-00005', 'student5@fkams.local', NULL, NULL, '$2b$12$RrBgYgmHTvvOmN5sA7iZJObVJpA7x0da2QKtbfOibWj5MJVNTIPc.', 'student', 1, '2026-08-26 23:59:50'),
(32, 'eizeye', 'fk-2026-00006', 'student6@fkams.local', NULL, NULL, '$2b$12$lxi5g4E27mmyG6drmssBxuBcnb9X8owTaCb3GEnbcdGBBHB/f1N62', 'student', 1, '2026-08-27 00:12:43'),
(33, 'iturihafi rene', 'fk-2026-00007', 'student7@fkams.local', NULL, NULL, '$2b$12$BnX3gc79DTrn9WADlJ3I6u3cScQ//VAdLn08RtCrSiztFdmqoq66S', 'student', 1, '2026-08-27 00:31:56'),
(34, 'iyakaremwe app', 'fk-2026-00010', 'student10@fkams.local', NULL, NULL, '$2b$12$ER2abyyqai18EQxzSwmKd.HZ7v5vNbuWDj65NmTIOIgQmK654f56e', 'student', 1, '2026-08-27 01:33:26'),
(39, 'pacifiquesepa', 'wel12345223', 'masezerano904@gmail.com', '0793360927', NULL, '$2b$12$aJ.6YrnCbEp6nVFZgwpTrOo5s7WX5fanTMqEQCuG3BGH3aydEYu8S', 'dos', 1, '2026-08-28 11:31:36'),
(42, 'abijuru', 'abijuru83838839', 'nshizirungupacifique0@gmail.com', NULL, 'http://localhost:4000/uploads/eefb19fdc276dbc41630a507dc00f79e', '$2b$12$UP1eTdY6eTOOGB2oA6sD5OEqKD8w8txX5fZcR2RD4KtcqC23Sk5DC', 'teacher', 1, '2026-08-28 11:41:07'),
(46, 'ayinkamiye', 'ayinkamiye', 'ayinkamiye@fkams.local', NULL, NULL, '$2b$12$CvyNQ2bTtNSomfNbGoyVb.n9zXes9xrmtZuF4CkSdbQ0qcq121HKW', 'student', 1, '2026-08-31 09:58:11'),
(48, 'kaboy', 'kaboy', 'nshizirungunshizirungu3@gmail.com', '0736494012', NULL, '$2b$12$cKFypp9YddBEwrJUhlbx2.LFG7wurc7HhLsS.ExwOIVNTe9DEYt/q', 'librarian', 1, '2026-09-02 18:24:26'),
(49, 'irene', 'irene', 'irene@fkams.local', NULL, 'http://localhost:4000/uploads/b038a0018f1bd3f3215c9d25d390293a', '$2b$12$fyBG7jgHZ27TciSmN2XL9uAwWkUDTTjvBBEXJ15uMN3GloJRPfj7y', 'student', 1, '2026-09-14 11:44:17');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_graduates`
-- (See below for the actual view)
--
CREATE TABLE `v_graduates` (
`id` int(10) unsigned
,`user_id` int(10) unsigned
,`full_name` varchar(120)
,`first_name` varchar(120)
,`last_name` varchar(120)
,`reg_number` varchar(40)
,`photo_key` varchar(255)
,`from_level` varchar(80)
,`academic_year` varchar(20)
,`graduated_at` date
,`promotion_notes` varchar(100)
,`final_level` varchar(80)
,`trade` varchar(80)
,`academic_year_name` varchar(20)
,`start_date` date
,`end_date` date
,`contact_email` varchar(190)
,`contact_phone` varchar(30)
,`address_district` binary(0)
,`address_sector` binary(0)
,`guardian_name` binary(0)
,`guardian_phone` binary(0)
,`promotion_id` int(10) unsigned
);

-- --------------------------------------------------------

--
-- Structure for view `v_graduates`
--
DROP TABLE IF EXISTS `v_graduates`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_graduates`  AS SELECT `s`.`id` AS `id`, `s`.`user_id` AS `user_id`, `s`.`full_name` AS `full_name`, substring_index(`s`.`full_name`,' ',1) AS `first_name`, substring_index(`s`.`full_name`,' ',-1) AS `last_name`, `s`.`admission_number` AS `reg_number`, `s`.`photo_key` AS `photo_key`, `s`.`class_name` AS `from_level`, `s`.`academic_year` AS `academic_year`, `s`.`graduation_date` AS `graduated_at`, `s`.`graduated_cohort` AS `promotion_notes`, `sp`.`to_level` AS `final_level`, coalesce(`sp`.`to_level`,`sp`.`from_level`) AS `trade`, `ay`.`name` AS `academic_year_name`, `ay`.`start_date` AS `start_date`, `ay`.`end_date` AS `end_date`, `u`.`email` AS `contact_email`, `u`.`phone` AS `contact_phone`, NULL AS `address_district`, NULL AS `address_sector`, NULL AS `guardian_name`, NULL AS `guardian_phone`, `sp`.`id` AS `promotion_id` FROM (((`students` `s` left join `student_promotions` `sp` on(`s`.`id` = `sp`.`student_id`)) left join `academic_years` `ay` on(`sp`.`academic_year_id` = `ay`.`id`)) left join `users` `u` on(`s`.`user_id` = `u`.`id`)) WHERE `s`.`status` = 'graduated' ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_years`
--
ALTER TABLE `academic_years`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `academic_year_terms`
--
ALTER TABLE `academic_year_terms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `year_term` (`academic_year_id`,`term_number`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_type_date` (`type`,`created_at`),
  ADD KEY `idx_test` (`related_test_id`);

--
-- Indexes for table `announcement_recipients`
--
ALTER TABLE `announcement_recipients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_announcement_user` (`announcement_id`,`user_id`),
  ADD KEY `idx_user_unread` (`user_id`,`read_at`);

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `applications_enrollment_queue` (`status`,`approved_at`,`approved_student_id`);

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_tag` (`asset_tag`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_day` (`student_id`,`attendance_date`),
  ADD KEY `marked_by` (`marked_by`);

--
-- Indexes for table `audit_sessions`
--
ALTER TABLE `audit_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_user_date` (`user_id`,`login_at`),
  ADD KEY `idx_audit_online` (`last_seen_at`,`logout_at`);

--
-- Indexes for table `behavior_records`
--
ALTER TABLE `behavior_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `behavior_attendance` (`attendance_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD PRIMARY KEY (`class_id`,`subject_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `curriculum_items`
--
ALTER TABLE `curriculum_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `curriculum_year` (`year_name`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `expenses_budget_fk_021` (`budget_id`);

--
-- Indexes for table `feeding_records`
--
ALTER TABLE `feeding_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_feeding_day` (`student_id`,`feeding_date`,`meal_type`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `feeding_stock`
--
ALTER TABLE `feeding_stock`
  ADD PRIMARY KEY (`id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `fees`
--
ALTER TABLE `fees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference` (`reference`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `grades`
--
ALTER TABLE `grades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `homework`
--
ALTER TABLE `homework`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `moved_by` (`moved_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `library_books`
--
ALTER TABLE `library_books`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `isbn` (`isbn`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `library_loans`
--
ALTER TABLE `library_loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `book_id` (`book_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `issued_by` (`issued_by`);

--
-- Indexes for table `news_posts`
--
ALTER TABLE `news_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `published_by` (`published_by`),
  ADD KEY `news_posts_created_at` (`created_at`),
  ADD KEY `news_posts_category` (`category`);

--
-- Indexes for table `notices`
--
ALTER TABLE `notices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `published_by` (`published_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipient_id` (`recipient_id`);

--
-- Indexes for table `otp_challenges`
--
ALTER TABLE `otp_challenges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `otp_user_active` (`user_id`,`consumed_at`,`expires_at`);

--
-- Indexes for table `parent_students`
--
ALTER TABLE `parent_students`
  ADD PRIMARY KEY (`parent_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `payroll_records`
--
ALTER TABLE `payroll_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_period` (`user_id`,`period_month`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `school_fee_settings`
--
ALTER TABLE `school_fee_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `class_academic_year` (`class_name`,`academic_year`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_day` (`user_id`,`attendance_date`),
  ADD KEY `marked_by` (`marked_by`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `admission_number` (`admission_number`),
  ADD UNIQUE KEY `qr_token` (`qr_token`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `student_classes`
--
ALTER TABLE `student_classes`
  ADD PRIMARY KEY (`student_id`,`class_id`),
  ADD KEY `class_id` (`class_id`);

--
-- Indexes for table `student_promotions`
--
ALTER TABLE `student_promotions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_year` (`student_id`,`academic_year_id`),
  ADD KEY `academic_year_id` (`academic_year_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `student_transport`
--
ALTER TABLE `student_transport`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `route_id` (`route_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `subject_modules`
--
ALTER TABLE `subject_modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subject_modules_subject` (`subject_id`),
  ADD KEY `idx_subject_modules_teacher` (`teacher_id`);

--
-- Indexes for table `subject_module_notes`
--
ALTER TABLE `subject_module_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subject_module_notes_subject` (`subject_id`),
  ADD KEY `idx_subject_module_notes_module` (`module_id`),
  ADD KEY `idx_subject_module_notes_teacher` (`teacher_id`);

--
-- Indexes for table `subject_notes`
--
ALTER TABLE `subject_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subject_notes_subject` (`subject_id`),
  ADD KEY `idx_subject_notes_teacher` (`teacher_id`);

--
-- Indexes for table `teacher_assignments`
--
ALTER TABLE `teacher_assignments`
  ADD PRIMARY KEY (`teacher_id`,`class_id`,`subject_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `employee_number` (`employee_number`),
  ADD UNIQUE KEY `qr_token` (`qr_token`),
  ADD UNIQUE KEY `qr_token_2` (`qr_token`),
  ADD UNIQUE KEY `qr_token_3` (`qr_token`),
  ADD UNIQUE KEY `qr_token_4` (`qr_token`),
  ADD UNIQUE KEY `national_id` (`national_id`);

--
-- Indexes for table `tests`
--
ALTER TABLE `tests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `test_attempts`
--
ALTER TABLE `test_attempts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `one_attempt` (`test_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `test_progress`
--
ALTER TABLE `test_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_test_student` (`test_id`,`student_id`),
  ADD KEY `idx_test_status` (`test_id`,`status`),
  ADD KEY `idx_student_active` (`student_id`,`status`);

--
-- Indexes for table `test_questions`
--
ALTER TABLE `test_questions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `test_order` (`test_id`,`question_order`),
  ADD KEY `idx_test_order` (`test_id`,`question_order`) COMMENT 'Index for efficient question ordering';

--
-- Indexes for table `timetable_entries`
--
ALTER TABLE `timetable_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `transport_routes`
--
ALTER TABLE `transport_routes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bus_number` (`bus_number`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academic_years`
--
ALTER TABLE `academic_years`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `academic_year_terms`
--
ALTER TABLE `academic_year_terms`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `announcement_recipients`
--
ALTER TABLE `announcement_recipients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `behavior_records`
--
ALTER TABLE `behavior_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `curriculum_items`
--
ALTER TABLE `curriculum_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `feeding_records`
--
ALTER TABLE `feeding_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feeding_stock`
--
ALTER TABLE `feeding_stock`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fees`
--
ALTER TABLE `fees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `grades`
--
ALTER TABLE `grades`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `homework`
--
ALTER TABLE `homework`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `library_books`
--
ALTER TABLE `library_books`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `library_loans`
--
ALTER TABLE `library_loans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `news_posts`
--
ALTER TABLE `news_posts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notices`
--
ALTER TABLE `notices`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `payroll_records`
--
ALTER TABLE `payroll_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_fee_settings`
--
ALTER TABLE `school_fee_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `student_promotions`
--
ALTER TABLE `student_promotions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `subject_modules`
--
ALTER TABLE `subject_modules`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `subject_module_notes`
--
ALTER TABLE `subject_module_notes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `subject_notes`
--
ALTER TABLE `subject_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tests`
--
ALTER TABLE `tests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `test_attempts`
--
ALTER TABLE `test_attempts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `test_progress`
--
ALTER TABLE `test_progress`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `test_questions`
--
ALTER TABLE `test_questions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT for table `timetable_entries`
--
ALTER TABLE `timetable_entries`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transport_routes`
--
ALTER TABLE `transport_routes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `academic_years`
--
ALTER TABLE `academic_years`
  ADD CONSTRAINT `academic_years_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `academic_year_terms`
--
ALTER TABLE `academic_year_terms`
  ADD CONSTRAINT `academic_year_terms_ibfk_1` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`related_test_id`) REFERENCES `tests` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `announcements_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `announcement_recipients`
--
ALTER TABLE `announcement_recipients`
  ADD CONSTRAINT `announcement_recipients_ibfk_1` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `announcement_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_sessions`
--
ALTER TABLE `audit_sessions`
  ADD CONSTRAINT `audit_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `behavior_records`
--
ALTER TABLE `behavior_records`
  ADD CONSTRAINT `behavior_attendance_fk` FOREIGN KEY (`attendance_id`) REFERENCES `attendance` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `behavior_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `behavior_records_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `class_subjects`
--
ALTER TABLE `class_subjects`
  ADD CONSTRAINT `class_subjects_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `curriculum_items`
--
ALTER TABLE `curriculum_items`
  ADD CONSTRAINT `curriculum_items_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_budget_fk` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_budget_fk_021` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `feeding_records`
--
ALTER TABLE `feeding_records`
  ADD CONSTRAINT `feeding_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `feeding_records_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `feeding_stock`
--
ALTER TABLE `feeding_stock`
  ADD CONSTRAINT `feeding_stock_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `fees`
--
ALTER TABLE `fees`
  ADD CONSTRAINT `fees_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `grades`
--
ALTER TABLE `grades`
  ADD CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `grades_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `grades_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `homework`
--
ALTER TABLE `homework`
  ADD CONSTRAINT `homework_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `homework_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `homework_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `inventory_transactions`
--
ALTER TABLE `inventory_transactions`
  ADD CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`moved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `library_books`
--
ALTER TABLE `library_books`
  ADD CONSTRAINT `library_books_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `library_loans`
--
ALTER TABLE `library_loans`
  ADD CONSTRAINT `library_loans_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `library_books` (`id`),
  ADD CONSTRAINT `library_loans_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `library_loans_ibfk_3` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `news_posts`
--
ALTER TABLE `news_posts`
  ADD CONSTRAINT `news_posts_ibfk_1` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `notices`
--
ALTER TABLE `notices`
  ADD CONSTRAINT `notices_ibfk_1` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `otp_challenges`
--
ALTER TABLE `otp_challenges`
  ADD CONSTRAINT `otp_challenges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `parent_students`
--
ALTER TABLE `parent_students`
  ADD CONSTRAINT `parent_students_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `parent_students_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_records`
--
ALTER TABLE `payroll_records`
  ADD CONSTRAINT `payroll_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payroll_records_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `school_fee_settings`
--
ALTER TABLE `school_fee_settings`
  ADD CONSTRAINT `school_fee_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD CONSTRAINT `staff_attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `staff_attendance_ibfk_2` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `student_classes`
--
ALTER TABLE `student_classes`
  ADD CONSTRAINT `student_classes_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_classes_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_promotions`
--
ALTER TABLE `student_promotions`
  ADD CONSTRAINT `student_promotions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_promotions_ibfk_2` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_promotions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `student_transport`
--
ALTER TABLE `student_transport`
  ADD CONSTRAINT `student_transport_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_transport_ibfk_2` FOREIGN KEY (`route_id`) REFERENCES `transport_routes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_modules`
--
ALTER TABLE `subject_modules`
  ADD CONSTRAINT `fk_subject_modules_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_subject_modules_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_module_notes`
--
ALTER TABLE `subject_module_notes`
  ADD CONSTRAINT `fk_subject_module_notes_module` FOREIGN KEY (`module_id`) REFERENCES `subject_modules` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_subject_module_notes_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_subject_module_notes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_notes`
--
ALTER TABLE `subject_notes`
  ADD CONSTRAINT `fk_subject_notes_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_subject_notes_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_assignments`
--
ALTER TABLE `teacher_assignments`
  ADD CONSTRAINT `teacher_assignments_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_assignments_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teacher_assignments_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_profiles`
--
ALTER TABLE `teacher_profiles`
  ADD CONSTRAINT `teacher_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tests`
--
ALTER TABLE `tests`
  ADD CONSTRAINT `tests_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `tests_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `tests_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `test_attempts`
--
ALTER TABLE `test_attempts`
  ADD CONSTRAINT `test_attempts_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `test_attempts_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `test_progress`
--
ALTER TABLE `test_progress`
  ADD CONSTRAINT `test_progress_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `test_progress_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `test_questions`
--
ALTER TABLE `test_questions`
  ADD CONSTRAINT `test_questions_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `timetable_entries`
--
ALTER TABLE `timetable_entries`
  ADD CONSTRAINT `timetable_entries_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `timetable_entries_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  ADD CONSTRAINT `timetable_entries_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
