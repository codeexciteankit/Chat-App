# 💬 ChatApp — Real-Time Messaging Platform

<p align="center">
  <b>A modern, real-time chat application built with the latest React ecosystem</b>
  <br />
  Seamless messaging • Live presence • Mobile-first UX
</p>

<p align="center">
  <a href="[https://your-live-demo-link.com](https://chat-app-z2yi.onrender.com/login)">🚀 Live Demo</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-technical-stack">🛠 Tech Stack</a> •
  <a href="#-architecture--flow">🧠 Architecture</a>
</p>

---

## 📸 Live Preview

> *Real-time messaging with a native-app-like experience*

![ChatApp Demo](./assets/chatapp-demo.gif)

---

## 🚀 Overview

**ChatApp** is a modern, responsive real-time messaging platform designed to demonstrate **advanced frontend patterns** and **full-stack real-time communication**.

Unlike basic CRUD chat demos, ChatApp focuses on:
- Instant feedback through **optimistic UI**
- Live socket-based interactions
- Clean, scalable state management
- A polished, mobile-first user experience comparable to native chat apps

This project serves both as a **production-ready foundation** and a **learning reference** for building real-time web applications.

---

## ✨ Features

### ⚡ Real-Time Communication
- Instant message delivery using **Socket.io**
- Live typing indicators
- Online/offline user presence

### 🧠 Smart UI & UX
- Optimistic UI updates for zero-lag messaging
- Smooth transitions between desktop and mobile layouts
- Touch-friendly, mobile-first navigation

### 🖼 Media & Personalization
- Image upload with instant preview
- Dark / Light mode
- Multiple color themes

### 🔐 Authentication
- Secure login & signup
- Profile management
- Session handling

---

## 🛠 Technical Stack

| Category | Technology |
|------|-----------|
| Frontend | **React 19** (Vite) |
| Styling | **TailwindCSS v4**, DaisyUI |
| State Management | **Zustand** |
| Real-Time | **Socket.io Client** |
| HTTP | Axios |
| Icons | Lucide React |

---

## 🧠 Architecture & Flow

### 🔄 Real-Time Message Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant SocketServer
    participant Database

    User->>Client: Send message
    Client->>Client: Optimistic UI update
    Client->>SocketServer: emit("message")
    SocketServer->>Database: Persist message
    SocketServer->>Client: broadcast("message")
