## 🎨 Collaborative Canvas

A real-time, web-based collaborative whiteboard built with Node.js, Express, WebSockets, and the HTML5 Canvas API.
This project showcases a high-performance dual-canvas architecture and an authoritative server that synchronizes drawing operations across all connected users.

## ✨ Features
🖥 Real-time Collaboration

Instantly see what other users draw.

Low-latency streaming of in-progress strokes.

## 🛠 Drawing Tools

Pen — simple, sharp strokes

Brush — softer, thicker strokes

Eraser — removes content

Color Picker — choose any color

Line Width Slider — adjust stroke size

## ⚡ High-Performance Rendering

Dual-canvas system:

Overlay canvas: immediate, lag-free local stroke rendering

Base canvas: holds committed strokes from all users

Smooth lines using quadratic curve smoothing

Optimistic updates — sends partial stroke “chunks” for live in-progress rendering

## 🔒 Authoritative Server

Maintains a canonical opLog of all drawing operations

Ensures clients never diverge

Sends state snapshots to new users on join

## ↩️ Undo / Redo

Local undo/redo implemented

Server logic supports future global undo/redo

## 👥 User Presence

Displays a list of currently connected users

## 🔧 Tech Stack
Backend

Node.js

Express — serves client files

ws — WebSocket server for real-time communication

Frontend

Vanilla JavaScript (ES Modules)

HTML5 Canvas API

HTML/CSS for layout and styling

🚀 Getting Started
✔ Prerequisites

Node.js (v16+ recommended)

npm (included with Node)

## 1️⃣ Installation

Clone the repository (or download the project folder), then install dependencies:

npm install express ws

## 2️⃣ Running the Server

Start the Node.js server:

node server.js


You should see:

Listening on :3000

## 3️⃣ Running the Client

Open a browser and navigate to:

http://localhost:3000


To test collaboration, open the same URL in a second tab or device—
your strokes will sync in real time!
