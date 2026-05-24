// WebLLMライブラリをCDN（esm.sh）経由で直接読み込む
import * as webllm from "https://esm.sh";

// --- 使用したいモデルを1つ選んでコメントアウトを解除してください ---
const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // スマホ/低スペックPC向け（超軽量）
// const SELECTED_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC"; // 標準的なPC向け（賢い）
// const SELECTED_MODEL = "gemma-2-2b-it-q4f16_1-MLC";        // 日本語に強いおすすめモデル

// HTML要素の取得
const statusDiv = document.getElementById("status");
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

let engine;
let chatHistory = []; // 会話履歴を保持する配列

// 1. AIエンジンの初期化とモデルのダウンロード
async function initAI() {
  try {
    // 進行状況（プログレス）を画面にリアルタイム表示するコールバック
    const initProgressCallback = (report) => {
      statusDiv.innerText = report.text; 
    };

    // エンジンの作成（自動的にモデルがDLまたはキャッシュから読み込まれます）
    engine = await webllm.CreateMLCEngine(SELECTED_MODEL, {
      initProgressCallback: initProgressCallback
    });

    statusDiv.innerText = `準備完了！使用モデル: ${SELECTED_MODEL}`;
    userInput.disabled = false;
    sendBtn.disabled = false;
  } catch (error) {
    statusDiv.innerText = `エラーが発生しました: ${error.message}`;
    console.error(error);
  }
}

// 2. メッセージ送信処理
async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  // 画面に入力内容を表示
  appendMessage("あなた", text);
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  // 履歴にユーザーの入力を追加
  chatHistory.push({ role: "user", content: text });

  // AIの返答用エリアをあらかじめ作成
  const aiMessageElement = appendMessage("AI", "思考中...");

  try {
    statusDiv.innerText = "AIが返答を生成中...";
    
    // ストリーミング生成（文字がドバドバと順番に出てくる形式）
    const replyChunks = await engine.chat.completions.create({
      messages: chatHistory,
      stream: true, // ストリーミングを有効化
    });

    let aiReply = "";
    for await (const chunk of replyChunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      aiReply += content;
      // リアルタイムに表示を更新
      aiMessageElement.innerText = aiReply;
      chatLog.scrollTop = chatLog.scrollHeight; // 最下部へスクロール
    }

    // 完結したAIの返答を履歴に追加
    chatHistory.push({ role: "assistant", content: aiReply });
    statusDiv.innerText = "完了";

  } catch (error) {
    aiMessageElement.innerText = `エラーが発生しました: ${error.message}`;
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// 画面にチャットを追加するヘルパー関数
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${sender}:</strong> <span>${text}</span>`;
  msg.style.marginBottom = "10px";
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msg.querySelector("span"); // AIのストリーミング更新用にspan要素を返す
}

// ボタンとEnterキーのイベント登録
sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// ページ読み込み時にAIを初期化
initAI();
