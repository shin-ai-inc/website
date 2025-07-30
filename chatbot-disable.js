/**
 * 緊急修正：既存のチャットボット重複コードを無効化
 * 統一されたchatbot.jsのみを動作させるための修正
 */
document.addEventListener('DOMContentLoaded', function() {
    // 既存のイベントリスナーをクリア
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');

    if (chatbotButton) {
        // 既存のイベントリスナーをクローンして置換（すべてのリスナーを削除）
        const newButton = chatbotButton.cloneNode(true);
        chatbotButton.parentNode.replaceChild(newButton, chatbotButton);
    }

    if (chatbotClose) {
        const newClose = chatbotClose.cloneNode(true);
        chatbotClose.parentNode.replaceChild(newClose, chatbotClose);
    }

    if (chatSend) {
        const newSend = chatSend.cloneNode(true);
        chatSend.parentNode.replaceChild(newSend, chatSend);
    }

    if (chatInput) {
        const newInput = chatInput.cloneNode(true);
        chatInput.parentNode.replaceChild(newInput, chatInput);
    }

    console.log('🔧 ChatBot duplicate listeners cleared - unified chatbot.js will handle all interactions');
});