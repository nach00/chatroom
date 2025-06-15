# System Design Document: Live Chat Application

## 1. Introduction

This document outlines the system design for a Live Chat application built using Ruby on Rails, ActionCable, and Redis. The application allows users to send messages that are broadcast in real-time to all connected clients without requiring page refreshes. This design is based on the tutorial provided by Altcademy.

## 2. Goals

- Allow users to post messages.
- Display new messages to all connected users in real-time.
- Persist messages in a database.
- Provide a simple and intuitive user interface.
- Leverage Rails' built-in ActionCable for WebSocket communication.
- Use Redis as a message broker for ActionCable.

## 3. High-Level Architecture

The system consists of three main components:

1.  **Client (Web Browser):** Renders the UI, sends new messages via HTTP, and receives real-time updates via WebSockets (ActionCable).
2.  **Application Server (Ruby on Rails):** Handles HTTP requests for creating messages, manages WebSocket connections via ActionCable, and broadcasts new messages.
3.  **Redis Server:** Acts as a pub/sub message broker for ActionCable, enabling message distribution across multiple application server instances (if scaled) and decoupling message production from consumption.
4.  **Database:** Persists chat messages (e.g., PostgreSQL, SQLite).

+------------------------+................................+--------------------------------+................................+------------------------+
|....Client.(Browser)....|<---WebSocket-(Updates)----------|....Ruby.on.Rails.App.Server....|................................|........Database........|
|.-.HTML/CSS/JS..........|----------------HTTP-(New-Msg)--->|.-.HTTP.Endpoints...............|------------------DB-Read/Write->|.(e.g.,.................|
|.-.ActionCable.JS.......|................................|.-.ActionCable.Server...........|................................|..fswd_chatroom_dev)....|
|...(WebSocket)..........|................................|.-.ChatChannel..................|................................|........................|
+------------------------+................................|.-.Chat.Model...................|................................+------------------------+
.........................................................+--------------------------------+
.......................................................................^
.......................................................................|
.......................................................|(ActionCable.Pub/Sub)
.......................................................................|
.......................................................................v
.........................................................+--------------------------------+
.........................................................|..........Redis.Server..........|
.........................................................|......(Message.Broker.for.......|
.........................................................|........ActionCable)............|
.........................................................+--------------------------------+

## 4. Component Breakdown

### 4.1. Client (Web Browser)

- **Technology:** HTML, CSS (TailwindCSS specified), JavaScript (jQuery, custom scripts).
- **Responsibilities:**
  - Display chat messages.
  - Provide input fields for username (implicitly "name") and message.
  - On form submission:
    - Send an HTTP POST request to the Rails server to create a new chat message.
  - Establish a WebSocket connection to the Rails ActionCable server.
  - Subscribe to the `ChatChannel`.
  - Listen for incoming messages on the `ChatChannel`.
  - On receiving a new message broadcast:
    - Fetch all chats (or just append the new one, current implementation refetches all).
    - Re-render the chat message list dynamically using JavaScript (jQuery).
- **Key Files (Client-side):**
  - `app/javascript/channels/chat_channel.js`: Handles ActionCable client-side logic (connection, subscription, receiving data).
  - `app/javascript/lib/requests.js`: Contains `indexChats` function to fetch chats.
  - (Implicit) HTML view for displaying chats and the form.

### 4.2. Application Server (Ruby on Rails)

- **Technology:** Ruby on Rails.
- **Responsibilities:**
  - Serve the main HTML page.
  - Provide an HTTP API endpoint to create new chat messages (e.g., `POST /chats`).
  - Validate and save new chat messages to the database.
  - After a new chat message is saved, broadcast it to the `chat_homepage` stream via ActionCable.
  - Manage WebSocket connections using ActionCable.
  - Handle client subscriptions to `ChatChannel`.
- **Key Files (Server-side):**

  - **`Gemfile`**:
    ```ruby
    gem 'redis', '~> 4.8'
    ```
  - **`config/cable.yml`**: Configures ActionCable to use Redis.
    ```yaml
    development:
      adapter: redis
      url: <%= ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" } %>
      channel_prefix: fswd_chatroom_development
    test:
      adapter: test
    production:
      adapter: redis
      url: <%= ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" } %> # Note: For Heroku, this would be set by the Redis add-on
      channel_prefix: fswd_chatroom_production
    ```
  - **`app/channels/chat_channel.rb`**: Defines the server-side channel logic.

    ```ruby
    class ChatChannel < ApplicationCable::Channel
      def subscribed
        stream_from "chat_homepage"
      end

      def unsubscribed
        # Any cleanup needed when channel is unsubscribed
      end
    end
    ```

  - **`app/models/chat.rb`**: The ActiveRecord model for chat messages. Includes a callback to broadcast new messages.

    ```ruby
    class Chat < ApplicationRecord
      validates :message, length: { maximum: 280 }, presence: true # Assuming name is also validated or handled
      after_create :stream_new_chat

      private
      def stream_new_chat
        ActionCable.server.broadcast('chat_homepage', { body: self.message }) # Could also send name, id, timestamp
      end
    end
    ```

  - **(Implicit) `app/controllers/chats_controller.rb`**: Handles creation of chat messages.
  - **(Implicit) `config/routes.rb`**: Defines routes for chat creation and serving the main page.

### 4.3. Redis Server

- **Technology:** Redis.
- **Responsibilities:**
  - Act as the pub/sub back-end for ActionCable.
  - When `ActionCable.server.broadcast` is called, Rails publishes the message to a Redis channel.
  - ActionCable (running within the Rails server process or separate WebSocket server processes) subscribes to these Redis channels and forwards messages to connected WebSocket clients.
- **Setup:**
  - Installed locally (e.g., via `brew install redis` on macOS, or package manager on Linux).
  - Started using `redis-server` command.
  - Runs on `localhost:6379` by default.

### 4.4. Database

- **Technology:** Any Rails-compatible SQL database (e.g., SQLite for development, PostgreSQL for production).
- **Responsibilities:**
  - Persistently store chat messages.
  - The schema would typically include fields like `id`, `name` (or `user_id`), `message`, `created_at`, `updated_at`.
- **Setup:**
  - Managed by Rails migrations (`rails db:create db:migrate`).

## 5. Data Flow

### 5.1. Initial Page Load & Connection

1.  User navigates to the chat application URL (e.g., `http://localhost:3000/`).
2.  Rails server serves the HTML, CSS, and JavaScript.
3.  Client-side JavaScript (`app/javascript/channels/chat_channel.js`) initializes and connects to the ActionCable server via WebSocket.
4.  The `ChatChannel#subscribed` method on the server is called, and the client is subscribed to the `chat_homepage` stream.
5.  Client fetches initial chat messages (e.g., via an AJAX call to a Rails endpoint, handled by `indexChats`).

### 5.2. Sending a Message

1.  User types a name and message into the form and clicks "Send".
2.  Client-side JavaScript captures the form submission.
3.  An HTTP POST request is sent to the Rails server (e.g., `POST /chats`) with the message data.
4.  The Rails `ChatsController` (or equivalent) receives the request.
5.  A new `Chat` record is created and saved to the database.
6.  The `after_create :stream_new_chat` callback in `app/models/chat.rb` is triggered.
7.  `ActionCable.server.broadcast('chat_homepage', { body: self.message })` is called.
8.  Rails publishes this message to the `chat_homepage` stream via the Redis pub/sub mechanism.

### 5.3. Receiving a Message (Real-time Update)

1.  Redis broadcasts the message to all subscribers of the `chat_homepage` stream.
2.  The ActionCable server (listening to Redis) receives the message.
3.  ActionCable pushes the message data over the WebSocket connection to all subscribed clients.
4.  On each client, the `received(data)` function in `app/javascript/channels/chat_channel.js` is triggered.
5.  Inside `received(data)`:
    - The client makes an AJAX request via `indexChats` to fetch all chat messages (current implementation).
    - The chat list UI is updated with the new set of messages.

## 6. Deployment Considerations (as per tutorial)

- **Heroku:** The tutorial mentions deployment to Heroku.
  - Heroku would require a Procfile specifying web and potentially worker processes (for ActionCable if running separately, though Puma handles it by default).
  - A Redis add-on (e.g., Heroku Redis) would be provisioned, and `REDIS_URL` environment variable would be automatically configured for `config/cable.yml` in production.
  - A database add-on (e.g., Heroku Postgres) would be used.
- **Commands for initial setup:** `bundle install`, `rails tailwindcss:install`, `yarn install`, `rails db:create db:migrate`.

## 7. Scalability and Performance

- **Redis:** Using Redis as a message broker is crucial for scalability. It allows multiple Rails application server instances to share WebSocket connection state and broadcast messages effectively.
- **ActionCable:** Can be scaled by running multiple WebSocket server processes.
- **Database:** Standard database scaling techniques apply.
- **Client-side rendering:** The current implementation in `received(data)` refetches all chats (`indexChats`). For higher performance with many messages, it would be better to:
  - Have the broadcast message include all necessary data (name, message, timestamp).
  - Append the new message directly to the DOM instead of refetching and re-rendering the entire list.

## 8. Security Considerations (Basic)

- **Input Sanitization:** Rails automatically provides some protection against XSS in views, but care should be taken with data rendered via JavaScript.
- **Authentication/Authorization:** The current design is anonymous. For a real application, user authentication (e.g., Devise) would be needed to associate messages with users and potentially restrict access.
- **Rate Limiting:** To prevent abuse, rate limiting on message posting could be implemented.
- **HTTPS:** Essential for production to encrypt WebSocket traffic (`wss://`).

## 9. Future Enhancements

- User authentication.
- Displaying user avatars.
- Private messaging or multiple chat rooms.
- "User is typing..." indicators.
- More efficient client-side message rendering (append new messages instead of full refresh).
- Error handling on client and server.

## 10. Summary of Key Steps from Tutorial

1.  **Project Setup:** Fork/clone `fswd-chatroom`, run `bundle install`, `rails tailwindcss:install`, `yarn install`, `rails db:create db:migrate`.
2.  **Install Redis:** Install Redis server locally and ensure it's running.
3.  **Add Redis Gem:** Add `gem 'redis', '~> 4.8'` to `Gemfile` and `bundle install`.
4.  **Configure ActionCable:** Update `config/cable.yml` to use the `redis` adapter for development and production, pointing to the Redis server URL.
5.  **Generate Channel:** Run `rails g channel chat` to create `app/channels/chat_channel.rb` and `app/javascript/channels/chat_channel.js`.
6.  **Server-side Channel Logic (`app/channels/chat_channel.rb`):**
    - In `subscribed` method, `stream_from "chat_homepage"`.
7.  **Client-side Channel Logic (`app/javascript/channels/chat_channel.js`):**
    - Implement `connected()`, `disconnected()`, and `received(data)` callbacks.
    - The `received(data)` function will fetch and re-render chats.
8.  **Model Callback (`app/models/chat.rb`):**
    - Add an `after_create` callback (`stream_new_chat`).
    - In `stream_new_chat`, use `ActionCable.server.broadcast('chat_homepage', { body: self.message })` to send data.

This design provides a functional real-time chat application as described by the tutorial.
