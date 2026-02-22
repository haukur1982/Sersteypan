# Sērsteypan System Manual & Status Report
**Version:** 1.0 (MVP) | **Date:** Jan 30, 2026

## 1. Executive Summary

The Sērsteypan Digital Platform is currently in a **Production-Ready MVP (Minimum Viable Product)** state. The system successfully digitizes the core workflows of concrete element production, delivery, and customer communication.

Recent "hardening" sprints have focused on code stability, type safety, and error handling, moving the codebase from "prototype" to "production" quality. The system is live-deployed on Vercel with a fully synchronized Supabase backend.

---

## 2. Module Overview

The system is divided into four distinct portals, each secured by Role-Based Access Control (RBAC).

### 🏢 Admin Portal
*For Office Managers & System Administrators*
*   **Project Management:** Full lifecycle management of projects (Create, Edit, Archives).
*   **User Management:** Create and manage accounts for drivers, buyers, and factory staff.
*   **Floor Plans (NEW):** Upload blueprint images and pin elements to visual locations.
*   **Reporting:** Generate PDF status reports for projects (Note: Currently uses a Next.js API route).
*   **QR Generation:** Generate and print QR codes for elements.

### 🏭 Factory Portal
*For Production Staff / Factory Manager*
*   **Dashboard:** Real-time overview of active projects and production bottlenecks.
*   **Production Tracking:** Scan or select elements to update status (`Planned` → `Rebar` → `Cast` → `Curing` → `Ready`).
*   **Stock Management:** Basic tracking of inventory quantities and reorder levels.
*   **Factory Diary:** Digital logbook for shifting notes and daily occurrences.
*   **Issue Tracking:** "Fix in Factory" module for reporting and tracking element defects.

### 🚚 Driver Portal
*For Delivery Drivers (Mobile First Design)*
*   **Workflows:**
    1.  **Loading:** Scan QR codes to "Load" elements onto the truck.
    2.  **Transport:** Mark delivery as "Departed".
    3.  **Handover:** Collect digital recipient signature and photo proof of delivery.
*   **Offline Capability:** Actions are queued if network is lost and sync automatically when connection returns.
*   **Delivery History:** View past deliveries and specific run sheets.

### 👷 Buyer Portal
*For Customers / Site Managers*
*   **Transparency:** Real-time view of their project's progress (e.g., "45% of elements delivered").
*   **Element Timeline:** Detailed history of every specific element (when it was cast, loaded, delivered).
*   **Documents:** Access to project-related files (PDFs, images).

---

## 3. Key Technical Features

### Real-Time Updates
The system uses **Supabase Realtime**. If a factory worker marks an element as "Cast", the Buyer's dashboard updates *instantly* without refreshing the page.

### Notifications
A central notification center alerts users to relevant events:
*   **Buyers:** Notified when element status changes.
*   **Drivers:** Notified of new delivery directives.
*   **Admins:** Notified of major project milestones.

### Visual Floor Plans
Interactive maps allow users to understand project status spatially, not just in lists. Pins change color based on real-time status (e.g., Yellow=Rebar, Green=Ready).

---

## 4. Technical Health & Stability

**Status: GREEN (Stable)**

*   **Code Quality:** The codebase recently underwent a "Hardening Audit" (Jan 30).
    *   **Type Safety:** TypeScript strict mode is enabled and enforced in CI.
    *   **Error Assessment:** Critical paths (Loading -> Delivery) include explicit error handling and user feedback.
    *   **Null Safety:** Critical UI/API flows include null checks to reduce runtime crashes.
*   **Database:** Fully migrated and synced. Row Level Security (RLS) policies are active, ensuring users can only see their own data.

### Known Limitations / Risks
*   **Report Generation:** The PDF generation tool is resource-intensive. For very large projects (>1000 elements), report generation may be slow.
*   **Offline Mode:** While the Driver app queues requests offline, prolonged offline usage (days) is not recommended and may lead to sync conflicts.
*   **Mobile Browsers:** The Driver portal is a web app, not a native app. It relies on the browser's camera for scanning, which requires permission access on every session in some privacy-focused browsers (e.g., Brave).

---

## 5. Deployment Information

*   **Frontend:** Vercel (Automatic deployments via GitHub `main` branch).
*   **Backend:** Supabase (PostgreSQL Database + Auth + Storage).
*   **Storage Buckets:**
    *   `floor-plans`: Blueprints.
    *   `delivery-photos`: Proof of delivery images.
    *   `signatures`: Recipient signatures.
    *   `qr-codes`: Generated QR images.

## 6. Conclusion

The Sērsteypan platform is fully functional for rollout. The core "Happy Path" (Create Project → Manufacture → Deliver → View by Customer) is fully implemented and tested.
