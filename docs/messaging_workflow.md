# Messaging Module Workflow (Revised)

This document outlines the revised workflow for the project-based and direct messaging module within the Architex Axis Management Suite. It covers interactions for Admin, Freelancer, and Client roles, focusing on the distinct project thread types and direct messaging restrictions.

## Core Concepts

*   **Message Threads**: Conversations are organized into "threads".
    *   **Direct Message (DM) Threads (`direct`)**:
        *   Between an Admin and any other single user (Client, Freelancer, or another Admin).
        *   Between a Freelancer and an Admin **only**.
        *   Between a Client and an Admin **only**.
        *   Freelancers cannot DM other Freelancers or Clients directly.
        *   Clients cannot DM other Clients or Freelancers directly.
    *   **Project-Specific Threads**: Linked to a specific project. These threads involve roles determined by the project's assignments (Client, Admin, and potentially multiple Freelancers).
        1.  **Type A: Client-Admin-Freelancer(s) (`project_client_admin_freelancer`)**:
            *   Participants: The Project's Client, Admin(s), and **all Freelancers assigned to the project** (via the `project_assigned_freelancers` table).
            *   Purpose: Collaborative discussion where all key project stakeholders can communicate.
            *   **Freelancer Message Approval**: Messages sent by **any Freelancer** in this thread type **require Admin approval** before becoming visible to the Client and other non-Admin participants (except the sending freelancer). Admins see all messages.
            *   File Linking: Linked to a dedicated project folder accessible by Client, Admin, and all assigned Freelancers.
        2.  **Type B: Admin-Client (`project_admin_client`)**:
            *   Participants: Admin(s) and the Project Client.
            *   Purpose: Private communication channel between the Admin and the Client regarding the project.
            *   Freelancer Access: Freelancers assigned to the project **cannot** view or participate in this thread.
            *   File Linking: Linked to a dedicated project folder accessible by Admin and Client only (not freelancers).
        3.  **Type C: Admin-Freelancer(s) (`project_admin_freelancer`)**:
            *   Participants: Admin(s) and **all Freelancers assigned to the project**.
            *   Purpose: Private communication channel between the Admin and the assigned Freelancer(s) regarding the project.
            *   Client Access: The Project Client **cannot** view or participate in this thread.
            *   File Linking: Linked to a dedicated project folder accessible by Admin and all assigned Freelancers only (not the client).

*   **Message Approval**: A key feature for `project_client_admin_freelancer` (Type A) threads. Messages from any assigned freelancer are held for Admin review before client visibility.

## User Role Workflows

### 1. Admin Workflow

*   **Project Messaging Interface (`AdminProjectMessagingPage.tsx`)**:
    *   Admin selects a project.
    *   The UI displays options to view/initiate three distinct chat threads for that project:
        *   Client-Admin-Freelancer (Type A)
        *   Admin-Client Only (Type B)
        *   Admin-Freelancer Only (Type C)
    *   If a thread doesn't exist, the Admin can initiate it (typically by sending the first message). The backend automatically adds the correct participants based on the project roles and thread type.
*   **Sending Messages**:
    *   Admin messages in any thread type do not require approval and are immediately visible to all participants of that specific thread.
*   **Message Moderation (for Type A threads)**:
    *   In the "Client-Admin-Freelancer" (Type A) chat view, messages sent by Freelancers that are pending approval will be highlighted.
    *   Admins have "Approve" and "Reject" options for these messages.
        *   **Approved**: Message becomes visible to the Client and other participants in the Type A thread.
        *   **Rejected**: Message remains hidden from the Client. The Freelancer sees the "Rejected" status.
*   **Direct Messaging**:
    *   Admins can initiate DMs with any Client, Freelancer, or other Admin via the general "Messages" page ("New Chat" modal will list all users).
*   **File Exchange Links**:
    *   In each project-specific chat view, a link/button to the relevant "Project Files" folder is displayed. The accessibility of the folder itself is managed by the file exchange system, but the link is provided contextually.

### 2. Freelancer Workflow

*   **Accessing Messages (`MessagingPage.tsx`)**:
    *   Lists all threads the Freelancer is a participant in:
        *   Direct Messages with Admins.
        *   `project_admin_freelancer` (Type C) threads for their assigned projects.
        *   `project_client_admin_freelancer` (Type A) threads for their assigned projects.
*   **Direct Messaging (Restriction)**:
    *   When initiating a "New Chat", the user list will **only show Admin users**. Freelancers cannot initiate DMs with Clients or other Freelancers.
*   **Project Communication**:
    *   **Type C (Admin-Freelancer)**: Can freely communicate with Admins.
    *   **Type A (Client-Admin-Freelancer - "Observe & Participate with Approval")**:
        *   Can view Admin messages and *approved* messages from the Client (and other approved freelancer messages if applicable).
        *   When sending a message:
            *   It automatically `requires_approval` and status is `pending`.
            *   The Freelancer sees their own message with a "Pending Approval" status.
            *   The message is NOT visible to the Client (or other freelancers) until an Admin approves it.
            *   If approved by Admin, the message becomes visible to all Type A thread participants, and the status indicator updates for the Freelancer.
            *   If rejected by Admin, the message remains hidden from others, and the Freelancer sees a "Rejected" status.
*   **File Exchange Links**:
    *   In Type A and Type C project threads, a link to the relevant "Project Files" folder is displayed.

### 3. Client Workflow

*   **Accessing Messages (`MessagingPage.tsx`)**:
    *   Lists all threads the Client is a participant in:
        *   Direct Messages with Admins.
        *   `project_admin_client` (Type B) threads for their projects.
        *   `project_client_admin_freelancer` (Type A) threads for their projects.
*   **Direct Messaging (Restriction)**:
    *   When initiating a "New Chat", the user list will **only show Admin users**. Clients cannot initiate DMs with Freelancers or other Clients.
*   **Project Communication**:
    *   **Type B (Admin-Client)**: Can freely communicate privately with Admins.
    *   **Type A (Client-Admin-Freelancer)**:
        *   Can view Admin messages and *approved* messages from Freelancers.
        *   Messages sent by the Client in this thread do not require approval and are visible to Admin and Freelancer(s) (assuming freelancer has 'participant' role here).
        *   Will NOT see Freelancer messages that are pending approval or have been rejected by an Admin.
*   **File Exchange Links**:
    *   In Type A and Type B project threads, a link to the relevant "Project Files" folder is displayed.

## General UI Features

*   WhatsApp-like styling for chat interfaces.
*   Emoticon selector for adding reactions/emojis to messages.
*   Real-time (or near real-time polling) updates for new messages and thread activity.
*   Clear indication of unread messages.

## Backend API Support (Key Revised/New Endpoints)

*   **`get_messageable_users`**: Provides a filtered list of users for initiating DMs, enforcing restrictions for Freelancers/Clients.
*   **`send_project_message`**: Handles creation of all three project thread types with correct participant setup and permissions (including setting `requires_approval` for Type A freelancer messages). Also handles sending messages to existing threads.
*   **`get_thread_messages`**: Enforces strict visibility rules for messages based on user role, thread type, message approval status, and participant `visibility_level`.
*   **`get_user_message_threads`**: Lists all accessible threads for the user.
*   **`moderate_project_message`**: Allows Admins to approve/reject messages.

This revised workflow provides more granular control over project communications and stricter direct messaging capabilities as per the updated requirements.
