// game/bridge.ts
// A tiny "message board" that lets the page (React) and the game (Phaser) talk to each other.
// One side calls emit() to send something, and the other side listens with on().

// A chat message as the server sends it to everyone.
export type ChatMessage = { id: string; name: string; text: string };

// Makes one channel that carries values of one kind.
function createChannel<T>() {
  // Everyone who is currently listening.
  const listeners = new Set<(value: T) => void>();

  return {
    // Send a value to every listener.
    emit(value: T) {
      listeners.forEach((listener) => listener(value));
    },
    // Start listening. It returns a function that stops listening again.
    on(listener: (value: T) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// The page asks the game to send a chat message to the server.
export const outgoingChat = createChannel<string>();

// The game tells the page that a chat message arrived, so it can show it in the list.
export const incomingChat = createChannel<ChatMessage>();

// The page tells the game when the player starts or stops typing,
// so the keys they type do not also walk the character.
export const typingChannel = createChannel<boolean>();