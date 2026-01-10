/**
 * Type declarations for optional packages
 * 
 * These packages are used for cutting-edge features that are feature-flagged.
 * They may or may not be installed depending on user configuration.
 * Dynamic imports handle the case where packages aren't available.
 */

// @huggingface/transformers - Local NLP inference
declare module '@huggingface/transformers' {
  export function pipeline(
    task: string,
    model?: string,
    options?: { device?: string }
  ): Promise<(input: string, options?: Record<string, unknown>) => Promise<unknown>>;
}

// @mlc-ai/web-llm - Browser-native LLM inference
declare module '@mlc-ai/web-llm' {
  export interface InitProgressReport {
    progress: number;
    text: string;
  }

  export interface ChatCompletionChunk {
    choices: Array<{
      delta: {
        content?: string;
      };
    }>;
  }

  export interface MLCEngine {
    chat: {
      completions: {
        create(params: {
          messages: Array<{ role: string; content: string }>;
          max_tokens?: number;
          temperature?: number;
          stream?: boolean;
        }): AsyncIterable<ChatCompletionChunk>;
      };
    };
    unload(): Promise<void>;
  }

  export function CreateMLCEngine(
    model: string,
    options?: {
      initProgressCallback?: (report: InitProgressReport) => void;
    }
  ): Promise<MLCEngine>;
}

