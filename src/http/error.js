export default class ClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClientError';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}
