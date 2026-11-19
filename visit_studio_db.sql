-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 19, 2026 at 12:02 PM
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
-- Database: `visit_studio_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `organization_id`, `user_id`, `user_name`, `user_role`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
('act-02863bbf-985b-4a7a-9e60-912c133043ad', 'org-aura-001', 'usr-admin-001', 'Ananya Deshmukh', 'admin', 'USER_LOGIN', 'users', 'usr-admin-001', 'Logged in successfully as admin', '127.0.0.1', '2026-11-17 09:01:15'),
('act-0a947fd6-c7f7-498a-8298-36f136787360', 'org-aura-001', 'usr-admin-001', 'Ananya Deshmukh', 'admin', 'USER_LOGIN', 'users', 'usr-admin-001', 'Logged in successfully as admin', '127.0.0.1', '2026-11-17 09:26:00'),
('act-0c3ec051-674f-4209-9585-792ec3b17f39', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-8f29477e', 'Created invitation for Yuvraj to DLF The Camellias', '::1', '2026-11-17 12:05:02'),
('act-19658f14-616e-4f70-ba46-e6bc908b3f08', 'org-aura-001', 'usr-head-001', 'Rajesh Malhotra', 'sales_head', 'USER_LOGIN', 'users', 'usr-head-001', 'Logged in successfully as sales_head', '127.0.0.1', '2026-11-17 09:08:53'),
('act-3e38e09c-fff3-4e8a-afe0-4e4851834420', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'USER_LOGIN', 'users', 'usr-assoc-001', 'Logged in successfully as sales_associate', '127.0.0.1', '2026-11-17 12:03:06'),
('act-4b41c5a9-3ff7-40ee-9e59-d4d7b163cf1f', NULL, 'usr-super-001', 'Vikramaditya Roy', 'super_admin', 'USER_LOGIN', 'users', 'usr-super-001', 'Logged in successfully as super_admin', '127.0.0.1', '2026-11-17 09:08:52'),
('act-5c63cc10-eae6-4f9d-bae7-7f762cf117a6', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-3bec11af', 'Created invitation for Rohan Singhania to M3M The Cullinan', '::1', '2026-11-17 11:05:08'),
('act-5e5bee27-3263-4d47-ac38-ef41a8489111', 'org-aura-001', 'usr-admin-001', 'Ananya Deshmukh', 'admin', 'USER_LOGIN', 'users', 'usr-admin-001', 'Logged in successfully as admin', '127.0.0.1', '2026-11-17 09:08:53'),
('act-64f3f2b7-b6cd-4a4b-96e1-3a4b93565d3e', NULL, 'usr-super-001', 'Vikramaditya Roy', 'super_admin', 'USER_LOGIN', 'users', 'usr-super-001', 'Logged in successfully as super_admin', '127.0.0.1', '2026-11-17 09:12:08'),
('act-67e3055d-28cf-4d12-bf58-ca6ba7a6fed3', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-025d8809', 'Created invitation for Rohan Singhania to M3M The Cullinan', '::1', '2026-11-17 11:10:06'),
('act-a40dacea-716d-4778-9fb9-d3c2fa228e76', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'USER_LOGIN', 'users', 'usr-assoc-001', 'Logged in successfully as sales_associate', '127.0.0.1', '2026-11-17 10:27:26'),
('act-a51d600a-2226-4dda-a6dd-3fbdb7b8d197', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-d9bd2bfe', 'Created invitation for Rohan Singhania to M3M The Cullinan', '::1', '2026-11-17 11:07:42'),
('act-ba9ec171-5990-45d2-a16d-4ae72363bb34', 'org-aura-001', 'usr-admin-001', 'Ananya Deshmukh', 'admin', 'USER_LOGIN', 'users', 'usr-admin-001', 'Logged in successfully as admin', '127.0.0.1', '2026-11-17 10:02:10'),
('act-dcd734d5-f2e6-465e-9a93-a1d7a21f1103', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-abfd1a78', 'Created invitation for Rohan Singhania to M3M The Cullinan', '::1', '2026-11-17 11:05:34'),
('act-def43622-7ae6-44de-97f4-2898665315d7', NULL, 'usr-super-001', 'Vikramaditya Roy', 'super_admin', 'USER_LOGIN', 'users', 'usr-super-001', 'Logged in successfully as super_admin', '127.0.0.1', '2026-11-17 10:02:02'),
('act-ecc51079-1ad2-4d3f-b0c7-143088d3986c', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'USER_LOGIN', 'users', 'usr-assoc-001', 'Logged in successfully as sales_associate', '127.0.0.1', '2026-11-17 09:08:53'),
('act-f434a913-89d6-47d5-8cec-32609dd8a29c', 'org-aura-001', 'usr-assoc-001', 'Karan Verma', 'sales_associate', 'CREATE_INVITATION', 'invitations', 'inv-357bc4c2', 'Created invitation for Yuvraj to DLF The Camellias', '::1', '2026-11-17 10:27:59');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `customer_code` varchar(50) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `mobile_number` varchar(50) NOT NULL,
  `whatsapp_number` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `budget` varchar(100) DEFAULT NULL,
  `preferred_location` varchar(255) DEFAULT NULL,
  `interested_project_id` varchar(64) DEFAULT NULL,
  `configuration` varchar(100) DEFAULT NULL,
  `lead_source` varchar(100) DEFAULT 'Direct',
  `requirements` text DEFAULT NULL,
  `assigned_associate_id` varchar(64) DEFAULT NULL,
  `assigned_sales_head_id` varchar(64) DEFAULT NULL,
  `status` enum('lead','interested','visit_scheduled','visited','negotiation','booked','inactive','active') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `organization_id`, `customer_code`, `full_name`, `mobile_number`, `whatsapp_number`, `email`, `budget`, `preferred_location`, `interested_project_id`, `configuration`, `lead_source`, `requirements`, `assigned_associate_id`, `assigned_sales_head_id`, `status`, `created_at`, `updated_at`) VALUES
('cust-55bd3324', 'org-aura-001', 'CUST-1001', 'Yuvraj', '9565763089', NULL, NULL, NULL, NULL, 'proj-dlf-camellias-005', NULL, 'Direct', NULL, 'usr-assoc-001', 'usr-head-001', 'visit_scheduled', '2026-11-17 04:57:59', '2026-11-17 12:05:02'),
('cust-c95d71aa', 'org-aura-001', 'CUST-1002', 'Rohan Singhania', '+919810123456', NULL, NULL, NULL, NULL, 'proj-cullinan-002', NULL, 'Direct', NULL, 'usr-assoc-001', 'usr-head-001', 'visit_scheduled', '2026-11-17 05:35:07', '2026-11-17 05:40:05');

-- --------------------------------------------------------

--
-- Table structure for table `customer_interactions`
--

CREATE TABLE `customer_interactions` (
  `id` varchar(64) NOT NULL,
  `customer_id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `interaction_type` varchar(100) NOT NULL,
  `notes` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_interactions`
--

INSERT INTO `customer_interactions` (`id`, `customer_id`, `user_id`, `interaction_type`, `notes`, `created_at`) VALUES
('int-5d10dcc9', 'cust-c95d71aa', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for M3M The Cullinan on 2026-11-17 at 11:30', '2026-11-17 05:40:05'),
('int-6e1afabe', 'cust-c95d71aa', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for M3M The Cullinan on 2026-11-17 at 11:30', '2026-11-17 05:35:34'),
('int-7c027130', 'cust-55bd3324', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for DLF The Camellias on 2026-11-17 at 11:30', '2026-11-17 12:05:02'),
('int-918bd659', 'cust-55bd3324', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for DLF The Camellias on 2026-11-17 at 11:30', '2026-11-17 04:57:59'),
('int-d31ee370', 'cust-c95d71aa', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for M3M The Cullinan on 2026-11-17 at 11:30', '2026-11-17 05:35:08'),
('int-feb3498a', 'cust-c95d71aa', 'usr-assoc-001', 'Invitation Sent', 'Created site visit invitation for M3M The Cullinan on 2026-11-17 at 11:30', '2026-11-17 05:37:41');

-- --------------------------------------------------------

--
-- Table structure for table `developers`
--

CREATE TABLE `developers` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `company_logo` longtext DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `developers`
--

INSERT INTO `developers` (`id`, `organization_id`, `name`, `company_logo`, `contact_name`, `contact_phone`, `contact_email`, `website`, `address`, `description`, `status`, `created_at`) VALUES
('dev-dlf-004', 'org-aura-001', 'DLF Luxury', NULL, 'Aditya Singh', '+91 124 4567890', 'luxury@dlf.in', 'https://dlf.in', 'DLF Gateway Tower, Cyber City, Gurugram', 'India’s premier real estate developer defining super-luxury living.', 'active', '2026-11-17 03:28:50'),
('dev-godrej-org-08a1da1a', 'org-08a1da1a', 'Godrej Properties', '/uploads/logos/logo-dev-godrej.png', 'Mohit Malhotra', '+91 22 61664444', 'sales@godrejproperties.com', 'https://godrejproperties.com', 'Godrej One, Pirojshanagar, Eastern Express Highway, Mumbai & NCR Hub', 'India\'s most trusted developer bringing sustainability and innovation to NCR.', 'active', '2026-11-19 02:26:49'),
('dev-greatvalue-org-08a1da1a', 'org-08a1da1a', 'Great Value', '/uploads/logos/logo-dev-greatvalue.png', 'Manoj Goyal', '+91 120 4000800', 'sales@greatvalueindia.com', 'https://greatvaluerealty.com', 'Great Value Tower, Sector 18 / Sector 107, Noida', 'Renowned NCR real estate developer delivering premium, value-driven residential landmarks.', 'active', '2026-11-19 03:54:27'),
('dev-gulshan-org-08a1da1a', 'org-08a1da1a', 'Gulshan Homz', '/uploads/logos/logo-dev-gulshan.png', 'Deepak Kapoor', '+91 120 4777500', 'care@gulshangroup.com', 'https://gulshangroup.com', 'Gulshan One29, Sector 129, Noida', 'Pioneers of grand luxury living and bespoke residential communities in Delhi NCR.', 'active', '2026-11-19 02:26:49'),
('dev-m3m-001', 'org-aura-001', 'M3M India', NULL, 'Nitin Goel', '+91 124 4777000', 'crm@m3mindia.com', 'https://m3mindia.com', 'M3M Cosmopolitan, Sector 66, Gurugram', 'Leading visionary developer creating world-class residential masterpieces.', 'active', '2026-11-17 03:28:50'),
('dev-m3m-org-08a1da1a', 'org-08a1da1a', 'M3M', '/uploads/logos/logo-39f99d0e.png', 'Nitin Goel', '+91 124 4777000', 'crm@m3mindia.com', 'https://m3mindia.com', 'M3M Cosmopolitan, Sector 66, Gurugram', 'Leading visionary developer creating world-class residential masterpieces.', 'active', '2026-11-19 03:54:27'),
('dev-max-002', 'org-aura-001', 'Max Estates', NULL, 'Saurabh Juneja', '+91 120 4000100', 'sales@maxestates.in', 'https://maxestates.in', 'Max Towers, Sector 16B, Noida', 'Pioneering wellness-integrated luxury living spaces.', 'active', '2026-11-17 03:28:50'),
('dev-max-org-08a1da1a', 'org-08a1da1a', 'Max Estate', '/uploads/logos/logo-9f7fe60c.jpg', 'Saurabh Juneja', '+91 120 4000100', 'sales@maxestates.in', 'https://maxestates.in', 'Max Towers, Sector 16B, Noida', 'Pioneering wellness-integrated luxury living spaces.', 'active', '2026-11-19 03:54:27'),
('dev-ncr-org-08a1da1a', 'org-08a1da1a', 'NCR Group', '/uploads/logos/logo-dev-ncr.png', 'Ajay Kumar', '+91 120 6777100', 'contact@ncrmonarch.in', 'https://ncrmonarch.in', 'Plot No GH-02, Sector 1, Greater Noida West', 'Leading real estate developer delivering quality residential and commercial hubs.', 'active', '2026-11-19 02:26:49'),
('dev-prestige-003', 'org-aura-001', 'Prestige Group', NULL, 'Ramesh Rao', '+91 80 25591080', 'enquiry@prestigeconstructions.com', 'https://prestigeconstructions.com', 'The Falcon House, Bangalore & NCR Hub', 'Synonymous with innovation and luxury for over 35 years.', 'active', '2026-11-17 03:28:50'),
('dev-prestige-org-08a1da1a', 'org-08a1da1a', 'Prestige', '/uploads/logos/logo-4bb771f4.png', 'Ramesh Rao', '+91 80 25591080', 'enquiry@prestigeconstructions.com', 'https://prestigeconstructions.com', 'The Falcon House, Bangalore & NCR Hub', 'Synonymous with innovation and luxury for over 35 years.', 'active', '2026-11-19 03:54:27'),
('dev-saya-org-08a1da1a', 'org-08a1da1a', 'Saya Group', '/uploads/logos/logo-dev-saya.webp', 'Vikas Sharma', '+91 120 4888000', 'info@sayahomes.in', 'https://sayahomes.in', 'Saya Homes HQ, Ghaziabad & Noida', 'Premier NCR luxury developer known for iconic architectural landmarks.', 'active', '2026-11-19 02:26:49');

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` varchar(64) NOT NULL,
  `site_visit_id` varchar(64) NOT NULL,
  `customer_id` varchar(64) NOT NULL,
  `rating` int(11) NOT NULL,
  `interest_level` enum('very_high','high','medium','low','not_interested') DEFAULT NULL,
  `budget_fit` enum('within_budget','flexible','over_budget') DEFAULT NULL,
  `sales_experience` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `followups`
--

CREATE TABLE `followups` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `customer_id` varchar(64) NOT NULL,
  `associate_id` varchar(64) NOT NULL,
  `sales_head_id` varchar(64) DEFAULT NULL,
  `follow_up_date` date NOT NULL,
  `follow_up_time` varchar(20) DEFAULT NULL,
  `follow_up_type` enum('call','whatsapp','visit','email','meeting') DEFAULT 'call',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `notes` text NOT NULL,
  `status` enum('pending','completed','overdue','rescheduled','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `token` varchar(128) NOT NULL,
  `customer_id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `developer_id` varchar(64) DEFAULT NULL,
  `associate_id` varchar(64) NOT NULL,
  `sales_head_id` varchar(64) DEFAULT NULL,
  `visit_date` date NOT NULL,
  `visit_time` varchar(20) NOT NULL,
  `duration` int(11) DEFAULT 60,
  `location` varchar(500) NOT NULL,
  `maps_url` text DEFAULT NULL,
  `size` varchar(100) DEFAULT NULL,
  `price` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `qr_code_data` longtext DEFAULT NULL,
  `status` enum('draft','sent','opened','confirmed','reschedule_requested','cancelled','expired') DEFAULT 'sent',
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `invitations`
--

INSERT INTO `invitations` (`id`, `organization_id`, `token`, `customer_id`, `project_id`, `developer_id`, `associate_id`, `sales_head_id`, `visit_date`, `visit_time`, `duration`, `location`, `maps_url`, `size`, `price`, `notes`, `qr_code_data`, `status`, `expires_at`, `created_at`, `updated_at`) VALUES
('inv-025d8809', 'org-aura-001', 'inv_40014b16c97dc7aead36c7673f9c2fb006bc', 'cust-c95d71aa', 'proj-cullinan-002', 'dev-m3m-001', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', '3,600 sq. ft.', '₹5.80 Cr', '', 'data:image/png;base64,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', 'sent', NULL, '2026-11-17 05:40:05', '2026-11-17 05:40:05'),
('inv-357bc4c2', 'org-aura-001', 'inv_89b40547ef8f3ae644b34a2f60c1ba368428', 'cust-55bd3324', 'proj-dlf-camellias-005', 'dev-dlf-004', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Golf Course Road, Sector 42, Gurugram', 'https://maps.google.com/?q=DLF+The+Camellias+Gurgaon', '7,400 sq. ft.', '₹35.00 Cr', '', 'data:image/png;base64,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', 'opened', NULL, '2026-11-17 04:57:59', '2026-11-17 04:57:59'),
('inv-3bec11af', 'org-aura-001', 'inv_fce070c90d039419fb128aea16b1b4c00950', 'cust-c95d71aa', 'proj-cullinan-002', 'dev-m3m-001', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', '3,600 sq. ft.', '₹5.80 Cr', '', 'data:image/png;base64,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', 'sent', NULL, '2026-11-17 05:35:08', '2026-11-17 05:35:08'),
('inv-8f29477e', 'org-aura-001', 'inv_09848156b27873900972a4c78683cb9b1dc0', 'cust-55bd3324', 'proj-dlf-camellias-005', 'dev-dlf-004', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Golf Course Road, Sector 42, Gurugram', 'https://maps.google.com/?q=DLF+The+Camellias+Gurgaon', '7,400 sq. ft.', '₹35.00 Cr', '', 'data:image/png;base64,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', 'opened', NULL, '2026-11-17 12:05:02', '2026-11-17 12:05:29'),
('inv-abfd1a78', 'org-aura-001', 'inv_eadc26b086d734275eb19d12f7f93b0348a4', 'cust-c95d71aa', 'proj-cullinan-002', 'dev-m3m-001', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', '3,600 sq. ft.', '₹5.80 Cr', '', 'data:image/png;base64,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', 'sent', NULL, '2026-11-17 05:35:34', '2026-11-17 05:35:34');
INSERT INTO `invitations` (`id`, `organization_id`, `token`, `customer_id`, `project_id`, `developer_id`, `associate_id`, `sales_head_id`, `visit_date`, `visit_time`, `duration`, `location`, `maps_url`, `size`, `price`, `notes`, `qr_code_data`, `status`, `expires_at`, `created_at`, `updated_at`) VALUES
('inv-d9bd2bfe', 'org-aura-001', 'inv_3aed3056c9576c514bc23b05d29bd5a3e327', 'cust-c95d71aa', 'proj-cullinan-002', 'dev-m3m-001', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', '3,600 sq. ft.', '₹5.80 Cr', '', 'data:image/png;base64,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', 'sent', NULL, '2026-11-17 05:37:41', '2026-11-17 05:37:41');

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE `organizations` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `name`, `slug`, `phone`, `email`, `address`, `status`, `created_at`, `updated_at`) VALUES
('org-08a1da1a', 'Workians Realty', 'workians-realty', '+91', 'info@workians.com', 'Noida', 'active', '2026-11-19 01:51:07', '2026-11-19 01:51:07'),
('org-aura-001', 'Aura Luxe Realty', 'aura-luxe', '+91 98100 12345', 'contact@auraluxe.com', 'One Horizon Center, Golf Course Road, Gurgaon', 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('org-prestige-002', 'Skyline Urban Advisory', 'skyline-urban', '+91 98200 98765', 'hello@skylineadvisory.in', 'BKC, Bandra East, Mumbai', 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50');

-- --------------------------------------------------------

--
-- Table structure for table `organization_settings`
--

CREATE TABLE `organization_settings` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `agency_name` varchar(255) DEFAULT 'Visit Studio Realty',
  `agency_subtitle` varchar(255) DEFAULT 'Luxury Real Estate Advisory',
  `logo_url` longtext DEFAULT NULL,
  `brand_color` varchar(20) DEFAULT '#29244d',
  `accent_color` varchar(20) DEFAULT '#f59e0b',
  `whatsapp_phone_number_id` varchar(100) DEFAULT NULL,
  `whatsapp_access_token` text DEFAULT NULL,
  `whatsapp_business_account_id` varchar(100) DEFAULT NULL,
  `webhook_verify_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `organization_settings`
--

INSERT INTO `organization_settings` (`id`, `organization_id`, `agency_name`, `agency_subtitle`, `logo_url`, `brand_color`, `accent_color`, `whatsapp_phone_number_id`, `whatsapp_access_token`, `whatsapp_business_account_id`, `webhook_verify_token`, `created_at`, `updated_at`) VALUES
('sett-aura-001', 'org-aura-001', 'Aura Luxe Realty', 'Private Viewings & Luxury Portfolio', NULL, '#1e1b4b', '#f59e0b', '109847289172345', 'EAABwzL_mock_token_cloud_api_visit_studio', NULL, NULL, '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('sett-ef19baf3', 'org-08a1da1a', 'Workians Realty', 'Property Advisory & Site Visits', NULL, '#29244d', '#f59e0b', NULL, NULL, NULL, NULL, '2026-11-19 01:51:07', '2026-11-19 01:51:07');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `developer_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `project_logo` longtext DEFAULT NULL,
  `banner_image` longtext DEFAULT NULL,
  `location` varchar(500) NOT NULL,
  `google_maps_url` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `carpet_area` varchar(100) DEFAULT NULL,
  `built_up_area` varchar(100) DEFAULT NULL,
  `super_built_up_area` varchar(100) DEFAULT NULL,
  `starting_price` varchar(100) DEFAULT NULL,
  `price_range` varchar(100) DEFAULT NULL,
  `amenities` text DEFAULT NULL,
  `status` enum('active','inactive','sold_out') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `organization_id`, `developer_id`, `name`, `project_logo`, `banner_image`, `location`, `google_maps_url`, `description`, `carpet_area`, `built_up_area`, `super_built_up_area`, `starting_price`, `price_range`, `amenities`, `status`, `created_at`) VALUES
('proj-cullinan-002', 'org-aura-001', 'dev-m3m-001', 'M3M The Cullinan', NULL, NULL, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', 'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.', '2,450 sq. ft.', '3,100 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', '₹5.80 Cr - ₹12.00 Cr', 'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool', 'active', '2026-11-17 03:28:50'),
('proj-dlf-camellias-005', 'org-aura-001', 'dev-dlf-004', 'DLF The Camellias', NULL, NULL, 'Golf Course Road, Sector 42, Gurugram', 'https://maps.google.com/?q=DLF+The+Camellias+Gurgaon', 'Super-luxury clubhouse residences on Golf Course Road with panoramic golf view balconies.', '4,800 sq. ft.', '6,200 sq. ft.', '7,400 sq. ft.', '₹35.00 Cr', '₹35.00 Cr - ₹75.00 Cr', 'Private Golf Course, 7-Star Spa & Salon, Olympic Lap Pool, Private Chef Dining', 'active', '2026-11-17 04:49:22'),
('proj-godrej-gbc-org-08a1da1a', 'org-08a1da1a', 'dev-godrej-org-08a1da1a', 'Godrej - GBC', '/uploads/logos/logo-proj-godrej-gbc.png', NULL, 'DMIC Integrated Industrial Township, Greater Noida', 'https://maps.google.com/?q=Godrej+Global+Business+City+Greater+Noida', 'Flagship global integrated township featuring smart high-rise residences along the DMIC economic corridor.', '1,050 sq. ft.', '1,450 sq. ft.', '1,850 sq. ft.', '₹1.35 Cr', '₹1.35 Cr - ₹2.65 Cr', 'Golf-Themed Living, Smart Home Automation, Olympic-Sized Pool, Multipurpose Sports Complex, Grand Club', 'active', '2026-11-19 02:26:49'),
('proj-gulshan-hummingbird-org-08a1da1a', 'org-08a1da1a', 'dev-gulshan-org-08a1da1a', 'Gulshan - Hummingbird', '/uploads/logos/logo-proj-gulshan-hummingbird.png', NULL, 'Madhuban Bapudham, Ghaziabad', 'https://maps.google.com/?q=Gulshan+Hummingbird+Madhuban+Bapudham+Ghaziabad', 'Boutique luxury residences featuring private work pods, temperature-controlled pool, and lush themed gardens.', '1,250 sq. ft.', '1,650 sq. ft.', '2,050 sq. ft.', '₹1.25 Cr', '₹1.25 Cr - ₹2.20 Cr', 'Private Work Pods, Heated Pool, Spa & Wellness, Banquet Hall, Indoor Games, Kids Play Zone', 'active', '2026-11-19 02:26:49'),
('proj-gv-ekanam-org-08a1da1a', 'org-08a1da1a', 'dev-greatvalue-org-08a1da1a', 'Ekanam', '/uploads/logos/logo-proj-ekanam.png', NULL, 'Sector 107, Noida Expressway, Noida', 'https://maps.google.com/?q=Great+Value+Ekanam+Sector+107+Noida', 'Ultra-luxury low-density residential sanctuary in Sector 107 Noida with expansive green golf views and 3/4 BHK grand suites.', '1,650 sq. ft.', '2,050 sq. ft.', '2,350 sq. ft.', '₹2.85 Cr', '₹2.85 Cr - ₹4.50 Cr', 'Sky Lounge, Temperature Controlled Swimming Pool, Aerobics & Yoga Studio, Grand Club, 3-Tier Security', 'active', '2026-11-19 03:54:27'),
('proj-jacob-001', 'org-aura-001', 'dev-m3m-001', 'M3M Jacob & Co Residences', NULL, NULL, 'Sector 65, Golf Course Extension Road, Gurugram', 'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon', 'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.', '1,850 sq. ft.', '2,200 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', '₹4.80 Cr - ₹9.50 Cr', 'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar', 'active', '2026-11-17 03:28:50'),
('proj-m3m-cullinan-org-08a1da1a', 'org-08a1da1a', 'dev-m3m-org-08a1da1a', 'Cullinan', '/uploads/logos/logo-2c6de208.png', NULL, 'Sector 94, Noida Expressway, Noida', 'https://maps.google.com/?q=M3M+The+Cullinan+Sector+94+Noida', 'Mixed-use high-street luxury development on the junction of South Delhi and Noida. 5.5-acre central green piazza with private elevators.', '2,450 sq. ft.', '3,100 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', '₹5.80 Cr - ₹12.00 Cr', 'Direct South Delhi Connectivity, 100,000 sq ft Clubhouse, 7-tier Security, Temperature Controlled Olympic Pool', 'active', '2026-11-19 03:54:27'),
('proj-m3m-eliesaab-org-08a1da1a', 'org-08a1da1a', 'dev-m3m-org-08a1da1a', 'Elle Saab', '/uploads/logos/logo-proj-elie-saab.png', NULL, 'Sector 111, Dwarka Expressway, Gurugram', 'https://maps.google.com/?q=M3M+Elie+Saab+Sector+111+Dwarka+Expressway+Gurgaon', 'Haute couture designer branded luxury residences by world-famous Parisian designer Elie Saab on Dwarka Expressway.', '2,200 sq. ft.', '2,750 sq. ft.', '3,100 sq. ft.', '₹5.50 Cr', '₹5.50 Cr - ₹11.00 Cr', 'Elie Saab Styled Clubhouse, Private Plunge Pools, Haute Living Concierge, Italian Marble Finishes, Spa', 'active', '2026-11-19 03:54:27'),
('proj-m3m-jacob-org-08a1da1a', 'org-08a1da1a', 'dev-m3m-org-08a1da1a', 'Jacob&Co', '/uploads/logos/logo-11f5307a.jpg', NULL, 'Sector 65, Golf Course Extension Road, Gurugram', 'https://maps.google.com/?q=Sector+65+Golf+Course+Extension+Road+Gurgaon', 'Ultra-exclusive branded residences crafted in collaboration with world-renowned watchmaker & jeweler Jacob & Co. Features private sky infinity pools and Michelin-grade dining.', '1,850 sq. ft.', '2,200 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', '₹4.80 Cr - ₹9.50 Cr', 'Private Helipad, Infinity Sky Pool, Valet Concierge, Observatory Lounge, Cigar Bar', 'active', '2026-11-19 03:54:27'),
('proj-m3m-theline-org-08a1da1a', 'org-08a1da1a', 'dev-m3m-org-08a1da1a', 'The Line', '/uploads/logos/logo-proj-the-line.jpg', NULL, 'Sector 72, Central Noida', 'https://maps.google.com/?q=M3M+The+Line+Sector+72+Noida', 'State-of-the-art commercial high-street retail suites and modern serviced studio residences in prime Sector 72 Noida.', '550 sq. ft.', '700 sq. ft.', '850 sq. ft.', '₹95 Lakhs', '₹95 Lakhs - ₹1.80 Cr', 'Double Height High-Street Retail, Sky Club, Rooftop Infinity Pool, 24/7 Power Backup, Business Lounge', 'active', '2026-11-19 03:54:27'),
('proj-m3m-trump-org-08a1da1a', 'org-08a1da1a', 'dev-m3m-org-08a1da1a', 'Trump', '/uploads/logos/logo-proj-trump-tower.svg', NULL, 'Sector 65, Golf Course Extension Road, Gurugram', 'https://maps.google.com/?q=Trump+Towers+Sector+65+Gurgaon', 'Iconic global super-luxury twin glass towers defining the pinnacle of elite luxury living in Gurugram.', '3,200 sq. ft.', '3,900 sq. ft.', '4,500 sq. ft.', '₹8.50 Cr', '₹8.50 Cr - ₹16.00 Cr', '24/7 White Glove Valet & Concierge, Temperature-Controlled Glass Pool, Trump Signature Lounge, Private Elevators', 'active', '2026-11-19 03:54:27'),
('proj-max105-003', 'org-aura-001', 'dev-max-002', 'Max Estate 105', NULL, NULL, 'Sector 105, Noida Expressway, Noida', 'https://maps.google.com/?q=Sector+105+Noida+Expressway', 'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.', '2,100 sq. ft.', '2,600 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', '₹4.20 Cr - ₹7.80 Cr', 'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa', 'active', '2026-11-17 03:28:50'),
('proj-max105-org-08a1da1a', 'org-08a1da1a', 'dev-max-org-08a1da1a', 'Max 105 Estate', '/uploads/logos/logo-89943740.jpg', NULL, 'Sector 105, Noida Expressway, Noida', 'https://maps.google.com/?q=Sector+105+Noida+Expressway', 'Biophilic architectural marvel curated around wellness, nature and pristine air quality filtration for supreme family wellbeing.', '2,100 sq. ft.', '2,600 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', '₹4.20 Cr - ₹7.80 Cr', 'Forest Walkway, Organic Cafe, IGBC Platinum Pre-certified, Hydrotherapy Spa', 'active', '2026-11-19 03:54:27'),
('proj-ncr-monarch-org-08a1da1a', 'org-08a1da1a', 'dev-ncr-org-08a1da1a', 'NCR Monarch', '/uploads/logos/logo-proj-ncr-monarch.png', NULL, 'Sector 1, Greater Noida West', 'https://maps.google.com/?q=NCR+Monarch+Sector+1+Greater+Noida+West', 'Government SWAMIH-backed luxury residential towers featuring 2 & 3 BHK ready-to-move homes with high-end club amenities.', '950 sq. ft.', '1,250 sq. ft.', '1,550 sq. ft.', '₹75 Lakhs', '₹75 Lakhs - ₹1.40 Cr', 'Clubhouse, Swimming Pool, Gymnasium, Jogging Track, Children Play Area, Landscaped Gardens', 'active', '2026-11-19 02:26:49'),
('proj-ncr-studios-org-08a1da1a', 'org-08a1da1a', 'dev-ncr-org-08a1da1a', 'NCR Studios', NULL, NULL, 'Sector 1, Greater Noida West', 'https://maps.google.com/?q=NCR+Monarch+Greater+Noida+West', 'Modern smart studio suites & serviced residences with high rental yields in Greater Noida West.', '450 sq. ft.', '650 sq. ft.', '850 sq. ft.', '₹42 Lakhs', '₹42 Lakhs - ₹68 Lakhs', 'Business Lounge, Concierge, High-Speed Elevators, Cafe, 24/7 Power Backup', 'active', '2026-11-19 02:26:49'),
('proj-prestige-150-org-08a1da1a', 'org-08a1da1a', 'dev-prestige-org-08a1da1a', 'Prestige 150', '/uploads/logos/logo-a46a11c8.png', NULL, 'Sector 150, Sports City, Noida', 'https://maps.google.com/?q=Sector+150+Noida+Sports+City', 'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.', '2,600 sq. ft.', '3,200 sq. ft.', '3,500 sq. ft.', '₹3.90 Cr', '₹3.90 Cr - ₹6.50 Cr', '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy', 'active', '2026-11-19 03:54:27'),
('proj-prestige150-004', 'org-aura-001', 'dev-prestige-003', 'Prestige 150 Sanctuary', NULL, NULL, 'Sector 150, Sports City, Noida', 'https://maps.google.com/?q=Sector+150+Noida+Sports+City', 'Low-density golf-centric residential paradise surrounded by 42 acres of curated sports amenities and verdant landscapes.', '2,600 sq. ft.', '3,200 sq. ft.', '3,500 sq. ft.', '₹3.90 Cr', '₹3.90 Cr - ₹6.50 Cr', '9-Hole Executive Golf Course, Olympic Gymnastics Arena, Tennis Academy', 'active', '2026-11-17 03:28:50'),
('proj-saya-rajnagar-org-08a1da1a', 'org-08a1da1a', 'dev-saya-org-08a1da1a', 'Saya - Rajnagar', '/uploads/logos/logo-proj-saya-rajnagar.webp', NULL, 'Rajnagar Extension, Ghaziabad', 'https://maps.google.com/?q=Saya+Rajnagar+Extension+Ghaziabad', 'Ultra-luxury residential enclave in the heart of Rajnagar Extension featuring signature clubhouse and green central gardens.', '1,100 sq. ft.', '1,450 sq. ft.', '1,750 sq. ft.', '₹85 Lakhs', '₹85 Lakhs - ₹1.65 Cr', 'Grand Clubhouse, Infinity Pool, Sky Deck, Sports Arena, 24/7 Multi-Tier Security', 'active', '2026-11-19 02:26:49');

-- --------------------------------------------------------

--
-- Table structure for table `project_configurations`
--

CREATE TABLE `project_configurations` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `carpet_area` varchar(100) DEFAULT NULL,
  `super_built_up_area` varchar(100) DEFAULT NULL,
  `price` varchar(100) DEFAULT NULL,
  `bedrooms` int(11) DEFAULT 3,
  `bathrooms` int(11) DEFAULT 3,
  `status` varchar(50) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project_configurations`
--

INSERT INTO `project_configurations` (`id`, `project_id`, `name`, `carpet_area`, `super_built_up_area`, `price`, `bedrooms`, `bathrooms`, `status`) VALUES
('cfg-001', 'proj-jacob-001', '3 BHK Premium Sky Residence', '1,850 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', 3, 3, 'active'),
('cfg-002', 'proj-jacob-001', '4 BHK Royal Penthouse', '3,100 sq. ft.', '3,850 sq. ft.', '₹7.90 Cr', 4, 5, 'active'),
('cfg-003', 'proj-cullinan-002', '4 BHK Grand View Suite', '2,450 sq. ft.', '3,600 sq. ft.', '₹5.80 Cr', 4, 4, 'active'),
('cfg-004', 'proj-max105-003', '3 BHK Wellness Residence', '2,100 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', 3, 3, 'active'),
('cfg-proj-godrej-gbc-org-08a1da1a-1', 'proj-godrej-gbc-org-08a1da1a', '3 BHK Golf View Suite', '1,050 sq. ft.', '1,450 sq. ft.', '₹1.35 Cr', 3, 3, 'active'),
('cfg-proj-godrej-gbc-org-08a1da1a-2', 'proj-godrej-gbc-org-08a1da1a', '3 BHK + Utility Grand', '1,300 sq. ft.', '1,650 sq. ft.', '₹1.85 Cr', 3, 3, 'active'),
('cfg-proj-godrej-gbc-org-08a1da1a-3', 'proj-godrej-gbc-org-08a1da1a', '4 BHK Smart High-Rise', '1,550 sq. ft.', '1,850 sq. ft.', '₹2.65 Cr', 4, 4, 'active'),
('cfg-proj-gulshan-hummingbird-org-08a1da1a-1', 'proj-gulshan-hummingbird-org-08a1da1a', '3 BHK Boutique Residence', '1,100 sq. ft.', '1,450 sq. ft.', '₹1.25 Cr', 3, 3, 'active'),
('cfg-proj-gulshan-hummingbird-org-08a1da1a-2', 'proj-gulshan-hummingbird-org-08a1da1a', '3 BHK + Lounge', '1,250 sq. ft.', '1,650 sq. ft.', '₹1.65 Cr', 3, 3, 'active'),
('cfg-proj-gulshan-hummingbird-org-08a1da1a-3', 'proj-gulshan-hummingbird-org-08a1da1a', '4 BHK Luxury Penthouse', '1,650 sq. ft.', '2,050 sq. ft.', '₹2.20 Cr', 4, 4, 'active'),
('cfg-proj-gv-ekanam-org-08a1da1a-1', 'proj-gv-ekanam-org-08a1da1a', '3 BHK + Servant Luxury Suite', '1,650 sq. ft.', '2,350 sq. ft.', '₹2.85 Cr', 3, 3, 'active'),
('cfg-proj-gv-ekanam-org-08a1da1a-2', 'proj-gv-ekanam-org-08a1da1a', '4 BHK + Servant Grand Sky Villa', '2,150 sq. ft.', '3,100 sq. ft.', '₹4.10 Cr', 4, 4, 'active'),
('cfg-proj-m3m-cullinan-org-08a1da1a-1', 'proj-m3m-cullinan-org-08a1da1a', '3 BHK Luxury View Suite', '2,450 sq. ft.', '3,100 sq. ft.', '₹5.80 Cr', 3, 3, 'active'),
('cfg-proj-m3m-cullinan-org-08a1da1a-2', 'proj-m3m-cullinan-org-08a1da1a', '4 BHK Grand View Suite', '2,850 sq. ft.', '3,600 sq. ft.', '₹7.50 Cr', 4, 4, 'active'),
('cfg-proj-m3m-eliesaab-org-08a1da1a-1', 'proj-m3m-eliesaab-org-08a1da1a', '3.5 BHK Designer Residence', '2,200 sq. ft.', '2,750 sq. ft.', '₹5.50 Cr', 3, 3, 'active'),
('cfg-proj-m3m-eliesaab-org-08a1da1a-2', 'proj-m3m-eliesaab-org-08a1da1a', '4.5 BHK Luxury Penthouse', '3,100 sq. ft.', '3,900 sq. ft.', '₹8.50 Cr', 4, 5, 'active'),
('cfg-proj-m3m-jacob-org-08a1da1a-1', 'proj-m3m-jacob-org-08a1da1a', '3 BHK Premium Sky Residence', '1,850 sq. ft.', '2,400 sq. ft.', '₹4.80 Cr', 3, 3, 'active'),
('cfg-proj-m3m-jacob-org-08a1da1a-2', 'proj-m3m-jacob-org-08a1da1a', '4 BHK Royal Penthouse', '3,100 sq. ft.', '3,850 sq. ft.', '₹7.90 Cr', 4, 5, 'active'),
('cfg-proj-m3m-theline-org-08a1da1a-1', 'proj-m3m-theline-org-08a1da1a', 'Smart Studio Suite', '550 sq. ft.', '700 sq. ft.', '₹95 Lakhs', 1, 1, 'active'),
('cfg-proj-m3m-theline-org-08a1da1a-2', 'proj-m3m-theline-org-08a1da1a', '1 BHK Executive Suite', '700 sq. ft.', '850 sq. ft.', '₹1.45 Cr', 1, 1, 'active'),
('cfg-proj-m3m-trump-org-08a1da1a-1', 'proj-m3m-trump-org-08a1da1a', '3 BHK Ultra Luxury Residence', '3,200 sq. ft.', '3,900 sq. ft.', '₹8.50 Cr', 3, 4, 'active'),
('cfg-proj-m3m-trump-org-08a1da1a-2', 'proj-m3m-trump-org-08a1da1a', '4 BHK Iconic Sky Villa', '4,500 sq. ft.', '5,600 sq. ft.', '₹14.50 Cr', 4, 5, 'active'),
('cfg-proj-max105-org-08a1da1a-1', 'proj-max105-org-08a1da1a', '3 BHK Wellness Residence', '2,100 sq. ft.', '2,850 sq. ft.', '₹4.20 Cr', 3, 3, 'active'),
('cfg-proj-max105-org-08a1da1a-2', 'proj-max105-org-08a1da1a', '4 BHK Wellness Suite', '2,600 sq. ft.', '3,450 sq. ft.', '₹6.10 Cr', 4, 4, 'active'),
('cfg-proj-ncr-monarch-org-08a1da1a-1', 'proj-ncr-monarch-org-08a1da1a', '2 BHK Premium Apartment', '750 sq. ft.', '950 sq. ft.', '₹75 Lakhs', 2, 2, 'active'),
('cfg-proj-ncr-monarch-org-08a1da1a-2', 'proj-ncr-monarch-org-08a1da1a', '3 BHK Executive Apartment', '950 sq. ft.', '1,250 sq. ft.', '₹1.10 Cr', 3, 2, 'active'),
('cfg-proj-ncr-monarch-org-08a1da1a-3', 'proj-ncr-monarch-org-08a1da1a', '3 BHK + Servant Suite', '1,250 sq. ft.', '1,550 sq. ft.', '₹1.40 Cr', 3, 3, 'active'),
('cfg-proj-ncr-studios-org-08a1da1a-1', 'proj-ncr-studios-org-08a1da1a', 'Studio Suite', '350 sq. ft.', '450 sq. ft.', '₹42 Lakhs', 1, 1, 'active'),
('cfg-proj-ncr-studios-org-08a1da1a-2', 'proj-ncr-studios-org-08a1da1a', '1 BHK Serviced Apartment', '550 sq. ft.', '650 sq. ft.', '₹55 Lakhs', 1, 1, 'active'),
('cfg-proj-ncr-studios-org-08a1da1a-3', 'proj-ncr-studios-org-08a1da1a', '1 BHK Luxury Executive Suite', '650 sq. ft.', '850 sq. ft.', '₹68 Lakhs', 1, 1, 'active'),
('cfg-proj-prestige-150-org-08a1da1a-1', 'proj-prestige-150-org-08a1da1a', '3 BHK Luxury Sports Residence', '2,200 sq. ft.', '2,800 sq. ft.', '₹3.90 Cr', 3, 3, 'active'),
('cfg-proj-prestige-150-org-08a1da1a-2', 'proj-prestige-150-org-08a1da1a', '4 BHK Grand Fairway Suite', '2,600 sq. ft.', '3,500 sq. ft.', '₹5.20 Cr', 4, 4, 'active'),
('cfg-proj-saya-rajnagar-org-08a1da1a-1', 'proj-saya-rajnagar-org-08a1da1a', '2 BHK Comfort Home', '850 sq. ft.', '1,100 sq. ft.', '₹85 Lakhs', 2, 2, 'active'),
('cfg-proj-saya-rajnagar-org-08a1da1a-2', 'proj-saya-rajnagar-org-08a1da1a', '3 BHK Luxury Residence', '1,200 sq. ft.', '1,450 sq. ft.', '₹1.25 Cr', 3, 3, 'active'),
('cfg-proj-saya-rajnagar-org-08a1da1a-3', 'proj-saya-rajnagar-org-08a1da1a', '4 BHK Grand Suite', '1,450 sq. ft.', '1,750 sq. ft.', '₹1.65 Cr', 4, 4, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `site_visits`
--

CREATE TABLE `site_visits` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `invitation_id` varchar(64) DEFAULT NULL,
  `customer_id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `associate_id` varchar(64) NOT NULL,
  `sales_head_id` varchar(64) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `scheduled_time` varchar(20) NOT NULL,
  `duration` int(11) DEFAULT 60,
  `status` enum('draft','invitation_sent','pending_confirmation','confirmed','reschedule_requested','rescheduled','cancelled','upcoming','checked_in','in_progress','completed','no_show') DEFAULT 'upcoming',
  `check_in_time` timestamp NULL DEFAULT NULL,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `check_in_method` enum('qr','manual') DEFAULT NULL,
  `authorized_staff_id` varchar(64) DEFAULT NULL,
  `staff_notes` text DEFAULT NULL,
  `feedback_submitted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `site_visits`
--

INSERT INTO `site_visits` (`id`, `organization_id`, `invitation_id`, `customer_id`, `project_id`, `associate_id`, `sales_head_id`, `scheduled_date`, `scheduled_time`, `duration`, `status`, `check_in_time`, `check_out_time`, `check_in_method`, `authorized_staff_id`, `staff_notes`, `feedback_submitted`, `created_at`, `updated_at`) VALUES
('vis-4bd242cb', 'org-aura-001', 'inv-abfd1a78', 'cust-c95d71aa', 'proj-cullinan-002', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 05:35:34', '2026-11-17 05:35:34'),
('vis-661e0438', 'org-aura-001', 'inv-357bc4c2', 'cust-55bd3324', 'proj-dlf-camellias-005', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 04:57:59', '2026-11-17 04:57:59'),
('vis-cbafa2ca', 'org-aura-001', 'inv-8f29477e', 'cust-55bd3324', 'proj-dlf-camellias-005', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 12:05:02', '2026-11-17 12:05:02'),
('vis-e93cfb0e', 'org-aura-001', 'inv-025d8809', 'cust-c95d71aa', 'proj-cullinan-002', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 05:40:05', '2026-11-17 05:40:05'),
('vis-eaf32ebb', 'org-aura-001', 'inv-3bec11af', 'cust-c95d71aa', 'proj-cullinan-002', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 05:35:08', '2026-11-17 05:35:08'),
('vis-fae6458a', 'org-aura-001', 'inv-d9bd2bfe', 'cust-c95d71aa', 'proj-cullinan-002', 'usr-assoc-001', 'usr-head-001', '2026-11-17', '11:30', 60, 'upcoming', NULL, NULL, NULL, NULL, NULL, 0, '2026-11-17 05:37:41', '2026-11-17 05:37:41');

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `sales_head_id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) DEFAULT NULL,
  `role` enum('super_admin','admin','sales_head','sales_associate') NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `sales_head_id` varchar(64) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `organization_id`, `role`, `name`, `email`, `phone`, `password_hash`, `sales_head_id`, `status`, `created_at`, `updated_at`) VALUES
('usr-admin-001', 'org-aura-001', 'admin', 'Ananya Deshmukh', 'admin@auraluxe.com', '+91 99999 00002', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', NULL, 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-admin-55d7e83d', 'org-08a1da1a', 'admin', 'Sajan Rajnikant Patel', 'sajanpatel@workians.com', '', '$2b$10$M5xCEPzUMSLfGdJuZZnEDOnVMvfr7XB9MnULxaaUAnRMXAHp4aZ2O', NULL, 'active', '2026-11-19 01:51:07', '2026-11-19 01:51:07'),
('usr-assoc-001', 'org-aura-001', 'sales_associate', 'Karan Verma', 'associate@auraluxe.com', '+91 98111 22334', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', 'usr-head-001', 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-assoc-002', 'org-aura-001', 'sales_associate', 'Simran Kaur', 'associate2@auraluxe.com', '+91 98222 33445', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', 'usr-head-001', 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-assoc-003', 'org-aura-001', 'sales_associate', 'Amit Saxena', 'associate3@auraluxe.com', '+91 98333 44556', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', 'usr-head-002', 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-assoc-0cf911bb', 'org-08a1da1a', 'sales_associate', 'Devanshu Sirohi', 'devanshusirohi7@gmail.com', '9458885841', '$2b$10$SshOFrOr0/VZYW5yriVlO.gIuy.jIL.9zz.7PeyL.mlk9fHUoE.NS', 'usr-head-8da353cb', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-1929f200', 'org-08a1da1a', 'sales_associate', 'Varun Chawla', 'varun.chawla9253@gmail.com', '7982353229', '$2b$10$QCWDyNrpByRy1TVdjZlyC.m1j0u4uCQ7UXF8odX/3W5ke9n9ytBme', 'usr-head-ba2d3bec', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-45e863c7', 'org-08a1da1a', 'sales_associate', 'Shivalika', 'kavhn145@gmail.com', '9654764963', '$2b$10$yKPonJX.zNhXNkQ6YUR5BuxjVPZrxMnCe6pNxxQi24g1KyJXhNXye', 'usr-head-ed0a3824', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-53241bef', 'org-08a1da1a', 'sales_associate', 'Vishal Tyagi', 'tyagi8499@gmail.com', '9217308001', '$2b$10$rmtX785v5AHfu85p.eyrUOBKbHbd7Xn3dIYBGsLKtdZ.FGiSj0mSi', 'usr-head-8e2a90df', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-540b5e0e', 'org-08a1da1a', 'sales_associate', 'Anuj Kumar', 'anujk866698@gmail.com', '8266971311', '$2b$10$rxvfL5jOexljWzXvwMhWk./RSRyWFFGRKLlzhDbWumxQGoihapMAK', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-554ebfa8', 'org-08a1da1a', 'sales_associate', 'Nilesh Kumar', 'nk2426768@gmail.com', '8092460880', '$2b$10$qIaOK8ffnT0a/AjzLI1Ic.c0DRj9Qe9LgsF41gaXSvYG8eICfYffK', 'usr-head-c8fd5d29', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-56705d43', 'org-08a1da1a', 'sales_associate', 'Sanskar Sharma', 'sanskarsharma1089@gmail.com', '9368945242', '$2b$10$4bWZpkz45hmTiHQ/ofSeYOrJppuuYR6pk8OBvcUZ3/pxuHEGyFkJe', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-584c43e9', 'org-08a1da1a', 'sales_associate', 'Priyanshi Mahiwal', 'mahiwalisha2@gmail.com', '8439702402', '$2b$10$LRwLo3cIdtWMUrYOMeZb4u55JBCRPVCebrEG2Rk2aXNA1C4pXQFE2', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-5ad53b58', 'org-08a1da1a', 'sales_associate', 'Manish Kulshrestha', 'mac1234manish@gmail.com', '9310867965', '$2b$10$2gZIin8LxgAea9b9Uh1HF.2wQQXSm9pk1In0xpNjviM8XThYWcH3u', 'usr-head-c8fd5d29', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-5cb9a19f', 'org-08a1da1a', 'sales_associate', 'Gauri', 'gaurii2305@gmail.com', '9468244833', '$2b$10$F7sm73t.mxDQJE9SBr6ut.Q75Rezr2LE3X7rc9iKFKQeWQOgOh4wi', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-6a097088', 'org-08a1da1a', 'sales_associate', 'Abhinav Malhotra', 'abhi.joy2000@gmail.com', '9717754547', '$2b$10$1Wg3MigiVH9LN7WHFZBcxeZBUXr8c2MH9pt0AZVdmV7IrIHM8Z5fG', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-6c2c5735', 'org-08a1da1a', 'sales_associate', 'Varsha Priyambada Singh', 'varshapriyambada@gmail.com', '7295009696', '$2b$10$mohylTDcRllGfKORQFGqQ.dXjTa4/YLHr0Ole0LZVeOlvfIOOsTTK', 'usr-head-ba2d3bec', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-6d534e2a', 'org-08a1da1a', 'sales_associate', 'Himanshu Kumar', 'himanshu962769@gmail.com', '9627694651', '$2b$10$I//EkWa3KkhYT3pZK9lIj.CfFLZ08x2GwGbVqc7djN1RByMZUIjI2', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-75dd69f5', 'org-08a1da1a', 'sales_associate', 'Sachin', 'saranshkumar882@gmail.com', '7878598981', '$2b$10$UPUfukElkTZAyUjSQ0LtnuymiuVnlZYGD9bJnvQna355VW3YC.Pu6', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-7fc8a2a1', 'org-08a1da1a', 'sales_associate', 'Yogita', 'fartyalyogita@gmail.com', '9540367717', '$2b$10$694lNMFfgHhXc6j/gcl.NuptAyT/D7XQylcvlVzoUkiUYEA0Va18K', 'usr-head-ba2d3bec', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-8379a3a7', 'org-08a1da1a', 'sales_associate', 'Pari Mainwal', 'parimainwal1@gmail.com', '7248391121', '$2b$10$fELpmuHqLCzC2QWnve3TI.3wqn7Xp0kvXCziT7DKzgmuNnda81yWm', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-8d586c2f', 'org-08a1da1a', 'sales_associate', 'Sachin Pandey', 'sachinpandey6789@gmail.com', '9456990162', '$2b$10$7YHZ5kmVbfj.RUuL6YVe2OpUEvKc32fKb2Vbzyz/8p.OtqTEYsNHm', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-92d78f3d', 'org-08a1da1a', 'sales_associate', 'Bhupender Singh', 'bhupensingh1971@gmail.com', '9910602940', '$2b$10$q2FckEssixZQ9fO2AV89c.tfbXgzfbq3WvvKdA0vi1r9mTjJ4j/vi', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:24', '2026-11-19 05:00:24'),
('usr-assoc-9504714b', 'org-08a1da1a', 'sales_associate', 'Abhishek Singh', 'abhesheksingh144@gmail.com', '9569177899', '$2b$10$MeN/SQWe8z.MW9CAp8C3kufbehdtCBmzP6K8tzxGmIMDAHckaPxoS', 'usr-head-ba2d3bec', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-9781ba26', 'org-08a1da1a', 'sales_associate', 'Akash Kumar', 'rajataj321@gmail.com', '8929609801', '$2b$10$lMp/bzS41APoiMata40Tw.0rxO8Dt6r3XU1Y/G9DgO4wmyzAXK.dS', 'usr-head-8da353cb', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-a6e63daa', 'org-08a1da1a', 'sales_associate', 'Manoj Kumar', 'manojmavi85@gmail.com', '8076833651', '$2b$10$sGmZFMvgI8R1RJ62Sx4hJeHcOvHFnqKE/Fz8f2V.Irt4dUqisu6u2', 'usr-head-6c40c0ed', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-b2cd9c45', 'org-08a1da1a', 'sales_associate', 'Atul Kumar', 'kuntalrealestate@gmail.com', '8859639910', '$2b$10$RRx2RD9s1llRf0vLD68cue.yqk8meqHf.InxRNP7wc3TRkG2TbRnC', 'usr-head-8da353cb', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-b792943c', 'org-08a1da1a', 'sales_associate', 'Sunny Shokeen', '826sunny@gmail.com', '9999388398', '$2b$10$/y29APtqFiGxdbhm/HSWQuG38GFtXf6HE5R/I./5K/lz/FRvjdc/.', 'usr-head-6c40c0ed', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-c369edbb', 'org-08a1da1a', 'sales_associate', 'Iqbal Tufail', 'iqbaltufail750@gmail.com', '9294940867', '$2b$10$HjyWpvJ5Jo7oNFmgOUcsbOnhp1evA71IdZlrmkDF2iRwZ6fEfsPim', 'usr-head-8e2a90df', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-c3ac83f0', 'org-08a1da1a', 'sales_associate', 'Ankita Singh', 'singhankita1969@gmail.com', '9142786140', '$2b$10$kA7nw4V/1DpPPqzflgGdauh9u1dHaCf2Xpb0Nm36ANa7OJpQ9G4Ii', 'usr-head-7f26e84b', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-d3daafae', 'org-08a1da1a', 'sales_associate', 'Anurag Kashyap', 'anuragkashyap0012@gmail.com', '8102838331', '$2b$10$m64CYG0YtvFRutfPTiWZJu5X4bfiD.vg4SWKOJx2KjC2EMnnMjwvO', 'usr-head-6c40c0ed', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-assoc-e9405f6e', 'org-08a1da1a', 'sales_associate', 'Rachit Khare', 'khare.rachit1985@gmail.com', '9425689890', '$2b$10$X/jX4jBDwHXHgGWhszzA5.qL0T2SYU5qWM7jK3Dj/aRDLLHOwpu3C', 'usr-head-c8fd5d29', 'active', '2026-11-19 05:00:25', '2026-11-19 05:00:25'),
('usr-assoc-f7475eff', 'org-08a1da1a', 'sales_associate', 'Divy Kumar', 'divys427@gmail.com', '8410400303', '$2b$10$2J.5N6GsHZm5WShBM4Gya.BdwtnXGu0eKL3ICHjtnf8PSsW1qlBe2', 'usr-head-ed0a3824', 'active', '2026-11-19 05:00:26', '2026-11-19 05:00:26'),
('usr-head-001', 'org-aura-001', 'sales_head', 'Rajesh Malhotra', 'saleshead@auraluxe.com', '+91 99999 00003', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', NULL, 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-head-002', 'org-aura-001', 'sales_head', 'Pooja Sengupta', 'saleshead2@auraluxe.com', '+91 99999 00004', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', NULL, 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50'),
('usr-head-6c40c0ed', 'org-08a1da1a', 'sales_head', 'Rohit Kumar', 'rohitkumar6691@gmail.com', '9910797989', '$2b$10$8tmAcv.naZkpUm3SybKWIus39bK/OQvcsc3wlRIYIACUGz006HAAi', NULL, 'active', '2026-11-19 05:00:22', '2026-11-19 05:00:22'),
('usr-head-7f26e84b', 'org-08a1da1a', 'sales_head', 'Kaushal Pant', 'kaushalpant94@gmail.com', '7895126033', '$2b$10$UbCXz2QHpBvdKJN7a9Wx1uQMVnnLPGnh/1p4dtLPfXGFr35C4OSEK', NULL, 'active', '2026-11-19 05:00:22', '2026-11-19 05:00:22'),
('usr-head-8da353cb', 'org-08a1da1a', 'sales_head', 'Akshansh', 'akshansh@workians.com', '9999900000', '$2b$10$2BhZaDAauxwVg89vXRMUEuLBgHMvf91PFeqqYoS0PFvgb05p.P3Cu', NULL, 'active', '2026-11-19 05:00:23', '2026-11-19 05:00:23'),
('usr-head-8e2a90df', 'org-08a1da1a', 'sales_head', 'Vikram Singh Rayat', 'rayatvik93@gmail.com', '7217677858', '$2b$10$wWmX9LsTFkkNaQq/4R.vjOfUlXnlzVouZj5eNWptYaGK4/Fdgp64O', NULL, 'active', '2026-11-19 05:00:23', '2026-11-19 05:00:23'),
('usr-head-ba2d3bec', 'org-08a1da1a', 'sales_head', 'Neeraj Sharma', 'nrjshrm0@gmail.com', '9315606930', '$2b$10$DQsDzcd1PKAw5EYWHCwaJegvgCsTwz2APdoktNjXcKr.mYCxCLLbG', NULL, 'active', '2026-11-19 05:00:22', '2026-11-19 05:00:22'),
('usr-head-c8fd5d29', 'org-08a1da1a', 'sales_head', 'Atul Vats', 'atul.vats@yahoo.co.in', '8882867757', '$2b$10$QElQe/guord2C21Wo2aK2ObbMCJ7L.ApwcDVKPJe6njcgdW.JtxaW', NULL, 'active', '2026-11-19 05:00:22', '2026-11-19 05:00:22'),
('usr-head-ed0a3824', 'org-08a1da1a', 'sales_head', 'Rahul Sharma', 'sharmarahul7522@gmail.com', '9999775221', '$2b$10$LAfX5cgViEdK.MHedXh7UORWBULHDA4PvxPPXlaPt76mwd1Uvc2Si', NULL, 'active', '2026-11-19 05:00:23', '2026-11-19 05:00:23'),
('usr-super-001', NULL, 'super_admin', 'Vikramaditya Roy', 'superadmin@visitstudio.com', '+91 99999 00001', '$2b$10$Uj/83YJF.usyKRSxzGk7UO4qCx/kgoPIn05kueQXe8OWj3OKfn0Za', NULL, 'active', '2026-11-17 03:28:50', '2026-11-17 03:28:50');

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_logs`
--

CREATE TABLE `whatsapp_logs` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `recipient_phone` varchar(50) NOT NULL,
  `template_name` varchar(100) DEFAULT NULL,
  `message_body` text NOT NULL,
  `status` enum('sent','delivered','read','failed') DEFAULT 'sent',
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `whatsapp_logs`
--

INSERT INTO `whatsapp_logs` (`id`, `organization_id`, `recipient_phone`, `template_name`, `message_body`, `status`, `error_message`, `sent_at`) VALUES
('walog-10b8353f-02d5-46a4-b494-217311b8ae8e', 'org-aura-001', '+919810123456', 'visit_invitation_v1', 'Dear Rohan Singhania, you are cordially invited to an exclusive private viewing of M3M The Cullinan on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_3aed3056c9576c514bc23b05d29bd5a3e327 - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 05:37:41'),
('walog-1e4c7d47-48af-4ee0-96d6-69da46b22dcd', 'org-aura-001', '9565763089', 'visit_invitation_v1', 'Dear Yuvraj, you are cordially invited to an exclusive private viewing of DLF The Camellias on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_89b40547ef8f3ae644b34a2f60c1ba368428 - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 04:57:59'),
('walog-3129b9cc-1a8d-4bf9-aca7-e794f85fa430', 'org-aura-001', '+919810123456', 'visit_invitation_v1', 'Dear Rohan Singhania, you are cordially invited to an exclusive private viewing of M3M The Cullinan on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_fce070c90d039419fb128aea16b1b4c00950 - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 05:35:08'),
('walog-452dc727-2c15-4d90-ae39-a96846b72e7b', 'org-aura-001', '+919810123456', 'visit_invitation_v1', 'Dear Rohan Singhania, you are cordially invited to an exclusive private viewing of M3M The Cullinan on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_eadc26b086d734275eb19d12f7f93b0348a4 - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 05:35:34'),
('walog-bae2dfd1-f1ad-4c69-bb18-9d7d3d4ce492', 'org-aura-001', '9565763089', 'visit_invitation_v1', 'Dear Yuvraj, you are cordially invited to an exclusive private viewing of DLF The Camellias on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_09848156b27873900972a4c78683cb9b1dc0 - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 12:05:02'),
('walog-fb4adafa-7f1f-4cd3-baee-41cde8fb60b5', 'org-aura-001', '+919810123456', 'visit_invitation_v1', 'Dear Rohan Singhania, you are cordially invited to an exclusive private viewing of M3M The Cullinan on 2026-11-17 at 11:30. View your personalized invitation and directions here: http://localhost:3000/#invite=inv_40014b16c97dc7aead36c7673f9c2fb006bc - Aura Luxe Realty', 'delivered', NULL, '2026-11-17 05:40:05');

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_templates`
--

CREATE TABLE `whatsapp_templates` (
  `id` varchar(64) NOT NULL,
  `organization_id` varchar(64) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `body_text` text NOT NULL,
  `variables` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `whatsapp_templates`
--

INSERT INTO `whatsapp_templates` (`id`, `organization_id`, `template_name`, `category`, `body_text`, `variables`, `status`, `created_at`) VALUES
('tpl-001', 'org-aura-001', 'visit_invitation_v1', 'MARKETING', 'Dear {{customer_name}}, you are cordially invited to an exclusive private viewing of {{project_name}} on {{visit_date}} at {{visit_time}}. View your personalized invitation and directions here: {{invitation_link}} - {{agency_name}}', 'customer_name,project_name,visit_date,visit_time,invitation_link,agency_name', 'approved', '2026-11-17 03:28:50'),
('tpl-002', 'org-aura-001', 'visit_confirmation_v1', 'UTILITY', 'Hello {{customer_name}}, your site visit for {{project_name}} on {{visit_date}} at {{visit_time}} is confirmed. Your host {{advisor_name}} (+{{advisor_phone}}) will receive you at the reception. Quick access pass: {{invitation_link}}', 'customer_name,project_name,visit_date,visit_time,advisor_name,advisor_phone,invitation_link', 'approved', '2026-11-17 03:28:50'),
('tpl-003', 'org-aura-001', 'reminder_24h_v1', 'UTILITY', 'Reminder: Your property visit to {{project_name}} is tomorrow at {{visit_time}}. Directions & concierge contact: {{invitation_link}}', 'project_name,visit_time,invitation_link', 'approved', '2026-11-17 03:28:50'),
('tpl-004', 'org-aura-001', 'visit_feedback_v1', 'MARKETING', 'Thank you for visiting {{project_name}} today! We would love your quick 30-second thoughts to ensure the best possible experience: {{feedback_link}}', 'project_name,feedback_link', 'approved', '2026-11-17 03:28:50');

-- --------------------------------------------------------

--
-- Table structure for table `_legacy_brand_settings`
--

CREATE TABLE `_legacy_brand_settings` (
  `id` int(11) NOT NULL,
  `agency` varchar(150) NOT NULL DEFAULT 'Aurum Luxury Advisory',
  `subtitle` varchar(255) NOT NULL DEFAULT 'Private Real Estate Wealth & Advisory',
  `theme` varchar(50) NOT NULL DEFAULT 'blue_white',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_legacy_brand_settings`
--

INSERT INTO `_legacy_brand_settings` (`id`, `agency`, `subtitle`, `theme`, `updated_at`) VALUES
(1, 'Aurum Luxury Advisory', 'Private Real Estate Wealth & Advisory', 'blue_white', '2026-11-16 17:25:58');

-- --------------------------------------------------------

--
-- Table structure for table `_legacy_developers`
--

CREATE TABLE `_legacy_developers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `logo` longtext DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_legacy_developers`
--

INSERT INTO `_legacy_developers` (`id`, `name`, `logo`, `created_at`) VALUES
(1, 'M3M India', '', '2026-11-16 17:25:58'),
(2, 'DLF Luxury', '', '2026-11-16 17:25:58'),
(3, 'Max Estates', '', '2026-11-16 17:25:58'),
(4, 'Prestige Group', '', '2026-11-16 17:25:58'),
(5, 'Godrej Properties', '', '2026-11-16 17:25:58'),
(6, 'Oberoi Realty', '', '2026-11-16 17:25:58');

-- --------------------------------------------------------

--
-- Table structure for table `_legacy_invitations`
--

CREATE TABLE `_legacy_invitations` (
  `id` varchar(32) NOT NULL,
  `customer` varchar(150) NOT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `advisor` varchar(150) DEFAULT NULL,
  `advisor_phone` varchar(50) DEFAULT NULL,
  `developer` varchar(150) DEFAULT NULL,
  `project` varchar(150) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `price` varchar(100) DEFAULT NULL,
  `location` varchar(350) DEFAULT NULL,
  `maps` varchar(1000) DEFAULT NULL,
  `date` varchar(50) DEFAULT NULL,
  `time` varchar(20) DEFAULT NULL,
  `duration` int(11) DEFAULT 60,
  `notes` text DEFAULT NULL,
  `rsvp` enum('pending','attending','reschedule','declined') DEFAULT 'pending',
  `rsvp_note` text DEFAULT NULL,
  `rsvp_at` datetime DEFAULT NULL,
  `views_count` int(11) DEFAULT 0,
  `last_viewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_legacy_invitations`
--

INSERT INTO `_legacy_invitations` (`id`, `customer`, `customer_phone`, `advisor`, `advisor_phone`, `developer`, `project`, `size`, `price`, `location`, `maps`, `date`, `time`, `duration`, `notes`, `rsvp`, `rsvp_note`, `rsvp_at`, `views_count`, `last_viewed_at`, `created_at`, `updated_at`) VALUES
('VS-1128', 'Aditya Vardhan', '+91 99887 76655', 'Rohit Malhotra', '+91 98111 22334', 'DLF Luxury', 'DLF The Camellias', '7400', '?28.50 Cr', 'Golf Drive, DLF Phase 5, Gurugram', '', '2026-11-25', '15:30', 90, 'Presidential Penthouse viewing, private concierge greeting, and architect presentation.', 'pending', NULL, NULL, 0, NULL, '2026-11-16 17:33:45', '2026-11-16 17:33:45');

-- --------------------------------------------------------

--
-- Table structure for table `_legacy_projects`
--

CREATE TABLE `_legacy_projects` (
  `id` int(11) NOT NULL,
  `developer_name` varchar(150) NOT NULL,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_legacy_projects`
--

INSERT INTO `_legacy_projects` (`id`, `developer_name`, `name`, `created_at`) VALUES
(1, 'M3M India', 'M3M Jacob & Co Residences', '2026-11-16 17:25:58'),
(2, 'M3M India', 'M3M Elie Saab', '2026-11-16 17:25:58'),
(3, 'M3M India', 'M3M The Line', '2026-11-16 17:25:58'),
(4, 'M3M India', 'M3M Trump Towers', '2026-11-16 17:25:58'),
(5, 'M3M India', 'M3M The Cullinan', '2026-11-16 17:25:58'),
(6, 'M3M India', 'M3M Altitude', '2026-11-16 17:25:58'),
(7, 'DLF Luxury', 'DLF The Camellias', '2026-11-16 17:25:58'),
(8, 'DLF Luxury', 'DLF The Aralias', '2026-11-16 17:25:58'),
(9, 'DLF Luxury', 'DLF The Magnolias', '2026-11-16 17:25:58'),
(10, 'DLF Luxury', 'DLF Privana South', '2026-11-16 17:25:58'),
(11, 'Max Estates', 'Max Estate 128 (Noida)', '2026-11-16 17:25:58'),
(12, 'Max Estates', 'Max Estate 360 (Gurugram)', '2026-11-16 17:25:58'),
(13, 'Prestige Group', 'Prestige City', '2026-11-16 17:25:58'),
(14, 'Prestige Group', 'Prestige Ocean Crest', '2026-11-16 17:25:58'),
(15, 'Godrej Properties', 'Godrej Aristocrat', '2026-11-16 17:25:58'),
(16, 'Godrej Properties', 'Godrej Miraya', '2026-11-16 17:25:58'),
(17, 'Oberoi Realty', 'Oberoi Three Sixty West', '2026-11-16 17:25:58'),
(18, 'Oberoi Realty', 'Oberoi Sky City', '2026-11-16 17:25:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_org` (`organization_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_org` (`organization_id`),
  ADD KEY `idx_customers_mobile` (`mobile_number`),
  ADD KEY `idx_customers_assoc` (`assigned_associate_id`),
  ADD KEY `idx_customers_head` (`assigned_sales_head_id`),
  ADD KEY `interested_project_id` (`interested_project_id`);

--
-- Indexes for table `customer_interactions`
--
ALTER TABLE `customer_interactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `developers`
--
ALTER TABLE `developers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `site_visit_id` (`site_visit_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `followups`
--
ALTER TABLE `followups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_followups_org` (`organization_id`),
  ADD KEY `idx_followups_assoc` (`associate_id`),
  ADD KEY `idx_followups_status` (`status`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `sales_head_id` (`sales_head_id`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_invitations_token` (`token`),
  ADD KEY `idx_invitations_org` (`organization_id`),
  ADD KEY `idx_invitations_customer` (`customer_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `developer_id` (`developer_id`),
  ADD KEY `associate_id` (`associate_id`),
  ADD KEY `sales_head_id` (`sales_head_id`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `organization_id` (`organization_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `developer_id` (`developer_id`);

--
-- Indexes for table `project_configurations`
--
ALTER TABLE `project_configurations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `site_visits`
--
ALTER TABLE `site_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site_visits_org` (`organization_id`),
  ADD KEY `idx_site_visits_assoc` (`associate_id`),
  ADD KEY `idx_site_visits_head` (`sales_head_id`),
  ADD KEY `idx_site_visits_status` (`status`),
  ADD KEY `invitation_id` (`invitation_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `authorized_staff_id` (`authorized_staff_id`);

--
-- Indexes for table `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `sales_head_id` (`sales_head_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_org` (`organization_id`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_head` (`sales_head_id`);

--
-- Indexes for table `whatsapp_logs`
--
ALTER TABLE `whatsapp_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `whatsapp_templates`
--
ALTER TABLE `whatsapp_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `_legacy_brand_settings`
--
ALTER TABLE `_legacy_brand_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `_legacy_developers`
--
ALTER TABLE `_legacy_developers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `_legacy_invitations`
--
ALTER TABLE `_legacy_invitations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `_legacy_projects`
--
ALTER TABLE `_legacy_projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dev` (`developer_name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `_legacy_brand_settings`
--
ALTER TABLE `_legacy_brand_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `_legacy_developers`
--
ALTER TABLE `_legacy_developers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `_legacy_projects`
--
ALTER TABLE `_legacy_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`interested_project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `customers_ibfk_3` FOREIGN KEY (`assigned_associate_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `customers_ibfk_4` FOREIGN KEY (`assigned_sales_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customer_interactions`
--
ALTER TABLE `customer_interactions`
  ADD CONSTRAINT `customer_interactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `customer_interactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `developers`
--
ALTER TABLE `developers`
  ADD CONSTRAINT `developers_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`site_visit_id`) REFERENCES `site_visits` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `feedback_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `followups`
--
ALTER TABLE `followups`
  ADD CONSTRAINT `followups_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `followups_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `followups_ibfk_3` FOREIGN KEY (`associate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `followups_ibfk_4` FOREIGN KEY (`sales_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_3` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_4` FOREIGN KEY (`developer_id`) REFERENCES `developers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invitations_ibfk_5` FOREIGN KEY (`associate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invitations_ibfk_6` FOREIGN KEY (`sales_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD CONSTRAINT `organization_settings_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`developer_id`) REFERENCES `developers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_configurations`
--
ALTER TABLE `project_configurations`
  ADD CONSTRAINT `project_configurations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `site_visits`
--
ALTER TABLE `site_visits`
  ADD CONSTRAINT `site_visits_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `site_visits_ibfk_2` FOREIGN KEY (`invitation_id`) REFERENCES `invitations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `site_visits_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `site_visits_ibfk_4` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `site_visits_ibfk_5` FOREIGN KEY (`associate_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `site_visits_ibfk_6` FOREIGN KEY (`sales_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `site_visits_ibfk_7` FOREIGN KEY (`authorized_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `teams`
--
ALTER TABLE `teams`
  ADD CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`sales_head_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`sales_head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `whatsapp_logs`
--
ALTER TABLE `whatsapp_logs`
  ADD CONSTRAINT `whatsapp_logs_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `whatsapp_templates`
--
ALTER TABLE `whatsapp_templates`
  ADD CONSTRAINT `whatsapp_templates_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
