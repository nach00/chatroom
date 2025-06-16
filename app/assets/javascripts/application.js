//= require jquery
//= require jquery_ujs
//= require_tree .
// Force asset recompilation - updated API endpoints

// Chat functionality
$(document).ready(function() {
  // Setup CSRF token for all AJAX requests
  $.ajaxSetup({
    beforeSend: function(xhr, settings) {
      if (!(/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type)) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRF-Token", $('meta[name=csrf-token]').attr('content'));
      }
    }
  });

  const chatForm = document.getElementById('chat-form');
  const nameInput = document.getElementById('name-input');
  const messageInput = document.getElementById('message-input');
  const chatContainer = document.getElementById('chats');

  // Auto-refresh chats every 2 seconds
  setInterval(loadChats, 2000);
  
  // Load chats on page load
  loadChats();

  // Handle form submission
  if (chatForm) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = nameInput.value.trim();
      const message = messageInput.value.trim();
      
      if (name && message) {
        createChat(name, message, function() {
          messageInput.value = '';
          loadChats();
        });
      }
    });
  }

  function loadChats() {
    indexChats(function (response) {
      if (response && response.chats && chatContainer) {
        var htmlString = response.chats.map(function(chat) {
          return `<li class="chat-message">
            <div class="flex items-center justify-between">
              <div class="chat-name">${chat.name}</div>
              <div class="chat-time">${chat.ago}</div>
            </div>
            <div class="chat-text">${chat.message}</div>
          </li>`;
        });
        
        chatContainer.innerHTML = htmlString.join('');
      }
    });
  }

  function indexChats(callback) {
    $.ajax({
      type: 'GET',
      url: '/api/chats',
      dataType: 'json',
      success: callback,
      error: function(xhr, status, error) {
        console.error('Error loading chats:', error);
      }
    });
  }

  function createChat(name, message, callback) {
    $.ajax({
      type: 'POST',
      url: '/api/chats',
      data: {
        chat: {
          name: name,
          message: message
        }
      },
      dataType: 'json',
      success: callback,
      error: function(xhr, status, error) {
        console.error('Error creating chat:', error);
      }
    });
  }
});