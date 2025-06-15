# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Rails 7.2 chatroom application** built as part of the Altcademy coding bootcamp curriculum. It implements a simple live chat interface where users can post messages that automatically expire after 60 minutes.

## Architecture & Technologies

### Backend Stack
- **Ruby 3.4.2** with **Rails 7.2**
- **SQLite** (development) / **PostgreSQL** (production) 
- **Webpacker 5** for JavaScript bundling
- **Tailwind CSS** for styling

### Frontend Stack
- **jQuery** for DOM manipulation and AJAX requests
- **Bootstrap 5.1.3** for UI components
- **Tailwind CSS** with custom configuration
- **Vanilla JavaScript** with ES6 modules

### Testing & Quality
- **RSpec** with **Factory Bot** for testing
- **RuboCop** for Ruby code style enforcement

## Common Development Commands

### Setup
```bash
# Install Ruby dependencies
bundle install

# Install JavaScript dependencies  
yarn install

# Setup database
rails db:create db:migrate db:seed

# Install Tailwind CSS (if needed)
rails tailwindcss:install
```

### Development
```bash
# Start development server with CSS watching
foreman start -f Procfile.dev

# Alternative: separate processes
rails server  # Backend server
rails tailwindcss:watch  # CSS compilation
```

### Testing & Quality
```bash
# Run all tests
bundle exec rspec

# Run specific test files
bundle exec rspec spec/models/chat_spec.rb
bundle exec rspec spec/requests/api/chats_spec.rb

# Code style checking
bundle exec rubocop
```

## Application Architecture

### API Design
- **RESTful API** under `/api` namespace
- **JSON responses** using JBuilder templates
- **Time-based message filtering** (messages expire after 60 minutes)

### Data Model
- **Chat model** with `name`, `message`, and `timestamps`
- **Message validation** (max 280 characters, required)
- **Automatic cleanup** via time-based queries

### Frontend Architecture
- **Single-page application** with AJAX requests
- **jQuery-based** DOM manipulation
- **Form handling** with preventDefault and validation
- **Real-time updates** via periodic API calls

### Key Files
- `app/controllers/api/chats_controller.rb` - API endpoints
- `app/models/chat.rb` - Data model and validations
- `app/javascript/src/index.js` - Frontend application logic
- `app/javascript/lib/requests.js` - API request utilities
- `app/views/api/chats/*.jbuilder` - JSON response templates

## Deployment

### Production Setup
- **Render.yaml** configuration for cloud deployment
- **PostgreSQL** database in production
- **Puma server** with production configuration
- **AWS S3** integration available via gems

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `RAILS_MASTER_KEY` - Rails credentials encryption key