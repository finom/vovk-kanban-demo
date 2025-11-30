import { NextRequest } from "next/server";
import OpenAI from "openai";
import { TelegramAPI } from "vovk-client";
import { createClient } from "redis";
import { openai as vercelOpenAI } from "@ai-sdk/openai";
import {
  generateObject,
  generateText,
  jsonSchema,
  ModelMessage,
  stepCountIs,
  tool,
  type JSONSchema7,
} from "ai";
import { createLLMTools, KnownAny } from "vovk";
import { z } from "zod";
import UserController from "../user/UserController";
import TaskController from "../task/TaskController";

const redis = createClient({
  url: process.env.REDIS_URL,
});

// Ensure Redis connection
redis.on("error", (err) => console.error("Redis Client Error", err));
redis.connect().catch(console.error);

// Initialize OpenAI (only for voice transcription)
const openai = new OpenAI();

// Constants for chat history
const MAX_HISTORY_LENGTH = 50;
const HISTORY_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Minimal Telegram update type covering the fields we use
interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    // ...other Telegram message fields not used here...
  };
}

export default class TelegramService {
  static get apiRoot() {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
    }
    return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  }

  // Helper function to check if update was already processed
  private static async isUpdateProcessed(updateId: number): Promise<boolean> {
    const key = `tg_update:${updateId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  // Mark update as processed
  private static async markUpdateProcessed(updateId: number): Promise<void> {
    const key = `tg_update:${updateId}`;
    // Store with 24 hour expiry to prevent memory bloat
    await redis.set(key, "1", {
      expiration: {
        type: "EX",
        value: 60 * 60 * 24, // 24 hours
      },
    });
  }

  // Helper function to get chat history key
  private static getChatHistoryKey(chatId: number): string {
    return `tg_chatbot:${chatId}:history`;
  }

  // Get chat history from Redis
  private static async getChatHistory(chatId: number): Promise<ChatMessage[]> {
    const key = this.getChatHistoryKey(chatId);
    const history = await redis.get(key);
    return history ? JSON.parse(history) : [];
  }

  // Save chat history to Redis
  private static async saveChatHistory(
    chatId: number,
    history: ChatMessage[],
  ): Promise<void> {
    const key = this.getChatHistoryKey(chatId);

    // Keep only the last MAX_HISTORY_LENGTH messages
    const trimmedHistory = history.slice(-MAX_HISTORY_LENGTH);

    await redis.set(key, JSON.stringify(trimmedHistory), {
      expiration: {
        type: "EX",
        value: HISTORY_TTL, // Set TTL to 7 days
      },
    });
  }

  // Add message to chat history
  private static async addToHistory(
    chatId: number,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    const history = await this.getChatHistory(chatId);
    history.push({
      role,
      content,
      timestamp: Date.now(),
    });
    await this.saveChatHistory(chatId, history);
  }

  // Convert chat history to Vercel AI SDK format
  private static formatHistoryForVercelAI(
    history: ChatMessage[],
  ): ModelMessage[] {
    return history.map(
      (msg): ModelMessage => ({
        role: msg.role,
        content: msg.content,
      }),
    );
  }

  // Helper function to download file from Telegram
  static async downloadTelegramFile(filePath: string): Promise<BlobPart> {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  // Send typing indicator
  private static async sendIndicator(
    chatId: number,
    action: "typing" | "record_voice",
  ): Promise<void> {
    await TelegramAPI.sendChatAction({
      body: {
        chat_id: chatId,
        action,
      },
      apiRoot: this.apiRoot,
    });
  }

  // Send message to user
  private static async sendMessage(
    chatId: number,
    text: string,
    messages: ModelMessage[],
  ): Promise<void> {
    const {
      object: { type, processedText },
    } = await generateObject({
      model: vercelOpenAI("gpt-5"),
      schema: z.object({
        type: z.enum(["text", "voice"]),
        processedText: z.string(),
      }),
      messages: [
        ...messages,
        {
          role: "system",
          content:
            'Determine the type of response: "text" or "voice" depending on the user request and the context. The "processedText" should be the content to send: if it\'s a text message, format it properly for Telegram parse_mode HTML and include it here, if it\'s a voice message, include the text that will be converted to speech.',
        },
      ],
    });

    console.log(" { type, processedText }:", { type, processedText });

    if (type === "voice") {
      await this.sendVoiceMessage(chatId, processedText);
    } else {
      await this.sendTextMessage(chatId, processedText);
    }
  }

  // Send message to user
  private static async sendTextMessage(
    chatId: number,
    text: string,
  ): Promise<void> {
    await TelegramAPI.sendMessage({
      body: {
        chat_id: chatId,
        text: text,
        parse_mode: "html",
      },
      apiRoot: this.apiRoot,
    });
  }

  private static async sendPhoto(
    chatId: number,
    photoUrl: string,
  ): Promise<void> {
    await TelegramAPI.sendPhoto({
      body: {
        chat_id: chatId,
        photo: photoUrl,
      },
      apiRoot: this.apiRoot,
    });
  }

  private static async sendVoiceMessage(
    chatId: number,
    text: string,
  ): Promise<void> {
    try {
      // Generate speech from text using OpenAI TTS
      const speechResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy", // You can change this to: alloy, echo, fable, onyx, nova, shimmer
        input: text,
        response_format: "opus", // Telegram supports opus format well
      });

      // Convert the response to a Buffer
      const voiceBuffer = Buffer.from(await speechResponse.arrayBuffer());

      const formData = new FormData();
      formData.append("chat_id", String(chatId));
      formData.append(
        "voice",
        new Blob([voiceBuffer], { type: "audio/ogg" }),
        "voice.ogg",
      );

      // Send the voice message
      await TelegramAPI.sendVoice({
        body: formData,
        apiRoot: this.apiRoot,
      });
    } catch (error) {
      console.error("Error generating voice message:", error);
      // Fallback to text message if voice generation fails
      await this.sendTextMessage(chatId, text);
    }
  }

  // Generate AI response with conversation context using Vercel AI SDK
  private static async generateAIResponse(
    chatId: number,
    userMessage: string,
    systemPrompt: string,
  ): Promise<{ botResponse: string; messages: ModelMessage[] }> {
    // Get chat history
    const history = await this.getChatHistory(chatId);
    const messages = [
      ...this.formatHistoryForVercelAI(history),
      { role: "user", content: userMessage } as const,
    ];
    const { tools } = createLLMTools({
      modules: {
        UserController,
        TaskController,
        // GithubIssuesAPI: [GithubIssuesAPI, githubOptions],
      },
      onExecute: (data, { moduleName, handlerName }) =>
        console.log(`${moduleName}.${handlerName} executed`, data),
      onError: (e) => console.error("Error", e),
    });

    // Generate a response using Vercel AI SDK
    const { text } = await generateText({
      model: vercelOpenAI("gpt-5"),
      system: systemPrompt,
      messages,
      stopWhen: stepCountIs(16),
      tools: {
        ...Object.fromEntries(
          tools.map(({ name, execute, description, parameters }) => [
            name,
            tool({
              execute,
              description,
              inputSchema: jsonSchema(parameters as JSONSchema7),
            }),
          ]),
        ),
      },
    });

    const botResponse = text || "I couldn't generate a response.";

    // Add user message to history
    await this.addToHistory(chatId, "user", userMessage);
    // Add assistant response to history
    await this.addToHistory(chatId, "assistant", botResponse);

    messages.push({
      role: "assistant",
      content: botResponse,
    });

    return { botResponse, messages };
  }

  // Process user message (text or transcribed voice)
  private static async processUserMessage(
    chatId: number,
    userMessage: string,
    systemPrompt: string,
    responsePrefix?: string,
  ): Promise<void> {
    const { botResponse, messages } = await this.generateAIResponse(
      chatId,
      userMessage,
      systemPrompt,
    );

    const finalResponse = responsePrefix
      ? `${responsePrefix}\n\n${botResponse}`
      : botResponse;

    await this.sendMessage(chatId, finalResponse, messages);
  }

  // Handle special commands
  private static async handleCommand(
    chatId: number,
    command: string,
  ): Promise<boolean> {
    if (command === "/clear" || command === "/start") {
      const key = this.getChatHistoryKey(chatId);
      await redis.del(key);

      const responseText =
        command === "/clear"
          ? "Chat history cleared! 🧹"
          : "Hello! I'm your AI assistant. Send me a message or voice note to get started! 👋";

      await this.sendTextMessage(chatId, responseText);
      return true;
    }
    return false;
  }

  // Process voice message
  private static async processVoiceMessage(
    chatId: number,
    fileId: string,
  ): Promise<void> {
    try {
      void this.sendIndicator(chatId, "record_voice");

      // Get file info from Telegram
      const { result: fileInfo } = await TelegramAPI.getFile({
        body: { file_id: fileId },
        apiRoot: this.apiRoot,
      });

      // Download the voice file
      const voiceBuffer = await this.downloadTelegramFile(fileInfo.file_path!);

      // Create a File object for OpenAI
      const voiceFile = new File([voiceBuffer], "voice.ogg", {
        type: "audio/ogg",
      });

      // Transcribe the voice message using Whisper (still using OpenAI for this)
      const transcription = await openai.audio.transcriptions.create({
        file: voiceFile,
        model: "whisper-1",
      });

      // Check if transcription is empty
      if (!transcription.text?.trim()) {
        await this.sendTextMessage(
          chatId,
          "I couldn't understand the voice message. Please try again.",
        );
        return;
      }

      // Process the transcribed message
      await this.processUserMessage(
        chatId,
        transcription.text,
        `🎤 I heard the voice: "${transcription.text}"`,
        "You are a helpful assistant in a Telegram chat. The user just sent a voice message. You have access to the conversation history to maintain context. By default, you respond with voice, but if the user requests a text response, you can generate a text message. IMPORTANT: Normalize common spoken artifacts from transcription before acting: 1) Email normalization: interpret 'john at gmail dot com', 'john gmail dot com', 'john at gmail com' as emails. Replace 'at'→'@', 'dot'/'period'→'.', 'dash'/'hyphen'→'-', 'underscore'→'_', remove spaces around '@' and '.', collapse multiple dots, and ensure user@domain.tld. ALSO: If the pattern '<local> <provider> com' appears with NO 'at' or 'dot' tokens (e.g. 'valera gmail com'), treat it as '<local>@<provider>.com' (NOT '<local>.<provider>.com'). Common providers: gmail, yahoo, outlook, protonmail, icloud, yandex, mail, hotmail, live. 2) Handle split tokens: join identifiers split by spaces when clearly an email/username. 3) Convert number words inside identifiers (e.g., 'one'→'1') only when context indicates an identifier/email. 4) Prefer producing canonical actionable forms for tools (e.g., create user with email user@domain.com), while keeping polite text for the user. If ambiguity remains, ask a concise clarification.",
      );
    } catch (voiceError) {
      console.error("Voice processing error:", voiceError);
      await this.sendTextMessage(
        chatId,
        "Sorry, I had trouble processing your voice message. Please try again or send a text message instead.",
      );
    }
  }

  static processTextMessage = async (chatId: number, userMessage: string) => {
    // Check if it's a command
    const isCommand = await this.handleCommand(chatId, userMessage);
    if (isCommand) {
      return;
    }
    void this.sendIndicator(chatId, "typing");

    // Process regular text message
    await this.processUserMessage(
      chatId,
      userMessage,
      "You are a helpful assistant in a Telegram chat. You have access to the conversation history to maintain context. By default, you respond with text, but if the user requests a voice response, you can generate a voice message.",
    );
  };

  // Process the update asynchronously (fire and forget)
  private static async processUpdate(update: TelegramUpdate) {
    try {
      const chatId = update.message?.chat.id;

      if (!chatId) {
        return;
      }

      // Handle text messages
      if (update.message?.text) {
        await this.processTextMessage(chatId, update.message.text);
      }
      // Handle voice messages
      else if (update.message?.voice) {
        await this.processVoiceMessage(chatId, update.message.voice.file_id);
      }
      // Handle unsupported message types
      else {
        console.error("Received unsupported message type");
        await this.sendTextMessage(
          chatId,
          "Sorry, I can only process text and voice messages at the moment.",
        );
      }
    } catch (error) {
      console.error("Error processing update:", error);
    }
  }

  static async handle(request: NextRequest) {
    const update: TelegramUpdate = await request.json();
    // Check if we have an update_id
    const updateId = update.update_id;
    if (!updateId) {
      return { success: true };
    }

    // Check if this update was already processed
    const alreadyProcessed = await this.isUpdateProcessed(updateId);
    if (alreadyProcessed) {
      console.log(`Update ${updateId} already processed, skipping`);
      return { success: true };
    }

    await this.processUpdate(update);

    await this.markUpdateProcessed(updateId);

    return { success: true };
  }
}
