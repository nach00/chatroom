import $ from 'jquery';

import {
  indexChats,
  postChat,
} from "../lib/requests.js";

$(document).ready(function () {
  function loadChats() {
    indexChats(function (response) {
      var htmlString = response.chats.map(function(chat) {
        return `
          <li class="chat-message">
            <div class="flex items-center justify-between">
              <div class="chat-name">${chat.name}</div>
              <div class="chat-time">${chat.ago}</div>
            </div>
            <div class="chat-text">${chat.message}</div>
          </li>
        `;
      });

      $("#chats").html(htmlString);
    });
  }

  // Load chats initially
  loadChats();

  // Refresh chats every 5 seconds
  setInterval(loadChats, 5000);

  $("#new-chat-form").on("submit", function (event) {
    event.preventDefault();

    var message = $("#chat-message").val();
    var name = $("#chat-name").val();

    if (message.trim() && name.trim()) {
      postChat(message, name);
      $("#chat-message").val("");
      
      // Reload chats after posting
      setTimeout(loadChats, 500);
    }
  });
});